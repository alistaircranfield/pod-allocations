// Prints the headline numbers for Now. Run from this folder: node check/now.js
require('../engine/engine.js'); require('../engine/engine3.js');
const M2 = globalThis.Model2, s = M2.now(); M2.syncAccp(s);
const m = M2.simulate(s, 40, 5), p = x => (x * 100).toFixed(1) + '%';
console.log('Cost a year        £' + Math.round(m.total.mid).toLocaleString('en-GB'));
console.log('Locum shifts       ' + Math.round(m.locShifts.mid));
console.log('Fairfield nights and weekends by our rota  ' + p(m.bt_fOOH.mid));
console.log('Salford by our rota                         ' + p(m.coverS.mid));
