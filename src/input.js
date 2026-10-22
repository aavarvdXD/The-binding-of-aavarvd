// Keyboard and mouse. K = pressed keys (lowercase names), mx/my = mouse in room coordinates, md = mouse button held.
import { S } from "./state.js";
import { OY } from "./util.js";
import { cv } from "./renderer.js";
import { pick } from "./ui.js";
import { start } from "./game.js";
export const K = {};
export let mx = 120,
  my = 88,
  md = 0;
export function initInput() {
  addEventListener("keydown", (e) => {
    K[e.key.toLowerCase()] = 1;
    if (e.key.startsWith("Arrow") || e.key == " ") e.preventDefault();
    if (S && S.mode == "pick" && "123".includes(e.key)) pick(+e.key - 1);
    if (e.key == "r" && S && (S.mode == "dead" || S.mode == "win")) start();
  });
  addEventListener("keyup", (e) => (K[e.key.toLowerCase()] = 0));
  cv.addEventListener("mousemove", (e) => {
    const r = cv.getBoundingClientRect();
    mx = ((e.clientX - r.left) * 240) / r.width;
    my = ((e.clientY - r.top) * 200) / r.height - OY;
    if (S) S.ak = 0;
  });
  cv.addEventListener("mousedown", (e) => {
    md = 1;
    mousemove(e);
  });
  addEventListener("mouseup", () => (md = 0));
  cv.addEventListener("contextmenu", (e) => e.preventDefault());
  const mousemove = (e) => cv.dispatchEvent(new MouseEvent("mousemove", e));
}
