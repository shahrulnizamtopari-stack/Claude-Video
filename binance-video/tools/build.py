#!/usr/bin/env python3
"""Build index.html + compositions/*.html for binance-video ("20 Minit"), FAIL KES style.
Beats come from assets/transcript.json (VO time). Local scene time = abs - scene start."""
import json, os, re, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOTAL = 60.2
SCENES = [("hook", 0.0, 6.35), ("rekod", 6.35, 3.55), ("temu", 9.9, 3.7), ("masa", 13.6, 7.85), ("manusia", 21.45, 8.7),
          ("suspek", 30.15, 5.2), ("beku", 35.35, 6.75), ("sulit", 42.1, 8.2), ("akhir", 50.3, 9.9)]
FONTS = r"""
@font-face{font-family:"Anton";src:url("assets/fonts/Anton.woff2") format("woff2")}
@font-face{font-family:"Marker";src:url("assets/fonts/PermanentMarker.woff2") format("woff2")}
@font-face{font-family:"Typewriter";src:url("assets/fonts/SpecialElite.woff2") format("woff2")}
@font-face{font-family:"CourierP";font-weight:700;src:url("assets/fonts/CourierPrime.woff2") format("woff2")}
@font-face{font-family:"Stencil";font-weight:700;src:url("assets/fonts/StardosStencil.woff2") format("woff2")}
"""
BASE_CSS = FONTS + r"""
#root { position:absolute; inset:0; color:#1c1a17; }
#root .jit { position:absolute; inset:0; transform-origin:50% 45%; }
#root .jit > * { position:absolute; }
#root .an { font-family:"Anton",sans-serif; line-height:.92; letter-spacing:1px; }
#root .mk { font-family:"Marker",cursive; line-height:1.05; }
#root .ty { font-family:"Typewriter",monospace; }
#root .cr { font-family:"CourierP",monospace; font-weight:700; }
#root .st { font-family:"Stencil",serif; font-weight:700; }
#root .red { color:#c4241d; } #root .cream { color:#fff3d6; }
#root .idx { background:#fbf8f0 repeating-linear-gradient(transparent 0 62px,#9fc0e0 62px 64px); background-position:0 90px;
  box-shadow:5px 9px 0 rgba(0,0,0,.25),0 24px 44px rgba(0,0,0,.4); z-index:2; }
#root .idx::before { content:""; position:absolute; left:0; right:0; top:80px; height:4px; background:#e08a8a; }
#root .card { background:#fbf8f0; box-shadow:5px 9px 0 rgba(0,0,0,.25),0 24px 44px rgba(0,0,0,.4); z-index:2; }
#root .manila { background:#e2c98d; box-shadow:5px 9px 0 rgba(0,0,0,.25),0 24px 44px rgba(0,0,0,.45); z-index:2; }
#root .pol { background:#f7f5ef; padding:24px 24px 96px; box-shadow:5px 9px 0 rgba(0,0,0,.25),0 26px 48px rgba(0,0,0,.45); z-index:2; }
#root .pol .ph { background:#2a2622; display:flex; align-items:center; justify-content:center; }
#root .pol .cap { position:absolute; left:24px; right:24px; bottom:22px; font:52px "Marker",cursive; text-align:center; white-space:nowrap; }
#root .pin { width:46px; height:46px; border-radius:50%; background:radial-gradient(circle at 35% 35%,#ff8a80,#c4241d 55%,#7a1410); box-shadow:5px 8px 7px rgba(0,0,0,.45); z-index:6; }
#root .stamp { display:inline-block; font:700 80px "Stencil",serif; letter-spacing:6px; border:10px solid currentColor; border-radius:12px; padding:4px 30px; mix-blend-mode:multiply; opacity:.9; white-space:nowrap; z-index:7; }
#root .tag { background:#f2d03b; font:700 34px "CourierP",monospace; padding:8px 20px; box-shadow:2px 5px 5px rgba(0,0,0,.3); z-index:7; white-space:nowrap; }
#root .cctv { font:700 36px "CourierP",monospace; color:#f2f2f2; background:rgba(0,0,0,.6); padding:10px 22px; letter-spacing:2px; z-index:8; white-space:nowrap; }
#root .rd { display:inline-block; background:#111; color:#111; line-height:1.05; }
#root .strings { left:0; top:0; z-index:1; overflow:visible; }
#root .strings path { fill:none; stroke:#c4241d; stroke-width:6; }
"""
LAPTOP = ('<svg width="{w}" height="{h}" viewBox="0 0 100 70" fill="none" stroke="#f2ead8" stroke-width="2.5" stroke-linejoin="round">'
          '<rect x="18" y="8" width="64" height="40" rx="3"/><path d="M8 56 L92 56 L84 48 L16 48 Z"/>'
          '<path d="M50 18 L50 32" stroke="#ff6b5e" stroke-width="4"/><circle cx="50" cy="39" r="2.4" fill="#ff6b5e" stroke="none"/></svg>')
def laptop(w): return LAPTOP.format(w=w, h=int(w * .7))
def pin(x, y, pid=""): return f'<div class="pin" {f"id={pid}" if pid else ""} style="left:{x-23}px;top:{y-23}px"></div>'
def string(pid, a, b, c, d):
    return f'<path id="{pid}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M{a} {b} Q{(a+c)/2} {(b+d)/2+50} {c} {d}"/>'
