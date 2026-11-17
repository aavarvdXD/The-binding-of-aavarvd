// Drawing for the shop system: counter, pedestals, items on sale, NPCs, coins and the interaction panel.
import { IM } from "./assets.js";
import { BM } from "./bindings.js";
import { ITEMS } from "./items.js";
import { SLOT_X, SLOT_Y } from "./shops.js";
import { W, H, OY } from "./util.js";
const FONT = '8px "Press Start 2P",monospace';
// Static counter, baked into the shop room image (it fills the collision tiles 6..8 x 4).
export function bakeShop(q) {
  q.fillStyle = "#4a2c14";
  q.fillRect(96, 64, 48, 16);
  q.fillStyle = "#7a4a22";
  q.fillRect(96, 64, 48, 12);
  q.fillStyle = "#a8683a";
  q.fillRect(96, 64, 48, 2);
  q.fillStyle = "#3a2010";
  q.fillRect(112, 66, 1, 14);
  q.fillRect(128, 66, 1, 14);
  q.fillStyle = "#2a1608";
  q.fillRect(96, 79, 48, 1);
}
const coin = (g, x, y, s = 8) => g.drawImage(IM.dz, 96, 128, 16, 16, Math.round(x), Math.round(y), s, s);
export function drawCoins(g, s, tt) {
  for (const c of s.cn) coin(g, c.x - 5, c.y - 5 + Math.sin(tt * 6 + c.x) * 1.2, 10);
}
// Pedestals + merchandise (or the abandoned look before the shopkeeper is rescued).
export function drawShop(g, s, tt) {
  if (s.r.t != "shop") return;
  for (const x of SLOT_X) g.drawImage(IM.dz, 96, 144, 16, 16, x - 8, SLOT_Y + 2, 16, 16);
  g.font = FONT;
  g.textAlign = "center";
  if (!s.resc) {
    g.fillStyle = "rgba(5,3,10,0.4)";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(220,220,235,0.35)"; // cobwebs in the corners
    for (let i = 1; i <= 4; i++) {
      for (const [cx, cy, sx, sy] of [[16, 16, 1, 1], [224, 16, -1, 1]]) {
        g.beginPath();
        g.moveTo(cx + sx * i * 5, cy);
        g.lineTo(cx, cy + sy * i * 5);
        g.stroke();
      }
    }
    g.fillStyle = "#a8683a";
    g.fillText("CLOSED", 120, 50);
    return;
  }
  (s.r.stock || []).forEach((it, i) => {
    if (it.sold) return;
    const x = SLOT_X[i],
      y = SLOT_Y - 6 + Math.sin(tt * 3 + i) * 1.5;
    if (it.k == "b") {
      if (BM[it.id].shop) {
        g.strokeStyle = "#b79bff"; // shop-exclusive glow
        g.globalAlpha = 0.5 + 0.3 * Math.sin(tt * 5);
        g.beginPath();
        g.arc(x, y, 11, 0, 6.3);
        g.stroke();
        g.globalAlpha = 1;
      }
      g.drawImage(IM[BM[it.id].ic], 0, 0, 16, 16, x - 8, Math.round(y - 8), 16, 16);
    } else {
      const [k, sx, sy, sw, sh, sc] = ITEMS[it.id].ic;
      g.drawImage(IM[k], sx, sy, sw, sh, Math.round(x - (sw * sc) / 2), Math.round(y - (sh * sc) / 2), sw * sc, sh * sc);
    }
    coin(g, x - 11, SLOT_Y + 20);
    g.textAlign = "left";
    g.fillStyle = s.coins >= it.price ? "#ffd36b" : "#ff5d73";
    g.fillText(String(it.price), x - 1, SLOT_Y + 27);
    g.textAlign = "center";
  });
}
// The shopkeeper (OldMan sheet) and the bound shopkeeper (BoundOldMan sheet): both 16x16, columns down/up/left/right.
export function drawNpc(g, s, n, tt) {
  const bound = n.t == "bound",
    dx = s.x - n.x,
    dy = s.y - n.y,
    dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : dy < 0 ? 1 : 0, // faces the player
    x = Math.round(n.x - 8 + (bound && Math.sin(tt * 12) > 0.85 ? 1 : 0)),
    y = Math.round(n.y - 8 + Math.sin(tt * (bound ? 9 : 2)) * (bound ? 0.6 : 0.5));
  g.drawImage(bound ? IM.bound : IM.keeper, dir * 16, 0, 16, 16, x, y, 16, 16);
  if (bound && Math.floor(tt * 2) % 2) {
    g.font = FONT;
    g.textAlign = "center";
    g.fillStyle = "#ffd23f";
    g.fillText("HELP!", n.x, y - 4);
  }
}
const wrap = (t, n) => {
  const out = [];
  let l = "";
  for (const w of t.split(" ")) {
    if ((l + " " + w).trim().length > n) {
      out.push(l);
      l = w;
    } else l = (l + " " + w).trim();
  }
  if (l) out.push(l);
  return out;
};
// Bottom panel: item name + price, description, buy prompt (or the untie prompt next to the bound shopkeeper).
export function drawShopHint(g, s) {
  const h = s.hint;
  if (!h) return;
  const lines = h.desc ? wrap(h.desc, 27) : [],
    n = 2 + lines.length + (h.ex ? 1 : 0),
    hh = n * 10 + 6,
    y0 = OY + H - hh - 2;
  g.fillStyle = "rgba(7,4,12,0.9)";
  g.fillRect(4, y0, W - 8, hh);
  g.strokeStyle = "#6b4bb0";
  g.strokeRect(4.5, y0 + 0.5, W - 9, hh - 1);
  g.font = FONT;
  g.textAlign = "left";
  let y = y0 + 11;
  g.fillStyle = "#ffd36b";
  g.fillText(h.a, 9, y);
  y += 10;
  if (h.ex) {
    g.fillStyle = "#b79bff";
    g.fillText("SHOP EXCLUSIVE", 9, y);
    y += 10;
  }
  g.fillStyle = "#bdb2d6";
  for (const ln of lines) {
    g.fillText(ln, 9, y);
    y += 10;
  }
  g.fillStyle = h.b.startsWith("[E]") ? "#7fe8ff" : "#ff5d73";
  g.fillText(h.b, 9, y);
}
