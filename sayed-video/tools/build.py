#!/usr/bin/env python3
"""Build index.html + compositions/*.html for sayed-video ("237 Tahun"), KERTAS style with riso photo prints.
Beats come from assets/transcript.json (VO time). Local scene time = abs - scene start."""
import json, os, re, math, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOTAL = 61.5
SCENES = [("hook", 0.0, 7.0), ("halang", 7.0, 5.2), ("nama", 12.2, 1.65), ("asal", 13.85, 2.7), ("cv", 16.55, 5.4), ("kalah", 21.95, 9.0),
          ("serang", 30.95, 6.0), ("wang", 36.95, 9.0), ("menang", 45.95, 8.0), ("akhir", 53.95, 7.55)]
FONTS = r"""
@font-face{font-family:"Anton";src:url("assets/fonts/Anton.woff2") format("woff2")}
@font-face{font-family:"DMSerif";src:url("assets/fonts/DMSerifDisplay.woff2") format("woff2")}
@font-face{font-family:"Marker";src:url("assets/fonts/PermanentMarker.woff2") format("woff2")}
@font-face{font-family:"Typewriter";src:url("assets/fonts/SpecialElite.woff2") format("woff2")}
@font-face{font-family:"Narrow";font-weight:700;src:url("assets/fonts/ArchivoNarrow.woff2") format("woff2")}
"""
BASE_CSS = FONTS + r"""
#root { position:absolute; inset:0; color:#1d1b18; }
#root .jit { position:absolute; inset:0; }
#root .jit > * { position:absolute; }
#root .serif { font-family:"DMSerif",serif; line-height:.95; }
#root .anton { font-family:"Anton",sans-serif; line-height:.92; letter-spacing:1px; }
#root .mk { font-family:"Marker",cursive; line-height:1.05; }
#root .ty { font-family:"Typewriter",monospace; }
#root .red { color:#d23820; } #root .blue { color:#2e56b8; }
#root .card { background:#f6f1e7; box-shadow:5px 7px 0 rgba(0,0,0,.10),0 18px 40px rgba(0,0,0,.14); }
#root .tape { width:220px; height:62px; background:rgba(236,222,170,.78); box-shadow:0 2px 4px rgba(0,0,0,.12); }
#root .dymo { display:inline-block; background:#141414; color:#f4f4f4; font:700 52px "Narrow",sans-serif; letter-spacing:7px; padding:16px 28px 13px; border-radius:7px;
  text-shadow:0 -2px 0 rgba(0,0,0,.8),0 2px 0 rgba(255,255,255,.22); box-shadow:0 4px 7px rgba(0,0,0,.3); white-space:nowrap; }
#root .stamp { display:inline-block; font:400 66px "Anton",sans-serif; letter-spacing:6px; border:9px solid currentColor; border-radius:14px; padding:6px 26px; mix-blend-mode:multiply; opacity:.9; white-space:nowrap; }
#root .sticky { background:#f8e36a; box-shadow:5px 9px 18px rgba(0,0,0,.2); font:58px/1.08 "Marker",cursive; padding:36px 32px; }
#root .riso { position:relative; display:inline-block; }
#root .riso .ghost { position:absolute; left:7px; top:5px; color:#2e56b8; opacity:.5; mix-blend-mode:multiply; white-space:nowrap; }
#root .riso .main { position:relative; }
"""
rnd = random.Random(11)
def torn(n=30, j=16):
    p = []
    for i in range(n + 1): p.append(f"{i/n*100:.1f}% {rnd.random()*j:.1f}px")
    for i in range(n + 1): p.append(f"calc(100% - {rnd.random()*j:.1f}px) {i/n*100:.1f}%")
    for i in range(n, -1, -1): p.append(f"{i/n*100:.1f}% calc(100% - {rnd.random()*j:.1f}px)")
    for i in range(n, -1, -1): p.append(f"{rnd.random()*j:.1f}px {i/n*100:.1f}%")
    return "clip-path:polygon(" + ",".join(p) + ")"
RF = ["'Anton'", "'DMSerif'", "'Typewriter'", "'Narrow'", "'Marker'"]
def ransom(text, size, pid):
    out, k = [], 0
    for w in text.split(" "):
        letters = []
        for ch in w:
            f = RF[int(rnd.random() * 5)]; r = rnd.random()
            bg = "#1d1b18" if r < .18 else "#e5422b" if r < .32 else "#2e56b8" if r < .42 else "#fffaf0" if r < .6 else "#f6dc3c" if r < .75 else "#d8cfc0"
            c = "#f6f1e7" if r < .42 else "#1d1b18"
            letters.append(f'<span id="{pid}-{k}" style="display:inline-block;margin:4px 2px;padding:5px 11px 0;line-height:1;font-family:{f};font-size:{size*(0.85+rnd.random()*.35):.0f}px;'
                           f'background:{bg};color:{c};transform:rotate({(rnd.random()-.5)*12:.1f}deg);box-shadow:2px 2px 0 rgba(0,0,0,.18)">{ch}</span>'); k += 1
        out.append(f'<span style="display:inline-block;white-space:nowrap;margin-right:20px">{"".join(letters)}</span>')
    return "".join(out), k