S = {}
# ------------------------------------------------------------------- HOOK
S["hook"] = dict(css="""
#hk-cc { left:80px; top:196px; }
#hk-f { left:80px; top:320px; width:920px; height:380px; transform:rotate(-2deg); padding:50px 50px; }
#hk-tab { position:absolute; left:0; top:-56px; width:340px; height:60px; background:#e2c98d; border-radius:14px 14px 0 0; }
#hk-p { left:760px; top:440px; width:250px; transform:rotate(6deg); padding:18px 18px 80px; }
#hk-m { left:60px; top:770px; width:960px; height:250px; transform:rotate(1.5deg); padding:118px 40px 0; }
#hk-st { left:420px; top:960px; color:#c4241d; transform:rotate(-10deg); }
""", html=f"""
<div id="hk-cc" class="cctv"><span class="red">●</span> REC · 30 OKT 2026 · 04:05:<span id="hk-s">12</span> MYT</div>
<div id="hk-f" class="manila"><div id="hk-tab"></div><div class="st" style="font-size:64px;letter-spacing:4px">FAIL KES #2910</div>
<div class="cr" style="font-size:36px;margin-top:20px">SUBJEK: BINANCE</div><div class="cr" style="font-size:32px;margin-top:8px">29.10.2026 · 20:05 UTC</div>
<span class="stamp red" style="position:absolute;left:60px;top:250px;transform:rotate(-8deg);font-size:64px">SULIT</span></div>
{pin(540, 340)}
<div id="hk-p" class="pol" style="opacity:0"><div class="ph cr" style="height:150px;font-size:70px;color:#ff6b5e">20:00</div><div class="cap" style="font-size:40px;bottom:16px">20 minit</div></div>
<div id="hk-m" class="idx"><div class="cr" style="font-size:96px;letter-spacing:-2px;white-space:nowrap"><span id="hk-d">$</span></div></div>
{pin(540, 790)}
<div id="hk-st" style="opacity:0"><span class="stamp" style="font-size:110px">LESAP</span></div>
""", js="""
const sEl=document.getElementById("hk-s"), SS={v:12};
tl.fromTo(SS,{v:12},{v:18,duration:6,ease:"none",onUpdate:()=>{sEl.textContent=String(Math.floor(SS.v)).padStart(2,"0");}},0);
tl.fromTo("#hk-p",{opacity:0,y:-80,rotation:15},{opacity:1,y:0,rotation:5,duration:.25,ease:"power3.out"},2.9);
const dEl=document.getElementById("hk-d"), full="$6,360,000,000", D={v:1};
tl.fromTo(D,{v:1},{v:full.length,duration:1.4,ease:"steps(13)",onUpdate:()=>{dEl.textContent=full.slice(0,Math.round(D.v));}},3.85);
tl.fromTo("#hk-st",{opacity:0,scale:1.9},{opacity:1,scale:1,duration:.12,ease:"power4.in"},5.85);
""")
# ------------------------------------------------------------------- REKOD
S["rekod"] = dict(css="""
#rk-a { left:70px; top:330px; width:300px; transform:rotate(-6deg); }
#rk-b { left:380px; top:240px; width:620px; transform:rotate(4deg); }
#rk-4 { left:80px; top:820px; font-size:300px; transform:rotate(-6deg); line-height:1; }
#rk-t { left:560px; top:1000px; transform:rotate(-3deg); }
""", html=f"""
<div id="rk-a" class="pol"><div class="ph cr" style="height:200px;font-size:60px;color:#f2ead8">$1.5B</div><div class="cap" style="font-size:40px">Bybit · 2025</div></div>{pin(220, 340)}
<div id="rk-b" class="pol" style="opacity:0"><div class="ph cr" style="height:440px;font-size:130px;color:#ff6b5e">$6.36B</div><div class="cap">Binance · 2026</div></div>
<div id="rk-pb" class="pin" style="left:667px;top:227px;opacity:0"></div>
<div id="rk-4" class="mk cream" style="opacity:0">4×</div>
<div id="rk-t" class="tag" style="opacity:0;font-size:44px">REKOD BARU</div>
""", js="""
tl.fromTo("#rk-b",{opacity:0,scale:1.15,rotation:10},{opacity:1,scale:1,rotation:4,duration:.2,ease:"power4.in"},0.1);
tl.fromTo("#rk-pb",{opacity:0},{opacity:1,duration:.05},0.32);
tl.fromTo("#rk-4",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.5,ease:"steps(6)"},0.85);
tl.fromTo("#rk-t",{opacity:0,scale:1.4},{opacity:1,scale:1,duration:.15},1.4);
""")
# ------------------------------------------------------------------- TEMUDUGA
S["temu"] = dict(css="""
#tm-l { left:80px; top:260px; width:920px; height:780px; transform:rotate(2deg); padding:60px 60px; }
#tm-hl { position:relative; display:inline-block; }
#tm-hlb { position:absolute; left:-6px; right:-6px; top:45%; bottom:0; background:#f2d03b; transform-origin:0 50%; mix-blend-mode:multiply; }
#tm-tag { left:650px; top:960px; transform:rotate(-4deg); }
""", html=f"""
<div id="tm-l" class="card"><div class="st" style="font-size:72px;letter-spacing:3px">TAWARAN KERJA</div>
<div class="cr" style="font-size:42px;line-height:1.75;margin-top:36px">Tahniah! Anda dijemput ke<br><span id="tm-hl"><span id="tm-hlb"></span>temuduga</span> untuk jawatan <span class="rd">████████</span>.<br>
Sila muat turun <span class="rd">██████████</span><br>sebelum sesi bermula.<br>Gaji: <span class="rd">██████</span></div></div>
{pin(540, 280)}
<div id="tm-tag" class="tag" style="opacity:0;font-size:44px">DILAPORKAN</div>
""", js="""
tl.fromTo("#tm-l",{y:900,rotation:12},{y:0,rotation:2,duration:.35,ease:"power3.out"},0.0);
tl.fromTo("#tm-tag",{opacity:0,scale:1.5},{opacity:1,scale:1,duration:.15},0.4);
tl.fromTo("#tm-hlb",{scaleX:0},{scaleX:1,duration:.4,ease:"power2.out"},2.55);
""")
# ------------------------------------------------------------------- GARIS MASA
TL = [("04:05", "XRP", "233 juta XRP", 2.85), ("04:10", "SOLANA", "970 ribu SOL", 3.16), ("04:20", "BITCOIN", "18,270 BTC", 4.0), ("04:23", "ETHEREUM", "dikosongkan", 6.65)]
tl_html = "".join(f'<div id="ms-c{i}" class="idx" style="left:{190+(i%2)*30}px;top:{470+i*155}px;width:790px;height:135px;transform:rotate({-1.5 if i%2==0 else 1.5}deg);padding:14px 30px 0;opacity:0">'
                  f'<span class="cr" style="font-size:34px;color:#666">{t} MYT</span> <span class="an" style="font-size:66px;margin-left:24px">{c}</span><div class="cr" style="font-size:34px;margin-top:2px">{v}</div></div>'
                  f'<div id="ms-p{i}" class="pin" style="left:117px;top:{510+i*155}px;opacity:0"></div>' for i, (t, c, v, s) in enumerate(TL))
