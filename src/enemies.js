// Standard enemy creation and AI: skull (Drifter), octo (Spitter), spirit (Glitch), mimic. Boss logic is in bosses.js.
import { R, D } from "./util.js";
import { S } from "./state.js";
import { sfx } from "./audio.js";
import { has, enemySpeed, tryDodge } from "./bindings.js";
import { blk } from "./rooms.js";
import { eshot } from "./projectiles.js";
import { part } from "./effects.js";
import { hurt, heal } from "./player.js";
import { updateBoss, AUDITOR_HP } from "./bosses.js";
import { dropCoins } from "./shops.js";
// Enemy factory. e.sp = spawn-in delay (invulnerable), e.st = AI state, e.aw = mimic awake.
export function mk(t, x, y) {
  const H = { skull: 3, octo: 3, spirit: 2, mimic: 7, skel: 4, boss: AUDITOR_HP }[t];
  const hp = H + (t == "boss" ? 0 : Math.floor(S.r.dp / 2));
  return {
    t,
    x,
    y,
    hp,
    mhp: hp, // max hp (Watcher reveal draws health bars)
    r: { boss: 20, mimic: 7 }[t] || 6,
    sp: 0.7,
    fl: 0,
    tm: R(0.5, 1.5),
    dir: 0,
    aw: 0,
    st: 0,
    ect: 0,
    vx: 0,
    vy: 0,
    al: 1,
    host: S.r && S.r.host ? 1 : 0, // kidnap-room skeletons: 1 once hostile
  };
}
export function hitE(e, s) {
  if (e.t == "mimic") e.aw = 1;
  if ((e.t == "spirit" && e.st == 1) || e.sp > 0) return 0;
  return 1;
}
// AI + contact damage for every enemy (the boss branch delegates to updateBoss).
// dt0 = real frame time; each enemy gets its own scaled dt (Chronos slow, Frost slow / freeze).
export function updateEnemies(s, dt0) {
  for (const e of s.es) {
    const dt = dt0 * enemySpeed(e, s);
    e.fl -= dt0;
    e.ect -= dt0;
    if (e.sp > 0) {
      e.sp -= dt;
      continue;
    }
    if (e.fr > 0) continue; // frozen solid: no movement, attacks or contact damage
    const dx = s.x - e.x,
      dy = s.y - e.y,
      d = Math.hypot(dx, dy) || 1,
      an = Math.atan2(dy, dx);
    e.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : dy < 0 ? 1 : 0;
    const step = (vx, vy) => {
      const nx = e.x + vx * dt,
        ny = e.y + vy * dt;
      if (!blk(nx, e.y, 1) || e.t == "boss") e.x = nx;
      if (!blk(e.x, ny, 1) || e.t == "boss") e.y = ny;
      e.x = Math.max(24, Math.min(216, e.x));
      e.y = Math.max(24, Math.min(152, e.y));
    };
    if (e.t == "skull")
      step((dx / d) * (24 + s.r.dp * 4), (dy / d) * (24 + s.r.dp * 4));
    else if (e.t == "octo") {
      const v = d > 75 ? 1 : d < 50 ? -1 : 0;
      step(
        (dx / d) * v * 34 - (dy / d) * 14 * Math.sin(e.tm),
        (dy / d) * v * 34 + (dx / d) * 14 * Math.sin(e.tm),
      );
      if ((e.tm -= dt) <= 0) {
        e.tm = R(1.4, 2.2);
        eshot(e.x, e.y, an, 70, e);
        sfx(300, 0.1, "sawtooth", 0.03, -100);
      }
    } else if (e.t == "spirit") {
      e.tm -= dt;
      if (e.st == 0) {
        step((dx / d) * 30, (dy / d) * 30);
        e.al = 1;
        if (e.tm <= 0) {
          e.st = 1;
          e.tm = 0.45;
        }
      } else {
        e.al = 0.2;
        if (e.tm <= 0) {
          e.x = R(28, 212);
          e.y = R(28, 148);
          e.st = 0;
          e.tm = R(1.4, 2);
          eshot(e.x, e.y, Math.atan2(s.y - e.y, s.x - e.x), 80, e);
          part(e.x, e.y, "#bfefff", 8);
          s.gl = 0.1;
        }
      }
    } else if (e.t == "mimic") {
      if (!e.aw) {
        if (d < 34) e.aw = 1;
      } else {
        e.tm -= dt;
        if (e.tm < 0) {
          e.vx = (dx / d) * 130;
          e.vy = (dy / d) * 130;
          e.tm = R(1.1, 1.6);
          e.lt = 0.35;
          e.dg = 0;
        }
        // Reflection: a lunge that passes close without connecting counts as dodged.
        if (e.lt > 0 && !e.dg && d < 22 && d > e.r + 6) {
          e.dg = 1;
          tryDodge();
        }
        if (e.lt > 0) {
          e.lt -= dt;
          step(e.vx, e.vy);
        }
      }
    } else if (e.t == "skel") {
      // Neutral skeletons wander slowly and ignore the player; once hostile they chase like Drifters.
      if (e.host) step((dx / d) * (30 + s.r.dp * 3), (dy / d) * (30 + s.r.dp * 3));
      else {
        if ((e.tm -= dt) <= 0) {
          e.tm = R(1.2, 2.6);
          const a = R(0, 6.283);
          e.vx = Math.cos(a) * 14;
          e.vy = Math.sin(a) * 14;
        }
        step(e.vx, e.vy);
      }
    } else if (e.t == "boss") updateBoss(e, s, dt, { step, dx, dy, d, an });
    if (
      e.t != "boss" &&
      e.t != "octo" &&
      d < e.r + 5 &&
      (e.t != "mimic" || e.aw) &&
      (e.t != "skel" || e.host) &&
      e.st != 1
    )
      hurt(1, e.mk > 0);
    if (e.t == "boss" && d < 22) hurt(1, e.mk > 0);
  }
}
// Remove dead enemies: explosion, drops, Red Tithe heal.
export function reapEnemies(s) {
  for (const e of s.es)
    if (e.hp <= 0 && !e.dead) {
      if (e.noDrop) {
        // skeletons crumbling after the shopkeeper was rescued: no kill, no drops
        e.dead = 1;
        part(e.x, e.y, "#cfcfe8", 10, 50);
        continue;
      }
      e.dead = 1;
      s.kills++;
      dropCoins(e);
      if (e.t == "skel" && s.r.t == "kidnap") s.r.sk = Math.max(0, s.r.sk - 1);
      part(
        e.x,
        e.y,
        e.t == "boss" ? "#ffb347" : "#ffd36b",
        e.t == "boss" ? 40 : 12,
        90,
      );
      s.fx.push({ x: e.x, y: e.y, t: 0, big: e.t == "boss" });
      s.shake = e.t == "boss" ? 10 : 2;
      sfx(160, 0.2, "sawtooth", 0.07, -100);
      if (has("leech") && Math.random() < 0.3) heal(1);
      // Fortune: a lucky room drops hearts twice as often.
      if (Math.random() < (has("fortune") && s.r.fz === 1 ? 0.2 : 0.1))
        s.pk.push({ x: e.x, y: e.y });
    }
  // The Auditor's backup falls with it (they die next frame, so the room clears right after).
  if (s.es.some((e) => e.dead && e.t == "boss"))
    for (const e of s.es) if (!e.dead) e.hp = 0;
  s.es = s.es.filter((e) => !e.dead);
}