def circ(w, h, c="#e5422b", sw=10, pid=""):
    pts = []
    for i in range(41):
        a = i / 36 * math.pi * 2 - .3; rx = w / 2 * (1 + (rnd.random() - .5) * .06); ry = h / 2 * (1 + (rnd.random() - .5) * .08)
        pts.append(f"{'L' if i else 'M'}{w/2+rx*math.cos(a):.1f},{h/2+ry*math.sin(a):.1f}")
    return (f'<svg width="{w+40}" height="{h+40}" viewBox="-20 -20 {w+40} {h+40}" style="overflow:visible"><path id="{pid}" d="{"".join(pts)}" pathLength="1" '
            f'stroke-dasharray="1" stroke-dashoffset="1" fill="none" stroke="{c}" stroke-width="{sw}" stroke-linecap="butt"/></svg>')
def riso(text, cls=""):
    return f'<span class="riso {cls}" data-layout-allow-overlap><span class="ghost">{text}</span><span class="main">{text}</span></span>'

S = {}
SM = 'const SM="steps(5)", SM8="steps(8)";'
# --------------------------------------------------------------- SCENES (sayed-video)
def photo(pid, src, x, y, w, h, rot, extra=""):
    return (f'<div id="{pid}" class="print" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;transform:rotate({rot}deg);{torn(28, 14)};{extra}">'
            f'<img src="assets/print/{src}" style="width:100%;height:100%;object-fit:cover;display:block"></div>')
