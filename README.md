# The Binding of Aavarvd

Browser roguelike (HTML5 canvas, plain ES modules, no build step, no backend).

## Run locally
ES modules need HTTP (not `file://`):

    python3 -m http.server 8000      # then open http://localhost:8000

Add `?debug` to the URL to get `window.BOV` (`BOV.S` = live run state, `BOV.SV` = save data, `BOV.start()`).

## Test
    pip install playwright && playwright install chromium
    python3 -m http.server 8000 &
    python3 tests/smoke.py http://localhost:8000     # menus, door/room flow, Binding picks, stairs, death, saves
    python3 tests/bindings_test.py http://localhost:8000   # all 20 Bindings: names, icons, effects, drawbacks

## Troubleshooting: "I don't see the latest changes"
- On `localhost` / `127.0.0.1`, `index.html` loads every module and the CSS with a fresh `?v=<time>`, so a plain `python3 -m http.server` never serves stale files (browsers cache ES modules aggressively). On the real site, normal caching applies - allow a few minutes after deploying, or hard-refresh (Ctrl+Shift+R).
- The title screen shows `build <BUILD>` (constant in `src/util.js`). If it is missing or old, the browser is not loading this folder: check the terminal running the server is inside the project folder, and open `http://localhost:8000/src/bindings.js` - it should contain `Binding of Chronos`.
    python3 tests/boss_test.py http://localhost:8000       # the 3-phase Auditor
- If the page shows "The game could not start", the message says why (wrong folder, JavaScript served with a wrong MIME type, a missing file/asset). Start the server **inside the folder that contains `index.html`**.
