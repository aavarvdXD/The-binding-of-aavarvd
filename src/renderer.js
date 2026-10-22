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
        } else g.globalAlpha = e.al;
        if (e.fl > 0) g.filter = "brightness(3)";
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
  drawParticles(g, s);
  drawExplosions(g, s);
  g.restore();
  // glitch slices
  drawGlitch(g, cv, s);
  // HUD
  drawHUD(g, s);
}
