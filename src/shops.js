// Shop & economy: the abandoned shop, the kidnapped shopkeeper (+ neutral skeletons), rescue (press E, or by exploring),
// coin drops, random stock and purchases. Drawing lives in shopview.js.
// Room types added in rooms.gen: "shop" and "kidnap" (both start cleared + open, so doors never lock and no Binding is offered).
import { S } from "./state.js";
import { R, RI, D } from "./util.js";
import { SV } from "./save.js";
import { sfx } from "./audio.js";
import { BD, BM } from "./bindings.js";
import { ITEMS, buyItem } from "./items.js";
import { part } from "./effects.js";
import { mk } from "./enemies.js";
import { toast, offerBinding } from "./ui.js";
export const RESCUE_COINS = 20; // thank-you money for freeing the shopkeeper by hand
export const SLOT_X = [40, 80, 120, 160, 200], // the 5 pedestals
  SLOT_Y = 104;
// [chance to drop, min coins, max coins]
const DROPS = {
  skull: [0.45, 1, 1],
  octo: [0.55, 1, 2],
  spirit: [0.6, 1, 2],
  skel: [0.5, 1, 2],
  mimic: [1, 3, 5],
  boss: [1, 12, 16],
};

// ---- floor generation: called at the end of rooms.gen()
export function assignSpecialRooms(L) {
  const c = L.filter((r) => r.t == "fight"); // never the spawn room or the boss room
  const shop = c.splice(RI(c.length), 1)[0],
    kid = c[RI(c.length)];
  shop.t = "shop";
  kid.t = "kidnap";
  for (const r of [shop, kid]) {
    r.o.clear();
    r.clr = true;
    r.open = true;
    r.mimic = 0;
  }
  shop.o.add("6,4"); // the counter (drawn by shopview.bakeShop)
  shop.o.add("7,4");
  shop.o.add("8,4");
  kid.sk = 1 + RI(4); // 1-4 neutral skeletons
  kid.host = false; // true once the player has attacked one
}

// ---- entering a special room (called from rooms.enter)
export function setupSpecial(r) {
  if (r.t == "shop") {
    if (S.resc) {
      r.stock = r.stock || genStock();
      S.npc = { t: "keeper", x: 120, y: 52 };
    } else if (!r.seen) toast("THE SHOP IS ABANDONED...");
  }
  if (r.t == "kidnap" && !r.done) {
    S.npc = { t: "bound", x: 120, y: 64 };
    for (let i = 0; i < r.sk; i++) {
      let p;
      do {
        p = { x: R(36, 204), y: R(84, 148) };
      } while (D(p.x, p.y, S.x, S.y) < 50);
      const e = mk("skel", p.x, p.y);
      e.host = r.host ? 1 : 0;
      S.es.push(e);
    }
  }
  r.seen = 1;
}

// ---- skeletons: neutral until the first one is attacked (called from bindings.damageEnemy)
export function provoke() {
  const r = S.r;
  if (r.t != "kidnap" || r.host) return;
  r.host = true;
  for (const e of S.es) if (e.t == "skel") e.host = 1;
  toast("THE SKELETONS TURN HOSTILE!");
  sfx(90, 0.4, "sawtooth", 0.08, -30);
  S.shake = Math.max(S.shake, 4);
}

// ---- rescue: manual (press E next to the shopkeeper, +coins) or automatic (every room except shop + boss discovered)
export function rescue(manual) {
  if (S.resc) return;
  S.resc = 1;
  const kid = S.rs.find((r) => r.t == "kidnap");
  if (kid) {
    kid.done = 1; // the encounter is over for the rest of the run
    kid.sk = 0;
  }
  if (S.r.t == "kidnap") {
    if (S.npc) part(S.npc.x, S.npc.y, "#ffd23f", 20, 80);
    S.npc = null;
    for (const e of S.es)
      if (e.t == "skel") {
        e.hp = 0; // the skeletons crumble
        e.noDrop = 1;
      }
  }
  sfx(660, 0.4, "triangle", 0.07, 600);
  if (manual) {
    S.coins += RESCUE_COINS;
    toast("SHOPKEEPER RESCUED! +" + RESCUE_COINS);
  } else toast("THE SHOPKEEPER ESCAPED!");
  toast("THE SHOP IS NOW OPEN");
}
export function checkAutoRescue() {
  if (!S.resc && S.rs.every((r) => r.vis || r.t == "shop" || r.t == "boss")) rescue(false);
}

