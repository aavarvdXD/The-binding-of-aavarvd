// Floor generation, room entry/spawning, wall collision, door transitions, room clearing, the stairs exit.
import { S } from "./state.js";
import { DR, R, RI, D, W, H } from "./util.js";
import { SV, save } from "./save.js";
import { sfx } from "./audio.js";
import { mk } from "./enemies.js";
import { has, ASCEND_LIFE } from "./bindings.js";
import { toast, pickScr, stairScr } from "./ui.js";
import { assignSpecialRooms, setupSpecial, checkAutoRescue } from "./shops.js";
// Random-walk layout of 8 rooms; the boss room is the one farthest (by door distance) from the spawn room.
export function gen() {
  const m = {},
    L = [];
  const add = (x, y, dp) => {
    const r = {
      x,
      y,
      dp,
      o: new Set(),
      t: "fight",
      open: false,
      clr: false,
      vis: false,
      mimic: dp > 1 && Math.random() < 0.5,
    };
    m[x + "," + y] = r;
    L.push(r);
    return r;
  };
  add(0, 0, 0).t = "start";
  while (L.length < 12) { // 12 rooms
    const p = L[RI(L.length)],
      d = DR[RI(4)],
      nx = p.x + d.dx,
      ny = p.y + d.dy;
    if (!m[nx + "," + ny]) add(nx, ny, p.dp + 1);
  }

  L.forEach((r) => {
    r.nb = DR.map((d) => m[r.x + d.dx + "," + (r.y + d.dy)]);
    if (r.t == "fight") {
      for (let i = RI(6); i >= 0; i--) {
        const tx = 2 + RI(11),
          ty = 2 + RI(7);
        if (tx != 7 && ty != 5) r.o.add(tx + "," + ty);
      }
    }
  });
  const dist = new Map([[L[0], 0]]),
    q = [L[0]];
  while (q.length) {
    const c = q.shift();
    c.nb.forEach((n) => {
      if (n && !dist.has(n)) {
        dist.set(n, dist.get(c) + 1);
        q.push(n);
      }
    });
  }
  let bs = L[1];
  L.forEach((r) => {
    if (dist.get(r) >= dist.get(bs)) bs = r;
  });
  bs.t = "boss";
  bs.o.clear();
  bs.mimic = 0;
  assignSpecialRooms(L); // shop + kidnap room (never the spawn or boss room)
  return L;
}
// Move the player into room r (di = index of the door they came through, or null at run start) and spawn its enemies.
export function enter(r, di) {
  S.r = r;
  r.vis = true;
  S.sh_ = [];
  S.eb = [];
  S.pk = [];
  S.es = [];
  S.fx = [];
  S.cl = [];
  S.bh = [];
  S.arc = [];
  S.tel = [];
  S.ban = null;
  S.npc = null;
  S.cn = []; // coins left behind in the previous room are lost
  S.dmgRoom = 0; // Ascension: damage taken in this room
  checkAutoRescue(); // explored every room except shop + boss -> the shopkeeper escapes
  if (di != null) {
    const d = DR[di];
    S.x = d.dx == 0 ? 120 : d.dx > 0 ? 218 : 22;
    S.y = d.dy == 0 ? 88 : d.dy > 0 ? 146 : 30;
  }
  if (r.t == "start" || r.clr) {
    r.open = true;
    setupSpecial(r); // shop / kidnap room contents
    return;
  }
  r.open = false;
  const dp = r.dp;
  if (r.t == "boss") {
    S.es.push(mk("boss", 120, 48));
    S.aT = 3;
    return;
  }
  // Fortune: the first time a fight room is entered it may be lucky (double loot) or an ambush (extra enemies).
  if (has("fortune") && r.fz === undefined) {
    const k = Math.random();
    r.fz = k < 0.28 ? 1 : k < 0.5 ? 2 : 0;
    if (r.fz === 1) toast("LUCKY ROOM: DOUBLE LOOT");
    if (r.fz === 2) toast("AMBUSH: EXTRA ENEMIES");
  }
  const n = 3 + Math.min(3, dp) + RI(2) + (r.fz === 2 ? 3 : 0);
  for (let i = 0; i < n; i++) {
    const k = Math.random();
    let t = "skull";
    if (k > 0.45) t = "octo";
    if (k > 0.8 && dp > 0) t = "spirit";
    let p;
    do {
      p = { x: R(28, 212), y: R(28, 148) };
    } while (
      D(p.x, p.y, S.x, S.y) < 70 ||
      r.o.has(Math.floor(p.x / 16) + "," + Math.floor(p.y / 16))
    );
    S.es.push(mk(t, p.x, p.y));
  }
  if (r.mimic) S.es.push(mk("mimic", R(60, 180), R(40, 130)));
}
// Solid test used by player (pl=1: open doors are passable), shots and enemies.
export function blk(x, y, pl) {
  const tx = Math.floor(x / 16),
    ty = Math.floor(y / 16);
  if (tx < 0 || ty < 0 || tx > 14 || ty > 10) return 1;
  if (tx == 0 || ty == 0 || tx == 14 || ty == 10) {
    if (pl && S.r.open)
      for (let i = 0; i < 4; i++) {
        const d = DR[i];
        if (
          S.r.nb[i] &&
          (i < 2
            ? ty == d.y && Math.abs(x - 120) < 16
            : tx == d.x && Math.abs(y - 88) < 16)
        )
          return 0;
      }
    return 1;
  }
  return S.r.o.has(tx + "," + ty);
}
// Leave through an open door.
export function updateRoomTransitions(s) {
  DR.forEach((d, i) => {
    if (
      s.r.open &&
      s.r.nb[i] &&
      ((d.dx < 0 && s.x < 5) ||
        (d.dx > 0 && s.x > W - 5) ||
        (d.dy < 0 && s.y < 5) ||
        (d.dy > 0 && s.y > H - 5))
    ) {
      const dir = i;
      enter(s.r.nb[i], i ^ 1);
      if (s.r.t != "start" && !s.r.clr) sfx(150, 0.3, "sawtooth", 0.06);
    }
  });
}
// Boss beaten + player standing on the spawn-room ladder -> stairs screen. Returns true if triggered.
export function checkStairs(s) {
  if (s.won && s.r.t === "start" && D(s.x, s.y, 120, 56) < 9) {
    s.mode = "stairs";
    stairScr();
    return true;
  }
  return false;
}
// The ONLY place a boss victory is recorded: sets s.won (guard: once per run), bumps the persistent counter SV.w once,
// announces the Pinball/Bug unlock on the first ever win (the unlock itself is SV.w>0, checked in ui.js pickScr),
// and points the player back to the spawn room, where the stairs appear (rendered while s.won; triggered by checkStairs).
export function onBossDefeated(s) {
  if (s.won) return;
  s.won = 1;
  const first = SV.w === 0;
  SV.w++;
  save();
  toast("THE AUDITOR FALLS");
  if (first) setTimeout(() => toast("SHOP UNLOCK: REBOUND, BUGS"), 1300);
  setTimeout(() => toast("GO BACK TO THE SPAWN ROOM"), 2600);
  sfx(300, 0.6, "triangle", 0.08, 400);
}
// All enemies dead -> open doors; boss clear sets s.won; normal rooms offer a Binding.
export function checkRoomClear(s) {
  if (!s.r.clr && s.mode == "play" && s.es.length == 0 && s.r.t != "start") {
    s.r.clr = 1;
    s.r.open = true;
    sfx(520, 0.3, "triangle", 0.06, 300);
    if (has("ascend") && !s.dmgRoom) {
      s.asS = ASCEND_LIFE; // clean clear: temporary shield that absorbs the next hit
      toast("ASCENSION SHIELD");
    }
    if (s.r.t == "boss") {
      onBossDefeated(s);
    } else {
      toast("ROOM CLEARED");
      s.picks = has("fortune") && s.r.fz === 1 ? 2 : 1; // Fortune jackpot: choose two Bindings
      s.mode = "clr";
      setTimeout(() => pickScr(), 700);
    }
  }
}
