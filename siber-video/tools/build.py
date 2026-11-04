#!/usr/bin/env python3
"""Build index.html, compositions/*.html (scenes + captions) for siber-video.

Times are taken from the voiceover transcript (assets/transcript.json, real VO time).
Scene starts/durations are fixed here; every beat inside a scene is in local seconds (abs - scene start).
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOTAL = 58.8
SCENES = [  # id, start, duration
    ("hook", 0.0, 4.45),
    ("spike", 4.45, 4.65),
    ("map", 9.1, 14.75),
    ("how", 23.85, 7.3),
    ("who", 31.15, 4.35),
    ("kit", 35.5, 9.15),
    ("days", 44.65, 5.75),
    ("end", 50.4, 8.4),
]

BASE_CSS = r"""
#root { position:absolute; inset:0; color:#e9eef3; font-family:"Inter",sans-serif; }
#root .hud { position:absolute; left:80px; right:80px; top:196px; height:36px; font:500 28px "JetBrains Mono",monospace; letter-spacing:3px; color:#6b7785; }
#root .hud .l { position:absolute; left:0; top:0; }
#root .hud .r { position:absolute; right:0; top:0; text-align:right; }
#root .title { position:absolute; left:80px; right:80px; font-family:"Inter",sans-serif; font-weight:900; font-size:116px; letter-spacing:-4px; line-height:.94; }
#root .mono { font-family:"JetBrains Mono",monospace; }
#root .ice { color:#5ad1ff; } #root .warm { color:#ff9a3c; } #root .hot { color:#ff3b30; } #root .dim { color:#6b7785; }
#root .tag { display:inline-block; font:700 28px "JetBrains Mono",monospace; letter-spacing:5px; padding:12px 22px; border:3px solid currentColor; border-radius:8px; }
"""

S = {}

# ---------------------------------------------------------------- 1 HOOK
S["hook"] = dict(css=r"""
#hook-grid { position:absolute; left:60px; top:500px; width:960px; height:620px; }
#root .cell { position:absolute; width:225px; height:108px; border:2px solid #22303c; border-radius:10px; background:#0b1016; }
#root .cell .id { position:absolute; left:14px; top:9px; font:500 18px "JetBrains Mono"; color:#4a5866; letter-spacing:2px; }
#root .cell .v { position:absolute; left:0; right:0; top:30px; text-align:center; font:700 54px "JetBrains Mono"; color:#5ad1ff; }
#root .cell .h { position:absolute; inset:-2px; border:2px solid #ff3b30; border-radius:10px; background:rgba(255,59,48,.16); opacity:0; }
#root .cell .h .v { color:#ff3b30; top:32px; }
#hook-t1, #hook-t2, #hook-t3 { top:250px; }
#hook-t3 { font-size:170px; color:#ff3b30; top:265px; }
""", html=r"""
<div class="hud"><span class="l">03:14 · MALAM</span><span class="r ice" id="hook-ok">● 20 UNIT ONLINE</span><span class="r hot" id="hook-al" style="opacity:0">▲ 20 UNIT ALARM</span></div>
<div class="title" id="hook-t1">SATU<br>MALAM…</div>
<div class="title" id="hook-t2" style="opacity:0">RATUSAN<br>PETI BEKU.</div>
<div class="title" id="hook-t3" style="opacity:0">SERENTAK.</div>
<div id="hook-grid">__CELLS__</div>
""", js=r"""
const order=[7,13,2,18,10,0,15,5,11,19,3,8,16,1,12,6,17,9,4,14];
order.forEach((ci,k)=>{const x=k/19, t=1.25+2.45*(1-(1-x)*(1-x));
  tl.fromTo(`#hook-c${ci} .h`,{opacity:0},{opacity:1,duration:.07},t);
  tl.fromTo(`#hook-c${ci} > .v`,{opacity:1},{opacity:0,duration:.05},t);
  tl.fromTo(`#hook-c${ci}`,{scale:1.08},{scale:1,duration:.25,ease:"power2.out"},t);});
