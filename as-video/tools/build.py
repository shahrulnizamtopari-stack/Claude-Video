#!/usr/bin/env python3
"""Build index.html + compositions/*.html for as-video ("Kalah Tanpa Bertanding"), KERTAS style.
Beats come from assets/transcript.json (VO time). Local scene time = abs - scene start."""
import json, os, re, math, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOTAL = 95.8
SCENES = [("hook", 0.0, 7.85), ("tunggu", 7.85, 3.5), ("banding", 11.35, 7.35), ("masa", 18.7, 7.85), ("rapot", 26.55, 5.05),
          ("kunci", 31.6, 6.5), ("senat", 38.1, 8.25), ("dewan", 46.35, 4.6), ("negeri", 50.95, 9.8), ("resit", 60.75, 12.55),
          ("topi", 73.3, 8.0), ("sekat", 81.3, 7.55), ("akhir", 88.85, 6.95)]
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
# --------------------------------------------------------------- HOOK
rq, nq = ransom("SAYA TAK ADA DALAM KERTAS UNDI.", 84, "hook-l")
S["hook"] = dict(css="""
#hook-card { left:60px; top:220px; width:960px; padding:46px 40px 40px; transform:rotate(-2deg); }
#hook-tape { left:420px; top:192px; transform:rotate(-4deg); }
#hook-m { left:80px; top:620px; font-size:100px; color:#e5422b; transform:rotate(-3deg); }
#hook-tag { left:80px; top:960px; font-size:34px; background:#fffaf0; padding:10px 18px; transform:rotate(1deg); }
#hook-st { left:360px; top:1070px; color:#e5422b; transform:rotate(-6deg); }
#hook-st .stamp { font-size:50px; }
""", html=f"""
<div id="hook-card" class="card" style="{torn()}">{rq}</div>
<div id="hook-tape" class="tape"></div>
<div id="hook-m" class="mk"><span id="hook-m1">Kalau ada…</span><br><span id="hook-m2">kami menang</span><br><span id="hook-m3">BESAR!</span></div>
<div id="hook-tag" class="ty" style="opacity:0">— DONALD TRUMP · TRUTH SOCIAL</div>
<div id="hook-st" style="opacity:0"><span class="stamp">SEHARI SELEPAS KALAH</span></div>
""", js=f"""
["#hook-m1","#hook-m2","#hook-m3"].forEach((s,i)=>tl.fromTo(s,{{clipPath:"inset(0 100% 0 0)"}},{{clipPath:"inset(0 0% 0 0)",duration:[.5,.45,.5][i],ease:SM8}},[1.9,2.7,3.5][i]));
tl.fromTo("#hook-tag",{{opacity:0}},{{opacity:1,duration:.4,ease:"steps(4)"}},4.35);
tl.fromTo("#hook-st",{{opacity:0,scale:1.8}},{{opacity:1,scale:1,duration:.12,ease:"power4.in"}},6.95);
for(let i=0;i<{nq};i++) tl.fromTo("#hook-l-"+i,{{y:0}},{{y:-6,duration:.08,yoyo:true,repeat:1,ease:"none"}},0.2+i*0.04);
""")
# --------------------------------------------------------------- TUNGGU
S["tunggu"] = dict(css="""
#tg-a { left:80px; top:220px; font-size:38px; letter-spacing:4px; }
#tg-b { left:80px; top:280px; width:920px; font-size:112px; }
#tg-hl { position:relative; display:inline-block; isolation:isolate; }
#tg-hlb { position:absolute; left:-6px; right:-6px; top:52%; bottom:2%; background:#f6dc3c; transform-origin:0 50%; z-index:-1; }
#tg-c { left:80px; top:680px; width:920px; font-size:140px; }
#tg-q { left:740px; top:760px; font-size:380px; color:#e5422b; transform:rotate(10deg); line-height:1; opacity:.92; }
#tg-dots { left:0; right:0; top:1340px; height:600px; background-image:radial-gradient(circle,rgba(29,27,24,.22) 3px,transparent 4px); background-size:18px 18px; }
""", html="""
<div id="tg-dots" data-layout-ignore></div>
<div id="tg-a" class="ty">TAPI TUNGGU…</div>
<div id="tg-b" class="serif" style="opacity:0">Trump <span id="tg-hl"><span id="tg-hlb"></span>tak bertanding</span> pun.</div>
<div id="tg-c" class="anton" style="opacity:0">MACAM MANA<br>DIA BOLEH<br>KALAH?</div>
<div id="tg-q" class="mk" style="opacity:0" data-layout-ignore>?</div>
""", js="""
tl.fromTo("#tg-b",{opacity:0,x:120},{opacity:1,x:0,duration:.3,ease:SM},0.75);
tl.fromTo("#tg-hlb",{scaleX:0},{scaleX:1,duration:.4,ease:SM8},1.3);
tl.fromTo("#tg-c",{opacity:0,scale:1.2},{opacity:1,scale:1,duration:.15,ease:"power4.in",transformOrigin:"0% 50%"},2.25);
tl.fromTo("#tg-q",{opacity:0,clipPath:"inset(0 0 100% 0)"},{opacity:.92,clipPath:"inset(0 0 0% 0)",duration:.45,ease:SM8},2.7);
""")
# --------------------------------------------------------------- BANDING
S["banding"] = dict(css="""
#bd-l { left:44px; top:220px; width:480px; height:780px; transform:rotate(-2deg); padding:40px 34px; }
#bd-r { left:556px; top:250px; width:480px; height:760px; transform:rotate(2deg); padding:40px 34px; }
#root .bt { font:400 78px "Anton"; }
#root .bs { font-size:30px; margin-top:8px; }
#root .ar { font:64px "Marker"; margin:4px 0 0 60px; line-height:1; }
#root .bx { border:6px solid #1d1b18; padding:16px 20px; font:58px "DMSerif"; margin-top:26px; }
#root .bx .ty { font-size:28px; margin-top:6px; }
#bd-t1 { left:150px; top:196px; transform:rotate(5deg); } #bd-t2 { left:700px; top:236px; transform:rotate(-6deg); }
#bd-m { left:80px; top:1040px; width:920px; font-size:50px; transform:rotate(-2deg); }
""", html=f"""
<div id="bd-l" class="card" style="opacity:0;{torn()}"><div class="bt">MALAYSIA</div><div class="ty bs">PRU · setiap ≤5 tahun</div>
 <div id="bd-l1" style="margin-top:40px;opacity:0"><span class="dymo" style="font-size:40px">KITA UNDI</span><div class="ar">↓</div></div>
 <div id="bd-l2" style="opacity:0"><span class="dymo" style="font-size:40px">WAKIL RAKYAT</span><div class="ar">↓</div></div>
 <div id="bd-l3" class="serif" style="font-size:96px;margin-top:6px;opacity:0">Perdana<br>Menteri</div></div>
<div id="bd-r" class="card" style="opacity:0;{torn()}"><div class="bt">AMERIKA</div><div class="ty bs">dua undi berasingan</div>
 <div id="bd-r1" class="bx" style="opacity:0">Presiden<div class="ty">setiap 4 tahun</div></div>
 <div id="bd-r2" class="mk red" style="font-size:56px;margin:24px 0 0 40px;opacity:0">≠ asing</div>
 <div id="bd-r3" class="bx" style="opacity:0">Kongres<div class="ty">setiap 2 tahun</div></div></div>
<div id="bd-t1" class="tape" style="opacity:0"></div><div id="bd-t2" class="tape" style="opacity:0"></div>
<div id="bd-m" class="mk" style="opacity:0">Di sana, presiden &amp; parlimen <span class="red">tak terikat.</span></div>
""", js="""
tl.fromTo("#bd-l",{opacity:0,x:-200,rotation:-8},{opacity:1,x:0,rotation:-2,duration:.3,ease:SM},0.28);
tl.fromTo("#bd-t1",{opacity:0},{opacity:1,duration:.05},0.6);
[["#bd-l1",.88],["#bd-l2",1.4],["#bd-l3",2.33]].forEach(([s,t])=>tl.fromTo(s,{opacity:0,y:-20},{opacity:1,y:0,duration:.2,ease:"steps(3)"},t));
tl.fromTo("#bd-r",{opacity:0,x:200,rotation:8},{opacity:1,x:0,rotation:2,duration:.3,ease:SM},4.48);
tl.fromTo("#bd-t2",{opacity:0},{opacity:1,duration:.05},4.8);
[["#bd-r1",4.93],["#bd-r3",5.6]].forEach(([s,t])=>tl.fromTo(s,{opacity:0,y:-20},{opacity:1,y:0,duration:.2,ease:"steps(3)"},t));
tl.fromTo("#bd-r2",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.35,ease:SM8},6.4);
tl.fromTo("#bd-m",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.6,ease:SM8},6.5);
""")
# --------------------------------------------------------------- MASA (4 vs 2 years)
X = {y: 140 + (y - 2024) * 200 for y in range(2024, 2029)}
ticks = "".join(f'<path d="M{X[y]} 668 L{X[y]} 732" stroke="#1d1b18" stroke-width="8"/><text x="{X[y]}" y="800" text-anchor="middle" font-family="Anton" font-size="54" fill="#1d1b18">{y}</text>' for y in X)
S["masa"] = dict(css="""
#ms-t { left:80px; top:220px; font-size:104px; width:920px; }
#ms-svg { left:0; top:0; }
#root .bar { height:100px; border-radius:6px; transform-origin:0 50%; mix-blend-mode:multiply; }
#root .bar span { position:absolute; left:24px; top:24px; font:400 50px "Anton"; color:#f6f1e7; letter-spacing:2px; white-space:nowrap; }
#ms-p { left:140px; top:430px; width:800px; background:#e5422b; }
#ms-d1 { left:140px; top:880px; width:394px; background:#2e56b8; }
#ms-d2 { left:546px; top:880px; width:394px; background:#2e56b8; }
#ms-c { left:440px; top:720px; }
#ms-ar { left:600px; top:1010px; font-size:60px; color:#e5422b; transform:rotate(-4deg); }
#ms-ar2 { left:120px; top:1010px; font-size:60px; transform:rotate(-2deg); }
""", html=f"""
<div id="ms-t" class="serif">Siapa diundi,<br>bila?</div>
<svg id="ms-svg" width="1080" height="1920"><path id="ms-line" d="M90 700 L990 700" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" stroke="#1d1b18" stroke-width="10"/><g id="ms-ticks" opacity="0">{ticks}</g></svg>
<div id="ms-p" class="bar"><span>PRESIDEN · 4 TAHUN</span></div>
<div id="ms-d1" class="bar"><span>DEWAN · 2 TAHUN</span></div>
<div id="ms-d2" class="bar"><span>DEWAN · 2 TAHUN</span></div>
<div id="ms-c">{circ(200, 140, pid="ms-cp")}</div>
<div id="ms-ar" class="mk" style="opacity:0">↑ undi lagi!</div>
""", js="""
tl.fromTo("#ms-t",{opacity:0,y:-30},{opacity:1,y:0,duration:.25,ease:SM},0.05);
tl.fromTo("#ms-line",{strokeDashoffset:1},{strokeDashoffset:0,duration:.5,ease:SM8},0.2);
tl.fromTo("#ms-ticks",{opacity:0},{opacity:1,duration:.2,ease:"steps(2)"},0.6);
tl.fromTo("#ms-p",{scaleX:0},{scaleX:1,duration:.6,ease:SM8},0.1);
tl.fromTo("#ms-d1",{scaleX:0},{scaleX:1,duration:.45,ease:SM8},2.2);
tl.fromTo("#ms-d2",{scaleX:0},{scaleX:1,duration:.45,ease:SM8},3.94);
tl.fromTo("#ms-cp",{strokeDashoffset:1},{strokeDashoffset:0,duration:.5,ease:SM8},5.08);
tl.fromTo("#ms-ar",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.4,ease:SM8},6.66);
""")
# --------------------------------------------------------------- RAPOT
S["rapot"] = dict(css="""
#rp-a { left:80px; top:220px; font-size:36px; letter-spacing:4px; }
#rp-b { left:70px; top:270px; font-size:250px; }
#rp-card { left:70px; top:640px; width:940px; padding:40px 44px; transform:rotate(-1.5deg); }
#rp-s { position:relative; display:inline-block; }
#rp-x { position:absolute; left:-8px; right:-8px; top:48%; height:12px; background:#e5422b; transform-origin:0 50%; }
""", html=f"""
<div id="rp-a" class="ty">PILIHAN RAYA SEPARUH PENGGAL</div>
<div id="rp-b" class="anton" style="opacity:0">{riso("MIDTERM")}</div>
<div id="rp-card" class="card" style="opacity:0;{torn()}"><div class="ty" style="font-size:34px">NAMA PRESIDEN DALAM KERTAS UNDI:</div>
<div class="serif" style="font-size:110px;margin-top:20px"><span id="rp-s">ADA<span id="rp-x"></span></span>&nbsp; <span id="rp-n" style="opacity:0">TIADA</span></div>
<div id="rp-m" class="mk blue" style="font-size:62px;margin-top:26px;opacity:0">…tapi ini rapot kad dia.</div></div>
""", js="""
tl.fromTo("#rp-b",{opacity:0,scale:1.25},{opacity:1,scale:1,duration:.14,ease:"power4.in",transformOrigin:"0% 50%"},0.38);
tl.fromTo("#rp-card",{opacity:0,y:160},{opacity:1,y:0,duration:.3,ease:SM},1.15);
tl.fromTo("#rp-x",{scaleX:0},{scaleX:1,duration:.3,ease:SM8},2.0);
tl.fromTo("#rp-n",{opacity:0},{opacity:1,duration:.15,ease:"steps(2)"},2.15);
tl.fromTo("#rp-m",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.6,ease:SM8},3.95);
""")
# --------------------------------------------------------------- KUNCI
DY = [("DUIT KERAJAAN", 1.68, -3, "#141414"), ("UNDANG-UNDANG", 2.7, 2, "#141414"), ("SIASATAN", 3.5, -1, "#141414"), ("DAKWA PRESIDEN", 5.5, 3, "#7a1b12")]
dy_html = "".join(f'<div id="kc-d{i}" style="left:{80+(i%2)*40}px;top:{640+i*125}px;transform:rotate({r}deg);opacity:0"><span class="dymo" style="background:{c}">{t}</span></div>' for i, (t, _, r, c) in enumerate(DY))
dy_js = "".join(f'tl.fromTo("#kc-d{i}",{{opacity:0,clipPath:"inset(0 100% 0 0)"}},{{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.35,ease:"steps(7)"}},{t:.2f});' for i, (_, t, _, _) in enumerate(DY))
S["kunci"] = dict(css="""
#kc-t { left:80px; top:220px; font-size:150px; }
#kc-k { left:640px; top:600px; }
""", html=f"""
<div id="kc-t" class="anton"><span id="kc-t1" style="opacity:0">KONGRES</span><br><span id="kc-t2" class="blue" style="opacity:0">PEGANG KUNCI.</span></div>
<svg id="kc-k" width="380" height="380" viewBox="0 0 160 160" style="opacity:0"><circle cx="45" cy="45" r="32" fill="none" stroke="#b8862c" stroke-width="16"/><path d="M68 68 L140 140 M110 110 L125 95 M125 125 L140 110" stroke="#b8862c" stroke-width="16" stroke-linecap="round"/></svg>
{dy_html}
""", js="""
tl.fromTo("#kc-t1",{opacity:0},{opacity:1,duration:.1,ease:"steps(1)"},0.3);
tl.fromTo("#kc-t2",{opacity:0,scale:1.15},{opacity:1,scale:1,duration:.15,ease:"power4.in",transformOrigin:"0% 50%"},0.8);
tl.fromTo("#kc-k",{opacity:0,y:-300,rotation:-60},{opacity:1,y:0,rotation:-25,duration:.3,ease:SM},1.0);
""" + dy_js)
# --------------------------------------------------------------- SENAT
def hemi():
    rows, R0, R1 = 5, 245, 430; rs = [R0 + (R1 - R0) * r / (rows - 1) for r in range(rows)]; tot = sum(rs); left = 100; per = []
    for i, rad in enumerate(rs):
        n = left if i == rows - 1 else round(100 * rad / tot); left -= n; per.append(n)
    seats = []
    for i, n in enumerate(per):
        for k in range(n):
            a = math.pi * (1 - k / (n - 1)); seats.append((a, 540 + rs[i] * math.cos(a), 470 - rs[i] * math.sin(a)))
    seats.sort(key=lambda s: -s[0])
    return "".join(f'<circle class="sd" cx="{x:.1f}" cy="{y:.1f}" r="22" fill="{"#2e56b8" if i < 54 else "#b9b1a3" if i < 56 else "#e5422b"}" opacity="0" style="mix-blend-mode:multiply"/>' for i, (a, x, y) in enumerate(seats))
