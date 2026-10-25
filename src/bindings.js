// Binding definitions (id, name, description, lock), the helpers that decide whether one is active, and the effect
// logic of the "timed / status" Bindings (Chronos, Thunder, Reflection, Decay, Frost, Void, Watcher, Blood, Ascension).
// Simple shot modifiers still live in fire()/volley() (projectiles.js); Paper Aegis / Bug Report in hurt() (player.js).
// Every effect is gated with has(id), so the Auditor disabling a Binding switches its effect off immediately.
import { S } from "./state.js";
import { D, RI } from "./util.js";
import { sfx } from "./audio.js";
import { part } from "./effects.js";
import { blk } from "./rooms.js";
import { volley } from "./projectiles.js";
// A run can equip at most this many Bindings; picking more means replacing one (see ui.js pick/swap/skip).
export const MAX_BINDINGS = 4;
export const BD = [
  {
    id: "glass",
    n: "Binding of Shards",
    d: "Shots shatter on impact into 3 shards.",
  },
  {
    id: "echo",
    n: "Binding of Echoes",
    d: "Dying shots replay their flight as an echo.",
  },
  { id: "grav", n: "Binding of Gravity", d: "Shots curve toward nearby enemies." },
  { id: "twin", n: "Binding of Twins", d: "+2 shots per volley, each weaker." },
  { id: "hot", n: "Binding of Frenzy", d: "Fire rate up. Aim goes wobbly." },
  { id: "fat", n: "Binding of Weight", d: "One huge slow shot. Weakens homing." },
  {
    id: "pin",
    n: "Binding of Rebound",
    d: "Shots bounce 3 times off walls.",
    lock: 1,
  },
  { id: "aegis", n: "Binding of the Aegis", d: "Blocks one hit every 9 seconds." },
  { id: "leech", n: "Binding of Tithes", d: "Kills may heal you." },
  {
    id: "curse",
    n: "Binding of Bugs",
    d: "+70% damage. You take double damage.",
    lock: 1,
  },
  {
    id: "chrono",
    n: "Binding of Chronos",
    d: "Every 7s enemies slow for 2s. Your attacks recover slower.",
  },
  {
    id: "blood",
    n: "Binding of Blood",
    d: "Lower health, more damage. You cannot heal past 75%.",
  },
  {
    id: "thunder",
    n: "Binding of Thunder",
    d: "Every 6s your next shot chains lightning. Shots deal less damage.",
  },
  {
    id: "reflect",
    n: "Binding of Reflection",
    d: "Dodging a shot spawns a clone repeating your attack. Direct hits weaker.",
  },
  {
    id: "decay",
    n: "Binding of Decay",
    d: "Hits poison enemies (stacks). Hit damage reduced.",
  },
  {
    id: "fortune",
    n: "Binding of Fortune",
    d: "Rooms may give double loot, or spawn extra enemies.",
  },
  {
    id: "frost",
    n: "Binding of Frost",
    d: "Repeated hits slow, then freeze enemies. Attack speed reduced.",
  },
  {
    id: "void",
    n: "Binding of the Void",
    d: "Hits may open black holes that pull enemies in. Max health -2.",
  },
  {
    id: "ascend",
    n: "Binding of Ascension",
    d: "Clear a room unhurt for a shield. Base damage reduced.",
  },
  {
    id: "watch",
    n: "Binding of the Watcher",
    d: "Marked enemies take bonus damage and reveal the room. Unmarked hit harder.",
  },
];
// ic = icon key in assets.js (i0..i19, same order as this list); sn = short name for tight UI text (Auditor toast).
BD.forEach((b, i) => {
  b.ic = "i" + i;
  b.sn = b.n.replace(/^Binding of (the )?/i, "");
});
export const BM = Object.fromEntries(BD.map((b) => [b.id, b]));
// A Binding is active if owned and not currently disabled by the Auditor.
export const has = (id) => S.own.includes(id) && !(S.dis[id] > 0);

// ---- tuning (seconds / multipliers)
const CHRONO_EVERY = 7,
  CHRONO_SLOW = 2,
  CHRONO_SPEED = 0.4;
const THUNDER_EVERY = 6;
const WATCH_EVERY = 4.5,
  MARK_LIFE = 4;
export const ASCEND_LIFE = 25;