tl.fromTo("#hook-t1",{opacity:1},{opacity:0,duration:.12},0.78);
tl.fromTo("#hook-t2",{opacity:0,y:30},{opacity:1,y:0,duration:.3,ease:"power3.out"},0.83);
tl.to("#hook-t2",{opacity:0,duration:.1},3.72);
tl.fromTo("#hook-t3",{opacity:0,scale:1.35},{opacity:1,scale:1,duration:.22,ease:"power4.out"},3.81);
tl.fromTo("#hook-grid",{x:0},{x:10,duration:.04,yoyo:true,repeat:9,ease:"none"},3.81);
tl.fromTo("#hook-ok",{opacity:1},{opacity:0,duration:.1},3.81);
tl.fromTo("#hook-al",{opacity:0},{opacity:1,duration:.1},3.81);
""")
cells = []
for i in range(20):
    c, r = i % 4, i // 4
    cells.append(f'<div class="cell" data-layout-allow-overlap id="hook-c{i}" style="left:{c*245}px;top:{r*128}px"><span class="id" data-layout-ignore>F-{i+1:02d}</span>'
                 f'<div class="v">-18°</div><div class="h"><div class="v">50°</div></div></div>')
S["hook"]["html"] = S["hook"]["html"].replace("__CELLS__", "".join(cells))

# ---------------------------------------------------------------- 2 SPIKE
S["spike"] = dict(css=r"""
#spike-tag { position:absolute; left:0; right:0; top:300px; text-align:center; }
#spike-num { position:absolute; left:0; right:0; top:370px; text-align:center; font:700 290px "JetBrains Mono"; letter-spacing:-12px; color:#5ad1ff; line-height:1; }
#spike-track { position:absolute; left:190px; width:700px; top:720px; height:18px; border-radius:9px; background:#1b222b; overflow:hidden; }
#spike-fill { position:absolute; left:0; top:0; bottom:0; width:700px; background:linear-gradient(90deg,#5ad1ff,#ff9a3c 60%,#ff3b30); transform-origin:0 50%; }
#spike-a { top:810px; font-size:72px; letter-spacing:-2px; text-align:center; color:#6b7785; }
#spike-b { top:900px; font-size:180px; text-align:center; letter-spacing:-6px; }
#root .gl { position:absolute; left:0; right:0; top:0; text-align:center; }
""", html=r"""
<div class="hud"><span class="l">FREEZER-03 · LORONG 7</span><span class="r ice" id="spike-ok">● NORMAL</span><span class="r hot" id="spike-al" style="opacity:0">▲ ALARM</span></div>
<div id="spike-tag"><span class="tag ice" id="spike-tagi">SUHU SEMASA</span></div>
<div id="spike-num">-18°</div>
<div id="spike-track"><div id="spike-fill"></div></div>
<div class="title" id="spike-a" style="opacity:0">BUKAN ROSAK.</div>
<div class="title" id="spike-b" style="opacity:0"><span class="gl" id="spike-g1" style="color:#00e5ff;opacity:.75">DIGODAM.</span><span class="gl" id="spike-g2" style="color:#ff2a6d;opacity:.75">DIGODAM.</span><span class="gl" style="color:#fff">DIGODAM.</span></div>
""", js=r"""
const num=document.getElementById("spike-num"); const T={v:-18};
tl.fromTo(T,{v:-18},{v:50,duration:2.09,ease:"power2.in",onUpdate:()=>{num.textContent=Math.round(T.v)+"°";}},0.36);
tl.fromTo("#spike-num",{color:"#5ad1ff",textShadow:"0 0 60px rgba(90,209,255,.5)"},{color:"#ff3b30",textShadow:"0 0 90px rgba(255,59,48,.75)",duration:2.09,ease:"power2.in"},0.36);
tl.fromTo("#spike-fill",{scaleX:.08},{scaleX:1,duration:2.09,ease:"power2.in"},0.36);
tl.fromTo("#spike-tagi",{color:"#5ad1ff"},{color:"#ff3b30",duration:.2},1.9);
tl.fromTo("#spike-ok",{opacity:1},{opacity:0,duration:.1},1.9);
tl.fromTo("#spike-al",{opacity:0},{opacity:1,duration:.1},1.9);
tl.fromTo("#spike-num",{x:0},{x:8,duration:.04,yoyo:true,repeat:7,ease:"none"},2.45);
tl.fromTo("#spike-a",{opacity:0,y:24},{opacity:1,y:0,duration:.3,ease:"power3.out"},3.03);
tl.fromTo("#spike-b",{opacity:0,scale:1.5},{opacity:1,scale:1,duration:.2,ease:"power4.out"},4.07);
[[4.07,-9,7],[4.17,6,-5],[4.27,-3,3],[4.37,0,0]].forEach(([t,a,b])=>{
  tl.set("#spike-g1",{x:a,y:-b*0.4},t); tl.set("#spike-g2",{x:b,y:a*0.4},t);});
