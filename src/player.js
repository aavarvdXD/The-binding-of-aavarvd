// Player movement/aim/fire, damage (Paper Aegis, Bug Report) and heart pickups.
import {S} from './state.js';
import {D} from './util.js';
import {K,mx,my,md} from './input.js';
import {sfx} from './audio.js';
import {has} from './bindings.js';
import {SV,save} from './save.js';
import {blk} from './rooms.js';
import {fire} from './projectiles.js';
import {part} from './effects.js';
import {deadScr} from './ui.js';
// Move with wall sliding (corner-forgiving hitbox).
export function mvP(dx,dy){const q=(x,y,r=4)=>blk(x-r,y-r,1)||blk(x+r,y-r,1)||blk(x-r,y+r,1)||blk(x+r,y+r,1);if(!q(S.x+dx,S.y))S.x+=dx;else if(Math.abs(dx)>0.1){for(let r=3;r>=1;r--)if(!q(S.x+dx,S.y,r)){S.x+=dx;break}}if(!q(S.x,S.y+dy))S.y+=dy;else if(Math.abs(dy)>0.1){for(let r=3;r>=1;r--)if(!q(S.x,S.y+dy,r)){S.y+=dy;break}}}
export function hurt(n,fx,fy){if(S.iv>0||S.mode!='play')return;if(has('aegis')&&S.sh){S.sh=0;S.shT=9;S.iv=.5;sfx(200,.2,'sine',.08,300);part(S.x,S.y,'#7fd4ff',10);return}
S.hp-=n*(has('curse')?2:1);S.iv=1.1;S.shake=5;sfx(110,.25,'sawtooth',.08,-60);part(S.x,S.y,'#ff5d73',8);if(S.hp<=0){S.hp=0;S.mode='dead';SV.d++;save();setTimeout(deadScr,900)}}
// Invulnerability timer, WASD movement, mouse/arrow aiming (arrow lock until the mouse moves), firing.
export function updatePlayer(s,dt){
if(s.iv>0)s.iv-=dt;
let ix=(K.d||0)-(K.a||0),iy=(K.s||0)-(K.w||0);if(ix||iy){const l=Math.hypot(ix,iy),v=82*dt/l;mvP(ix*v,iy*v);s.mv+=dt}
let ax=(K.arrowright||0)-(K.arrowleft||0),ay=(K.arrowdown||0)-(K.arrowup||0),a=Math.atan2(my-s.y,mx-s.x),f=md||K[' ']||ax||ay;if(ax||ay){a=Math.atan2(ay,ax);s.ak=1;s.aa=a}
const fa=s.ak?s.aa:a;s.aim=a;s.face=Math.abs(Math.cos(fa))>Math.abs(Math.sin(fa))?(Math.cos(fa)<0?2:3):(Math.sin(fa)<0?1:0);
if((s.fd-=dt)<=0&&f){fire(a);s.ft=.12}if(s.ft>0)s.ft-=dt;
}
export function updatePickups(s){
s.pk=s.pk.filter(p=>{if(D(p.x,p.y,s.x,s.y)<9){if(s.hp<s.mh){s.hp++;sfx(700,.1,'sine',.05,300);return 0}}return 1});
}
