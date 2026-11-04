#!/usr/bin/env python3
"""Build index.html + compositions/*.html for jerebu-video ("IPU 519"), READOUT style.
All beat times come from assets/transcript.json (VO time). Local scene time = abs - scene start."""
import json, os, re, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOTAL = 82.6
SCENES = [
    ("hook", 0.0, 6.3), ("ipu", 6.3, 7.15), ("map", 13.45, 7.85), ("kon", 21.3, 6.55), ("kita", 27.85, 5.9),
    ("mereka", 33.75, 9.25), ("mati", 43.0, 6.3), ("dua", 49.3, 7.3), ("maut", 56.6, 7.1), ("bayar", 63.7, 9.5),
    ("end", 73.2, 9.4),
]
C = dict(bg="#0a0908", ink="#ece6df", dim="#8a8178", line="#2e2823", baik="#3aa0ff", sed="#3ccf6e", ts="#ffd23f",
         sts="#ff8a1f", bhy="#ff2d2d", ember="#ff6a1f")

BASE_CSS = r"""
#root { position:absolute; inset:0; color:#ece6df; font-family:"Inter",sans-serif; }
#root .hud { position:absolute; left:80px; right:80px; top:196px; height:36px; font:500 28px "JetBrains Mono",monospace; letter-spacing:3px; color:#8a8178; }
#root .hud .l { position:absolute; left:0; top:0; } #root .hud .r { position:absolute; right:0; top:0; text-align:right; }
#root .title { position:absolute; left:80px; right:80px; font-family:"Inter",sans-serif; font-weight:900; font-size:116px; letter-spacing:-4px; line-height:.94; }
#root .mono { font-family:"JetBrains Mono",monospace; }
#root .big { font-family:"JetBrains Mono",monospace; font-weight:700; letter-spacing:-10px; line-height:1; }
#root .baik{color:#3aa0ff} #root .sed{color:#3ccf6e} #root .ts{color:#ffd23f} #root .sts{color:#ff8a1f} #root .bhy{color:#ff2d2d} #root .ember{color:#ff6a1f} #root .dim{color:#8a8178}
#root .tag { display:inline-block; font:700 28px "JetBrains Mono",monospace; letter-spacing:5px; padding:12px 22px; border:3px solid currentColor; border-radius:8px; }
#root .stamp { display:inline-block; font:900 70px "Inter"; letter-spacing:4px; border:9px solid currentColor; border-radius:14px; padding:12px 28px; }
#root .src { font:500 28px "JetBrains Mono"; color:#8a8178; letter-spacing:1px; }
"""
S = {}
def fx(sel, frm, to, t, **kw):  # helper for simple fromTo strings
    return f'tl.fromTo("{sel}",{frm},{to},{t:.2f});'

# ------------------------------------------------------------------ 01 HOOK
S["hook"] = dict(css=r"""
#hook-q { position:absolute; left:80px; top:300px; font:700 220px "JetBrains Mono"; color:#3a322b; line-height:.6; }
#hook-a { top:430px; font-size:108px; }
#hook-b { top:690px; font-size:122px; color:#3aa0ff; text-shadow:0 0 60px rgba(58,160,255,.55); }
#hook-src { position:absolute; left:80px; top:1030px; }
#hook-pk { position:absolute; left:80px; top:1110px; }
""", html=r"""
<div class="hud"><span class="l">KENYATAAN · OKT 2026</span><span class="r baik">● UDARA BERSIH</span></div>
<div id="hook-q" data-layout-ignore>“</div>
<div class="title" id="hook-a">KAMI BUKAN<br>HANTAR ASAP.</div>
<div class="title" id="hook-b" style="opacity:0">KAMI HANTAR<br>OKSIGEN.</div>
<div id="hook-src" style="opacity:0"><span class="tag dim">— PEGAWAI INDONESIA · KOMPAS</span></div>
<div id="hook-pk" class="src" style="opacity:0">▲ diperli netizen Malaysia &amp; Singapura</div>
""", js=r"""
tl.fromTo("#hook-b",{opacity:0,scale:1.12},{opacity:1,scale:1,duration:.3,ease:"power4.out",transformOrigin:"0% 50%"},3.45);
tl.fromTo("#hook-b",{textShadow:"0 0 60px rgba(58,160,255,.55)"},{textShadow:"0 0 110px rgba(58,160,255,.9)",duration:.35,yoyo:true,repeat:3},3.8);
tl.fromTo("#hook-src",{opacity:0,y:16},{opacity:1,y:0,duration:.3},4.2);
tl.fromTo("#hook-pk",{opacity:0},{opacity:1,duration:.3},4.9);
""")

# ------------------------------------------------------------------ 02 IPU 519
SEG = [("#3aa0ff", 50), ("#3ccf6e", 50), ("#ffd23f", 100), ("#ff8a1f", 100), ("#ff2d2d", 220)]
segs = "".join(f'<div style="flex:{w};background:{c}"></div>' for c, w in SEG)
S["ipu"] = dict(css=r"""
#ipu-tag { position:absolute; left:0; right:0; top:300px; text-align:center; }
#ipu-num { position:absolute; left:0; right:0; top:380px; text-align:center; font-size:300px; color:#3aa0ff; }
#ipu-cat { position:absolute; left:0; right:0; top:690px; text-align:center; font:900 52px "Inter"; letter-spacing:2px; color:#3aa0ff; }
#ipu-bar { position:absolute; left:80px; width:920px; top:790px; height:26px; border-radius:13px; overflow:hidden; display:flex; }
#ipu-ndl { position:absolute; left:80px; top:772px; width:8px; height:62px; margin-left:-4px; background:#fff; border-radius:4px; box-shadow:0 0 20px #fff; }
#ipu-sc { position:absolute; left:80px; width:920px; top:838px; height:36px; }
#ipu-sc span { position:absolute; top:0; font:500 28px "JetBrains Mono"; color:#8a8178; }
#ipu-st { position:absolute; left:0; right:0; top:900px; text-align:center; color:#ff2d2d; }
#ipu-97 { position:absolute; left:0; right:0; top:1080px; text-align:center; }
""", html=r"""
<div class="hud"><span class="l">SERIAN · SARAWAK</span><span class="r bhy" id="ipu-hs" style="opacity:0">▲ BERBAHAYA</span></div>
<div id="ipu-tag"><span class="tag dim">INDEKS PENCEMAR UDARA</span></div>
<div id="ipu-num" class="big">30</div>
<div id="ipu-cat">BAIK</div>
<div id="ipu-bar">__SEGS__</div>
<div id="ipu-ndl"></div>
<div id="ipu-sc"><span style="left:0">0</span><span style="left:84px">50</span><span style="left:166px">100</span><span style="left:334px">200</span><span style="left:500px">300</span><span style="right:0">500+</span></div>
<div id="ipu-st" style="opacity:0"><span class="stamp" id="ipu-sti">DARURAT</span></div>
<div id="ipu-97" class="src" style="opacity:0">darurat jerebu terakhir di Sarawak: 1997</div>
""".replace("__SEGS__", segs), js=r"""
const num=document.getElementById("ipu-num"), cat=document.getElementById("ipu-cat"), V={v:30};
const band=v=>v<=50?["BAIK","#3aa0ff"]:v<=100?["SEDERHANA","#3ccf6e"]:v<=200?["TIDAK SIHAT","#ffd23f"]:v<=300?["SANGAT TIDAK SIHAT","#ff8a1f"]:["BERBAHAYA","#ff2d2d"];
const paint=()=>{const v=Math.round(V.v);num.textContent=v;const [n,c]=band(v);cat.textContent=n;cat.style.color=c;num.style.color=c;
  num.style.textShadow=`0 0 ${40+v/5}px ${c}88`;};
tl.fromTo(V,{v:30},{v:519,duration:2.4,ease:"power2.in",onUpdate:paint},1.7);
tl.fromTo("#ipu-ndl",{x:28},{x:920,duration:2.4,ease:"power2.in"},1.7);
tl.to("#ipu-num",{x:10,duration:.04,yoyo:true,repeat:9,ease:"none"},4.1);
tl.fromTo("#ipu-hs",{opacity:0},{opacity:1,duration:.15},3.6);
tl.fromTo("#ipu-st",{opacity:0,scale:2.2,rotation:-8},{opacity:1,scale:1,rotation:-8,duration:.16,ease:"power4.in"},5.3);
tl.to("#ipu-st",{y:6,duration:.05,yoyo:true,repeat:3},5.46);
tl.fromTo("#ipu-97",{opacity:0},{opacity:1,duration:.3},5.35);
""")