CRED_H = '<div class="cred">Foto: Conlan Houston / CC BY-SA 4.0 (diubah)</div>'
CRED_T = '<div class="cred">Foto: via Threads</div>'
EXTRA_CSS = r"""
#root .print { box-shadow:5px 8px 0 rgba(0,0,0,.12),0 20px 40px rgba(0,0,0,.18); background:#f6f1e7; }
#root .cred { font:500 28px "Typewriter",monospace; color:#3b3833; background:rgba(246,241,231,.9); padding:4px 12px; white-space:nowrap; }
#root .tl { height:10px; background:#1d1b18; transform-origin:0 50%; }
"""
BASE_CSS = BASE_CSS + EXTRA_CSS
# --- 01 HOOK ---------------------------------------------------------------
S["hook"] = dict(css="""
#hk-k { left:80px; top:210px; font-size:36px; letter-spacing:5px; }
#hk-n { left:66px; top:260px; font-size:360px; color:#d23820; }
#hk-y { left:80px; top:600px; font-size:120px; }
#hk-s { left:80px; top:760px; width:920px; font-size:76px; }
#hk-hl { position:relative; display:inline-block; isolation:isolate; }
#hk-hlb { position:absolute; left:-6px; right:-6px; top:55%; bottom:0; background:#f6dc3c; transform-origin:0 50%; z-index:-1; }
#hk-tl { left:80px; top:1010px; width:920px; }
#hk-a { left:80px; top:1035px; font-size:44px; } #hk-b { left:880px; top:1035px; font-size:44px; color:#d23820; }
#hk-st { left:420px; top:1090px; color:#d23820; transform:rotate(-7deg); }
""", html=f"""
<div id="hk-k" class="ty">SENAT AMERIKA SYARIKAT</div>
<div id="hk-n" class="anton">{riso("237")}</div>
<div id="hk-y" class="anton">TAHUN.</div>
<div id="hk-s" class="serif" style="opacity:0">Tak pernah ada seorang <span id="hk-hl"><span id="hk-hlb"></span>Muslim</span> dipilih jadi senator.</div>
<div id="hk-tl" class="tl"></div><div id="hk-a" class="anton" style="opacity:0">1789</div><div id="hk-b" class="anton" style="opacity:0">2026</div>
<div id="hk-st" style="opacity:0"><span class="stamp" style="font-size:56px">SAMPAI MALAM NI</span></div>
""", js="""
tl.fromTo("#hk-s",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:1.6,ease:"steps(16)"},2.35);
tl.fromTo("#hk-hlb",{scaleX:0},{scaleX:1,duration:.35,ease:SM8},3.95);
tl.fromTo("#hk-tl",{scaleX:0},{scaleX:1,duration:.8,ease:SM8},4.9);
tl.fromTo("#hk-a",{opacity:0},{opacity:1,duration:.05},4.95);
tl.fromTo("#hk-b",{opacity:0},{opacity:1,duration:.05},5.7);
tl.fromTo("#hk-st",{opacity:0,scale:1.8},{opacity:1,scale:1,duration:.12,ease:"power4.in"},6.42);
""")
# --- 02 HALANG ---------------------------------------------------------------
S["halang"] = dict(css="""
#hl-a { left:80px; top:240px; font-size:40px; letter-spacing:3px; }
#hl-q { left:700px; top:200px; font-size:300px; color:#d23820; transform:rotate(8deg); line-height:1; }
#hl-t { left:80px; top:440px; font-size:150px; }
#hl-tape { left:-120px; top:880px; width:1320px; height:130px; transform:rotate(-8deg);
  background:repeating-linear-gradient(-45deg,#f6dc3c 0 60px,#1d1b18 60px 120px); box-shadow:0 10px 24px rgba(0,0,0,.25); }
#hl-tape span { position:absolute; left:0; right:0; top:28px; text-align:center; font:400 64px "Anton"; letter-spacing:10px; color:#f6f1e7; text-shadow:0 0 0 #000; }
#hl-tl { position:absolute; inset:18px 0; background:#1d1b18; opacity:.85; }
""", html="""
<div id="hl-a" class="ty" style="opacity:0">DAN BAHAGIAN PALING GILA?</div>
<div id="hl-q" class="mk" style="opacity:0" data-layout-ignore>?</div>
<div id="hl-t" class="anton" style="opacity:0">ADA ORANG<br>CUBA <span class="red">HALANG</span><br>DIA.</div>
<div id="hl-tape" style="opacity:0"><div id="hl-tl"></div><span>HALANG · HALANG · HALANG</span></div>
""", js="""
tl.fromTo("#hl-a",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.6,ease:"steps(10)"},0.2);
tl.fromTo("#hl-q",{opacity:0,clipPath:"inset(0 0 100% 0)"},{opacity:1,clipPath:"inset(0 0 0% 0)",duration:.4,ease:SM8},1.1);
tl.fromTo("#hl-t",{opacity:0,scale:1.15},{opacity:1,scale:1,duration:.15,ease:"power4.in",transformOrigin:"0% 50%"},1.6);
tl.fromTo("#hl-tape",{opacity:0,x:-1400},{opacity:1,x:0,duration:.3,ease:SM},4.15);
""")
# --- 03 NAMA ---------------------------------------------------------------
S["nama"] = dict(css="""
#nm-t { left:420px; top:196px; transform:rotate(-4deg); }
#nm-d1 { left:80px; top:960px; transform:rotate(-2deg); }
#nm-d2 { left:100px; top:1060px; transform:rotate(2deg); }
#nm-c { left:560px; top:1140px; }
""", html=f"""
{photo("nm-p", "riso-houston-6.png", 80, 220, 920, 700, -2)}
<div id="nm-t" class="tape"></div>
<div id="nm-d1" style="opacity:0"><span class="dymo" style="font-size:60px">ABDUL EL-SAYED</span></div>
<div id="nm-d2" style="opacity:0"><span class="dymo" style="font-size:40px">UMUR 42 · MICHIGAN</span></div>
<div id="nm-c">{CRED_H}</div>
""", js="""
tl.fromTo("#nm-p",{x:900,rotation:10},{x:0,rotation:-2,duration:.35,ease:SM},0.0);
tl.fromTo("#nm-t",{opacity:0},{opacity:1,duration:.05},0.35);
tl.fromTo("#nm-d1",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.4,ease:"steps(8)"},0.6);
tl.fromTo("#nm-d2",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.35,ease:"steps(7)"},1.1);
""")
# --- 04 ASAL ---------------------------------------------------------------
S["asal"] = dict(css="""
#as-s1 { left:90px; top:300px; width:400px; height:500px; transform:rotate(-6deg); }
#as-s2 { left:590px; top:380px; width:400px; height:500px; transform:rotate(5deg); }
#root .stp { background:#f6f1e7; border:16px dashed #f6f1e7; outline:8px solid #2e56b8; text-align:center; padding-top:150px; box-shadow:5px 8px 0 rgba(0,0,0,.12),0 20px 40px rgba(0,0,0,.18); }
#as-ar { left:0; top:0; }
#as-c { left:80px; top:920px; width:920px; padding:34px 40px; transform:rotate(-1.5deg); }
""", html="""
<div id="as-s1" class="stp"><div class="anton red" style="font-size:96px">MESIR</div><div class="ty" style="font-size:32px;margin-top:20px">asal keluarga</div></div>
<div id="as-s2" class="stp" style="opacity:0"><div class="anton blue" style="font-size:84px">MICHIGAN</div><div class="ty" style="font-size:32px;margin-top:20px">lahir 1984</div></div>
<svg id="as-ar" width="1080" height="1920" style="z-index:5"><path id="as-arp" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M330 300 C430 120 690 130 790 360" fill="none" stroke="#d23820" stroke-width="12"/></svg>
<div id="as-c" class="card" style="opacity:0"><div class="ty" style="font-size:32px">BAPA:</div><div class="serif" style="font-size:80px;margin-top:6px">profesor kejuruteraan &amp; <span class="blue">imam</span>.</div></div>
""", js="""
tl.fromTo("#as-s1",{y:-200,rotation:-14},{y:0,rotation:-6,duration:.3,ease:SM},0.0);
tl.fromTo("#as-arp",{strokeDashoffset:1},{strokeDashoffset:0,duration:.5,ease:SM8},0.3);
tl.fromTo("#as-s2",{opacity:0,y:-200,rotation:14},{opacity:1,y:0,rotation:5,duration:.3,ease:SM},0.75);
tl.fromTo("#as-c",{opacity:0,y:200},{opacity:1,y:0,duration:.3,ease:SM},1.2);
""")
# --- 05 CV ---------------------------------------------------------------
CVI = [("DOKTOR PERUBATAN", "Columbia University", 0.1), ("PhD · OXFORD", "Rhodes Scholar", 1.45), ("UMUR 30: KETUA", "Kesihatan Detroit", 2.8)]
cv_html = "".join(f'<div id="cv-i{i}" style="display:flex;gap:30px;align-items:center;margin:34px 0;opacity:0"><span class="mk red" style="font-size:90px;line-height:1">✓</span>'
                  f'<div><div class="anton" style="font-size:72px">{a}</div><div class="ty" style="font-size:36px;margin-top:8px">{b}</div></div></div>' for i, (a, b, t) in enumerate(CVI))
