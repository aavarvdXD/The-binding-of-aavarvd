// Shared constants and tiny helpers. No imports: safe to load first.
export const $=i=>document.getElementById(i);
export const W=240,H=176,OY=24; // room width/height in px; HUD height above the room
// Door definitions: tile position + direction. Index order (up,down,left,right) is relied on everywhere (i^1 = opposite door).
export const DR=[{x:7,y:0,dx:0,dy:-1},{x:7,y:10,dx:0,dy:1},{x:0,y:5,dx:-1,dy:0},{x:14,y:5,dx:1,dy:0}];
export const R=(a,b)=>a+Math.random()*(b-a),RI=a=>Math.floor(Math.random()*a),D=(a,b,c,d)=>Math.hypot(c-a,d-b);