# ------------------------------------------------------------------ 03 MAP
ML0, ML1, MA0, MA1, MW, MH = 94.5, 119.5, -10.3, 7.5, 920, 655
def mp(lo, la): return ((lo - ML0) / (ML1 - ML0) * MW, (MA1 - la) / (MA1 - MA0) * MH)
POLY = {
 "sum": [[95.2,5.6],[95.6,5.6],[97.5,5.25],[98.3,4.2],[99.8,3.1],[100.4,2.3],[101.4,2.0],[102.5,1.4],[103.4,0.6],[103.8,-0.6],[104.4,-1.0],[104.9,-2.3],[105.8,-3.0],[106.0,-4.0],[105.8,-5.8],[104.6,-5.9],[103.6,-4.9],[102.3,-4.0],[101.2,-2.6],[100.4,-1.0],[99.6,0.1],[98.8,1.6],[97.8,2.4],[96.9,3.6],[96.0,4.3]],
 "bor": [[109.0,1.8],[109.6,2.0],[110.3,1.7],[111.2,1.5],[111.8,2.5],[113.0,3.2],[114.0,4.6],[115.4,5.0],[116.0,6.0],[117.0,7.0],[117.7,6.4],[119.2,5.2],[118.3,4.4],[117.6,4.2],[117.9,2.0],[118.9,1.0],[117.6,0.5],[117.4,-0.8],[116.6,-1.5],[116.5,-2.6],[116.0,-3.6],[114.6,-4.1],[113.0,-3.2],[111.6,-3.4],[110.2,-2.9],[110.0,-1.6],[109.2,-0.8],[109.0,0.3]],
 "pen": [[100.2,6.5],[101.6,5.9],[102.3,6.2],[103.4,4.8],[103.5,3.6],[103.4,2.6],[104.3,1.5],[103.5,1.3],[102.4,2.1],[101.3,2.8],[100.7,3.8],[100.3,5.0]],
 "jav": [[105.2,-6.0],[106.5,-5.9],[108.3,-6.3],[110.5,-6.5],[112.6,-6.9],[114.4,-7.7],[114.4,-8.6],[112,-8.4],[110,-8.1],[108,-7.8],[106.5,-7.4],[105.3,-6.8]],
}
def inside(p, poly):
    c = False; j = len(poly) - 1
    for i in range(len(poly)):
        a, b = poly[i]; x, y = poly[j]
        if (b > p[1]) != (y > p[1]) and p[0] < (x - a) * (p[1] - b) / (y - b) + a: c = not c
        j = i
    return c
HS = [(101.6,0.4,1.25),(103.2,-1.7,1.0),(104.6,-3.1,1.3),(110.4,-1.7,1.2),(109.6,-0.3,0.7),(113.6,-2.4,1.55),(115.1,-3.1,0.9)]
base, hot = [], []
step = 0.36
lo = ML0
k = 0
while lo <= ML1:
    la = MA0
    while la <= MA1:
        if any(inside((lo, la), p) for p in POLY.values()):
            x, y = mp(lo, la)
            base.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4"/>')
            for (a, b, r) in HS:
                if math.hypot(lo - a, la - b) < r:
                    k += 1
                    hot.append((x, y, (k * 7919) % 997 / 997))
                    break
        la += step
    lo += step
