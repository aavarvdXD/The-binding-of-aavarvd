// Particles, explosions, screen shake / glitch timers and their drawing.
import { S } from "./state.js";
import { R, RI, W, H, OY } from "./util.js";
import { spr } from "./renderer.js";
export function part(x, y, c, n, sp = 60) {
  for (let i = 0; i < n; i++) {
    const a = R(0, 6.28),
      v = R(10, sp);
    S.ps.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      l: R(0.2, 0.5),
      c,
    });
  }
}
// Advance particles, explosions, shake, glitch and toast timers (runs every frame, even on overlay screens).
export function updateEffects(s, dt) {
  for (const p of s.ps) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.l -= dt;
  }
  s.ps = s.ps.filter((p) => p.l > 0);
  for (const f of s.fx) f.t += dt;
  s.fx = s.fx.filter((f) => f.t < 0.6);
  for (const a of s.arc) a.t += dt;
  if (s.ban && (s.ban.t += dt) >= s.ban.l) s.ban = null;
  s.arc = s.arc.filter((a) => a.t < 0.25);
  s.shake *= 0.88;
  if (s.gl > 0) s.gl -= dt;
  s.msg.forEach((m) => (m.l -= dt));
  s.msg = s.msg.filter((m) => m.l > 0);
}
export function drawParticles(g, s) {
  for (const p of s.ps) {
    g.globalAlpha = Math.min(1, p.l * 4);
    g.fillStyle = p.c;
    g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  g.globalAlpha = 1;
}
export function drawExplosions(g, s) {
  for (const f of s.fx) {
    const i = Math.min(8, Math.floor((f.t / 0.6) * 9));
    spr("expl", i * 40, 0, 40, 40, f.x, f.y, f.big ? 2 : 0.8);
  }
}
export function drawGlitch(g, cv, s) {
  if (s.gl > 0) {
    for (let i = 0; i < 7; i++) {
      const y = RI(190);
      g.drawImage(cv, 0, y, W, R(3, 12), R(-8, 8), y, W, 8);
    }
    g.fillStyle = "#ff005512";
    g.fillRect(0, 0, W, 200);
  }
}
// Boss phase banner: dims the room, letterbox bars slide in, big shaking text (e.g. "TRUE AUDITOR / HAS AWAKENED").
export function drawBanner(g, s) {
  const b = s.ban;
  if (!b) return;
  const a = Math.max(0, Math.min(1, b.t / 0.25, (b.l - b.t) / 0.4)),
    k = b.t / b.l;
  g.save();
  g.globalAlpha = 0.55 * a;
  g.fillStyle = "#000";
  g.fillRect(0, OY, W, H);
  g.globalAlpha = a;
  g.fillStyle = "#07040c";
  const bar = Math.round(26 * a);
  g.fillRect(0, OY, W, bar);
  g.fillRect(0, OY + H - bar, W, bar);
  g.fillStyle = b.col;
  g.fillRect(0, OY + bar - 1, W, 1);
  g.fillRect(0, OY + H - bar, W, 1);
  g.font = '16px "Press Start 2P",monospace';
  g.textAlign = "center";
  const sh = (1 - k) * 2.2;
  b.lines.forEach((ln, i) => {
    const x = 120 + R(-sh, sh),
      y = OY + H / 2 - 4 + i * 22 + R(-sh, sh);
    g.fillStyle = "#3a1800";
    g.fillText(ln, x + 2, y + 2);
    g.fillStyle = b.t < 0.15 ? "#ffffff" : b.col;
    g.fillText(ln, x, y);
  });
  g.restore();
}
// Auditor stamp markers: a ring plus a disc that fills as the burst gets closer.
export function drawTelegraphs(g, s) {
  for (const m of s.tel) {
    const k = m.t / m.l;
    g.fillStyle = "rgba(255,93,115," + (0.12 + 0.3 * k) + ")";
    g.beginPath();
    g.arc(m.x, m.y, 14 * k, 0, 6.3);
    g.fill();
    g.strokeStyle = k > 0.75 && Math.floor(m.t * 20) % 2 ? "#ffffff" : "#ff5d73";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(m.x, m.y, 14, 0, 6.3);
    g.stroke();
    g.fillStyle = "#ff5d73";
    g.fillRect(m.x - 1, m.y - 17, 2, 4);
    g.fillRect(m.x - 1, m.y + 13, 2, 4);
    g.fillRect(m.x - 17, m.y - 1, 4, 2);
    g.fillRect(m.x + 13, m.y - 1, 4, 2);
  }
}
