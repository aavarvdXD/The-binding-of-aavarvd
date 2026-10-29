"""The Auditor (3 phases). Serve the project root first: python3 -m http.server 8000
Run: python3 tests/boss_test.py http://localhost:8000"""
import sys
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8000'
res=[];errs=[]
def check(c,m):res.append(c);print(('PASS ' if c else 'FAIL ')+m)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':960,'height':800})
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(BASE+'/index.html?debug');pg.wait_for_timeout(900);pg.click('text=ENTER THE UNWRITTEN');pg.wait_for_timeout(300)
    pg.evaluate("""async()=>{window.M={};for(const x of ['bindings','enemies','projectiles','player','rooms','ui','state','bosses'])Object.assign(M,await import('/src/'+x+'.js'))}""")
    E=lambda js:pg.evaluate(js)
    def boss_room(own=['aegis','leech','hot','echo']):
        pg.evaluate("""(own)=>{const S=BOV.S;S.own=own;S.dis={};S.hp=6;S.mh=6;S.iv=99999;S.mode='play';S.eb=[];S.sh_=[];const r=S.rs.find(r=>r.t=='boss');r.clr=false;M.enter(r,null);S.x=120;S.y=150}""",own)
        pg.wait_for_timeout(1000)   # spawn-in
    H=E("M.AUDITOR_HP")
    boss_room()
    st=E("({hp:BOV.S.es[0].hp,mhp:BOV.S.es[0].mhp,t:BOV.S.es[0].t})")
    check(st['t']=='boss' and st['mhp']==H and st['hp']==H and H>=200,'Auditor has %d hp (was 70): %s'%(H,st))
    # ---- phase 1 -> 2
    E("BOV.S.es[0].hp=%f"%(H*0.6));pg.wait_for_timeout(150)
    ph=E("({ph:BOV.S.es[0].ph,inv:BOV.S.es[0].inv>0,adds:BOV.S.es.filter(e=>e.t=='skull').length,toast:BOV.S.msg.map(m=>m.t)})")
    check(ph['ph']==1 and ph['inv'] and ph['adds']==2 and any('CROSS' in t for t in ph['toast']),'phase 2 starts at <=2/3 hp: invulnerable, 2 skulls called, announced %s'%ph['toast'])
    hp0=E("BOV.S.es[0].hp");dealt=E("M.damageEnemy(BOV.S.es[0],50)");check(dealt==0 and E("BOV.S.es[0].hp")==hp0,'boss takes no damage while changing phase')
    pg.wait_for_timeout(2000);check(E("BOV.S.es[0].inv")<=0,'invulnerability ends after ~1.6s')
    E("BOV.S.eb=[]");pg.wait_for_timeout(3000);n=E("BOV.S.eb.length");check(n>0,'phase 2 attacks (%d enemy shots in 3s)'%n)
    # ---- overshoot: huge damage cannot skip phase 3
    E("BOV.S.es[0].hp=5");pg.wait_for_timeout(150)
    ph=E("({ph:BOV.S.es[0].ph,hp:BOV.S.es[0].hp})");check(ph['ph']==2 and ph['hp']>=1,'big damage still goes phase 2 -> 3 (hp %.0f)'%ph['hp'])
    pg.wait_for_timeout(2000)
    # ---- phase 3 audit disables two Bindings
    boss_room(['aegis','leech','hot','echo']);E("BOV.S.es[0].hp=60;BOV.S.es[0].ph=2;BOV.S.es[0].inv=0;BOV.S.aT=0.01");pg.wait_for_timeout(300)
    d=E("Object.keys(BOV.S.dis)");check(len(d)==2,'phase 3 Audit disables 2 Bindings at once: %s'%d)
    boss_room(['aegis','leech','hot','echo']);E("BOV.S.es[0].ph=0;BOV.S.aT=0.01");pg.wait_for_timeout(300)
    check(len(E("Object.keys(BOV.S.dis)"))==1,'phase 1 Audit still disables only 1')
    # ---- attack patterns
    boss_room();E("(()=>{const e=BOV.S.es[0];e.ph=2;e.hp=80;e.st=2;e.tm=0.01})()");pg.wait_for_timeout(200)  # st becomes 3 -> curtain
    ys=E("BOV.S.eb.filter(b=>b.y<40&&Math.abs(b.vx)<1e-6&&b.vy>0).map(b=>Math.round(b.x))");check(7<=len(ys)<=9,'phase 3 ledger curtain: %d falling bullets with a 3-column gap'%len(ys))
    boss_room();E("(()=>{const e=BOV.S.es[0];e.ph=1;e.hp=150;e.st=1;e.tm=0.01})()");pg.wait_for_timeout(1500)  # st 2 -> k=2 spiral
    check(E("BOV.S.eb.length")>=8,'phase 2 spiral stream fires (%d shots)'%E("BOV.S.eb.length"))
    # ---- death: backup dies, room clears, victory counted once
    boss_room();v0=E("BOV.SV.w");E("(()=>{const S=BOV.S;const e=S.es[0];e.ph=2;e.hp=1;S.es.push(M.mk('skull',60,60),M.mk('octo',180,60))})()");pg.wait_for_timeout(100)
    E("M.damageEnemy(BOV.S.es[0],5)");pg.wait_for_timeout(900)
    check(E("BOV.S.es.length")==0 and E("BOV.S.won")==1 and E("BOV.SV.w")==v0+1,'killing the Auditor takes its backup with it, clears the room, counts 1 victory')
    # ---- soak: all 3 phases for real, player invulnerable
    boss_room(['aegis','leech','hot','echo']);pg.mouse.move(700,320);pg.mouse.down();pg.keyboard.down('d')
    shots=[]
    for ph in range(3):
        E("(([ph,H])=>{const e=BOV.S.es.find(e=>e.t=='boss');if(e){e.hp=Math.min(e.hp,H*(1-ph/3)-1);e.ph=Math.max(e.ph||0,ph)}})([%d,%d])"%(ph,H));pg.wait_for_timeout(4200)
        shots.append(E("BOV.S.eb.length"))
        if ph==2:pg.screenshot(path='/tmp/boss_p3.png')
    pg.keyboard.up('d');pg.mouse.up()
    print('enemy shots on screen per phase:',shots)
    b.close()
check(not errs,'no page errors: %s'%errs[:3])
print('\n%d/%d passed'%(sum(res),len(res)));sys.exit(0 if all(res) else 1)
