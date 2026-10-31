// The Auditor: a 3-phase boss. Tuning lives in AUDITOR_HP and PHASES below.
//  Phase 1 "The Hearing"      - the original fight: radial rings + aimed fans, Audit disables 1 Binding every 8s.
//  Phase 2 "The True Verdict"     - at 2/3 hp the Auditor STOPS, a big yellow "TRUE AUDITOR HAS AWAKENED" banner plays and it
//                               changes colour. Then: much faster attacks, faster bullets, double rings, triple-tap fans,
//                               reversing spirals, telegraphed stamps (ground markers that burst into rings) and falling
//                               curtains that shift their gap. Calls 2 skulls.
//  Phase 3 "Final Judgment"   - at 1/3 hp another (red) banner; faster still: triple rings, 4-shot fan volleys, aimed
//                               streams, 6 stamps, Audit every 6s disabling 2 Bindings at once. Calls 2 spitters.
// Each phase change makes the Auditor invulnerable and motionless for P.intro seconds (e.inv; bullets are cleared) so
// burst damage can't skip a phase; if damage overshoots, the next phase starts just above its own threshold.
import { R, RI } from "./util.js";
import { sfx } from "./audio.js";
import { BM, shotSpeed } from "./bindings.js";
import { eshot } from "./projectiles.js";
import { mk } from "./enemies.js";
import { part } from "./effects.js";
import { toast } from "./ui.js";
export const AUDITOR_HP = 220;
const PHASES = [
  { every: 1.8, speed: 26, bs: 1, audit: 8, count: 1, dur: 6.5 },
  {
    every: 1.4,
    speed: 36,
    bs: 1.25,
    audit: 7,
    count: 1,
    dur: 6.5,
    intro: 2.8,
    ban: { lines: ["TRUE AUDITOR", "HAS AWAKENED"], col: "#ffd23f" },
    adds: "skull",
  },
  {
    every: 1.3,
    speed: 44,
    bs: 1.4,
    audit: 6,
    count: 2,
    dur: 7,
    intro: 2.2,
    ban: { lines: ["FINAL", "JUDGEMENT"], col: "#ff5d73" },
    adds: "octo",
  },
];
// hp at which phase p ends (phase 3 ends at death)
const phaseFloor = (e, p) => e.mhp * (1 - (p + 1) / 3);
const later = (e, t, fn) => (e.q = e.q || []).push({ t, fn });
const aim = (e, s) => Math.atan2(s.y - e.y, s.x - e.x);

function ring(e, P, n, v, off = R(0, 6.283)) {
  for (let i = 0; i < n; i++) eshot(e.x, e.y + 8, off + (i * Math.PI * 2) / n, v * P.bs, e);
}
function fan(e, P, a, n, spread, v) {
  for (let i = 0; i < n; i++) eshot(e.x, e.y + 8, a + (i - (n - 1) / 2) * spread, v * P.bs, e);
}
// Falling curtain of slow bullets with a 3-column gap; shift=1 moves the gap 4 columns sideways (dodge laterally).
function curtain(e, P, shift) {
  const gap = shift ? (e.cg + (RI(2) ? 4 : 6)) % 10 : (e.cg = RI(10));
  e.cg = gap;
  for (let i = 0; i < 12; i++) if (i < gap || i >= gap + 3) eshot(28 + i * 16, 26, Math.PI / 2, 58 * P.bs, e);
}
// Telegraphed stamps: markers on the floor (the first one right under the player) that burst into a ring after ~1s.
function stamps(e, s, P, n) {
  for (let i = 0; i < n; i++) {
    const x = i ? Math.max(28, Math.min(212, s.x + R(-70, 70))) : s.x,
      y = i ? Math.max(30, Math.min(150, s.y + R(-60, 40))) : s.y;
    s.tel.push({ x, y, t: 0, l: 0.9 + i * 0.08, n: 8, v: 70 * P.bs, src: e });
  }
  sfx(300, 0.15, "square", 0.04, 300);
}
// Spiral stream: arms fire in sequence while e.spi > 0; direction flips every time it is used.
function spiral(e, dt, P) {
  if (!(e.spi > 0)) return;
  e.spi -= dt;
  e.sc = (e.sc || 0) - dt;
  if (e.sc <= 0) {
    e.sc = 0.11;
    e.sa = (e.sa || 0) + 0.42 * (e.sd || 1);
    const arms = e.ph == 2 ? 4 : 3;
    for (let k = 0; k < arms; k++) eshot(e.x, e.y + 8, e.sa + (k * Math.PI * 2) / arms, 70 * P.bs, e);
  }
}