tl_js = "".join(f'tl.fromTo("#ms-c{i}",{{opacity:0,x:140}},{{opacity:1,x:0,duration:.18,ease:"power3.out"}},{s:.2f});tl.fromTo("#ms-p{i}",{{opacity:0,scale:1.6}},{{opacity:1,scale:1,duration:.08}},{s+.12:.2f});' for i, (t, c, v, s) in enumerate(TL))
S["masa"] = dict(css="""
#ms-cc { left:80px; top:196px; }
#ms-loc { left:60px; top:290px; width:960px; height:150px; transform:rotate(-1deg); padding:42px 34px 0; }
#ms-line { left:140px; top:470px; width:6px; height:640px; background:#c4241d; transform-origin:50% 0; z-index:1; }
#ms-3 { left:640px; top:1060px; transform:rotate(3deg); }
#ms-st { left:640px; top:930px; color:#c4241d; transform:rotate(-10deg); }
""", html=f"""
<div id="ms-cc" class="cctv"><span class="red">●</span> REC · <span id="ms-clk">04:05:12</span> MYT <span id="ms-ff" style="opacity:0">▶▶</span></div>
<div id="ms-loc" class="card"><span class="cr" style="font-size:40px">LOKASI: <b>BINANCE</b> · bursa crypto terbesar dunia</span></div>
<div id="ms-line"></div>
{tl_html}
<div id="ms-3" class="tag" style="opacity:0;font-size:40px">3 MIN 24 S</div>
<div id="ms-st" style="opacity:0"><span class="stamp" style="font-size:84px">KOSONG</span></div>
""", js="""
tl.fromTo("#ms-loc",{opacity:0,y:-60},{opacity:1,y:0,duration:.2,ease:"power3.out"},0.06);
tl.fromTo("#ms-line",{scaleY:0},{scaleY:1,duration:1.0,ease:"power1.inOut"},1.5);
const ck=document.getElementById("ms-clk"), K={v:5*60+12};
const fmt=v=>{v=Math.floor(v);return "04:"+String(Math.floor(v/60)).padStart(2,"0")+":"+String(v%60).padStart(2,"0");};
tl.fromTo(K,{v:5*60+12},{v:5*60+12,duration:.01,onUpdate:()=>{ck.textContent=fmt(K.v);}},0);
tl.fromTo(K,{v:5*60+12},{v:23*60+41,duration:4.2,ease:"power1.in",onUpdate:()=>{ck.textContent=fmt(K.v);}},2.8);
tl.fromTo("#ms-ff",{opacity:0},{opacity:1,duration:.05},2.8);
tl.to("#ms-ff",{opacity:0,duration:.05},7.0);
""" + tl_js + """
tl.fromTo("#ms-3",{opacity:0,scale:1.5},{opacity:1,scale:1,duration:.15},5.4);
tl.fromTo("#ms-st",{opacity:0,scale:1.9},{opacity:1,scale:1,duration:.12,ease:"power4.in"},7.3);
""")
# ------------------------------------------------------------------- MANUSIA
S["manusia"] = dict(css="""
#mn-v { left:630px; top:250px; width:360px; height:300px; background:#3b3631; transform:rotate(5deg); box-shadow:5px 9px 0 rgba(0,0,0,.25),0 24px 44px rgba(0,0,0,.4); z-index:2; }
#mn-vx { position:absolute; left:60px; top:30px; }
#mn-vl { position:absolute; left:0; right:0; bottom:12px; text-align:center; font-size:36px; }
#mn-p { left:70px; top:260px; width:520px; transform:rotate(-4deg); }
#mn-tg { left:330px; top:250px; transform:rotate(8deg); }
#mn-l { left:560px; top:640px; width:440px; height:250px; transform:rotate(3deg); padding:26px 30px; }
#mn-t { left:80px; top:930px; font-size:104px; }
""", html=f"""
<svg class="strings" width="1080" height="1920">{string("mn-s1", 780, 660, 330, 300)}</svg>
<div id="mn-v"><svg id="mn-vx" width="240" height="240" viewBox="0 0 100 100"><path id="mn-x1" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M15 15 L85 85" stroke="#ff6b5e" stroke-width="12" stroke-linecap="butt"/>
<path id="mn-x2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M85 15 L15 85" stroke="#ff6b5e" stroke-width="12" stroke-linecap="butt"/></svg><div id="mn-vl" class="ty cream">peti besi</div></div>
<div id="mn-p" class="pol" style="opacity:0"><div class="ph" style="height:400px">{laptop(400)}</div><div class="cap">laptop jurutera</div></div>
<div id="mn-pp" class="pin" style="left:307px;top:277px;opacity:0"></div>
<div id="mn-tg" class="tag" style="opacity:0;font-size:40px">BUKTI #01</div>
<div id="mn-l" class="card" style="opacity:0"><div class="st" style="font-size:44px">TAWARAN KERJA</div><div class="cr" style="font-size:30px;line-height:1.7;margin-top:10px">temuduga · <span class="rd">██████</span><br>muat turun <span class="rd">████████</span></div>
<div class="tag" style="position:absolute;right:16px;bottom:14px;font-size:28px">dilaporkan</div></div>
<div id="mn-lp" class="pin" style="left:757px;top:637px;opacity:0"></div>
<div id="mn-t" class="an"><span id="mn-t1" style="opacity:0">GODAM</span><br><span id="mn-t2" style="opacity:0;color:#ff7a6e">SEORANG MANUSIA.</span></div>
""", js="""
tl.fromTo("#mn-v",{opacity:0,y:-40},{opacity:1,y:0,duration:.2},0.2);
tl.fromTo("#mn-x1",{strokeDashoffset:1},{strokeDashoffset:0,duration:.18,ease:"power2.out"},0.75);
tl.fromTo("#mn-x2",{strokeDashoffset:1},{strokeDashoffset:0,duration:.18,ease:"power2.out"},0.95);
tl.fromTo("#mn-t1",{opacity:0},{opacity:1,duration:.08},2.15);
tl.fromTo("#mn-t2",{opacity:0,scale:1.15},{opacity:1,scale:1,duration:.15,ease:"power4.in",transformOrigin:"0% 50%"},2.6);
tl.fromTo("#mn-p",{opacity:0,y:-120,rotation:-14},{opacity:1,y:0,rotation:-4,duration:.25,ease:"power3.out"},3.9);
tl.fromTo("#mn-pp",{opacity:0,scale:1.6},{opacity:1,scale:1,duration:.08},4.15);
tl.fromTo("#mn-tg",{opacity:0,scale:1.5},{opacity:1,scale:1,duration:.15},4.6);
tl.fromTo("#mn-l",{opacity:0,x:200},{opacity:1,x:0,duration:.25,ease:"power3.out"},5.85);
tl.fromTo("#mn-lp",{opacity:0,scale:1.6},{opacity:1,scale:1,duration:.08},6.1);
tl.fromTo("#mn-s1",{strokeDashoffset:1},{strokeDashoffset:0,duration:.6,ease:"power2.inOut"},6.3);
""")
# ------------------------------------------------------------------- SUSPEK
S["suspek"] = dict(css="""
#sp-a { left:60px; top:230px; width:300px; transform:rotate(-6deg); }
#sp-b { left:720px; top:250px; width:300px; transform:rotate(5deg); }
#sp-c { left:220px; top:580px; width:640px; height:360px; transform:rotate(-1deg); padding:110px 30px 0; text-align:center; }
#sp-f { left:60px; top:1000px; width:400px; height:140px; transform:rotate(3deg); padding:94px 24px 0; }
#sp-g { left:600px; top:980px; width:430px; height:190px; transform:rotate(-3deg); padding:90px 24px 0; }
#sp-st { left:250px; top:900px; transform:rotate(-8deg); color:#1c1a17; }
""", html=f"""
<svg class="strings" width="1080" height="1920">{string("sp-s1", 210, 250, 540, 600)}{string("sp-s2", 870, 270, 540, 600)}{string("sp-s3", 260, 1010, 540, 600)}{string("sp-s4", 820, 1000, 540, 600)}</svg>
<div id="sp-a" class="pol"><div class="ph" style="height:180px">{laptop(200)}</div><div class="cap" style="font-size:36px">laptop</div></div>{pin(210, 250)}
<div id="sp-b" class="pol"><div class="ph cr" style="height:180px;font-size:56px;color:#f2ead8">$1.5B</div><div class="cap" style="font-size:36px">Bybit</div></div>{pin(870, 270)}
<div id="sp-c" class="idx" style="opacity:0"><div class="st red" style="font-size:56px">SUSPEK</div><div class="an" style="font-size:104px">KOREA UTARA</div><div class="cr" style="font-size:32px;margin-top:6px">unit TraderTraitor (Lazarus)</div></div>
<div id="sp-cp" class="pin" style="left:517px;top:577px;opacity:0"></div>
<div id="sp-f" class="idx" style="opacity:0"><div class="cr" style="font-size:36px">FBI: dikaitkan</div></div><div id="sp-fp" class="pin" style="left:237px;top:987px;opacity:0"></div>
<div id="sp-g" class="idx" style="opacity:0"><div class="cr" style="font-size:30px;line-height:1.3">Chainalysis · Elliptic<br>· TRM</div></div><div id="sp-gp" class="pin" style="left:797px;top:977px;opacity:0"></div>
<div id="sp-st" data-layout-allow-overlap style="opacity:0"><span class="stamp" style="font-size:58px;background:rgba(251,248,240,.75)">DINAFIKAN · PYONGYANG</span></div>
""", js="""
tl.fromTo("#sp-f",{opacity:0,y:100},{opacity:1,y:0,duration:.2,ease:"power3.out"},0.95);
tl.fromTo("#sp-fp",{opacity:0},{opacity:1,duration:.05},1.1);
tl.fromTo("#sp-g",{opacity:0,y:100},{opacity:1,y:0,duration:.2,ease:"power3.out"},1.25);
tl.fromTo("#sp-gp",{opacity:0},{opacity:1,duration:.05},1.4);
tl.fromTo("#sp-c",{opacity:0,scale:1.15},{opacity:1,scale:1,duration:.18,ease:"power4.in"},2.6);
tl.fromTo("#sp-cp",{opacity:0,scale:1.6},{opacity:1,scale:1,duration:.08},2.75);
["#sp-s1","#sp-s2","#sp-s3","#sp-s4"].forEach((s,i)=>tl.fromTo(s,{strokeDashoffset:1},{strokeDashoffset:0,duration:.35,ease:"power2.inOut"},2.85+i*.18));
tl.fromTo("#sp-st",{opacity:0,scale:1.9},{opacity:1,scale:1,duration:.12,ease:"power4.in"},4.7);
""")
# ------------------------------------------------------------------- BEKU
def ice(i, n, v, y, r, t):
    return (f'<div id="bk-c{i}" class="idx" style="left:{80+i*40}px;top:{y}px;width:880px;height:200px;transform:rotate({r}deg);padding:100px 34px 0;opacity:0">'
            f'<span class="an" style="font-size:80px">{n}</span> <span class="cr" style="font-size:44px;margin-left:20px">bekukan {v}</span>'
            f'<div id="bk-i{i}" style="position:absolute;right:-40px;top:-14px;width:240px;height:70px;background:rgba(124,198,230,.8);transform:rotate(-20deg);opacity:0"></div></div>'
            f'<div id="bk-p{i}" class="pin" style="left:{497+i*40}px;top:{y-6}px;opacity:0"></div>')
