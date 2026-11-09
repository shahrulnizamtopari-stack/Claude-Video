// "Tembakan di Krakow" — style 1: dark tactical 3D map built from real OpenStreetMap data (assets/map.json).
// Non-graphic by design: the attack is a glowing red route with pins; no weapon, no victims.
// Everything on screen is a pure function of canonical time t (0..60 s). Units are metres.
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { GTAOPass } from "./lib/jsm/postprocessing/GTAOPass.js";
import { ShaderPass } from "./lib/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { mergeGeometries } from "./lib/jsm/utils/BufferGeometryUtils.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const pop = (t0, t, d = 0.45) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S0 = (x) => Math.max(0.0001, x);

export const PAL = { bg: 0x060911, ground: 0x0a0f1a, grid: 0x1a2a44, road: 0x40568a, roadHi: 0x4a6290, park: 0x0e2620, wall: 0x262b3a, roof: 0x4d5670,
  land: 0xc8b89a, red: 0xff2d3d, blue: 0x2f8bff, amber: 0xffb347, cyan: 0x6fe3ff };

export function createWorld(canvas, W, H, scale = 1, opts = {}, MAP) {
  const FX = { ao: opts.ao ?? true, bloom: opts.bloom ?? true, finish: opts.finish ?? true, msaa: opts.msaa ?? (scale < 1 ? 0 : 2), half: opts.half ?? true };
  const realRandom = Math.random; Math.random = mulberry32(1234);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(PAL.bg);
  scene.fog = new THREE.Fog(PAL.bg, 1800, 5200);
  const camera = new THREE.PerspectiveCamera(40, W / H, 2, 20000);

  // ---------- light ----------
  scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x1a2036, 1.3));
  const moon = new THREE.DirectionalLight(0xbfd0ff, 1.5); moon.position.set(-600, 1000, 400); scene.add(moon);
  const warm = new THREE.DirectionalLight(0xff9a6a, 0.35); warm.position.set(700, 300, -600); scene.add(warm);

  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.25, "rgba(255,255,255,0.5)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, size, op = 0) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false, depthTest: false, fog: false })); s.scale.set(size, size, 1); s.renderOrder = 10; scene.add(s); return s; };
  const label = (text, color = "#ffffff", bg = "rgba(8,12,22,0.86)", wM = 150) => {
    const cv = document.createElement("canvas"); const g = cv.getContext("2d"); g.font = "800 64px Montserrat, sans-serif"; const tw = g.measureText(text).width;
    cv.width = Math.ceil(tw + 80); cv.height = 112; const g2 = cv.getContext("2d");
    g2.fillStyle = bg; g2.beginPath(); g2.roundRect(4, 4, cv.width - 8, 104, 22); g2.fill(); g2.strokeStyle = color; g2.lineWidth = 6; g2.stroke();
    g2.font = "800 64px Montserrat, sans-serif"; g2.fillStyle = color; g2.textBaseline = "middle"; g2.textAlign = "center"; g2.fillText(text, cv.width / 2, 60);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false, fog: false })); s.renderOrder = 20;
    s.userData.aspect = cv.width / cv.height; s.userData.w = wM; s.scale.set(wM, wM / s.userData.aspect, 1); scene.add(s); return s; };

  // ---------- ground + grid ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), new THREE.MeshStandardMaterial({ color: PAL.ground, roughness: 1 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  { const g = new THREE.GridHelper(12000, 240, PAL.grid, PAL.grid); g.material.transparent = true; g.material.opacity = 0.35; g.position.y = 0.05; scene.add(g); }

  // ---------- parks ----------
  { const gs = []; for (const pts of MAP.parks) { if (pts.length < 4) continue; const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, 0.15, 0); gs.push(g); }
    if (gs.length) scene.add(new THREE.Mesh(mergeGeometries(gs, false), new THREE.MeshStandardMaterial({ color: PAL.park, roughness: 1 }))); }
  // ---------- roads (flat ribbons) ----------
  const ribbon = (pts, w, y) => { const pos = [], idx = []; for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      pos.push(pts[i][0] - dz * w, y, pts[i][1] + dx * w, pts[i][0] + dz * w, y, pts[i][1] - dx * w); if (i) { const k = 2 * (i - 1); idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  { const gs = MAP.roads.filter((r) => r.p.length > 1).map((r) => ribbon(r.p, r.w * 1.3, 0.3)); scene.add(new THREE.Mesh(mergeGeometries(gs, false), new THREE.MeshBasicMaterial({ color: PAL.road, fog: true }))); }
  // square paving (diamond)
  { const q = MAP.square; const sh = new THREE.Shape([q.N, q.E, q.S, q.W].map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, 0.35, 0);
    scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x1d2944 }))); }

  // ---------- buildings (extruded footprints, merged) ----------
  const bMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
  const lmMat = new THREE.MeshStandardMaterial({ color: PAL.land, roughness: 0.7, emissive: 0x3a2c18, emissiveIntensity: 0.5 });
  { const gs = [], lms = []; const cw = new THREE.Color(PAL.wall), cr = new THREE.Color(PAL.roof);
    for (const b of MAP.buildings) {
      const sh = new THREE.Shape(b.p.map(([x, z]) => new THREE.Vector2(x, -z)));
      let g; try { g = new THREE.ExtrudeGeometry(sh, { depth: b.h, bevelEnabled: false }); } catch (e) { continue; }
      g.rotateX(-Math.PI / 2); g = g.toNonIndexed(); g.deleteAttribute("uv");
      if (b.lm) { lms.push(g); continue; }
      const n = g.attributes.normal, col = new Float32Array(n.count * 3), p = g.attributes.position;
      for (let i = 0; i < n.count; i++) { const up = n.getY(i) > 0.5; const c = up ? cr : cw.clone().lerp(cr, clamp(p.getY(i) / 40) * 0.5); col.set([c.r, c.g, c.b], i * 3); }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3)); gs.push(g); }
    scene.add(new THREE.Mesh(mergeGeometries(gs, false), bMat));
    if (lms.length) scene.add(new THREE.Mesh(mergeGeometries(lms, false), lmMat)); }
  // St Mary's (not a closed way in the extract): nave + two towers, at its real position
  { const [mx, mz] = MAP.landmarks.mary; const g = new THREE.Group(); g.position.set(mx, 0, mz); g.rotation.y = -0.5; scene.add(g);
    const m = lmMat; const nave = new THREE.Mesh(new THREE.BoxGeometry(70, 28, 26), m); nave.position.set(22, 14, 0); g.add(nave);
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(12, 70, 12), m); t1.position.set(-14, 35, -8); g.add(t1); const s1 = new THREE.Mesh(new THREE.ConeGeometry(7, 16, 8), m); s1.position.set(-14, 78, -8); g.add(s1);
    const t2 = new THREE.Mesh(new THREE.BoxGeometry(11, 58, 11), m); t2.position.set(-14, 29, 8); g.add(t2); const s2 = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 6, 0, 6.3, 0, 1.6), m); s2.position.set(-14, 58, 8); g.add(s2); }

  // ---------- route (revealed by distance) ----------
  const R = MAP.route; const cum = [0]; for (let i = 1; i < R.length; i++) cum.push(cum[i - 1] + Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]));
  const TOT = cum[cum.length - 1];
  const routeAt = (s) => { s = clamp(s, 0, TOT); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const u = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1); return V(lerp(R[i - 1][0], R[i][0], u), 0, lerp(R[i - 1][1], R[i][1], u)); };
  const routeU = { reveal: { value: 0 }, time: { value: 0 }, fade: { value: 1 } };
  { // densify so the reveal is smooth
    const pts = [], ds = []; for (let s = 0; s <= TOT; s += 3) { const p = routeAt(s); pts.push([p.x, p.z]); ds.push(s); }
    const g = ribbon(pts, 5.5, 1.2); const d2 = []; ds.forEach((d) => d2.push(d, d)); g.setAttribute("dist", new THREE.Float32BufferAttribute(d2, 1));
    const m = new THREE.ShaderMaterial({ uniforms: routeU, transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: `attribute float dist; varying float vD; void main(){ vD = dist; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform float reveal, time, fade; varying float vD; void main(){ if (vD > reveal) discard; float head = smoothstep(reveal-60.0, reveal, vD);
        float pulse = 0.65 + 0.35*sin(vD*0.08 - time*8.0); vec3 c = vec3(1.0,0.18,0.24) * (1.6 + 1.6*head) * pulse; gl_FragColor = vec4(c, fade); }` });
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 5; scene.add(mesh); }
  // suspect car marker: red dot + halo + ring
  const ringG = new THREE.RingGeometry(0.85, 1, 64); ringG.rotateX(-Math.PI / 2);
  const ringMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
  const carDot = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); scene.add(carDot);
  const carHalo = glow(PAL.red, 90); const carRing = new THREE.Mesh(ringG, ringMat(PAL.red)); scene.add(carRing);
  // timing of the car along the route (canonical): enter, stop at N, E (Sienna), S (Grodzka), then south to the arrest point
  const dN = cum[1], dE = cum[2], dS = cum[3];
  const SK = [[4.8, 0], [6.3, dN], [7.5, dN], [8.7, dE], [9.9, dE], [11.1, dS], [12.3, dS], [21.2, TOT]];
  const sAt = (t) => { if (t <= SK[0][0]) return 0; for (let i = 1; i < SK.length; i++) if (t <= SK[i][0]) { const u = (t - SK[i - 1][0]) / (SK[i][0] - SK[i - 1][0]); return lerp(SK[i - 1][1], SK[i][1], i === SK.length - 1 ? ss(0, 1, u) * 0.3 + u * 0.7 : ease(u)); } return TOT; };
  const STOPS = [{ p: MAP.stops.N, t: 6.3, txt: "SŁAWKOWSKA" }, { p: MAP.stops.E, t: 8.7, txt: "SIENNA" }, { p: MAP.stops.S, t: 11.1, txt: "GRODZKA" }];
  const pins = STOPS.map((s) => { const g = new THREE.Group(); const pm = new THREE.MeshBasicMaterial({ color: PAL.red, toneMapped: false });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), pm); ball.position.y = 30; const cone = new THREE.Mesh(new THREE.ConeGeometry(7.5, 20, 16), pm); cone.rotation.x = Math.PI; cone.position.y = 14; g.add(ball, cone);
    g.position.set(s.p[0], 0, s.p[1]); scene.add(g); const r = new THREE.Mesh(ringG, ringMat(PAL.red)); r.position.set(s.p[0], 1.5, s.p[1]); scene.add(r);
    const l = label(s.txt, "#ff5a5a", undefined, 80); return { g, r, l, s }; });
  // police: blue dots converge from around the old town and chase down Grodzka
  const police = []; { const r = mulberry32(8); for (let i = 0; i < 7; i++) { const a = -0.6 + i * 0.75 + r() * 0.3, d = 650 + r() * 300; police.push({ from: V(Math.cos(a) * d, 0, Math.sin(a) * d + 300), t0: 13.6 + i * 0.35, lag: 40 + i * 22, dot: new THREE.Mesh(new THREE.SphereGeometry(5, 12, 10), new THREE.MeshBasicMaterial({ color: 0xdfeaff, toneMapped: false })), halo: glow(PAL.blue, 70), ang: i * 0.9 }); }
    police.forEach((p) => scene.add(p.dot)); }
  const END = V(MAP.stops.end[0], 0, MAP.stops.end[1]);
  const arrestRing = new THREE.Mesh(ringG, ringMat(PAL.blue)); arrestRing.position.copy(END).setY(1.5); scene.add(arrestRing);
  const arrestLabel = label("DITAHAN", "#7fb8ff", undefined, 90);
  // 1 km ruler: from the Cloth Hall to the arrest point
  const ruler = new THREE.Group(); scene.add(ruler); const rulerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
  { const a = V(0, 0, 0), b = END.clone(); const n = 26; for (let i = 0; i < n; i += 1) { if (i % 2) continue; const p0 = a.clone().lerp(b, i / n), p1 = a.clone().lerp(b, (i + 1) / n); const seg = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1), rulerMat); seg.position.copy(p0).add(p1).multiplyScalar(0.5).setY(60); seg.scale.z = p0.distanceTo(p1); seg.lookAt(p1.clone().setY(60)); ruler.add(seg); } }
  const kmLabel = label("1 KM", "#ffffff", undefined, 150);
  // candles (amber glows) at the stops, then a vigil across the square
  const candles = []; STOPS.forEach((s, i) => { for (let k = 0; k < 2; k++) candles.push({ p: V(s.p[0] + (k ? 14 : -14), 6, s.p[1] + (k ? 8 : -6)), t0: 29.6 + (i * 2 + k) * 0.35, g: glow(PAL.amber, 60), d: new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a8, toneMapped: false })) }); });
  const vigil = []; { const r = mulberry32(44); const q = MAP.square; const A = V(q.N[0], 0, q.N[1]), B = V(q.E[0], 0, q.E[1]), C = V(q.W[0], 0, q.W[1]);
    for (let i = 0; i < 60; i++) { const u = 0.08 + r() * 0.84, v = 0.08 + r() * 0.84; const p = A.clone().add(B.clone().sub(A).multiplyScalar(u)).add(C.clone().sub(A).multiplyScalar(v)); if (Math.hypot(p.x, p.z) < 60) continue; p.y = 5; vigil.push({ p, t0: 54.2 + (i % 30) * 0.05, g: glow(PAL.amber, 36), d: null }); } }
  candles.forEach((c) => scene.add(c.d));
  // Ostrowiec: an arc leaving the map to the north-east (about 140 km away, compressed)
  const OST = V(2400, 0, -2600);
  const arcCurve = new THREE.QuadraticBezierCurve3(V(0, 10, 0), V(1200, 900, -1300), OST.clone().setY(10));
  const arcU = { reveal: { value: 0 } };
  { const g = new THREE.TubeGeometry(arcCurve, 120, 7, 8); const uv = g.attributes.uv; const d = new Float32Array(uv.count); for (let i = 0; i < uv.count; i++) d[i] = uv.getX(i); g.setAttribute("dist", new THREE.BufferAttribute(d, 1));
    const m = new THREE.ShaderMaterial({ uniforms: arcU, transparent: true, depthWrite: false, toneMapped: false, vertexShader: `attribute float dist; varying float vD; void main(){ vD = dist; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform float reveal; varying float vD; void main(){ if (vD > reveal) discard; gl_FragColor = vec4(vec3(1.0,0.75,0.35)*2.2, 1.0); }` });
    scene.add(new THREE.Mesh(g, m)); }
  const ostRing = new THREE.Mesh(ringG, ringMat(PAL.amber)); ostRing.position.copy(OST).setY(2); scene.add(ostRing);
  const ostLabel = label("OSTROWIEC", "#ffc46b", undefined, 110);
  const ostCandles = [0, 1, 2].map((i) => ({ p: OST.clone().add(V(-90 + i * 90, 10, 60)), t0: 35.4 + i * 0.35, g: glow(PAL.amber, 140), d: null }));
  const homePin = glow(PAL.amber, 260);

  // ---------- post ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: FX.half ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, RW, RH);
  gtao.updateGtaoMaterial({ radius: 12, distanceExponent: 1.5, thickness: 8, scale: 1.0, samples: scale < 1 ? 6 : 10, distanceFallOff: 1, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 }); gtao.blendIntensity = 0.9;
  if (FX.ao) composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.5, 0.5, 0.9); if (FX.bloom) composer.addPass(bloom);
  const finish = new ShaderPass({ uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(RW, RH) }, vig: { value: 0.45 }, time: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; uniform float vig, time; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; c = (c - 0.5) * 1.08 + 0.5; c *= vec3(0.95, 1.0, 1.08);
        float scan = 0.97 + 0.03 * sin(vUv.y * res.y * 1.6); c *= scan;
        vec2 q = vUv - 0.5; q.x *= res.x / res.y; float v = smoothstep(0.95, 0.25, length(q)); c *= mix(1.0 - vig, 1.0, v); gl_FragColor = vec4(c, 1.0); }` });
  if (FX.finish) composer.addPass(finish);
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- camera ----------
  let curT = 0; const carP = () => routeAt(sAt(curT));
  const W0 = { pos: V(-260, 1450, 980), look: V(0, 0, 30) };
  const keys = [
    { t: 0, pos: () => W0.pos, look: () => W0.look, fov: 40 },
    { t: 4.6, pos: () => V(-300, 1000, 700), look: () => V(0, 0, -40), fov: 40 },
    { t: 7.0, pos: () => carP().add(V(-420, 700, 620)), look: () => carP().add(V(20, 0, 10)), fov: 40 },
    { t: 12.2, pos: () => carP().add(V(-430, 720, 640)), look: () => carP().add(V(20, 0, 20)), fov: 40 },
    { t: 16.0, pos: () => carP().add(V(-480, 900, 760)), look: () => carP().add(V(0, 0, 40)), fov: 40 },
    { t: 21.0, pos: () => V(-360, 1550, 1950), look: () => V(210, 0, 610), fov: 40 },
    { t: 28.6, pos: () => V(-400, 1500, 1900), look: () => V(210, 0, 590), fov: 40 },
    { t: 30.4, pos: () => V(-440, 720, 640), look: () => V(10, 0, 20), fov: 40 },
    { t: 33.6, pos: () => V(-460, 760, 660), look: () => V(10, 0, 0), fov: 40 },
    { t: 35.8, pos: () => V(-1500, 3600, 2600), look: () => V(900, 0, -900), fov: 40 },
    { t: 39.0, pos: () => V(-1300, 3300, 2300), look: () => V(1000, 0, -1100), fov: 40 },
    { t: 46.0, pos: () => V(-500, 1500, 1200), look: () => V(0, 0, 0), fov: 40 },
    { t: 54.4, pos: () => V(-460, 860, 720), look: () => V(0, 0, 10), fov: 40 },
    { t: 60, pos: () => V(-420, 780, 660), look: () => V(0, 0, 10), fov: 40 },
  ];
  const hc = (p0, p1, p2, p3, u) => { const seg = p2.distanceTo(p1); const m1 = p2.clone().sub(p0).multiplyScalar(0.5); if (m1.length() > seg) m1.setLength(seg); const m2 = p3.clone().sub(p1).multiplyScalar(0.5); if (m2.length() > seg) m2.setLength(seg);
    const u2 = u * u, u3 = u2 * u; return p1.clone().multiplyScalar(2 * u3 - 3 * u2 + 1).add(m1.multiplyScalar(u3 - 2 * u2 + u)).add(p2.clone().multiplyScalar(-2 * u3 + 3 * u2)).add(m2.multiplyScalar(u3 - u2)); };
  const camAt = (t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1].t) i++; const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    let u = clamp((t - k1.t) / (k2.t - k1.t)); u = u * u * (3 - 2 * u) * 0.65 + u * 0.35;
    return { P: hc(k0.pos(t), k1.pos(t), k2.pos(t), k3.pos(t), u), L: hc(k0.look(t), k1.look(t), k2.look(t), k3.look(t), u), fov: lerp(k1.fov, k2.fov, u) }; };

  // labels keep a constant on-screen size
  const camDist = (p) => camera.position.distanceTo(p) / 900;
  const showLabel = (l, p, op, lift = 0) => { l.visible = op > 0.01; l.material.opacity = op; const k = camDist(p); l.position.copy(p).add(V(0, lift * k, 0)); l.scale.set(l.userData.w * k, (l.userData.w * k) / l.userData.aspect, 1); };
  const placeGlow = (c, t, size) => { const s = ss(c.t0, c.t0 + 0.4, t); const fl = 0.85 + 0.15 * Math.sin(t * 13 + c.p.x); c.g.position.copy(c.p); c.g.material.opacity = s * fl; const k = camDist(c.p); c.g.scale.setScalar(size * k * (0.6 + 0.4 * pop(c.t0, t, 0.5)));
    if (c.d) { c.d.visible = s > 0.01; c.d.position.copy(c.p); c.d.scale.setScalar(S0(s) * k); } };

  function render(t) {
    t = clamp(t, 0, 60); curT = t;
    const cam = camAt(t); camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov; camera.setViewOffset(W, H, 0, H * 0.08, W, H); camera.updateProjectionMatrix();
    const attackFade = 1 - ss(44, 46.5, t);
    // route + car
    const s = sAt(t); routeU.reveal.value = t < 4.8 ? -1 : s; routeU.time.value = t; routeU.fade.value = 0.35 + 0.65 * attackFade;
    const cp = routeAt(s); const carOn = t > 4.8 && t < 46 ? 1 : 0; const k = camDist(cp);
    carDot.visible = carOn > 0; carDot.position.copy(cp).setY(8); carDot.scale.setScalar(Math.max(1, k * 1.2));
    carHalo.position.copy(cp).setY(10); carHalo.material.opacity = carOn * (0.8 + 0.2 * Math.sin(t * 10)); carHalo.scale.setScalar(38 * Math.max(1, k));
    { const ph = (t * 1.4) % 1; carRing.position.copy(cp).setY(1.5); carRing.scale.setScalar(20 + ph * 90 * Math.max(1, k)); carRing.material.opacity = carOn * (1 - ph) * (t < 21.4 ? 1 : 0.3); }
    pins.forEach((P, i) => { const a = pop(P.s.t, t, 0.45) * attackFade; P.g.visible = a > 0.01; P.g.scale.setScalar(S0(a) * Math.max(1, camDist(P.g.position) * 1.1)); P.g.rotation.y = t;
      const ph = ((t - P.s.t) % 1.1) / 1.1; P.r.material.opacity = t > P.s.t ? 0.9 * (1 - ph) * attackFade : 0; P.r.scale.setScalar(15 + ph * 80);
      showLabel(P.l, V(P.s.p[0], 0, P.s.p[1]), ss(P.s.t, P.s.t + 0.3, t) * (1 - ss(20.6, 21.2, t)), 75); });
    // police
    police.forEach((p, i) => { const on = t > p.t0 && t < 46 ? 1 : 0; let pos;
      if (t < 21.2) { const target = routeAt(Math.max(dS, s - p.lag)); const u = ss(p.t0, p.t0 + 3.2, t); pos = p.from.clone().lerp(target, u); }
      else { const a = p.ang + (t - 21.2) * 0.2; const r = 34 * ss(21.2, 22.6, t) + 6; const target = END.clone().add(V(Math.cos(a) * r, 0, Math.sin(a) * r)); pos = routeAt(TOT - p.lag).lerp(target, ss(21.2, 22.6, t)); }
      p.dot.visible = on > 0; p.dot.position.copy(pos).setY(8); p.dot.scale.setScalar(Math.max(1, camDist(pos) * 1.1));
      const blink = Math.floor(t * 6 + i) % 2 ? 1 : 0.45; p.halo.position.copy(pos).setY(10); p.halo.material.opacity = on * blink * attackFade; p.halo.scale.setScalar(30 * Math.max(1, camDist(pos))); });
    { const ph = ((t - 21.3) % 1.2) / 1.2; arrestRing.material.opacity = t > 21.3 ? 0.9 * (1 - ph) * attackFade : 0; arrestRing.scale.setScalar(20 + ph * 160);
      showLabel(arrestLabel, END, ss(21.6, 22.0, t) * attackFade, 70);
      const ro = ss(22.4, 23.2, t) * (1 - ss(28.6, 29.4, t)); rulerMat.opacity = ro; ruler.visible = ro > 0.01; kmLabel.visible = false; }
    // candles
    candles.forEach((c) => placeGlow(c, t, 26)); vigil.forEach((c) => placeGlow(c, t, 16)); ostCandles.forEach((c) => placeGlow(c, t, 22));
    // Ostrowiec arc
    { arcU.reveal.value = t < 33.6 ? 0 : ss(33.8, 35.4, t) * (1 - ss(45.5, 46.5, t) * 1.01); const o = ss(35.0, 35.5, t) * (1 - ss(45.5, 46.5, t));
      const ph = (t * 0.9) % 1; ostRing.material.opacity = o * (1 - ph); ostRing.scale.setScalar(60 + ph * 420); showLabel(ostLabel, OST, o, 90);
      homePin.position.copy(OST).setY(20); homePin.material.opacity = o * 0.8; homePin.scale.setScalar(60 * camDist(OST)); }
    finish.uniforms.time.value = t;
    composer.render();
  }
  function debug(t) { render(t); const v = carDot.position.clone().project(camera); return { t, car: carDot.position.toArray().map((x) => +x.toFixed(0)), ndc: [+v.x.toFixed(2), +v.y.toFixed(2)] }; }
  return { render, debug, scene, composer };
}