function attack(e, s, P) {
  const k = e.st;
  if (e.ph == 0) {
    // original patterns
    if (k % 2) ring(e, P, 12, 60);
    else fan(e, P, aim(e, s), 5, 0.2, 85);
  } else if (e.ph == 1) {
    switch (k % 5) {
      case 0: {
        const o = R(0, 6.283);
        ring(e, P, 16, 78, o);
        ring(e, P, 16, 52, o + Math.PI / 16);
        break;
      }
      case 1: // triple tap, re-aimed each time
        for (let w = 0; w < 3; w++) later(e, w * 0.2, () => fan(e, P, aim(e, s), 5, 0.17, 105));
        break;
      case 2:
        e.spi = 1.6;
        e.sd = -(e.sd || 1);
        break;
      case 3:
        stamps(e, s, P, 4);
        break;
      default:
        curtain(e, P, 0);
        later(e, 0.9, () => curtain(e, P, 1));
    }
  } else {
    switch (k % 6) {
      case 0:
        for (let j = 0; j < 3; j++) later(e, j * 0.25, () => ring(e, P, 18, 70 - j * 8));
        break;
      case 1:
        for (let w = 0; w < 4; w++) later(e, w * 0.16, () => fan(e, P, aim(e, s), 7, 0.15, 110));
        break;
      case 2:
        e.spi = 2.0;
        e.sd = -(e.sd || 1);
        break;
      case 3:
        stamps(e, s, P, 6);
        break;
      case 4:
        curtain(e, P, 0);
        later(e, 0.8, () => curtain(e, P, 1));
        later(e, 1.6, () => curtain(e, P, 1));
        break;
      default: // aimed stream + ring
        for (let w = 0; w < 8; w++) later(e, w * 0.09, () => fan(e, P, aim(e, s), 1, 0, 125));
        ring(e, P, 10, 60);
    }
  }
  sfx(90, 0.2, "sawtooth", 0.07, -30);
}

// Phase change: stop, clear the bullets, big banner + shake + glitch, then (after the intro) call backup.
function nextPhase(e, s) {
  e.ph++;
  const P = PHASES[e.ph];
  e.hp = Math.max(e.hp, phaseFloor(e, e.ph) + 1); // never skip the following phase
  e.inv = P.intro;
  e.tm = 0.9;
  e.spi = 0;
  e.q = [];
  s.eb = [];
  s.tel = [];
  s.ban = { lines: P.ban.lines, col: P.ban.col, t: 0, l: P.intro };
  s.gl = 0.8;
  s.shake = 12;
  sfx(55, 1.4, "sawtooth", 0.12, -10);
  sfx(220, 1.0, "triangle", 0.08, 660);
  part(e.x, e.y, P.ban.col, 40, 120);
  later(e, P.intro - 0.1, () => {
    s.es.push(mk(P.adds, 50, 55), mk(P.adds, 190, 55));
    toast("THE AUDITOR CALLS BACKUP");
  });
}

// Called from updateEnemies for e.t==='boss'. ctx = movement helper + vector to the player.
export function updateBoss(e, s, dt, { step, dx }) {
  if (e.ph === undefined) e.ph = 0;
  if (e.q)
    for (const q of e.q) {
      q.t -= dt;
      if (q.t <= 0) q.fn();
    }
  if (e.q) e.q = e.q.filter((q) => q.t > 0);
  if (e.inv > 0) {
    // phase change: invulnerable and motionless (timer runs in bindings.js updateStatus); power-up sparks
    if (Math.random() < 0.7) part(e.x + R(-20, 20), e.y + R(-5, 22), PHASES[e.ph].ban.col, 1, 40);
    return;
  }
  if (e.ph < 2 && e.hp <= phaseFloor(e, e.ph)) {
    nextPhase(e, s);
    return;
  }
  const P = PHASES[e.ph];
  if (e.ph > 0 && Math.random() < dt * 12) part(e.x + R(-18, 18), e.y + R(8, 22), P.ban.col, 1, 28); // awakened aura
  step(Math.sign(dx) * Math.min(P.speed, Math.abs(dx)), 0);
  spiral(e, dt, P);
  e.tm -= dt;
  if (e.tm <= 0) {
    e.tm = P.every;
    e.st++;
    attack(e, s, P);
  }
  if ((s.aT -= dt) <= 0) {
    // Audit: disable Bindings for a while (phase 3 disables two)
    s.aT = P.audit;
    const o = s.own.filter((i) => !s.dis[i]);
    s.gl = 0.5;
    s.shake = 6;
    if (!o.length) toast("AUDIT FAILED. NO BINDINGS.");
    else
      for (let n = 0; n < Math.min(P.count, o.length); n++) {
        const k = o.splice(RI(o.length), 1)[0];
        s.dis[k] = P.dur;
        toast("AUDIT: " + BM[k].sn.toUpperCase() + " OFF");
      }
    sfx(70, 0.5, "sawtooth", 0.1, -20);
  }
}

// Stamp markers count down, then burst into a ring (slowed by Chronos like every enemy shot).
export function updateTelegraphs(s, dt0) {
  if (!s.es.some((e) => e.t == "boss")) {
    s.tel = [];
    return;
  }
  const dt = dt0 * shotSpeed(s);
  for (const m of s.tel) {
    m.t += dt;
    if (m.t >= m.l) {
      const o = R(0, 6.283);
      for (let i = 0; i < m.n; i++) eshot(m.x, m.y, o + (i * Math.PI * 2) / m.n, m.v, m.src);
      part(m.x, m.y, "#ff5d73", 8, 60);
      s.shake = Math.max(s.shake, 2);
      sfx(120, 0.12, "square", 0.05, -60);
    }
  }
  s.tel = s.tel.filter((m) => m.t < m.l);
}
