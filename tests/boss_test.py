"""The Auditor (3 phases, awakening banner). Serve the project root first: python3 -m http.server 8000
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
        pg.evaluate("""(own)=>{const S=BOV.S;S.own=own;S.dis={};S.hp=6;S.mh=6;S.iv=99999;S.mode='play';S.eb=[];S.sh_=[];S.tel=[];S.ban=null;const r=S.rs.find(r=>r.t=='boss');r.clr=false;M.enter(r,null);S.x=120;S.y=150}""",own)
        pg.wait_for_timeout(1000)   # spawn-in
    H=E("M.AUDITOR_HP");boss_room()
    st=E("({hp:BOV.S.es[0].hp,mhp:BOV.S.es[0].mhp,t:BOV.S.es[0].t})")
    check(st['t']=='boss' and st['mhp']==H and H>=200,'Auditor has %d hp (was 70)'%H)
    # ---- phase 1 -> 2: the awakening
    x0=E("BOV.S.es[0].x");E("BOV.S.es[0].hp=%f"%(H*0.6));pg.wait_for_timeout(200)
    ban=E("(()=>{const b=BOV.S.ban;return b&&{txt:b.lines.join(' '),col:b.col,l:b.l}})()")
    check(ban and ban['txt']=='TRUE AUDITOR HAS AWAKENED' and ban['col']=='#ffd23f','yellow banner "%s" appears'%(ban and ban['txt']))
    pg.screenshot(path='/tmp/awaken.png')
    ph=E("({ph:BOV.S.es[0].ph,inv:BOV.S.es[0].inv,eb:BOV.S.eb.length})");check(ph['ph']==1 and ph['inv']>2,'Auditor enters phase 2 and stops/invulnerable for %.1fs'%ph['inv'])
    hp0=E("BOV.S.es[0].hp");dealt=E("M.damageEnemy(BOV.S.es[0],50)");check(dealt==0 and E("BOV.S.es[0].hp")==hp0,'no damage taken during the awakening')
    x1=E("BOV.S.es[0].x");pg.wait_for_timeout(1500);check(abs(E("BOV.S.es[0].x")-x1)<0.01 and E("BOV.S.eb.length")==0 and E("BOV.S.ban")!=None,'it stays still, fires nothing, banner still up after 1.7s')
    check(E("BOV.S.es.filter(e=>e.t=='skull').length")==0,'backup not called yet (arrives at the end of the intro)')
    pg.wait_for_timeout(1300)
    check(E("BOV.S.ban")==None and E("BOV.S.es[0].inv")<=0,'banner gone and fight resumes after ~2.8s')
    check(E("BOV.S.es.filter(e=>e.t=='skull').length")==2,'2 skulls called as the fight resumes')
    # ---- faster attacks than phase 1 (attacks per 5s)
    def rate(ph,wait=7000):
        boss_room();E("(ph=>{const e=BOV.S.es[0];e.ph=ph;e.hp=%f;e.inv=0;e.st=0;e.tm=0.5;BOV.S.aT=999})(%d)"%(H*(0.9 if ph==0 else 0.5 if ph==1 else 0.2),ph));pg.wait_for_timeout(wait);return E("BOV.S.es[0].st")
    r0,r1,r2=rate(0),rate(1),rate(2)
    check(r1>=r0*1.3 and r2>r1,'attacks get faster: %d (phase 1) -> %d (phase 2) -> %d (phase 3) per 7s'%(r0,r1,r2))
    # ---- new attack types in phase 2
    boss_room();E("(()=>{const e=BOV.S.es[0];e.ph=1;e.hp=150;e.inv=0;e.st=2;e.tm=0.01;BOV.S.aT=999})()");pg.wait_for_timeout(200)  # st 3 -> stamps
    check(E("BOV.S.tel.length")==4,'phase 2 stamps: 4 telegraphed floor markers (%d)'%E("BOV.S.tel.length"))
    pg.wait_for_timeout(300);E("BOV.S.eb=[];BOV.S.es[0].tm=99");pg.wait_for_timeout(900)
    check(E("BOV.S.tel.length")==0 and E("BOV.S.eb.length")>=12,'stamps burst into rings after the warning (%d bullets)'%E("BOV.S.eb.length"))
    boss_room();E("(()=>{const e=BOV.S.es[0];e.ph=1;e.hp=150;e.inv=0;e.st=3;e.tm=0.01;BOV.S.aT=999})()");pg.wait_for_timeout(150)  # st 4 -> curtain
    ys=E("BOV.S.eb.filter(b=>b.y<40&&Math.abs(b.vx)<1e-6&&b.vy>0).length");check(7<=ys<=9,'curtain: %d falling bullets with a 3-column gap'%ys)
    seen=0
    for _ in range(16):
        pg.wait_for_timeout(80);seen=max(seen,E("BOV.S.eb.filter(b=>b.y<45&&Math.abs(b.vx)<1e-6&&b.vy>0).length"))
    check(seen>=7,'second curtain follows ~0.9s later (%d bullets seen at the top)'%seen)
    boss_room();E("(()=>{const e=BOV.S.es[0];e.ph=1;e.hp=150;e.inv=0;e.st=1;e.tm=0.01;BOV.S.aT=999})()");pg.wait_for_timeout(1500)
    check(E("BOV.S.eb.length")>=8,'spiral stream fires (%d shots)'%E("BOV.S.eb.length"))
    boss_room();E("(()=>{const e=BOV.S.es[0];e.ph=1;e.hp=150;e.inv=0;e.st=0;e.tm=0.01;BOV.S.aT=999})()");pg.wait_for_timeout(150)  # st1 k=1 triple tap
    n1=E("BOV.S.eb.length");pg.wait_for_timeout(500);check(E("BOV.S.eb.length")>n1,'triple-tap fan keeps firing (%d -> %d)'%(n1,E("BOV.S.eb.length")))
    # ---- phase 2 -> 3
    boss_room();E("(()=>{const e=BOV.S.es[0];e.ph=1;e.hp=%f;e.inv=0})()"%(H*0.3));pg.wait_for_timeout(200)
    ban=E("(()=>{const b=BOV.S.ban;return b&&{txt:b.lines.join(' '),col:b.col}})()");check(E("BOV.S.es[0].ph")==2 and ban and ban['txt']=='FINAL JUDGMENT','phase 3 has its own red banner: %s'%ban)
    pg.wait_for_timeout(2600);check(E("BOV.S.ban")==None and E("BOV.S.es.filter(e=>e.t=='octo').length")==2,'phase 3: banner ends, 2 spitters called')
    boss_room();E("BOV.S.es[0].hp=5");pg.wait_for_timeout(200);check(E("BOV.S.es[0].ph")==1 and E("BOV.S.es[0].hp")>=H*(1/3),'huge damage cannot skip phase 2 (hp %.0f)'%E("BOV.S.es[0].hp"))
    # ---- Audit
    boss_room(['aegis','leech','hot','echo']);E("(()=>{const e=BOV.S.es[0];e.hp=60;e.ph=2;e.inv=0;BOV.S.aT=0.01})()");pg.wait_for_timeout(300)
    check(len(E("Object.keys(BOV.S.dis)"))==2,'phase 3 Audit disables 2 Bindings at once')
    boss_room(['aegis','leech','hot','echo']);E("BOV.S.es[0].ph=0;BOV.S.aT=0.01");pg.wait_for_timeout(300);check(len(E("Object.keys(BOV.S.dis)"))==1,'phase 1 Audit still disables only 1')
    # ---- death
    boss_room();v0=E("BOV.SV.w");E("(()=>{const S=BOV.S;const e=S.es[0];e.ph=2;e.inv=0;e.hp=1;S.es.push(M.mk('skull',60,60),M.mk('octo',180,60));S.tel.push({x:60,y:60,t:0,l:5,n:8,v:70,src:e})})()");pg.wait_for_timeout(100)
    E("M.damageEnemy(BOV.S.es[0],5)");pg.wait_for_timeout(900)
    check(E("BOV.S.es.length")==0 and E("BOV.S.tel.length")==0 and E("BOV.S.won")==1 and E("BOV.SV.w")==v0+1,'killing the Auditor takes its backup and markers with it; 1 victory counted')
    # ---- soak
    boss_room(['aegis','leech','hot','echo']);pg.mouse.move(700,320);pg.mouse.down();pg.keyboard.down('d')
    for ph in range(3):
        E("(([ph,H])=>{const e=BOV.S.es.find(e=>e.t=='boss');if(e){e.hp=Math.min(e.hp,H*(1-ph/3)-1)}})([%d,%d])"%(ph,H));pg.wait_for_timeout(5200)
        if ph==2:pg.screenshot(path='/tmp/boss_p3.png')
    pg.keyboard.up('d');pg.mouse.up();b.close()
check(not errs,'no page errors: %s'%errs[:3])
print('\n%d/%d passed'%(sum(res),len(res)));sys.exit(0 if all(res) else 1)
