// Run lifecycle (start a run) and the main loop. upd() only orchestrates; each system lives in its own module.
import { S, setS, createState } from "./state.js";
import {
  gen,
  enter,
  updateRoomTransitions,
  checkStairs,
  checkRoomClear,
} from "./rooms.js";
import { SV } from "./save.js";
import { toast, hideOverlay } from "./ui.js";
import { updateBindings } from "./bindings.js";
import { updatePlayer, updatePickups } from "./player.js";
import { updateProjectiles, updateEnemyShots } from "./projectiles.js";
import { updateEnemies, reapEnemies } from "./enemies.js";
import { updateEffects } from "./effects.js";
import { draw } from "./renderer.js";
export function start() {
  hideOverlay();
  setS(createState(gen()));
  enter(S.r, null);
  SV.r = SV.r || 0;
  toast("Survive. Break the rules.");
}
function upd(dt) {
  const s = S;
  s.t += dt;
  if (s.mode == "play" || s.mode == "clr") {
    updateBindings(s, dt);
    updatePlayer(s, dt);
    updateRoomTransitions(s);
    if (checkStairs(s)) return;
    updateProjectiles(s, dt);
    updateEnemies(s, dt);
    reapEnemies(s);
    updateEnemyShots(s, dt);
    updatePickups(s);
    checkRoomClear(s);
  }
  updateEffects(s, dt);
}
let last = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  if (S) {
    if (S.mode != "pick") upd(dt);
    draw();
  }
  requestAnimationFrame(loop);
}
export function startLoop() {
  requestAnimationFrame(loop);
}
