// The Auditor: a 3-phase boss. Tuning lives in AUDITOR_HP and PHASES below.
//  Phase 1 "The Hearing"          - radial rings + aimed fans (the original fight), Audit disables 1 Binding every 8s.
//  Phase 2 "Cross-Examination"    - faster, adds a rotating spiral stream, calls 2 Drifter skulls, Audit every 7s.
//  Phase 3 "Final Judgment"       - fastest, double rings, wide fans, 4-arm spirals and a falling "ledger" curtain with a
//                                   gap to dodge through, calls 2 Spitters, Audit every 6s disabling 2 Bindings at once.
// Each phase change makes the Auditor invulnerable for 1.6s (it clears the bullets and announces the phase) so a burst
// of damage can't skip a phase; if damage overshoots, the next phase starts just above its own threshold.
import { R, RI } from "./util.js";
import { sfx } from "./audio.js";
import { BM } from "./bindings.js";
import { eshot } from "./projectiles.js";
import { mk } from "./enemies.js";
import { part } from "./effects.js";
import { toast } from "./ui.js";
export const AUDITOR_HP = 220;
const PHASES = [
  { name: "", every: 1.4, speed: 26, audit: 8, count: 1, dur: 6.5 },
  { name: "PHASE 2: CROSS-EXAMINATION", every: 1.15, speed: 32, audit: 7, count: 1, dur: 6.5 },
  { name: "PHASE 3: FINAL JUDGMENT", every: 1.0, speed: 40, audit: 6, count: 2, dur: 7 },
];
// hp at which phase p ends (phase 3 ends at death)
const phaseFloor = (e, p) => e.mhp * (1 - (p + 1) / 3);

function nextPhase(e, s) {
  e.ph++;
  e.hp = Math.max(e.hp, phaseFloor(e, e.ph) + 1); // never skip the following phase
  e.inv = 1.6;
  e.tm = 1.2;
  e.spi = 0;
  s.eb = [];
  s.gl = 0.5;
  s.shake = 8;
  toast(PHASES[e.ph].name);
  sfx(60, 0.8, "sawtooth", 0.1, -20);
  part(e.x, e.y, "#ff5d73", 24, 110);
  if (e.ph == 1) s.es.push(mk("skull", 50, 50), mk("skull", 190, 50));
  else s.es.push(mk("octo", 50, 60), mk("octo", 190, 60));
  toast("THE AUDITOR CALLS BACKUP");
}

// Spiral stream: arms fire in sequence while e.spi > 0.
function spiral(e, dt) {
  if (!(e.spi > 0)) return;
  e.spi -= dt;
  e.sc = (e.sc || 0) - dt;
  if (e.sc <= 0) {
    e.sc = 0.11;
    e.sa = (e.sa || 0) + 0.42;
    const arms = e.ph == 2 ? 4 : 3;
    for (let k = 0; k < arms; k++) eshot(e.x, e.y + 8, e.sa + (k * Math.PI * 2) / arms, 70, e);
  }
}

// Falling curtain of slow bullets across the room with a 3-column gap.
function curtain(e) {
  const gap = RI(10);
  for (let i = 0; i < 12; i++) if (i < gap || i >= gap + 3) eshot(28 + i * 16, 26, Math.PI / 2, 58, e);
}

// Called from updateEnemies for e.t==='boss'. ctx = movement helper + vector to the player.
export function updateBoss(e, s, dt, { step, dx, d, an }) {
  if (e.ph === undefined) e.ph = 0;
  if (e.inv > 0) return; // phase change: invulnerable, holds still (timer runs in bindings.js updateStatus)
  if (e.ph < 2 && e.hp <= phaseFloor(e, e.ph)) {
    nextPhase(e, s);
    return;
  }
  const P = PHASES[e.ph];
  step(Math.sign(dx) * Math.min(P.speed, Math.abs(dx)), 0);
  spiral(e, dt);
  e.tm -= dt;
  if (e.tm <= 0) {
    e.tm = P.every;
    e.st++;
    if (e.ph == 0) {
      // original patterns
      if (e.st % 2) {
        const o = R(0, 6);
        for (let i = 0; i < 12; i++) eshot(e.x, e.y + 8, o + i * 0.5236, 60, e);
      } else for (let i = -2; i <= 2; i++) eshot(e.x, e.y + 8, an + i * 0.2, 85, e);
    } else if (e.ph == 1) {
      const k = e.st % 3;
      if (k == 0) {
        const o = R(0, 6);
        for (let i = 0; i < 14; i++) eshot(e.x, e.y + 8, o + (i * Math.PI * 2) / 14, 65, e);
      } else if (k == 1) for (let i = -2; i <= 2; i++) eshot(e.x, e.y + 8, an + i * 0.18, 95, e);
      else e.spi = 1.4;
    } else {
      const k = e.st % 4;
      if (k == 0) {
        const o = R(0, 6);
        for (let i = 0; i < 16; i++) {
          eshot(e.x, e.y + 8, o + (i * Math.PI * 2) / 16, 70, e);
          eshot(e.x, e.y + 8, o + ((i + 0.5) * Math.PI * 2) / 16, 48, e);
        }
      } else if (k == 1) for (let i = -3; i <= 3; i++) eshot(e.x, e.y + 8, an + i * 0.16, 100, e);
      else if (k == 2) e.spi = 1.8;
      else curtain(e);
    }
    sfx(90, 0.2, "sawtooth", 0.07, -30);
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