""")

# ---------------------------------------------------------------- 3+4 MAP
S["map"] = dict(css=r"""
#map-svg { position:absolute; left:110px; top:530px; overflow:visible; }
#root .num { position:absolute; left:80px; top:222px; font:700 210px "JetBrains Mono"; letter-spacing:-10px; line-height:1; color:#ff3b30; text-shadow:0 0 70px rgba(255,59,48,.45); }
#root .lab { position:absolute; left:84px; top:446px; font:900 46px "Inter"; letter-spacing:1px; }
#root .chip { position:absolute; font:700 28px "JetBrains Mono"; letter-spacing:2px; color:#ff3b30; background:rgba(7,9,12,.88); border:2px solid #ff3b30; border-radius:8px; padding:10px 16px; white-space:nowrap; }
#map-n2 { color:#e9eef3; text-shadow:none; }
""", html=r"""
<div class="hud"><span class="l" id="map-d1">12 OKT 2026</span><span class="l" id="map-d2" style="opacity:0">02 NOV 2026</span>
<span class="r hot" id="map-s1">▲ PERANCIS</span><span class="r hot" id="map-s2" style="opacity:0">▲ +5 NEGARA</span></div>
<div class="num" id="map-n1">0</div>
<div class="num" id="map-n2" style="opacity:0">2 NOV.</div>
<div class="num" id="map-n3" style="opacity:0">100+</div>
<div class="lab" id="map-l1" style="opacity:0">PASAR RAYA · PERANCIS</div>
<div class="lab dim" id="map-l2" style="opacity:0">IA BERULANG.</div>
<div class="lab" id="map-l3" style="opacity:0">KEDAI · 5 NEGARA</div>
<svg id="map-svg" width="860" height="592" viewBox="0 0 860 592">__MAP__</svg>
<div class="chip" id="map-c1" style="left:470px;top:880px;opacity:0">▲ KEBAKARAN</div>
<div class="chip" id="map-c2" style="left:470px;top:960px;opacity:0">▲ BERTAN-TAN MAKANAN DIBUANG</div>
""", js=r"""
tl.fromTo("#map-base",{opacity:0},{opacity:1,duration:.5},0);
// wave 1: France
tl.fromTo("#map-hot-FR",{opacity:0},{opacity:1,duration:.25},0.35);
tl.fromTo("#map-g-FR",{opacity:0,scale:.3},{opacity:1,scale:1,duration:.5,ease:"power2.out",transformOrigin:"50% 50%"},0.35);
tl.fromTo("#map-k-FR",{opacity:0},{opacity:1,duration:.2},0.45);
tl.fromTo("#map-l1",{opacity:0,y:20},{opacity:1,y:0,duration:.3},0.4);
const n1=document.getElementById("map-n1"); const C={v:0};
tl.fromTo(C,{v:0},{v:700,duration:.9,ease:"power2.out",onUpdate:()=>{n1.textContent=Math.round(C.v);}},2.1);
tl.fromTo("#map-n1",{scale:1},{scale:1.06,duration:.12,yoyo:true,repeat:1,transformOrigin:"0% 50%"},3.0);
tl.fromTo("#map-c1",{opacity:0,y:16},{opacity:1,y:0,duration:.25,ease:"back.out(2)"},5.39);
tl.fromTo("#map-c2",{opacity:0,y:16},{opacity:1,y:0,duration:.25,ease:"back.out(2)"},6.1);
// wave 2
tl.to(["#map-c1","#map-c2","#map-n1","#map-l1","#map-d1","#map-s1"],{opacity:0,duration:.2},8.4);
tl.to("#map-hot-FR",{opacity:.45,duration:.4},8.4);
tl.to("#map-g-FR",{opacity:.35,duration:.4},8.4);
tl.fromTo(["#map-n2","#map-d2","#map-s2"],{opacity:0},{opacity:1,duration:.2},8.56);
tl.fromTo("#map-l2",{opacity:0,y:20},{opacity:1,y:0,duration:.3},9.0);
[["BE",10.15],["LU",10.74],["IE",11.61],["SE",12.18],["EE",12.88]].forEach(([k,t])=>{
  tl.fromTo(`#map-a-${k}`,{strokeDashoffset:1},{strokeDashoffset:0,duration:.35,ease:"power2.out"},t-0.3);
  tl.fromTo(`#map-hot-${k}`,{opacity:0},{opacity:1,duration:.15},t);
  tl.fromTo(`#map-g-${k}`,{opacity:0,scale:.2},{opacity:1,scale:1,duration:.45,ease:"power2.out",transformOrigin:"50% 50%"},t);
  tl.fromTo(`#map-k-${k}`,{opacity:0,y:10},{opacity:1,y:0,duration:.2,ease:"back.out(2)"},t);});
