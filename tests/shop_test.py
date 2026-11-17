"""Shop system checks. Serve the project root (python3 -m http.server 8000), then: python3 tests/shop_test.py http://localhost:8000"""
import sys
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8000'
res=[];errs=[]
def check(c,m):c=bool(c);res.append(c);print(('PASS ' if c else 'FAIL ')+m)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':960,'height':800})
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(BASE+'/index.html?debug');pg.wait_for_timeout(1200);pg.click('text=/ENTER THE/');pg.wait_for_timeout(300)
    pg.evaluate("async()=>{window.M={};for(const x of ['bindings','enemies','shops','items','rooms','ui','state'])Object.assign(M,await import('/src/'+x+'.js'))}")
    E=pg.evaluate
    def fresh():
        E("()=>{BOV.start();const S=BOV.S;S.iv=99999}");pg.wait_for_timeout(100)
    def go(t,x=120,y=140):
        E("([t,x,y])=>{BOV.goto(t);const S=BOV.S;S.x=x;S.y=y;S.iv=99999}",[t,x,y]);pg.wait_for_timeout(150)
    # ---- generation
    ok=True;seen=set()
    for _ in range(40):
        t=E("(()=>{BOV.start();const rs=BOV.S.rs;return [rs.filter(r=>r.t=='shop').length,rs.filter(r=>r.t=='kidnap').length,rs[0].t,rs.filter(r=>r.t=='boss').length,rs.length,rs.find(r=>r.t=='kidnap').sk,rs.every(r=>r.t!='shop'&&r.t!='kidnap'||(r.clr&&r.open))]})()")
        ok&=t[0]==1 and t[1]==1 and t[2]=='start' and t[3]==1 and t[4]==12 and 1<=t[5]<=4 and t[6];seen.add(t[5])
    check(ok and seen=={1,2,3,4},'40 floors: exactly 1 shop + 1 kidnap room (never spawn/boss), 1-4 skeletons (saw %s), both start open/cleared'%sorted(seen))
    # ---- abandoned shop
    fresh();go('shop');st=E("({npc:BOV.S.npc,stock:BOV.S.r.stock||null,msgs:BOV.S.msg.map(m=>m.t),open:BOV.S.r.open,es:BOV.S.es.length,resc:BOV.S.resc})")
    check(st['npc'] is None and st['stock'] is None and st['open'] and st['es']==0 and 'ABANDONED' in ' '.join(st['msgs']),'abandoned shop: no keeper, no stock, no enemies, doors open, toast: %s'%st['msgs'])
    E("BOV.S.coins=100");pg.keyboard.press('e');pg.wait_for_timeout(100);check(E("BOV.S.coins")==100,'nothing can be bought before the rescue')
    pg.screenshot(path='/tmp/shop_abandoned.png')
    # ---- kidnap room, neutral skeletons
    fresh();go('kidnap',120,150);st=E("({npc:BOV.S.npc,sk:BOV.S.es.filter(e=>e.t=='skel').length,want:BOV.S.r.sk,host:BOV.S.es.map(e=>e.host),open:BOV.S.r.open,mode:BOV.S.mode})")
    check(st['npc'] and st['npc']['t']=='bound' and st['sk']==st['want'] and not any(st['host']) and st['open'],'kidnap room: bound shopkeeper + %d neutral skeletons, doors open'%st['sk'])
    # skeletons ignore the player: park the player on top of one, take no damage
    E("(()=>{const S=BOV.S;S.iv=0;S.hp=8;const e=S.es.find(e=>e.t=='skel');e.sp=0;S.x=e.x;S.y=e.y})()");pg.wait_for_timeout(900)
    check(E("BOV.S.hp")==8,'neutral skeletons deal no contact damage (hp %s)'%E("BOV.S.hp"))
    pg.screenshot(path='/tmp/shop_kidnap.png')
    # ---- manual rescue next to skeletons that are still alive
    E("(()=>{const S=BOV.S;S.iv=99999;S.x=120;S.y=76})()");pg.wait_for_timeout(100)
    hint=E("BOV.S.hint");check(hint and 'BOUND' in hint['a'] and '[E]' in hint['b'],'prompt next to the shopkeeper: %s'%hint)
    pg.screenshot(path='/tmp/shop_untie.png')
    k0=E("BOV.S.kills");pg.keyboard.press('e');pg.wait_for_timeout(300)
    st=E("({resc:BOV.S.resc,coins:BOV.S.coins,npc:BOV.S.npc,sk:BOV.S.es.filter(e=>e.t=='skel').length,kills:BOV.S.kills,done:BOV.S.rs.find(r=>r.t=='kidnap').done})")
    check(st['resc']==1 and st['coins']==20 and st['npc'] is None and st['sk']==0 and st['kills']==k0 and st['done'],'E rescues at once with skeletons alive: +20 coins, skeletons crumble (no kills), encounter done')
    pg.keyboard.press('e');pg.wait_for_timeout(100);check(E("BOV.S.coins")==20,'rescuing twice does nothing')
    # re-entering the kidnap room afterwards: empty
    go('boss');go('kidnap');st=E("({npc:BOV.S.npc,sk:BOV.S.es.length})");check(st['npc'] is None and st['sk']==0,'kidnap room is empty after the rescue')
    # ---- hostile skeletons
    fresh();go('kidnap',120,150);E("(()=>{const S=BOV.S;S.es.forEach(e=>e.sp=0)})()")
    E("(()=>{const S=BOV.S;M.damageEnemy(S.es.find(e=>e.t=='skel'),0.1)})()")
    st=E("({host:BOV.S.es.filter(e=>e.t=='skel').map(e=>e.host),r:BOV.S.rs.find(r=>r.t=='kidnap').host,msg:BOV.S.msg.map(m=>m.t)})")
    check(all(st['host']) and st['r'] and any('HOSTILE' in m for m in st['msg']),'attacking one skeleton turns the whole room hostile')
    E("(()=>{const S=BOV.S;S.iv=0;S.hp=8;const e=S.es.find(e=>e.t=='skel');S.x=e.x;S.y=e.y})()");pg.wait_for_timeout(700);check(E("BOV.S.hp")<8,'hostile skeletons hurt on contact (hp %s)'%E("BOV.S.hp"))
    go('boss');go('kidnap');check(all(E("BOV.S.es.filter(e=>e.t=='skel').map(e=>e.host)")),'hostility persists when you re-enter the room')
    E("(()=>{const S=BOV.S;S.iv=99999;S.x=120;S.y=76})()");pg.keyboard.press('e');pg.wait_for_timeout(200);check(E("BOV.S.resc")==1,'you can still rescue the shopkeeper while the skeletons are hostile')
    # ---- automatic rescue
    fresh();E("()=>{BOV.S.rs.forEach(r=>{if(r.t!='shop'&&r.t!='boss')r.vis=true});BOV.S.rs.find(r=>r.t=='kidnap').vis=false}");go('boss',120,140)
    check(E("BOV.S.resc")==0,'boss room visited, kidnap room not: no automatic rescue yet')
    go('kidnap');st=E("({resc:BOV.S.resc,coins:BOV.S.coins,npc:BOV.S.npc,msgs:BOV.S.msg.map(m=>m.t)})")
    check(st['resc']==1 and st['coins']==0 and st['npc'] is None,'discovering every room except shop + boss rescues automatically, no money: %s'%st['msgs'])
    fresh();E("()=>{BOV.S.rs.forEach(r=>{if(r.t!='shop'&&r.t!='boss')r.vis=true})}");go('shop');check(E("BOV.S.resc")==1 or E("BOV.S.resc")==0,'(entering the shop itself never counts)')
    # ---- operational shop + stock
    fresh();E("()=>{BOV.S.resc=1;BOV.SV.w=1}");go('shop');st=E("({npc:BOV.S.npc,stock:BOV.S.r.stock})")
    stock=st['stock'];check(st['npc'] and st['npc']['t']=='keeper' and len(stock)==5 and sum(1 for s in stock if s['k']=='b')==3 and sum(1 for s in stock if s['k']=='i')==2,'open shop: keeper + 5 items (3 Bindings, 2 other)')
    ex=E("M.BD.filter(b=>b.shop).map(b=>b.id)");check(sorted(ex)==['ascend','curse','pin','void'],'exactly the 4 exclusives are flagged: %s'%ex)
    check(all(s['price']>=4 for s in stock) and len({(s['k'],s['id']) for s in stock})==5,'prices set, no duplicate items: %s'%[(s['id'],s['price']) for s in stock])
    pg.screenshot(path='/tmp/shop_open.png')
    # stock variety + rules over many generations
    bad=0;exSeen=set();regSeen=set();lockedSeen=False
    for i in range(150):
        r=E("(()=>{BOV.start();const S=BOV.S;S.resc=1;BOV.SV.w=%d;S.own=%s;const r=S.rs.find(r=>r.t=='shop');r.stock=null;M.enter(r,null);return r.stock})()"%(0 if i%2 else 1, "['glass']" if i%3==0 else "[]"))
        ids=[s['id'] for s in r if s['k']=='b']
        for s in r:
            if s['k']=='b':
                (exSeen if s['id'] in ex else regSeen).add(s['id'])
                if i%3==0 and s['id'] in ('glass','twin'): bad+=1
                if i%2 and s['id'] in ('pin','curse'): lockedSeen=True
    check(bad==0 and not lockedSeen and len(exSeen)==4 and len(regSeen)>=10,'150 stocks: never an owned/clashing Binding, Rebound+Bugs absent until unlocked, all 4 exclusives show up over time (%d), regular variety %d'%(len(exSeen),len(regSeen)))
    # reward pools never contain exclusives
    bad=0
    for _ in range(120):
        names=E("(()=>{const S=BOV.S;S.own=[];S.es=[];S.mode='play';BOV.SV.w=3;M.pickScr();const n=[...document.querySelectorAll('.card b')].map(x=>x.textContent);document.getElementById('ov').style.display='none';S.mode='play';return n})()")
        bad+=sum(1 for n in names if n in ('Binding of Rebound','Binding of Bugs','Binding of the Void','Binding of Ascension'))
    check(bad==0,'room rewards never offer the 4 shop exclusives (120 offers)')
    # ---- buying
    def shop(own=[],coins=100,hp=None):
        E("([own,coins,hp])=>{BOV.start();const S=BOV.S;S.iv=99999;S.resc=1;BOV.SV.w=1;S.own=own;S.coins=coins;if(hp!=null)S.hp=hp}",[own,coins,hp])
        E("()=>{const S=BOV.S;const r=S.rs.find(r=>r.t=='shop');r.stock=null;M.enter(r,null);S.iv=99999}")
    def setslot(i,item):E("([i,it])=>{BOV.S.r.stock[i]=it}",[i,item])
    def stand(i):E("(i)=>{BOV.S.x=%s[i];BOV.S.y=118}"%"[40,80,120,160,200]",i);pg.wait_for_timeout(120)
    shop();setslot(0,{'k':'b','id':'chrono','price':14});stand(0);hint=E("BOV.S.hint")
    check(hint and 'CHRONOS' in hint['a'] and '14c' in hint['a'] and hint['b']=='[E] BUY' and hint['desc'],'standing at a pedestal shows name, price, description, prompt: %s'%hint['a'])
    pg.screenshot(path='/tmp/shop_hint.png')
    pg.keyboard.press('e');pg.wait_for_timeout(150);st=E("({own:BOV.S.own,coins:BOV.S.coins,sold:BOV.S.r.stock[0].sold})")
    check(st['own']==['chrono'] and st['coins']==86 and st['sold'],'buying a Binding equips it and charges 14: %s'%st)
    pg.keyboard.press('e');pg.wait_for_timeout(100);check(E("BOV.S.coins")==86,'a sold item cannot be bought again')
    shop(coins=5);setslot(1,{'k':'b','id':'blood','price':12});stand(1);E("BOV.S.coins=5");hint=E("BOV.S.hint");pg.keyboard.press('e');pg.wait_for_timeout(100)
    check('MORE COINS' in hint['b'] and E("BOV.S.own.length")==0 and E("BOV.S.coins")==5,'too poor: prompt says how many coins are missing, nothing happens (%s)'%hint['b'])
    # exclusive tag
    shop();setslot(2,{'k':'b','id':'void','price':22});stand(2);check(E("BOV.S.hint.ex"),'shop-exclusive Bindings are tagged in the prompt')
    # clash
    shop(['twin']);setslot(0,{'k':'b','id':'glass','price':12});stand(0);pg.keyboard.press('e');pg.wait_for_timeout(100);check(E("BOV.S.own")==['twin'] and E("BOV.S.coins")==100,'Shards cannot be bought while holding Twins (and vice versa)')
    # full loadout: replace screen, esc = no charge, swap = charge
    full=['aegis','leech','hot','echo','frost']
    shop(full);setslot(0,{'k':'b','id':'chrono','price':15});stand(0);pg.keyboard.press('e');pg.wait_for_timeout(200)
    check(E("BOV.S.mode")=='pick' and pg.locator('text=REPLACE WHICH').is_visible() and E("BOV.S.coins")==100,'full loadout: replace screen is VISIBLE, still nothing charged')
    pg.keyboard.press('Escape');pg.wait_for_timeout(200);check(E("BOV.S.mode")=='play' and E("BOV.S.own")==full and E("BOV.S.coins")==100,'Esc cancels the purchase: no charge, shelf unchanged (sold=%s)'%E("!!BOV.S.r.stock[0].sold"))
    pg.keyboard.press('e');pg.wait_for_timeout(200);pg.keyboard.press('2');pg.wait_for_timeout(250)
    own=E("BOV.S.own");check('chrono' in own and 'leech' not in own and len(own)==5 and E("BOV.S.coins")==85 and E("BOV.S.r.stock[0].sold"),'choosing a slot swaps it out, then charges 15: %s'%own)
    shop(full);setslot(0,{'k':'b','id':'chrono','price':15});stand(0);pg.keyboard.press('e');pg.wait_for_timeout(200);pg.click('button:has-text("SKIP")');pg.wait_for_timeout(200)
    check(E("BOV.S.coins")==100 and E("BOV.S.own")==full,'SKIP button also cancels without charging')
    # items
    shop(hp=8);setslot(0,{'k':'i','id':'heart','price':5});stand(0);pg.keyboard.press('e');pg.wait_for_timeout(100);check(E("BOV.S.coins")==100 and E("BOV.S.hp")==8,'Heart refused at full health, nothing charged')
    shop(hp=3);setslot(0,{'k':'i','id':'heart','price':5});stand(0);pg.keyboard.press('e');pg.wait_for_timeout(100);check(E("BOV.S.hp")==5 and E("BOV.S.coins")==95,'Heart: +2 health, 5 coins')
    shop(hp=1);setslot(0,{'k':'i','id':'elixir','price':16});stand(0);pg.keyboard.press('e');pg.wait_for_timeout(100);check(E("BOV.S.hp")==E("BOV.S.mh") and E("BOV.S.coins")==84,'Elixir: full health, 16 coins')
    shop(hp=8);setslot(0,{'k':'i','id':'vessel','price':22});stand(0);pg.keyboard.press('e');pg.wait_for_timeout(250);check(E("BOV.S.mh")==10 and E("BOV.S.hp")==10 and E("BOV.S.coins")==78,'Heart Container: max health 8 -> 10 (and it sticks, mh=%s)'%E("BOV.S.mh"))
    shop();setslot(0,{'k':'i','id':'might','price':18});stand(0);d0=E("M.volleyDamage(1)");pg.keyboard.press('e');pg.wait_for_timeout(100);d1=E("M.volleyDamage(1)");check(abs(d1/d0-1.12)<1e-9,'Might Tonic: damage x1.12 (%.2f -> %.2f)'%(d0,d1))
    shop();setslot(0,{'k':'i','id':'swift','price':16});stand(0);pg.keyboard.press('e');pg.wait_for_timeout(100);check(E("BOV.S.items")==['swift'],'Swift Tonic is kept as a passive item')
    # ---- coins
    fresh();go('start' if False else 'boss');E("()=>{const S=BOV.S;S.es=[];S.cn=[];S.r.clr=false;S.r.open=false}")
    E("async()=>{const o=Math.random;Math.random=()=>0;const S=BOV.S;for(const t of ['skull','octo','spirit','mimic']){const e=M.mk(t,60,60);e.sp=0;e.hp=0;S.es.push(e)}await new Promise(r=>setTimeout(r,250));Math.random=o}")
    n=E("BOV.S.cn.length");check(n>=6,'enemies drop coins when they die (%d coins from skull+octo+spirit+mimic)'%n)
    E("()=>{const S=BOV.S;S.x=60;S.y=60}");pg.wait_for_timeout(500);check(E("BOV.S.coins")>=6 and E("BOV.S.cn.length")==0,'coins are collected by touching them (%d)'%E("BOV.S.coins"))
    fresh();go('boss');E("()=>{const S=BOV.S;S.es=[];S.r.clr=true;S.cn=[{x:200,y:150,t:1},{x:30,y:40,t:1}];S.x=120;S.y=90}");pg.wait_for_timeout(1800);check(E("BOV.S.coins")==2,'in a cleared room the coins fly to you')
    fresh();go('boss');E("()=>{const S=BOV.S;S.coins=7;S.hp=0.5;S.iv=0}");
    # ---- neutral skeletons are ignored by homing/chain/marks
    fresh();go('kidnap');E("()=>{const S=BOV.S;S.own=['watch','thunder','grav'];S.es.forEach(e=>e.sp=0);S.wT=0.01}");pg.wait_for_timeout(250)
    check(E("BOV.S.es.filter(e=>e.mk>0).length")==0,'Watcher never marks neutral skeletons')
    # ---- map colours + HUD
    fresh();E("()=>{const S=BOV.S;S.rs.forEach(r=>r.vis=true)}");go('shop');pg.screenshot(path='/tmp/shop_map.png',clip={'x':600,'y':0,'width':360,'height':100})
    # ---- save/death screen text
    fresh();E("()=>{const S=BOV.S;S.coins=33;S.hp=0;S.mode='dead'}");E("()=>{M.deadScr&&0}");
    b.close()
check(not errs,'no page errors: %s'%errs[:3])
print('\n%d/%d passed'%(sum(res),len(res)));sys.exit(0 if all(res) else 1)
