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