tl.to(["#map-n2","#map-l2"],{opacity:0,duration:.12},13.68);
tl.fromTo("#map-n3",{opacity:0,scale:1.3},{opacity:1,scale:1,duration:.25,ease:"power4.out",transformOrigin:"0% 50%"},13.79);
tl.fromTo("#map-l3",{opacity:0,y:20},{opacity:1,y:0,duration:.3},13.85);
""")
# map geometry
L0, L1, A0, A1, W, H = -11, 31, 43, 61.5, 860, 592
def px(lo, la): return ((lo - L0) / (L1 - L0) * W, (A1 - la) / (A1 - A0) * H)
P = {
 "main": [[-9,43.6],[-1.5,43.4],[-1.2,46],[-4.5,47.8],[-4.6,48.6],[-1.5,48.7],[1.5,50.1],[3,51.2],[4.5,52.9],[6,53.5],[8.5,53.9],[8.6,55],[8.1,56.8],[10.5,57.6],[10.8,56],[12.5,55.5],[10.9,54],[14,54],[18,54.8],[21,55.3],[21,56.5],[21.6,57.5],[23.5,59.2],[28,59.5],[31,60],[31,42],[28,41],[19.4,42],[15,44.6],[13.7,45.6],[12.3,45.3],[12.4,44.2],[14,42.5],[12,42],[10.5,43],[8.8,44.4],[7.5,43.7],[5,43.3],[3.1,43],[3.2,41.9],[-9,42]],
 "gb": [[-5.7,50.1],[1.4,51.1],[1.7,52.7],[0.2,53.5],[-1.5,55],[-2,56],[-1.8,57.6],[-3,58.6],[-5,58.6],[-6.2,56.5],[-5,55],[-3,54.5],[-3.2,53.4],[-4.6,52.8],[-5.2,51.7],[-3.2,51.4]],
 "ie": [[-6,52.2],[-6.2,53.9],[-5.6,54.6],[-7.4,55.3],[-8.6,54.6],[-10,54],[-10,52],[-9.4,51.5]],
 "sc": [[5,58.5],[5.2,61],[5,62],[18,62],[17.5,61],[18.8,60],[18.5,59.3],[16.8,58],[16.4,56.3],[14.3,55.4],[12.9,55.5],[12.5,56.5],[11.5,58],[10.6,59.4],[8,58],[6.6,58.1]],
 "fi": [[21.3,60.8],[22.5,60],[25,60.3],[28,60.6],[31,61],[31,62],[21.5,62]],
}
def inside(p, poly):
    c = False; j = len(poly) - 1
    for i in range(len(poly)):
        a, b = poly[i]; x, y = poly[j]
        if (b > p[1]) != (y > p[1]) and p[0] < (x - a) * (p[1] - b) / (y - b) + a: c = not c
        j = i
    return c
CC = {"FR": (2.5, 46.6, "PERANCIS", 3.0), "BE": (4.6, 50.7, "BELGIUM", 1.1), "LU": (6.1, 49.7, "LUXEMBOURG", .7),
      "IE": (-8, 53.2, "IRELAND", 1.3), "SE": (15.5, 59.3, "SWEDEN", 1.9), "EE": (25.5, 58.7, "ESTONIA", 1.1)}
LABEL = {"FR": (-18, 44, "end"), "BE": (-16, -10, "end"), "LU": (16, 30, "start"), "IE": (18, -14, "start"), "SE": (-18, -14, "end"), "EE": (0, 40, "middle")}
base, hot = [], {k: [] for k in CC}
lo = L0
while lo <= L1 + 1e-6:
    la = A0
    while la <= A1 + 1e-6:
        if any(inside((lo, la), p) for p in P.values()):
            x, y = px(lo, la)
            base.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.6"/>')
            for k, (cl, ca, _, r) in CC.items():
                if ((lo - cl) * .64) ** 2 + (la - ca) ** 2 < (r * .75) ** 2:
                    hot[k].append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5.2"/>')
        la += 0.55
    lo += 0.75
svg = ['<defs><radialGradient id="map-glow"><stop offset="0" stop-color="#ff3b30" stop-opacity=".5"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient></defs>']
fx, fy = px(*CC["FR"][:2])
for k, (cl, ca, name, r) in CC.items():
    x, y = px(cl, ca); g = 120 if k == "FR" else 60
    svg.append(f'<circle id="map-g-{k}" cx="{x:.1f}" cy="{y:.1f}" r="{g}" fill="url(#map-glow)" opacity="0"/>')
svg.append(f'<g id="map-base" fill="#2b3642">{"".join(base)}</g>')
for k, (cl, ca, name, r) in CC.items():
    x, y = px(cl, ca)
    if k != "FR":
        svg.append(f'<path id="map-a-{k}" d="M{fx:.1f},{fy:.1f} Q{(fx+x)/2:.1f},{min(fy,y)-70:.1f} {x:.1f},{y:.1f}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" stroke="#ff3b30" stroke-width="3" fill="none" opacity=".85"/>')
    svg.append(f'<g id="map-hot-{k}" fill="#ff3b30" opacity="0">{"".join(hot[k])}</g>')
for k, (cl, ca, name, r) in CC.items():
    x, y = px(cl, ca); dx, dy, anc = LABEL[k]
    svg.append(f'<g id="map-k-{k}" opacity="0"><circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="#fff"/>'
               f'<text x="{x+dx:.1f}" y="{y+dy:.1f}" text-anchor="{anc}" fill="#fff" font-family="JetBrains Mono" font-weight="700" font-size="28" '
               f'paint-order="stroke" stroke="#07090c" stroke-width="8">{name}</text></g>')
S["map"]["html"] = S["map"]["html"].replace("__MAP__", "".join(svg))

# ---------------------------------------------------------------- 5 HOW
S["how"] = dict(css=r"""
#how-t { top:236px; }
#root .box { position:absolute; left:80px; width:920px; height:112px; border:3px solid #2a3440; border-radius:14px; background:#0b1016; }
#root .box .n { position:absolute; left:30px; top:40px; font:500 28px "JetBrains Mono"; color:#6b7785; }
#root .box .t { position:absolute; left:100px; top:16px; font:900 44px "Inter"; letter-spacing:1px; }
#root .box .s { position:absolute; left:100px; top:68px; font:500 28px "JetBrains Mono"; color:#6b7785; }
#root .con { position:absolute; left:538px; width:4px; height:38px; background:#3a4654; transform-origin:50% 0; }
#how-b3 { border-color:#ff9a3c; } #how-b4 { border-color:#ff3b30; }
#how-red { position:absolute; inset:0; border-radius:11px; background:rgba(255,59,48,.22); opacity:0; }
""", html=r"""
<div class="hud"><span class="l">CARA SERANGAN</span><span class="r warm">04 LANGKAH</span></div>
<div class="title" id="how-t">MACAM<br><span class="warm">MANA?</span></div>
<div class="box" id="how-b1" style="top:500px;opacity:0"><span class="n">01</span><span class="t">INTERNET</span><span class="s">peti sejuk disambung online</span></div>
<div class="con" id="how-k1" style="top:612px"></div>
<div class="box" id="how-b2" style="top:650px;opacity:0"><span class="n">02</span><span class="t">SISTEM LAMA</span><span class="s">perisian tak dikemas kini</span></div>
<div class="con" id="how-k2" style="top:762px"></div>
<div class="box" id="how-b3" style="top:800px;opacity:0"><span class="n">03</span><span class="t">KATA LALUAN</span><span class="s warm"><span id="how-p1">••••</span><span id="how-p2" style="display:none">1 2 3 4 — senang teka</span></span></div>
<div class="con" id="how-k3" style="top:912px"></div>
<div class="box" id="how-b4" style="top:950px;opacity:0"><div id="how-red"></div><span class="n">04</span><span class="t hot">MOD DEFROST</span><span class="s">suhu dinaikkan ▲</span></div>
""", js=r"""
tl.fromTo("#how-t",{opacity:0,y:30},{opacity:1,y:0,duration:.3,ease:"power3.out"},0.07);
[["#how-b1",.88],["#how-b2",2.94],["#how-b3",3.81],["#how-b4",6.12]].forEach(([s,t])=>
  tl.fromTo(s,{opacity:0,x:-40},{opacity:1,x:0,duration:.3,ease:"power3.out"},t));
