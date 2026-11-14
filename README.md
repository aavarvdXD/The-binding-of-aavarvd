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

## Shop system (v104)
- Each floor has one **shop** room and one **kidnap** room (never the spawn/boss room). The shop is abandoned until the shopkeeper is rescued: press **E** next to him in the kidnap room (+20 coins; skeletons may stay neutral), or discover every room except the shop and boss rooms (no coins).
- Enemies drop coins; in the open shop stand at a pedestal and press **E** to buy (3 Bindings - shop-exclusive Rebound/Bugs/Void/Ascension can appear - plus 2 items). With a full loadout a replace screen opens (Esc/SKIP cancels, nothing charged).
- Code: `src/shops.js` (rules), `src/items.js` (non-Binding items), `src/shopview.js` (drawing). Tests: `python3 tests/shop_test.py http://localhost:8000`.
- Debug (with `?debug`): `BOV.coins(50)`, `BOV.rescue()`, `BOV.revealAll()`, `BOV.goto("shop"|"kidnap"|"boss")`.

## Credits
- Ninja Adventure asset pack (Pixel-boy & AAA) - CC0.
- Skeleton sprites: FREE Skeleton Asset Pack by Micaelle Britto (credit appreciated; free for personal and commercial use). `tools/build_skeleton_sheet.py` rebuilds `assets/sprites/enemy_skeleton.png` from it.
- 2D Pixel Dungeon asset pack (coin, potions, pedestal). Bound shopkeeper sprite: `assets/sprites/npc_old_man_bound.png` (made for this project).

