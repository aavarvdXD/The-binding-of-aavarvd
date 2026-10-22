// Everything DOM/HUD: layout scaling, overlay screens (title, Binding choice, death, stairs), toasts, HUD drawing.
// Overlay buttons use data-act attributes handled by one delegated click listener (no inline onclick, no globals).
import {S} from './state.js';
import {$,W,H,OY,DR} from './util.js';
import {A,IM} from './assets.js';
import {SV,save} from './save.js';
import {sfx} from './audio.js';
import {BD,BM} from './bindings.js';
import {checkSynergies} from './synergies.js';
import {g,spr} from './renderer.js';
import {start} from './game.js';
const ov=$('ov');
export function hideOverlay(){ov.style.display='none'}
// Integer-ish scaling of the 240x200 canvas to the window.
export function initLayout(){
function fit(){const s=Math.max(1,Math.floor(Math.min(innerWidth/240,innerHeight/200)*4)/4);document.documentElement.style.setProperty('--s',s)}
addEventListener('resize',fit);fit();
ov.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(!t)return;const a=t.dataset.act;if(a==='pick')pick(+t.dataset.i);else if(a==='start')start();else if(a==='stay')stay()});
}
export function toast(t){S.msg.push({t,l:2.4})}
// Binding choice after a room is cleared.
let cho=[];
export function pickScr(){S.mode='pick';const pool=BD.filter(b=>!S.own.includes(b.id)&&(!b.lock||SV.w>0));cho=pool.sort(()=>Math.random()-.5).slice(0,3);if(!cho.length){S.hp=S.mh;S.mode='play';return}
ov.innerHTML='<h1 style="font-size:calc(var(--s)*6px)">CHOOSE A BINDING</h1><p>Fragments of a broken rule. Press 1-3 or click.</p><div class="row">'+cho.map((b,i)=>`<div class="card" data-act="pick" data-i="${i}"><img src="${A[b.ic]}"><b>${b.n}</b><span>${b.d}</span><span>[${i+1}]</span></div>`).join('')+'</div>';ov.style.display='flex'}
// Apply the chosen Binding (cards or keys 1-3).
export function pick(i){const b=cho[i];if(!b||S.mode!='pick')return;S.own.push(b.id);ov.style.display='none';S.mode='play';S.gl=.4;S.shake=4;sfx(600,.3,'triangle',.07,500);toast(b.n.toUpperCase());
checkSynergies(b.id);
if(b.id=='aegis'){S.sh=1}}
export function deadScr(){ov.innerHTML=`<h1>YOU ARE UNWRITTEN</h1><p>Rooms cleared: ${S.rs.filter(r=>r.clr).length} / ${S.rs.length} &middot; Kills: ${S.kills}</p><p>Bindings: ${S.own.map(i=>BM[i].n).join(', ')||'none'}</p><p>Synergies found: ${SV.c.join(', ')||'none yet'}</p><div class="row"><button data-act="start">TRY AGAIN [R]</button></div>`;ov.style.display='flex'}
export function stairScr(){sfx(200,.5,'sine',.08,400);ov.innerHTML=`<h1 style="color:#7fd4ff">THE STAIRS DESCEND</h1><p>Floor I is broken open. Floor II &mdash; The Distortion &mdash; has not been written yet.</p><p>Bindings: ${S.own.map(i=>BM[i].n).join(', ')||'none'}</p><div class="row"><button data-act="stay">KEEP EXPLORING</button><button data-act="start">NEW RUN</button></div>`;ov.style.display='flex'}
export function stay(){ov.style.display='none';S.y=92;S.mode='play'}
// NOTE: not called anywhere since the stairs replaced the old victory screen; kept for reference.
export function winScr(){const first=SV.w==0;SV.w++;save();S.mode='win';ov.innerHTML=`<h1 style="color:#ffd36b">THE AUDIT IS OVER</h1><p>Floor I is broken open. The Distortion waits below.</p><p>Bindings: ${S.own.map(i=>BM[i].n).join(', ')}</p>${first?'<p style="color:#7fd4ff">UNLOCKED: Pinball Law, Bug Report</p>':''}<div class="row"><button data-act="start">NEW RUN [R]</button></div>`;ov.style.display='flex'}
export function showTitle(){ov.innerHTML='<h1>THE BINDING<br>OF AAVARVD</h1><p>You are trapped in the Unwritten, a world built from broken rules.<br>Collect Bindings. Combine them. Break the game.</p><p>WASD move &middot; Mouse aim &middot; Hold click to fire<br>(Arrow keys also fire)</p><div class="row"><button data-act="start">ENTER THE UNWRITTEN</button></div><p>'+(SV.w?'Boss defeated x'+SV.w+' &middot; ':'')+'Synergies found: '+SV.c.length+'</p>';ov.style.display='flex'}
// HUD: hearts, Binding icons (struck through while disabled), minimap, boss bar, toasts, spawn-room prompts.
export function drawHUD(g,s){
const tt=s.t;
g.fillStyle='#0d0818';g.fillRect(0,0,W,OY);g.fillStyle='#3b2470';g.fillRect(0,OY-1,W,1);
for(let i=0;i<s.mh;i++){g.globalAlpha=i<s.hp?1:.2;spr('heart',0,0,9,8,9+i*10,10,1)}g.globalAlpha=1;
s.own.forEach((id,i)=>{const x=8+i*12;g.globalAlpha=s.dis[id]>0?.25:1;g.drawImage(IM[BM[id].ic],0,0,16,16,x,13,10,10);if(s.dis[id]>0){g.fillStyle='#f35';g.fillRect(x,18,10,1)}g.globalAlpha=1});
g.font='8px "Press Start 2P",monospace';g.textAlign='left';
const xs=s.rs.map(q=>q.x),ys=s.rs.map(q=>q.y),x0=Math.min(...xs),y0=Math.min(...ys),ox=Math.min(190,232-(Math.max(...xs)-x0)*8),sy=Math.min(6,Math.floor(17/(Math.max(...ys)-y0+1)));for(const q of s.rs){if(!q.vis&&!q.nb.some(n=>n&&n.vis))continue;g.fillStyle=q==s.r?'#fff':q.t=='boss'?'#f55':q.t=='start'?'#3aa0ff':q.clr?'#7a5ad0':'#3b2470';g.fillRect(ox+(q.x-x0)*8,3+(q.y-y0)*sy,6,4);q.nb.forEach((n,i)=>{if(n&&(q.vis||n.vis)){g.fillStyle=q.vis&&n.vis?'#7a5ad0':'#3b2470';const d=DR[i];g.fillRect(ox+(q.x-x0)*8+d.dx*2+2,3+(q.y-y0)*sy+d.dy*2+1,2,2)}})}
const bo=s.es.find(e=>e.t=='boss');if(bo){g.fillStyle='#300';g.fillRect(40,OY+4,160,4);g.fillStyle='#f45';g.fillRect(40,OY+4,160*Math.max(0,bo.hp)/70,4)}
s.msg.slice(-2).forEach((m,i)=>{g.globalAlpha=Math.min(1,m.l);g.textAlign='center';const c=m.t.startsWith('AUDIT')?'#ff5d73':m.t.startsWith('SYN')?'#7fe8ff':'#ffd36b';if(c!='#ffd36b'){g.fillStyle='#000a';const w=g.measureText(m.t).width+6;g.fillRect(120-w/2,OY+14+i*11,w,10)}g.fillStyle=c;g.fillText(m.t,120,OY+22+i*11);g.globalAlpha=1});
if(s.r.t=='start'){g.fillStyle='#3aa0ff';g.textAlign='center';g.fillText('SPAWN ROOM',120,OY+H-26)}
if(s.won&&s.mode=='play'&&Math.floor(tt*2)%2){g.fillStyle='#7fd4ff';g.textAlign='center';g.fillText(s.r.t=='start'?'TAKE THE STAIRS':'RETURN TO THE SPAWN ROOM',120,OY+H-8)}
if(s.mode=='play'&&s.r.t=='start'&&!s.own.length&&!s.won){g.fillStyle='#bdb2d6';g.textAlign='center';g.fillText('WASD move  CLICK fire',120,OY+H-14)}
}