[["#how-k1",2.7],["#how-k2",3.6],["#how-k3",5.9]].forEach(([s,t])=>tl.fromTo(s,{scaleY:0},{scaleY:1,duration:.22},t));
tl.set("#how-p1",{display:"inline"},0);tl.set("#how-p2",{display:"none"},0);
tl.set("#how-p1",{display:"none"},4.5);tl.set("#how-p2",{display:"inline"},4.5);
tl.fromTo("#how-red",{opacity:0},{opacity:1,duration:.12,yoyo:true,repeat:5},6.7);
tl.fromTo("#how-b4",{x:0},{x:8,duration:.04,yoyo:true,repeat:7,ease:"none"},6.7);
""")

# ---------------------------------------------------------------- 6 WHO
S["who"] = dict(css=r"""
#who-t { top:236px; }
#who-q { position:absolute; left:0; right:0; top:380px; text-align:center; font:900 640px "Inter"; line-height:1; color:#151c25; }
#who-s { position:absolute; left:0; right:0; top:640px; text-align:center; }
#who-s span { display:inline-block; font:900 84px "Inter"; letter-spacing:4px; color:#ff3b30; border:9px solid #ff3b30; border-radius:14px; padding:14px 30px; }
#root .chk { position:absolute; left:80px; font:700 36px "JetBrains Mono"; letter-spacing:1px; }
""", html=r"""
<div class="hud"><span class="l">FAIL SIASATAN</span><span class="r">STATUS: TERBUKA</span></div>
<div id="who-q" data-layout-ignore>?</div>
<div class="title" id="who-t">SIAPA<br>DALANG?</div>
<div id="who-s"><span id="who-st">BELUM DISAHKAN</span></div>
<div class="chk" id="who-c1" style="top:930px;opacity:0"><span class="ice">✓</span> TIADA PIHAK MENGAKU</div>
<div class="chk" id="who-c2" style="top:1010px;opacity:0"><span class="ice">✓</span> SIASATAN MASIH BERJALAN</div>
""", js=r"""
tl.fromTo("#who-t",{opacity:0,y:30},{opacity:1,y:0,duration:.3,ease:"power3.out"},0.11);
tl.fromTo("#who-q",{opacity:0,scale:.85},{opacity:1,scale:1,duration:.6,ease:"power2.out"},0.11);
tl.fromTo("#who-q",{rotation:0},{rotation:4,duration:.5,yoyo:true,repeat:7,ease:"sine.inOut"},0.7);
tl.fromTo("#who-c1",{opacity:0,x:-30},{opacity:1,x:0,duration:.3},1.73);
tl.fromTo("#who-st",{opacity:0,scale:2.2,rotation:-9},{opacity:.95,scale:1,rotation:-9,duration:.16,ease:"power4.in"},2.25);
tl.fromTo("#who-s",{y:0},{y:6,duration:.05,yoyo:true,repeat:3},2.41);
tl.fromTo("#who-c2",{opacity:0,x:-30},{opacity:1,x:0,duration:.3},3.12);
""")

# ---------------------------------------------------------------- 7 KIT
ICON = {
 "air": '<rect x="20" y="8" width="12" height="8" rx="2"/><path d="M16 16h20v40a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4z"/><path d="M16 32h20"/>',
 "tin": '<ellipse cx="26" cy="16" rx="14" ry="5"/><path d="M12 16v34c0 3 6 6 14 6s14-3 14-6V16"/><path d="M12 30h28"/>',
 "lampu": '<path d="M14 10h24l-5 16H19z"/><rect x="20" y="26" width="12" height="30" rx="3"/>',
 "radio": '<rect x="8" y="20" width="36" height="30" rx="4"/><circle cx="20" cy="35" r="7"/><path d="M32 30h6M32 38h6M16 20l20-12"/>',
 "tunai": '<rect x="6" y="18" width="40" height="24" rx="3"/><circle cx="26" cy="30" r="6"/>',
 "ubat": '<rect x="8" y="22" width="36" height="16" rx="8" transform="rotate(-35 26 30)"/><path d="M20 22l12 16"/>',
}
ITEMS = [("air", "AIR", "3 L/orang/hari", 5.11), ("tin", "MAKANAN", "tak perlu masak", 5.34), ("lampu", "LAMPU SULUH", "+ bateri", 6.10),
         ("radio", "RADIO", "bateri/engkol", 7.13), ("tunai", "DUIT TUNAI", "syiling & not", 7.75), ("ubat", "UBAT", "+ first aid", 8.71)]
S["kit"] = dict(css=r"""
#kit-tag { position:absolute; left:80px; top:250px; }
#kit-t1, #kit-t2 { top:330px; }
#root .it { position:absolute; width:300px; height:250px; border:3px solid #2a3440; border-radius:16px; background:#0b1016; }
#root .it svg { position:absolute; left:28px; top:24px; }
#root .it .nm { position:absolute; left:28px; top:152px; white-space:nowrap; font:900 32px "Inter"; letter-spacing:.5px; }
#root .it .sb { position:absolute; left:28px; top:200px; font:500 28px "JetBrains Mono"; color:#6b7785; }
#root .it .ok { position:absolute; right:22px; top:18px; font:700 36px "JetBrains Mono"; color:#5ad1ff; }
""", html=r"""
<div class="hud"><span class="l">KIT KECEMASAN</span><span class="r warm">06 ITEM</span></div>
<div id="kit-tag" style="opacity:0"><span class="tag warm">PESANAN KERAJAAN EROPAH</span></div>
<div class="title" id="kit-t1" style="opacity:0">DALAM MASA<br>YANG SAMA…</div>
<div class="title" id="kit-t2" style="opacity:0">SIMPAN<br><span class="warm">DI RUMAH.</span></div>
__ITEMS__
""", js=r"""
tl.fromTo("#kit-t1",{opacity:0,y:30},{opacity:1,y:0,duration:.3,ease:"power3.out"},0.12);
tl.fromTo("#kit-tag",{opacity:0,y:-14},{opacity:1,y:0,duration:.25},1.22);
tl.to("#kit-t1",{opacity:0,duration:.12},2.96);
tl.fromTo("#kit-t2",{opacity:0,scale:1.15},{opacity:1,scale:1,duration:.28,ease:"power4.out",transformOrigin:"0% 50%"},3.08);
__ITEMJS__
""")
items_html, items_js = [], []
for i, (k, n, s, t) in enumerate(ITEMS):
    c, r = i % 3, i // 3
    items_html.append(f'<div class="it" id="kit-i{i}" style="left:{80+c*330}px;top:{590+r*280}px;opacity:0">'
                      f'<svg width="104" height="124" viewBox="0 0 52 62" fill="none" stroke="#e9eef3" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">{ICON[k]}</svg>'
                      f'<span class="ok" id="kit-k{i}" style="opacity:0">✓</span><span class="nm">{n}</span><span class="sb">{s}</span></div>')
    items_js.append(f'tl.fromTo("#kit-i{i}",{{opacity:0,y:-80}},{{opacity:1,y:0,duration:.35,ease:"back.out(1.8)"}},{t-0.08:.2f});'
                    f'tl.fromTo("#kit-k{i}",{{opacity:0,scale:1.8}},{{opacity:1,scale:1,duration:.2}},{t+0.2:.2f});')
S["kit"]["html"] = S["kit"]["html"].replace("__ITEMS__", "\n".join(items_html))
S["kit"]["js"] = S["kit"]["js"].replace("__ITEMJS__", "\n".join(items_js))

# ---------------------------------------------------------------- 8 DAYS
ROWS = [("EU", 3, "#5ad1ff", 1.11, 1.76), ("UK", 3, "#5ad1ff", 1.42, 1.76), ("SWEDEN", 7, "#ff9a3c", 2.60, 3.28), ("JERMAN", 10, "#ff3b30", 4.32, 4.72)]
S["days"] = dict(css=r"""
#days-t { top:236px; }
#days-src { position:absolute; left:80px; top:470px; font:500 28px "JetBrains Mono"; color:#6b7785; }
#root .rw { position:absolute; left:80px; width:920px; }
#root .rw .lb { font:700 30px "JetBrains Mono"; letter-spacing:3px; color:#9aa5b1; }
#root .rw .br { position:absolute; left:0; top:46px; height:74px; border-radius:10px; transform-origin:0 50%; }
#root .rw .vl { position:absolute; left:22px; top:62px; font:700 40px "JetBrains Mono"; color:#07090c; }
""", html=r"""
<div class="hud"><span class="l">CADANGAN RASMI</span><span class="r warm">HARI STOK</span></div>
<div class="title" id="days-t">BERAPA<br><span class="warm">LAMA?</span></div>
<div id="days-src" style="opacity:0">sumber: EU · UK Be Ready · MCF Sweden · Jerman</div>
__ROWS__
""", js=r"""
tl.fromTo("#days-t",{opacity:0,y:30},{opacity:1,y:0,duration:.3,ease:"power3.out"},0.12);
tl.fromTo("#days-src",{opacity:0},{opacity:1,duration:.4},0.6);
__ROWJS__
""")
rows_html, rows_js = [], []
for i, (n, d, col, tl_, tb) in enumerate(ROWS):
    w = 150 + d * 77
    rows_html.append(f'<div class="rw" id="days-r{i}" style="top:{540+i*150}px;height:130px;opacity:0"><div class="lb">{n}</div>'
                     f'<div class="br" id="days-b{i}" style="width:{w}px;background:{col}"></div><div class="vl" id="days-v{i}" style="opacity:0">{d} HARI</div></div>')
    rows_js.append(f'tl.fromTo("#days-r{i}",{{opacity:0,x:-30}},{{opacity:1,x:0,duration:.25}},{tl_:.2f});'
                   f'tl.fromTo("#days-b{i}",{{scaleX:0}},{{scaleX:1,duration:.55,ease:"power3.out"}},{tb:.2f});'
                   f'tl.fromTo("#days-v{i}",{{opacity:0}},{{opacity:1,duration:.15}},{tb+0.25:.2f});')
S["days"]["html"] = S["days"]["html"].replace("__ROWS__", "\n".join(rows_html))
S["days"]["js"] = S["days"]["js"].replace("__ROWJS__", "\n".join(rows_js))

# ---------------------------------------------------------------- 9 END
S["end"] = dict(css=r"""
#end-tmp { position:absolute; left:0; right:0; top:250px; text-align:center; font:700 170px "JetBrains Mono"; letter-spacing:-6px; line-height:1; color:#ff3b30; }
#end-a { top:520px; font-size:100px; text-align:center; }
#end-b { top:660px; font-size:64px; letter-spacing:-1px; text-align:center; color:#6b7785; }
#end-c { top:540px; font-size:160px; text-align:center; }
#end-d { top:720px; font-size:160px; text-align:center; color:#5d6976; }
#end-x { position:absolute; left:250px; width:580px; top:800px; height:14px; background:#ff3b30; border-radius:7px; transform-origin:0 50%; }
#end-tag { position:absolute; left:0; right:0; top:980px; text-align:center; }
#end-tag .tag { font-size:40px; padding:16px 30px; color:#e9eef3; }
""", html=r"""
<div class="hud"><span class="l">FREEZER-03 · LORONG 7</span><span class="r hot" id="end-s1">▲ ALARM</span><span class="r ice" id="end-s2" style="opacity:0">● PULIH</span></div>
<div id="end-tmp">50°</div>
<div class="title" id="end-a" style="opacity:0">INI PERSEDIAAN.</div>
<div class="title" id="end-b" style="opacity:0">BUKAN AMARAN PERANG.</div>
<div class="title" id="end-c" style="opacity:0">BERSEDIA.</div>
<div class="title" id="end-d" style="opacity:0">PANIK.</div>
<div id="end-x"></div>
<div id="end-tag" style="opacity:0"><span class="tag">JANGAN BELI BORONG</span></div>
""", js=r"""
const tmp=document.getElementById("end-tmp"); const T={v:50};
tl.fromTo(T,{v:50},{v:-18,duration:4.9,ease:"power1.inOut",onUpdate:()=>{tmp.textContent=Math.round(T.v)+"°";}},0.6);
tl.fromTo("#end-tmp",{color:"#ff3b30",textShadow:"0 0 70px rgba(255,59,48,.6)"},{color:"#5ad1ff",textShadow:"0 0 70px rgba(90,209,255,.5)",duration:4.9,ease:"power1.inOut"},0.6);
tl.fromTo("#end-s1",{opacity:1},{opacity:0,duration:.2},5.4);
tl.fromTo("#end-s2",{opacity:0},{opacity:1,duration:.2},5.4);
tl.fromTo("#end-a",{opacity:0,y:30},{opacity:1,y:0,duration:.3,ease:"power3.out"},0.85);
tl.fromTo("#end-b",{opacity:0,y:20},{opacity:1,y:0,duration:.3,ease:"power3.out"},1.8);
tl.fromTo("#end-tag",{opacity:0,scale:1.2},{opacity:1,scale:1,duration:.25,ease:"back.out(2)"},4.48);
tl.to(["#end-a","#end-b"],{opacity:0,duration:.15},5.4);
tl.fromTo("#end-c",{opacity:0,scale:1.25},{opacity:1,scale:1,duration:.28,ease:"power4.out"},5.58);
tl.fromTo("#end-d",{opacity:0,y:20},{opacity:1,y:0,duration:.25},6.16);
tl.fromTo("#end-x",{scaleX:0},{scaleX:1,duration:.3,ease:"power3.out"},6.4);
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

