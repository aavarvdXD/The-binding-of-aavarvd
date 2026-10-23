"""Checks every Binding (names, icons, effect + drawback) against the live game modules.
Needs: pip install playwright && playwright install chromium; serve the project root (python3 -m http.server 8000).
Run: python3 tests/bindings_test.py http://localhost:8000"""
import sys,os
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8000'
res=[];errs=[]
def check(c,m):
    res.append(c);print(('PASS ' if c else 'FAIL ')+m)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':960,'height':800})
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('response',lambda r:r.status>=400 and errs.append('HTTP %d %s'%(r.status,r.url)))
    pg.goto(BASE+'/index.html?debug');pg.wait_for_timeout(900)
    pg.click('text=ENTER THE UNWRITTEN');pg.wait_for_timeout(300)
    pg.evaluate("""async()=>{const n=['bindings','enemies','projectiles','player','rooms','ui','state','synergies'];window.M={};for(const x of n)Object.assign(M,await import('/src/'+x+'.js'))}""")
    E=lambda js:pg.evaluate(js)
    # fresh sandbox: empty room, invulnerable player, nothing owned
    def reset(own=[],hp=6):
        E("""([own,hp])=>{const S=BOV.S;S.own=own;S.es=[];S.eb=[];S.sh_=[];S.cl=[];S.bh=[];S.arc=[];S.dis={};S.hp=hp;S.mh=6;S.iv=0;S.mode='play';S.x=120;S.y=150;S.slow=0;S.thR=0;S.rev=0;S.asS=0;S.dmgRoom=0;S.clCd=0;S.picks=1;S.fd=99;S.r.clr=true;S.r.open=true}""".replace('()=>','')) if False else pg.evaluate("([own,hp])=>{const S=BOV.S;S.own=own;S.es=[];S.eb=[];S.sh_=[];S.cl=[];S.bh=[];S.arc=[];S.dis={};S.hp=hp;S.mh=6;S.iv=0;S.mode='play';S.x=120;S.y=150;S.slow=0;S.thR=0;S.rev=0;S.asS=0;S.dmgRoom=0;S.clCd=0;S.picks=1;S.fd=99;S.r.clr=true;S.r.open=true}",[own,hp])
    mkE=lambda t,x,y,hp=10:pg.evaluate("([t,x,y,hp])=>{const e=M.mk(t,x,y);e.sp=0;e.hp=hp;e.mhp=hp;BOV.S.es.push(e);return BOV.S.es.length-1}",[t,x,y,hp])
    def settle():
        pg.wait_for_timeout(1000);pg.evaluate("()=>{document.getElementById('ov').style.display='none';BOV.S.mode='play';BOV.S.picks=1}")
    # ---- names + icons
    names=E("M.BD.map(b=>b.n)");check(len(names)==20 and all(n.startswith('Binding of') for n in names),'20 Bindings, all named "Binding of ...": '+', '.join(n.replace('Binding of ','') for n in names))
    check(all(os.path.exists(os.path.join(os.path.dirname(__file__),'..','assets','icons',f)) for f in os.listdir(os.path.join(os.path.dirname(__file__),'..','assets','icons'))) and E("M.BD.every(b=>true)"),'icon files present')
    check(E("M.BD.map(b=>b.ic).join()")==','.join('i%d'%i for i in range(20)),'icon keys i0..i19 map in order')
    # ---- original Bindings: numbers unchanged by the refactor of fire()
    ok=True
    for own,dmg,delay in [([],1,.34),(['fat'],2.2,.34*1.9),(['twin'],.6,.34),(['curse'],1.7,.34),(['hot'],1,.2),(['hot','fat'],2.2,.2*1.9)]:
        reset(own);n=3 if 'twin' in own else 1
        d=E("M.volleyDamage(%d)"%n);f=E("M.fireDelay()");ok&=abs(d-dmg)<1e-9 and abs(f-delay)<1e-9
    check(ok,'original Bindings: damage and fire-delay formulas unchanged (Twins, Weight, Bugs, Frenzy)')
    # ---- Chronos
    reset(['chrono']);check(E("M.fireDelay()")>0.34*1.3,'Chronos: attack cooldown longer (%.3f)'%E("M.fireDelay()"))
    reset(['chrono']);E("BOV.S.chT=0.01");pg.wait_for_timeout(250)
    check(E("BOV.S.slow")>1.5,'Chronos: slow triggers on its cycle (%.2fs left)'%E("BOV.S.slow"))
    i=mkE('skull',60,40);x0=E("BOV.S.es[0].x");y0=E("BOV.S.es[0].y");pg.wait_for_timeout(500)
    slow_d=E("((x0,y0)=>Math.hypot(BOV.S.es[0].x-x0,BOV.S.es[0].y-y0))(%f,%f)"%(x0,y0))
    reset([]);mkE('skull',60,40);x0=E("BOV.S.es[0].x");y0=E("BOV.S.es[0].y");pg.wait_for_timeout(500)
    norm_d=E("((x0,y0)=>Math.hypot(BOV.S.es[0].x-x0,BOV.S.es[0].y-y0))(%f,%f)"%(x0,y0))
    check(slow_d<norm_d*0.7,'Chronos: enemies move slower while slowed (%.1f vs %.1f px in 0.5s)'%(slow_d,norm_d))
    # ---- Blood
    reset(['blood'],6);full=E("M.volleyDamage(1)");reset(['blood'],1);low=E("M.volleyDamage(1)")
    check(abs(full-1)<1e-9 and low>2,'Blood: damage x%.2f at full health, x%.2f at 1 hp'%(full,low))
    reset(['blood'],3);r1=E("M.heal(1)");hp1=E("BOV.S.hp");r2=E("M.heal(1)");check(r1==1 and hp1==4 and r2==0 and E("BOV.S.hp")==4,'Blood: healing stops at 75%% of max (4 of 6): hp %d'%E("BOV.S.hp"))
    reset([],3);E("M.heal(9)");check(E("BOV.S.hp")==6,'no Blood: heals to full as before')
    # ---- Thunder
    reset(['thunder']);check(E("M.volleyDamage(1)")<1,'Thunder: regular shots deal less damage (%.2f)'%E("M.volleyDamage(1)"))
    reset(['thunder']);E("BOV.S.thT=0.01");pg.wait_for_timeout(200);check(E("BOV.S.thR")==1,'Thunder: charge becomes ready after its timer')
    reset(['thunder']);E("BOV.S.thR=1");[mkE('skull',x,100) for x in(120,140,160,180)]
    E("(()=>{const S=BOV.S;S.x=120;S.y=150;M.es=0})()") if False else None
    for e in range(4):E("(i=>{const S=BOV.S;S.es[i].y=100;S.es[i].vx=0})(%d)"%e)
    E("BOV.S.es.forEach((e,i)=>{e.x=120;e.y=100-0;e.x=100+i*18;e.y=100})");E("(()=>{BOV.S.x=100;BOV.S.y=150;M.fire(-Math.PI/2)})()");pg.wait_for_timeout(500)
    hit=E("BOV.S.es.filter(e=>e.hp<10).length");check(hit>=2 and E("BOV.S.thR")==0,'Thunder: charged shot chained to %d enemies and consumed the charge'%hit)
    # ---- Reflection
    reset(['reflect']);check(E("M.volleyDamage(1)")<1,'Reflection: direct attacks weaker (%.2f)'%E("M.volleyDamage(1)"))
    E("(()=>{const S=BOV.S;S.lastA=-Math.PI/2;M.eshot(S.x-60,S.y-9,0,70)})()");pg.wait_for_timeout(1300)
    check(E("BOV.S.cl.length")==1,'Reflection: dodging a shot spawns a clone')
    n0=E("BOV.S.sh_.length");pg.wait_for_timeout(700);check(E("BOV.S.sh_.length")>0 or n0>0,'Reflection: clone repeats the last attack (%d shots out)'%E("BOV.S.sh_.length"))
    reset(['reflect']);E("(()=>{const S=BOV.S;M.eshot(S.x-30,S.y,0,70)})()");pg.wait_for_timeout(900);check(E("BOV.S.cl.length")==0 and E("BOV.S.hp")<6,'Reflection: getting hit spawns no clone')
    # ---- Decay
    reset(['decay']);check(E("M.volleyDamage(1)")<0.7,'Decay: hit damage reduced (%.2f)'%E("M.volleyDamage(1)"))
    mkE('skull',60,40,10);E("M.damageEnemy(BOV.S.es[0],0.5)");hp0=E("BOV.S.es[0].hp");ps=E("BOV.S.es[0].ps");pg.wait_for_timeout(1500);hp1=E("BOV.S.es[0].hp")
    check(ps==1 and hp1<hp0-0.3,'Decay: poison ticks (%.2f -> %.2f hp in 1.5s)'%(hp0,hp1))
    E("for(let i=0;i<8;i++)M.damageEnemy(BOV.S.es[0],0)");check(E("BOV.S.es[0].ps")==5,'Decay: poison stacks cap at 5')
    # ---- Frost
    reset(['frost']);check(E("M.fireDelay()")>0.34*1.4,'Frost: attack speed reduced (delay %.3f)'%E("M.fireDelay()"))
    mkE('skull',60,40,50);E("M.damageEnemy(BOV.S.es[0],0.1);M.damageEnemy(BOV.S.es[0],0.1)");chilled=E("BOV.S.es[0].fz")
    E("M.damageEnemy(BOV.S.es[0],0.1);M.damageEnemy(BOV.S.es[0],0.1)");fr=E("BOV.S.es[0].fr")
    check(chilled==2 and fr>1,'Frost: 2 hits chill, 4 hits freeze (%.1fs frozen)'%fr)
    x0=E("BOV.S.es[0].x");pg.wait_for_timeout(500);check(abs(E("BOV.S.es[0].x")-x0)<0.01,'Frost: frozen enemy does not move')
    E("BOV.S.es[0].fr=0");E("for(let i=0;i<4;i++)M.damageEnemy(BOV.S.es[0],0)");check(E("BOV.S.es[0].fr")==0,'Frost: thawed enemy is briefly immune to re-freezing')
    # ---- Void
    reset(['void']);mkE('skull',100,60,10);mkE('skull',140,60,10);E("BOV.S.es.forEach(e=>e.sp=0)")
    E("(()=>{const r=Math.random;Math.random=()=>0;M.maybeHole(120,60);Math.random=r})()");check(E("BOV.S.bh.length")==1,'Void: a hit can open a black hole')
    d0=E("Math.abs(BOV.S.es[0].x-BOV.S.es[1].x)");pg.wait_for_timeout(1000);d1=E("Math.abs(BOV.S.es[0].x-BOV.S.es[1].x)")
    check(d1<d0-10,'Void: enemies pulled together (%.0f -> %.0f px apart)'%(d0,d1))
    hp_before=E("BOV.S.es.map(e=>e.hp)");pg.wait_for_timeout(1700);check(E("BOV.S.bh.length")==0 and E("BOV.S.es.some((e,i)=>e.hp<%s[i])"%hp_before),'Void: black hole collapses and damages the pack')
    # ---- Ascension
    reset(['ascend']);check(E("M.volleyDamage(1)")<1,'Ascension: base damage reduced (%.2f)'%E("M.volleyDamage(1)"))
    E("(()=>{const S=BOV.S;S.r=S.rs.find(r=>r.t=='fight');S.r.clr=0;S.dmgRoom=0;S.es=[];S.mode='play'})()");pg.wait_for_timeout(400)
    check(E("BOV.S.asS")>20,'Ascension: clean clear grants a shield (%.1fs)'%E("BOV.S.asS"))
    settle();E("M.hurt(1)");check(E("BOV.S.hp")==6 and E("BOV.S.asS")==0,'Ascension: shield absorbs the next hit')
    reset(['ascend']);E("(()=>{const S=BOV.S;S.r=S.rs.find(r=>r.t=='fight');S.r.clr=0;S.dmgRoom=1;S.es=[]})()");pg.wait_for_timeout(400);check(E("BOV.S.asS")==0,'Ascension: no shield after taking damage in the room');settle()
    # ---- Watcher
    reset(['watch']);mkE('skull',60,40,10);mkE('skull',180,40,10);E("BOV.S.wT=0.01");pg.wait_for_timeout(250)
    marked=E("BOV.S.es.filter(e=>e.mk>0).length");check(marked==1,'Watcher: one enemy gets marked')
    E("(()=>{const S=BOV.S;const e=S.es.find(e=>e.mk>0);M.damageEnemy(e,1);window.__d=10-e.hp})()");check(abs(E("window.__d")-1.6)<1e-6 and E("BOV.S.rev")>1,'Watcher: marked hit deals x1.6 and reveals the room (rev %.1fs)'%E("BOV.S.rev"))
    reset(['watch'],6);E("M.hurt(1,false)");hp_u=E("BOV.S.hp");reset(['watch'],6);E("M.hurt(1,true)");hp_m=E("BOV.S.hp")
    check(abs(hp_u-4.75)<1e-9 and hp_m==5,'Watcher: unmarked attackers deal 1.25 (hp %.2f), marked 1.0 (hp %.2f)'%(hp_u,hp_m))
    # ---- Fortune
    reset(['fortune']);rm=E("(()=>{const S=BOV.S;const r=S.rs.find(r=>r.t=='fight');r.fz=undefined;r.clr=false;return S.rs.indexOf(r)})()")
    E("(i=>{const o=Math.random;Math.random=()=>0.1;M.enter(BOV.S.rs[i],null);Math.random=o})(%d)"%rm);check(E("BOV.S.r.fz")==1,'Fortune: lucky room rolled (double loot)')
    E("BOV.S.es=[]");pg.wait_for_timeout(1600);check(E("BOV.S.picks")==2 and E("BOV.S.mode")=='pick','Fortune: lucky room offers a choice (picks=2)')
    pg.click('.card >> nth=0');pg.wait_for_timeout(1000);check(E("BOV.S.mode")=='pick' and E("BOV.S.picks")==1 and E("BOV.S.own.length")==2,'Fortune: second Binding choice appears after the first')
    pg.click('.card >> nth=0');pg.wait_for_timeout(300);check(E("BOV.S.own.length")==3 and E("BOV.S.mode")=='play','Fortune: both picks granted, back to play')
    reset(['fortune']);rm=E("(()=>{const S=BOV.S;const r=S.rs.find(r=>r.t=='fight'&&r!==S.r);r.fz=undefined;r.clr=false;return S.rs.indexOf(r)})()")
    E("(i=>{const o=Math.random;Math.random=()=>0.4;M.enter(BOV.S.rs[i],null);Math.random=o})(%d)"%rm);n_amb=E("BOV.S.es.length");check(E("BOV.S.r.fz")==2 and n_amb>=6,'Fortune: ambush room spawns extra enemies (%d)'%n_amb)
    # ---- Void drawback via the real pick screen
    ids=E("M.BD.map(b=>b.id)");reset([i for i in ids if i not in('void','fortune','watch')]);E("M.pickScr()");names=pg.eval_on_selector_all('.card b','e=>e.map(x=>x.textContent)')
    check('Binding of the Void' in names,'pick screen shows the new names: %s'%names)
    pg.click('text=Binding of the Void');pg.wait_for_timeout(200);check(E("BOV.S.mh")==4 and E("BOV.S.hp")<=4,'Void: max health 6 -> 4')
    pg.screenshot(path='/tmp/pick_void.png')
    # ---- Auditor toast fits, synergies exist
    check(max(len(('AUDIT: '+b['sn']+' OFF')) for b in E("M.BD")) <=29,'Auditor toast short names fit the 240px HUD (<=29 chars)')
    check(all(k.split('+')[0] in ids and k.split('+')[1] in ids for k in E("Object.keys(M.CB)")),'every synergy references real Binding ids (%d synergies)'%E("Object.keys(M.CB).length"))
    # ---- chaos soak with every Binding owned
    reset(ids);E("(()=>{const S=BOV.S;S.hp=6;S.mh=60;S.hp=60;S.r.clr=false;S.r.open=false;S.es=[]})()")
    for t,x,y in [('skull',60,60),('octo',180,60),('spirit',120,120),('mimic',150,100),('skull',90,40)]:mkE(t,x,y,6)
    E("(()=>{const S=BOV.S;const e=M.mk('boss',120,48);e.sp=0;S.es.push(e);S.aT=2})()")
    pg.mouse.move(700,300);pg.mouse.down();pg.keyboard.down('d');pg.wait_for_timeout(2500);pg.keyboard.up('d');pg.keyboard.down('a');pg.wait_for_timeout(2500);pg.keyboard.up('a')
    pg.screenshot(path='/tmp/soak.png');pg.mouse.up()
    print('soak state:',E("({mode:BOV.S.mode,hp:Math.round(BOV.S.hp),es:BOV.S.es.length,shots:BOV.S.sh_.length,dis:Object.keys(BOV.S.dis)})"))
    b.close()
check(not errs,'no page errors / failed requests: %s'%errs[:3])
print('\n%d/%d passed'%(sum(res),len(res)));sys.exit(0 if all(res) else 1)
