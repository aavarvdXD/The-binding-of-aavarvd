// The Auditor: slow tracking, alternating radial / aimed volleys, periodic Audit (disables one Binding), backup at half health.
import {R,RI} from './util.js';
import {sfx} from './audio.js';
import {BM} from './bindings.js';
import {eshot} from './projectiles.js';
import {mk} from './enemies.js';
import {toast} from './ui.js';
// Called from updateEnemies for e.t==='boss'. ctx = movement helper + vector to the player.
export function updateBoss(e,s,dt,{step,dx,dy,d,an}){
step(Math.sign(dx)*Math.min(26,Math.abs(dx)),0);e.tm-=dt;if(e.tm<=0){e.tm=1.4;e.st++;if(e.st%2){const o=R(0,6);for(let i=0;i<12;i++)eshot(e.x,e.y+8,o+i*.5236,60)}else for(let i=-2;i<=2;i++)eshot(e.x,e.y+8,an+i*.2,85);sfx(90,.2,'sawtooth',.07,-30)}
if((s.aT-=dt)<=0){s.aT=8;const o=s.own.filter(i=>!s.dis[i]);s.gl=.5;s.shake=6;if(o.length){const k=o[RI(o.length)];s.dis[k]=6.5;toast('AUDIT: '+BM[k].n.toUpperCase()+' OFF')}else toast('AUDIT FAILED. NO BINDINGS.');sfx(70,.5,'sawtooth',.1,-20)}
if(e.hp<35&&!e.sum){e.sum=1;s.es.push(mk('skull',50,50),mk('skull',190,50));toast('THE AUDITOR CALLS BACKUP')}
}