S["senat"] = dict(css="""
#sn-card { left:50px; top:210px; width:980px; padding:26px 34px; transform:rotate(-1deg); }
#sn-l { left:80px; top:560px; font-size:34px; letter-spacing:4px; }
#sn-svg { left:0; top:560px; }
#sn-n { left:0; right:0; top:880px; text-align:center; font-size:120px; }
#sn-n2 { left:0; right:0; top:1085px; text-align:center; font-size:34px; }
#sn-st { left:700px; top:500px; color:#e5422b; transform:rotate(-10deg); }
#sn-st .stamp { font-size:46px; }
""", html=f"""
<div id="sn-card" class="card"><div class="ty" id="sn-dt" style="font-size:30px;border-bottom:4px solid #1d1b18;padding-bottom:10px">3 NOV 2026 · EDISI KHAS</div>
<div class="anton" id="sn-h" style="font-size:112px;margin-top:16px;opacity:0">DEMOKRAT RAMPAS<br>KEDUA-DUA DEWAN</div></div>
<div id="sn-l" class="ty" style="opacity:0">SENAT · 100 KERUSI</div>
<svg id="sn-svg" width="1080" height="500" viewBox="0 0 1080 500">{hemi()}</svg>
<div id="sn-n" class="mk blue" style="opacity:0">54+</div>
<div id="sn-n2" class="ty" style="opacity:0">daripada 100 · 2 belum diputuskan</div>
<div id="sn-st" data-layout-allow-overlap style="opacity:0"><span class="stamp">UNJURAN</span></div>
""", js="""
tl.fromTo("#sn-card",{y:-400},{y:0,duration:.3,ease:SM},0.0);
tl.fromTo("#sn-h",{opacity:0,clipPath:"inset(0 0 100% 0)"},{opacity:1,clipPath:"inset(0 0 0% 0)",duration:.5,ease:"steps(6)"},1.75);
tl.fromTo("#sn-l",{opacity:0},{opacity:1,duration:.1},3.9);
document.querySelectorAll("#sn-svg .sd").forEach((el,i)=>tl.fromTo(el,{opacity:0},{opacity:.92,duration:.01},3.95+i*0.022));
tl.fromTo("#sn-st",{opacity:0,scale:1.8},{opacity:1,scale:1,duration:.12,ease:"power4.in"},4.55);
tl.fromTo("#sn-n",{opacity:0,scale:1.3},{opacity:1,scale:1,duration:.15,ease:"power4.in"},6.2);
tl.fromTo("#sn-n2",{opacity:0},{opacity:1,duration:.3,ease:"steps(3)"},6.5);
""")
# --------------------------------------------------------------- DEWAN
dots = "".join(f'<circle class="dd" cx="{c*31+15:.0f}" cy="{r*31+15:.0f}" r="12" fill="#b9b1a3"/>' for r in range(15) for c in range(29))
S["dewan"] = dict(css="""
#dw-l { left:80px; top:220px; font-size:38px; letter-spacing:4px; }
#dw-t { left:80px; top:280px; font-size:96px; }
#dw-svg { left:90px; top:430px; }
#dw-n { left:80px; top:900px; font-size:230px; color:#2e56b8; }
#dw-u { left:560px; top:960px; font-size:36px; line-height:1.4; }
""", html=f"""
<div id="dw-l" class="ty">DEWAN RAKYAT · 435 KERUSI</div>
<div id="dw-t" class="anton">MAJORITI: <span class="red">218</span></div>
<svg id="dw-svg" width="900" height="465" viewBox="0 0 900 465">{dots}</svg>
<div id="dw-n" class="anton" style="opacity:0">250+</div>
<div id="dw-u" class="ty" style="opacity:0">Demokrat<br>daripada 435<br>(anggaran CBS)</div>
""", js="""
document.querySelectorAll("#dw-svg .dd").forEach((el,i)=>{ if(i<250) tl.fromTo(el,{fill:"#b9b1a3"},{fill:"#2e56b8",duration:.01},0.3+i*0.005); });
tl.fromTo("#dw-n",{opacity:0,scale:1.25},{opacity:1,scale:1,duration:.15,ease:"power4.in",transformOrigin:"0% 50%"},1.55);
tl.fromTo("#dw-u",{opacity:0},{opacity:1,duration:.3,ease:"steps(3)"},2.4);
""")
# --------------------------------------------------------------- NEGERI
STP = {"TX": "0,30 35,30 35,0 52,0 52,26 72,30 100,35 100,60 90,74 74,86 60,100 50,90 40,70 25,60 10,55",
       "KS": "0,0 88,0 94,8 100,14 100,100 0,100", "OH": "0,6 30,10 50,0 70,8 96,0 100,40 86,74 70,100 40,90 10,96 0,60"}
