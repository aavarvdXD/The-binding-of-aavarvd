"""UI + flow smoke test. Needs: pip install playwright && playwright install chromium
Run from the project root while `python3 -m http.server 8000` is serving it:  python3 tests/smoke.py"""
import sys
from playwright.sync_api import sync_playwright
URL=(sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8000')+'/index.html?debug'
errs=[]
def check(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c:errs.append(m)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':960,'height':800})
    pg.on('pageerror',lambda e:errs.append('pageerror: '+str(e)))
    pg.on('requestfailed',lambda r:'fonts.googleapis' not in r.url and errs.append('request failed: '+r.url))
    pg.on('response',lambda r:r.status>=400 and errs.append('HTTP %d %s'%(r.status,r.url)))
    pg.goto(URL);pg.wait_for_timeout(1000)
    check(pg.evaluate("getComputedStyle(document.getElementById('ov')).display")=='flex','title screen shown')
    pg.click('text=ENTER THE UNWRITTEN');pg.wait_for_timeout(300)
    check(pg.evaluate("BOV.S.mode")=='play' and pg.evaluate("BOV.S.rs.length")==8,'run starts with 8 rooms')
    # clear a fight room -> pick screen -> click a card
    pg.evaluate("(()=>{const S=BOV.S;const i=S.r.nb.findIndex(n=>n);S.r.open=true;S.x=120;S.y=88;if(i==0)S.y=4;else if(i==1)S.y=172;else if(i==2)S.x=4;else S.x=236})()")
    pg.wait_for_timeout(300);check(pg.evaluate("BOV.S.r.t")=='fight','door transition into a fight room')
    pg.evaluate("BOV.S.es.forEach(e=>e.hp=0)");pg.wait_for_timeout(1200)
    check(pg.evaluate("BOV.S.mode")=='pick','Binding choice opens after clearing')
    pg.click('.card >> nth=0');pg.wait_for_timeout(200)
    check(pg.evaluate("BOV.S.own.length")==1 and pg.evaluate("BOV.S.mode")=='play','clicking a card grants a Binding')
    # keyboard pick path
    pg.evaluate("(()=>{const S=BOV.S;S.r.clr=0;S.r.open=false})()")
    pg.evaluate("BOV.S.es.forEach(e=>e.hp=0)");pg.wait_for_timeout(1200)
    pg.keyboard.press('1');pg.wait_for_timeout(200)
    check(pg.evaluate("BOV.S.own.length")==2,'key 1 picks a Binding')
    # boss win -> stairs
    pg.evaluate("(()=>{const S=BOV.S;S.won=1;S.r=S.rs[0];S.x=120;S.y=56})()");pg.wait_for_timeout(300)
    check(pg.evaluate("BOV.S.mode")=='stairs' and 'STAIRS' in pg.inner_text('#ov'),'stairs screen opens')
    pg.click('text=KEEP EXPLORING');pg.wait_for_timeout(200)
    check(pg.evaluate("BOV.S.mode")=='play','KEEP EXPLORING resumes')
    pg.evaluate("BOV.S.hp=1;BOV.S.iv=0;BOV.S.es.push({t:'skull',x:BOV.S.x,y:BOV.S.y,hp:3,r:6,sp:0,fl:0,tm:1,dir:0,aw:0,st:0,ect:0,vx:0,vy:0,al:1})");pg.wait_for_timeout(2500)
    check(pg.evaluate("BOV.S.mode")=='dead' and 'UNWRITTEN' in pg.inner_text('#ov'),'death screen')
    pg.keyboard.press('r');pg.wait_for_timeout(300)
    check(pg.evaluate("BOV.S.mode")=='play' and pg.evaluate("BOV.S.own.length")==0,'R restarts a fresh run')
    saved=pg.evaluate("JSON.parse(localStorage.getItem('bov1'))");check('d' in saved and 'c' in saved and 'w' in saved,'save data written to key bov1: '+str(saved))
    b.close()
print('\n'+('ALL PASSED' if not errs else 'PROBLEMS:\n'+'\n'.join(errs)));sys.exit(1 if errs else 0)