cv_js = "".join(f'tl.fromTo("#cv-i{i}",{{opacity:0,x:-60}},{{opacity:1,x:0,duration:.25,ease:SM}},{t:.2f});' for i, (a, b, t) in enumerate(CVI))
S["cv"] = dict(css="""
#cv-c { left:60px; top:220px; width:960px; padding:20px 50px; transform:rotate(-1.5deg); }
#cv-st { left:80px; top:900px; color:#d23820; transform:rotate(-9deg); }
#cv-cr { left:560px; top:1150px; }
""", html=f"""
<div id="cv-c" class="card">{cv_html}</div>
{photo("cv-p", "riso-user-3.png", 520, 860, 480, 270, 4)}
<div id="cv-st" style="opacity:0"><span class="stamp" style="font-size:70px">TERMUDA</span></div>
<div id="cv-cr">{CRED_T}</div>
""", js=cv_js + """
tl.fromTo("#cv-p",{opacity:0,y:200,rotation:12},{opacity:1,y:0,rotation:4,duration:.3,ease:SM},3.1);
tl.fromTo("#cv-st",{opacity:0,scale:1.8},{opacity:1,scale:1,duration:.12,ease:"power4.in"},4.75);
""")
# --- 06 KALAH -> BANGKIT ---------------------------------------------------
S["kalah"] = dict(css="""
#kl-c { left:60px; top:220px; width:620px; padding:30px 34px; transform:rotate(-4deg); }
#kl-st { position:absolute; left:330px; top:120px; color:#d23820; transform:rotate(-12deg); }
#kl-m1 { left:80px; top:560px; font-size:66px; width:920px; transform:rotate(-2deg); }
#kl-m2 { left:80px; top:700px; font-size:96px; transform:rotate(-3deg); }
#kl-pc { left:520px; top:1150px; }
""", html=f"""
<div id="kl-c" class="card"><div class="ty" style="font-size:30px;border-bottom:4px solid #1d1b18;padding-bottom:8px">2018 · GABENOR MICHIGAN</div><div class="anton" style="font-size:110px;margin-top:14px">EL-SAYED<br>~30%</div>
<div id="kl-st" data-layout-allow-overlap style="opacity:0;top:215px;left:360px"><span class="stamp" style="font-size:66px">KALAH</span></div></div>
<div id="kl-m1" class="mk" style="opacity:0">Dia boleh saja berhenti di situ…</div>
<div id="kl-m2" class="mk blue" style="opacity:0">DIA TAK BERHENTI.</div>
{photo("kl-p", "riso-user-2.png", 440, 560, 580, 590, 3, "opacity:0")}
<div id="kl-pc" style="opacity:0">{CRED_T}</div>
""", js="""
tl.fromTo("#kl-c",{y:-400,rotation:-14},{y:0,rotation:-4,duration:.3,ease:SM},0.05);
tl.fromTo("#kl-st",{opacity:0,scale:1.8},{opacity:1,scale:1,duration:.12,ease:"power4.in"},1.9);
tl.fromTo("#kl-m1",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:1.0,ease:"steps(12)"},3.1);
tl.fromTo("#kl-m2",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.5,ease:SM8},5.1);
tl.to(["#kl-m1","#kl-m2"],{opacity:0,duration:.1},6.2);
tl.fromTo("#kl-p",{opacity:0,x:600,rotation:12},{opacity:1,x:0,rotation:3,duration:.3,ease:SM},6.25);
tl.fromTo("#kl-pc",{opacity:0},{opacity:1,duration:.1},6.5);
""")
# --- 07 SERANGAN ---------------------------------------------------------------
rq, nq = ransom("“JIHADIST”", 120, "sr-l")
S["serang"] = dict(css="""
#sr-a { left:80px; top:220px; font-size:36px; letter-spacing:3px; }
#sr-r { left:60px; top:290px; width:960px; transform:rotate(-3deg); }
#sr-c { left:70px; top:720px; width:940px; padding:40px 44px; transform:rotate(2deg); background:#d23820; color:#fff3e8; }
#sr-n { left:620px; top:1110px; transform:rotate(-4deg); }
""", html=f"""
<div id="sr-a" class="ty">DIGELAR OLEH TRUMP &amp; SEKUTU:</div>
<div id="sr-r">{rq}</div>
<div id="sr-c" class="card" data-layout-allow-overlap style="opacity:0"><div class="serif" style="font-size:72px">“There is a very real risk that Americans will die.”</div><div class="ty" style="font-size:34px;margin-top:20px">— Senator Ted Cruz</div></div>
<div id="sr-n" style="opacity:0"><span class="dymo" style="background:#2e56b8">DIA NAFI</span></div>
""", js=f"""
for(let i=0;i<{nq};i++) tl.fromTo("#sr-l-"+i,{{opacity:0,y:-120,rotation:0}},{{opacity:1,y:0,duration:.1,ease:"steps(2)"}},1.4+i*0.09);
tl.fromTo("#sr-c",{{opacity:0,x:-700,rotation:-8}},{{opacity:1,x:0,rotation:2,duration:.3,ease:SM}},2.95);
tl.fromTo("#sr-n",{{opacity:0,scale:1.5}},{{opacity:1,scale:1,duration:.15}},5.65);
""")
# --- 08 WANG + KHIANAT ---------------------------------------------------------
S["wang"] = dict(css="""
#wg-r { left:120px; top:220px; width:620px; background:#fbfaf6; padding:40px 40px 60px; box-shadow:0 12px 28px rgba(0,0,0,.18); transform:rotate(-2deg); }
#wg-hl { position:relative; display:inline-block; isolation:isolate; }
#wg-hlb { position:absolute; left:-8px; right:-8px; top:45%; bottom:0; background:#f6dc3c; transform-origin:0 50%; z-index:-1; }
#wg-s { left:430px; top:640px; width:560px; transform:rotate(4deg); font-size:62px; }
#wg-m { left:80px; top:960px; width:900px; font-size:78px; transform:rotate(-3deg); }
""", html="""
<div id="wg-r"><div class="ty" style="font-size:32px;text-align:center;line-height:1.3">SENAT MICHIGAN 2026<br>PALING MAHAL DALAM SEJARAH</div><div style="border-top:3px dashed #555;margin:24px 0"></div>
<div class="anton" style="font-size:150px"><span id="wg-hl"><span id="wg-hlb"></span><span id="wg-n">$0</span></span></div><div class="ty" style="font-size:32px;margin-top:10px">perbelanjaan didedahkan (J = juta)</div></div>
<div id="wg-s" class="sticky" style="opacity:0">−2 HARI:<br>Stevens (D) sokong <span class="red">Rogers (R)</span></div>
<div id="wg-m" class="mk red" style="opacity:0">Nampak macam mustahil.</div>
""", js="""
tl.fromTo("#wg-r",{clipPath:"inset(0 0 100% 0)"},{clipPath:"inset(0 0 0% 0)",duration:.8,ease:"steps(10)"},0.0);
const wn=document.getElementById("wg-n"), Wv={v:0};
tl.fromTo(Wv,{v:0},{v:270,duration:.9,ease:"power2.out",onUpdate:()=>{wn.textContent="$"+Math.round(Wv.v)+"J+";}},0.05);
tl.fromTo("#wg-hlb",{scaleX:0},{scaleX:1,duration:.4,ease:SM8},1.3);
tl.fromTo("#wg-s",{opacity:0,scale:1.3,rotation:14},{opacity:1,scale:1,rotation:4,duration:.15,ease:"steps(3)"},3.1);
tl.fromTo("#wg-m",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.7,ease:"steps(10)"},8.0);
""")
# --- 09 MENANG ---------------------------------------------------------------
S["menang"] = dict(css="""
#mg-k { left:80px; top:220px; font-size:44px; letter-spacing:3px; }
#mg-st { left:330px; top:900px; color:#2e56b8; transform:rotate(-7deg); }
#mg-q { left:60px; top:960px; width:960px; padding:30px 40px; transform:rotate(1deg); }
#mg-c { left:120px; top:880px; }
""", html=f"""
<div id="mg-k" class="ty">KEPUTUSANNYA?</div>
<div id="mg-p" class="print" style="left:150px;top:200px;width:780px;height:672px;transform:rotate(-2deg);opacity:0"><img src="assets/print/thankyou.jpg" style="width:100%;height:100%;object-fit:cover;object-position:50% 30%;display:block"></div>
<div id="mg-c" style="opacity:0"><div class="cred">Grafik kempen via Threads</div></div>
<div id="mg-q" class="card" style="opacity:0"><div class="serif" style="font-size:62px">“You chose hate, and Michigan chose hope.”</div></div>
<div id="mg-st" style="opacity:0;z-index:9"><span class="stamp" style="font-size:72px;mix-blend-mode:normal;background:rgba(246,241,231,.92)">MENANG · ~6 MATA</span></div>
""", js="""
tl.fromTo("#mg-k",{opacity:1},{opacity:0,duration:.1},0.8);
tl.fromTo("#mg-p",{opacity:0,scale:1.25,rotation:-8},{opacity:1,scale:1,rotation:-2,duration:.14,ease:"power4.in"},0.95);
tl.fromTo("#mg-c",{opacity:0},{opacity:1,duration:.1},1.2);
tl.fromTo("#mg-st",{opacity:0,scale:1.8},{opacity:1,scale:1,duration:.12,ease:"power4.in"},2.15);
tl.to("#mg-st",{opacity:0,duration:.15},4.9);
tl.fromTo("#mg-q",{opacity:0,y:120},{opacity:1,y:0,duration:.3,ease:SM},5.0);
""")
# --- 10 AKHIR ---------------------------------------------------------------
S["akhir"] = dict(css="""
#ak-n { left:66px; top:200px; font-size:260px; color:#d23820; }
#ak-y { left:80px; top:470px; font-size:96px; }
#ak-tl { left:80px; top:640px; width:920px; }
#ak-a { left:80px; top:665px; font-size:44px; } #ak-b { left:880px; top:665px; font-size:44px; color:#d23820; }
#ak-c { left:820px; top:620px; }
#ak-m { left:80px; top:760px; font-size:72px; width:580px; transform:rotate(-3deg); }
#ak-cr { left:80px; top:1030px; }
#ak-cta { left:80px; top:1095px; }
""", html=f"""
<div id="ak-n" class="anton">{riso("237")}</div>
<div id="ak-y" class="serif" style="opacity:0">tahun… dipecahkan.</div>
<div id="ak-tl" class="tl"></div><div id="ak-a" class="anton">1789</div><div id="ak-b" class="anton">2026</div>
<div id="ak-c">{circ(170, 110, c="#d23820", pid="ak-cp")}</div>
{photo("ak-p", "riso-houston-10.png", 680, 740, 340, 380, 3, "opacity:0")}
<div id="ak-m" class="mk blue" style="opacity:0">…oleh seorang anak pendatang.</div>
<div id="ak-cta" style="opacity:0"><span class="dymo" style="font-size:34px">APA PENDAPAT KAU? KOMEN ↓</span></div>
<div id="ak-cr">{CRED_H}</div>
""", js="""
tl.fromTo("#ak-y",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.6,ease:"steps(8)"},0.9);
tl.fromTo("#ak-cp",{strokeDashoffset:1},{strokeDashoffset:0,duration:.5,ease:SM8},1.75);
tl.fromTo("#ak-p",{opacity:0,y:300,rotation:14},{opacity:1,y:0,rotation:3,duration:.3,ease:SM},2.0);
tl.fromTo("#ak-m",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:1.0,ease:"steps(12)"},2.7);
tl.fromTo("#ak-cta",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.4,ease:"steps(8)"},5.4);
""")