// ---- shot-side numbers used by fire()/volley()
// Delay between volleys. Frenzy faster; Weight, Chronos and Frost slower.
export function fireDelay() {
  let d = (has("hot") ? 0.2 : 0.34) * (has("fat") ? 1.9 : 1);
  if (has("chrono")) d *= 1.35;
  if (has("frost")) d *= 1.45;
  return d;
}
// Damage of one shot in a volley of n shots: base x every active multiplier (boosts and drawbacks).
export function volleyDamage(n) {
  let dm = 1 * (has("fat") ? 2.2 : 1) * (n > 1 ? 0.6 : 1) * (has("curse") ? 1.7 : 1);
  if (has("thunder")) dm *= 0.8;
  if (has("reflect")) dm *= 0.75;
  if (has("decay")) dm *= 0.6;
  if (has("ascend")) dm *= 0.9;
  if (has("blood")) dm *= 1 + (1 - Math.max(0, S.hp) / S.mh) * 1.5; // full health x1, 1 hp of 6 about x2.25
  return dm;
}

// ---- enemy-side numbers
// Movement/AI time scale for one enemy this frame: frozen = 0, Chronos slow, Frost stacks slow it a little more.
export function enemySpeed(e, s) {
  if (e.fr > 0) return 0;
  let m = has("chrono") && s.slow > 0 ? CHRONO_SPEED : 1;
  if (e.fz > 0 && has("frost")) m *= 1 - 0.12 * e.fz;
  return m;
}
// Enemy projectiles are slowed by Chronos too.
export const shotSpeed = (s) => (has("chrono") && s.slow > 0 ? CHRONO_SPEED : 1);

// ---- all damage the player deals to an enemy goes through here, so every on-hit Binding stacks consistently
// (shots, echoes, shards, chain lightning, black-hole collapse).
export function damageEnemy(e, dmg) {
  let d = dmg;
  if (e.mk > 0 && has("watch")) {
    d *= 1.6;
    e.mk = 0;
    S.rev = 1.6; // reveal every enemy for a moment
    sfx(1000, 0.1, "square", 0.04, 300);
    part(e.x, e.y, "#ff5d73", 6, 70);
  }
  e.hp -= d;
  e.fl = 0.1;
  if (has("decay")) {
    e.ps = Math.min(5, (e.ps || 0) + 1);
    e.po = 4;
  }
  if (has("frost") && !(e.fr > 0) && !(e.fi > 0)) {
    e.fz = (e.fz || 0) + (has("chrono") && S.slow > 0 ? 2 : 1); // slowed enemies chill twice as fast
    e.fzT = 2.5;
    if (e.fz >= 4) {
      e.fr = e.t == "boss" ? 0.8 : 1.6; // frozen solid
      e.fi = e.fr + (e.t == "boss" ? 3 : 1.2); // brief immunity after thawing
      e.fz = 0;
      part(e.x, e.y, "#bfe9ff", 10, 50);
      sfx(1400, 0.15, "triangle", 0.05, -700);
    }
  }
  return d;
}

// ---- Thunder: chain lightning from the first enemy a charged shot hits (ox,oy = where the shot was).
export function chain(e0, dmg, ox, oy) {
  const seen = new Set([e0]),
    pts = [
      { x: ox, y: oy },
      { x: e0.x, y: e0.y },
    ];
  let cur = e0;
  for (let i = 0; i < 3; i++) {
    let n = null,
      nd = 62;
    for (const e of S.es) {
      if (seen.has(e) || e.dead || e.sp > 0 || (e.t == "spirit" && e.st == 1)) continue;
      const d = D(cur.x, cur.y, e.x, e.y);
      if (d < nd) {
        nd = d;
        n = e;
      }
    }
    if (!n) break;
    seen.add(n);
    pts.push({ x: n.x, y: n.y });
    damageEnemy(n, dmg);
    part(n.x, n.y, "#ffe066", 4);
    cur = n;
  }
  S.arc.push({ pts, t: 0 });
  part(e0.x, e0.y, "#ffe066", 5);
  sfx(1200, 0.12, "sawtooth", 0.04, -800);
}

// ---- Reflection: an enemy attack grazed the player -> a clone appears and repeats the player's last attack.
export function tryDodge() {
  if (!has("reflect") || S.clCd > 0) return;
  S.clCd = 1.6;
  S.cl.push({ x: S.x, y: S.y, t: 0, l: 3.2, fd: 0.15 });
  if (S.cl.length > 2) S.cl.shift();
  part(S.x, S.y, "#9fd8ff", 8, 60);
  sfx(700, 0.2, "sine", 0.05, 500);
}
function lastAngle(s) {
  if (s.lastA != null) return s.lastA;
  let n = null,
    nd = 1e9;
  for (const e of s.es) {
    const d = D(s.x, s.y, e.x, e.y);
    if (d < nd) {
      nd = d;
      n = e;
    }
  }
  return n ? Math.atan2(n.y - s.y, n.x - s.x) : 0;
}
function updateClones(s, dt) {
  for (const c of s.cl) {
    c.t += dt;
    c.fd -= dt;
    if (c.fd <= 0 && has("reflect")) {
      c.fd = fireDelay();
      volley(c.x, c.y, lastAngle(s), {});
    }
  }
  s.cl = s.cl.filter((c) => c.t < c.l);
}