hot_svg = "".join(f'<circle class="hd" data-o="{o:.3f}" cx="{x:.1f}" cy="{y:.1f}" r="6" fill="#ff6a1f" opacity="0"/>' for x, y, o in hot)
glow_svg = "".join(f'<circle cx="{mp(a,b)[0]:.1f}" cy="{mp(a,b)[1]:.1f}" r="{r*70:.0f}" fill="url(#map-em)" class="mg" opacity="0"/>' for a, b, r in HS)
LAB = [("SUMATERA", 98.6, -3.4, "end"), ("KALIMANTAN", 116.2, -0.4, "middle"), ("SERIAN", 110.65, 1.15, "start"), ("SINGAPURA", 103.82, 1.32, "end"), ("KL", 101.7, 3.14, "end")]
lab_svg = ""
for t, a, b, an in LAB:
    x, y = mp(a, b)
    dot = t in ("SERIAN", "SINGAPURA", "KL")
    dx = 14 if an == "start" else -14 if an == "end" else 0
    lab_svg += (f'<g class="ml" opacity="0">' + (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="#fff"/>' if dot else "") +
                f'<text x="{x+dx:.1f}" y="{y+(10 if dot else 0):.1f}" text-anchor="{an}" font-family="JetBrains Mono" font-weight="700" font-size="28" fill="#ece6df" paint-order="stroke" stroke="#0a0908" stroke-width="8">{t}</text></g>')
# haze drift arrows: Sumatra -> Peninsula/Singapore, Kalimantan -> Serian
arr = []
for (a0, b0, a1, b1) in [(102.6, -0.6, 102.2, 2.7), (111.8, -1.2, 110.9, 0.9)]:
    x0, y0 = mp(a0, b0); x1, y1 = mp(a1, b1)
    arr.append(f'<path class="ma" d="M{x0:.1f},{y0:.1f} Q{(x0+x1)/2+40:.1f},{(y0+y1)/2:.1f} {x1:.1f},{y1:.1f}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" stroke="#cbb79c" stroke-width="5" fill="none" stroke-linecap="butt"/>')
MAP_SVG = (f'<svg id="map-svg" width="{MW}" height="{MH}" viewBox="0 0 {MW} {MH}"><defs><radialGradient id="map-em"><stop offset="0" stop-color="#ff6a1f" stop-opacity=".5"/>'
           f'<stop offset="1" stop-color="#ff6a1f" stop-opacity="0"/></radialGradient></defs>{glow_svg}<g id="map-base" fill="#5a4e44">{"".join(base)}</g>{hot_svg}{"".join(arr)}{lab_svg}</svg>')
S["map"] = dict(css=r"""
#map-svg { position:absolute; left:80px; top:470px; overflow:visible; }
#map-n { position:absolute; left:80px; top:222px; font-size:190px; color:#ff6a1f; text-shadow:0 0 70px rgba(255,106,31,.45); }
#map-u { position:absolute; left:80px; top:410px; font:900 46px "Inter"; letter-spacing:1px; }
#map-c1 { position:absolute; right:80px; top:236px; text-align:right; }
#map-c2 { position:absolute; right:80px; top:316px; text-align:right; }
""", html=r"""
<div class="hud"><span class="l">JAN–SEP 2026</span><span class="r ember">▲ TITIK API</span></div>
<div id="map-n" class="big">0.00</div>
<div id="map-u" style="opacity:0">JUTA HEKTAR TERBAKAR</div>
<div id="map-c1" style="opacity:0"><span class="tag ember">+38% VS 2019</span></div>
<div id="map-c2" style="opacity:0"><span class="tag dim">≈ 12× LONDON</span></div>
__MAP__
""".replace("__MAP__", MAP_SVG), js=r"""
tl.fromTo("#map-base",{opacity:0},{opacity:1,duration:.5},0);
tl.fromTo("#map-svg .ml",{opacity:0},{opacity:1,duration:.3,stagger:.08},0.3);
const n=document.getElementById("map-n"), H={v:0};
tl.fromTo(H,{v:0},{v:1.92,duration:1.4,ease:"power2.out",onUpdate:()=>{n.textContent=H.v.toFixed(2);}},1.17);
tl.fromTo("#map-u",{opacity:0,y:16},{opacity:1,y:0,duration:.3},1.6);
document.querySelectorAll("#map-svg .hd").forEach(el=>{const o=+el.dataset.o;
  tl.fromTo(el,{opacity:0,scale:2,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:.25},1.2+o*2.0);});
tl.fromTo("#map-svg .mg",{opacity:0},{opacity:1,duration:1.2,stagger:.25},1.4);
tl.fromTo("#map-c1",{opacity:0,x:30},{opacity:1,x:0,duration:.3,ease:"back.out(2)"},4.0);
tl.fromTo("#map-c2",{opacity:0,x:30},{opacity:1,x:0,duration:.3,ease:"back.out(2)"},6.8);
tl.fromTo("#map-svg .ma",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.0,ease:"power1.inOut",stagger:.3},4.6);
""")

# ------------------------------------------------------------------ 04 KONSESI
BARS = [("SAWIT", 10739, "#ff8a1f", 4.0), ("LOMBONG", 7880, "#ffd23f", 4.45), ("BALAK", 6905, "#c9a27a", 4.9)]
bars_html = "".join(f'<div class="kb" id="kon-r{i}" style="top:{700+i*140}px;opacity:0"><div class="mono kl">{n}</div>'
                    f'<div class="kbar" id="kon-b{i}" style="width:{int(v/10739*900)}px;background:{c}"><span>{v:,}</span></div></div>' for i, (n, v, c, _) in enumerate(BARS))
bars_js = "".join(f'tl.fromTo("#kon-r{i}",{{opacity:0}},{{opacity:1,duration:.2}},{t:.2f});tl.fromTo("#kon-b{i}",{{scaleX:0}},{{scaleX:1,duration:.5,ease:"power3.out"}},{t:.2f});'
                  for i, (n, v, c, t) in enumerate(BARS))
S["kon"] = dict(css=r"""
#kon-n { position:absolute; left:80px; top:230px; font-size:250px; color:#ff8a1f; text-shadow:0 0 80px rgba(255,138,31,.4); }
#kon-t { top:490px; font-size:66px; letter-spacing:-2px; }
#root .kb { position:absolute; left:80px; width:920px; height:120px; }
#root .kl { font:700 28px "JetBrains Mono"; letter-spacing:4px; color:#8a8178; }
#root .kbar { position:absolute; left:0; top:44px; height:64px; border-radius:10px; transform-origin:0 50%; }
#root .kbar span { position:absolute; left:20px; top:12px; font:700 36px "JetBrains Mono"; color:#0a0908; }
#kon-src { position:absolute; left:80px; top:1110px; }
""", html=r"""
<div class="hud"><span class="l">KALIMANTAN · TITIK API</span><span class="r sts">DATA WALHI</span></div>
<div id="kon-n" class="big">0%</div>
<div class="title" id="kon-t" style="opacity:0">DALAM KAWASAN<br><span class="sts">KONSESI SYARIKAT.</span></div>
__BARS__
""".replace("__BARS__", bars_html), js=r"""
const kn=document.getElementById("kon-n"), K={v:0};
tl.fromTo(K,{v:0},{v:74,duration:.6,ease:"power3.out",onUpdate:()=>{kn.textContent=Math.round(K.v)+"%";}},1.65);
tl.fromTo("#kon-n",{scale:1.25},{scale:1,duration:.3,ease:"power4.out",transformOrigin:"0% 50%"},2.25);
tl.fromTo("#kon-t",{opacity:0,y:20},{opacity:1,y:0,duration:.3},3.0);
""" + bars_js)

# ------------------------------------------------------------------ 05 KITA
ICO = {
 "sekolah": '<path d="M6 26h40M10 26V14l16-8 16 8v12"/><rect x="21" y="16" width="10" height="10"/><path d="M8 32h36"/>',
 "topeng": '<path d="M8 18c6-4 30-4 36 0v10c-4 8-32 8-36 0z"/><path d="M4 18l4 2M48 18l-4 2M14 24h24"/>',
 "rumah": '<path d="M6 24L26 8l20 16"/><path d="M11 21v17h30V21"/><rect x="22" y="28" width="8" height="10"/>',
}
ROWS = [("sekolah", "SEKOLAH DITUTUP", "4 negeri + KL & Putrajaya", 0.25), ("topeng", "PAKAI TOPENG", "bila IPU tinggi", 1.95), ("rumah", "DUDUK DALAM RUMAH", "aktiviti luar dihentikan", 3.3)]
rows_html = "".join(f'<div class="kr" id="kita-r{i}" style="top:{250+i*175}px;opacity:0"><svg width="104" height="88" viewBox="0 0 52 44" fill="none" stroke="#ece6df" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">{ICO[k]}</svg>'
                    f'<div class="kt"><div class="kn">{n}</div><div class="ks">{s}</div></div><div class="kc" id="kita-c{i}" style="opacity:0">✓</div></div>' for i, (k, n, s, t) in enumerate(ROWS))
rows_js = "".join(f'tl.fromTo("#kita-r{i}",{{opacity:0,x:-40}},{{opacity:1,x:0,duration:.3,ease:"power3.out"}},{t:.2f});tl.fromTo("#kita-c{i}",{{opacity:0,scale:1.8}},{{opacity:1,scale:1,duration:.2}},{t+.3:.2f});' for i, (k, n, s, t) in enumerate(ROWS))
S["kita"] = dict(css=r"""
#root .kr { position:absolute; left:80px; width:920px; height:150px; border:3px solid #2e2823; border-radius:16px; background:#12100e; }
#root .kr svg { position:absolute; left:30px; top:31px; }
#root .kt { position:absolute; left:170px; top:32px; }
#root .kn { font:900 46px "Inter"; letter-spacing:.5px; }
#root .ks { font:500 28px "JetBrains Mono"; color:#8a8178; margin-top:8px; }
#root .kc { position:absolute; right:34px; top:44px; font:700 52px "JetBrains Mono"; color:#3aa0ff; }
#kita-t { top:830px; font-size:130px; }
""", html=r"""
<div class="hud"><span class="l">MANUSIA</span><span class="r baik">● ADA PILIHAN</span></div>
__ROWS__
<div class="title" id="kita-t" style="opacity:0">KITA<br><span class="baik">BOLEH LARI.</span></div>
""".replace("__ROWS__", rows_html), js=rows_js + r"""
tl.fromTo("#kita-t",{opacity:0,y:30},{opacity:1,y:0,duration:.35,ease:"power3.out"},4.7);
""")

# ------------------------------------------------------------------ 06 MEREKA
ORAN = lambda c, w: (f'<svg width="{w}" height="{int(w*170/130)}" viewBox="0 0 130 170" fill="none" stroke="{c}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">'
                     '<circle cx="65" cy="34" r="22"/><path d="M55 45c5-3 15-3 20 0"/><path d="M51 28l10-4M79 28l-10-4"/>'
                     f'<circle cx="57" cy="31" r="2.2" fill="{c}"/><circle cx="73" cy="31" r="2.2" fill="{c}"/>'
                     '<path d="M44 60c-6 30-4 60 6 80M86 60c6 30 4 60-6 80"/><path d="M48 58c-20 10-30 40-34 80M82 58c20 10 30 40 34 80"/><path d="M50 140h30"/></svg>')
S["mereka"] = dict(css=r"""
#mer-t { top:240px; font-size:120px; }
#mer-o { position:absolute; left:400px; top:500px; }
#mer-n1 { position:absolute; left:80px; top:880px; }
#mer-n2 { position:absolute; left:560px; top:880px; }
#root .mn { font-size:150px; letter-spacing:-8px; }
#root .ml2 { font:700 28px "JetBrains Mono"; letter-spacing:2px; color:#8a8178; margin-top:6px; }
#mer-src { position:absolute; left:80px; top:1130px; }
#mer-ember { position:absolute; left:-200px; right:-200px; top:900px; height:1100px; background:radial-gradient(ellipse 50% 40% at 50% 60%,rgba(255,106,31,.32),transparent 70%); }
""", html=r"""
<div id="mer-ember" data-layout-ignore style="opacity:0"></div>
<div class="hud"><span class="l">HAIWAN LIAR</span><span class="r ember">▲ TIADA PILIHAN</span></div>
<div class="title" id="mer-t"><span id="mer-t1" style="opacity:0">TAPI MEREKA…</span><br><span class="ember" id="mer-t2" style="opacity:0">TAK BOLEH.</span></div>
<div id="mer-o" style="opacity:0">__ORAN__</div>
<div id="mer-n1" style="opacity:0"><div class="big mn ember" id="mer-v1">0</div><div class="ml2">HAIWAN DISELAMATKAN</div></div>
<div id="mer-n2" style="opacity:0"><div class="big mn" id="mer-v2">0</div><div class="ml2">ORANGUTAN</div></div>
""".replace("__ORAN__", ORAN("#ece6df", 280)), js=r"""
tl.fromTo("#mer-t1",{opacity:0},{opacity:1,duration:.4},0.13);
tl.fromTo("#mer-t2",{opacity:0,scale:1.15},{opacity:1,scale:1,duration:.3,ease:"power4.out"},1.63);
tl.fromTo("#mer-o",{opacity:0,y:30},{opacity:1,y:0,duration:1.2,ease:"power2.out"},0.9);
tl.to("#mer-o",{y:-8,duration:1.6,yoyo:true,repeat:3,ease:"sine.inOut"},2.1);
tl.fromTo("#mer-ember",{opacity:0},{opacity:1,duration:2},0.5);
const a=document.getElementById("mer-v1"), b=document.getElementById("mer-v2"), A={v:0}, B={v:0};
tl.fromTo("#mer-n1",{opacity:0},{opacity:1,duration:.2},3.4);
tl.fromTo(A,{v:0},{v:290,duration:.9,ease:"power2.out",onUpdate:()=>{a.textContent=Math.round(A.v);}},3.43);
tl.fromTo("#mer-n2",{opacity:0},{opacity:1,duration:.2},6.7);
tl.fromTo(B,{v:0},{v:96,duration:.7,ease:"power2.out",onUpdate:()=>{b.textContent=Math.round(B.v);}},6.76);
""")

# ------------------------------------------------------------------ 07 MATI (dead animals)
ANI = {
 "bekantan": '<circle cx="40" cy="30" r="16"/><path d="M40 36c-6 4-6 14 2 14s6-10 0-14"/><circle cx="34" cy="26" r="1.8" fill="currentColor"/><circle cx="46" cy="26" r="1.8" fill="currentColor"/><path d="M28 48c-6 10-6 22 0 30M52 48c6 10 6 22 0 30M30 78h20"/>',
 "sawa": '<path d="M8 60c10-16 22 16 32 0s22 16 32 0"/><circle cx="72" cy="58" r="3"/><path d="M76 58l6-2"/>',
 "kobra": '<path d="M40 74c-14 0-20-8-10-14s20-6 10-16"/><path d="M40 44c-10-2-14-14-10-24 4-10 16-10 20 0 4 10 0 22-10 24z"/><circle cx="36" cy="26" r="1.8" fill="currentColor"/><circle cx="44" cy="26" r="1.8" fill="currentColor"/>',
}
CARDS = [("bekantan", "BEKANTAN", "×12", 1.52), ("sawa", "ULAR SAWA", "×1", 2.48), ("kobra", "KING KOBRA", "×1", 3.56)]
cards_html = "".join(f'<div class="ac" id="mati-c{i}" style="top:{480+i*190}px;opacity:0"><svg class="ai" width="120" height="100" viewBox="0 0 80 84" fill="none" stroke="#ece6df" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="color:#ece6df">{ANI[k]}</svg>'
                     f'<div class="an">{n}</div><div class="aq big">{q}</div><div class="ax" id="mati-x{i}">✕</div></div>' for i, (k, n, q, t) in enumerate(CARDS))
cards_js = "".join(f'tl.fromTo("#mati-c{i}",{{opacity:0,x:60}},{{opacity:1,x:0,duration:.3,ease:"power3.out"}},{t-.05:.2f});' for i, (k, n, q, t) in enumerate(CARDS))
S["mati"] = dict(css=r"""
#mati-t { top:240px; font-size:120px; }
#root .ac { position:absolute; left:80px; width:920px; height:160px; border:3px solid #2e2823; border-radius:16px; background:#12100e; }
#root .ac .ai { position:absolute; left:30px; top:30px; }
#root .ac .an { position:absolute; left:180px; top:52px; font:900 50px "Inter"; letter-spacing:1px; }
#root .ac .aq { position:absolute; right:140px; top:40px; font-size:72px; letter-spacing:-3px; color:#ff6a1f; }
#root .ac .ax { position:absolute; right:40px; top:34px; font:700 76px "JetBrains Mono"; color:#ff2d2d; opacity:0; }
#mati-l { position:absolute; left:80px; top:1070px; }
""", html=r"""
<div class="hud"><span class="l">KALIMANTAN SELATAN</span><span class="r bhy">▲ TAK SEMPAT</span></div>
<div class="title" id="mati-t">ADA YANG<br><span class="ember">TAK SEMPAT.</span></div>
__CARDS__
<div id="mati-l" style="opacity:0"><span class="tag bhy">DITEMUI MATI TERBAKAR</span></div>
""".replace("__CARDS__", cards_html), js=r"""
tl.fromTo("#mati-t",{opacity:0,y:24},{opacity:1,y:0,duration:.35,ease:"power3.out"},0.1);
""" + cards_js + r"""
tl.fromTo("#mati-l",{opacity:0,scale:1.3},{opacity:1,scale:1,duration:.25,ease:"power4.out",transformOrigin:"0% 50%"},4.68);
[0,1,2].forEach(i=>{
  tl.to(`#mati-c${i}`,{filter:"grayscale(1)",opacity:.55,duration:.5},4.9+i*.12);
  tl.fromTo(`#mati-x${i}`,{opacity:0,scale:1.8},{opacity:1,scale:1,duration:.18},4.9+i*.12);});
""")

# ------------------------------------------------------------------ 08 DUA RATUS
dots = "".join(f'<circle class="od" data-k="{(c+ (r*3))/40:.3f}" cx="{c*46+23}" cy="{r*44+22}" r="14" fill="#ff6a1f"/>' for r in range(10) for c in range(20) if c < 20)
S["dua"] = dict(css=r"""
#dua-n { position:absolute; left:80px; top:222px; font-size:200px; }
#dua-u { position:absolute; left:84px; top:430px; font:700 30px "JetBrains Mono"; letter-spacing:3px; color:#8a8178; }
#dua-svg { position:absolute; left:80px; top:500px; }
#dua-q { position:absolute; right:60px; top:560px; font:900 520px "Inter"; line-height:1; color:#ff6a1f; text-shadow:0 0 80px rgba(255,106,31,.45); }
#dua-t { top:990px; font-size:84px; letter-spacing:-2px; }
""", html=r"""
<div class="hud"><span class="l">KAWASAN PEMULIHARAAN · 2,330 HA</span><span class="r">KALBAR</span></div>
<div id="dua-n" class="big">0</div>
<div id="dua-u" style="opacity:0">ORANGUTAN · DIANGGARKAN</div>
<svg id="dua-svg" width="920" height="440" viewBox="0 0 920 440" style="opacity:0">__DOTS__</svg>
<div id="dua-q" style="opacity:0" data-layout-ignore>?</div>
<div class="title" id="dua-t" style="opacity:0">BERAPA YANG<br><span class="ember">TINGGAL?</span></div>
""".replace("__DOTS__", dots), js=r"""
const dn=document.getElementById("dua-n"), D={v:0};
tl.fromTo("#dua-svg",{opacity:0},{opacity:1,duration:.3},1.5);
document.querySelectorAll("#dua-svg .od").forEach((el,i)=>{const k=+el.dataset.k;
  tl.fromTo(el,{scale:0,transformOrigin:"50% 50%"},{scale:1,duration:.2},1.55+ (i%20)*0.03 + Math.floor(i/20)*0.04);
  tl.fromTo(el,{fill:"#ff6a1f"},{fill:"#2e2823",duration:.25},4.2+k*1.6);});
tl.fromTo(D,{v:0},{v:200,duration:.9,ease:"power2.out",onUpdate:()=>{dn.textContent=Math.round(D.v);}},1.5);
tl.fromTo("#dua-u",{opacity:0},{opacity:1,duration:.3},1.9);
tl.fromTo("#dua-q",{opacity:0,scale:.6},{opacity:1,scale:1,duration:.4,ease:"back.out(2)"},5.85);
tl.fromTo("#dua-t",{opacity:0,y:20},{opacity:1,y:0,duration:.3},5.3);
""")

# ------------------------------------------------------------------ 09 MAUT
S["maut"] = dict(css=r"""
#maut-tag { position:absolute; left:0; right:0; top:330px; text-align:center; }
#maut-n { position:absolute; left:0; right:0; top:440px; text-align:center; font-size:250px; }
#maut-u { top:720px; text-align:center; font-size:110px; }
#maut-s { position:absolute; left:0; right:0; top:880px; text-align:center; font:900 52px "Inter"; color:#8a8178; letter-spacing:1px; }
#maut-src { position:absolute; left:0; right:0; top:1040px; text-align:center; }
""", html=r"""
<div class="hud"><span class="l">INDONESIA · SEPT 2026</span><span class="r bhy">ANGGARAN</span></div>
<div id="maut-tag" style="opacity:0"><span class="tag ts">SATU KAJIAN MENGANGGARKAN</span></div>
<div id="maut-n" class="big">0</div>
<div class="title" id="maut-u" style="opacity:0">KEMATIAN.</div>
<div id="maut-s" style="opacity:0">DALAM SEBULAN · DI INDONESIA</div>
<div id="maut-src" class="src" style="opacity:0">ANGGARAN KAJIAN · CREA</div>
""", js=r"""
tl.fromTo("#maut-tag",{opacity:0,y:-14},{opacity:1,y:0,duration:.3},0.3);
const mn=document.getElementById("maut-n"), M={v:0};
tl.fromTo(M,{v:0},{v:3560,duration:1.3,ease:"power1.out",onUpdate:()=>{mn.textContent=Math.round(M.v).toLocaleString("en");}},3.1);
tl.fromTo("#maut-u",{opacity:0,y:20},{opacity:1,y:0,duration:.4},3.94);
tl.fromTo("#maut-s",{opacity:0},{opacity:1,duration:.4},5.4);
tl.fromTo("#maut-src",{opacity:0},{opacity:1,duration:.4},4.4);
""")

# ------------------------------------------------------------------ 10 BAYAR
notes = "".join(f'<div class="nt" data-layout-allow-overlap id="bay-n{i}" style="left:{i*18}px;top:{i*12}px;opacity:0">NOTIS #{i+1:02d}</div>' for i in range(10))
notes_js = "".join(f'tl.fromTo("#bay-n{i}",{{opacity:0,y:-50}},{{opacity:1,y:0,duration:.18,ease:"power3.out"}},{1.8+i*0.08:.2f});' for i in range(10))
S["bayar"] = dict(css=r"""
#bay-t { top:236px; }
#bay-stack { position:absolute; left:80px; top:500px; width:480px; height:260px; }
#root .nt { position:absolute; width:300px; height:140px; border:3px solid #4a423b; border-radius:12px; background:#15130f; font:700 28px "JetBrains Mono"; color:#8a8178; padding:18px 20px; }
#bay-10 { position:absolute; left:620px; top:500px; }
#bay-10 .big { font-size:160px; letter-spacing:-6px; }
#bay-fine { position:absolute; left:80px; top:780px; }
#bay-fine .big { font-size:110px; letter-spacing:-4px; color:#ffd23f; }
#bay-zero { position:absolute; left:80px; top:960px; }
#bay-zero .big { font-size:150px; letter-spacing:-4px; }
#bay-st { position:absolute; left:380px; top:990px; color:#ff2d2d; }
""", html=r"""
<div class="hud"><span class="l">FAIL UNDANG-UNDANG · THPA</span><span class="r">SINGAPURA</span></div>
<div class="title" id="bay-t">SIAPA<br><span class="ts">BAYAR?</span></div>
<div id="bay-stack">__NOTES__</div>
<div id="bay-10" style="opacity:0"><div class="big">10</div><div class="src">SYARIKAT</div></div>
<div id="bay-fine" style="opacity:0"><div class="src">DENDA SEHINGGA</div><div class="big">S$100K<span style="font-size:48px;letter-spacing:0">/hari</span></div></div>
<div id="bay-zero" style="opacity:0"><div class="src">DIDENDA SEJAK 2014</div><div class="big">0</div></div>
<div id="bay-st" style="opacity:0"><span class="stamp">BELUM ADA</span></div>
""".replace("__NOTES__", notes), js=r"""
tl.fromTo("#bay-t",{opacity:0,y:24},{opacity:1,y:0,duration:.3,ease:"power3.out"},0.1);
""" + notes_js + r"""
tl.fromTo("#bay-10",{opacity:0,scale:1.3},{opacity:1,scale:1,duration:.25,ease:"power4.out",transformOrigin:"0% 50%"},2.45);
tl.fromTo("#bay-fine",{opacity:0,y:20},{opacity:1,y:0,duration:.3},3.95);
tl.fromTo("#bay-zero",{opacity:0,y:20},{opacity:1,y:0,duration:.3},6.4);
tl.fromTo("#bay-st",{opacity:0,scale:2.2,rotation:-8},{opacity:1,scale:1,rotation:-8,duration:.16,ease:"power4.in"},8.75);
tl.to("#bay-st",{y:6,duration:.05,yoyo:true,repeat:3},8.91);
""")

# ------------------------------------------------------------------ 11 END
embers = "".join(f'<div class="emb" id="end-e{i}" style="left:{x}px;top:{y}px"></div>' for i, (x, y) in enumerate([(120,600),(300,660),(470,590),(640,680),(820,620),(220,720),(560,730),(900,700)]))
embers_js = "".join(f'tl.fromTo("#end-e{i}",{{opacity:0,scale:.6}},{{opacity:1,scale:1,duration:.5}},{1.9+i*0.12:.2f});tl.to("#end-e{i}",{{opacity:.45,duration:{0.5+(i%3)*0.17:.2f},yoyo:true,repeat:{6+i%3},ease:"sine.inOut"}},{2.5+i*0.12:.2f});' for i in range(8))
S["end"] = dict(css=r"""
#end-t { top:236px; }
#end-ipu { position:absolute; left:80px; top:476px; }
#end-g { position:absolute; left:0; right:0; top:520px; height:4px; background:#5a5048; }
#end-gl { position:absolute; left:80px; top:536px; }
#end-soil { position:absolute; left:0; right:0; top:524px; height:260px; background:repeating-linear-gradient(0deg,#1a1410 0 10px,#221a14 10px 20px); }
#root .emb { position:absolute; width:110px; height:44px; border-radius:50%; background:radial-gradient(#ffd0a0,#ff6a1f 35%,rgba(255,106,31,0) 70%); opacity:0; }
#end-a { top:810px; font-size:74px; letter-spacing:-2px; }
#end-b { top:905px; font-size:112px; letter-spacing:-4px; color:#ff6a1f; }
#end-o { position:absolute; left:770px; top:860px; }
""", html=r"""
<div class="hud"><span class="l">HARI INI</span><span class="r baik">● SARAWAK 3 NOV: KEBANYAKAN BAIK</span></div>
<div class="title" id="end-t" style="opacity:0">LANGIT<br><span class="baik">DAH CERAH.</span></div>
<div id="end-soil" style="opacity:0" data-layout-ignore></div>
<div id="end-g" style="opacity:0"></div>
<div id="end-gl" class="src" style="opacity:0">PERMUKAAN ↓ GAMBUT MASIH MEMBARA</div>
__EMB__
<div class="title" id="end-a" style="opacity:0">KITA BOLEH LARI.</div>
<div class="title" id="end-b" style="opacity:0">MEREKA<br>TAK BOLEH.</div>
<div id="end-o" style="opacity:0">__ORANE__</div>
""".replace("__EMB__", embers).replace("__ORANE__", ORAN("#ff6a1f", 170)), js=r"""
tl.fromTo("#end-t",{opacity:0,y:24},{opacity:1,y:0,duration:.5,ease:"power2.out"},0.5);
tl.fromTo(["#end-soil","#end-g"],{opacity:0},{opacity:1,duration:.6},1.7);
tl.fromTo("#end-gl",{opacity:0},{opacity:1,duration:.4},2.2);
""" + embers_js + r"""
tl.fromTo("#end-a",{opacity:0,y:20},{opacity:1,y:0,duration:.35},5.33);
tl.fromTo("#end-b",{opacity:0,scale:1.15},{opacity:1,scale:1,duration:.3,ease:"power4.out",transformOrigin:"0% 50%"},6.2);
tl.fromTo("#end-o",{opacity:0,y:20},{opacity:1,y:0,duration:1.0,ease:"power2.out"},6.5);
""")

def scene_file(sid, dur, d):
    return f"""<template>
<style>{BASE_CSS}{d['css']}</style>
<div id="root" data-composition-id="{sid}" data-width="1080" data-height="1920" data-start="0" data-duration="{dur}">
{d['html']}
</div>
<script>
(function(){{
const tl = gsap.timeline({{ paused: true }});
{d['js']}
window.__timelines["{sid}"] = tl;
}})();
</script>
</template>
"""

# ------------------------------------------------------------------ CAPTIONS
words = json.load(open(os.path.join(ROOT, "assets", "transcript.json")))
words = words.get("words", words) if isinstance(words, dict) else words
W = [dict(text=w["text"].strip(), start=w["start"], end=w["end"]) for w in words]
def merge(i, text):  # merge W[i] and W[i+1]
    W[i] = dict(text=text, start=W[i]["start"], end=W[i+1]["end"]); del W[i+1]
def split(i, a, b):
    w = W[i]; m = w["start"] + (w["end"] - w["start"]) * len(a) / (len(a) + len(b))
    W[i:i+1] = [dict(text=a, start=w["start"], end=m), dict(text=b, start=m, end=w["end"])]
def find(t, after=0.0):
    for i, w in enumerate(W):
        if w["text"] == t and w["start"] >= after: return i
    raise KeyError(t)
REPL = {"tu": "tu,", "serawak": "Sarawak…", "C519": "519.", "2019": "2019.", "dan": "Dan", "haywan": "haiwan", "sawah,": "sawa,",
        "kinkobra,": "king kobra…", "3500": "3,500", "bayar,": "bayar?", "$100,000": "S$100,000", "lari.": "lari."}
i = find("diserian"); split(i, "di", "Serian,")
i = find("di", 12.0); merge(i, "diisytiharkan.")
i = find("Punca"); merge(i, "Puncanya?")
i = find("orang", 41.0); merge(i, "orangutan.")
i = find("orang", 51.0); merge(i, "orangutan")
i = find("di", 72.0); merge(i, "didenda.")
for w in W:
    if w["text"] in REPL: w["text"] = REPL[w["text"]]
W[find("Kita")]["text"] = "Kita?"
W[find("syarikat", 66.0)]["text"] = "syarikat."
W[find("Indonesia", 61.0)]["text"] = "Indonesia."
W[find("dalam", 62.0)]["text"] = "Dalam"
W[find("2")]["text"] = "2"
for t, after, new in [("sekolah", 27.0, "Sekolah"), ("hampir", 13.0, "Hampir"), ("darurat", 11.0, "Darurat"), ("denda", 66.5, "Denda")]:
    W[find(t, after)]["text"] = new
def accent(t):
    for t0, c in [(73.2, "#3aa0ff"), (63.7, "#ffd23f"), (56.6, "#ff2d2d"), (33.75, "#ff6a1f"), (27.85, "#3aa0ff"), (13.45, "#ff8a1f"), (6.3, "#ff2d2d"), (0, "#3aa0ff")]:
        if t >= t0: return "#ff6a1f" if t >= 77.5 else c
MAXC = 24
def L(ws): return len(" ".join(x["text"] for x in ws))
def split_bal(ws):
    if L(ws) <= MAXC or len(ws) == 1: return [ws]
    best = min(range(1, len(ws)), key=lambda k: max(L(ws[:k]), L(ws[k:])) + (8 if ws[k-1]["text"].lower() in ("di","ke","dan","yang","dengan","kepada") else 0))
    return split_bal(ws[:best]) + split_bal(ws[best:])
sents, cur = [], []
for i, w in enumerate(W):
    cur.append(w); nxt = W[i+1] if i + 1 < len(W) else None
    if nxt is None or re.search(r"[.?…]$", w["text"]) or nxt["start"] - w["end"] > 0.35:
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
    spans = "".join(f'<span class="w" id="cap-{gi}-{wi}">{w["text"]}{" " if wi + 1 < len(g) else ""}</span>' for wi, w in enumerate(g))
    cap_html.append(f'<div class="grp" id="cap-{gi}"><span class="box">{spans}<span class="cur" id="cap-{gi}-c">▌</span></span></div>')
    js = [f'tl.set("#cap-{gi}",{{opacity:1,visibility:"visible"}},{g0:.3f});']
    for wi, w in enumerate(g):
        js.append(f'tl.set("#cap-{gi}-{wi}",{{display:"inline",color:"{accent(w["start"])}"}},{max(g0, w["start"]-0.03):.3f});')
        if wi + 1 < len(g): js.append(f'tl.set("#cap-{gi}-{wi}",{{color:"#ece6df"}},{g[wi+1]["start"]-0.03:.3f});')
    js.append(f'tl.set("#cap-{gi}-c",{{color:"{accent(g[0]["start"])}"}},{g0:.3f});')
    k, on = g0 + 0.4, False
    while k < g1 - 0.1:
        js.append(f'tl.set("#cap-{gi}-c",{{opacity:{1 if on else 0}}},{k:.3f});'); on = not on; k += 0.4
    js.append(f'tl.to("#cap-{gi}",{{opacity:0,duration:.1}},{g1-0.1:.3f});tl.set("#cap-{gi}",{{opacity:0,visibility:"hidden"}},{g1:.3f});')
    cap_js.append("".join(js))
CAP = f"""<template>
<style>
#root {{ position:absolute; inset:0; }}
#root .grp {{ position:absolute; left:80px; right:80px; top:1196px; text-align:left; opacity:0; visibility:hidden; }}
#root .box {{ display:inline-block; white-space:pre; font:700 46px "JetBrains Mono",monospace; color:#ece6df; background:rgba(10,9,8,.86); border:2px solid #2e2823; border-radius:12px; padding:16px 26px; line-height:1.15; }}
#root .w {{ display:none; }}
#root .cur {{ margin-left:2px; }}
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

# ------------------------------------------------------------------ INDEX
CUTS = [s for _, s, _ in SCENES[1:]]
hosts = "\n".join(f'  <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{st}" data-duration="{du}" '
                  f'data-track-index="2" data-track-kind="graphics" data-width="1080" data-height="1920"></div>' for sid, st, du in SCENES)
HAZE_KEYS = [(0, 0), (6.3, .12), (8.0, .25), (10.4, .75), (13.45, .45), (21.3, .35), (27.85, .4), (33.75, .3), (49.3, .3), (56.6, .55), (63.7, .3), (73.4, .3), (75.6, 0)]
GLOW = [  # (time, layer) crossfades
    (0, "blue"), (6.3, "red"), (13.45, "ember"), (27.85, "blue"), (33.75, "ember"), (56.6, "red"), (63.7, "yellow"), (73.2, "blue"), (78.4, "ember")]
glow_js = []
prev = "blue"
for t, g in GLOW[1:]:
    glow_js.append(f'tl.to("#g-{prev}",{{opacity:0,duration:.5}},{t:.2f});tl.to("#g-{g}",{{opacity:1,duration:.5}},{t:.2f});'); prev = g
haze_js = "".join(f'tl.to("#haze",{{opacity:{o},duration:{t1-t0:.2f},ease:"sine.inOut"}},{t0:.2f});' for (t0, _), (t1, o) in zip(HAZE_KEYS, HAZE_KEYS[1:]))
INDEX = f"""<!doctype html>
<html lang="ms">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="assets/lib/gsap.min.js"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ width:1080px; height:1920px; overflow:hidden; background:#0a0908; }}
#root {{ position:relative; width:1080px; height:1920px; overflow:hidden; }}
#bg {{ position:absolute; inset:0; background:#0a0908; }}
#dots {{ position:absolute; inset:0; background-image:radial-gradient(circle,rgba(255,240,220,.06) 1.6px,transparent 2px); background-size:36px 36px; }}
.glow {{ position:absolute; inset:0; opacity:0; }}
#g-blue {{ background:radial-gradient(ellipse 80% 45% at 50% 38%,rgba(58,160,255,.16),transparent 70%); }}
#g-red {{ background:radial-gradient(ellipse 80% 45% at 50% 38%,rgba(255,45,45,.24),transparent 70%); }}
#g-ember {{ background:radial-gradient(ellipse 80% 45% at 50% 45%,rgba(255,106,31,.2),transparent 70%); }}
#g-yellow {{ background:radial-gradient(ellipse 80% 45% at 50% 38%,rgba(255,210,63,.14),transparent 70%); }}
#haze {{ position:absolute; inset:0; opacity:0; }}
#haze i {{ position:absolute; display:block; border-radius:50%; }}
#veil {{ position:absolute; inset:0; z-index:12; opacity:0; background:linear-gradient(180deg,rgba(150,120,90,.10),rgba(150,120,90,.22) 60%,rgba(150,120,90,.06)); }}
#scan {{ position:absolute; inset:0; background:repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0 2px,transparent 2px 6px); z-index:20; }}
#vig {{ position:absolute; inset:0; background:radial-gradient(ellipse 75% 60% at 50% 45%,transparent 55%,rgba(0,0,0,.7)); z-index:21; }}
#glitch {{ position:absolute; inset:0; z-index:22; opacity:0; }}
#glitch i {{ position:absolute; left:0; right:0; display:block; }}
#captions {{ z-index:15; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1080" data-height="1920" data-fps="30">
  <div id="bg" data-layout-ignore></div>
  <div id="dots" data-layout-ignore></div>
  <div class="glow" id="g-blue" data-layout-ignore></div>
  <div class="glow" id="g-red" data-layout-ignore></div>
  <div class="glow" id="g-ember" data-layout-ignore></div>
  <div class="glow" id="g-yellow" data-layout-ignore></div>
  <div id="haze" data-layout-ignore>
    <i id="hz1" style="left:-600px;top:200px;width:2000px;height:1100px;background:radial-gradient(closest-side,rgba(176,146,110,.55),rgba(176,146,110,0))"></i>
    <i id="hz2" style="left:-300px;top:700px;width:1800px;height:1200px;background:radial-gradient(closest-side,rgba(150,118,84,.5),rgba(150,118,84,0))"></i>
    <i id="hz3" style="left:-900px;top:-100px;width:2200px;height:900px;background:radial-gradient(closest-side,rgba(190,165,130,.4),rgba(190,165,130,0))"></i>
  </div>
{hosts}
  <div id="veil" data-layout-ignore></div>
  <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{TOTAL}" data-track-index="3" data-track-kind="captions" data-width="1080" data-height="1920"></div>
  <div id="scan" data-layout-ignore></div>
  <div id="vig" data-layout-ignore></div>
  <div id="glitch" data-layout-ignore><i style="top:420px;height:26px;background:rgba(255,106,31,.5)"></i><i style="top:760px;height:10px;background:rgba(58,160,255,.45)"></i><i style="top:1010px;height:40px;background:rgba(255,255,255,.15)"></i><i style="top:1240px;height:8px;background:rgba(255,45,45,.55)"></i></div>
  <audio id="vo" class="clip" src="assets/voiceover.mp3" data-start="0" data-duration="80.3" data-track-index="4" data-volume="1"></audio>
  <audio id="sfx" class="clip" src="assets/sfx.wav" data-start="0" data-duration="{TOTAL}" data-track-index="5" data-volume="0.5"></audio>
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
tl.set("#glitch",{{opacity:0,x:0}},0);
tl.set("#haze",{{opacity:0}},0);
tl.set("#veil",{{opacity:0}},0);
tl.fromTo("#g-blue",{{opacity:0}},{{opacity:1,duration:.4}},0);
{haze_js}
tl.fromTo("#veil",{{opacity:0}},{{opacity:1,duration:1.6}},9.0);
tl.to("#veil",{{opacity:.35,duration:1.2}},13.45);
tl.to("#veil",{{opacity:.8,duration:1.2}},56.6);
tl.to("#veil",{{opacity:0,duration:2}},73.4);
tl.fromTo("#hz1",{{x:-200}},{{x:500,duration:{TOTAL},ease:"none"}},0);
tl.fromTo("#hz2",{{x:300}},{{x:-400,duration:{TOTAL},ease:"none"}},0);
tl.fromTo("#hz3",{{x:-100}},{{x:400,y:120,duration:{TOTAL},ease:"none"}},0);
{"".join(glow_js)}
{json.dumps(CUTS)}.forEach(t => {{
  tl.to("#glitch",{{opacity:1,duration:.03}},t-0.05);
  tl.to("#glitch",{{x:18,duration:.03}},t-0.02);
  tl.to("#glitch",{{opacity:0,duration:.05}},t+0.07);
  tl.set("#glitch",{{x:0}},t+0.12);
}});
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
print("hot dots", len(hot), "groups", len(groups)); print(" | ".join(" ".join(w["text"] for w in g) for g in groups))
