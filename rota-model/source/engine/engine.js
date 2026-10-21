/* FGH and SRH resident workforce model: engine. Pure functions, no DOM. */
(function (root) {
'use strict';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SH = { S: { s: 8, e: 16, h: 8 }, L: { s: 8, e: 20.5, h: 12.5 }, N: { s: 20, e: 32.5, h: 12.5 } };
const TYPES = ['Nwe', 'Lwe', 'Nwd', 'Lwd', 'Swd', 'Swe'];
const TYPE_HOURS = { Nwe: 12.5, Lwe: 12.5, Nwd: 12.5, Lwd: 12.5, Swd: 8, Swe: 8 };
const TYPE_LABEL = { Nwd: 'Weekday night', Nwe: 'Weekend night', Lwd: 'Weekday long day', Lwe: 'Weekend long day', Swd: 'Weekday short day', Swe: 'Weekend short day' };
// shifts of each type in a week of demand at 1 per day
const PER_WEEK = { Nwd: 4, Nwe: 3, Lwd: 5, Lwe: 2, Swd: 5, Swe: 2 };

/* ---------- rota lines ---------- */
const LINES = {
  scf_current: { name: '9-week template', note: 'The SCO ICU 100% rota template, 2026: the generic work schedule everyone works now. About 12.8 PA for a specialty doctor',
    grid: ['NN..L..', 'SLSL.LS', '.SNN...', 'LSLSL..', 'LSS.NNN', '..SSS..', 'SSSSS..', 'SLS.LSL', 'S.NN...'] },
  sd_10pa: { name: 'Specialty doctor 10 PA', note: 'All nights and long days of the current line, 6 short days',
    grid: ['NN..L..', '.L.L.LS', '.SNN...', 'LSL.L..', 'L...NNN', '..S....', '.S.....', '.LS.LSL', 'S.NN...'] },
  scf_weld: { name: 'Proposed: weekend long days', note: 'Current line with both weekend short days made long days',
    grid: ['NN..L..', 'SLSL.LL', '.SNN...', 'LSLSL..', 'LSS.NNN', '..SSS..', 'SSSSS..', 'SLS.LLL', 'S.NN...'] },
  sd_weld: { name: 'Proposed: 10 PA, weekend long days', note: '10 PA line with both weekend short days made long days',
    grid: ['NN..L..', '.L.L.LL', '.SNN...', 'LSL.L..', 'L...NNN', '..S....', '.S.....', '.LS.LLL', 'S.NN...'] },
  scf_actual: { name: 'Now, as actually worked', note: 'SCF shift mix from Allocate, Sep 2025 to Aug 2026: more nights, fewer short days than the template',
    grid: ['NN..L..', 'SLSL.LS', '.SNN...', 'LSLSL..', 'LSS.NNN', '..SSS..', 'NNN....', 'SLS.LSL', 'S.NN...'] },
  sd_2wn: { name: 'Proposed: two night weekends', note: 'Two of the three weekends are night blocks, for FGH weekend nights',
    grid: ['NN..L..', '.L.L.LL', '.S.S...', 'LSL.L..', 'L...NNN', '..S.S..', '.S.S...', 'L.L.NNN', '..S.L..'] },
  sd_same: { name: '9-week on-calls, no short days', note: 'The SCF line as actually worked, with every short day removed: all 12 nights and 11 long days per 9 weeks, 9.6 PA',
    grid: ['NN..L..', '.L.L.L.', '..NN...', 'L.L.L..', 'L...NNN', '.......', 'NNN....', '.L..L.L', '..NN...'] },
  accp10: { name: 'ACCP 10-week', note: 'Agenda for Change, about 37 hours a week. Built so 14 ACCPs give about one on every Salford night and one to two on every day, as they work now',
    grid: ['NNNN...', 'L.S.L..', 'S.L..LL', 'LS.L...', 'S.L.S..', 'L...NNN', '..L.L..', 'S.L.S..', 'L.S..LL', 'SL.S...'] },
  fgh6: { name: '6-week Fairfield line', note: 'For SCFs who cover Fairfield: 2 weekends in 6, both on call (a Friday to Sunday night set and a weekend of long days), no weekend short days. Same 1 in 3 weekends, 50% more weekend nights and long days than the 9-week template',
    grid: ['SLS.NNN', '..LSL..', 'NNNN...', 'SLS..LL', 'L.SLS..', 'SLS....'] },
  scf_2n: { name: '9-week template, two extra weekday night sets', note: 'Suggestion: the 9-week template with a Wednesday to Thursday night set in week 6 and a Monday to Tuesday set in week 7 in place of standard days. Weekends unchanged',
    grid: ['NN..L..', 'SLSL.LS', '.SNN...', 'LSLSL..', 'LSS.NNN', '..NN...', 'NN..S..', 'SLS.LSL', 'S.NN...'] },
  sd13: { name: '9-week template, 13 PA', note: 'For specialty doctors: the 9-week template with one more weekday standard day, 13 PA',
    grid: ['NN..L..', 'SLSL.LS', 'SSNN...', 'LSLSL..', 'LSS.NNN', '..SSS..', 'SSSSS..', 'SLS.LSL', 'S.NN...'] },
  sd10: { name: '9-week template, 10 PA', note: 'For specialty doctors: every night and weekend shift of the 9-week template kept, 12 weekday short days dropped',
    grid: ['NN..L..', '.L.L.LS', '.SNN...', 'L.L.L..', 'LS..NNN', '..S....', 'S.S....', '.LS.LSL', '..NN...'] },
  ltft80: { name: 'Part-time 80%', note: 'SCO ICU part-time 80% rota template, 2026', hidden: true,
    grid: ['NN..S..',  '.LS..LS',  '..NN...',  'SS.LL..',  'SSS.NNN',  '..LSS..',  'SS.S...',  'SL..L.S',  'L.L....'] },
  ltft70: { name: 'Part-time 70%', note: 'SCO ICU part-time 70% rota template, 2026', hidden: true,
    grid: ['NN..S..',  '..S..LS',  '..NN...',  'SS.LL..',  'LSS.NNN',  '..SS...',  'SS.S...',  'S..SL.S',  'L.L....'] },
  ltft60: { name: 'Part-time 60%', note: 'SCO ICU part-time 60% rota template, 2026', hidden: true,
    grid: ['S.S.L.L',  '..S.S..',  'NN.....',  'S...NNN',  '...SS..',  'L.S..L.',  'L.L....',  'S.S.S..',  'S...S..'] },
  ltft50: { name: 'Part-time 50%', note: 'SCO ICU part-time 50% rota template, 2026', hidden: true,
    grid: ['NN..S..',  '.LS..LS',  '.......',  '.S.SL..',  '.SS..LL',  '..S.S..',  'S......',  '...LL..',  'S.S....'] },
  two_nw: { name: 'Two night weekends', note: 'The 9-week template with two of the three worked weekends as Friday to Sunday nights and the third as two long days; fewer weekday short days',
    grid: ['NN..L..', 'SL..NNN', '..NN...', 'LSLS...', 'LSS.NNN', '..SS...', 'NNN....', 'SLS.LLL', 'S.NN...'] },
  two_nw_pa: { name: 'Two night weekends, 10 PA', note: 'Two night weekends for specialty doctors: no short days, about 10 PA',
    grid: ['NN..L..', '.L..NNN', '..NN...', 'L...L..', 'L...NNN', '.......', 'NNN....', '.L..LLL', '..NN...'] },
  sd_eff6: { name: 'Proposed: 6-week, full weekends', note: 'Each worked weekend is Friday to Sunday nights or Saturday and Sunday long days; one Monday to Thursday night block',
    grid: ['....NNN', '..L.L..', 'NNNN...', '..SL...', 'L.S..LL', '.L.S...'] },
  prop6: { name: 'Proposal 6-week line', note: 'FGH tier proposal, 6 SCFs, 1 in 3 weekends',
    grid: ['NN..S..', 'SSNN...', 'SS..NNN', '..LL...', 'SSSSS..', 'LL..LLL'] },
  prop9: { name: 'Proposal 9-week line', note: 'FGH tier proposal, 9 SCFs, 1 in 3 weekends',
    grid: ['NN..S..', 'SLSL.LL', '..NN...', 'LSLSL..', 'LSS.NNN', '..SSS..', 'SSSSS..', 'SLS.LSS', 'S.NN...'] }
};

function lineCounts(grid, extraSD) {
  const c = { Nwd: 0, Nwe: 0, Lwd: 0, Lwe: 0, Swd: 0, Swe: 0 };
  grid.forEach(row => [...row].forEach((ch, d) => {
    if (ch === 'N') c[d >= 4 ? 'Nwe' : 'Nwd']++;
    else if (ch === 'L') c[d >= 5 ? 'Lwe' : 'Lwd']++;
    else if (ch === 'S') c[d >= 5 ? 'Swe' : 'Swd']++;
  }));
  c.Swd += extraSD || 0;
  return c;
}

function shiftsOf(grid) {
  const out = [];
  grid.forEach((row, w) => [...row].forEach((ch, d) => {
    if (SH[ch]) { const b = (w * 7 + d) * 24; out.push({ t: ch, s: b + SH[ch].s, e: b + SH[ch].e, w, d }); }
  }));
  return out;
}

function lineHours(grid, extraSD) {
  const cw = grid.length; let h = 0;
  shiftsOf(grid).forEach(s => h += s.e - s.s);
  return (h + 8 * (extraSD || 0)) / cw;
}

// PAs per week: weekday 07:00-19:00 = 4h per PA, any other time = 3h per PA
function linePAs(grid, extraSD) {
  let pa = 0;
  shiftsOf(grid).forEach(s => {
    for (let t = s.s; t < s.e; t += 0.25) {
      const day = Math.floor(t / 24) % 7, hr = t % 24;
      const inHours = day < 5 && hr >= 7 && hr < 19;
      pa += 0.25 / (inHours ? 4 : 3);
    }
  });
  pa += (extraSD || 0) * 2;
  return pa / grid.length;
}

/* contract checks: 2016 resident doctor TCS, with the weekend cap set by the service */
function checkLine(grid, opts) {
  const o = Object.assign({ weekendCap: 3, extraSD: 0 }, opts || {});
  const cw = grid.length, span = cw * 168, sh = shiftsOf(grid).sort((a, b) => a.s - b.s);
  const res = [];
  const n = sh.length;
  // weekends
  let we = 0;
  for (let w = 0; w < cw; w++) {
    const a = (w * 7 + 5) * 24, b = a + 48;
    if (sh.some(s => [0, -span].some(off => s.s + off < b && s.e + off > a))) we++;
  }
  const freq = we / cw;
  res.push({ k: 'weekends', label: 'Weekends', ok: freq <= 1 / o.weekendCap + 1e-9, val: we + ' in ' + cw, need: '1 in ' + o.weekendCap + ' or less' });
  // average hours
  const avg = lineHours(grid, o.extraSD);
  res.push({ k: 'avg', label: 'Average hours', ok: avg <= 48 + 1e-9, val: avg.toFixed(1) + ' h', need: '48 or less' });
  // 72 h in any 168
  let max72 = 0;
  const ext = sh.concat(sh.map(s => ({ ...s, s: s.s + span, e: s.e + span })));
  for (const a of ext) {
    const st = a.s, en = st + 168; let h = 0;
    for (const b of ext) h += Math.max(0, Math.min(b.e, en) - Math.max(b.s, st));
    if (st < span) max72 = Math.max(max72, h);
  }
  res.push({ k: 'h168', label: 'Hours in any 7 days', ok: max72 <= 72 + 1e-9, val: max72.toFixed(1) + ' h', need: '72 or less' });
  // consecutive runs on consecutive days (circular)
  const byDay = new Array(cw * 7).fill(null);
  sh.forEach(s => byDay[s.w * 7 + s.d] = s.t);
  function maxRun(pred) {
    let best = 0;
    for (let i = 0; i < byDay.length; i++) {
      if (!pred(byDay[i]) || pred(byDay[(i - 1 + byDay.length) % byDay.length])) continue;
      let k = 0; while (k < byDay.length && pred(byDay[(i + k) % byDay.length])) k++;
      best = Math.max(best, k);
    }
    if (best === 0 && byDay.every(pred)) best = byDay.length;
    return best;
  }
  const rn = maxRun(x => x === 'N'), rl = maxRun(x => x === 'N' || x === 'L'), ra = maxRun(x => !!x);
  res.push({ k: 'nights', label: 'Nights in a row', ok: rn <= 4, val: String(rn), need: '4 or fewer' });
  res.push({ k: 'long', label: 'Long shifts in a row', ok: rl <= 4, val: String(rl), need: '4 or fewer' });
  res.push({ k: 'run', label: 'Shifts in a row', ok: ra <= 7, val: String(ra), need: '7 or fewer' });
  // rest
  let minRest = 1e9, nightRest = 1e9, longRest = 1e9;
  for (let i = 0; i < n; i++) {
    const a = sh[i], b = i + 1 < n ? sh[i + 1] : { ...sh[0], s: sh[0].s + span };
    const gap = b.s - a.e;
    minRest = Math.min(minRest, gap);
    if (a.t === 'N' && b.t !== 'N') nightRest = Math.min(nightRest, gap);
  }
  res.push({ k: 'rest', label: 'Rest between shifts', ok: minRest >= 11 - 1e-9, val: minRest.toFixed(1) + ' h', need: '11 or more' });
  res.push({ k: 'nrest', label: 'Rest after nights', ok: nightRest >= 46 - 1e-9, val: (nightRest > 1e8 ? 'none' : nightRest.toFixed(1) + ' h'), need: '46 or more' });
  return { ok: res.every(r => r.ok), items: res, hours: avg, pas: linePAs(grid, o.extraSD), weekends: freq };
}

/* ---------- staffing baselines from the workforce deck (WTE in post) ---------- */
const TREND = {
  months: ['Feb-25', 'May-25', 'Aug-25', 'Nov-25', 'Feb-26', 'May-26', 'Aug-26'],
  icm: [8.4, 9.4, 8.2, 7.8, 10.6, 7.6, 9.4], anaes: [2.6, 3, 1.8, 2.6, 3, 3, 3], imt: [4, 4, 4, 3.6, 5, 4, 4],
  fy2: [4, 4, 4, 4, 4, 4, 4], accs: [3, 3, 3.8, 3.8, 3, 3, 2], scf: [5.6, 6.4, 7.4, 7.8, 8.8, 9.8, 8.8], jcf: [4, 4, 4, 4, 4, 4, 4]
};
const POSTS = { icm: 10, anaes: 3, imt: 4, fy2: 4, accs: 4, jcf: 4 };
function baselineFill(which) {
  const out = {};
  Object.keys(POSTS).forEach(k => {
    const a = TREND[k]; let v;
    if (which === 'aug26') v = a[a.length - 1];
    else if (which === 'low') v = Math.min(...a);
    else v = a.reduce((x, y) => x + y, 0) / a.length;
    out[k] = Math.min(1.25, v / POSTS[k]);
  });
  return out;
}

/* ---------- default scenario ---------- */
function defaultScenario(kind) {
  const f = baselineFill('aug26');
  const g = (o) => Object.assign({ posts: 0, fill: 1, ltft: 1, sick: 0.04, noNights: 0, al: 27, bh: 8, study: 10, spa: 0, line: 'scf_current' }, o);
  const s = {
    name: 'Today',
    weekendCap: 3,
    groups: {
      scf: g({ label: 'SCF', tier: 'core', posts: 9, newPosts: 0, al: 32, study: 10, line: 'scf_current' }),
      sd: g({ label: 'Specialty doctor', tier: 'core', posts: 0, newPosts: 0, al: 32, study: 0, spa: 12, line: 'sd_10pa', extraPA: 0 }),
      icm1: g({ label: 'ICM stage 1', tier: 'air', posts: 3, fill: f.icm, fgh: false }),
      icm2: g({ label: 'ICM stage 2', tier: 'air', posts: 4, fill: f.icm, fgh: false }),
      icm3: g({ label: 'ICM stage 3 (ST7+)', tier: 'air', posts: 3, fill: f.icm, fgh: false, actingUp: 2 }),
      anaes: g({ label: 'Anaesthesia', tier: 'air', posts: 3, fill: f.anaes }),
      accpSr: g({ label: 'ACCP, transfer and FGH', tier: 'na', posts: 3, ltft: 0.75, al: 29, study: 5, line: 'scf_current' }),
      accp: g({ label: 'ACCP, other', tier: 'na', posts: 7, ltft: 0.75, al: 29, study: 5, line: 'scf_current' }),
      accpAir: g({ label: 'ACCP, advanced airway', tier: 'na', posts: 0, ltft: 0.75, al: 29, study: 5, line: 'scf_current' }),
      jcf: g({ label: 'JCF', tier: 'na', posts: 4, fill: f.jcf, fgh: true, rotation: 12, leadIn: 3, al: 27, study: 5 }),
      accs: g({ label: 'ACCS', tier: 'na', posts: 4, fill: f.accs, fgh: true, rotation: 6, leadIn: 2 }),
      imt: g({ label: 'IMT', tier: 'na', posts: 4, fill: f.imt }),
      fy2: g({ label: 'FY2', tier: 'na', posts: 4, fill: f.fy2 }),
      other: g({ label: 'ED, neuro, renal, RCF', tier: 'na', posts: 2, study: 5 })
    },
    core: {
      stay: { scf: 30, sd: 30 }, vacancy: 4, supernum: 3, signoff: 6, extPlacement: 0,
      fghMode: 'auto', fghShare: 0.35, fghCap: 0.5, structure: 'blocks', weekendFghOthers: false, priority: 'fgh', fghAnaes: 0, fghDayShare: 0
    },
    demand: {
      fgh: { L: 1, N: 1 }, fghT: { L: 1, N: 1 },
      air: { Lwd: 2, Swd: 2, Lwe: 2, Swe: 1, N: 1 }, airT: { Lwd: 2, Swd: 2, Lwe: 2, Swe: 1, N: 2 },
      na: { Lwd: 3, Swd: 3, Lwe: 3, Swe: 2, N: 4 }, naT: { Lwd: 3, Swd: 3, Lwe: 3, Swe: 2, N: 4 }
    },
    cost: {
      scfPay: 90000, sdPay: 73383, ni: 0.15, niThreshold: 5000, pension: 0.1438,
      rate: { Lwd: 80, Nwd: 80, Lwe: 80, Nwe: 80, Swd: 80, Swe: 80 }, naRate: 80, locumTo: 'min', locumFill: 1, locumScope: 'airway', anaesNight: 0
    },
    lines: { trainee: LINES.scf_current.grid.slice(), accp: LINES.accp10.grid.slice(), custom: LINES.scf_current.grid.slice() },
    baseline: 'aug26'
  };
  if (kind === 'sd9') {
    s.name = '9 specialty doctors, 10 PA';
    s.groups.scf.posts = 0; s.groups.sd.posts = 9;
  } else if (kind === 'sd12') {
    s.name = '12 specialty doctors, 10 PA';
    s.groups.scf.posts = 0; s.groups.sd.posts = 9; s.groups.sd.newPosts = 3;
  }
  return s;
}

function gridFor(s, key) {
  if (LINES[key]) return LINES[key].grid;
  return s.lines[key] || LINES.scf_current.grid;
}

/* ---------- supply ---------- */
function availability(gr, core, isCore) {
  let a = 1 - (gr.al + gr.bh + gr.study) / 260 - gr.sick;
  if (isCore) a -= (core.extPlacement || 0) / 12;
  return Math.max(0, a);
}

// per-person-per-week shifts of each type, before people counts
function perPerson(s, key) {
  const gr = s.groups[key];
  const extra = key === 'sd' ? (gr.extraPA || 0) * 9 / 2 : 0;
  const grid = gridFor(s, gr.line);
  const cw = grid.length, c = lineCounts(grid, extra), out = {};
  TYPES.forEach(t => out[t] = c[t] / cw);
  if (gr.spa) out.Swd = Math.max(0, out.Swd - gr.spa / 52);
  // no-nights restriction: nights become long days
  if (gr.noNights) {
    out.Lwd += out.Nwd * gr.noNights; out.Lwe += out.Nwe * gr.noNights;
    out.Nwd *= 1 - gr.noNights; out.Nwe *= 1 - gr.noNights;
  }
  if (gr.actingUp) out.Nwd = Math.max(0, out.Nwd - gr.actingUp / 9);
  const av = availability(gr, s.core, gr.tier === 'core');
  TYPES.forEach(t => out[t] *= av);
  return out;
}

// steady-state pipeline fractions for SCF / specialty doctor posts
function pipeline(core, stay) {
  const T = Math.max(stay, core.signoff + 0.01), v = core.vacancy, C = T + v;
  return { vacant: v / C, super: Math.min(core.supernum, T) / C, srhOnly: Math.max(0, core.signoff - core.supernum) / C,
    full: Math.max(0, T - core.signoff) / C, paid: T / C };
}

/* ---------- allocation ---------- */
function allocate(s, coreState) {
  // coreState: for scf and sd: { full, srhOnly, super, paid } in people (WTE before ltft)
  const G = s.groups, core = s.core, pools = [];
  const add = (id, g, heads, el) => {
    if (heads <= 0) return;
    const pp = perPerson(s, g), amt = {};
    TYPES.forEach(t => amt[t] = pp[t] * heads);
    pools.push({ id, g, amt, used: Object.fromEntries(TYPES.map(t => [t, {}])), el });
  };
  // core groups
  ['scf', 'sd'].forEach(k => {
    const cs = coreState[k], lt = G[k].ltft;
    add(k + 'Full', k, cs.full * lt, { fgh: true, air: true, airS: true, na: true });
    let srh = cs.srhOnly * lt;
    add(k + 'Srh', k, srh, { air: true, airS: true, na: true, mixedLoss: core.structure === 'mixed' });
  });
  ['icm1', 'icm2', 'icm3'].forEach(k => add(k, k, G[k].posts * G[k].fill * G[k].ltft, { air: true, airS: true, na: true, fghL: !!G[k].fgh }));
  add('anaes', 'anaes', G.anaes.posts * G.anaes.fill * G.anaes.ltft, { air: true, airS: true, na: true });
  add('accpSr', 'accpSr', G.accpSr.posts * G.accpSr.fill * G.accpSr.ltft, { airS: true, na: true, fghL: true });
  add('accp', 'accp', G.accp.posts * G.accp.fill * G.accp.ltft, { na: true });
  if (G.accpAir) add('accpAir', 'accpAir', G.accpAir.posts * G.accpAir.fill * G.accpAir.ltft, { air: true, airS: true, na: true });
  ['jcf', 'accs'].forEach(k => {
    const gr = G[k], heads = gr.posts * gr.fill * gr.ltft;
    const ef = gr.fgh ? Math.max(0, (gr.rotation - gr.leadIn) / gr.rotation) : 0;
    add(k + 'E', k, heads * ef, { na: true, fghL: true });
    add(k + 'N', k, heads * (1 - ef), { na: true });
  });
  ['imt', 'fy2', 'other'].forEach(k => add(k, k, G[k].posts * G[k].fill * G[k].ltft, { na: true }));

  // mixed rota: doctors not yet signed off for FGH lose the FGH shifts on their line
  const shareGuess = core.fghMode === 'manual' ? core.fghShare : core.fghCap;
  pools.forEach(p => {
    if (p.el.mixedLoss) TYPES.forEach(t => { if (t[0] !== 'S') p.amt[t] *= (1 - shareGuess); });
  });
  // FGH nights cross-covered by the on-site FGH anaesthetic middle grade
  if (core.fghAnaes > 0) {
    const sh = Math.min(1, core.fghAnaes), amt = {};
    TYPES.forEach(t => amt[t] = 0);
    amt.Nwd = 4 * s.demand.fgh.N * sh; amt.Nwe = 3 * s.demand.fgh.N * sh;
    pools.push({ id: 'anaesX', g: 'anaesX', amt, used: Object.fromEntries(TYPES.map(t => [t, {}])), el: { fgh: true } });
  }
  pools.forEach(p => p.left = Object.assign({}, p.amt));
  const byId = Object.fromEntries(pools.map(p => [p.id, p]));

  const D = s.demand;
  const need = (lvl) => {
    const air = lvl === 'min' ? D.air : D.airT, na = lvl === 'min' ? D.na : D.naT, f = lvl === 'min' ? D.fgh : D.fghT;
    return {
      fgh: { Nwd: f.N * 4, Nwe: f.N * 3, Lwd: f.L * 5, Lwe: f.L * 2, Swd: 0, Swe: 0 },
      air: { Nwd: air.N * 4, Nwe: air.N * 3, Lwd: air.Lwd * 5, Lwe: air.Lwe * 2, Swd: air.Swd * 5, Swe: air.Swe * 2 },
      na: { Nwd: na.N * 4, Nwe: na.N * 3, Lwd: na.Lwd * 5, Lwe: na.Lwe * 2, Swd: na.Swd * 5, Swe: na.Swe * 2 }
    };
  };
  const nMin = need('min'), nT = need('target');
  const filled = { min: { fgh: {}, air: {}, na: {} }, extra: { fgh: {}, air: {}, na: {} } };
  ['min', 'extra'].forEach(l => ['fgh', 'air', 'na'].forEach(c => TYPES.forEach(t => filled[l][c][t] = 0)));

  // src: the supply type drawn on (a long day can cover a short-day slot)
  function take(poolIds, t, want, lvl, cat, cap, src) {
    src = src || t;
    let got = 0;
    for (const id of poolIds) {
      const p = byId[id]; if (!p) continue;
      let room = want - got; if (room <= 1e-9) break;
      if (cap) room = Math.min(room, cap.left / TYPE_HOURS[src]);
      const x = Math.min(room, p.left[src]);
      if (x <= 1e-12) continue;
      p.left[src] -= x; got += x;
      p.used[src][cat] = (p.used[src][cat] || 0) + x;
      if (cap) cap.left -= x * TYPE_HOURS[src];
    }
    filled[lvl][cat][t] += got;
    return got;
  }

  // FGH hours budget for SCF and specialty doctors: share of the hours they work
  const coreFull = ['scfFull', 'sdFull'].filter(id => byId[id]);
  let coreHours = 0;
  ['scfFull', 'sdFull', 'scfSrh', 'sdSrh'].forEach(id => { const p = byId[id]; if (p) TYPES.forEach(t => coreHours += p.amt[t] * TYPE_HOURS[t]); });
  let fullHours = 0;
  coreFull.forEach(id => TYPES.forEach(t => fullHours += byId[id].amt[t] * TYPE_HOURS[t]));
  const share = core.fghMode === 'manual' ? Math.min(core.fghShare, core.fghCap) : core.fghCap;
  const budget = { left: share * fullHours };
  const budget0 = budget.left;

  const otherFghL = ['accpSr', 'jcfE', 'accsE', 'icm1', 'icm2', 'icm3'].filter(id => byId[id] && byId[id].el.fghL);
  const fghOrder = ['Nwe', 'Lwe', 'Nwd', 'Lwd'];
  function fghPass(lvl, needT) {
    // training: a share of SCF and specialty doctor FGH time goes on weekday days
    if (lvl === 'min' && core.fghDayShare > 0) take(coreFull, 'Lwd', Math.min(needT.fgh.Lwd, core.fghDayShare * budget0 / 12.5), lvl, 'fgh', budget);
    // cross-covered nights first
    if (byId.anaesX) ['Nwe', 'Nwd'].forEach(t => { const already = filled.min.fgh[t] + (lvl === 'extra' ? filled.extra.fgh[t] : 0); take(['anaesX'], t, (lvl === 'min' ? nMin.fgh[t] : nT.fgh[t]) - already, lvl, 'fgh'); });
    // others first for long days (weekday always, weekend if allowed)
    ['Lwd', 'Lwe'].forEach(t => {
      if (t === 'Lwe' && !s.core.weekendFghOthers) return;
      const already = filled.min.fgh[t] + (lvl === 'extra' ? filled.extra.fgh[t] : 0);
      take(otherFghL, t, needT.fgh[t] - already, lvl, 'fgh');
    });
    fghOrder.forEach(t => {
      const already = filled.min.fgh[t] + (lvl === 'extra' ? filled.extra.fgh[t] : 0);
      const want = (lvl === 'min' ? nMin.fgh[t] : nT.fgh[t]) - already;
      if (want > 0) take(coreFull, t, want, lvl, 'fgh', budget);
    });
  }
  const airOrderLN = ['accpAir', 'icm1', 'icm2', 'icm3', 'anaes', 'scfSrh', 'sdSrh', 'scfFull', 'sdFull'];
  const airOrderS = ['accpSr', 'accpAir', 'icm1', 'icm2', 'icm3', 'anaes', 'scfSrh', 'sdSrh', 'scfFull', 'sdFull'];
  const naOrder = ['fy2', 'imt', 'other', 'accsN', 'jcfN', 'accp', 'accsE', 'jcfE', 'accpSr', 'accpAir', 'icm1', 'icm2', 'icm3', 'anaes', 'scfSrh', 'sdSrh', 'scfFull', 'sdFull'];
  function srhPass(lvl, cat) {
    TYPES.forEach(t => {
      const want = lvl === 'min' ? nMin[cat][t] : nT[cat][t] - nMin[cat][t] > 0 ? Math.max(0, nT[cat][t] - filled.min[cat][t]) : 0;
      if (want <= 0) return;
      const order = cat === 'na' ? naOrder : (t[0] === 'S' ? airOrderS : airOrderLN);
      const got = take(order, t, want, lvl, cat);
      if (t[0] === 'S' && want - got > 1e-9) take(cat === 'na' ? naOrder : airOrderLN, t, want - got, lvl, cat, null, 'L' + t.slice(1));
    });
  }
  if (core.priority === 'srh') {
    srhPass('min', 'air'); srhPass('extra', 'air'); fghPass('min', nMin);
    srhPass('min', 'na'); fghPass('extra', nT); srhPass('extra', 'na');
  } else {
    fghPass('min', nMin); srhPass('min', 'air'); srhPass('min', 'na');
    fghPass('extra', nT); srhPass('extra', 'air'); srhPass('extra', 'na');
  }

  // results
  const gap = { min: {}, target: {} };
  ['fgh', 'air', 'na'].forEach(c => {
    gap.min[c] = {}; gap.target[c] = {};
    TYPES.forEach(t => {
      gap.min[c][t] = Math.max(0, nMin[c][t] - filled.min[c][t]);
      gap.target[c][t] = Math.max(0, nT[c][t] - filled.min[c][t] - filled.extra[c][t]);
    });
  });
  let fghCoreHours = 0;
  coreFull.forEach(id => TYPES.forEach(t => fghCoreHours += (byId[id].used[t].fgh || 0) * TYPE_HOURS[t]));
  return { pools, byId, need: { min: nMin, target: nT }, filled, gap, fghShare: fullHours ? fghCoreHours / fullHours : 0, fghShareAll: coreHours ? fghCoreHours / coreHours : 0 };
}

/* ---------- costs ---------- */
function onCost(pay, c) { return pay * c.pension + Math.max(0, pay - c.niThreshold) * c.ni; }

function staffCost(s, coreState) {
  const out = {};
  ['scf', 'sd'].forEach(k => {
    const gr = s.groups[k], c = s.cost;
    let pay;
    if (k === 'scf') pay = c.scfPay;
    else { const grid = gridFor(s, gr.line); pay = c.sdPay * linePAs(grid, (gr.extraPA || 0) * 9 / 2) / 10; }
    const perWTE = pay * gr.ltft;
    const heads = coreState[k].paid;
    out[k] = { heads, pay: pay, perPerson: perWTE + onCost(perWTE, c), wages: heads * perWTE, oncost: heads * onCost(perWTE, c),
      pension: heads * perWTE * c.pension, ni: heads * Math.max(0, perWTE - c.niThreshold) * c.ni, total: heads * (perWTE + onCost(perWTE, c)) };
  });
  out.extra = 0;
  out.total = out.scf.total + out.sd.total;
  out.wages = out.scf.wages + out.sd.wages; out.oncost = out.scf.oncost + out.sd.oncost;
  out.pension = out.scf.pension + out.sd.pension; out.ni = out.scf.ni + out.sd.ni;
  return out;
}

function locumCost(s, alloc) {
  const c = s.cost, lvl = c.locumTo === 'target' ? 'target' : 'min';
  let shifts = 0, cost = 0, hours = 0;
  const byCat = { fgh: {}, air: {}, na: {} };
  ['fgh', 'air', 'na'].forEach(cat => TYPES.forEach(t => {
    const g = (cat === 'na' && c.locumScope !== 'all') ? 0 : alloc.gap[lvl][cat][t] * 52 * c.locumFill;
    const rate = cat === 'na' ? c.naRate : c.rate[t];
    byCat[cat][t] = g;
    shifts += g; hours += g * TYPE_HOURS[t]; cost += g * TYPE_HOURS[t] * rate;
  }));
  return { shifts, hours, cost, byCat };
}

/* ---------- headline run ---------- */
function steadyCore(s) {
  const out = {};
  ['scf', 'sd'].forEach(k => {
    const gr = s.groups[k], n = (gr.posts || 0) + (gr.newPosts || 0), pf = pipeline(s.core, s.core.stay[k]);
    out[k] = { full: n * pf.full, srhOnly: n * pf.srhOnly, super: n * pf.super, paid: n * pf.paid, vacant: n * pf.vacant };
  });
  return out;
}

function summarise(s, alloc, cs) {
  const loc = locumCost(s, alloc), staff = staffCost(s, cs);
  if (alloc.byId.anaesX) { const nights = (TYPES.reduce((a, t) => a + (alloc.byId.anaesX.used[t].fgh || 0), 0)) * 52; staff.extra = nights * (s.cost.anaesNight || 0); staff.total += staff.extra; staff.anaesNights = nights; }
  let surplus = 0, surplusCore = 0; alloc.pools.forEach(p => { const v = (p.left.Swd + p.left.Swe) * 52; surplus += v; if (p.g === 'scf' || p.g === 'sd') surplusCore += v; });
  let needAll = 0, fillAll = 0; ['fgh', 'air', 'na'].forEach(c => TYPES.forEach(t => { needAll += alloc.need.min[c][t] * 52; fillAll += alloc.filled.min[c][t] * 52; }));
  const sum = (lvl, cat, types) => (types || TYPES).reduce((a, t) => a + alloc.need[lvl === 'min' ? 'min' : 'target'][cat][t], 0);
  const fil = (cat, types) => (types || TYPES).reduce((a, t) => a + alloc.filled.min[cat][t], 0);
  const cover = {
    fgh: fil('fgh') / Math.max(1e-9, sum('min', 'fgh')),
    fghOOH: fil('fgh', ['Nwd', 'Nwe', 'Lwe']) / Math.max(1e-9, sum('min', 'fgh', ['Nwd', 'Nwe', 'Lwe'])),
    air: fil('air') / Math.max(1e-9, sum('min', 'air')),
    na: fil('na') / Math.max(1e-9, sum('min', 'na'))
  };
  const tgtNeed = ['fgh', 'air', 'na'].reduce((a, c) => a + sum('t', c), 0);
  const tgtGap = ['fgh', 'air', 'na'].reduce((a, c) => a + TYPES.reduce((b, t) => b + alloc.gap.target[c][t], 0), 0);
  cover.target = 1 - tgtGap / Math.max(1e-9, tgtNeed);
  const airMinAll = (fil('fgh') + fil('air')) / Math.max(1e-9, sum('min', 'fgh') + sum('min', 'air'));
  cover.airwayAll = airMinAll;
  // how SCF and specialty doctors are used (shifts per year)
  const use = {};
  ['scf', 'sd'].forEach(k => {
    const u = { fghN: 0, fghL: 0, air: 0, na: 0, spare: 0, lost: 0 };
    [k + 'Full', k + 'Srh'].forEach(id => {
      const p = alloc.byId[id]; if (!p) return;
      TYPES.forEach(t => {
        const us = p.used[t];
        if (us.fgh) { if (t[0] === 'N') u.fghN += us.fgh * 52; else u.fghL += us.fgh * 52; }
        u.air += (us.air || 0) * 52; u.na += (us.na || 0) * 52; u.spare += p.left[t] * 52;
      });
    });
    use[k] = u;
  });
  return { locum: loc, staff, total: loc.cost + staff.total, cover, use, fghShare: alloc.fghShare, fghShareAll: alloc.fghShareAll,
    surplus, surplusCore, shifts: { need: needAll, covered: fillAll } };
}

function run(s) {
  const cs = steadyCore(s);
  const alloc = allocate(s, cs);
  const sum = summarise(s, alloc, cs);
  return { alloc, core: cs, ...sum };
}

// what one more post in the growth group buys
function marginal(s) {
  const k = (s.groups.sd.posts + s.groups.sd.newPosts) > 0 ? 'sd' : 'scf';
  const base = run(s);
  const s2 = JSON.parse(JSON.stringify(s)); s2.groups[k].newPosts += 1;
  const r2 = run(s2);
  return { group: k, staff: r2.staff.total - base.staff.total, locum: r2.locum.cost - base.locum.cost, shifts: r2.locum.shifts - base.locum.shifts };
}

/* ---------- theoretical airway need ---------- */
function theoretical(s, lvl) {
  const D = s.demand, air = lvl === 'target' ? D.airT : D.air, f = lvl === 'target' ? D.fghT : D.fgh;
  const dayPeople = air.Lwe + air.Swe + f.L, nightPeople = air.N + f.N;
  const perWeekend = dayPeople + nightPeople;
  const lines = perWeekend * s.weekendCap;
  const grs = ['icm1', 'icm2', 'icm3', 'anaes', 'scf'].map(k => s.groups[k]);
  const av = grs.reduce((a, g) => a + availability(g, s.core, g.tier === 'core'), 0) / grs.length;
  const hoursWk = (air.Lwd * 5 + air.Lwe * 2 + air.N * 7 + f.L * 7 + f.N * 7) * 12.5 + (air.Swd * 5 + air.Swe * 2) * 8;
  const lineH = lineHours(LINES.scf_current.grid);
  return { dayPeople, nightPeople, perWeekend, lines, avail: av, weekendBound: lines / av, hoursWk, hoursBound: hoursWk / (lineH * av) };
}

/* ---------- 24-month view ---------- */
function months(s, n) {
  n = n || 24;
  const core = s.core, out = [];
  const st = {};
  ['scf', 'sd'].forEach(k => {
    const gr = s.groups[k];
    st[k] = { est: gr.posts, pipe: new Array(Math.ceil(core.signoff) + 1).fill(0), vac: [] };
    for (let i = 0; i < (gr.newPosts || 0); i++) st[k].vac.push(0);
  });
  for (let m = 0; m < n; m++) {
    const cs = {};
    ['scf', 'sd'].forEach(k => {
      const x = st[k], T = core.stay[k];
      // arrivals: vacancies that have waited long enough
      let arrive = 0; x.vac = x.vac.map(a => a + 1).filter(a => { if (a > core.vacancy) { arrive += 1; return false; } return true; });
      // fractional arrivals stored as weights
      x.vacW = (x.vacW || []).map(o => ({ a: o.a + 1, w: o.w })).filter(o => { if (o.a > core.vacancy) { arrive += o.w; return false; } return true; });
      // ramp
      const P = x.pipe, L = P.length;
      x.est += P[L - 1];
      for (let i = L - 1; i > 0; i--) P[i] = P[i - 1];
      P[0] = arrive;
      // leavers
      const leaveRate = 1 / T;
      const leaveEst = x.est * leaveRate; x.est -= leaveEst;
      let leaveP = 0; for (let i = 0; i < L; i++) { const l = P[i] * leaveRate; P[i] -= l; leaveP += l; }
      x.vacW.push({ a: 0, w: leaveEst + leaveP });
      let sup = 0, srh = 0;
      for (let i = 0; i < L; i++) { if (i < core.supernum) sup += P[i]; else srh += P[i]; }
      cs[k] = { full: x.est, srhOnly: srh, super: sup, paid: x.est + sup + srh };
    });
    const alloc = allocate(s, cs);
    const sm = summarise(s, alloc, cs);
    out.push({ m, locum: sm.locum.cost / 12, staff: sm.staff.total / 12, total: sm.total / 12, cover: sm.cover, inPost: cs.scf.paid + cs.sd.paid, ready: cs.scf.full + cs.sd.full });
  }
  return out;
}

// part-time versions of any 9-week line: the trust's part-time template, with that line's extra or missing
// weekday standard days scaled to the part-time share (so a 10 PA line's part-time version has fewer standard days too)
const PT_PCTS = [80, 70, 60, 50], ptCache = {};
function ptGrid(key, pct, s) {
  const id = key + '|' + pct; if (ptCache[id] && !(s && s.lines && s.lines[key])) return ptCache[id];
  const base = LINES['ltft' + pct].grid, full = LINES.scf_current.grid, line = (s && s.lines && s.lines[key]) || (LINES[key] && LINES[key].grid) || full;
  const sw = g => g.reduce((a, w) => a + [...w.slice(0, 5)].filter(c => c === 'S').length, 0);
  let d = Math.round((sw(line) - sw(full)) * pct / 100);
  const g = base.map(w => w.split(''));
  if (d < 0) { outer: for (let pass = 0; pass < 2; pass++) for (let w = g.length - 1; w >= 0; w--) for (let i = 4; i >= 0; i--) { if (d === 0) break outer; if (g[w][i] === 'S' && (pass || i % 2 === 0)) { g[w][i] = '.'; d++; } } }
  else for (let w = 0; w < g.length && d > 0; w++) for (let i = 0; i < 5 && d > 0; i++) { if (g[w][i] !== '.') continue; const t = g.map(r => r.join('')); t[w] = t[w].slice(0, i) + 'S' + t[w].slice(i + 1); if (checkLine(t).ok) { g[w][i] = 'S'; d--; } }
  const out = g.map(r => r.join('')); if (!(s && s.lines && s.lines[key])) ptCache[id] = out; return out;
}
root.Model = { PT_PCTS, ptGrid, DAYS, TYPES, TYPE_LABEL, TYPE_HOURS, PER_WEEK, LINES, TREND, POSTS, lineCounts, lineHours, linePAs, checkLine, baselineFill,
  defaultScenario, gridFor, perPerson, pipeline, allocate, run, marginal, theoretical, months, staffCost, onCost, availability };
})(typeof window !== 'undefined' ? window : globalThis);