# ---------------------------------------------------------------- CAPTIONS
FIX = {"negatif": "tolak", "Prancis,": "Perancis,", "bertantan": "bertan-tan", "Tong": "tong", "Sampa,": "sampah.",
       "dalam?": "dalang?", "German,": "Jerman,", "2": "Dua"}
words = json.load(open(os.path.join(ROOT, "assets", "transcript.json")))
words = words.get("words", words) if isinstance(words, dict) else words
W_ = []
for i, w in enumerate(words):
    t = w["text"].strip()
    if t == "dalam?" and i > 0 and words[i-1]["text"].startswith("Siapa"): t = "dalang?"
    elif t != "dalam?": t = FIX.get(t, t)
    W_.append(dict(text=t, start=w["start"], end=w["end"]))
def accent(t):
    if t < 3.8: return "#5ad1ff"
    if t < 35.5: return "#ff3b30"
    if t < 50.4: return "#ff9a3c"
    return "#5ad1ff"
MAXC = 24
def L(ws): return len(" ".join(x["text"] for x in ws))
def split_bal(ws):
    if L(ws) <= MAXC or len(ws) == 1: return [ws]
    best = min(range(1, len(ws)), key=lambda k: max(L(ws[:k]), L(ws[k:])) + (8 if ws[k-1]["text"].lower() in ("di","ke","dan","yang") else 0))
    return split_bal(ws[:best]) + split_bal(ws[best:])
