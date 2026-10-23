// Player shots (fire, homing, bounce, shatter, echo) and enemy shots.
import { S } from "./state.js";
import { R, D } from "./util.js";
import { sfx } from "./audio.js";
import {
  has,
  fireDelay,
  volleyDamage,
  damageEnemy,
  chain,
  maybeHole,
  tryDodge,
  shotSpeed,
} from "./bindings.js";
import { blk } from "./rooms.js";
import { part } from "./effects.js";
import { hitE } from "./enemies.js";
import { hurt } from "./player.js";
// Player attack: sets the cooldown, remembers the angle (Reflection clones repeat it), consumes a Thunder charge.
export function fire(a) {
  const charged = has("thunder") && S.thR;
  if (charged) S.thR = 0;
  S.fd = fireDelay();
  S.lastA = a;
  volley(S.x, S.y, a, { charged });
  sfx(has("fat") ? 120 : 380, 0.08, "square", 0.04, -150);
  if (charged) sfx(900, 0.1, "sawtooth", 0.04, -500);
}
// One volley from (x,y) toward angle a - used by the player and by Reflection clones.
// Twin/Heavy/Frenzy/Rebound and every damage multiplier (see volleyDamage) apply. o.charged = Thunder shot (lt flag).
export function volley(x, y, a, o = {}) {
  const fat = has("fat"),
    n = has("twin") ? 3 : 1,
    dm = volleyDamage(n);
  for (let i = 0; i < n; i++) {
    const an = a + (i - (n - 1) / 2) * 0.22 + (has("hot") ? R(-0.14, 0.14) : 0),
      sp = fat ? 95 : 170;
    S.sh_.push({
      x,
      y,
      vx: Math.cos(an) * sp,
      vy: Math.sin(an) * sp,
      dmg: dm,
      r: fat ? 6 : 3,
      l: fat ? 1.2 : 0.85,
      b: has("pin") ? 3 : 0,
      gen: 0,
      h: [],
      ec: 0,
      lt: o.charged ? 1 : 0,
    });
  }
}
// Glass Engine: 3 shards (only from non-shard shots, or from echoes).
export function shatter(s, x, y) {
  if (s.gen > 0 && !s.ec) return;
  const a0 = R(0, 6.28);
  for (let i = 0; i < 3; i++) {
    const a = a0 + i * 2.094,
      sp = 110;
    S.sh_.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      dmg: s.dmg * 0.5,
      r: 2,
      l: 0.45,
      b: 0,
      gen: s.gen + 1,
      h: [],
      ec: 0,
      sh: 1,
    });
  }
  part(x, y, "#9fe8ff", 5);
  sfx(900, 0.06, "triangle", 0.04, -400);
}
// Remove a shot; Echo Knot leaves an echo that replays its recorded path.
export function kill(s) {
  if (has("echo") && !s.ec && s.h.length > 6 && s.gen < 2 && S.sh_.length < 250)
    S.sh_.push({
      ec: 1,
      path: s.h.slice(),
      i: 0,
      x: s.h[0].x,
      y: s.h[0].y,
      dmg: s.dmg * 0.6,
      r: s.r,
      gen: s.gen + 1,
      h: [],
    });
  s.dead = 1;
}
// Enemy shot. src = firing enemy (Watcher: shots from marked enemies count as marked).
export function eshot(x, y, a, sp = 70, src) {
  S.eb.push({
    x,
    y,
    vx: Math.cos(a) * sp,
    vy: Math.sin(a) * sp,
    l: 4,
    mk: src && src.mk > 0 ? 1 : 0,
  });
}
// Move player shots (homing, wall hits, bounces), then resolve hits against enemies.
export function updateProjectiles(s, dt) {
  for (const b of s.sh_) {
    if (b.ec) {
      b.i += 2;
      const p = b.path[Math.floor(b.i)];
      if (!p) {
        if (has("glass")) shatter(b, b.x, b.y);
        b.dead = 1;
        continue;
      }
      b.x = p.x;
      b.y = p.y;
      continue;
    }
    b.l -= dt;
    if (has("grav")) {
      let n = null,
        nd = 100;
      for (const e of s.es)
        if (!e.sp > 0 || 0) {
          const d = D(b.x, b.y, e.x, e.y);
          if (d < nd) {
            nd = d;
            n = e;
          }
        }
      if (n) {
        let an = Math.atan2(b.vy, b.vx),
          da = Math.atan2(n.y - b.y, n.x - b.x) - an;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        const tr = (has("fat") ? 1.5 : 5) * dt;
        an += Math.max(-tr, Math.min(tr, da));
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(an) * sp;
        b.vy = Math.sin(an) * sp;
      }
    }
    const nx = b.x + b.vx * dt,
      ny = b.y + b.vy * dt;
    if (blk(nx, ny, 0)) {
      if (has("glass")) shatter(b, b.x, b.y);
      if (b.b > 0) {
        b.b--;
        if (blk(nx, b.y, 0)) b.vx *= -1;
        if (blk(b.x, ny, 0)) b.vy *= -1;
        if (!blk(nx, b.y, 0) && !blk(b.x, ny, 0)) {
          b.vx *= -1;
          b.vy *= -1;
        }
        b.l += 0.25;
        sfx(520, 0.04, "square", 0.03);
      } else kill(b);
      continue;
    }
    b.x = nx;
    b.y = ny;
    b.h.push({ x: b.x, y: b.y });
    if (b.h.length > 45) b.h.shift();
    if (b.l <= 0) kill(b);
  }
  for (const b of s.sh_) {
    if (b.dead) continue;
    for (const e of s.es) {
      if (e.sp > 0 || e.dead || (e.t == "spirit" && e.st == 1)) continue;
      if (D(b.x, b.y, e.x, e.y) < e.r + b.r) {
        if (b.ec) {
          if (e.ect > 0) continue;
          e.ect = 0.2;
        }
        hitE(e, b);
        damageEnemy(e, b.dmg);
        part(b.x, b.y, "#fff", 3);
        sfx(260, 0.05, "square", 0.04);
        if (e.t == "mimic") e.aw = 1;
        if (b.lt && !b.ec) {
          b.lt = 0;
          chain(e, b.dmg * 1.5, b.x, b.y); // Thunder: charged shot arcs to nearby enemies
        }
        if (!b.ec) maybeHole(b.x, b.y);
        if (!b.ec) {
          if (has("glass")) shatter(b, b.x, b.y);
          kill(b);
          break;
        }
      }
    }
  }
  s.sh_ = s.sh_.filter((b) => !b.dead);
  if (s.sh_.length > 300) s.sh_.splice(0, 60);
}
export function updateEnemyShots(s, dt0) {
  const dt = dt0 * shotSpeed(s); // Chronos slows enemy shots
  for (const b of s.eb) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.l -= dt;
    if (blk(b.x, b.y, 0) || b.l <= 0) b.dead = 1;
    else {
      const d = D(b.x, b.y, s.x, s.y);
      if (d < 6) {
        b.dead = 1;
        hurt(1, b.mk);
      } else {
        // Reflection: a shot that came close and is now moving away was dodged.
        if (d < 16) b.mn = Math.min(b.mn ?? 99, d);
        if (b.mn < 16 && d > b.mn + 1 && !b.gz) {
          b.gz = 1;
          tryDodge();
        }
      }
    }
  }
  s.eb = s.eb.filter((b) => !b.dead);
}