S["beku"] = dict(css="""
#bk-cc { left:80px; top:196px; }
#bk-m { left:80px; top:290px; font-size:72px; transform:rotate(-2deg); }
#bk-t { left:80px; top:890px; width:920px; height:260px; background:#e8f4fa; transform:rotate(-1deg); padding:30px 40px; box-shadow:5px 9px 0 rgba(0,0,0,.25),0 24px 44px rgba(0,0,0,.4); z-index:2; }
""", html=f"""
<div id="bk-cc" class="cctv"><span class="red">●</span> REC · 05:01 MYT (+56 MIN)</div>
<div id="bk-m" class="mk cream" style="opacity:0">dunia crypto melawan balik…</div>
{ice(0, "TETHER", "$971.1 juta", 440, -2, 2.0)}{ice(1, "CIRCLE", "$823 juta", 670, 2, 2.5)}
<div id="bk-t" style="opacity:0"><div class="cr" style="font-size:36px">JUMLAH DIBEKUKAN (anggaran)</div><div class="an" style="font-size:150px;color:#1f6f99" id="bk-n">$0B</div></div>
""", js="""
tl.fromTo("#bk-m",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.8,ease:"steps(10)"},0.3);
[[0,1.95],[1,2.5]].forEach(([i,t])=>{tl.fromTo("#bk-c"+i,{opacity:0,x:200},{opacity:1,x:0,duration:.2,ease:"power3.out"},t);
  tl.fromTo("#bk-p"+i,{opacity:0,scale:1.6},{opacity:1,scale:1,duration:.08},t+.15);
  tl.fromTo("#bk-i"+i,{opacity:0,scaleX:0},{opacity:1,scaleX:1,duration:.15},3.4+i*.12);});
tl.fromTo("#bk-t",{opacity:0,y:120},{opacity:1,y:0,duration:.22,ease:"power3.out"},4.4);
const bn=document.getElementById("bk-n"), B={v:0};
tl.fromTo(B,{v:0},{v:3,duration:.7,ease:"power2.out",onUpdate:()=>{bn.textContent="~$"+B.v.toFixed(B.v<2.95?1:0)+"B";}},4.95);
""")
# ------------------------------------------------------------------- SULIT
S["sulit"] = dict(css="""
#sl-f { left:70px; top:240px; width:940px; height:800px; transform:rotate(1.5deg); padding:60px 60px; }
#root .rv { position:relative; display:inline-block; }
#root .rv .bar { position:absolute; inset:-4px -8px; background:#111; transform-origin:100% 50%; }
#sl-tag { position:absolute; left:60px; bottom:50px; font-size:30px; }
#sl-m { left:800px; top:880px; }
""", html=f"""
<div id="sl-f" class="manila"><span class="stamp red" style="font-size:84px">SULIT</span>
<div class="cr" style="font-size:44px;line-height:1.8;margin-top:40px">Hasil kecurian aset maya<br>digunakan untuk membiayai<br>program <span class="rv"><b style="background:#fff3d6;padding:0 10px">NUKLEAR</b><i class="bar" id="sl-b1"></i></span> <span class="rd">████</span><br>
dan <span class="rv"><b style="background:#fff3d6;padding:0 10px">PELURU BERPANDU</b><i class="bar" id="sl-b2"></i></span><br><span class="rd">██████████████</span><br><span class="rd">████</span> $2.84B sejak 2024</div>
<div id="sl-tag" class="tag" style="opacity:0">MSMT · pemantau sekatan · 11 negara</div></div>
{pin(540, 256)}
<svg id="sl-m" width="200" height="330" viewBox="0 0 60 100" fill="none" stroke="#fff3d6" stroke-width="2.5" style="z-index:3"><path id="sl-mp" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M30 6 C40 20 40 40 40 70 L20 70 C20 40 20 20 30 6 Z M20 58 L10 78 L20 74 M40 58 L50 78 L40 74"/><path id="sl-mf" d="M26 74 L30 92 L34 74" stroke="#ff8a80" opacity="0"/></svg>
""", js="""
tl.fromTo("#sl-f",{y:900,rotation:10},{y:0,rotation:1.5,duration:.35,ease:"power3.out"},0.0);
tl.fromTo("#sl-tag",{opacity:0,scale:1.4},{opacity:1,scale:1,duration:.15},1.4);
tl.fromTo("#sl-b1",{scaleX:1},{scaleX:0,duration:.3,ease:"power2.in"},5.35);
tl.fromTo("#sl-b2",{scaleX:1},{scaleX:0,duration:.35,ease:"power2.in"},6.1);
tl.fromTo("#sl-mp",{strokeDashoffset:1},{strokeDashoffset:0,duration:.6,ease:"steps(8)"},6.55);
tl.fromTo("#sl-mf",{opacity:0},{opacity:1,duration:.05,yoyo:true,repeat:5},7.15);
""")
# ------------------------------------------------------------------- AKHIR
S["akhir"] = dict(css="""
#ak-l { left:80px; top:240px; width:920px; height:620px; transform:rotate(-1.5deg); padding:56px 60px; }
#ak-c { position:absolute; left:248px; top:228px; }
#ak-t { left:80px; top:900px; font-size:130px; }
#ak-q { left:80px; top:1040px; transform:rotate(-2deg); }
#root .sig { position:relative; display:inline-block; }
#root .sig .bar { position:absolute; inset:-4px -8px; background:#111; transform-origin:100% 50%; }
""", html=f"""
<div id="ak-l" class="card"><div class="st" style="font-size:66px;letter-spacing:3px">TAWARAN KERJA</div>
<div class="cr" style="font-size:42px;line-height:1.8;margin-top:30px">Jawatan: <span class="rd">██████████</span><br>Gaji: <span class="rd">█████</span> <span class="mk red" style="font-size:44px">terlalu bagus</span><br><br>Penemuduga:<br><span class="sig"><span class="an red" style="font-size:72px">???</span><i class="bar" id="ak-sb"></i></span></div>
<svg id="ak-c" width="420" height="120" viewBox="0 0 420 120" style="overflow:visible"><path id="ak-cp" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M30 60 C30 10 390 0 400 55 C410 110 40 120 20 70 C10 40 80 20 120 18" fill="none" stroke="#c4241d" stroke-width="7"/></svg></div>
{pin(540, 256)}
<div id="ak-t" class="an cream" style="opacity:0">FIKIR <span style="color:#ff7a6e">DUA KALI.</span></div>
<div id="ak-q" class="tag" style="opacity:0;font-size:40px;white-space:normal;width:900px;line-height:1.3">Pernah dapat tawaran kerja pelik? Komen ↓</div>
""", js="""
tl.fromTo("#ak-l",{y:900,rotation:-10},{y:0,rotation:-1.5,duration:.35,ease:"power3.out"},0.0);
tl.fromTo("#ak-cp",{strokeDashoffset:1},{strokeDashoffset:0,duration:.5,ease:"steps(8)"},1.9);
tl.fromTo("#ak-t",{opacity:0,scale:1.15},{opacity:1,scale:1,duration:.15,ease:"power4.in",transformOrigin:"0% 50%"},2.85);
tl.fromTo("#ak-sb",{scaleX:1},{scaleX:0,duration:.35,ease:"power2.in"},5.85);
tl.fromTo("#ak-q",{opacity:0,y:30},{opacity:1,y:0,duration:.25},7.3);
""")