def scene_file(sid, dur, d):
    # 12fps hand jitter on the scene wrapper (stop-motion "boil")
    jr = random.Random(hash(sid) % 1000)
    sets = "".join(f'tl.set("#{sid}-jit",{{x:{jr.uniform(-2.5,2.5):.1f},y:{jr.uniform(-2.5,2.5):.1f},rotation:{jr.uniform(-.18,.18):.2f}}},{k/12:.3f});' for k in range(int(dur * 12)))
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
{SM}
{d['js']}
{sets}
window.__timelines["{sid}"] = tl;
}})();
</script>
</template>
"""

# --------------------------------------------------------------- CAPTIONS (paper strip, typed, highlighter)
words = json.load(open(os.path.join(ROOT, "assets", "transcript.json")))
words = words.get("words", words) if isinstance(words, dict) else words
W = [dict(text=w["text"].strip(), start=w["start"], end=w["end"]) for w in words]
def find(t, after=0.0):
    for i, w in enumerate(W):
        if w["text"] == t and w["start"] >= after: return i
    raise KeyError(t)
def merge(i, text): W[i] = dict(text=text, start=W[i]["start"], end=W[i+1]["end"]); del W[i+1]
i = find("El"); merge(i, "El-Sayed,")
i = find("Untuk"); merge(i, "Tahun ni,")
FIX = {"sekalipun,": "sekali pun,", "muslim": "Muslim", "Senator": "senator", "Amerika": "Amerika…", "gila,": "gila?", "mesir.": "Mesir.", "jihadis.": "\u201cjihadist\u201d.",
       "Keputusannya,": "Keputusannya?", "kau": "\u201cKau", "harapan.": "harapan.\u201d", "Dipecahkan": "dipecahkan", "tahun.": "tahun.", "cakap,": "cakap:"}
for w in W:
    if w["text"] in FIX: w["text"] = FIX[w["text"]]
W[find("tahun.", 54.0)]["text"] = "tahun…"
W[find("Amerika…", 35.0)]["text"] = "Amerika"
for t, after, new in [("sampai", 5.9, "Sampai"), ("ada", 8.5, "Ada"), ("dia", 46.9, "Dia"), ("imam,", 16.0, "imam.")]:
    W[find(t, after)]["text"] = new
MAXC = 24
def L(ws): return len(" ".join(x["text"] for x in ws))
def split_bal(ws):
    if L(ws) <= MAXC or len(ws) == 1: return [ws]
    best = min(range(1, len(ws)), key=lambda k: max(L(ws[:k]), L(ws[k:])) + (8 if ws[k-1]["text"].lower() in ("di", "ke", "dan", "yang", "dengan", "kepada", "untuk") else 0)
        + (20 if (ws[k-1]["text"].lower().strip(",.:"), ws[k]["text"].lower().strip(",.:")) in {("wakil","rakyat"),("perdana","menteri"),("dewan","rakyat"),("donald","trump"),("tak","bertanding")} else 0))
    return split_bal(ws[:best]) + split_bal(ws[best:])
def L(ws): return len(" ".join(x["text"] for x in ws))
def split_bal(ws):
    if L(ws) <= MAXC or len(ws) == 1: return [ws]
    best = min(range(1, len(ws)), key=lambda k: max(L(ws[:k]), L(ws[k:])) + (8 if ws[k-1]["text"].lower() in ("di", "ke", "dan", "yang", "dengan", "kepada", "untuk") else 0)
        + (20 if (ws[k-1]["text"].lower().strip(",.:"), ws[k]["text"].lower().strip(",.:")) in {("wakil","rakyat"),("perdana","menteri"),("dewan","rakyat"),("donald","trump"),("tak","bertanding")} else 0))
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
    g0 = max(0.15, g[0]["start"] - 0.05)
    nxt0 = groups[gi+1][0]["start"] - 0.05 if gi + 1 < len(groups) else TOTAL - 0.1
    g1 = min(g[-1]["end"] + 0.45, nxt0)
    if gi + 1 == len(groups): g1 = TOTAL - 0.1
    rot = (-1.2, 0.8, -0.5, 1.1)[gi % 4]
    spans = "".join(f'<span class="w" id="cap-{gi}-{wi}">{w["text"]}</span>{" " if wi + 1 < len(g) else ""}' for wi, w in enumerate(g))
    cap_html.append(f'<div class="grp" id="cap-{gi}"><span class="strip" style="transform:rotate({rot}deg)"><i class="tp"></i>{spans}</span></div>')
    js = [f'tl.set("#cap-{gi}",{{opacity:1,visibility:"visible"}},{g0:.3f});']
    for wi, w in enumerate(g):
        t = max(g0, w["start"] - 0.03)
        js.append(f'tl.set("#cap-{gi}-{wi}",{{opacity:1,backgroundColor:"#f6dc3c"}},{t:.3f});')
        if wi + 1 < len(g): js.append(f'tl.set("#cap-{gi}-{wi}",{{backgroundColor:"rgba(246,220,60,0)"}},{g[wi+1]["start"]-0.03:.3f});')
    js.append(f'tl.to("#cap-{gi}",{{opacity:0,duration:.08}},{g1-0.08:.3f});tl.set("#cap-{gi}",{{opacity:0,visibility:"hidden"}},{g1:.3f});')
    cap_js.append("".join(js))
CAP = f"""<template>
<style>
{FONTS}
#root {{ position:absolute; inset:0; }}
#root .grp {{ position:absolute; left:80px; right:80px; top:1200px; text-align:left; opacity:0; visibility:hidden; }}
#root .strip {{ position:relative; display:inline-block; white-space:pre; font:50px "Typewriter",monospace; color:#1d1b18; background:#fbf8f0; padding:18px 30px 14px;
  box-shadow:3px 5px 0 rgba(0,0,0,.12),0 10px 22px rgba(0,0,0,.18); }}