STATES = [("TX", "TEXAS", 60, 470, 360, 2.5), ("KS", "KANSAS", 450, 520, 280, 3.2), ("OH", "OHIO", 770, 500, 250, 4.25)]
st_html = "".join(f'<div id="ng-{k}" style="left:{x}px;top:{y}px;width:{w}px;opacity:0"><svg width="{w}" height="{w}" viewBox="-8 -8 116 116">'
                  f'<polygon points="{STP[k]}" fill="#e5422b" id="ng-r{k}"/><polygon id="ng-b{k}" points="{STP[k]}" fill="#2e56b8" opacity="0"/>'
                  f'<polygon id="ng-g{k}" points="{STP[k]}" fill="none" stroke="#e5422b" stroke-width="3" stroke-dasharray="6 4" transform="translate(-6 -5)" opacity="0"/></svg>'
                  f'<div style="margin-top:-6px"><span class="dymo" style="font-size:32px;letter-spacing:5px;padding:10px 18px 8px">{n}</span></div></div>' for k, n, x, y, w, t in STATES)
st_js = "".join(f'tl.fromTo("#ng-b{k}",{{opacity:0}},{{opacity:.92,duration:.05}},{t:.2f});tl.fromTo("#ng-r{k}",{{opacity:1}},{{opacity:0,duration:.05}},{t:.2f});'
                f'tl.fromTo("#ng-g{k}",{{opacity:0}},{{opacity:1,duration:.05}},{t:.2f});tl.fromTo("#ng-{k}",{{scale:1.08}},{{scale:1,duration:.15,ease:"steps(2)"}},{t:.2f});' for k, n, x, y, w, t in STATES)
