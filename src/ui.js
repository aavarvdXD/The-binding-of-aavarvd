// Everything DOM/HUD: layout scaling, overlay screens (title, Binding choice, death, stairs), toasts, HUD drawing.
// Overlay buttons use data-act attributes handled by one delegated click listener (no inline onclick, no globals).
import { S } from "./state.js";
import { $, W, H, OY, DR, BUILD } from "./util.js";
import { A, IM } from "./assets.js";
import { SV, save } from "./save.js";
import { sfx, playMusic } from "./audio.js";
import { BD, BM, MAX_BINDINGS } from "./bindings.js";
import { heal } from "./player.js";
import { checkSynergies } from "./synergies.js";
import { g, spr } from "./renderer.js";
import { start } from "./game.js";
const ov = $("ov");
export function hideOverlay() {
  ov.style.display = "none";
}
// Enter = press the first button of the open overlay (title / death / stairs), so menus work without a mouse.
export function activatePrimary() {
  if (ov.style.display !== "flex" || (S && S.mode === "pick")) return;
  const t = ov.querySelector("[data-act]");
  if (t) t.click();
}
// Integer-ish scaling of the 240x200 canvas to the window.
export function initLayout() {
  function fit() {
    const s = Math.max(
      1,
      Math.floor(Math.min(innerWidth / 240, innerHeight / 200) * 4) / 4,
    );
    document.documentElement.style.setProperty("--s", s);
  }
  addEventListener("resize", fit);
  fit();
  ov.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const a = t.dataset.act;
    if (a === "pick") pick(+t.dataset.i);
    else if (a === "start") {
      playMusic()
      start();
    }
    else if (a === "stay") stay();
    else if (a === "skip") skip();
    else if (a === "swap") swap(+t.dataset.i);
    else if (a === "back") renderChoice();
  });
}
export function toast(t) {
  S.msg.push({ t, l: 2.4 });
}
// Binding choice after a room is cleared. With MAX_BINDINGS equipped, taking a new Binding means replacing an equipped one
// (second screen) and a SKIP button keeps the current loadout. cho = the 3 offered, pend = the one chosen for replacing.
let cho = [],
  pend = null;