def scene_file(sid, dur, d):
    jr = random.Random(sum(map(ord, sid)))
    dx, dy = jr.uniform(-14, 14), jr.uniform(-10, 10)
    push = f'tl.fromTo("#{sid}-jit",{{scale:1,x:0,y:0}},{{scale:1.04,x:{dx:.1f},y:{dy:.1f},duration:{dur},ease:"none"}},0);'
    return f"""<template>
<style>{BASE_CSS}{d['css']}</style>
<div id="root" data-composition-id="{sid}" data-width="1080" data-height="1920" data-start="0" data-duration="{dur}">
<div class="jit" id="{sid}-jit">
{d['html']}
</div>
</div>
<script>
(function(){{
const tl = gsap.timeline({{ paused: true }});
{push}
{d['js']}
window.__timelines["{sid}"] = tl;
}})();
</script>
</template>
"""

# ------------------------------------------------------------------- CAPTIONS (redaction reveal)
words = json.load(open(os.path.join(ROOT, "assets", "transcript.json")))
words = words.get("words", words) if isinstance(words, dict) else words
W = [dict(text=w["text"].strip(), start=w["start"], end=w["end"]) for w in words]
def find(t, after=0.0):
    for i, w in enumerate(W):
        if w["text"] == t and w["start"] >= after: return i
    raise KeyError(t)