S["negeri"] = dict(css="""
#ng-t { left:80px; top:210px; font-size:130px; }
#ng-q { left:60px; top:900px; width:960px; padding:30px 40px; transform:rotate(-2deg); }
""", html=f"""
<div id="ng-t" class="anton"><span id="ng-t1" style="opacity:0">NEGERI MERAH</span><br><span id="ng-t2" class="blue" style="opacity:0">PUN TUMBANG.</span></div>
{st_html}
<div id="ng-q" class="card" style="opacity:0;{torn()}"><div class="serif" style="font-size:66px">“It looks biblically bad.”</div>
<div id="ng-qm" class="mk red" style="font-size:52px;margin-top:10px;opacity:0">= teruk… tahap kiamat</div>
<div class="ty" style="font-size:30px;margin-top:10px">— strategis kanan Republikan (CBS)</div></div>
""", js="""
tl.fromTo("#ng-t1",{opacity:0},{opacity:1,duration:.1,ease:"steps(1)"},0.15);
tl.fromTo("#ng-t2",{opacity:0,scale:1.15},{opacity:1,scale:1,duration:.15,ease:"power4.in",transformOrigin:"0% 50%"},1.75);
["#ng-TX","#ng-KS","#ng-OH"].forEach((s,i)=>tl.fromTo(s,{opacity:0,y:-60,rotation:(i-1)*8},{opacity:1,y:0,rotation:(i-1)*4,duration:.25,ease:SM},1.2+i*0.12));
""" + st_js + """
tl.fromTo("#ng-q",{opacity:0,y:200},{opacity:1,y:0,duration:.3,ease:SM},4.9);
tl.fromTo("#ng-qm",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.5,ease:SM8},8.0);
""")
# --------------------------------------------------------------- RESIT
RL = [("BIMBANG HARGA MINYAK", "87%", 1.6, True), ("SALAHKAN DASAR TRUMP", "~60%", 4.6, False), ("PERANG IRAN 'SALAH'", "~62%", 9.8, False)]
rl_html = "".join(f'<div id="rs-i{i}" class="ty rl" style="opacity:0"><span>{a}</span><b id="rs-v{i}" style="opacity:0">{b}</b>{"<i id=rs-hl></i>" if h else ""}</div>' for i, (a, b, t, h) in enumerate(RL))
rl_js = "".join(f'tl.fromTo("#rs-i{i}",{{opacity:0}},{{opacity:1,duration:.25,ease:"steps(5)"}},{t:.2f});tl.fromTo("#rs-v{i}",{{opacity:0}},{{opacity:1,duration:.05}},{t+.5 if i!=2 else 11.85:.2f});' for i, (a, b, t, h) in enumerate(RL))
zig = ",".join(f"{p*5}% {'100%' if p % 2 else '97%'}" for p in range(21))
S["resit"] = dict(css=f"""
#rs-t {{ left:80px; top:210px; font-size:150px; }}
#rs-p {{ left:190px; top:500px; width:700px; background:#fbfaf6; padding:40px 40px 70px; box-shadow:0 12px 28px rgba(0,0,0,.18); transform:rotate(-1.5deg);
  clip-path:polygon(0 0,100% 0,{zig[0:0]}100% 97%,{zig});}}
#root .rl {{ position:relative; font-size:36px; display:flex; justify-content:space-between; margin:20px 0; }}
#rs-hl {{ position:absolute; left:-8px; right:-8px; top:38%; bottom:-4px; background:#f6dc3c; mix-blend-mode:multiply; transform-origin:0 50%; }}
#root .dash {{ border-top:3px dashed #555; margin:18px 0; }}
#rs-st {{ left:560px; top:980px; color:#e5422b; transform:rotate(-12deg); }}
""", html=f"""
<div id="rs-t" class="anton"><span id="rs-t1" style="opacity:0">KENAPA?</span><br><span id="rs-t2" class="red" style="opacity:0">HARGA.</span></div>
<div id="rs-p"><div class="ty" style="font-size:32px;text-align:center;line-height:1.3">EXIT POLL · MIDTERM 2026<br>NO. 000303</div><div class="dash"></div>
{rl_html}<div class="dash"></div><div id="rs-tot" class="ty rl" style="font-size:40px;opacity:0"><span>JUMLAH</span><b>UNDI PROTES</b></div>
<div class="ty" style="font-size:28px;text-align:center;margin-top:20px">sumber: exit poll CNN · CBS · AP</div></div>
<div id="rs-st" style="opacity:0"><span class="stamp">PROTES</span></div>
""", js="""
tl.fromTo("#rs-t1",{opacity:0},{opacity:1,duration:.1,ease:"steps(1)"},0.15);
tl.fromTo("#rs-t2",{opacity:0,scale:1.2},{opacity:1,scale:1,duration:.15,ease:"power4.in",transformOrigin:"0% 50%"},0.75);
tl.fromTo("#rs-p",{clipPath:"inset(0 0 100% 0)"},{clipPath:"inset(0 0 0% 0)",duration:1.0,ease:"steps(12)"},0.9);
""" + rl_js + """
tl.fromTo("#rs-hl",{scaleX:0},{scaleX:1,duration:.4,ease:SM8},2.3);
tl.fromTo("#rs-tot",{opacity:0},{opacity:1,duration:.1},11.9);
tl.fromTo("#rs-st",{opacity:0,scale:1.8},{opacity:1,scale:1,duration:.12,ease:"power4.in"},12.05);
""")
# --------------------------------------------------------------- TOPI
S["topi"] = dict(css="""
#tp-s1 { left:60px; top:220px; width:450px; transform:rotate(-4deg); }
#tp-s2 { left:560px; top:250px; width:460px; transform:rotate(3deg); background:#f4d0e0; }
#tp-j { left:240px; top:610px; font-size:52px; background:#1d1b18; color:#f6f1e7; padding:12px 30px; transform:rotate(-2deg); }
#tp-svg { left:60px; top:700px; }
""", html="""
<div id="tp-s1" class="sticky" style="opacity:0">“Tahniah, Demokrat!” <span class="blue">✓</span></div>
<div id="tp-s2" class="sticky" style="opacity:0">“Saya terima keputusan.” <span class="blue">✓</span></div>
<div id="tp-j" class="ty" style="opacity:0">+1 JAM KEMUDIAN…</div>
<svg id="tp-svg" width="960" height="440" viewBox="0 0 330 160"><g fill="none" stroke="#1d1b18" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
<path id="tp-p1" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M86 140 C84 70 130 34 172 34 C222 34 250 76 252 140 Z"/>
<path id="tp-p2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M250 136 C292 132 326 146 330 160 C300 170 262 164 236 152"/>
<path id="tp-p3" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M172 34 L172 24"/></g>
<text id="tp-v" x="168" y="112" text-anchor="middle" font-family="Marker" font-size="58" fill="#e5422b" opacity="0">VETO</text></svg>
""", js="""
tl.fromTo("#tp-s1",{opacity:0,scale:1.3,rotation:-12},{opacity:1,scale:1,rotation:-4,duration:.15,ease:"steps(3)"},0.4);
tl.fromTo("#tp-s2",{opacity:0,scale:1.3,rotation:12},{opacity:1,scale:1,rotation:3,duration:.15,ease:"steps(3)"},2.3);
tl.fromTo("#tp-j",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:.6,ease:"steps(14)"},3.65);
tl.fromTo("#tp-p1",{strokeDashoffset:1},{strokeDashoffset:0,duration:.8,ease:"steps(10)"},5.2);
tl.fromTo("#tp-p2",{strokeDashoffset:1},{strokeDashoffset:0,duration:.35,ease:"steps(5)"},6.0);
tl.fromTo("#tp-p3",{strokeDashoffset:1},{strokeDashoffset:0,duration:.1,ease:"steps(2)"},6.4);
tl.fromTo("#tp-v",{opacity:0,scale:1.6,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:.12,ease:"power4.in"},7.05);
""")
# --------------------------------------------------------------- SEKAT
MON = ["J", "F", "M", "A", "M", "J", "J", "O", "S", "O", "N", "D"]
def cal(yr, cid, x, y, r):
    cells = "".join(f'<div class="ty" data-layout-ignore style="font-size:30px;border:2px solid #bbb;height:86px;padding:4px 8px">{m}</div>' for m in MON)
    return (f'<div id="{cid}" class="card" style="left:{x}px;top:{y}px;width:540px;height:520px;transform:rotate({r}deg);padding:22px;opacity:0">'
            f'<div class="anton" style="font-size:62px;background:#e5422b;color:#fff;padding:6px 18px">{yr}</div>'
            f'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:22px">{cells}</div></div>')
