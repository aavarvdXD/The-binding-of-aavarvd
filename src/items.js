// Shop merchandise that is not a Binding. kind "use" = applied at once, "passive" = kept for the rest of the run (S.items).
// price = base price (each shop adds -1..+1), w = how often it appears in stock,
// ic = icon [asset key, sx, sy, sw, sh, scale] drawn by shopview.js.
import { S } from "./state.js";
import { heal } from "./player.js";
import { calcMaxHealth } from "./bindings.js";
import { sfx } from "./audio.js";
import { toast } from "./ui.js";
export const ITEMS = {
  heart: { n: "Heart", d: "Restores 2 health.", price: 5, w: 5, kind: "use", ic: ["heart", 0, 0, 9, 8, 1.6] },
  elixir: { n: "Elixir", d: "Restores all health.", price: 16, w: 2, kind: "use", ic: ["dz", 144, 128, 16, 16, 1] },
  vessel: { n: "Heart Container", d: "+2 max health and heals 2.", price: 22, w: 2, kind: "passive", ic: ["heart", 0, 0, 9, 8, 2.2] },
  might: { n: "Might Tonic", d: "+12% damage for the run.", price: 18, w: 2, kind: "passive", ic: ["dz", 112, 144, 16, 16, 1] },
  swift: { n: "Swift Tonic", d: "+10% move speed for the run.", price: 16, w: 2, kind: "passive", ic: ["dz", 112, 128, 16, 16, 1] },
};
// How many copies of a passive item the player holds.
export const itemCount = (id) => S.items.filter((i) => i === id).length;
function refuse(msg) {
  toast(msg);
  sfx(110, 0.15, "square", 0.05);
  return false;
}
// Apply a bought item. Returns false (nothing is charged) when it would be wasted.
export function buyItem(id) {
  if (id === "heart") {
    if (!heal(2)) return refuse("CAN'T HEAL ANY MORE");
    toast("+2 HEALTH");
  } else if (id === "elixir") {
    if (!heal(S.mh)) return refuse("CAN'T HEAL ANY MORE");
    toast("FULL HEALTH");
  } else {
    S.items.push(id);
    if (id === "vessel") {
      calcMaxHealth(S);
      heal(2);
    }
    toast(ITEMS[id].n.toUpperCase());
  }
  return true;
}
