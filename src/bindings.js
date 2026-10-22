// Binding definitions (id, name, description, lock) and the helpers that decide whether one is active.
// The behaviour of each Binding lives where it acts: fire() in projectiles.js, hurt() in player.js, the Auditor in bosses.js.
import { S } from "./state.js";
export const BD = [
  {
    id: "glass",
    n: "Glass Engine",
    d: "Shots shatter on impact into 3 shards.",
  },
  {
    id: "echo",
    n: "Echo Knot",
    d: "Dying shots replay their flight as an echo.",
  },
  { id: "grav", n: "Wrong Gravity", d: "Shots curve toward nearby enemies." },
  { id: "twin", n: "Twin Fracture", d: "+2 shots per volley, each weaker." },
  { id: "hot", n: "Hot Wire", d: "Fire rate up. Aim goes wobbly." },
  { id: "fat", n: "Heavy Round", d: "One huge slow shot. Weakens homing." },
  {
    id: "pin",
    n: "Pinball Law",
    d: "Shots bounce 3 times off walls.",
    lock: 1,
  },
  { id: "aegis", n: "Paper Aegis", d: "Blocks one hit every 9 seconds." },
  { id: "leech", n: "Red Tithe", d: "Kills may heal you." },
  {
    id: "curse",
    n: "Bug Report",
    d: "+70% damage. You take double damage.",
    lock: 1,
  },
];
BD.forEach((b, i) => (b.ic = "i" + i));
export const BM = Object.fromEntries(BD.map((b) => [b.id, b]));
// A Binding is active if owned and not currently disabled by the Auditor.
export const has = (id) => S.own.includes(id) && !(S.dis[id] > 0);
// Per-frame timers: Auditor disable countdowns and Paper Aegis recharge.
export function updateBindings(s, dt) {
  for (const k in s.dis) if ((s.dis[k] -= dt) <= 0) delete s.dis[k];
  if (s.shT > 0 && (s.shT -= dt) <= 0) s.sh = 1;
}
