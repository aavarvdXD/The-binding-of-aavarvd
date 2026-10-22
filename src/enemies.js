// Standard enemy creation and AI: skull (Drifter), octo (Spitter), spirit (Glitch), mimic. Boss logic is in bosses.js.
import {R,D} from './util.js';
import {S} from './state.js';
import {sfx} from './audio.js';
import {has} from './bindings.js';
import {blk} from './rooms.js';
import {eshot} from './projectiles.js';
import {part} from './effects.js';
import {hurt} from './player.js';
import {updateBoss} from './bosses.js';
// Enemy factory. e.sp = spawn-in delay (invulnerable), e.st = AI state, e.aw = mimic awake.
export function mk(t,x,y){const H={skull:3,octo:3,spirit:2,mimic:7,boss:70}[t];return{t,x,y,hp:H+(t=='boss'?0:Math.floor(S.r.dp/2)),r:{boss:20,mimic:7}[t]||6,sp:.7,fl:0,tm:R(.5,1.5),dir:0,aw:0,st:0,ect:0,vx:0,vy:0,al:1}}
export function hitE(e,s){if(e.t=='mimic')e.aw=1;if(e.t=='spirit'&&e.st==1||e.sp>0)return 0;return 1}
// AI + contact damage for every enemy (the boss branch delegates to updateBoss).
export function updateEnemies(s,dt){
for(const e of s.es){e.fl-=dt;e.ect-=dt;if(e.sp>0){e.sp-=dt;continue}const dx=s.x-e.x,dy=s.y-e.y,d=Math.hypot(dx,dy)||1,an=Math.atan2(dy,dx);e.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?2:3):(dy<0?1:0);
const step=(vx,vy)=>{const nx=e.x+vx*dt,ny=e.y+vy*dt;if(!blk(nx,e.y,1)||e.t=='boss')e.x=nx;if(!blk(e.x,ny,1)||e.t=='boss')e.y=ny;e.x=Math.max(24,Math.min(216,e.x));e.y=Math.max(24,Math.min(152,e.y))};
if(e.t=='skull')step(dx/d*(24+s.r.dp*4),dy/d*(24+s.r.dp*4));
else if(e.t=='octo'){const v=d>75?1:d<50?-1:0;step(dx/d*v*34-dy/d*14*Math.sin(e.tm),dy/d*v*34+dx/d*14*Math.sin(e.tm));if((e.tm-=dt)<=0){e.tm=R(1.4,2.2);eshot(e.x,e.y,an,70);sfx(300,.1,'sawtooth',.03,-100)}}
else if(e.t=='spirit'){e.tm-=dt;if(e.st==0){step(dx/d*30,dy/d*30);e.al=1;if(e.tm<=0){e.st=1;e.tm=.45}}else{e.al=.2;if(e.tm<=0){e.x=R(28,212);e.y=R(28,148);e.st=0;e.tm=R(1.4,2);eshot(e.x,e.y,Math.atan2(s.y-e.y,s.x-e.x),80);part(e.x,e.y,'#bfefff',8);s.gl=.1}}}
else if(e.t=='mimic'){if(!e.aw){if(d<34)e.aw=1}else{e.tm-=dt;if(e.tm<0){e.vx=dx/d*130;e.vy=dy/d*130;e.tm=R(1.1,1.6);e.lt=.35}if(e.lt>0){e.lt-=dt;step(e.vx,e.vy)}}}
else if(e.t=='boss')updateBoss(e,s,dt,{step,dx,dy,d,an});
if(e.t!='boss'&&e.t!='octo'&&d<e.r+5&&(e.t!='mimic'||e.aw)&&e.st!=1)hurt(1);if(e.t=='boss'&&d<22)hurt(1)}
}
// Remove dead enemies: explosion, drops, Red Tithe heal.
export function reapEnemies(s){
for(const e of s.es)if(e.hp<=0&&!e.dead){e.dead=1;s.kills++;part(e.x,e.y,e.t=='boss'?'#ffb347':'#ffd36b',e.t=='boss'?40:12,90);s.fx.push({x:e.x,y:e.y,t:0,big:e.t=='boss'});s.shake=e.t=='boss'?10:2;sfx(160,.2,'sawtooth',.07,-100);if(has('leech')&&Math.random()<.3&&s.hp<s.mh)s.hp++;if(Math.random()<.1)s.pk.push({x:e.x,y:e.y})}
s.es=s.es.filter(e=>!e.dead);
}