#root .tp {{ position:absolute; left:-24px; top:-16px; width:90px; height:34px; background:rgba(236,222,170,.8); transform:rotate(-24deg); }}
#root .w {{ opacity:0; padding:0 3px; }}
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

# --------------------------------------------------------------- INDEX
CUTS = [s for _, s, _ in SCENES[1:]]
hosts = "\n".join(f'  <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{st}" data-duration="{du}" '
                  f'data-track-index="2" data-track-kind="graphics" data-width="1080" data-height="1920"></div>' for sid, st, du in SCENES)
grain_js = "".join(f'tl.set("#gr1",{{opacity:{1 if k%2==0 else 0}}},{k/12:.3f});' for k in range(int(TOTAL * 12)))
swipe_js = "".join(f'tl.fromTo("#swipe",{{x:1200}},{{x:-1500,duration:.36,ease:"steps(6)"}},{t-0.18:.2f});' for t in CUTS)
INDEX = f"""<!doctype html>
<html lang="ms">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="assets/lib/gsap.min.js"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ width:1080px; height:1920px; overflow:hidden; background:#ece4d6; }}
#root {{ position:relative; width:1080px; height:1920px; overflow:hidden; }}
#paper {{ position:absolute; inset:0; background:#ece4d6; }}
.grain {{ position:absolute; inset:0; width:1080px; height:1920px; mix-blend-mode:multiply; pointer-events:none; }}
#gr0, #gr1 {{ z-index:30; opacity:.6; }}
#blot {{ z-index:1; }}
#vig {{ position:absolute; inset:0; z-index:31; background:radial-gradient(ellipse 80% 70% at 50% 45%,transparent 60%,rgba(60,40,20,.25)); }}
#swipe {{ position:absolute; top:-100px; left:0; width:1300px; height:2120px; z-index:25; background:#c9a878; box-shadow:0 0 60px rgba(0,0,0,.35); }}
#captions {{ z-index:20; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1080" data-height="1920" data-fps="30">
  <svg width="0" height="0" style="position:absolute"><defs>
   <filter id="fn0" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .4  0 0 0 0 .34  0 0 0 .5 0"/></filter>
   <filter id="fn1" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="17"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .4  0 0 0 0 .34  0 0 0 .5 0"/></filter>
   <filter id="fbl" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006" numOctaves="3" seed="9"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .42  0 0 0 0 .3  0 0 0 .45 -.08"/></filter>
  </defs></svg>
  <div id="paper" data-layout-ignore></div>
  <svg id="blot" class="grain" data-layout-ignore><rect width="1080" height="1920" filter="url(#fbl)"/></svg>
{hosts}
  <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{TOTAL}" data-track-index="3" data-track-kind="captions" data-width="1080" data-height="1920"></div>
  <div id="swipe" data-layout-ignore style="{torn(40, 40)}"></div>
  <svg id="gr0" class="grain" data-layout-ignore><rect width="1080" height="1920" filter="url(#fn0)"/></svg>
  <svg id="gr1" class="grain" data-layout-ignore><rect width="1080" height="1920" filter="url(#fn1)"/></svg>
  <div id="vig" data-layout-ignore></div>
  <audio id="vo" class="clip" src="assets/voiceover.mp3" data-start="0" data-duration="59.5" data-track-index="4" data-volume="1"></audio>
  <audio id="sfx" class="clip" src="assets/sfx.wav" data-start="0" data-duration="{TOTAL}" data-track-index="5" data-volume="0.55"></audio>
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
tl.set("#swipe",{{x:1200}},0);
{swipe_js}
{grain_js}
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