// ---- Void: a hit sometimes opens a black hole that drags nearby enemies together, then collapses for area damage.
export function maybeHole(x, y) {
  if (!has("void") || S.bh.length >= 2 || Math.random() > 0.12) return;
  S.bh.push({ x, y, t: 0, l: 2.2 });
  sfx(120, 0.4, "sine", 0.06, 200);
}
function updateHoles(s, dt) {
  for (const h of s.bh) {
    h.t += dt;
    for (const e of s.es) {
      if (e.dead || e.t == "boss" || e.sp > 0) continue; // the Auditor is too big to pull
      const d = D(e.x, e.y, h.x, h.y);
      if (d < 56 && d > 2) {
        const v = (70 * (1 - d / 56) + 12) * dt,
          nx = e.x + ((h.x - e.x) / d) * v,
          ny = e.y + ((h.y - e.y) / d) * v;
        if (!blk(nx, e.y, 1)) e.x = nx;
        if (!blk(e.x, ny, 1)) e.y = ny;
      }
    }
    if (h.t >= h.l) {
      for (const e of s.es) if (!e.dead && D(e.x, e.y, h.x, h.y) < 30) damageEnemy(e, 2.5);
      part(h.x, h.y, "#9b6bff", 16, 90);
      s.fx.push({ x: h.x, y: h.y, t: 0 });
      s.shake = 3;
      sfx(80, 0.3, "sawtooth", 0.08, -40);
    }
  }
  s.bh = s.bh.filter((h) => h.t < h.l);
}

// ---- Watcher: every few seconds one enemy is marked.
function markOne(s) {
  const c = s.es.filter((e) => !e.dead && !(e.mk > 0) && !(e.sp > 0) && !(e.t == "spirit" && e.st == 1));
  if (!c.length) return;
  c[RI(c.length)].mk = MARK_LIFE;
  sfx(500, 0.1, "square", 0.03, 200);
}

// ---- Decay / Frost / Watcher timers on enemies (runs on real time, not slowed time).
function updateStatus(s, dt) {
  for (const e of s.es) {
    if (e.mk > 0) e.mk -= dt;
    if (e.fr > 0) e.fr -= dt;
    if (e.fi > 0) e.fi -= dt;
    if (e.fzT > 0 && (e.fzT -= dt) <= 0) e.fz = 0;
    if (e.po > 0) {
      e.po -= dt;
      if (e.sp <= 0) {
        e.hp -= 0.35 * (e.ps || 1) * dt; // 0.35 damage/s per stack, up to 5 stacks
        if (Math.random() < dt * 6) part(e.x, e.y, "#7fdc4a", 1, 20);
      }
      if (e.po <= 0) e.ps = 0;
    }
  }
}

// Per-frame timers: Auditor disable countdowns, Paper Aegis recharge, and every new Binding's cycle.
export function updateBindings(s, dt) {
  for (const k in s.dis) if ((s.dis[k] -= dt) <= 0) delete s.dis[k];
  if (s.shT > 0 && (s.shT -= dt) <= 0) s.sh = 1;
  if (s.slow > 0) s.slow -= dt;
  if (s.rev > 0) s.rev -= dt;
  if (s.clCd > 0) s.clCd -= dt;
  if (s.asS > 0) s.asS -= dt;
  if (has("chrono") && s.slow <= 0 && (s.chT -= dt) <= 0) {
    s.chT = CHRONO_EVERY;
    s.slow = CHRONO_SLOW;
    sfx(180, 0.5, "sine", 0.06, -100);
  }
  if (has("thunder") && !s.thR && (s.thT -= dt) <= 0) {
    s.thR = 1;
    s.thT = THUNDER_EVERY;
    sfx(700, 0.12, "triangle", 0.05, 500);
  }
  if (has("watch") && (s.wT -= dt) <= 0) {
    s.wT = WATCH_EVERY;
    markOne(s);
  }
  updateStatus(s, dt);
  updateClones(s, dt);
  updateHoles(s, dt);
}
