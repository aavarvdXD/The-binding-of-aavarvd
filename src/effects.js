// Particles, explosions, screen shake / glitch timers and their drawing.
import {S} from './state.js';
import {R,RI,W} from './util.js';
import {spr} from './renderer.js';
export function part(x,y,c,n,sp=60){for(let i=0;i<n;i++){const a=R(0,6.28),v=R(10,sp);S.ps.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:R(.2,.5),c})}}
// Advance particles, explosions, shake, glitch and toast timers (runs every frame, even on overlay screens).
export function updateEffects(s,dt){
for(const p of s.ps){p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt}s.ps=s.ps.filter(p=>p.l>0);for(const f of s.fx)f.t+=dt;s.fx=s.fx.filter(f=>f.t<.6);
s.shake*=.88;if(s.gl>0)s.gl-=dt;s.msg.forEach(m=>m.l-=dt);s.msg=s.msg.filter(m=>m.l>0)
}
export function drawParticles(g,s){
for(const p of s.ps){g.globalAlpha=Math.min(1,p.l*4);g.fillStyle=p.c;g.fillRect(Math.round(p.x),Math.round(p.y),2,2)}g.globalAlpha=1;
}
export function drawExplosions(g,s){
for(const f of s.fx){const i=Math.min(8,Math.floor(f.t/.6*9));spr('expl',i*40,0,40,40,f.x,f.y,f.big?2:.8)}
}
export function drawGlitch(g,cv,s){
if(s.gl>0){for(let i=0;i<7;i++){const y=RI(190);g.drawImage(cv,0,y,W,R(3,12),R(-8,8),y,W,8)}g.fillStyle='#ff005512';g.fillRect(0,0,W,200)}
}
