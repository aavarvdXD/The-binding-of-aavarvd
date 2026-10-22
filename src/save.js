// Persistent progress (localStorage key 'bov1' - unchanged from the single-file version, so old saves keep working).
// SV = {w: boss kills, d: deaths, c: discovered synergy names}
export const SV={w:0,d:0,c:[]};
try{Object.assign(SV,JSON.parse(localStorage.getItem('bov1')||'{}'))}catch(e){}
export const save=()=>{try{localStorage.setItem('bov1',JSON.stringify(SV))}catch(e){}};