def merge(i, text): W[i] = dict(text=text, start=W[i]["start"], end=W[i+1]["end"]); del W[i+1]
FIX = {"menit,": "minit,", "lezap": "lesap.", "kripto": "crypto", "Kripto": "crypto", "Bursa": "bursa", "Terbesar": "terbesar", "Dunia,": "dunia.", "gila.": "gila?",
       "Dompet": "dompet", "Nafi,": "nafi.", "tether,": "Tether,", "circle,": "Circle,", "billion,": "bilion,", "nukleer": "nuklear", "$6,300": "6,300", "Solana,": "Solana.",
       "Bitcoin,": "Bitcoin.", "XRP": "XRP.", "sejarah": "sejarah.", "4": "empat", "jari,": "jari:"}
i = find("di", 26.0); merge(i, "diceroboh,")
i = find("antara"); merge(i, "antarabangsa")
for w in W:
    if w["text"] in FIX: w["text"] = FIX[w["text"]]
W[find("kerja,", 12.0)]["text"] = "kerja."
W[find("dan")]["text"] = "Dan"
W[find("menit,", 18.0) if any(w["text"] == "menit," for w in W) else find("minit,", 18.0)]["text"] = "minit…"
W[find("juta")]["text"] = "juta dolar,"
W[find("rompakan")]["text"] = "Rompakan"
W[find("dan", 8.0)]["text"] = "Dan"
W[find("Utara,", 33.0)]["text"] = "Utara."
W[find("Utara,", 34.0)]["text"] = "Utara?"
W[find("tapi")]["text"] = "Tapi"
W[find("manusia,")]["text"] = "manusia."
W[find("ni,")]["text"] = "ni?"
for t, after, new in [("dan", 18.0, "Dan"), ("nafi.", 34.0, "Nafi."), ("laptop", 25.0, "Laptop"), ("pemantau", 43.0, "Pemantau"), ("mereka", 23.0, "Mereka"), ("godam,", 23.0, "godam…")]:
    W[find(t, after)]["text"] = new
