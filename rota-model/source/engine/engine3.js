/* FGH and SRH workforce model, engine v3. Per-grade inputs. Builds on Model (engine.js) for rota lines and contract checks. */
(function (root) {
'use strict';
const M = root.Model;
const TYPES = ['Nwe', 'Lwe', 'Nwd', 'Lwd', 'Swd', 'Swe'];
const TH = { Nwe: 12.5, Lwe: 12.5, Nwd: 12.5, Lwd: 12.5, Swd: 8, Swe: 8 };
const SITES = ['fgh', 'air', 'na'];
const CORE = ['scf', 'sd'];
const OTHERS = ['icm1', 'icm2', 'icm3', 'anaes', 'accpA', 'accpF', 'accpT', 'accpO', 'jcf', 'accs', 'imt', 'fy2', 'other'];

/* ---------- data from Allocate, Sep 2025 to Aug 2026 ---------- */
// month index 0 = January. Annual leave and "Unavailable" weekday-days, all doctors.
const AL_BY_MONTH = { 8: 75, 9: 126, 10: 63, 11: 31, 0: 71, 1: 65, 2: 114, 3: 68, 4: 87, 5: 85, 6: 84, 7: 87 };
const UN_BY_MONTH = { 8: 11, 9: 26, 10: 37, 11: 142, 0: 73, 1: 11, 2: 14, 3: 84, 4: 57, 5: 26, 6: 18, 7: 17 };
const norm = o => { const m = Object.values(o).reduce((a, b) => a + b, 0) / 12; const r = {}; Object.keys(o).forEach(k => r[k] = o[k] / m); return r; };
const LEAVE_F = norm(AL_BY_MONTH), ABS_F = norm(UN_BY_MONTH);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// deanery WTE seen Feb 2025 to Aug 2026 (workforce deck), for random draws; average fill used to scale them
const DRAW = { icm: [8.4, 9.4, 8.2, 7.8, 10.6, 7.6, 9.4], anaes: [2.6, 3, 1.8, 2.6, 3, 3, 3], accs: [3, 3, 3.8, 3.8, 3, 3, 2], imt: [4, 4, 4, 3.6, 5, 4, 4] };
const DRAW_BASE = { icm: 0.88, anaes: 0.86, accs: 0.8, imt: 1 };

/* ---------- pay (2026/27 national scales) ---------- */
// 2016 contract, England, from 1 April 2026 (BMA pay scales): FY2 2, CT/ST1-2 3, ST3 4a, ST4-5 4b/4c, ST6 5a, ST7-8 5b/5c. AfC band 8a intermediate point.
const PAY = { nd2: 47610, nd3: 55355, nd4a: 67325, nd4b: 67998, nd5a: 76582, nd5: 77348, b8a: 60417 };
function nightHoursPerWeek(grid) {
  let h = 0; grid.forEach(row => [...row].forEach(ch => { if (ch === 'N') h += 11.5; })); // 21:00 to 08:30: a shift of 8 hours or more starting 20:00 to 23:59 counts until it ends (before 10:00)
  return h / grid.length;
}
// 2016 TCS weekend allowance: 1 in 2 15%, to 1 in 3 10%, to 1 in 4 7.5%, to 1 in 5 6%, to 1 in 6 5%, to 1 in 7 4%, to 1 in 8 3%
function weekendPct(freq) { const e = 1e-9; return freq >= 1 / 2 - e ? 0.15 : freq >= 1 / 3 - e ? 0.10 : freq >= 1 / 4 - e ? 0.075 : freq >= 1 / 5 - e ? 0.06 : freq >= 1 / 6 - e ? 0.05 : freq >= 1 / 7 - e ? 0.04 : freq >= 1 / 8 - e ? 0.03 : 0; }
// pay split into its parts, a year for a full-time WTE
function payParts(s, k) {
  const g = s.groups[k], grid = M.gridFor(s, g.line), c = s.cost;
  if (k === 'scf' && g.payKind === 'flat') return { basic: c.scfPay, hours: 0, nights: 0, weekends: 0, unsocial: 0 };
  // specialty doctors are paid for clinical PAs from the line plus SPA time (a day of SPA is 8 hours, 2 PAs)
  if (k === 'sd') return { basic: c.sdPay * ((g.pas || M.linePAs(grid, 0)) + (g.spa || 0) * 2 / 52) / 10, hours: 0, nights: 0, weekends: 0, unsocial: 0 };
  if (g.payKind === 'afc') return { basic: g.basic, hours: 0, nights: 0, weekends: 0, unsocial: g.basic * (g.unsocial || 0) };
  // 2016 TCS: hours over 40 at basic rate, 37% for night hours, and the weekend allowance
  const chk = M.checkLine(grid), b = g.basic;
  return { basic: b, hours: b * Math.max(0, chk.hours - 40) / 40, nights: b * 0.37 * nightHoursPerWeek(grid) / 40, weekends: b * weekendPct(chk.weekends), unsocial: 0 };
}
function grossPay(s, k) { const p = payParts(s, k); return p.basic + p.hours + p.nights + p.weekends + p.unsocial; }
const onCost = (pay, c) => pay * c.pension + Math.max(0, pay - c.niThreshold) * c.ni;

/* ---------- per-grade helpers ---------- */
const wfPeople = g => (g.lt != null ? 1 - g.lt + g.lt * g.ltw : (g.ltft != null ? g.ltft : 1));   // average WTE per person
// deanery numbers are WTE: part-time trainees change the head count, not the cover
const wf = g => g.wteBased ? 1 : (g.lt != null ? 1 - g.lt + g.lt * g.ltw : (g.ltft != null ? g.ltft : 1));   // average WTE per person
const keep = g => (g.stay && g.recruit ? g.stay / (g.stay + g.recruit) : 1);                   // share of time a substantive post is filled
const fillOf = (g, fills, k) => (fills && fills[k] != null ? fills[k] : g.fill) * keep(g);
function rawWte(s, k, cs) {
  const g = s.groups[k];
  if (CORE.includes(k)) return cs ? cs[k].paid * wf(g) : (g.posts + (g.newPosts || 0)) * keep(g) * wf(g);
  return g.posts * fillOf(g, null, k) * wf(g);
}
// the Ideal year rota is built from whole lines (core.wholeLines): part-time people only count once they add up to a whole line
const ACCPK = ['accpA', 'accpF', 'accpT', 'accpO'];
function wholeF(s, k) {
  if (!s.core || !s.core.wholeLines) return 1;
  const ks = ACCPK.includes(k) ? ACCPK : [k], W = ks.reduce((a, x) => a + (s.groups[x] ? rawWte(s, x) : 0), 0);
  return W > 0 ? Math.floor(W + 1e-6) / W : 0;
}
function wteOf(s, k, cs) { return rawWte(s, k, cs) * wholeF(s, k); }
// ACCPs are entered as one group with skills; the engine keeps four pools
function syncAccp(s) {
  const a = s.accp; if (!a) return s;
  const A = Math.min(a.airway, a.total), F = Math.min(a.fgh, a.total - A), T = Math.max(0, Math.min(a.transfer - F, a.total - A - F)), O = Math.max(0, a.total - A - F - T);
  [['accpA', A], ['accpF', F], ['accpT', T], ['accpO', O]].forEach(([k, n]) => { const g = s.groups[k]; g.posts = n; ['lt', 'ltw', 'al', 'bh', 'study', 'spa', 'line', 'basic', 'unsocial', 'stay', 'recruit', 'counts'].forEach(f => { if (a[f] != null) g[f] = a[f]; }); });
  return s;
}

/* ---------- default: Now, Sep 2025 to Aug 2026 ---------- */
function now() {
  const g = (o) => Object.assign({ posts: 0, fill: 1, lt: 1 / 3, ltw: 0.7, al: 27, bh: 8, study: 7, spa: 0, line: 'scf_current', payKind: 'tcs', counts: 1, induct: 2, changeover: [7],
    can: { air: false, airS: false, fghD: false, fghWE: false, fghN: false } }, o);
  const AIR = { air: true, airS: true, fghD: false, fghWE: false, fghN: false };
  const accp = o => g(Object.assign({ lt: 0, ltw: 0.8, al: 29, bh: 8, study: 5, line: 'accp10', payKind: 'afc', basic: PAY.b8a, unsocial: 0.2, stay: 0, recruit: 0, changeover: [] }, o));
  const s = {
    name: 'Now',
    weekendCap: 3,
    accp: { total: 14, transfer: 12, fgh: 3, airway: 0, lt: 0.2, ltw: 0.6, al: 29, bh: 8, study: 5, spa: 0, line: 'accp10', stay: 0, recruit: 0 },
    groups: {
      scf: g({ label: 'SCF', payKind: 'tcs', basic: PAY.nd4a, n2d: 0.145, posts: 10, newPosts: 0, al: 27, study: 10, lt: 0, ltw: 0.8, spa: 10, line: 'scf_current', stay: 30, recruit: 4, supernum: 3, signoff: 6, fghShare: 1, changeover: [], can: { air: true, airS: true, fghD: true, fghWE: true, fghN: true } }),
      sd: g({ label: 'Specialty doctor', n2d: 0.145, posts: 0, newPosts: 0, al: 32, study: 10, lt: 0, ltw: 0.8, spa: 12, line: 'sd10', pas: 0, stay: 30, recruit: 4, supernum: 3, signoff: 6, fghShare: 1, changeover: [], can: { air: true, airS: true, fghD: true, fghWE: true, fghN: true } }),
      icm3: g({ wteBased: true, label: 'ICM stage 3', posts: 2, fill: 0.88, al: 32, study: 15, spa: 0, basic: PAY.nd5, actingUp: 2, changeover: [7, 1], can: AIR }),
      icm2: g({ wteBased: true, label: 'ICM stage 2', posts: 7, fill: 0.88, al: 32, study: 15, spa: 0, basic: PAY.nd4b, changeover: [7, 10, 1, 4], can: AIR }),
      icm1: g({ wteBased: true, label: 'ICM stage 1', posts: 1, fill: 0.88, al: 32, study: 15, spa: 0, basic: PAY.nd4a, changeover: [7, 1], can: AIR }),
      anaes: g({ wteBased: true, label: 'Anaesthesia', posts: 3, fill: 0.86, al: 32, study: 15, spa: 0, basic: PAY.nd4b, changeover: [7, 1], can: AIR }),
      accpA: accp({ label: 'ACCP, airway-trained', can: { air: true, airS: true, fghD: true, fghWE: false, fghN: false } }),
      accpF: accp({ label: 'ACCP, FGH-trained', posts: 3, can: { air: false, airS: true, fghD: true, fghWE: false, fghN: false } }),
      accpT: accp({ label: 'ACCP, transfer-trained', posts: 9, can: { air: false, airS: true, fghD: false, fghWE: false, fghN: false } }),
      accpO: accp({ label: 'ACCP, other', posts: 2 }),
      jcf: g({ label: 'JCF', posts: 4, spa: 0, basic: PAY.nd3, rotation: 9, leadIn: 3, study: 10, changeover: [7, 1], can: { air: false, airS: false, fghD: true, fghWE: false, fghN: false } }),
      accs: g({ label: 'ACCS', posts: 4, spa: 0, fill: 0.8, basic: PAY.nd3, rotation: 6, leadIn: 3, changeover: [7, 1], can: { air: false, airS: false, fghD: true, fghWE: false, fghN: false } }),
      imt: g({ label: 'IMT', posts: 4, spa: 0, basic: PAY.nd3, changeover: [7, 11, 3] }),
      fy2: g({ label: 'FY2', posts: 4, spa: 0, basic: PAY.nd2, changeover: [7, 11, 3] }),
      other: g({ label: 'ED, neuro, renal, RCF', posts: 2, spa: 0, basic: PAY.nd4a, study: 7 })
    },
    core: { lumpy: 0.175, extPlacement: 1, fghCap: 0.4, fghTeamSal: 0.4, fghTrain: 0.5, weekendFghOthers: false, funding: 'salford', fghPosts: 0, pooledFgh: 0.5, fghAnaes: 0, fghAnaesN: 0, oldhamN: 0, fghLine: '', leaveSeason: true, absSeason: true },
    absence: { sick: 0.03, other: 0.02 },
    demand: {
      fgh: { L: 1, N: 1 }, fghT: { L: 1, N: 1 },
      air: { Lwd: 2, Swd: 2, Lwe: 2, Swe: 1, N: 2 }, airT: { Lwd: 2, Swd: 2, Lwe: 2, Swe: 1, N: 2 },
      na: { Lwd: 3, Swd: 3, Lwe: 3, Swe: 2, N: 3 }, naT: { Lwd: 3, Swd: 3, Lwe: 3, Swe: 2, N: 3 },
      surplusAt: 14
    },
    cost: {
      scfPay: 80000, sdPay: 73383, ni: 0.15, niThreshold: 5000, pension: 0.1438,
      rate: { Nwd: 80, Nwe: 80, Lwd: 80, Lwe: 80, Swd: 80, Swe: 80 }, lr: { wdSoc: 55, wdAnti: 70, weSoc: 70, weAnti: 70 }, lrA: { wdSoc: 85, wdAnti: 105, weSoc: 105, weAnti: 105 }, agencyShare: 0.14, bankHol: 1, bankFee: 0.01, bankPen: 0,
      recruit: 0, anaesNight: 0
    },
    lines: { custom: M.LINES.scf_current.grid.slice(), trainee: M.LINES.scf_current.grid.slice(), accp: M.LINES.scf_current.grid.slice() }
  };
  s.groups.scf.pas = 0;
  return syncAccp(s);
}

/* ---------- supply ---------- */
function avail(s, g, mo) {
  const lf = mo == null ? 1 : LEAVE_F[mo], af = mo == null ? 1 : ABS_F[mo];
  let a = 1 - (g.al + g.bh + g.study) * lf / 260 - (s.absence.sick + s.absence.other) * af;
  if (mo != null && g.induct && (g.changeover || []).includes(mo)) a -= g.induct / 21.7;
  return Math.max(0, a);
}
// leave (annual, study, bank holidays, induction) can only be taken from standard weekday days: days a week lost
function leaveDays(g, mo, s) {
  const lf = mo == null || (s && s.core.leaveSeason === false) ? 1 : LEAVE_F[mo];
  let d = (g.al + g.bh + g.study) * lf / 52;
  if (mo != null && g.induct && (g.changeover || []).includes(mo)) d += g.induct / 4.33;
  return d;
}
// sickness and other absence can fall on any shift
const absent = (s, mo) => (s.absence.sick + s.absence.other) * (mo == null || s.core.absSeason === false ? 1 : ABS_F[mo]);
/* ---------- in practice: how each group actually spread its shifts, from Allocate ----------
   Rota shifts worked, both sites, Sep 2025 to Aug 2026 (ACCPs Jul to Sep 2026, before which their duties are not in Allocate).
   Bank shifts are left out: they are paid as locums, so they are not rota time. */
const PRACTICE = {
  T: { Nwd: 242, Nwe: 178, Lwd: 431, Lwe: 127, Swd: 354, Swe: 98 },   // airway trainees
  J: { Nwd: 409, Nwe: 255, Lwd: 783, Lwe: 164, Swd: 577, Swe: 165 },  // non-airway residents
  P: { Nwd: 50, Nwe: 39, Lwd: 122, Lwe: 31, Swd: 52, Swe: 23 },       // ACCPs
  S: { Nwd: 249, Nwe: 147, Lwd: 348, Lwe: 106, Swd: 495, Swe: 84 }    // SCFs, both sites
};
const PCLASS = { scf: 'S', icm1: 'T', icm2: 'T', icm3: 'T', anaes: 'T', jcf: 'J', accs: 'J', imt: 'J', fy2: 'J', other: 'J', accpA: 'P', accpF: 'P', accpT: 'P', accpO: 'P' };
function perPerson(s, k, mo, lineKey) {
  if (lineKey && lineKey !== s.groups[k].line) { const x = Object.assign({}, s, { groups: Object.assign({}, s.groups, { [k]: Object.assign({}, s.groups[k], { line: lineKey }) }) }); return perPerson(x, k, mo); }
  const g = s.groups[k], grid = M.gridFor(s, g.line), cw = grid.length;
  const c = M.lineCounts(grid, 0), out = {};
  TYPES.forEach(t => out[t] = c[t] / cw);
  // part-time people on the 9-week template work the trust's own part-time templates (80, 70, 60 and 50%),
  // which keep the weekend nights and drop weekday shifts, rather than a scaled-down full-time line
  if (g.lt > 0 && ['scf_current', 'scf_2n', 'trainee', 'sd13', 'sd10'].includes(g.line)) {
    const pctK = [80, 70, 60, 50].reduce((b, p) => Math.abs(p / 100 - g.ltw) < Math.abs(b / 100 - g.ltw) ? p : b, 80);
    const lg = M.ptGrid(g.line === 'trainee' ? 'scf_current' : g.line, pctK), lc = M.lineCounts(lg, 0), wp = wfPeople(g);
    TYPES.forEach(t => out[t] = ((1 - g.lt) * c[t] / cw + g.lt * lc[t] / lg.length) / wp);
  }
  if (k === 'sd' && g.pas) { const base = M.linePAs(grid, 0); if (base > 0) out.Swd += Math.max(0, g.pas - base) * 4 / 8; }   // extra PAs as weekday short days
  if (g.spa) out.Swd = Math.max(0, out.Swd - g.spa / 52);
  if (g.actingUp) out.Nwd = Math.max(0, out.Nwd - g.actingUp / 9);
  // in practice: keep the hours, spread them the way this group really worked them
  // only the default lines are replaced by what was actually worked; a line chosen on purpose is worked as written
  const pc = s.core.practice && ['scf_current', 'scf_actual', 'trainee', 'accp', 'accp10'].includes(g.line) && PRACTICE[PCLASS[k]];
  // nights are balanced: each night needs the same number, so a template's spare weekday nights (it has 6 weekday
  // to 3 weekend nights) are rostered as standard days instead. SCFs and specialty doctors keep theirs for FGH.
  // the extra weekday night sets on the extra-nights template are worked as nights, not swapped: only the base template's spare nights are moved
  if (s.core.balance !== false && !CORE.includes(k) && out.Nwd > out.Nwe * 4 / 3) {
    let x = out.Nwd - out.Nwe * 4 / 3;
    if (g.line === 'scf_2n') { const bg = M.gridFor(s, 'scf_current'), bc = M.lineCounts(bg, 0), bn = bc.Nwd / bg.length, be = bc.Nwe / bg.length; x = Math.min(x, Math.max(0, bn - be * 4 / 3) * (out.Nwe / (be || 1))); }
    out.Nwd -= x; out.Swd += x;
  }
  // SCFs and specialty doctors: some weekday nights are changed to day shifts at short notice (from Allocate: 249 worked against 291 on the template)
  if (CORE.includes(k) && g.n2d) { const x = out.Nwd * g.n2d; out.Nwd -= x; out.Swd += x; }
  out.Swd = Math.max(0, out.Swd - leaveDays(g, mo, s));
  if (pc) {
    const H = TYPES.reduce((a, t) => a + out[t] * TH[t], 0), W = TYPES.reduce((a, t) => a + pc[t] * TH[t], 0);
    TYPES.forEach(t => out[t] = H * pc[t] / W);
  }
  const a = Math.max(0, 1 - absent(s, mo)) * (g.counts == null ? 1 : g.counts);
  TYPES.forEach(t => out[t] *= a);
  return out;
}
function corePipe(s, k) {
  const g = s.groups[k];
  return M.pipeline({ vacancy: g.recruit != null ? g.recruit : 4, supernum: g.supernum != null ? g.supernum : 3, signoff: g.signoff != null ? g.signoff : 6 }, g.stay || 30);
}
function corePeople(s) {
  const out = {};
  CORE.forEach(k => {
    const n = s.groups[k].posts + (s.groups[k].newPosts || 0), pf = corePipe(s, k);
    out[k] = { full: n * pf.full, srhOnly: n * pf.srhOnly, super: n * pf.super, paid: n * pf.paid, n };
  });
  return out;
}

/* ---------- allocation ---------- */
function allocate(s, cs, mo, fills) {
  const G = s.groups, core = s.core, pools = [];
  const add = (id, k, heads, el, mod) => {
    heads *= wholeF(s, k);
    if (heads <= 0) return;
    const pp = perPerson(s, k, mo, mod && mod.line), amt = {};
    TYPES.forEach(t => amt[t] = pp[t] * heads);
    if (typeof mod === 'function') mod(amt); else if (mod && mod.fn) mod.fn(amt);
    pools.push({ id, g: k, heads, amt, left: Object.assign({}, amt), used: Object.fromEntries(TYPES.map(t => [t, {}])), el });
  };
  const totalCore = CORE.reduce((a, k) => a + G[k].posts + (G[k].newPosts || 0), 0);
  // a Fairfield team: posts Fairfield funds fill FGH first, keeping a minimum share of their on-calls at Salford
  const fracF = totalCore ? Math.min(1, (core.fghPosts || 0) / totalCore) : 0;
  const placeLoss = Math.max(0, 1 - (core.extPlacement || 0) / Math.max(1, totalCore));
  CORE.forEach(k => {
    const c = cs[k], lt = wf(G[k]) * placeLoss, can = G[k].can || {};
    [['F', fracF], ['S', 1 - fracF]].forEach(([f, fr]) => {
      if (fr <= 0) return;
      // some never reach FGH sign-off: they stay Salford-only for good
      const fs = G[k].fghShare == null ? 1 : G[k].fghShare;
      add(k + 'Full' + f, k, c.full * lt * fr * fs, { core: true, fgh: can.fghN !== false, fghL: can.fghD !== false, fghWE: can.fghWE !== false, air: true, airS: true, na: true, fund: f }, f === 'F' && core.fghLine ? { line: core.fghLine } : null);
      if (fs < 1) add(k + 'Never' + f, k, c.full * lt * fr * (1 - fs), { core: true, air: true, airS: true, na: true, fund: f });
      // supernumerary (first months in post): on the rota at Salford as non-airway only
      if (c.super > 0) add(k + 'Sup' + f, k, c.super * lt * fr, { core: true, na: true });
      // anyone away on external placement is replaced, but the replacement works Salford only
      if (placeLoss < 1) add(k + 'Place' + f, k, (c.full + c.srhOnly + c.super) * wf(G[k]) * (1 - placeLoss) * fr, { core: true, air: true, airS: true, na: true });
      // still signing off: Salford only, part of their weekdays spent training at FGH
      add(k + 'Srh' + f, k, c.srhOnly * lt * fr, { core: true, air: true, airS: true, na: true, fund: f }, a => { a.trainFgh = (a.Lwd + a.Swd) * core.fghTrain; a.Lwd *= 1 - core.fghTrain; a.Swd *= 1 - core.fghTrain; });
    });
  });
  OTHERS.forEach(k => {
    const g = G[k]; if (!g) return;
    const can = g.can || {}, heads = g.posts * fillOf(g, fills, k) * wf(g);
    const el = { air: !!can.air, airS: !!(can.air || can.airS), na: true, fghL: !!can.fghD, fghWE: !!can.fghWE, fgh: !!can.fghN };
    if (can.fghD && g.leadIn && g.rotation) {
      const ef = Math.max(0, (g.rotation - g.leadIn) / g.rotation);
      add(k + 'E', k, heads * ef, el);
      add(k + 'N', k, heads * (1 - ef), Object.assign({}, el, { fghL: false, fghWE: false, fgh: false }));
    } else add(k, k, heads, el);
  });
  // the FGH anaesthetist covers some weekday ICU nights a week, at no cost to us
  if ((core.fghAnaesN || 0) > 0) {
    const amt = {}; TYPES.forEach(t => amt[t] = 0); amt.Nwd = Math.min(4, core.fghAnaesN) * s.demand.fgh.N;
    pools.push({ id: 'anaesX', g: 'anaesX', amt, left: Object.assign({}, amt), used: Object.fromEntries(TYPES.map(t => [t, {}])), el: { fgh: true } });
  }
  // Oldham doctors cover some Fairfield ICU nights a week, spread over weekday and weekend nights, at no cost to this budget
  if ((core.oldhamN || 0) > 0) {
    const amt = {}, n = Math.min(7, core.oldhamN); TYPES.forEach(t => amt[t] = 0); amt.Nwd = n * 4 / 7 * s.demand.fgh.N; amt.Nwe = n * 3 / 7 * s.demand.fgh.N;
    pools.push({ id: 'oldhamX', g: 'oldhamX', amt, left: Object.assign({}, amt), used: Object.fromEntries(TYPES.map(t => [t, {}])), el: { fgh: true } });
  }
  const by = Object.fromEntries(pools.map(p => [p.id, p]));
  const ids = f => pools.filter(f).map(p => p.id);

  const D = s.demand;
  const mk = (air, na, f) => ({
    fgh: { Nwd: f.N * 4, Nwe: f.N * 3, Lwd: f.L * 5, Lwe: f.L * 2, Swd: 0, Swe: 0 },
    air: { Nwd: air.N * 4, Nwe: air.N * 3, Lwd: air.Lwd * 5, Lwe: air.Lwe * 2, Swd: air.Swd * 5, Swe: air.Swe * 2 },
    na: { Nwd: na.N * 4, Nwe: na.N * 3, Lwd: na.Lwd * 5, Lwe: na.Lwe * 2, Swd: na.Swd * 5, Swe: na.Swe * 2 } });
  const nMin = mk(D.air, D.na, D.fgh), nT = mk(D.airT, D.naT, D.fghT);
  const filled = {}; SITES.forEach(c => { filled[c] = {}; TYPES.forEach(t => filled[c][t] = 0); });
  const short = (c, t, lvl) => Math.max(0, (lvl === 'min' ? nMin : nT)[c][t] - filled[c][t]);

  function take(list, t, want, cat, budget, src) {
    src = src || t; let got = 0;
    for (const id of list) {
      const p = by[id]; if (!p) continue;
      let room = want - got; if (room <= 1e-9) break;
      if (budget) room = Math.min(room, budget.left / TH[src]);
      const x = Math.min(room, p.left[src]); if (x <= 1e-12) continue;
      p.left[src] -= x; got += x; p.used[src][cat] = (p.used[src][cat] || 0) + x;
      if (budget) budget.left -= x * TH[src];
    }
    filled[cat][t] += got; return got;
  }
  // FGH share of hours: at most the cap, per funding pool
  // the FGH limit is on on-calls (nights and weekend shifts): at least 60% of them at Salford by default
  const ONCALL = ['Nwd', 'Nwe', 'Lwe', 'Swe'];
  const hoursOf = l => l.reduce((a, id) => a + (by[id] ? ONCALL.reduce((b, t) => b + by[id].amt[t] * TH[t], 0) : 0), 0);
  const fullF = ['scfFullF', 'sdFullF'].filter(id => by[id]), fullS = ['scfFullS', 'sdFullS'].filter(id => by[id]);
  const bud = { F: { left: (1 - (core.fghTeamSal == null ? 0.4 : core.fghTeamSal)) * hoursOf(fullF) }, S: { left: core.fghCap * hoursOf(fullS) } };
  const oth = p => !p.el.core && p.id !== 'anaesX' && p.id !== 'oldhamX';
  const otherFghL = ids(p => oth(p) && p.el.fghL), otherFghWE = ids(p => oth(p) && (p.el.fghWE || (core.weekendFghOthers && p.el.fghL))), otherFghN = ids(p => oth(p) && p.el.fgh);
  const ordFgh = ['Nwe', 'Lwe', 'Nwd', 'Lwd'];
  function fghOthers(lvl) {
    take(otherFghL, 'Lwd', short('fgh', 'Lwd', lvl), 'fgh');
    take(otherFghWE, 'Lwe', short('fgh', 'Lwe', lvl), 'fgh');
    ['Nwd', 'Nwe'].forEach(t => take(otherFghN, t, short('fgh', t, lvl), 'fgh'));
  }
  function fghCore(f, lvl) {
    if (by.anaesX) ['Nwe', 'Nwd'].forEach(t => take(['anaesX'], t, short('fgh', t, lvl), 'fgh'));
    if (by.oldhamX) ['Nwe', 'Nwd'].forEach(t => take(['oldhamX'], t, short('fgh', t, lvl), 'fgh'));
    const list = (f === 'F' ? fullF : fullS).filter(id => by[id].el.fgh || by[id].el.fghL);
    ordFgh.forEach(t => {
      const w = short('fgh', t, lvl); if (w <= 0) return;
      const ok = list.filter(id => (t[0] === 'N' ? by[id].el.fgh : t === 'Lwe' ? by[id].el.fghWE : by[id].el.fghL));
      take(ok, t, w, 'fgh', ONCALL.includes(t) ? bud[f] : null);
    });
  }
  const coreSrh = f => ['scfSrh' + f, 'sdSrh' + f, 'scfPlace' + f, 'sdPlace' + f, 'scfFull' + f, 'sdFull' + f];
  const airOnlyS = ids(p => oth(p) && p.el.airS && !p.el.air), airOth = ids(p => oth(p) && p.el.air), naOnly = ids(p => oth(p) && !p.el.airS);
  // Day to day the rota is lumpy: leave and the template mean some nights have 3 trainees on and some have 0.
  // Trainees and others only count up to the minimum on each shift (the extras stay at Salford above the minimum),
  // so on average they cover E[min(X, minimum)], not min(average, minimum). SCFs fill what is left.
  const lumpy = (list, t, cat, lvl) => {
    const D = PER_WEEK[t], m = (lvl === 'min' ? nMin : nT)[cat][t] / D, mu = list.reduce((a, id) => a + (by[id] ? by[id].left[t] : 0), 0) / D + filled[cat][t] / D;
    if (s.core.stable || !s.core.lumpy && s.core.lumpy !== undefined || !(m > 0) || !(mu > 0)) return Infinity;
    return Math.max(0, expMin(mu, m, s.core.lumpy == null ? 0.175 : s.core.lumpy) * D - filled[cat][t]);
  };
  function srh(cat, lvl, coreIds) {
    // supernumerary SCFs and specialty doctors count as non-airway at Salford, ahead of signed-off ones
    if (cat === 'na') coreIds = ['scfSupS', 'sdSupS', 'scfSupF', 'sdSupF'].filter(id => by[id] && !coreIds.includes(id)).concat(coreIds);
    TYPES.forEach(t => {
      const w = short(cat, t, lvl); if (w <= 0) return;
      const others = cat === 'na' ? [...naOnly, ...airOnlyS, ...airOth] : (t[0] === 'S' ? airOnlyS : []).concat(airOth);
      let got = take(others, t, Math.min(w, lumpy(others, t, cat, lvl)), cat);
      got += take(coreIds, t, w - got, cat);
      if (t[0] === 'S' && w - got > 1e-9) take(others.concat(coreIds), t, w - got, cat, null, 'L' + t.slice(1));
    });
  }
  // fill order follows funding
  // Salford is staffed first in the rota (airway, then everyone else), then FGH from what is left
  fghOthers('min');
  fghCore('F', 'min');
  srh('air', 'min', coreSrh('S')); srh('na', 'min', coreSrh('S')); srh('air', 'target', coreSrh('S'));
  fghCore('S', 'min');
  srh('air', 'min', coreSrh('F')); srh('air', 'target', coreSrh('F'));
  srh('na', 'min', [...coreSrh('S'), ...coreSrh('F')]);
  fghOthers('target'); fghCore('F', 'target'); fghCore('S', 'target');
  srh('na', 'target', [...coreSrh('S'), ...coreSrh('F')]);

  const gap = {}; SITES.forEach(c => { gap[c] = {}; TYPES.forEach(t => gap[c][t] = Math.max(0, nMin[c][t] - filled[c][t])); });
  let dayRes = 0, trainFgh = 0;
  pools.forEach(p => { if (p.id === 'anaesX' || p.id === 'oldhamX') return; ['Lwd', 'Swd'].forEach(t => { dayRes += (p.used[t].air || 0) + (p.used[t].na || 0) + p.left[t]; }); trainFgh += p.amt.trainFgh || 0; });
  return { pools, by, nMin, nT, filled, gap, dayRes: dayRes / 5, trainFgh };
}

const PER_WEEK = { Nwd: 4, Nwe: 3, Lwd: 5, Lwe: 2, Swd: 5, Swe: 2 };
// expected min(X, m) when the number on a shift varies around mu with variance k*mu (k = 1 is fully random)
function expMin(mu, m, k) {
  const sd = Math.sqrt(Math.max(1e-9, k * mu)); let e = 0, tot = 0;
  for (let x = 0; x <= Math.ceil(mu + 6 * sd) + 1; x++) {
    const z0 = (x - 0.5 - mu) / sd, z1 = (x + 0.5 - mu) / sd, p = normCdf(z1) - (x === 0 ? 0 : normCdf(z0));
    e += Math.min(x, m) * p; tot += p;
  }
  return Math.min(mu, e / tot);
}
/* ---------- one month's money and measures ---------- */
const normCdf = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
// one hourly rate per shift type; own staff on bank and external locums cost the trust the same
// locums are paid by the hour at four rates: weekday social, weekday unsocial, weekend social, weekend unsocial.
// Social hours are 07:00 to 19:00. A night (20:00 to 08:30) is 11 unsocial hours and 1.5 social; a long day (08:00 to 20:30) the reverse.
const LOC_SPLIT = { Nwd: [['wdAnti', 11], ['wdSoc', 1.5]], Nwe: [['weAnti', 11], ['weSoc', 1.5]], Lwd: [['wdSoc', 11], ['wdAnti', 1.5]], Lwe: [['weSoc', 11], ['weAnti', 1.5]], Swd: [['wdSoc', 8]], Swe: [['weSoc', 8]] };
// what the trust pays on top of the NHSP hourly rate: holiday pay, then employer NI, levy, NHSP fee and (if bank work is pensionable) employer pension on pay plus holiday pay
const HOL = 0.1207, LEVY = 0.005;
function bankAdd(c) {
  if (c.bankHol == null && c.bankOn != null) return c.bankOn;   // older saved plans
  const h = c.bankHol === 0 ? 0 : HOL;
  return (1 + h) * (1 + (c.ni != null ? c.ni : 0.15) + LEVY + (c.bankPen ? c.pension || 0 : 0)) - 1 + (c.bankFee != null ? c.bankFee : 0.01);   // the NHSP fee as a share of the hourly rate
}
function locumParts(s, t) {
  const c = s.cost, sp = LOC_SPLIT[t], h = sp.reduce((a, x) => a + x[1], 0);
  const at = (lr, def) => sp.reduce((a, [k, n]) => a + (lr && lr[k] != null ? lr[k] : def) * n, 0) / h;
  if (!c.lr) { const r = c.rate, v = r && typeof r === 'object' && r[t] != null ? r[t] : 80; return { rate: v, pay: v }; }
  const base = at(c.lr, 80), bank = base * (1 + bankAdd(c)), ag = c.lrA ? at(c.lrA, 100) : bank, sh = c.agencyShare || 0;
  return { rate: bank * (1 - sh) + ag * sh, pay: base * (1 - sh) + ag * sh };
}
function locumRate(s, t) {
  // a blend of bank (NHSP, plus any fee or on-costs) and agency, by the share of locum shifts that go to agency
  const c = s.cost, sp = LOC_SPLIT[t], h = sp.reduce((a, x) => a + x[1], 0);
  const at = (lr, def) => sp.reduce((a, [k, n]) => a + (lr && lr[k] != null ? lr[k] : def) * n, 0) / h;
  if (!c.lr) { const r = c.rate; return r && typeof r === 'object' && r[t] != null ? r[t] : 80; }
  const bank = at(c.lr, 80) * (1 + bankAdd(c)), ag = c.lrA ? at(c.lrA, 100) : bank, sh = c.agencyShare || 0;
  return bank * (1 - sh) + ag * sh;
}
// cover by site and shift type
const BT = { fOOH: [['fgh'], ['Nwd', 'Nwe', 'Lwe']], sOOH: [['air', 'na'], ['Nwd', 'Nwe', 'Lwe', 'Swe']], fN_wd: [['fgh'], ['Nwd']], fN_we: [['fgh'], ['Nwe']], fL_wd: [['fgh'], ['Lwd']], fL_we: [['fgh'], ['Lwe']],
  sN_wd: [['air', 'na'], ['Nwd']], sN_we: [['air', 'na'], ['Nwe']], sD_wd: [['air', 'na'], ['Lwd', 'Swd']], sD_we: [['air', 'na'], ['Lwe', 'Swe']], aN: [['air'], ['Nwd', 'Nwe']] };
function month(s, cs, mo, fills, payCache) {
  const a = allocate(s, cs, mo, fills), c = s.cost, w = 52 / 12;
  // no gaps: every shift our rota cannot fill is filled by a paid locum, charged to the site with the gap
  let locShifts = 0, locCost = 0, locPay = 0, locFgh = 0, locSrh = 0, locCovF = 0, locCovS = 0;
  SITES.forEach(cat => {
    TYPES.forEach(t => {
      const g = a.gap[cat][t] * w; if (g <= 0) return;
      if (cat === 'fgh') locCovF += g; else locCovS += g;
      const lp = locumParts(s, t), r = lp.rate; locPay += g * TH[t] * lp.pay;
      locShifts += g; const cost = g * TH[t] * r; locCost += cost; if (cat === 'fgh') locFgh += cost; else locSrh += cost;
    });
  });
  const pay = payCache || payTable(s);
  let wages = 0, on = 0, salford = 0, fairfield = 0;
  const totalCore = CORE.reduce((x, k) => x + s.groups[k].posts + (s.groups[k].newPosts || 0), 0);
  const fFrac = totalCore ? Math.min(1, (s.core.fghPosts || 0) / totalCore) : 0;   // Fairfield pays for its own team
  Object.keys(s.groups).forEach(k => {
    const g = s.groups[k];
    const wte = CORE.includes(k) ? cs[k].paid * wf(g) : g.posts * fillOf(g, fills, k) * wf(g);
    const wg = wte * pay[k].gross / 12, oc = wte * pay[k].on / 12;
    wages += wg; on += oc;
    if (CORE.includes(k)) { fairfield += (wg + oc) * fFrac; salford += (wg + oc) * (1 - fFrac); } else salford += wg + oc;
  });
  const hires = CORE.reduce((x, k) => { const g = s.groups[k]; return x + cs[k].n / ((g.stay || 30) + (g.recruit || 0)); }, 0);
  const recruit = hires * (c.recruit || 0);
  let anaes = 0;
  salford += recruit * (1 - fFrac); fairfield += recruit * fFrac + anaes; fairfield += locFgh; salford += locSrh;
  const sum = (o, cats) => cats.reduce((x, cat) => x + TYPES.reduce((y, t) => y + o[cat][t], 0), 0);
  const capd = (cats, ts) => cats.reduce((x, cat) => x + (ts || TYPES).reduce((y, t) => y + Math.min(a.filled[cat][t], a.nMin[cat][t]), 0), 0);
  const needF = sum(a.nMin, ['fgh']), fillF = capd(['fgh']);
  const needS = sum(a.nMin, ['air', 'na']), fillS = capd(['air', 'na']);
  const needAir = sum(a.nMin, ['fgh', 'air']), fillAir = capd(['fgh', 'air']);
  const airCover = Math.min(1, fillAir / needAir);
  const needSA = sum(a.nMin, ['air']), fillSA = capd(['air']);
  const needST = sum(a.nT, ['air']);
  const srhAirMin = fillSA / needSA, srhAirTarget = Math.min(1, sum(a.filled, ['air']) / needST);
  const bt = {}; Object.entries(BT).forEach(([key, [cats, ts]]) => { const n = cats.reduce((x, cat) => x + ts.reduce((y, t) => y + a.nMin[cat][t], 0), 0); bt[key] = [capd(cats, ts) * w, n * w]; });
  const mu = a.dayRes, sd = Math.sqrt(Math.max(1, mu * 0.75));
  const pOver = 1 - normCdf((s.demand.surplusAt + 0.5 - mu) / sd);
  return {
    a, locShifts, locCost, locPay, locAdd: locCost - locPay, wages, on, recruit, anaes, salford, fairfield, bt,
    total: locCost + wages + on + recruit + anaes, substantive: wages + on + recruit + anaes,
    coverF: Math.min(1, fillF / needF), coverS: fillS / needS, airCover, full: airCover >= 0.99 && fillS / needS >= 0.99, srhAirMin, srhAirTarget,
    coverFL: Math.min(1, (fillF * w + locCovF) / (needF * w)), coverSL: Math.min(1, (fillS * w + locCovS) / (needS * w)),
    dayRes: mu, surplus: pOver * 21.7, shifts: (needF + needS) * w, shiftsOwn: (Math.min(needF, fillF) + fillS) * w, shiftsF: needF * w, shiftsS: needS * w,
    trainFgh: a.trainFgh * w
  };
}
function payTable(s) {
  const t = {}; Object.keys(s.groups).forEach(k => { const gp = grossPay(s, k); t[k] = { gross: gp, on: onCost(gp, s.cost) }; }); return t;
}

/* ---------- a year, deterministic (likely) ---------- */
function year(s) {
  syncAccp(s);
  const cs = corePeople(s), pay = payTable(s), ms = [];
  for (let mo = 0; mo < 12; mo++) ms.push(month(s, cs, mo, null, pay));
  return summarise(ms);
}
function summarise(ms) {
  const sum = k => ms.reduce((a, m) => a + m[k], 0), avg = k => sum(k) / ms.length;
  const out = { total: sum('total'), locum: sum('locCost'), locPay: sum('locPay'), locAdd: sum('locAdd'), substantive: sum('substantive'), wages: sum('wages'), oncost: sum('on'),
    recruit: sum('recruit'), salford: sum('salford'), fairfield: sum('fairfield'), locShifts: sum('locShifts'),
    coverF: avg('coverF'), coverS: avg('coverS'), coverFL: avg('coverFL'), coverSL: avg('coverSL'), airCover: avg('airCover'), srhAirMin: avg('srhAirMin'), srhAirTarget: avg('srhAirTarget'), fullMonths: ms.filter(m => m.full).length,
    surplus: sum('surplus'), dayRes: avg('dayRes'), shifts: sum('shifts'), shiftsOwn: sum('shiftsOwn'), shiftsF: sum('shiftsF'), shiftsS: sum('shiftsS'), trainFgh: sum('trainFgh'),
    months: ms.map(m => ({ total: m.total, locCost: m.locCost, coverF: m.coverF, coverS: m.coverS, surplus: m.surplus, dayRes: m.dayRes })) };
  Object.keys(BT).forEach(k => { const f = ms.reduce((a, m) => a + m.bt[k][0], 0), n = ms.reduce((a, m) => a + m.bt[k][1], 0); out['bt_' + k] = n ? f / n : 1; });
  return out;
}

/* ---------- the workings: one average year, every step, so it can be checked by hand ---------- */
function workings(s) {
  s = syncAccp(JSON.parse(JSON.stringify(s)));
  const cs = corePeople(s), pay = payTable(s), w = 52 / 12, z = () => Object.fromEntries(TYPES.map(t => [t, 0]));
  const per = (st, k) => { const o = z(); for (let mo = 0; mo < 12; mo++) { const pp = perPerson(st, k, mo); TYPES.forEach(t => o[t] += pp[t] * w); } return o; };
  const noLeave = JSON.parse(JSON.stringify(s)); noLeave.absence = { sick: 0, other: 0 };
  Object.values(noLeave.groups).forEach(g => { g.al = 0; g.bh = 0; g.study = 0; g.induct = 0; g.spa = 0; g.actingUp = 0; });
  const noAbs = JSON.parse(JSON.stringify(s)); noAbs.absence = { sick: 0, other: 0 };
  const groups = {}, site = () => ({ fgh: z(), srh: z() });
  const need = site(), filled = site(), gap = site(), loc = Object.fromEntries(TYPES.map(t => [t, { shifts: 0, hours: TH[t], rate: locumRate(s, t), cost: 0, fgh: 0, srh: 0 }]));
  for (let mo = 0; mo < 12; mo++) {
    const a = month(s, cs, mo, null, pay).a;
    a.pools.forEach(p => {
      const k = p.g, G = groups[k] || (groups[k] = { k, label: k === 'anaesX' ? 'FGH anaesthetist' : k === 'oldhamX' ? 'Oldham' : s.groups[k].label, rota: 0, supply: z(), fgh: z(), srh: z(), spare: z() });
      G.rota += (p.heads || 0) / 12;
      TYPES.forEach(t => { G.supply[t] += p.amt[t] * w; G.fgh[t] += (p.used[t].fgh || 0) * w; G.srh[t] += ((p.used[t].air || 0) + (p.used[t].na || 0)) * w; G.spare[t] += p.left[t] * w; });
    });
    TYPES.forEach(t => {
      need.fgh[t] += a.nMin.fgh[t] * w; need.srh[t] += (a.nMin.air[t] + a.nMin.na[t]) * w;
      filled.fgh[t] += Math.min(a.filled.fgh[t], a.nMin.fgh[t]) * w; filled.srh[t] += (Math.min(a.filled.air[t], a.nMin.air[t]) + Math.min(a.filled.na[t], a.nMin.na[t])) * w;
      gap.fgh[t] += a.gap.fgh[t] * w; gap.srh[t] += (a.gap.air[t] + a.gap.na[t]) * w;
    });
  }
  TYPES.forEach(t => { const L = loc[t]; L.fgh = gap.fgh[t]; L.srh = gap.srh[t]; L.shifts = L.fgh + L.srh; L.cost = L.shifts * L.hours * L.rate; });
  let staff = 0;
  Object.keys(s.groups).forEach(k => {
    const g = s.groups[k], wte = CORE.includes(k) ? cs[k].paid * wf(g) : g.posts * fillOf(g, null, k) * wf(g);
    const G = groups[k] || (groups[k] = { k, label: g.label, rota: 0, supply: z(), fgh: z(), srh: z(), spare: z() });
    Object.assign(G, { posts: CORE.includes(k) ? g.posts + (g.newPosts || 0) : g.posts, paidWte: wte, gross: pay[k].gross, on: pay[k].on, cost: wte * (pay[k].gross + pay[k].on),
      tmpl: per(noLeave, k), afterLeave: per(noAbs, k), final: per(s, k), leave: (g.al || 0) + (g.bh || 0) + (g.study || 0) + (g.spa || 0), absence: s.absence.sick + s.absence.other });
    staff += G.cost;
  });
  const locum = TYPES.reduce((a, t) => a + loc[t].cost, 0);
  return { groups, need, filled, gap, loc, staff, locum, total: staff + locum, TYPES, TH };
}

/* ---------- ranges: randomised years ---------- */
function rng(seed) { let x = seed >>> 0 || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
function drawCore(s, r) {
  const out = {};
  CORE.forEach(k => {
    const n = s.groups[k].posts + (s.groups[k].newPosts || 0), pf = corePipe(s, k);
    const o = { full: 0, srhOnly: 0, super: 0, paid: 0, n };
    for (let i = 0; i < n; i++) { const u = r(); if (u < pf.vacant) continue; o.paid++; if (u < pf.vacant + pf.super) o.super++; else if (u < pf.vacant + pf.super + pf.srhOnly) o.srhOnly++; else o.full++; }
    out[k] = o;
  });
  return out;
}
function simulate(s, years, seed) {
  syncAccp(s);
  const r = rng(seed || 7), pay = payTable(s), Y = [], G = s.groups;
  const pick = a => a[Math.floor(r() * a.length)];
  for (let y = 0; y < (years || 40); y++) {
    const ms = [];
    for (let mo = 0; mo < 12; mo++) {
      if (s.core.stable) { ms.push(month(s, corePeople(s), mo, null, pay)); continue; }
      const cs = drawCore(s, r);
      const icm = pick(DRAW.icm) / 10 / DRAW_BASE.icm;
      // a fill of 100% or more means a full complement every month: no deanery draw
      const fx = (k, v) => G[k].fill >= 1 ? G[k].fill : v;
      const fills = { icm1: fx('icm1', icm * G.icm1.fill), icm2: fx('icm2', icm * G.icm2.fill), icm3: fx('icm3', icm * G.icm3.fill), anaes: fx('anaes', pick(DRAW.anaes) / 3 / DRAW_BASE.anaes * G.anaes.fill),
        accs: fx('accs', pick(DRAW.accs) / 4 / DRAW_BASE.accs * G.accs.fill), imt: fx('imt', Math.min(1.25, pick(DRAW.imt) / 4) * G.imt.fill) };
      const x = Object.assign({}, s, { absence: { sick: s.absence.sick * (0.6 + 0.8 * r()), other: s.absence.other * (0.6 + 0.8 * r()) } });
      ms.push(month(x, cs, mo, fills, pay));
    }
    Y.push(summarise(ms));
  }
  const q = (k, p) => { const v = Y.map(o => o[k]).sort((a, b) => a - b); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
  const band = k => ({ lo: q(k, 0.1), mid: q(k, 0.5), hi: q(k, 0.9) });
  const keys = ['total', 'locum', 'locPay', 'locAdd', 'substantive', 'wages', 'oncost', 'salford', 'fairfield', 'locShifts', 'coverF', 'coverS', 'coverFL', 'coverSL', 'airCover', 'srhAirMin', 'srhAirTarget', 'surplus', 'dayRes', 'shifts', 'shiftsOwn', 'shiftsF', 'shiftsS', 'fullMonths', 'recruit', ...Object.keys(BT).map(k => 'bt_' + k)];
  const out = {}; keys.forEach(k => out[k] = band(k));
  out.pFullMonth = Y.reduce((a, o) => a + o.fullMonths, 0) / (Y.length * 12);
  // average month shape, for the by-month views
  out.months = Array.from({ length: 12 }, (_, i) => { const avgK = k => Y.reduce((a, o) => a + o.months[i][k], 0) / Y.length; return { total: avgK('total'), locCost: avgK('locCost'), coverF: avgK('coverF'), coverS: avgK('coverS'), surplus: avgK('surplus') }; });
  return out;
}

root.Model2 = { TYPES, MONTHS, LEAVE_F, ABS_F, PAY, CORE, OTHERS, now, grossPay, payTable, corePeople, allocate, month, year, simulate, locumRate, syncAccp, wteOf, wf, wfPeople, PRACTICE, perPersonPub: perPerson, bankAdd, locumParts, workings, payParts, onCost, PAY };
})(typeof window !== 'undefined' ? window : globalThis);
