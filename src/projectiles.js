// Player shots (fire, homing, bounce, shatter, echo) and enemy shots.
import {S} from './state.js';
import {R,D} from './util.js';
import {sfx} from './audio.js';
import {has} from './bindings.js';
import {blk} from './rooms.js';
import {part} from './effects.js';
import {hitE} from './enemies.js';
import {hurt} from './player.js';
// Fire one volley toward angle a. Twin/Heavy/Hot/Pinball/Bug Report modify count, damage, speed, spread, bounces.
export function fire(a){const fat=has('fat'),n=has('twin')?3:1;S.fd=(has('hot')?.2:.34)*(fat?1.9:1);let dm=1*(fat?2.2:1)*(n>1?.6:1)*(has('curse')?1.7:1);
for(let i=0;i<n;i++){const an=a+(i-(n-1)/2)*.22+(has('hot')?R(-.14,.14):0),sp=fat?95:170;S.sh_.push({x:S.x,y:S.y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,dmg:dm,r:fat?6:3,l:fat?1.2:.85,b:has('pin')?3:0,gen:0,h:[],ec:0})}sfx(fat?120:380,.08,'square',.04,-150)}
// Glass Engine: 3 shards (only from non-shard shots, or from echoes).
export function shatter(s,x,y){if(s.gen>0&&!s.ec)return;const a0=R(0,6.28);for(let i=0;i<3;i++){const a=a0+i*2.094,sp=110;S.sh_.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,dmg:s.dmg*.5,r:2,l:.45,b:0,gen:s.gen+1,h:[],ec:0,sh:1})}part(x,y,'#9fe8ff',5);sfx(900,.06,'triangle',.04,-400)}
// Remove a shot; Echo Knot leaves an echo that replays its recorded path.
export function kill(s){if(has('echo')&&!s.ec&&s.h.length>6&&s.gen<2&&S.sh_.length<250)S.sh_.push({ec:1,path:s.h.slice(),i:0,x:s.h[0].x,y:s.h[0].y,dmg:s.dmg*.6,r:s.r,gen:s.gen+1,h:[]});s.dead=1}
export function eshot(x,y,a,sp=70){S.eb.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,l:4})}
// Move player shots (homing, wall hits, bounces), then resolve hits against enemies.
export function updateProjectiles(s,dt){
for(const b of s.sh_){if(b.ec){b.i+=2;const p=b.path[Math.floor(b.i)];if(!p){if(has('glass'))shatter(b,b.x,b.y);b.dead=1;continue}b.x=p.x;b.y=p.y;continue}
b.l-=dt;if(has('grav')){let n=null,nd=100;for(const e of s.es)if(!e.sp>0||0){const d=D(b.x,b.y,e.x,e.y);if(d<nd){nd=d;n=e}}if(n){let an=Math.atan2(b.vy,b.vx),da=Math.atan2(n.y-b.y,n.x-b.x)-an;da=Math.atan2(Math.sin(da),Math.cos(da));const tr=(has('fat')?1.5:5)*dt;an+=Math.max(-tr,Math.min(tr,da));const sp=Math.hypot(b.vx,b.vy);b.vx=Math.cos(an)*sp;b.vy=Math.sin(an)*sp}}
const nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;if(blk(nx,ny,0)){if(has('glass'))shatter(b,b.x,b.y);if(b.b>0){b.b--;if(blk(nx,b.y,0))b.vx*=-1;if(blk(b.x,ny,0))b.vy*=-1;if(!blk(nx,b.y,0)&&!blk(b.x,ny,0)){b.vx*=-1;b.vy*=-1}b.l+=.25;sfx(520,.04,'square',.03)}else kill(b);continue}
b.x=nx;b.y=ny;b.h.push({x:b.x,y:b.y});if(b.h.length>45)b.h.shift();if(b.l<=0)kill(b)}
for(const b of s.sh_){if(b.dead)continue;for(const e of s.es){if(e.sp>0||e.dead||(e.t=='spirit'&&e.st==1))continue;if(D(b.x,b.y,e.x,e.y)<e.r+b.r){if(b.ec){if(e.ect>0)continue;e.ect=.2}hitE(e,b);e.hp-=b.dmg;e.fl=.1;part(b.x,b.y,'#fff',3);sfx(260,.05,'square',.04);if(e.t=='mimic')e.aw=1;if(!b.ec){if(has('glass'))shatter(b,b.x,b.y);kill(b);break}}}}
s.sh_=s.sh_.filter(b=>!b.dead);if(s.sh_.length>300)s.sh_.splice(0,60);
}
export function updateEnemyShots(s,dt){
for(const b of s.eb){b.x+=b.vx*dt;b.y+=b.vy*dt;b.l-=dt;if(blk(b.x,b.y,0)||b.l<=0)b.dead=1;else if(D(b.x,b.y,s.x,s.y)<6){b.dead=1;hurt(1)}}s.eb=s.eb.filter(b=>!b.dead);
}