MAXC = 22
def L(ws): return len(" ".join(x["text"] for x in ws))
def split_bal(ws):
    if L(ws) <= MAXC or len(ws) == 1: return [ws]
    best = min(range(1, len(ws)), key=lambda k: max(L(ws[:k]), L(ws[k:])) + (8 if ws[k-1]["text"].lower() in ("di", "ke", "dan", "yang", "dengan", "kepada", "untuk") else 0))
    return split_bal(ws[:best]) + split_bal(ws[best:])
sents, cur = [], []
for i, w in enumerate(W):
    cur.append(w); nxt = W[i+1] if i + 1 < len(W) else None
    if nxt is None or re.search(r"[.?…:]$", w["text"]) or nxt["start"] - w["end"] > 0.35:
        sents.append(cur); cur = []
groups = []
for snt in sents:
    if L(snt) <= MAXC: groups.append(snt); continue
    clauses, c = [], []
    for w in snt:
        c.append(w)
        if w["text"].endswith(","): clauses.append(c); c = []
    if c: clauses.append(c)
    pack = []
    for cl in clauses:
        if pack and L(pack + cl) <= MAXC: pack = pack + cl
        else:
            if pack: groups.extend(split_bal(pack))
            pack = cl
    if pack: groups.extend(split_bal(pack))
cap_html, cap_js = [], []
for gi, g in enumerate(groups):
    g0 = max(0.15, g[0]["start"] - 0.12)
    nxt0 = groups[gi+1][0]["start"] - 0.12 if gi + 1 < len(groups) else TOTAL - 0.1
    g1 = min(g[-1]["end"] + 0.45, nxt0)
    if gi + 1 == len(groups): g1 = TOTAL - 0.1
    spans = "".join(f'<span class="w" id="cap-{gi}-{wi}">{w["text"]}</span>{" " if wi + 1 < len(g) else ""}' for wi, w in enumerate(g))
    cap_html.append(f'<div class="grp" id="cap-{gi}"><span class="strip">{spans}</span></div>')
    js = [f'tl.set("#cap-{gi}",{{opacity:1,visibility:"visible"}},{g0:.3f});']
    for wi, w in enumerate(g):
        t = max(g0 + .02, w["start"] - 0.03)
        js.append(f'tl.set("#cap-{gi}-{wi}",{{backgroundColor:"rgba(17,17,17,0)",color:"#1c1a17",borderBottomColor:"#c4241d"}},{t:.3f});')
        if wi + 1 < len(g): js.append(f'tl.set("#cap-{gi}-{wi}",{{borderBottomColor:"rgba(196,36,29,0)"}},{g[wi+1]["start"]-0.03:.3f});')
    js.append(f'tl.to("#cap-{gi}",{{opacity:0,duration:.08}},{g1-0.08:.3f});tl.set("#cap-{gi}",{{opacity:0,visibility:"hidden"}},{g1:.3f});')
    cap_js.append("".join(js))