sents, cur = [], []
for i, w in enumerate(W_):
    cur.append(w); nxt = W_[i+1] if i + 1 < len(W_) else None
    if nxt is None or re.search(r"[.?]$", w["text"]) or nxt["start"] - w["end"] > 0.35:
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
    g1 = min(max(g[-1]["end"] + 0.45, g[-1]["end"]), nxt0)
    spans = []
    for wi, w in enumerate(g):
        spans.append(f'<span class="w" id="cap-{gi}-{wi}">{w["text"]}{" " if wi + 1 < len(g) else ""}</span>')
    cap_html.append(f'<div class="grp" id="cap-{gi}"><span class="box">{"".join(spans)}<span class="cur" id="cap-{gi}-c">▌</span></span></div>')
    js = [f'tl.set("#cap-{gi}-{wi}",{{display:"none"}},0);' for wi in range(len(g))]
    js.append(f'tl.set("#cap-{gi}",{{opacity:1,visibility:"visible"}},{g0:.3f});')
    for wi, w in enumerate(g):
        a = accent(w["start"])
        js.append(f'tl.set("#cap-{gi}-{wi}",{{display:"inline",color:"{a}"}},{max(g0, w["start"]-0.03):.3f});')
        if wi + 1 < len(g):
            js.append(f'tl.set("#cap-{gi}-{wi}",{{color:"#e9eef3"}},{g[wi+1]["start"]-0.03:.3f});')
    js.append(f'tl.set("#cap-{gi}-c",{{color:"{accent(g[0]["start"])}"}},{g0:.3f});')
    k = g0 + 0.4
    on = False
    while k < g1 - 0.1:
        js.append(f'tl.set("#cap-{gi}-c",{{opacity:{1 if on else 0}}},{k:.3f});'); on = not on; k += 0.4
    js.append(f'tl.to("#cap-{gi}",{{opacity:0,duration:.1}},{g1-0.1:.3f});tl.set("#cap-{gi}",{{opacity:0,visibility:"hidden"}},{g1:.3f});')
    cap_js.append("".join(js))