STS = [(140, 700, -10, 5.1), (520, 660, 8, 5.4), (300, 860, -6, 5.9), (600, 900, 10, 6.15), (180, 1000, 4, 6.7)]
sts_html = "".join(f'<div id="sk-s{i}" data-layout-allow-overlap style="left:{x}px;top:{y}px;transform:rotate({r}deg);color:#2e56b8;opacity:0"><span class="stamp" style="font-size:60px">SEKAT</span></div>' for i, (x, y, r, t) in enumerate(STS))
sts_js = "".join(f'tl.fromTo("#sk-s{i}",{{opacity:0,scale:1.8}},{{opacity:1,scale:1,duration:.1,ease:"power4.in"}},{t:.2f});' for i, (x, y, r, t) in enumerate(STS))
S["sekat"] = dict(css="""
#sk-t { left:80px; top:210px; font-size:124px; }
#sk-l { left:80px; top:470px; font-size:36px; letter-spacing:3px; }
""", html=f"""
<div id="sk-t" class="anton"><span id="sk-t1" style="opacity:0">MASIH PRESIDEN</span><br><span id="sk-t2" style="opacity:0">SAMPAI <span class="red">2029.</span></span></div>
<div id="sk-l" class="ty" style="opacity:0">2 TAHUN TERAKHIR →</div>
{cal(2027, "sk-c1", 50, 560, -4)}{cal(2028, "sk-c2", 470, 600, 3)}
{sts_html}
""", js="""
tl.fromTo("#sk-t1",{opacity:0},{opacity:1,duration:.1,ease:"steps(1)"},0.3);
tl.fromTo("#sk-t2",{opacity:0,scale:1.15},{opacity:1,scale:1,duration:.15,ease:"power4.in",transformOrigin:"0% 50%"},1.85);
tl.fromTo("#sk-l",{opacity:0},{opacity:1,duration:.2,ease:"steps(2)"},3.45);
tl.fromTo("#sk-c1",{opacity:0,y:300,rotation:-12},{opacity:1,y:0,rotation:-4,duration:.3,ease:SM},3.5);
tl.fromTo("#sk-c2",{opacity:0,y:300,rotation:12},{opacity:1,y:0,rotation:3,duration:.3,ease:SM},3.7);
""" + sts_js)
# --------------------------------------------------------------- AKHIR
S["akhir"] = dict(css="""
#ak-a { left:80px; top:240px; font-size:40px; letter-spacing:4px; }
#ak-b { left:80px; top:310px; width:940px; font-size:150px; }
#ak-c { left:76px; top:800px; font-size:172px; color:#e5422b; }
#ak-u { left:60px; top:1120px; }
""", html=f"""
<div id="ak-a" class="ty" style="opacity:0">PENGAJARANNYA?</div>
<div id="ak-b" class="serif"><span id="ak-b1" style="opacity:0">Di Amerika,</span> <span id="ak-b2" style="opacity:0">presiden boleh kalah.</span></div>
<div id="ak-c" class="anton" style="opacity:0">{riso("TANPA")}<br>{riso("BERTANDING.")}</div>
<svg id="ak-u" width="960" height="70" viewBox="0 0 960 70"><path id="ak-u1" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M10 20 C260 8 600 34 940 14" stroke="#1d1b18" stroke-width="12" fill="none"/>
<path id="ak-u2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M30 52 C300 40 640 62 920 46" stroke="#1d1b18" stroke-width="12" fill="none"/></svg>
""", js="""
tl.fromTo("#ak-a",{opacity:0},{opacity:1,duration:.4,ease:"steps(6)"},0.15);
tl.fromTo("#ak-b1",{opacity:0},{opacity:1,duration:.1,ease:"steps(1)"},1.12);
tl.fromTo("#ak-b2",{opacity:0},{opacity:1,duration:.1,ease:"steps(1)"},2.2);
tl.fromTo("#ak-c",{opacity:0,scale:1.2},{opacity:1,scale:1,duration:.15,ease:"power4.in",transformOrigin:"0% 50%"},3.65);
tl.fromTo("#ak-u1",{strokeDashoffset:1},{strokeDashoffset:0,duration:.35,ease:"steps(6)"},4.2);
tl.fromTo("#ak-u2",{strokeDashoffset:1},{strokeDashoffset:0,duration:.35,ease:"steps(6)"},4.6);
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
FIX = {"kat": "kad", "dawa": "dakwa", "republican": "Republikan", "Veto.": "VETO.", "kongres": "Kongres", "demokrat.": "Demokrat.", "Parlimen": "parlimen",
       "dewan": "Dewan", "rakyat": "Rakyat", "Tulisannya": "Tulisannya:"}
for i, w in enumerate(W):
    t = w["text"]
    if t in ("Presiden", "Presiden,", "Presiden.") and i > 0 and not re.search(r"[.?]$", W[i-1]["text"]):
        w["text"] = t.lower()
    elif t == "rakyat" and i > 0 and W[i-1]["text"].lower().startswith("dewan"):
        w["text"] = "Rakyat"
    elif t in FIX and t not in ("rakyat",):
        w["text"] = FIX[t]
    if t == "rakyat." and i > 0 and W[i-1]["text"].lower().startswith("dewan"): w["text"] = "Rakyat:"
W[find("mereka.")]["text"] = "mereka:"
W[find("Setiap", 22.0)]["text"] = "setiap"
W[find("tiga")]["text"] = "3"
W[find("Senat.")]["text"] = "Senat:"
W[find("Unjuran")]["text"] = "unjuran"
W[find("Lebih")]["text"] = "lebih"
W[find("Presiden,", 18.0)]["text"] = "Presiden:"
W[find("mengaku.")]["text"] = "mengaku:"
W[find("tiada.")]["text"] = "tiada…"
W[find("Majoriti")]["text"] = "majoriti"
W[find("Iran.")]["text"] = "Iran…"
W[find("Tahap")]["text"] = "tahap"
W[find("Setiap", 86.0)]["text"] = "setiap"
W[find("dia", 87.0)]["text"] = "dia,"
W[find("Ia")]["text"] = "ia"
W[find("teruk.", 58.0)]["text"] = "teruk…"
W[find("ni.", 85.0)]["text"] = "ni…"
W[find("Dewan.", 40.0)]["text"] = "dewan."
W[find("lalu.")]["text"] = "lalu…"
MAXC = 24
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
  <audio id="vo" class="clip" src="assets/voiceover.mp3" data-start="0" data-duration="93.5" data-track-index="4" data-volume="1"></audio>
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