// ---- random stock: 3 Bindings (regular or shop-exclusive, never ones you own) + 2 other items, shuffled onto the pedestals
const clashing = (id) => {
  const o = id == "glass" ? "twin" : id == "twin" ? "glass" : null; // Shards and Twins exclude each other
  return o && S.own.includes(o) ? o : null;
};
function genStock() {
  const ok = (b) => !S.own.includes(b.id) && !clashing(b.id) && (!b.lock || SV.w > 0);
  const st = [];
  for (let n = 0; n < 3; n++) {
    const want = Math.random() < 0.4; // 40%: try a shop-exclusive Binding
    const pool = (ex) => BD.filter((b) => !!b.shop === ex && ok(b) && !st.some((s) => s.id == b.id));
    let p = pool(want);
    if (!p.length) p = pool(!want);
    if (!p.length) break;
    const b = p[RI(p.length)];
    st.push({ k: "b", id: b.id, price: (b.shop ? 20 : 12) + RI(b.shop ? 7 : 5) });
  }
  while (st.length < 5) {
    const ids = Object.keys(ITEMS).filter((i) => !st.some((s) => s.id == i));
    if (!ids.length) break;
    let r = R(0, ids.reduce((a, i) => a + ITEMS[i].w, 0)),
      id = ids[0];
    for (const i of ids) {
      r -= ITEMS[i].w;
      if (r <= 0) {
        id = i;
        break;
      }
    }
    st.push({ k: "i", id, price: ITEMS[id].price + RI(3) - 1 });
  }
  for (let i = st.length - 1; i > 0; i--) {
    const j = RI(i + 1);
    [st[i], st[j]] = [st[j], st[i]];
  }
  return st;
}

// ---- interaction (E key) and the on-screen prompt
const nearSlot = () => {
  let b = -1,
    bd = 20;
  (S.r.stock || []).forEach((_, i) => {
    const d = D(S.x, S.y, SLOT_X[i], SLOT_Y);
    if (d < bd) {
      bd = d;
      b = i;
    }
  });
  return b;
};
export function interact() {
  if (S.mode != "play") return;
  const n = S.npc;
  if (S.r.t == "kidnap" && n && D(S.x, S.y, n.x, n.y) < 26) return rescue(true);
  if (S.r.t == "shop" && S.resc && S.r.stock) {
    const i = nearSlot();
    if (i >= 0) buy(S.r.stock[i]);
  }
}
function buy(it) {
  if (it.sold) return;
  if (S.coins < it.price) {
    toast("NOT ENOUGH COINS");
    sfx(110, 0.15, "square", 0.05);
    return;
  }
  const paid = () => {
    S.coins -= it.price;
    it.sold = 1;
    sfx(900, 0.12, "square", 0.05, 400);
  };
  if (it.k == "i") {
    if (buyItem(it.id)) paid();
    return;
  }
  if (S.own.includes(it.id)) return toast("YOU ALREADY HAVE IT");
  const c = clashing(it.id);
  if (c) return toast("CLASHES WITH " + BM[c].sn.toUpperCase());
  offerBinding(BM[it.id], paid); // equips it (replace screen if the loadout is full); paid() runs only if it was equipped
}
// Sets s.hint (drawn by shopview.drawShopHint) when the player stands next to something interactive.
export function updateShop(s) {
  s.hint = null;
  if (s.mode != "play") return;
  const n = s.npc;
  if (s.r.t == "kidnap" && n && D(s.x, s.y, n.x, n.y) < 26) s.hint = { a: "THE SHOPKEEPER IS BOUND", b: "[E] UNTIE THEM" };
  else if (s.r.t == "shop" && s.resc && s.r.stock) {
    const i = nearSlot();
    if (i < 0) return;
    const it = s.r.stock[i],
      d = it.k == "b" ? BM[it.id] : ITEMS[it.id];
    s.hint = {
      a: d.n.toUpperCase() + " - " + it.price + "c",
      desc: d.d,
      ex: it.k == "b" && d.shop,
      b: it.sold ? "SOLD OUT" : s.coins < it.price ? "NEED " + (it.price - s.coins) + " MORE COINS" : "[E] BUY",
    };
  }
}

// ---- coins
export function dropCoins(e) {
  const d = DROPS[e.t];
  if (!d || e.noDrop || Math.random() > d[0]) return;
  for (let i = d[1] + RI(d[2] - d[1] + 1); i > 0; i--) S.cn.push({ x: e.x + R(-8, 8), y: e.y + R(-8, 8), t: 0 });
}
export function updateCoins(s, dt) {
  for (const c of s.cn) {
    c.t += dt;
    const d = D(c.x, c.y, s.x, s.y);
    if (s.r.clr && c.t > 0.5 && d > 1) {
      const k = Math.min(1, (150 * dt) / d); // once the room is cleared, coins fly to you
      c.x += (s.x - c.x) * k;
      c.y += (s.y - c.y) * k;
    }
    if (d < 9 && c.t > 0.25) {
      c.got = 1;
      s.coins++;
      sfx(900, 0.06, "square", 0.04, 300);
    }
  }
  s.cn = s.cn.filter((c) => !c.got);
}