CAP = f"""<template>
<style>
#root {{ position:absolute; inset:0; }}
#root .grp {{ position:absolute; left:80px; right:80px; top:1196px; text-align:left; opacity:0; visibility:hidden; }}
#root .box {{ display:inline-block; white-space:pre; font:700 46px "JetBrains Mono",monospace; color:#e9eef3; background:rgba(7,9,12,.84); border:2px solid #2a3440; border-radius:12px; padding:16px 26px; line-height:1.15; }}
#root .w {{ display:none; }}
#root .cur {{ margin-left:6px; }}
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

# ---------------------------------------------------------------- INDEX
CUTS = [s for _, s, _ in SCENES[1:]]
hosts = "\n".join(
    f'  <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{st}" data-duration="{du}" '
    f'data-track-index="2" data-track-kind="graphics" data-width="1080" data-height="1920"></div>' for sid, st, du in SCENES)
INDEX = f"""<!doctype html>
<html lang="ms">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="assets/lib/gsap.min.js"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ width:1080px; height:1920px; overflow:hidden; background:#07090c; }}
#root {{ position:relative; width:1080px; height:1920px; overflow:hidden; }}
#bg {{ position:absolute; inset:0; background:#07090c; }}
#dots {{ position:absolute; inset:0; background-image:radial-gradient(circle,rgba(255,255,255,.07) 1.6px,transparent 2px); background-size:36px 36px; }}
.glow {{ position:absolute; inset:0; }}
#g-ice {{ background:radial-gradient(ellipse 80% 45% at 50% 38%,rgba(90,209,255,.16),transparent 70%); }}
#g-hot {{ background:radial-gradient(ellipse 80% 45% at 50% 38%,rgba(255,59,48,.24),transparent 70%); opacity:0; }}
#g-warm {{ background:radial-gradient(ellipse 80% 45% at 50% 38%,rgba(255,154,60,.18),transparent 70%); opacity:0; }}
#scan {{ position:absolute; inset:0; background:repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0 2px,transparent 2px 6px); z-index:20; }}
#vig {{ position:absolute; inset:0; background:radial-gradient(ellipse 75% 60% at 50% 45%,transparent 55%,rgba(0,0,0,.65)); z-index:21; }}
#glitch {{ position:absolute; inset:0; z-index:22; opacity:0; }}
#glitch i {{ position:absolute; left:0; right:0; display:block; }}
#captions {{ z-index:15; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1080" data-height="1920" data-fps="30">
  <div id="bg" data-layout-ignore></div>
  <div id="dots" data-layout-ignore></div>
  <div class="glow" id="g-ice" data-layout-ignore></div>
  <div class="glow" id="g-hot" data-layout-ignore></div>
  <div class="glow" id="g-warm" data-layout-ignore></div>
{hosts}
  <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{TOTAL}" data-track-index="3" data-track-kind="captions" data-width="1080" data-height="1920"></div>
  <div id="scan" data-layout-ignore></div>
  <div id="vig" data-layout-ignore></div>
  <div id="glitch" data-layout-ignore><i style="top:420px;height:26px;background:rgba(255,59,48,.55)"></i><i style="top:760px;height:10px;background:rgba(0,229,255,.5)"></i><i style="top:1010px;height:40px;background:rgba(255,255,255,.18)"></i><i style="top:1240px;height:8px;background:rgba(255,42,109,.6)"></i></div>
  <audio id="vo" class="clip" src="assets/voiceover.mp3" data-start="0" data-duration="57.6" data-track-index="4" data-volume="1"></audio>
  <audio id="sfx" class="clip" src="assets/sfx.wav" data-start="0" data-duration="{TOTAL}" data-track-index="5" data-volume="0.5"></audio>
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
tl.set("#glitch",{{opacity:0,x:0}},0);
tl.fromTo("#g-ice",{{opacity:1}},{{opacity:0,duration:.3}},3.81);
tl.fromTo("#g-hot",{{opacity:0}},{{opacity:1,duration:.3}},3.81);
tl.to("#g-hot",{{opacity:0,duration:.6}},35.5);
tl.fromTo("#g-warm",{{opacity:0}},{{opacity:1,duration:.6}},35.5);
tl.to("#g-warm",{{opacity:0,duration:4}},51.0);
tl.to("#g-ice",{{opacity:1,duration:4}},51.0);
{json.dumps(CUTS + [3.81, 8.52])}.forEach(t => {{
  tl.to("#glitch",{{opacity:1,duration:.03}},t-0.05);
  tl.to("#glitch",{{x:18,duration:.03}},t-0.02);
  tl.set("#glitch",{{x:0}},t+0.12);
  tl.to("#glitch",{{opacity:0,duration:.05}},t+0.07);
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
print("groups:", len(groups)); print(" | ".join(" ".join(w["text"] for w in g) for g in groups))
