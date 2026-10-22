// Shared run state. `S` is a live binding: import it anywhere, but only replace it through setS().
export let S=null;
export const setS=v=>{S=v};
// Fresh run state for a generated floor (rs = room list). Field meanings:
// hp/mh health, iv invulnerability timer, own = owned Binding ids, dis = {id: seconds disabled by the Auditor},
// sh/shT Paper Aegis ready flag / recharge timer, sh_ player shots, es enemies, eb enemy shots, ps particles,
// pk heart pickups, fx explosions, msg toasts, shake/gl screen shake & glitch timers, won = boss beaten, ak/aa arrow-aim lock.
export const createState=rs=>({rs,r:rs[0],x:120,y:88,hp:6,mh:6,iv:0,own:[],dis:{},sh:1,shT:0,t:0,fd:0,sh_:[],es:[],ps:[],eb:[],pk:[],fx:[],shake:0,gl:0,msg:[],face:0,mv:0,mode:'play',kills:0,aT:5,ft:0});