CAP = f"""<template>
<style>
{FONTS}
#root {{ position:absolute; inset:0; }}
#root .grp {{ position:absolute; left:80px; right:80px; top:1200px; text-align:left; opacity:0; visibility:hidden; }}
#root .strip {{ display:inline-block; white-space:pre; font:700 54px "CourierP",monospace; color:#1c1a17; background:#fbf8f0; padding:18px 28px 14px;
  box-shadow:4px 7px 0 rgba(0,0,0,.25),0 14px 26px rgba(0,0,0,.35); transform:rotate(-.6deg); }}
#root .w {{ background:#111; color:#111; border-bottom:6px solid rgba(196,36,29,0); }}
</style>
<div id="root" data-composition-id="captions" data-width="1080" data-height="1920" data-start="0" data-duration="{TOTAL}">
{chr(10).join(cap_html)}
</div>
<script>
(function(){{
const tl = gsap.timeline({{ paused: true }});
{chr(10).join(cap_js)}
window.__timelines["captions"] = tl;
}})();
</script>
</template>
"""

# ------------------------------------------------------------------- INDEX
CUTS = [s for _, s, _ in SCENES[1:]]
hosts = "\n".join(f'  <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{st}" data-duration="{du}" '
                  f'data-track-index="2" data-track-kind="graphics" data-width="1080" data-height="1920"></div>' for sid, st, du in SCENES)
flash_js = "".join(f'tl.fromTo("#flash",{{opacity:.85}},{{opacity:0,duration:.28,ease:"power2.out"}},{t:.2f});' for t in CUTS)
INDEX = f"""<!doctype html>
<html lang="ms">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="assets/lib/gsap.min.js"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ width:1080px; height:1920px; overflow:hidden; background:#9c6d42; }}
#root {{ position:relative; width:1080px; height:1920px; overflow:hidden; }}
#cork {{ position:absolute; inset:0; background:#9c6d42; }}
#corkt {{ position:absolute; inset:0; width:1080px; height:1920px; }}
#lamp {{ position:absolute; inset:0; z-index:30; pointer-events:none;
  background:radial-gradient(ellipse 75% 50% at 50% 38%,rgba(255,220,160,.20),transparent 60%),radial-gradient(ellipse 95% 75% at 50% 42%,transparent 42%,rgba(0,0,0,.66)); }}
#dark {{ position:absolute; inset:0; z-index:31; background:#000; opacity:0; }}
#flash {{ position:absolute; inset:0; z-index:32; background:#fffdf5; opacity:0; }}
#captions {{ z-index:20; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1080" data-height="1920" data-fps="30">
  <svg width="0" height="0" style="position:absolute"><defs><filter id="fc" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".45" numOctaves="3" seed="3"/>
  <feColorMatrix values="0 0 0 0 .35  0 0 0 0 .22  0 0 0 0 .12  0 0 0 .9 -.25"/></filter></defs></svg>
  <div id="cork" data-layout-ignore></div>
  <svg id="corkt" data-layout-ignore><rect width="1080" height="1920" filter="url(#fc)"/></svg>
{hosts}
  <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{TOTAL}" data-track-index="3" data-track-kind="captions" data-width="1080" data-height="1920"></div>
  <div id="lamp" data-layout-ignore></div>
  <div id="dark" data-layout-ignore></div>
  <div id="flash" data-layout-ignore></div>
  <audio id="vo" class="clip" src="assets/voiceover.mp3" data-start="0" data-duration="57.9" data-track-index="4" data-volume="1"></audio>
  <audio id="sfx" class="clip" src="assets/sfx.wav" data-start="0" data-duration="{TOTAL}" data-track-index="5" data-volume="0.55"></audio>
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
tl.set("#flash",{{opacity:0}},0);
tl.set("#dark",{{opacity:0}},0);
[[.25,.55],[.33,0],[.41,.4],[.47,0]].forEach(([t,o])=>tl.set("#dark",{{opacity:o}},t));
{flash_js}
tl.to("#dark",{{opacity:.55,duration:.08}},58.7);
window.__timelines["main"] = tl;
</script>
</body>
</html>
"""
os.makedirs(os.path.join(ROOT, "compositions"), exist_ok=True)
for sid, st, du in SCENES:
    open(os.path.join(ROOT, "compositions", f"{sid}.html"), "w").write(scene_file(sid, du, S[sid]))
open(os.path.join(ROOT, "compositions", "captions.html"), "w").write(CAP)
open(os.path.join(ROOT, "index.html"), "w").write(INDEX)
json.dump({"cuts": CUTS}, open(os.path.join(ROOT, "assets", "beats.json"), "w"))
print("groups", len(groups)); print(" | ".join(" ".join(w["text"] for w in g) for g in groups))
