// Entry point: layout + input listeners, load assets, show the title screen, start the loop.
// Add ?debug to the URL to inspect live state from the console as window.BOV.
import { initLayout, showTitle } from "./ui.js";
import { initInput } from "./input.js";
import { loadAssets } from "./assets.js";
import { startLoop, start } from "./game.js";
import { S } from "./state.js";
import { SV } from "./save.js";
import { BM, BD } from "./bindings.js";
import { enter } from "./rooms.js";
import { rescue } from "./shops.js";

initLayout();
initInput();
if (new URLSearchParams(location.search).has("debug"))
  window.BOV = {
    get S() {
      return S;
    },
    SV,
    start,
    // Developer Mode tools
    toggleGod: () => {
      S.god = !S.god;
      console.log("God mode: " + (S.god ? "ON" : "OFF"));
    },
    addBinding: (id) => {
      if (!BM[id]) return console.error("Unknown binding: " + id + ". Available: " + Object.keys(BM).join(", "));
      if (!S.own.includes(id)) {
        S.own.push(id);
        if (id == "def") S.hp += 8;
      }
      console.log("Added binding: " + BM[id].n);
    },
    removeBinding: (id) => {
      if (S.own.includes(id)) {
        S.own = S.own.filter((x) => x !== id);
        if (id == "def") S.hp = Math.max(1, S.hp - 8);
        console.log("Removed binding: " + id);
      }
    },
    // Shop tools: BOV.coins(50), BOV.rescue(), BOV.revealAll() (then walk into any room = automatic rescue), BOV.goto("shop"|"kidnap"|"boss")
    coins: (n = 50) => {
      S.coins += n;
    },
    rescue: () => rescue(true),
    revealAll: () => S.rs.forEach((r) => (r.vis = true)),
    goto: (t) => {
      const r = S.rs.find((x) => x.t == t);
      if (r) enter(r, null);
      else console.error("No room of type " + t);
    },
    heal: () => {
      S.hp = S.mh;
      console.log("Healed to max.");
    },
    killAll: () => {
      S.es.forEach((e) => (e.hp = 0));
      console.log("Enemies cleared.");
    },
    listBindings: () => {
      console.table(
        BD.map((b) => ({ id: b.id, name: b.n, description: b.d })),
      );
    },
  };
loadAssets()
  .then(() => {
    // Small delay to let the progress bar reach 100% visibly before the game pops in
    setTimeout(() => {
      document.getElementById("boot")?.remove();
      showTitle();
      startLoop();
    }, 100);
  })
  .catch((e) => {
    console.error(e);
    if (window.__bootFail) window.__bootFail(e.message);
  });