export function pickScr() {
  S.mode = "pick";
  pend = null;

  const pool = BD.filter(
    (b) =>
      !S.own.includes(b.id) &&
      (!b.lock || SV.w > 0) &&
      !(S.own.includes("glass") && b.id === "twin") &&
      !(S.own.includes("twin") && b.id === "glass"),
  );

  cho = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  if (!cho.length) {
    heal(S.mh);
    S.picks = 1;
    S.mode = "play";
    return;
  }
  renderChoice();
}
function renderChoice() {
  pend = null;
  const full = S.own.length >= MAX_BINDINGS;
  ov.innerHTML =
    '<h1 style="font-size:calc(var(--s)*6px)">CHOOSE A BINDING</h1><p>' +
    (full
      ? `Loadout full (${MAX_BINDINGS}/${MAX_BINDINGS}): taking one replaces an equipped Binding. Press 1-3 or click.`
      : "Fragments of a broken rule. Press 1-3 or click.") +
    '</p><div class="row">' +
    cho
      .map(
        (b, i) =>
          `<div class="card" data-act="pick" data-i="${i}"><img src="${A[b.ic]}"><b>${b.n}</b><span>${b.d}</span><span>[${i + 1}]</span></div>`,
      )
      .join("") +
    "</div>" +
    (full ? '<div class="row"><button data-act="skip">SKIP [ESC]</button></div>' : "");
  ov.style.display = "flex";
}
// Second screen (loadout full): which equipped Binding does pend replace?
function renderReplace() {
  ov.innerHTML =
    `<h1 style="font-size:calc(var(--s)*6px)">REPLACE WHICH?</h1><p>${pend.n} takes the place of one of your Bindings. Press 1-${S.own.length} or click.</p><div class="row">` +
    S.own
      .map(
        (id, j) =>
          `<div class="card sm" data-act="swap" data-i="${j}"><img src="${A[BM[id].ic]}"><b>${BM[id].n}</b><span>[${j + 1}]</span></div>`,
      )
      .join("") +
    '</div><div class="row"><button data-act="back">BACK [ESC]</button><button data-act="skip">SKIP</button></div>';
}
// Offered card i was chosen (cards or keys 1-3).
export function pick(i) {
  const b = cho[i];
  if (!b || S.mode != "pick" || pend) return;
  // Shards and Twins exclude each other: taking one already swaps out the other, so no extra choice is needed.
  const other = b.id == "glass" ? "twin" : b.id == "twin" ? "glass" : null;
  if (S.own.length >= MAX_BINDINGS && !(other && S.own.includes(other))) {
    pend = b;
    renderReplace();
    return;
  }
  applyBinding(b);
}
// Equipped Binding j is replaced by the pending one.
export function swap(j) {
  if (!pend || S.mode != "pick" || S.own[j] === undefined) return;
  const old = S.own[j];
  S.own.splice(j, 1);
  if (old == "void") S.mh += 2; // Void's max-health drawback goes away with it
  toast(BM[old].sn.toUpperCase() + " REPLACED");
  const b = pend;
  pend = null;
  applyBinding(b);
}
// Keep the current loadout (counts as using this pick).
export function skip() {
  if (S.mode != "pick") return;
  pend = null;
  ov.style.display = "none";
  S.mode = "play";
  afterPick();
}
// Keyboard on the choice screens: 1-3 / 1-4 select, Esc = skip (offer) or back (replace screen).
export function pickKey(k) {
  if (pend) {
    if (k == "Escape") renderChoice();
    else if (/^[1-4]$/.test(k)) swap(+k - 1);
  } else if (k == "Escape") {
    if (S.own.length >= MAX_BINDINGS) skip();
  } else if (/^[1-3]$/.test(k)) pick(+k - 1);
}
// Fortune jackpot room: choose again after the first pick (or skip).
function afterPick() {
  if (S.picks > 1) {
    S.picks--;
    S.mode = "clr";
    toast("DOUBLE LOOT: PICK AGAIN");
    setTimeout(() => pickScr(), 500);
  }
}
function applyBinding(b) {
  if (b.id == "glass" || b.id == "twin") {
    const other = b.id == "glass" ? "twin" : "glass";
    if (S.own.includes(other)) {
      S.own = S.own.filter((id) => id != other);
      toast(BM[other].n.toUpperCase() + " REMOVED");
    }
  }
  S.own.push(b.id);
  ov.style.display = "none";
  S.mode = "play";
  S.gl = 0.4;
  S.shake = 4;
  sfx(600, 0.3, "triangle", 0.07, 500);
  toast(b.n.toUpperCase());
  checkSynergies(b.id);
  if (b.id == "aegis") {
    S.sh = 1;
  }
  if (b.id == "void") {
    // Void drawback: permanently lower max health (hearts shown in the HUD shrink with it).
    S.mh = Math.max(2, S.mh - 2);
    S.hp = Math.min(S.hp, S.mh);
  }
  afterPick();
}
export function deadScr() {
  ov.innerHTML = `<h1>YOU ARE UNWRITTEN</h1><p>Rooms cleared: ${S.rs.filter((r) => r.clr).length} / ${S.rs.length} &middot; Kills: ${S.kills}</p><p>Bindings: ${S.own.map((i) => BM[i].n).join(", ") || "none"}</p><p>Synergies found: ${SV.c.join(", ") || "none yet"}</p><div class="row"><button data-act="start">TRY AGAIN [R]</button></div>`;
  ov.style.display = "flex";
}
export function stairScr() {
  sfx(200, 0.5, "sine", 0.08, 400);
  ov.innerHTML = `<h1 style="color:#7fd4ff">THE STAIRS DESCEND</h1><p>Floor I is broken open. Floor II &mdash; The Distortion &mdash; has not been written yet.</p><p>Bindings: ${S.own.map((i) => BM[i].n).join(", ") || "none"}</p><div class="row"><button data-act="stay">KEEP EXPLORING [ENTER]</button><button data-act="start">NEW RUN [R]</button></div>`;
  ov.style.display = "flex";
}
export function stay() {
  ov.style.display = "none";
  S.y = 92;
  S.mode = "play";
}
export function showTitle() {
  ov.innerHTML =
    '<h1>THE BINDING<br>OF AAVARVD</h1><p>You are trapped in the Unwritten, a world built from broken rules.<br>Collect Bindings. Combine them. Break the game.</p><p>WASD move &middot; Arrow keys aim + fire &middot; Space fires<br>(Mouse aim + click also work)</p><div class="row"><button data-act="start">ENTER THE UNWRITTEN [ENTER]</button></div><p>' +
    (SV.w ? "Boss defeated x" + SV.w + " &middot; " : "") +
    "Synergies found: " +
    SV.c.length +
    '</p><p style="opacity:.45;font-size:.8em">build ' +
    BUILD +
    "</p>";
  ov.style.display = "flex";
}
// HUD: hearts, Binding icons (struck through while disabled), minimap, boss bar, toasts, spawn-room prompts.
export function drawHUD(g, s) {
  const tt = s.t;
  g.fillStyle = "#0d0818";
  g.fillRect(0, 0, W, OY);
  g.fillStyle = "#3b2470";
  g.fillRect(0, OY - 1, W, 1);
  for (let i = 0; i < s.mh; i++) {
    g.globalAlpha = Math.max(0.2, Math.min(1, s.hp - i)); // partial hearts dim (Watcher can cause fractional damage)
    spr("heart", 0, 0, 9, 8, 9 + i * 10, 10, 1);
  }
  g.globalAlpha = 1;
  s.own.forEach((id, i) => {
    const x = 8 + i * (s.own.length > 15 ? Math.floor(180 / s.own.length) : 12); // squeeze icons if many Bindings are owned
    g.globalAlpha = s.dis[id] > 0 ? 0.25 : 1;
    g.drawImage(IM[BM[id].ic], 0, 0, 16, 16, x, 13, 10, 10);
    // charge bars: Chronos (next slow), Thunder (charged = full), Ascension (shield time left)
    let p = null,
      pc = "#7fd4ff";
    if (id == "chrono") p = s.slow > 0 ? 1 : 1 - s.chT / 7;
    else if (id == "thunder") (p = s.thR ? 1 : 1 - s.thT / 6), (pc = "#ffe066");
    else if (id == "ascend") (p = s.asS > 0 ? s.asS / 25 : 0), (pc = "#ffd36b");
    if (p !== null && s.dis[id] == null) {
      g.fillStyle = "#000";
      g.fillRect(x, 22, 10, 1);
      g.fillStyle = pc;
      g.fillRect(x, 22, 10 * Math.max(0, Math.min(1, p)), 1);
    }
    if (s.dis[id] > 0) {
      g.fillStyle = "#f35";
      g.fillRect(x, 18, 10, 1);
    }
    g.globalAlpha = 1;
  });
  g.font = '8px "Press Start 2P",monospace';
  g.textAlign = "left";
  // Minimap: fixed-size cells (8x6 px, room = 6x4) in a window around the current room (+-2 columns, +-1 row), so the
  // squares never overlap however big the 12-room floor is. The current room is always in the middle.
  const mcx = 212,
    mcy = 12;
  for (const q of s.rs) {
    const rx = q.x - s.r.x,
      ry = q.y - s.r.y;
    if (Math.abs(rx) > 2 || Math.abs(ry) > 1) continue;
    if (!q.vis && !q.nb.some((n) => n && n.vis)) continue;
    const px = mcx - 3 + rx * 8,
      py = mcy - 2 + ry * 6;
    g.fillStyle =
      q == s.r
        ? "#fff"
        : q.t == "boss"
          ? "#f55"
          : q.t == "start"
            ? "#3aa0ff"
            : q.clr
              ? "#7a5ad0"
              : "#3b2470";
    g.fillRect(px, py, 6, 4);
    q.nb.forEach((n, i) => {
      if (n && (q.vis || n.vis)) {
        g.fillStyle = q.vis && n.vis ? "#7a5ad0" : "#3b2470";
        const d = DR[i];
        g.fillRect(px + d.dx * 2 + 2, py + d.dy * 2 + 1, 2, 2);
      }
    });
  }
  const bo = s.es.find((e) => e.t == "boss");
  if (bo) {
    g.fillStyle = "#300";
    g.fillRect(40, OY + 4, 160, 4);
    g.fillStyle = "#f45";
    g.fillRect(40, OY + 4, (160 * Math.max(0, bo.hp)) / (bo.mhp || 70), 4);
    g.fillStyle = "#07040c"; // phase marks at 1/3 and 2/3
    g.fillRect(40 + 53, OY + 4, 1, 4);
    g.fillRect(40 + 107, OY + 4, 1, 4);
  }
  s.msg.slice(-2).forEach((m, i) => {
    g.globalAlpha = Math.min(1, m.l);
    g.textAlign = "center";
    const c = m.t.startsWith("AUDIT")
      ? "#ff5d73"
      : m.t.startsWith("SYN")
        ? "#7fe8ff"
        : "#ffd36b";
    if (c != "#ffd36b") {
      g.fillStyle = "#000a";
      const w = g.measureText(m.t).width + 6;
      g.fillRect(120 - w / 2, OY + 14 + i * 11, w, 10);
    }
    g.fillStyle = c;
    g.fillText(m.t, 120, OY + 22 + i * 11);
    g.globalAlpha = 1;
  });
  if (s.r.t == "start") {
    g.fillStyle = "#3aa0ff";
    g.textAlign = "center";
    g.fillText("SPAWN ROOM", 120, OY + H - 26);
  }
  if (s.won && s.mode == "play" && Math.floor(tt * 2) % 2) {
    g.fillStyle = "#7fd4ff";
    g.textAlign = "center";
    g.fillText(
      s.r.t == "start" ? "TAKE THE STAIRS" : "RETURN TO THE SPAWN ROOM",
      120,
      OY + H - 8,
    );
  }
  if (s.mode == "play" && s.r.t == "start" && !s.own.length && !s.won) {
    g.fillStyle = "#bdb2d6";
    g.textAlign = "center";
    g.fillText("WASD move  ARROWS fire", 120, OY + H - 14);
  }
}
