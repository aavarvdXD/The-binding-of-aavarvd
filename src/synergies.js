// Named combinations of two Bindings. The effects themselves emerge from the Bindings interacting;
// this table only names them and records the first discovery (persisted in SV.c).
import {S} from './state.js';
import {SV,save} from './save.js';
import {toast} from './ui.js';
export const CB={'glass+echo':'Shard Storm','glass+grav':'Seeking Shrapnel','echo+pin':'Ghost Billiards','twin+grav':'Swarm Logic','fat+glass':'Cannon Flak','fat+grav':'Heavy Orbit','hot+twin':'Spray Paint','curse+twin':'Glass Cannon Array'};
// Call right after a Binding was added to S.own.
export function checkSynergies(id){
for(const o of S.own)if(o!=id){const k=[o,id].sort().join('+'),k2=[id,o].join('+'),n=CB[k]||CB[k2]||CB[o+'+'+id];if(n){toast('SYNERGY: '+n.toUpperCase());if(!SV.c.includes(n)){SV.c.push(n);save()}}}
}
