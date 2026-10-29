// Canvas drawing: room bake (walls/floor/obstacles), doors, stairs, entities, shots. HUD is drawn by ui.js.
import { S } from "./state.js";
import { $, W, H, OY, DR, R } from "./util.js";
import { IM, FT } from "./assets.js";
import { K } from "./input.js";
import { has } from "./bindings.js";
import { drawParticles, drawExplosions, drawGlitch } from "./effects.js";
import { drawHUD } from "./ui.js";
export const cv = $("c"),
  g = cv.getContext("2d");
export function spr(i, sx, sy, sw, sh, x, y, sc = 1) {
  g.drawImage(
    IM[i],
    sx,
    sy,
    sw,
    sh,
    Math.round(x - (sw * sc) / 2),
    Math.round(y - (sh * sc) / 2),
    sw * sc,
    sh * sc,
  );
}
// Pre-render the static layer of a room (cached on r.cv).
export function bake(r) {
  const c = (r.cv = document.createElement("canvas"));
  c.width = W;
  c.height = H;
  const q = c.getContext("2d");
  q.imageSmoothingEnabled = false;
  for (let y = 0; y < 11; y++)
    for (let x = 0; x < 15; x++) {
      const e = x == 0 || y == 0 || x == 14 || y == 10;
      if (e) q.drawImage(IM.dun, 128, 48, 16, 16, x * 16, y * 16, 16, 16);
      else {
        q.drawImage(IM.floor, FT[0], FT[1], 16, 16, x * 16, y * 16, 16, 16);
        q.fillStyle = (x + y) % 2 ? "#3a1470aa" : "#240a52b0";
        q.fillRect(x * 16, y * 16, 16, 16);
      }
    }
  q.fillStyle = "#1a0a3a99";
  for (let y = 1; y < 10; y++)
    for (let x = 1; x < 14; x++)
      if (r.o.has(x + "," + y))
        q.drawImage(IM.dun, 112, 48, 16, 16, x * 16, y * 16, 16, 16);
  const gr = q.createRadialGradient(120, 88, 40, 120, 88, 150);
  gr.addColorStop(0, "#0000");
  gr.addColorStop(1, "#000c");
  q.fillStyle = gr;
  q.fillRect(0, 0, W, H);
}
export function draw() {
  const s = S;
  g.fillStyle = "#07050c";
  g.fillRect(0, 0, W, 200);
  const r = s.r;
  if (!r.cv) bake(r);
  g.save();
  g.translate(
    Math.round(R(-1, 1) * s.shake),
    OY + Math.round(R(-1, 1) * s.shake),
  );
  g.drawImage(r.cv, 0, 0);
  DR.forEach((d, i) => {
    if (!r.nb[i]) return;
    g.save();
    g.translate(i < 2 ? 120 : i == 2 ? 8 : 232, i == 0 ? 8 : i == 1 ? 168 : 88);
    if (i > 1) g.rotate(i == 2 ? -1.5708 : 1.5708);
    if (r.open) {
      g.fillStyle = "#0b0614";
      g.fillRect(-16, -8, 32, 16);
      g.drawImage(IM.dz, 96, 48, 16, 16, -16, -8, 5, 16);
      g.drawImage(IM.dz, 112, 48, 16, 16, 11, -8, 5, 16);
    } else g.drawImage(IM.dz, 96, 48, 32, 16, -16, -8, 32, 16);
    g.restore();
  });
  const tt = s.t,
    fr = Math.floor(tt * 7) % 4;
  if (s.won && r.t == "start") {
    const pu = 0.5 + 0.5 * Math.sin(tt * 4);
    g.fillStyle = "rgba(60,160,255," + (0.15 + 0.2 * pu) + ")";
    g.fillRect(104, 40, 32, 32);
    g.fillStyle = "#0b0614";
    g.fillRect(112, 48, 16, 16);
    g.drawImage(IM.dz, 144, 48, 16, 16, 112, 48, 16, 16);
  }
  // Void: black holes (faint pull radius, spinning arcs, dark core)
  for (const h of s.bh) {
    g.save();
    g.translate(h.x, h.y);
    g.fillStyle = "rgba(106,63,208,0.12)";
    g.beginPath();
    g.arc(0, 0, 56, 0, 6.3);
    g.fill();
    g.strokeStyle = "#9b6bff";
    g.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const a0 = tt * (5 - i) + i * 2;
      g.beginPath();
      g.arc(0, 0, 8 + i * 5 + Math.sin(tt * 6 + i), a0, a0 + 2.2);
      g.stroke();
    }
    g.fillStyle = "#07040c";
    g.beginPath();
    g.arc(0, 0, 5 + Math.sin(tt * 9), 0, 6.3);
    g.fill();
    g.restore();
  }
  for (const p of s.pk)
    spr("heart", 0, 0, 9, 8, p.x, p.y + Math.sin(tt * 5) * 1.5, 1.2);
  const ent = [];
  s.es.forEach((e) =>
    ent.push([
      e.y + (e.t == "boss" ? 20 : 0),
      () => {
        g.save();
        if (e.sp > 0) {
          g.globalAlpha = Math.floor(tt * 14) % 2 ? 0.5 : 0.15;
        } else
          g.globalAlpha =
            s.rev > 0 && has("watch") ? Math.max(e.al, 0.9) : e.al; // Watcher reveal shows hidden Glitches
        if (e.inv > 0 && Math.floor(tt * 16) % 2) g.globalAlpha *= 0.45; // phase change: flickering = invulnerable
        if (e.fl > 0) g.filter = "brightness(3)";
        else if (e.fr > 0)
          g.filter = "hue-rotate(150deg) saturate(1.6) brightness(1.5)"; // frozen
        else if (e.fz > 0) g.filter = "hue-rotate(150deg) brightness(1.15)"; // chilled
        else if (e.po > 0) g.filter = "hue-rotate(75deg) saturate(1.4)"; // poisoned
        if (e.t == "boss")
          spr(
            e.fl > 0 ? "bosshit" : "boss",
            (Math.floor(tt * 5) % (e.fl > 0 ? 3 : 5)) * 50,
            0,
            50,
            50,
            e.x,
            e.y,
          );
        else if (e.t == "mimic")
          spr(
            "chest",
            e.aw ? 16 : 0,
            0,
            16,
            16,
            e.x,
            e.y + (e.aw && Math.floor(tt * 10) % 2 ? -1 : 0),
          );
        else spr(e.t, e.dir * 16, fr * 16, 16, 16, e.x, e.y);
        g.restore();
        if (e.mk > 0 && has("watch")) {
          // Watcher mark: pulsing red ring with tick marks
          const rr = e.r + 4 + Math.sin(tt * 8);
          g.strokeStyle = "#ff3355";
          g.lineWidth = 1;
          g.beginPath();
          g.arc(e.x, e.y, rr, 0, 6.3);
          g.stroke();
          g.fillStyle = "#ff3355";
          g.fillRect(e.x - 1, e.y - rr - 3, 2, 3);
          g.fillRect(e.x - 1, e.y + rr, 2, 3);
          g.fillRect(e.x - rr - 3, e.y - 1, 3, 2);
          g.fillRect(e.x + rr, e.y - 1, 3, 2);
        }
        if (s.rev > 0 && has("watch")) {
          // Watcher reveal: outline + health bar on every enemy
          g.strokeStyle = "#7fe8ff";
          g.globalAlpha = Math.min(1, s.rev * 2);
          g.beginPath();
          g.arc(e.x, e.y, e.r + 2, 0, 6.3);
          g.stroke();
          g.fillStyle = "#000a";
          g.fillRect(e.x - 7, e.y - e.r - 8, 14, 3);
          g.fillStyle = "#7fe8ff";
          g.fillRect(e.x - 6, e.y - e.r - 7, (12 * Math.max(0, e.hp)) / (e.mhp || 1), 1);
          g.globalAlpha = 1;
        }
      },
    ]),
  );
  // Reflection clones: translucent blue copies of the player
  s.cl.forEach((c) =>
    ent.push([
      c.y,
      () => {
        g.save();
        g.globalAlpha = 0.55 * Math.min(1, (c.l - c.t) * 2);
        g.filter = "hue-rotate(170deg) brightness(1.5)";
        spr("pl", s.face * 16, (Math.floor(tt * 14) % 2 ? 4 : 0) * 16, 16, 16, c.x, c.y - 2);
        g.restore();
      },
    ]),
  );
  ent.push([
    s.y,
    () => {
      if (s.iv > 0 && Math.floor(tt * 20) % 2) return;
      const mv = K.w || K.a || K.s || K.d;
      spr(
        "pl",
        s.face * 16,
        (s.ft > 0 ? 4 : mv ? fr : 0) * 16,
        16,
        16,
        s.x,
        s.y - 2,
      );
      if (has("ascend") && s.asS > 0) {
        g.strokeStyle = "#ffd36b";
        g.globalAlpha = 0.6 + 0.3 * Math.sin(tt * 6);
        g.beginPath();
        g.arc(s.x, s.y - 1, 12, 0, 6.3);
        g.stroke();
        g.globalAlpha = 1;
      }
      if (has("thunder") && s.thR) {
        // Thunder charged: crackling spark
        g.fillStyle = "#ffe066";
        g.fillRect(s.x + Math.round(R(-7, 7)), s.y + Math.round(R(-9, 5)), 2, 2);
      }
      if (has("aegis") && s.sh) {
        g.strokeStyle = "#7fd4ff";
        g.globalAlpha = 0.7;
        g.beginPath();
        g.arc(s.x, s.y - 1, 10, 0, 6.3);
        g.stroke();
        g.globalAlpha = 1;
      }
    },
  ]);
  ent.sort((a, b) => a[0] - b[0]).forEach((e) => e[1]());
  for (const b of s.sh_) {
    if (b.ec) {
      g.save();
      g.globalAlpha = 0.4;
      g.translate(b.x, b.y);
      g.rotate(tt * 18);
      const z = b.r / 4.5;
      g.drawImage(IM.shur, -7.5 * z, -7.5 * z, 15 * z, 15 * z);
      g.restore();
      continue;
    }
    g.save();
    g.translate(b.x, b.y);
    g.rotate(tt * 18);
    const z = b.r / 4.5;
    g.drawImage(IM.shur, -7.5 * z, -7.5 * z, 15 * z, 15 * z);
    g.restore();
    if (has("glass") && !b.sh) {
      g.fillStyle = "#9fe8ff88";
      g.fillRect(b.x - 1, b.y - 1, 2, 2);
    }
  }
  for (const b of s.eb)
    spr("fire", (Math.floor(tt * 10) % 4) * 16, 0, 16, 16, b.x, b.y);
  // Thunder: chain lightning arcs (jagged, fade out)
  for (const a of s.arc) {
    g.globalAlpha = 1 - a.t / 0.25;
    g.lineWidth = 1.5;
    for (const col of ["#ffe066", "#ffffff"]) {
      g.strokeStyle = col;
      g.beginPath();
      a.pts.forEach((p, i) => {
        if (i == 0) return g.moveTo(a.pts[0].x, a.pts[0].y);
        const q = a.pts[i - 1],
          m = { x: (q.x + p.x) / 2 + R(-4, 4), y: (q.y + p.y) / 2 + R(-4, 4) };
        g.lineTo(m.x, m.y);
        g.lineTo(p.x, p.y);
      });
      g.stroke();
      g.lineWidth = 0.7;
    }
    g.globalAlpha = 1;
  }
  drawParticles(g, s);
  drawExplosions(g, s);
  if (has("chrono") && s.slow > 0) {
    // Chronos: cold blue tint while time is slowed
    g.fillStyle = "rgba(90,150,255,0.13)";
    g.fillRect(0, 0, W, H);
  }
  g.restore();
  // glitch slices
  drawGlitch(g, cv, s);
  // HUD
  drawHUD(g, s);
}
