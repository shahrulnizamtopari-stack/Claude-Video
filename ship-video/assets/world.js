// "Kenapa kapal besar tak tenggelam?" — v2 look (post-processed Three.js), sea world at sunset.
// Everything on screen is a pure function of canonical time t (0..60 s).
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { GTAOPass } from "./lib/jsm/postprocessing/GTAOPass.js";
import { ShaderPass } from "./lib/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "./lib/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "./lib/jsm/environments/RoomEnvironment.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const pop = (t0, t, d = 0.4) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S0 = (x) => Math.max(0.0001, x);

export const PAL = {
  skyTop: 0x5d4fa8, skyMid: 0xb784c4, skyHorizon: 0xffb48c, skyLow: 0xf59a9a,
  sea: 0x2f7fae, seaDeep: 0x173f63, hill: [0x76b85e, 0x8fcc6c, 0x5fa452], sand: 0xf0d7b0,
  steel: 0xb8bcc8, hullTop: 0x23324f, hullBottom: 0xc23a32, boot: 0xf2efe8, white: 0xf7f3ee,
  air: 0x7ee8ff, up: 0xffc531, down: 0xff5a3d, ok: 0xa8f07a, water: 0x4fb6ff,
};
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o });
const flat = (c, o = {}) => mat(c, { flatShading: true, roughness: 0.85, ...o });

