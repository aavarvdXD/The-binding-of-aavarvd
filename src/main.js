// Entry point: layout + input listeners, load assets, show the title screen, start the loop.
// Add ?debug to the URL to inspect live state from the console as window.BOV.
import { initLayout, showTitle } from "./ui.js";
import { initInput } from "./input.js";
import { loadAssets } from "./assets.js";
import { startLoop, start } from "./game.js";
import { S } from "./state.js";
import { SV } from "./save.js";
initLayout();
initInput();
if (new URLSearchParams(location.search).has("debug"))
  window.BOV = {
    get S() {
      return S;
    },
    SV,
    start,
  };
loadAssets()
  .then(() => {
    showTitle();
    startLoop();
  })
  .catch((e) => {
    console.error(e);
    document.body.insertAdjacentHTML(
      "beforeend",
      '<pre style="color:#f88">' + e.message + "</pre>",
    );
  });