export function createWorld(canvas, W, H, scale = 1, opts = {}) {
  const FX = { ao: opts.ao ?? true, bloom: opts.bloom ?? true, finish: opts.finish ?? true, msaa: opts.msaa ?? (scale < 1 ? 0 : 2) };
  const realRandom = Math.random; Math.random = mulberry32(4321);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf2b0a4, 220, 900);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 4000);

  // sky
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(PAL.skyTop) }, mid: { value: new THREE.Color(PAL.skyMid) }, hor: { value: new THREE.Color(PAL.skyHorizon) }, low: { value: new THREE.Color(PAL.skyLow) }, sunDir: { value: V(-0.45, 0.07, -1).normalize() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform vec3 top,mid,hor,low,sunDir; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 c;
        if(h>0.0){ c = mix(hor, mid, smoothstep(0.0,0.28,h)); c = mix(c, top, smoothstep(0.25,0.85,h)); } else { c = mix(hor, low, smoothstep(0.0,-0.35,h)); }
        float s = max(dot(normalize(vDir), sunDir),0.0); c += vec3(1.0,0.85,0.6)*pow(s,90.0)*0.7 + vec3(1.0,0.7,0.45)*pow(s,6.0)*0.14;
        gl_FragColor = vec4(c,1.0); }`,
  })));

  scene.add(new THREE.HemisphereLight(0xffd8c2, 0x4f7f9e, 0.6));
  const sun = new THREE.DirectionalLight(0xffdcbc, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(scale < 1 ? 1024 : 2048, scale < 1 ? 1024 : 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5; sun.shadow.radius = 5;
  const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 500;
  scene.add(sun); scene.add(sun.target);
  const rim = new THREE.DirectionalLight(0xffa27a, 1.0); rim.position.set(-150, 50, -220); scene.add(rim);

  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.3, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, size, op = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false, fog: false })); s.scale.set(size, size, 1); return s; };
  const sunGlow = glow(0xffd9a8, 260, 0.55); sunGlow.position.set(-800, 120, -1800); scene.add(sunGlow);

  // ---------- sea ----------
  const waveU = { uTime: { value: 0 } };
  const seaMat = new THREE.MeshStandardMaterial({ color: PAL.sea, roughness: 0.18, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.8, envMapIntensity: 1.3 });
  seaMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = waveU.uTime;
    sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vec4 wp = modelMatrix * vec4(position, 1.0);
      transformed.z += 0.32*sin(wp.x*0.11 + uTime*1.3) + 0.24*sin(wp.z*0.14 - uTime*1.05) + 0.12*sin((wp.x+wp.z)*0.27 + uTime*2.1);`);
  };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900, 150, 150), seaMat); sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true; scene.add(sea);
  const deep = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), mat(PAL.seaDeep, { roughness: 1 })); deep.rotation.x = -Math.PI / 2; deep.position.y = -26; scene.add(deep);
  const waveY = (x, z, t) => 0.32 * Math.sin(x * 0.11 + t * 1.3) + 0.24 * Math.sin(z * 0.14 - t * 1.05) + 0.12 * Math.sin((x + z) * 0.27 + t * 2.1);

  // background hills + a small island with palms
  const rnd = mulberry32(9);
  for (let i = 0; i < 9; i++) {
    const h = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), flat(PAL.hill[i % 3]));
    const s = 30 + rnd() * 40; h.scale.set(s * 1.6, s * (0.5 + rnd() * 0.4), s);
    h.position.set(-380 + i * 95 + rnd() * 30, -s * 0.15, -330 - rnd() * 80); scene.add(h);
  }
  { const isl = new THREE.Group(); isl.position.set(55, 0, -18); scene.add(isl);
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 2, 18), flat(PAL.sand)); sand.position.y = -0.6; sand.receiveShadow = true; isl.add(sand);
    const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 1), flat(PAL.hill[0])); hill.scale.set(1.2, 0.6, 1); hill.position.y = 0.8; hill.castShadow = true; isl.add(hill);
    for (let k = 0; k < 3; k++) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 6, 6), flat(0x8a5a36)); tr.position.set(-3 + k * 3, 3.5, 2 - k); tr.rotation.z = 0.15 - k * 0.12; isl.add(tr);
      for (let f = 0; f < 5; f++) { const lf = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3.5, 4), flat(PAL.hill[1])); lf.position.set(-3 + k * 3, 6.6, 2 - k); lf.rotation.set(Math.cos(f * 1.26) * 1.2, 0, Math.sin(f * 1.26) * 1.2); isl.add(lf); } } }
  const clouds = [];
  { const cm = flat(0xffe9ef, { roughness: 1, emissive: 0xffc9c9, emissiveIntensity: 0.45 });
    for (let i = 0; i < 9; i++) { const c = new THREE.Group(); const n = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), cm); const s = 6 + rnd() * 8; b.scale.set(s * 1.4, s * 0.6, s); b.position.set(k * 8 - n * 4, rnd() * 2, rnd() * 4); c.add(b); }
      c.position.set(-300 + i * 75, 60 + rnd() * 60, -260 - rnd() * 100); scene.add(c); clouds.push(c); } }

  // ---------- hull builder ----------
  // ship-local: x along length (bow at +x), y up from keel, z across.  Returns geometry with vertex colours.
  function hullGeometry(L, B, D, waterline, colors) {
    const NS = 40, NP = 14; const pos = [], col = [], idx = [];
    const half = (x) => { const u = (x + L / 2) / L; // 0 stern .. 1 bow
      const bow = u > 0.78 ? Math.pow(1 - (u - 0.78) / 0.22, 0.75) : 1; const stern = u < 0.1 ? 0.78 + 0.22 * (u / 0.1) : 1; return (B / 2) * bow * stern; };
    const keel = (x) => { const u = (x + L / 2) / L; return u > 0.86 ? (u - 0.86) / 0.14 * D * 0.55 : u < 0.06 ? (0.06 - u) / 0.06 * D * 0.35 : 0; };
    const ring = [];
    for (let i = 0; i <= NS; i++) {
      const x = -L / 2 + (L * i) / NS; const w = Math.max(0.05, half(x)), k = keel(x);
      const pts = [];
      for (let j = 0; j <= NP; j++) { const a = (j / NP) * Math.PI; // 0 = port deck edge, PI = starboard deck edge
        const sx = -Math.cos(a), sy = Math.sin(a);
        const r = 0.35; // bilge roundness
        const z = Math.sign(sx) * Math.pow(Math.abs(sx), r) * w;
        const y = D - (D - k) * Math.pow(sy, 0.25);
        pts.push([x, y, z]); }
      ring.push(pts);
    }
    const c = new THREE.Color();
    const push = (p) => { pos.push(p[0], p[1], p[2]); const y = p[1];
      c.setHex(y < waterline ? colors.bottom : y < waterline + 0.35 ? colors.boot : colors.top); col.push(c.r, c.g, c.b); return pos.length / 3 - 1; };
    const vid = ring.map((pts) => pts.map(push));
    for (let i = 0; i < NS; i++) for (let j = 0; j < NP; j++) { const a = vid[i][j], b = vid[i + 1][j], d = vid[i][j + 1], e = vid[i + 1][j + 1]; idx.push(a, b, d, b, e, d); }
    // deck cap
    for (let i = 0; i < NS; i++) { const a = vid[i][0], b = vid[i + 1][0], d = vid[i][NP], e = vid[i + 1][NP]; idx.push(a, d, b, b, d, e); }
    // transom
    const tc = push([-L / 2, D * 0.6, 0]); for (let j = 0; j < NP; j++) idx.push(tc, vid[0][j + 1], vid[0][j]);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const ng = g.toNonIndexed(); ng.computeVertexNormals(); return { geo: ng, half, keel };
  }

  // ---------- main cargo ship ----------
  const SHIP = { L: 84, B: 13, D: 9, T0: 4.2, pos: V(0, 0, -62) };
  const ship = new THREE.Group(); ship.position.copy(SHIP.pos); scene.add(ship);
  const hullData = hullGeometry(SHIP.L, SHIP.B, SHIP.D, SHIP.T0 + 0.2, { bottom: PAL.hullBottom, boot: PAL.boot, top: PAL.hullTop });
  const hullMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.25, side: THREE.DoubleSide, transparent: false, opacity: 1 });
  const hull = new THREE.Mesh(hullData.geo, hullMat); hull.castShadow = true; hull.receiveShadow = true; ship.add(hull);
  // displaced-water ghost: the hull below the waterline, glowing (clipped at the sea surface)
  const clipPlane = new THREE.Plane(V(0, -1, 0), 0);
  const dispMat = new THREE.MeshStandardMaterial({ color: PAL.water, emissive: PAL.water, emissiveIntensity: 0.9, transparent: true, opacity: 0, depthWrite: false, clippingPlanes: [clipPlane], side: THREE.DoubleSide });
  const disp = new THREE.Mesh(hullData.geo, dispMat); disp.scale.set(1.01, 1.0, 1.04); ship.add(disp);
  // superstructure, funnel
  const sup = new THREE.Group(); sup.position.set(-SHIP.L / 2 + 9, SHIP.D, 0); ship.add(sup);
  { const block = new THREE.Mesh(new RoundedBoxGeometry(8, 9, 11.5, 2, 0.3), mat(PAL.white, { roughness: 0.5 })); block.position.y = 4.5; block.castShadow = true; sup.add(block);
    for (let k = 0; k < 4; k++) { const win = new THREE.Mesh(new THREE.BoxGeometry(8.05, 0.6, 11.55), mat(0x2b3550, { roughness: 0.2, metalness: 0.3 })); win.position.y = 2 + k * 2; sup.add(win); }
    const bridge = new THREE.Mesh(new RoundedBoxGeometry(5, 1.6, 15, 2, 0.2), mat(PAL.white)); bridge.position.set(1.5, 9.5, 0); bridge.castShadow = true; sup.add(bridge);
    const bw = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.6, 15.05), mat(0x2b3550, { roughness: 0.2 })); bw.position.set(1.5, 9.7, 0); sup.add(bw);
    const fun = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 5, 20), mat(0xff8a5c, { roughness: 0.45 })); fun.position.set(-2.5, 11.5, 0); fun.castShadow = true; sup.add(fun);
    const funT = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 1, 20), mat(0x1c1820)); funT.position.set(-2.5, 14, 0); sup.add(funT);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 8), mat(0xf2efe8)); mast.position.set(SHIP.L - 14, 3, 0); sup.add(mast); }
  // containers (instanced): bays along the deck, 5 across, tiers stacked; visible count depends on load
  const CONT = []; { const cols = [0xd8453c, 0x2f6fd0, 0xf2b630, 0xff8a5c, 0x4aa86a, 0xeeeeee, 0x8a5bd0]; const r2 = mulberry32(3);
    for (let tier = 0; tier < 5; tier++) for (let bay = 0; bay < 9; bay++) for (let row = 0; row < 5; row++) {
      const x = -SHIP.L / 2 + 19 + bay * 6.3; if (x > SHIP.L / 2 - 12) continue;
      CONT.push({ x, y: SHIP.D + 0.05 + tier * 2.45 + 1.2, z: -4.8 + row * 2.4, tier, bay, color: cols[Math.floor(r2() * cols.length)], delay: r2() }); } }
  const contMesh = new THREE.InstancedMesh(new RoundedBoxGeometry(6.0, 2.4, 2.3, 1, 0.08), mat(0xffffff, { roughness: 0.55, metalness: 0.2 }), CONT.length);
  contMesh.castShadow = true; contMesh.receiveShadow = true; contMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CONT.length * 3), 3);
  CONT.forEach((c, i) => contMesh.setColorAt(i, new THREE.Color(c.color))); ship.add(contMesh);
  // cutaway internals: bulkheads + "air" in each hold
  const inner = new THREE.Group(); ship.add(inner);
  const bulkM = new THREE.MeshStandardMaterial({ color: 0xd9d3dd, metalness: 0.4, roughness: 0.4, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const airM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff6ff, emissiveIntensity: 0.6, transparent: true, opacity: 0, depthWrite: false });
  const holds = [];
  for (let k = 0; k < 7; k++) {
    const x0 = -SHIP.L / 2 + 15 + k * 8.4, x1 = x0 + 8.2;
    const w = Math.min(hullData.half(x0), hullData.half(x1)) * 0.9;
    const bh = new THREE.Mesh(new THREE.BoxGeometry(0.25, SHIP.D - 1.2, w * 2), bulkM); bh.position.set(x0, (SHIP.D) / 2 + 0.3, 0); inner.add(bh);
    const air = new THREE.Mesh(new RoundedBoxGeometry(7.6, SHIP.D - 1.8, w * 2 - 0.6, 2, 0.4), airM); air.position.set((x0 + x1) / 2, SHIP.D / 2 + 0.4, 0); inner.add(air); holds.push(air);
  }
  // load-line (Plimsoll) marks on the starboard side, midships
  const llCv = document.createElement("canvas"); llCv.width = 512; llCv.height = 512;
  { const g = llCv.getContext("2d"); g.clearRect(0, 0, 512, 512); g.strokeStyle = "#ffd25a"; g.fillStyle = "#ffd25a"; g.lineWidth = 16;
    g.beginPath(); g.arc(150, 300, 95, 0, Math.PI * 2); g.stroke(); g.fillRect(30, 292, 240, 16);
    g.fillRect(330, 70, 16, 330);
    const marks = [["TF", 120], ["F", 170], ["T", 230], ["S", 300], ["W", 360]];
    g.font = "800 46px Montserrat, sans-serif"; g.textBaseline = "middle";
    for (const [l, y] of marks) { g.fillRect(346, y - 8, 90, 16); g.fillText(l, 444, y); } }
  const llTex = new THREE.CanvasTexture(llCv); llTex.colorSpace = THREE.SRGBColorSpace;
  const llMat = new THREE.MeshStandardMaterial({ map: llTex, transparent: true, emissive: 0xffc531, emissiveMap: llTex, emissiveIntensity: 0.2, roughness: 0.5 });
  const loadLine = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), llMat);
  // S mark (y=300 of 512) sits at draft 5.6
  loadLine.position.set(2, 5.6 + (300 - 256) / 512 * 4.2, SHIP.B / 2 + 0.04); ship.add(loadLine);

  // ---------- second ship: an old passenger liner (generic), for the leak ----------
  const LIN = { L: 46, B: 7, D: 6.5, T0: 3.2, pos: V(-58, 0, -16) };
  const liner = new THREE.Group(); liner.position.copy(LIN.pos); liner.rotation.y = 0.5; scene.add(liner);
  const linData = hullGeometry(LIN.L, LIN.B, LIN.D, LIN.T0 + 0.15, { bottom: 0x8e2d2a, boot: 0xf2efe8, top: 0x1d1a22 });
  const linMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide, transparent: true, opacity: 1 });
  const linHull = new THREE.Mesh(linData.geo, linMat); linHull.castShadow = true; liner.add(linHull);
  { for (let k = 0; k < 2; k++) { const d = new THREE.Mesh(new RoundedBoxGeometry(LIN.L * 0.62 - k * 8, 1.8, LIN.B * 0.86, 2, 0.15), mat(PAL.white, { roughness: 0.5 })); d.position.set(-2 + k * 1, LIN.D + 0.9 + k * 1.8, 0); d.castShadow = true; liner.add(d);
      const w = new THREE.Mesh(new THREE.BoxGeometry(LIN.L * 0.62 - k * 8 + 0.05, 0.35, LIN.B * 0.86 + 0.05), mat(0x2b3550)); w.position.copy(d.position).add(V(0, 0.2, 0)); liner.add(w); }
    for (let k = 0; k < 2; k++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 4.5, 16), mat(0xe9c27a, { roughness: 0.5 })); f.position.set(-4 + k * 8, LIN.D + 6, 0); f.rotation.z = 0.12; f.castShadow = true; liner.add(f);
      const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.8, 16), mat(0x1c1820)); ft.position.set(-4 + k * 8 + 0.27, LIN.D + 8.0, 0); ft.rotation.z = 0.12; liner.add(ft); } }
  const linFloods = [];
  const floodM = new THREE.MeshStandardMaterial({ color: PAL.water, emissive: 0x2a8ad8, emissiveIntensity: 0.5, transparent: true, opacity: 0.75, depthWrite: false });
  for (let k = 0; k < 5; k++) { const x0 = -LIN.L / 2 + 6 + k * 7.2; const w = Math.min(linData.half(x0), linData.half(x0 + 7)) * 0.86;
    const f = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1, w * 2), floodM); f.position.set(x0 + 3.5, 0.5, 0); liner.add(f); linFloods.push(f);
    const bh = new THREE.Mesh(new THREE.BoxGeometry(0.2, LIN.D - 0.8, w * 2), new THREE.MeshStandardMaterial({ color: 0xd9d3dd, transparent: true, opacity: 0.6, depthWrite: false })); bh.position.set(x0, LIN.D / 2, 0); liner.add(bh); }
  const holeGlow = glow(0xff5a3d, 4, 0); holeGlow.position.set(LIN.L / 2 - 10, 1.4, LIN.B / 2); liner.add(holeGlow);

  // ---------- demo props: iron ball, cube -> bowl, weights ----------
  const steelM = mat(PAL.steel, { metalness: 0.85, roughness: 0.28, envMapIntensity: 1.2 });
  const DEMO = V(0, 0, 4);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 40, 24), steelM); ball.castShadow = true; scene.add(ball);
  const cube = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.5, 1.5, 3, 0.1), steelM); cube.castShadow = true; scene.add(cube);
  const bowlPts = []; const R = 2.3, th = 0.12;
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; bowlPts.push(new THREE.Vector2(Math.sin(a) * R, -Math.cos(a) * R)); }
  for (let i = 24; i >= 0; i--) { const a = (i / 24) * Math.PI / 2; bowlPts.push(new THREE.Vector2(Math.sin(a) * (R - th), -Math.cos(a) * (R - th) + th * 0.2)); }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 48), new THREE.MeshStandardMaterial({ color: PAL.steel, metalness: 0.85, roughness: 0.28, side: THREE.DoubleSide, envMapIntensity: 1.2 }));
  bowl.castShadow = true; scene.add(bowl);
  const weights = [0, 1, 2].map(() => { const w = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.55, 0.75, 2, 0.08), mat(0x6c6f80, { metalness: 0.7, roughness: 0.35 })); w.castShadow = true; scene.add(w); return w; });
  // displaced-water glow under the bowl (a lens of water)
  const lensM = new THREE.MeshStandardMaterial({ color: PAL.water, emissive: PAL.water, emissiveIntensity: 1.0, transparent: true, opacity: 0, depthWrite: false });
  const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lensM); scene.add(lens);
  // ripple rings
  const rings = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); r.rotation.x = Math.PI / 2; scene.add(r); return r; });

  // ---------- arrows ----------
  const mkArrow = (color) => { const a = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.4, transparent: true });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.7, 12), m); shaft.position.y = 0.35; a.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.42, 16), m); head.position.y = 0.9; a.add(head); a.userData.m = m; scene.add(a); return a; };
  const sideArrows = [0, 1].map(() => mkArrow(PAL.air));
  const upArrows = [0, 1, 2].map(() => mkArrow(PAL.up));
  const shipDown = mkArrow(PAL.down), shipUp = mkArrow(0x4fb6ff);

  // ---------- particles ----------
  const NP = 360;
  const parts = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NP);
  parts.frustumCulled = false; parts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NP * 3), 3); scene.add(parts);
  const dummy = new THREE.Object3D(); const col = new THREE.Color();
  const hide = (im, i) => { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); };

  // ---------- post ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, RW, RH);
  gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: scale < 1 ? 6 : 10, distanceFallOff: 1, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 }); gtao.blendIntensity = 0.8;
  if (FX.ao) composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.24, 0.5, 1.0); if (FX.bloom) composer.addPass(bloom);
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(RW, RH) }, focusY: { value: 0.6 }, band: { value: 0.2 }, blurAmt: { value: 1.0 }, vig: { value: 0.3 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; uniform float focusY, band, blurAmt, vig; varying vec2 vUv;
      void main(){ float d = max(0.0, abs(vUv.y - focusY) - band); float r = clamp(d * 3.2, 0.0, 1.0) * blurAmt * 7.0;
        vec4 acc = vec4(0.0); float wsum = 0.0;
        for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) { vec2 o = vec2(float(i), float(j)) / 2.0; float w = exp(-dot(o,o)*1.5); acc += texture2D(tDiffuse, vUv + o * r / res) * w; wsum += w; }
        vec3 c = (acc / wsum).rgb; float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, 1.12); c = (c - 0.5) * 1.06 + 0.5; c *= vec3(1.03, 1.0, 0.97);
        vec2 q = vUv - 0.5; q.x *= res.x / res.y; float v = smoothstep(0.95, 0.25, length(q)); c *= mix(1.0 - vig, 1.0, v);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  if (FX.finish) composer.addPass(finish);
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- story (canonical time) ----------
  // main ship load: base 2 tiers; 40.4-46 loading to 5 tiers (overload); reset off-camera 47-53
  const load = (t) => (t < 40.4 ? 0 : t < 47 ? ss(40.4, 46.0, t) : 1 - ss(47.5, 53, t));
  const shipDraft = (t) => SHIP.T0 + 2.3 * load(t);                       // keel depth below the surface
  const tiersShown = (t) => 2 + 3 * load(t);

  // camera
  const DEMOV = (x, y, z) => DEMO.clone().add(V(x, y, z));
  const SH = (x, y, z) => SHIP.pos.clone().add(V(x, y, z));
  const LN = (x, y, z) => LIN.pos.clone().add(V(x, y, z));
  const keys = [
    { t: 0, pos: () => DEMOV(0.7, 2.5, 8.6), look: () => DEMOV(0, 2.3, 0), fov: 38 },
    { t: 2.0, pos: () => DEMOV(0.6, 2.3, 8.4), look: () => DEMOV(0, 1.6, 0), fov: 38 },
    { t: 3.9, pos: () => DEMOV(0.5, 1.2, 8.0), look: () => DEMOV(0, -1.0, 0), fov: 38 },
    { t: 6.6, pos: () => V(-26, 9, 2), look: () => SH(0, 7, 0), fov: 40 },
    { t: 9.8, pos: () => V(-46, 14, -10), look: () => SH(4, 7, 0), fov: 40 },
    { t: 12.2, pos: () => DEMOV(0.8, 3.2, 9.0), look: () => DEMOV(0, 2.2, 0), fov: 38 },
    { t: 16.0, pos: () => DEMOV(0.8, 4.2, 10.5), look: () => DEMOV(0, 1.8, 0), fov: 38 },
    { t: 19.5, pos: () => DEMOV(1.5, 5.0, 10.5), look: () => DEMOV(0, 0.0, 0), fov: 40 },
    { t: 23.0, pos: () => DEMOV(1.2, 1.4, 10.5), look: () => DEMOV(0, -0.6, 0), fov: 40 },
    { t: 26.8, pos: () => DEMOV(1.4, 1.6, 11.0), look: () => DEMOV(0, -0.7, 0), fov: 40 },
    { t: 29.0, pos: () => SH(14, 3, 46), look: () => SH(0, -1.5, 0), fov: 40 },
    { t: 33.4, pos: () => SH(-6, 4, 44), look: () => SH(0, -1.0, 0), fov: 40 },
    { t: 36.4, pos: () => SH(-14, 16, 38), look: () => SH(0, 1.5, 0), fov: 40 },
    { t: 39.4, pos: () => SH(4, 3.0, 22), look: () => SH(2, 1.0, 6.5), fov: 38 },
    { t: 45.6, pos: () => SH(10, 9, 40), look: () => SH(0, 2.0, 0), fov: 40 },
    { t: 48.4, pos: () => LN(10, 7, 34), look: () => LN(0, 0.5, 0), fov: 40 },
    { t: 53.0, pos: () => LN(14, 9, 36), look: () => LN(0, -1.0, 0), fov: 40 },
    { t: 56.2, pos: () => V(-30, 12, 22), look: () => SH(0, 5, 0), fov: 40 },
    { t: 60, pos: () => DEMOV(0.7, 2.5, 8.6), look: () => DEMOV(0, 2.3, 0), fov: 38 },
  ];
  const hc = (p0, p1, p2, p3, u) => { const seg = p2.distanceTo(p1);
    const m1 = p2.clone().sub(p0).multiplyScalar(0.5); if (m1.length() > seg) m1.setLength(seg);
    const m2 = p3.clone().sub(p1).multiplyScalar(0.5); if (m2.length() > seg) m2.setLength(seg);
    const u2 = u * u, u3 = u2 * u; return p1.clone().multiplyScalar(2 * u3 - 3 * u2 + 1).add(m1.multiplyScalar(u3 - 2 * u2 + u)).add(p2.clone().multiplyScalar(-2 * u3 + 3 * u2)).add(m2.multiplyScalar(u3 - u2)); };
  const camAt = (t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    let u = clamp((t - k1.t) / (k2.t - k1.t)); u = u * u * (3 - 2 * u) * 0.65 + u * 0.35;
    return { P: hc(k0.pos(t), k1.pos(t), k2.pos(t), k3.pos(t), u), L: hc(k0.look(t), k1.look(t), k2.look(t), k3.look(t), u), fov: lerp(k1.fov, k2.fov, u) }; };

  const BURSTS = [
    { t: 2.32, at: () => DEMOV(0, 0.1, 0), c: [0xffffff, 0xcdeeff], n: 40, spd: 1.6, splash: true },
    { t: 13.0, at: () => DEMOV(0, 2.2, 0), c: [0xffd36e, 0xffffff], n: 22, spd: 1.5 },
    { t: 15.1, at: () => DEMOV(0, 2.2, 0), c: [0xffd36e, 0xffffff, 0x7ee8ff], n: 34, spd: 2.2 },
    { t: 17.75, at: () => DEMOV(0, 0.1, 0), c: [0xffffff, 0xcdeeff], n: 40, spd: 2.4, splash: true },
    { t: 47.9, at: () => liner.localToWorld(V(LIN.L / 2 - 10, 1.4, LIN.B / 2)), c: [0xffffff, 0x8fd2ff], n: 40, spd: 1.8, splash: true },
  ];

  function render(t) {
    t = clamp(t, 0, 60);
    waveU.uTime.value = t;
    const bob = (x, z, k = 1) => waveY(x, z, t) * k;

    // --- iron ball: hovers, dropped at 2.0, splashes 2.32, sinks; returns for the loop at 58.6
    { let y; const back = t >= 58.6;
      if (back) y = 2.3 + 0.05 * Math.sin(t * 2);
      else if (t < 2.0) y = 2.3 + 0.05 * Math.sin(t * 2);
      else if (t < 2.32) y = 2.3 - 2.3 * ((t - 2.0) / 0.32) ** 2;
      else y = -9 * (1 - Math.exp(-(t - 2.32) * 0.9)) - 0.0;
      ball.position.copy(DEMOV(0, y, 0)); ball.visible = t < 6 || back; ball.scale.setScalar(back ? S0(pop(58.6, t, 0.45)) : 1); }
    // --- cube appears 13.0, becomes the bowl 15.1; bowl lowered 16.9-17.8; weights 23.8/24.5/25.2 push it deeper
    const nW = (t >= 23.8 ? 1 : 0) + (t >= 24.5 ? 1 : 0) + (t >= 25.2 ? 1 : 0);
    const sink = 0.32 + 0.22 * ss(23.8, 24.2, t) + 0.22 * ss(24.5, 24.9, t) + 0.22 * ss(25.2, 25.6, t); // how deep the bowl floats
    { const show = t > 12.8 && t < 28.6;
      cube.visible = show && t < 15.4; cube.position.copy(DEMOV(0, 2.2, 0)); cube.rotation.set(0.3, t * 0.8, 0.15); cube.scale.setScalar(S0(pop(13.0, t, 0.45) * (1 - ss(14.9, 15.25, t))));
      bowl.visible = show && t >= 15.0;
      const bs = S0(pop(15.05, t, 0.5)) * (1 - ss(27.8, 28.5, t));
      let by = 2.2 + R * 0.55; // rim above the centre
      by = lerp(by, R - sink + bob(DEMO.x, DEMO.z, 0.6), ss(16.9, 17.8, t));
      bowl.position.copy(DEMOV(0, by, 0)); bowl.scale.setScalar(S0(bs)); bowl.rotation.set(0.04 * Math.sin(t * 1.3), 0, 0.04 * Math.sin(t * 1.1));
      weights.forEach((w, i) => { const t0 = 23.8 + i * 0.7; const on = t >= t0 - 0.5 && show;
        w.visible = on; const fall = clamp((t - (t0 - 0.5)) / 0.5); const wy = lerp(by + 3.5, by - R + 0.45 + 0.28, fall * fall);
        w.position.copy(DEMOV(-0.7 + i * 0.7, wy, -0.2 + (i % 2) * 0.4)); w.rotation.y = i; w.scale.setScalar(bs); });
      // displaced water lens + arrows
      const inWater = ss(17.6, 18.2, t) * (1 - ss(27.8, 28.5, t));
      lens.position.copy(DEMOV(0, 0.02, 0)); const lr = Math.sqrt(Math.max(0.01, R * R - (R - sink) * (R - sink)));
      lens.scale.set(lr * 1.02, sink + 0.02, lr * 1.02); lensM.opacity = 0.32 * inWater * ss(18.4, 19.0, t);
      sideArrows.forEach((a, i) => { const on = pop(18.6 + i * 0.15, t, 0.4) * (1 - ss(22.0, 22.6, t)); a.visible = on > 0.01;
        const s = i ? 1 : -1; const drift = 0.6 * ((t * 0.8) % 1);
        a.position.copy(DEMOV(s * (lr + 0.6 + drift), 0.25, 0)); a.rotation.set(0, 0, -s * Math.PI / 2); a.scale.setScalar(S0(on) * 1.4); });
      upArrows.forEach((a, i) => { const grow = 1 + 0.35 * nW; const on = pop(22.4 + i * 0.12, t, 0.45) * (1 - ss(27.6, 28.3, t)); a.visible = on > 0.01;
        a.position.copy(DEMOV((i - 1) * 1.1, -sink - 1.9 * grow, 0)); a.rotation.set(0, 0, 0); a.scale.set(S0(on) * 1.2, S0(on) * 1.8 * grow, S0(on) * 1.2);
        a.userData.m.emissiveIntensity = 0.9 + 0.8 * (t > 24.9 && t < 26 ? 1 : 0); });
      // ripple rings when the bowl touches the water (and when the ball splashes)
      rings.forEach((r, i) => { const t0s = [2.32, 17.75, 17.95]; const t0 = t0s[i]; const dt = t - t0; r.visible = dt > 0 && dt < 2.2;
        r.position.copy(DEMOV(0, 0.15 + bob(DEMO.x, DEMO.z), 0)); const rr = (i === 0 ? 0.6 : lr) + dt * (i === 0 ? 2.0 : 2.6); r.scale.set(rr, rr, 1); r.material.opacity = 0.7 * (1 - dt / 2.2); }); }

    // --- main ship: floats at its draft, bobs; cutaway 34.2-38.6; displaced ghost 29.8-34
    const draft = shipDraft(t);
    ship.position.set(SHIP.pos.x, -draft + bob(SHIP.pos.x, SHIP.pos.z, 0.5), SHIP.pos.z);
    ship.rotation.set(0.012 * Math.sin(t * 0.9), 0, 0.01 * Math.sin(t * 0.7));
    const cut = ss(34.0, 34.8, t) * (1 - ss(38.4, 39.2, t));
    hullMat.transparent = cut > 0.01; hullMat.opacity = 1 - 0.68 * cut; hullMat.depthWrite = cut < 0.01;
    bulkM.opacity = 0.6 * cut; airM.opacity = 0.35 * cut * ss(35.0, 36.2, t) * (1 + 0.5 * (t > 37.8 && t < 38.6 ? 1 : 0));
    holds.forEach((h, i) => h.scale.setScalar(S0(pop(35.0 + i * 0.12, t, 0.4)))); inner.visible = cut > 0.01;
    clipPlane.constant = 0; // world y = 0 (sea surface): keep what is below
    dispMat.opacity = 0.42 * ss(30.2, 30.9, t) * (1 - ss(33.6, 34.3, t)) * (1 + 0.6 * (t > 32.9 && t < 33.5 ? 1 : 0));
    // containers: tiers 0..4, the extra tiers drop in one bay at a time while loading
    const tiers = tiersShown(t);
    CONT.forEach((c, i) => {
      let s = 0, dy = 0;
      if (c.tier < 2) s = 1;
      else { const want = clamp(tiers - c.tier, 0, 1); const order = (c.bay + c.delay) / 10; const local = clamp(want * 1.6 - order * 0.6); s = local > 0 ? 1 : 0; dy = (1 - ss(0, 0.35, local)) * 6; }
      dummy.position.set(c.x, c.y + dy, c.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(S0(s)); dummy.updateMatrix(); contMesh.setMatrixAt(i, dummy.matrix); });
    contMesh.instanceMatrix.needsUpdate = true;
    // load line glows 39.2; red when overloaded (water past the mark) 45.6-47
    const over = ss(45.4, 45.9, t) * (1 - ss(47.2, 47.8, t));
    llMat.emissive.setHex(over > 0.3 ? PAL.down : PAL.up); llMat.emissiveIntensity = 0.2 + 1.3 * ss(39.0, 39.5, t) * (1 - ss(47.5, 48.5, t)) + 1.5 * over * (0.6 + 0.4 * Math.sin(t * 18));
    // Archimedes arrows: weight (down) and displaced water (up), equal; pulse together on "Archimedes"
    { const onD = pop(27.7, t, 0.45) * (1 - ss(33.8, 34.4, t)), onU = pop(29.5, t, 0.45) * (1 - ss(33.8, 34.4, t));
      const pulse = 1 + 0.25 * (t > 32.9 && t < 33.6 ? Math.sin((t - 32.9) * 12) ** 2 : 0);
      shipDown.visible = onD > 0.01; shipDown.position.copy(SH(4, 12, SHIP.B / 2 + 2)); shipDown.rotation.set(Math.PI, 0, 0); shipDown.scale.setScalar(S0(onD) * 5 * pulse);
      shipUp.visible = onU > 0.01; shipUp.position.copy(SH(4, -9.5, SHIP.B / 2 + 2)); shipUp.scale.setScalar(S0(onU) * 5 * pulse); }

    // --- liner: leak at 47.9, holds flood bow-first 48.3-52, sinks + tilts 49.5-53.2; cutaway while flooding
    { const flood = (k) => ss(48.3 + (4 - k) * 0.55, 49.6 + (4 - k) * 0.55, t);
      const sinkL = ss(49.0, 53.4, t); const fresh = t < 46.5;
      liner.position.set(LIN.pos.x, -LIN.T0 - sinkL * (LIN.T0 + 2.6) + bob(LIN.pos.x, LIN.pos.z, 0.5), LIN.pos.z);
      liner.rotation.set(0, 0.5, -0.11 * sinkL + 0.01 * Math.sin(t * 0.8));
      linMat.opacity = 1 - 0.6 * ss(47.4, 48.0, t); linMat.depthWrite = linMat.opacity > 0.99;
      linFloods.forEach((f, k) => { const h = (LIN.D - 1.2) * flood(k); f.visible = h > 0.02 && !fresh; f.scale.y = S0(h); f.position.y = 0.6 + h / 2; });
      holeGlow.material.opacity = (t > 47.8 && t < 52.5 ? 0.9 : 0) * (0.7 + 0.3 * Math.sin(t * 20)); }

    // particles: splashes + bubbles + flooding spray
    let q = 0;
    for (const B of BURSTS) { const dtb = t - B.t; if (dtb < 0 || dtb > 1.3) continue; const r2 = mulberry32(Math.round(B.t * 100)); const c0 = B.at();
      for (let i = 0; i < B.n && q < NP; i++) { const d = V(r2() - 0.5, B.splash ? 0.6 + r2() : r2() - 0.4, r2() - 0.5).normalize();
        const p = c0.clone().add(d.multiplyScalar(B.spd * (1 - Math.exp(-dtb * 3)))); p.y -= (B.splash ? 4.5 : 1.5) * dtb * dtb;
        dummy.position.copy(p); dummy.rotation.set(r2() * 6, r2() * 6, 0); dummy.scale.setScalar(S0((B.splash ? 0.09 : 0.06) * (1 - dtb / 1.3) * (0.6 + r2()))); dummy.updateMatrix(); parts.setMatrixAt(q, dummy.matrix);
        col.setHex(B.c[i % B.c.length]).multiplyScalar(B.splash ? 1.2 : 2.2); parts.setColorAt(q, col); q++; } }
    if (t > 2.3 && t < 6) { const r2 = mulberry32(21); // bubbles rising from the sinking ball
      for (let i = 0; i < 26 && q < NP; i++) { const age = ((t * 0.9 + r2()) % 1); const p = ball.position.clone().add(V((r2() - 0.5) * 0.6, age * 2.5, (r2() - 0.5) * 0.6)); if (p.y > 0) continue;
        dummy.position.copy(p); dummy.scale.setScalar(0.05 + 0.05 * r2()); dummy.updateMatrix(); parts.setMatrixAt(q, dummy.matrix); col.setHex(0xdff6ff); parts.setColorAt(q, col); q++; } }
    if (t > 47.9 && t < 52.5) { const r2 = mulberry32(33); const hp = liner.localToWorld(V(LIN.L / 2 - 10, 1.4, LIN.B / 2));
      for (let i = 0; i < 50 && q < NP; i++) { const age = ((t * 2.5 + r2()) % 1); const p = hp.clone().add(V(-age * 2.5 * r2(), (r2() - 0.5) * 0.6, -age * 2.0));
        dummy.position.copy(p); dummy.scale.setScalar(0.07 * (1 - age)); dummy.updateMatrix(); parts.setMatrixAt(q, dummy.matrix); col.setHex(0x9fdcff).multiplyScalar(1.5); parts.setColorAt(q, col); q++; } }
    for (; q < NP; q++) hide(parts, q);
    parts.instanceMatrix.needsUpdate = true; parts.instanceColor.needsUpdate = true;

    // camera + post
    const cam = camAt(t);
    camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, H * 0.1, W, H); camera.updateProjectionMatrix();
    const lp = cam.L.clone().project(camera); finish.uniforms.focusY.value = clamp(0.5 + lp.y * 0.5, 0.2, 0.85);
    finish.uniforms.blurAmt.value = 0.6; finish.uniforms.band.value = 0.2;
    const focus = cam.L.clone(); sun.position.set(focus.x + 70, focus.y + 90, focus.z + 80); sun.target.position.copy(focus);
    composer.render();
    return {};
  }
  function debug(t) { render(t); const v = ship.position.clone().project(camera); return { t, cam: camera.position.toArray().map((x) => +x.toFixed(1)), ship: [+v.x.toFixed(2), +v.y.toFixed(2)] }; }
  return { render, debug, scene, speed: () => 0 };
}
