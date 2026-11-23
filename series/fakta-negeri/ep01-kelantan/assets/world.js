// FAKTA NEGERI #1 — Kelantan, 8 Disember 1941. v4 cinematic look adapted for history: night navy + fire orange.
// Locations (each its own place in the world, joined by short dips to black on a whoosh):
//   MAP   at origin       : 3D relief map of Malaysia (Natural Earth states), opener, the march south, outro.
//   BEACH at (1000, 0, 0) : Pantai Sabak at night (ships, landing, tracers, Hudsons), and the same beach by day.
//   GLOBE at (-1000, 0, 0): globe with Kelantan and Pearl Harbor pins and the arc between them.
// Everything is a pure function of canonical time t (0..60 s). t = 0 and t = 60 render the same frame (loop).
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "./lib/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "./lib/jsm/environments/RoomEnvironment.js";
import { MY, NB, WORLD } from "./geo.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const pop = (t0, t, d = 0.4) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S0 = (x) => Math.max(0.0001, x);
const TAU = Math.PI * 2;

// ---- story clock (canonical seconds) ----
export const T = {
  beachIn: 8.4, ships: 9.8, lights: 11.2, boats: 15.0, land: 18.2, fire: 18.4, planes: 21.0, bombs: [23.4, 24.1, 24.8], hush: 25.6, rise: 26.4,
  globeIn: 28.0, kbPin: 28.6, phPin: 31.0, arc: 31.4, mapIn: 37.6, march: 39.0, sgFall: 45.4, dayIn: 46.2, outroIn: 53.6,
};
// map projection: 1 degree = 4 units; x east, z south (shape y = north)
const LON0 = 102, LAT0 = 4, K = 4;
const mx = (lon) => (lon - LON0) * K, mz = (lat) => -(lat - LAT0) * K;
const MP = (lon, lat, y = 0) => V(mx(lon), y, mz(lat));
const PLACES = { kb: [102.24, 6.13], sabak: [102.33, 6.17], sg: [103.82, 1.35], kl: [101.69, 3.14], jitra: [100.42, 6.27], ipoh: [101.08, 4.6], kt: [103.13, 5.33], kuantan: [103.33, 3.81], jb: [103.76, 1.6], singora: [100.6, 7.2], muar: [102.57, 2.04] };

export function createWorld(canvas, W, H, scale = 1, opts = {}) {
  const FX = { bloom: opts.bloom ?? true, msaa: opts.msaa ?? (scale < 1 ? 0 : 4) };
  const realRandom = Math.random; Math.random = mulberry32(1941);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  const BG = new THREE.Color(0x070b14);
  const scene = new THREE.Scene(); scene.background = BG.clone(); scene.fog = new THREE.Fog(0x070b14, 60, 260);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 3000);
  const hemi = new THREE.HemisphereLight(0x8fa8d8, 0x0a0d16, 0.6); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xb8ccff, 1.6); key.position.set(-30, 60, 40); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9a5a, 0.7); rim.position.set(30, 20, -60); scene.add(rim);
  const camLight = new THREE.PointLight(0xc8d8ff, 0, 40, 1.6); scene.add(camLight);

  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.25, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, size, parent = scene) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.scale.setScalar(size); parent.add(s); return s; };

  // ---------- sky dome + stars (follow the camera) ----------
  const skyU = { top: { value: new THREE.Color(0x05070d) }, hor: { value: new THREE.Color(0x0e1830) }, bot: { value: new THREE.Color(0x05070d) } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top, hor, bot; varying vec3 vP; void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(hor, top, pow(smoothstep(0.0, 0.6, y), 0.7)) : mix(hor, bot, smoothstep(0.0, 0.15, -y)); gl_FragColor = vec4(c, 1.0); }` }));
  sky.renderOrder = -10; scene.add(sky);
  const starsG = new THREE.BufferGeometry(); { const r = mulberry32(77); const p = []; for (let i = 0; i < 1400; i++) { const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u); p.push(Math.cos(a) * s * 1400, Math.abs(u) * 1400 * (r() < 0.85 ? 1 : -1), Math.sin(a) * s * 1400); } starsG.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); }
  const starsM = new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false, depthWrite: false });
  const stars = new THREE.Points(starsG, starsM); scene.add(stars);

  // ================= MAP (origin) =================
  const MAP = new THREE.Group(); scene.add(MAP);
  const seaM = new THREE.MeshStandardMaterial({ color: 0x0a1222, roughness: 0.55, metalness: 0.3 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), seaM); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.05; MAP.add(sea);
  const grid = new THREE.GridHelper(400, 100, 0x1a2a48, 0x121d33); grid.position.set(20, 0.0, -10); grid.material.transparent = true; grid.material.opacity = 0.55; MAP.add(grid);
  const ringShape = (ring) => { const s = new THREE.Shape(); ring.forEach(([lo, la], i) => (i ? s.lineTo(mx(lo), (la - LAT0) * K) : s.moveTo(mx(lo), (la - LAT0) * K))); s.closePath(); return s; };
  const extrudeRings = (rings, depth) => { const g = new THREE.ExtrudeGeometry(rings.map(ringShape), { depth, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); return g; };
  const nbM = new THREE.MeshStandardMaterial({ color: 0x141c2c, roughness: 0.9 });
  const nbLineM = new THREE.LineBasicMaterial({ color: 0x2c3c5c, transparent: true, opacity: 0.6 });
  for (const [iso, rings] of Object.entries(NB)) { const g = extrudeRings(rings, 0.25); MAP.add(new THREE.Mesh(g, nbM)); const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 40), nbLineM); MAP.add(e); }
  const STATES = {};
  const stateCentroid = (rings) => { let sx = 0, sy = 0, n = 0, best = rings[0]; rings.forEach((r) => { if (r.length > best.length) best = r; }); best.forEach(([lo, la]) => { sx += lo; sy += la; n++; }); return [sx / n, sy / n]; };
  for (const [name, rings] of Object.entries(MY)) {
    const g = extrudeRings(rings, 0.6);
    const m = new THREE.MeshPhysicalMaterial({ color: 0x34456a, roughness: 0.55, metalness: 0.1, clearcoat: 0.4, clearcoatRoughness: 0.4, emissive: 0xff3a1a, emissiveIntensity: 0 });
    const mesh = new THREE.Mesh(g, m);
    const lm = new THREE.LineBasicMaterial({ color: 0x8fb0e8, transparent: true, opacity: 0.85, toneMapped: false });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), lm);
    const grp = new THREE.Group(); grp.add(mesh); grp.add(edges); MAP.add(grp);
    const c = stateCentroid(rings);
    STATES[name] = { grp, m, lm, c, i: Object.keys(STATES).length };
  }
  // fronts of the march south (two thrusts): west coast from Singora, east coast from Kota Bharu, meeting in Johor, ending at Singapore
  const P = (k, y = 0.9) => MP(PLACES[k][0], PLACES[k][1], y);
  const westPath = new THREE.CatmullRomCurve3([P("singora"), P("jitra"), P("ipoh"), P("kl"), P("muar"), P("jb"), P("sg")], false, "centripetal");
  const eastPath = new THREE.CatmullRomCurve3([P("kb"), P("kt"), P("kuantan"), MP(103.4, 2.6, 0.9), P("jb")], false, "centripetal");
  const frontM = new THREE.MeshBasicMaterial({ color: 0xff3a1a, toneMapped: false });
  const mkFront = (curve) => { const g = new THREE.TubeGeometry(curve, 240, 0.22, 8, false); const m = new THREE.Mesh(g, frontM); m.geometry.setDrawRange(0, 0); MAP.add(m);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 16), frontM); MAP.add(head); const hg = glow(0xff5a2a, 5, MAP); return { curve, m, head, hg, idx: g.index.count }; };
  const fronts = [mkFront(westPath), mkFront(eastPath)];
  const sgGlow = glow(0xff2a10, 10, MAP); sgGlow.position.copy(P("sg", 1.2));
  const kbGlow = glow(0xff5a2a, 4, MAP); kbGlow.position.copy(P("kb", 1.4));
  const kbPinM = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 8), new THREE.MeshBasicMaterial({ color: 0xffb070, toneMapped: false })); kbPinM.position.copy(P("kb", 2.6)); MAP.add(kbPinM);

  // ================= BEACH (x = 1000) =================
  const BX = 1000; const BEACH = new THREE.Group(); BEACH.position.set(BX, 0, 0); scene.add(BEACH);
  const B = (x, y, z) => V(BX + x, y, z);
  const waterG = new THREE.PlaneGeometry(900, 520, 150, 80); waterG.rotateX(-Math.PI / 2); waterG.translate(0, 0, -258);
  const waterBase = waterG.attributes.position.array.slice();
  const waterM = new THREE.MeshPhysicalMaterial({ color: 0x0b1628, roughness: 0.32, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.15 });
  const water = new THREE.Mesh(waterG, waterM); BEACH.add(water);
  const sandG = new THREE.PlaneGeometry(900, 90, 90, 18); sandG.rotateX(-Math.PI / 2); { const p = sandG.attributes.position; const r = mulberry32(3); for (let i = 0; i < p.count; i++) { const z = p.getZ(i) + 41; p.setY(i, -0.6 + 0.045 * (z + 4) + (z > 6 ? 0.25 * Math.sin(p.getX(i) * 0.08) * Math.sin(z * 0.2) : 0) + r() * 0.05); p.setZ(i, z); } sandG.computeVertexNormals(); }
  const sandM = new THREE.MeshStandardMaterial({ color: 0xb8a886, roughness: 0.95 });
  BEACH.add(new THREE.Mesh(sandG, sandM));
  const foamM = new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false });
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(900, 1.6), foamM); foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.06, 0.6); BEACH.add(foam);
  // moon + moon path on the water
  const moon = glow(0xdfe8ff, 70); const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: 0xf4f6ff, fog: false, toneMapped: false })); scene.add(moonDisc);
  const MOON = B(-140, 150, -900);
  const sun = glow(0xffd8a0, 160); const SUN = B(-260, 40, -900);
  const moonPath = new THREE.Mesh(new THREE.PlaneGeometry(26, 520), new THREE.MeshBasicMaterial({ color: 0x9fb4e8, map: glowTex, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  moonPath.rotation.x = -Math.PI / 2; moonPath.position.set(-60, 0.12, -300); moonPath.rotation.z = 0.15; BEACH.add(moonPath);
  // palms
  const palmM = new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 0.9 }), frondM = new THREE.MeshStandardMaterial({ color: 0x24402a, roughness: 0.8, side: THREE.DoubleSide });
  const fr = new THREE.PlaneGeometry(4.6, 0.9, 6, 1); { const p = fr.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 2.3; p.setX(i, x); p.setY(i, p.getY(i) * (1 - x / 4.8)); p.setZ(i, -0.11 * x * x); } fr.rotateX(-Math.PI / 2); fr.computeVertexNormals(); }
  const palms = [];
  { const r = mulberry32(11); for (let i = 0; i < 26; i++) { const g = new THREE.Group(); const x = -90 + i * 7 + r() * 4, z = 16 + r() * 24; if (x > -46 && x < 8) continue; g.position.set(x, -0.6 + 0.045 * (z + 4), z);
      const lean = (r() - 0.5) * 0.5, hgt = 9 + r() * 5; const curve = new THREE.QuadraticBezierCurve3(V(0, 0, 0), V(lean * 3, hgt * 0.5, -1), V(lean * 6, hgt, -2.4));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.26, 6), palmM)); const top = curve.getPoint(1);
      for (let k = 0; k < 8; k++) { const f = new THREE.Mesh(fr, frondM); f.position.copy(top); f.rotation.set(0, (k / 8) * TAU + r(), 0); f.rotateZ(-0.15 - r() * 0.3); g.add(f); }
      BEACH.add(g); palms.push(g); } }
  // kampung stilt houses
  const woodM = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.9 }), roofM = new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.8 }), lampM = new THREE.MeshBasicMaterial({ color: 0xffb35a, toneMapped: false });
  const houses = [];
  { const r = mulberry32(21); for (let i = 0; i < 7; i++) { const g = new THREE.Group(); const x = -60 + i * 17 + r() * 6, z = 36 + r() * 10; g.position.set(x, 1.6, z); g.rotation.y = (r() - 0.5) * 0.4;
      const body = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 5), woodM); body.position.y = 2.6; g.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3.2, 4), roofM); roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.85); roof.position.y = 5.8; g.add(roof);
      for (const sx of [-3, 3]) for (const sz of [-2, 2]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.2, 5), woodM); st.position.set(sx, 0, sz); g.add(st); }
      if (i % 3 === 1) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.9), lampM); w.position.set(1.4, 2.8, -2.51); w.rotation.y = Math.PI; g.add(w); const lg = glow(0xffa040, 3.5, g); lg.position.set(1.4, 2.8, -2.7); }
      BEACH.add(g); houses.push(g); } }
  // pillbox (defenders) + wire
  const concM = new THREE.MeshStandardMaterial({ color: 0x7c7a72, roughness: 0.95 });
  const PILL = new THREE.Group(); PILL.position.set(-26, -0.2, 7); BEACH.add(PILL);
  { const body = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 2.2, 6), concM); body.position.y = 1.0; PILL.add(body); const roofP = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 0.4, 6), concM); roofP.position.y = 2.25; PILL.add(roofP);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 0.3), new THREE.MeshBasicMaterial({ color: 0x050505 })); slit.position.set(0, 1.45, -2.45); PILL.add(slit); }
  const SLIT = B(-26, 1.25, 4.4);
  const wireM = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.8 });
  for (let i = 0; i < 40; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 4), wireM); p.position.set(-60 + i * 3.2, 0.0, 2.6 + (i % 2) * 0.4); p.rotation.z = (i % 2 ? 0.15 : -0.15); BEACH.add(p); }
  // ships: dark silhouettes on the horizon, warm portholes, searchlights
  const shipM = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.7, metalness: 0.3 }), portM = new THREE.MeshBasicMaterial({ color: 0xffc27a, toneMapped: false });
  const beamM = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  const beamG = new THREE.ConeGeometry(4.5, 220, 24, 1, true); beamG.translate(0, -110, 0);
  const ships = [];
  const hullShape = (() => { const s = new THREE.Shape(); s.moveTo(-1, -14); s.lineTo(1, -14); s.lineTo(2.6, -9); s.lineTo(2.8, 10); s.lineTo(0, 16); s.lineTo(-2.8, 10); s.lineTo(-2.6, -9); s.closePath(); return s; })();
  [[-70, -230, 1.0, 0.3], [-20, -200, 1.3, -0.2], [35, -250, 1.1, 0.5], [85, -215, 0.9, 0.1], [140, -270, 1.0, -0.4]].forEach(([x, z, s, yaw], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI / 2 + yaw; g.scale.setScalar(s * 1.6);
    const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 3.2, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, -1.2, 0), shipM); g.add(hull);
    const sup = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.4, 8), shipM); sup.position.set(0, 3.6, 1); g.add(sup);
    const br = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 3.2), shipM); br.position.set(0, 6.2, 2.2); g.add(br);
    const fun = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 4, 10), shipM); fun.position.set(0, 6.4, -2.6); fun.rotation.x = -0.2; g.add(fun);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 5), shipM); mast.position.set(0, 9.6, 3.4); g.add(mast);
    for (const tz of [-9, 9]) { const tur = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2.4), shipM); tur.position.set(0, 2.6, tz * 0.8); g.add(tur); const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4, 5), shipM); gun.rotation.x = Math.PI / 2; gun.position.set(0, 2.8, tz * 0.8 + Math.sign(tz) * 2.6); g.add(gun); }
    for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), portM); p.position.set(1.82, 3.0, -2 + k * 1.1); p.rotation.y = Math.PI / 2; g.add(p); const p2 = p.clone(); p2.position.x = -1.82; p2.rotation.y = -Math.PI / 2; g.add(p2); }
    const lamp = glow(0xeaf0ff, 6, g); lamp.position.set(0, 7.6, 3.6);
    const beam = new THREE.Mesh(beamG, beamM); BEACH.add(beam);
    const fire = glow(0xff6a20, 0.01); const fireL = new THREE.PointLight(0xff6a20, 0, 120, 1.5); scene.add(fireL);
    BEACH.add(g); ships.push({ g, beam, lamp, fire, fireL, ph: i * 1.7, s });
  });
  // landing craft + wakes, soldiers
  const boatM = new THREE.MeshStandardMaterial({ color: 0x2c3440, roughness: 0.8 }), wakeM = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false, map: glowTex });
  const boats = []; { const r = mulberry32(31); for (let i = 0; i < 12; i++) { const g = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 6.5), boatM); hull.position.y = 0.3; g.add(hull);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 0.2), boatM); ramp.position.set(0, 0.5, 3.3); g.add(ramp);
      const wake = new THREE.Mesh(new THREE.PlaneGeometry(4, 16), wakeM); wake.rotation.x = -Math.PI / 2; wake.position.set(0, 0.05, -8); g.add(wake); g.userData.wake = wake;
      { const bl = glow(0xffb070, 2.2, g); bl.position.set(0, 1.6, -3); }
      BEACH.add(g); boats.push({ g, x0: -70 + i * 13 + (r() - 0.5) * 6, z0: -170 - r() * 50, d: r() * 1.6 }); } }
  const NS = 90; const soldierM = new THREE.MeshStandardMaterial({ color: 0x2a2c26, roughness: 0.9 });
  const soldiers = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.28, 1.0, 3, 6), soldierM, NS); soldiers.frustumCulled = false; BEACH.add(soldiers);
  // tracers + muzzle flashes + splashes
  const NT = 46; const tracerM = new THREE.MeshBasicMaterial({ color: 0xffa040, toneMapped: false, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  const tracerG = new THREE.BoxGeometry(3.6, 0.12, 0.12);
  const tracers = new THREE.InstancedMesh(tracerG, tracerM, NT); tracers.frustumCulled = false; BEACH.add(tracers);
  const tracerCol = new THREE.Color(); for (let i = 0; i < NT; i++) tracers.setColorAt(i, tracerCol.set(i % 3 === 0 ? 0x9cffb0 : 0xffa040));
  const muzzle = glow(0xffc070, 4); const muzzleL = new THREE.PointLight(0xffa050, 0, 30, 1.8); scene.add(muzzleL);
  const splashM = new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
  const splashes = T.bombs.map((tb, i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(3.4, 24, 16, 1, true), splashM.clone()); m.geometry.translate(0, 12, 0); BEACH.add(m); const fl = glow(0xffb060, 0.01); return { m, fl, tb, ship: ships[[1, 2, 1][i]], off: V([-9, 7, 12][i], 0, [8, -6, 5][i]) }; });
  // Lockheed Hudsons (RAAF): twin-engine, twin tail
  const planeM = new THREE.MeshStandardMaterial({ color: 0x3c4436, roughness: 0.6, metalness: 0.3 }), propM = new THREE.MeshBasicMaterial({ color: 0x8a8f98, transparent: true, opacity: 0.35, depthWrite: false });
  function makeHudson() { const g = new THREE.Group();
    const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 9, 6, 12), planeM); fus.rotation.z = Math.PI / 2; g.add(fus);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0x9fb8d8, roughness: 0.05, transmission: 0.2, metalness: 0.2 })); nose.position.x = 5.2; g.add(nose);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 20), planeM); wing.position.set(1.0, -0.1, 0); g.add(wing);
    for (const s of [-1, 1]) { const nac = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 2.4, 4, 10), planeM); nac.rotation.z = Math.PI / 2; nac.position.set(2.0, 0, s * 3.6); g.add(nac);
      const prop = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20), propM); prop.rotation.y = Math.PI / 2; prop.position.set(3.6, 0, s * 3.6); g.add(prop);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.15), planeM); fin.position.set(-4.6, 1.0, s * 2.4); g.add(fin); }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 5.2), planeM); tail.position.set(-4.6, 0.2, 0); g.add(tail);
    const nav = glow(0xff4a3a, 1.4, g); nav.position.set(1, 0, -10); const nav2 = glow(0x4aff8a, 1.4, g); nav2.position.set(1, 0, 10);
    g.scale.setScalar(1.8); scene.add(g); return g; }
  const hudsons = [0, 1, 2].map(makeHudson);
  // embers / smoke motes near the camera (beach) and drifting dust (map)
  const NP = 90; const motes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffa860, toneMapped: false, transparent: true, opacity: 0.9 }), NP); motes.frustumCulled = false; scene.add(motes);

  // ================= GLOBE (x = -1000) =================
  const GX = -1000, GR = 14; const GC = V(GX, 0, 0);
  const tcv = document.createElement("canvas"); tcv.width = 2048; tcv.height = 1024;
  { const g = tcv.getContext("2d"); g.fillStyle = "#0b1426"; g.fillRect(0, 0, 2048, 1024);
    g.strokeStyle = "rgba(120,150,210,0.18)"; g.lineWidth = 1.5; for (let lo = -180; lo <= 180; lo += 15) { const x = (lo + 180) / 360 * 2048; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); } for (let la = -75; la <= 75; la += 15) { const y = (90 - la) / 180 * 1024; g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y); g.stroke(); }
    const draw = (ring, off) => { g.beginPath(); ring.forEach(([lo, la], i) => { const x = (lo + off + 180) / 360 * 2048, y = (90 - la) / 180 * 1024; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); g.stroke(); };
    g.fillStyle = "#2a3856"; g.strokeStyle = "#6f8cc4"; g.lineWidth = 1.6;
    WORLD.forEach((r) => { let jump = false; for (let i = 1; i < r.length; i++) if (Math.abs(r[i][0] - r[i - 1][0]) > 180) jump = true;
      if (!jump) { draw(r, 0); return; } const rr = r.map(([lo, la]) => [lo < 0 ? lo + 360 : lo, la]); draw(rr, 0); draw(rr, -360); }); }
  const globeTex = new THREE.CanvasTexture(tcv); globeTex.colorSpace = THREE.SRGBColorSpace; globeTex.anisotropy = 4;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(GR, 96, 64), new THREE.MeshStandardMaterial({ map: globeTex, roughness: 0.7, metalness: 0.1, emissive: 0xffffff, emissiveMap: globeTex, emissiveIntensity: 0.25 }));
  globe.position.copy(GC); scene.add(globe);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(GR * 1.06, 64, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.5); gl_FragColor = vec4(vec3(0.35,0.55,1.0) * f * 1.4, f); }` }));
  atm.position.copy(GC); scene.add(atm);
  const gpos = (lon, lat, r = GR) => { const phi = (lon + 180) / 360 * TAU, theta = (90 - lat) / 180 * Math.PI; return V(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta)).add(GC); };
  const KBG = [102.24, 6.13], PHG = [-157.95, 21.35];
  const pinM = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  const mkPin = (ll, c) => { const base = gpos(ll[0], ll[1]); const tip = gpos(ll[0], ll[1], GR + 1.6); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), pinM(c)); m.position.copy(base.clone().add(tip).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(V(0, 1, 0), tip.clone().sub(base).normalize()); scene.add(m);
    const h = glow(c, 3.2); h.position.copy(tip); const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 40), new THREE.MeshBasicMaterial({ color: c, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); ring.position.copy(gpos(ll[0], ll[1], GR + 0.03)); ring.lookAt(GC); scene.add(ring); return { m, h, ring, tip }; };
  const kbPin = mkPin(KBG, 0xff5a2a), phPin = mkPin(PHG, 0xff5a2a);
  const arcPts = []; { const a = gpos(KBG[0], KBG[1]).sub(GC).normalize(), b = gpos(PHG[0], PHG[1]).sub(GC).normalize(); const om = Math.acos(a.dot(b));
    for (let i = 0; i <= 100; i++) { const u = i / 100; const v = a.clone().multiplyScalar(Math.sin((1 - u) * om)).add(b.clone().multiplyScalar(Math.sin(u * om))).divideScalar(Math.sin(om)); arcPts.push(v.multiplyScalar(GR + 0.2 + 3.2 * Math.sin(u * Math.PI)).add(GC)); } }
  const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPts), 200, 0.09, 8), new THREE.MeshBasicMaterial({ color: 0xffd08a, toneMapped: false })); scene.add(arc);
  const arcIdx = arc.geometry.index.count; const arcHead = glow(0xffd08a, 2.2);

  // ---------- post: bloom + grade (cool shadows, warm highlights), vignette, grain, dip-to-black ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  if (FX.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.6, 0.55, 0.85));
  const finish = new ShaderPass({ uniforms: { tDiffuse: { value: null }, seed: { value: 0 }, res: { value: new THREE.Vector2(RW, RH) }, dip: { value: 0 }, flash: { value: 0 }, day: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float seed, dip, flash, day; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + seed) * 43758.5453); }
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = dot(c, vec3(0.299,0.587,0.114));
        vec3 night = mix(c * vec3(0.92, 1.0, 1.12), c * vec3(1.08, 1.0, 0.9), smoothstep(0.25, 0.9, l));   // teal shadows, warm highlights
        vec3 dawn = pow(c, vec3(0.97, 1.0, 1.05)) * vec3(1.05, 1.0, 0.94);
        c = mix(night, dawn, day);
        c += flash * vec3(1.0, 0.8, 0.55);
        vec2 q = vUv - 0.5; q.x *= res.x / res.y; c *= mix(0.5, 1.0, smoothstep(0.85, 0.25, length(q)));
        c += (h(vUv * res) - 0.5) * 0.014;
        c *= 1.0 - dip;
        gl_FragColor = vec4(c, 1.0); }` });
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- camera: one shot per location, Hermite through keys ----------
  const M = (x, y, z) => V(x, y, z), Bk = (x, y, z) => B(x, y, z);
  const G = (lon, lat, d) => gpos(lon, lat, d);
  const K0 = { pos: M(7, 62, 34), look: M(4, 0, -5), fov: 38 };
  const SHOTS = [
    { t0: -1, t1: T.beachIn, keys: [
      { t: 0, ...K0 }, { t: 2.2, pos: M(8, 56, 28), look: M(3, 0, -7), fov: 38 }, { t: 5.0, pos: M(4, 18, 10), look: M(0.8, 0, -6.4), fov: 38 }, { t: 7.2, pos: M(3.4, 9, 0.5), look: M(1.0, 0.5, -7.6), fov: 38 }, { t: 8.4, pos: M(3.0, 5.6, -3.6), look: M(1.0, 0.6, -8.4), fov: 38 } ] },
    { t0: T.beachIn, t1: T.globeIn, keys: [
      { t: 8.4, pos: Bk(-4, 21, 60), look: Bk(0, 1, -70), fov: 38 }, { t: 12.0, pos: Bk(-4, 15, 50), look: Bk(0, 3, -120), fov: 38 }, { t: 15.0, pos: Bk(-4, 7, 30), look: Bk(0, 2, -100), fov: 38 },
      { t: 18.2, pos: Bk(-17, 3.2, 19), look: Bk(-2, 1.0, -30), fov: 38 }, { t: 21.0, pos: Bk(-15, 3.8, 21), look: Bk(0, 3, -50), fov: 40 }, { t: 23.2, pos: Bk(-11, 5, 24), look: Bk(4, 6, -90), fov: 40 },
      { t: 25.6, pos: Bk(-6, 6, 20), look: Bk(2, 4, -120), fov: 38 }, { t: 28.0, pos: Bk(-4, 46, 40), look: Bk(0, 0, -120), fov: 38 } ] },
    { t0: T.globeIn, t1: T.mapIn, keys: [
      { t: 28.0, pos: G(102, 10, 46), look: GC, fov: 38 }, { t: 30.4, pos: G(112, 12, 60), look: GC, fov: 38 }, { t: 33.0, pos: G(150, 18, 74), look: GC, fov: 38 }, { t: 37.6, pos: G(158, 16, 78), look: GC, fov: 38 } ] },
    { t0: T.mapIn, t1: T.dayIn, keys: [
      { t: 37.6, pos: M(4, 44, 6), look: M(2, 0, -14), fov: 38 }, { t: 40.0, pos: M(6, 62, 34), look: M(3, 0, -4), fov: 38 }, { t: 45.4, pos: M(10, 58, 46), look: M(6, 0, 6), fov: 38 }, { t: 46.2, pos: M(10, 54, 46), look: M(6.5, 0, 7.5), fov: 38 } ] },
    { t0: T.dayIn, t1: T.outroIn, keys: [
      { t: 46.2, pos: Bk(-34, 2.6, 22), look: Bk(-25, 1.4, 2), fov: 38 }, { t: 49.6, pos: Bk(-31, 3.4, 27), look: Bk(-22, 1.6, -4), fov: 38 }, { t: 53.6, pos: Bk(-22, 16, 52), look: Bk(-6, 2, -60), fov: 38 } ] },
    { t0: T.outroIn, t1: 61, keys: [
      { t: 53.6, pos: M(14, 110, 70), look: M(16, 0, -8), fov: 38 }, { t: 57.0, pos: M(12, 92, 56), look: M(10, 0, -7), fov: 38 }, { t: 60, ...K0 } ] },
  ];
  const hc = (p0, p1, p2, p3, u) => { const seg = p2.distanceTo(p1);
    const m1 = p2.clone().sub(p0).multiplyScalar(0.5); if (m1.length() > seg) m1.setLength(seg);
    const m2 = p3.clone().sub(p1).multiplyScalar(0.5); if (m2.length() > seg) m2.setLength(seg);
    const u2 = u * u, u3 = u2 * u;
    return p1.clone().multiplyScalar(2 * u3 - 3 * u2 + 1).add(m1.multiplyScalar(u3 - 2 * u2 + u)).add(p2.clone().multiplyScalar(-2 * u3 + 3 * u2)).add(m2.multiplyScalar(u3 - u2)); };
  const camAt = (t) => { const shot = SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1]; const keys = shot.keys;
    let i = 0; while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    let u = clamp((t - k1.t) / (k2.t - k1.t)); u = u * u * (3 - 2 * u) * 0.7 + u * 0.3;
    return { P: hc(k0.pos, k1.pos, k2.pos, k3.pos, u), L: hc(k0.look, k1.look, k2.look, k3.look, u), fov: lerp(k1.fov, k2.fov, u) }; };
  const proj = (v) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H, p.z < 1 ? 1 : 0]; };
  const dummy = new THREE.Object3D();
  const loc = (t) => (t < T.beachIn ? "map" : t < T.globeIn ? "beach" : t < T.mapIn ? "globe" : t < T.dayIn ? "march" : t < T.outroIn ? "day" : "outro");
  const CUTS = [T.beachIn, T.globeIn, T.mapIn, T.dayIn, T.outroIn];
  const boatPos = (b, t) => { const u = ss(T.boats + b.d * 0.4, T.land + b.d * 0.5, t); return V(b.x0 + (b.x0 * -0.1) * u, 0, lerp(b.z0, -2.5, u)); };

  function render(t) {
    t = clamp(t, 0, 60);
    const L = loc(t);
    const cam = camAt(t); camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, -H * 0.04, W, H); camera.updateProjectionMatrix();
    sky.position.copy(camera.position); stars.position.copy(camera.position);
    finish.uniforms.seed.value = (Math.round(t * 30) % 97) * 0.37;
    let dip = 0; CUTS.forEach((c) => { dip = Math.max(dip, 1 - clamp(Math.abs(t - c) / 0.28)); }); finish.uniforms.dip.value = dip;
    const isMap = L === "map" || L === "march" || L === "outro", isBeach = L === "beach" || L === "day", isGlobe = L === "globe";
    const day = L === "day" ? 1 : 0; finish.uniforms.day.value = day;
    MAP.visible = isMap; BEACH.visible = isBeach; globe.visible = atm.visible = arc.visible = isGlobe;
    [kbPin, phPin].forEach((p) => { p.m.visible = p.h.visible = p.ring.visible = isGlobe; }); arcHead.visible = isGlobe;
    // ---- per-location light, fog and sky ----
    if (isMap) { scene.environmentIntensity = 0.35; scene.fog.color.set(0x070b14); scene.fog.near = 70; scene.fog.far = 320; skyU.top.value.set(0x04060c); skyU.hor.value.set(0x0c1428); skyU.bot.value.set(0x070b14);
      hemi.intensity = 0.7; key.intensity = 1.8; key.color.set(0xb8ccff); rim.intensity = 0.6; starsM.opacity = 0.0; }
    if (isGlobe) { scene.fog.near = 2000; scene.fog.far = 4000; skyU.top.value.set(0x020309); skyU.hor.value.set(0x050a18); skyU.bot.value.set(0x020309); hemi.intensity = 0.4; key.intensity = 2.2; key.color.set(0xffffff); rim.intensity = 0.4; starsM.opacity = 0.9; key.position.set(-1030, 40, 60); }
    else key.position.set(BX * (isBeach ? 1 : 0) - 30, 60, 40);
    if (isBeach && !day) { scene.environmentIntensity = 0.06; scene.fog.color.set(0x0b1426); scene.fog.near = 60; scene.fog.far = 420; skyU.top.value.set(0x03050c); skyU.hor.value.set(0x13213e); skyU.bot.value.set(0x0b1426);
      hemi.color.set(0x7088c0); hemi.groundColor.set(0x141824); hemi.intensity = 0.9; key.color.set(0xa8c0ff); key.intensity = 2.0; key.position.set(BX - 140, 150, -400); rim.intensity = 0.35; rim.color.set(0xff9a5a); rim.position.set(BX + 60, 30, 80); starsM.opacity = 0.85; waterM.color.set(0x0d1a30); sandM.color.set(0xb4a688); frondM.color.set(0x1c3222); }
    if (day) { scene.environmentIntensity = 0.4; scene.fog.color.set(0xe8c8a8); scene.fog.near = 80; scene.fog.far = 700; skyU.top.value.set(0x5d8cc8); skyU.hor.value.set(0xffd2a0); skyU.bot.value.set(0xd8b898);
      hemi.color.set(0xcfe0ff); hemi.groundColor.set(0x8a7058); hemi.intensity = 1.0; key.color.set(0xffd2a0); key.intensity = 3.0; key.position.set(BX - 200, 60, -300); rim.intensity = 0.0; starsM.opacity = 0; waterM.color.set(0x3a7898); sandM.color.set(0xe8d6b0); frondM.color.set(0x3a6a34); }
    moon.visible = moonDisc.visible = moonPath.visible = isBeach && !day; sun.visible = isBeach && day === 1; sun.position.copy(SUN); moon.position.copy(MOON); moonDisc.position.copy(MOON); moonDisc.lookAt(camera.position);
    camLight.position.copy(camera.position); camLight.intensity = isMap ? 0 : 0;

    // ================= MAP =================
    if (isMap) {
      const kelOn = L === "map" ? ss(3.0, 4.2, t) : L === "march" ? 1 : 0;
      const front = L === "march" ? ss(T.march, T.sgFall, t) : 0;   // 0..1 progress of the march south
      const frontLat = lerp(7.4, 1.2, front);
      for (const [name, s] of Object.entries(STATES)) {
        const isKel = name === "Kelantan"; const peninsula = s.c[0] < 105;
        let h = 1, em = 0, edge = 0.9, col = 0x34456a;
        if (isKel) { h = 1 + 1.6 * kelOn; em = 0.35 * kelOn * (0.85 + 0.15 * Math.sin(t * 5)); col = kelOn > 0 ? 0x7a2418 : col; }
        if (L === "march" && peninsula) { const taken = ss(-0.5, 0.3, s.c[1] - frontLat); em = Math.max(em * (1 - front), 0.55 * taken); if (isKel) h = lerp(3.4, 1.4, ss(T.march, T.march + 2, t)); }
        if (L === "outro") { const k = (t - 54.2) * 4.2 - s.i * 0.9; const b = Math.exp(-((k % 6) + 6) % 6 * 1.4) * ss(54.0, 54.6, t) * (1 - ss(58.6, 59.6, t)); em = 0.9 * b; h = 1 + 0.8 * b; edge = 0.85 + 0.6 * b; }
        if (L === "map") { const hint = isKel ? 0.12 * (1 - kelOn) * (0.5 + 0.5 * Math.sin(t * TAU / 2)) : 0; em = Math.max(em, hint); }
        s.grp.scale.y = h; s.m.emissiveIntensity = em; s.m.color.set(col); if (L === "march" && peninsula && em > 0.2) s.m.color.set(0x5a2a26); s.lm.opacity = edge; s.lm.color.set(em > 0.3 ? 0xffb090 : 0x8fb0e8);
      }
      kbGlow.visible = kbPinM.visible = L === "map" && t > 4.0; kbGlow.material.opacity = ss(4.0, 4.6, t) * (0.7 + 0.3 * Math.sin(t * 6)); kbPinM.visible = false;
      fronts.forEach((f, i) => { const on = L === "march"; f.m.visible = f.head.visible = f.hg.visible = on; if (!on) return;
        const u = i === 0 ? front : ss(T.march + 0.6, T.sgFall - 1.2, t); f.m.geometry.setDrawRange(0, Math.floor(f.idx * u / 6) * 6);
        const p = f.curve.getPointAt(clamp(u, 0.001, 1)), tg = f.curve.getTangentAt(clamp(u, 0.001, 0.999)); f.head.position.copy(p); f.head.quaternion.setFromUnitVectors(V(0, 1, 0), tg); f.hg.position.copy(p); f.hg.material.opacity = u > 0.01 && u < 0.999 ? 1 : 0.4; });
      sgGlow.visible = L === "march"; sgGlow.material.opacity = ss(T.sgFall - 0.2, T.sgFall + 0.3, t) * (0.8 + 0.2 * Math.sin(t * 8)); sgGlow.scale.setScalar(10 + 8 * Math.exp(-Math.max(0, t - T.sgFall) * 2) * (t > T.sgFall ? 1 : 0));
    }

    // ================= BEACH =================
    if (isBeach) {
      const night = !day;
      // waves (periods divide 60)
      { const p = waterG.attributes.position.array; const amp = night ? 1 : 0.6;
        for (let i = 0; i < p.length; i += 3) { const x = waterBase[i], z = waterBase[i + 2]; p[i + 1] = amp * (0.22 * Math.sin(x * 0.05 + z * 0.09 + t * TAU / 4) + 0.12 * Math.sin(x * 0.13 - z * 0.05 + t * TAU / 3) + 0.06 * Math.sin(z * 0.3 + t * TAU / 2)); }
        waterG.attributes.position.needsUpdate = true; waterG.computeVertexNormals(); }
      foamM.opacity = 0.25 + 0.15 * Math.sin(t * TAU / 4); foam.position.z = 0.6 + 0.8 * Math.sin(t * TAU / 4);
      // ships appear (fade from fog) and searchlights switch on
      const shipOn = night ? ss(T.ships, T.ships + 1.6, t) : 0;
      ships.forEach((s, i) => { s.g.visible = shipOn > 0.01; s.g.position.y = -4 * (1 - shipOn) + 0.3 * Math.sin(t * TAU / 6 + s.ph);
        const lo = night ? ss(T.lights + i * 0.25, T.lights + i * 0.25 + 0.3, t) : 0; s.lamp.material.opacity = lo; s.beam.visible = lo > 0.01;
        const src = s.g.position.clone().add(V(0, 7.6 * s.g.scale.y, 0)); s.beam.position.copy(src).add(V(BX, 0, 0)).sub(V(BX, 0, 0));
        const sweep = Math.sin(t * TAU / 10 + s.ph) * 60; const target = V(sweep + s.g.position.x * 0.3, 30 + 22 * Math.sin(t * TAU / 6 + i * 2), -20 + 10 * Math.sin(t * TAU / 12 + i));
        const dir = target.clone().sub(src).normalize(); s.beam.quaternion.setFromUnitVectors(V(0, -1, 0), dir); s.beam.material.opacity = 0.05 * lo; });
      // landing craft
      boats.forEach((b, i) => { const on = night && t > T.boats - 0.4; b.g.visible = on; if (!on) return; const p = boatPos(b, t), p2 = boatPos(b, t + 0.1);
        b.g.position.set(p.x, 0.2 + 0.25 * Math.sin(t * 3 + i), p.z); const d = p2.clone().sub(p); if (d.length() > 1e-4) b.g.rotation.y = Math.atan2(d.x, d.z); b.g.rotation.z = 0.05 * Math.sin(t * 2.4 + i);
        b.g.userData.wake.material.opacity = 0.75 * clamp(d.length() * 4); });
      // soldiers: wade out of the boats and move up the beach (small, distant)
      for (let i = 0; i < NS; i++) { const b = boats[i % boats.length]; const r = mulberry32(i * 7 + 2); const t0 = T.land + b.d * 0.5 + r() * 1.4; const on = night && t > t0;
        if (!on) { dummy.position.set(0, -999, 0); dummy.scale.setScalar(0.001); }
        else { const u = t - t0; dummy.position.set(b.x0 * 0.9 + (r() - 0.5) * 7, 0.6 + Math.max(-0.4, -0.5 + 0.06 * u), -2.0 + Math.min(u * 1.6, 9 + r() * 8)); dummy.rotation.set(0.25 + 0.15 * Math.sin(u * 8 + i), 0, 0); dummy.scale.setScalar(1); }
        dummy.updateMatrix(); soldiers.setMatrixAt(i, dummy.matrix); }
      soldiers.instanceMatrix.needsUpdate = true; soldiers.visible = night;
      // tracers: pillbox <-> boats, ships' guns
      const fireOn = night ? ss(T.fire, T.fire + 0.3, t) * (1 - ss(T.hush, T.hush + 0.4, t)) : 0;
      for (let i = 0; i < NT; i++) { const r = mulberry32(i * 13 + 5); const per = 0.5 + r() * 0.5, ph = r(); const u = ((t / per) + ph) % 1; const fromPill = i % 3 !== 0;
        const bt = boats[i % boats.length]; const bp = boatPos(bt, t).add(V(0, 1, 0));
        const a = fromPill ? SLIT.clone().sub(V(BX, 0, 0)).add(V((r() - 0.5) * 1.5, 0, 0)) : bp; const bb = fromPill ? bp.clone().add(V((r() - 0.5) * 6, -0.5 + r() * 2, (r() - 0.5) * 8)) : SLIT.clone().sub(V(BX, 0, 0)).add(V((r() - 0.5) * 14, r() * 3, (r() - 0.5) * 3));
        const on = fireOn > 0.5 && u < 0.55 && r() < 0.95;
        if (!on) { dummy.position.set(0, -999, 0); dummy.scale.setScalar(0.001); } else { const k = u / 0.55; dummy.position.copy(a).lerp(bb, k); dummy.quaternion.setFromUnitVectors(V(1, 0, 0), bb.clone().sub(a).normalize()); dummy.scale.set(1, 1, 1); }
        dummy.updateMatrix(); tracers.setMatrixAt(i, dummy.matrix); }
      tracers.instanceMatrix.needsUpdate = true; tracers.visible = night;
      const mz = fireOn * (Math.sin(t * 47) > 0.2 ? 1 : 0.15); muzzle.visible = night; muzzle.position.copy(SLIT).add(V(0, 0, -0.4)); muzzle.material.opacity = mz; muzzle.scale.setScalar(3 + 2 * mz); muzzleL.position.copy(SLIT).add(V(0, 0.5, -1.2)); muzzleL.intensity = night ? 40 * mz : 0;
      // Hudsons dive in from behind the camera, bomb, pull up
      hudsons.forEach((h, i) => { const t0 = T.planes + i * 0.55; const u = clamp((t - t0) / 4.6); const on = night && t > t0 && t < t0 + 4.6; h.visible = on; if (!on) return;
        const p0 = B(-150 + i * 10, 40 + i * 5, -10 - i * 12), p1 = B(-20 + i * 18, 22, -90 - i * 8), p2 = B(60 + i * 26, 30, -260); const q = u < 0.6 ? p0.clone().lerp(p1, u / 0.6) : p1.clone().lerp(p2, (u - 0.6) / 0.4);
        const qn = u < 0.6 ? p1.clone().sub(p0) : p2.clone().sub(p1); h.position.copy(q); h.quaternion.setFromUnitVectors(V(1, 0, 0), qn.normalize()); h.rotateX(0.3 * Math.sin(u * 3 + i)); });
      // bomb splashes + ship fire
      let flash = 0;
      splashes.forEach((s) => { const k = t - s.tb; const on = night && k > 0 && k < 2.6; s.m.visible = on; s.fl.visible = night && k > 0;
        const sp = s.ship.g.position.clone().add(s.off).add(V(BX, 0, 0)); s.m.position.copy(sp).sub(V(BX, 0, 0));
        if (on) { s.m.scale.set(1 + k * 0.5, S0(pop(s.tb, t, 0.35) * (1 - ss(1.2, 2.6, k))), 1 + k * 0.5); s.m.material.opacity = 0.85 * (1 - ss(0.8, 2.6, k)); }
        s.fl.position.copy(sp).add(V(0, 3, 0)); s.fl.material.opacity = k > 0 ? Math.exp(-k * 3) : 0; s.fl.scale.setScalar(26 * Math.exp(-k * 1.5) + 0.01); flash = Math.max(flash, k > 0 ? 0.08 * Math.exp(-k * 6) : 0); });
      const burn = night ? ss(T.bombs[1], T.bombs[1] + 0.6, t) : 0; const sh = ships[1]; sh.fire.visible = burn > 0; sh.fire.position.copy(sh.g.position).add(V(BX + 2, 6, 0)); sh.fire.scale.setScalar(13 * burn * (0.85 + 0.15 * Math.sin(t * 13))); sh.fire.material.opacity = burn; sh.fireL.position.copy(sh.fire.position); sh.fireL.intensity = 1500 * burn;
      finish.uniforms.flash.value = flash;
      // houses: one lamp; in daylight everything calm
      houses.forEach((hh) => (hh.visible = true));
      // embers drifting over the beach at night (periodic)
      for (let i = 0; i < NP; i++) { const r = mulberry32(i * 3 + 11); const base = camera.position.clone().add(V((r() - 0.5) * 30, (r() - 0.5) * 20, -6 - r() * 30)); const u = ((t / 12) + r()) % 1;
        dummy.position.copy(base).add(V(Math.sin(u * TAU + i) * 1.2, (u - 0.5) * 6, Math.cos(u * TAU * 2 + i) * 0.8)); dummy.scale.setScalar(night && t > T.fire ? (0.6 + r() * 1.4) * Math.sin(u * Math.PI) : 0.001); dummy.updateMatrix(); motes.setMatrixAt(i, dummy.matrix); }
      motes.instanceMatrix.needsUpdate = true; motes.visible = true;
    } else { finish.uniforms.flash.value = 0; hudsons.forEach((h) => (h.visible = false)); muzzle.visible = false; muzzleL.intensity = 0; ships.forEach((s) => { s.fire.visible = false; s.fireL.intensity = 0; }); splashes.forEach((s) => (s.fl.visible = false)); motes.visible = false; }

    // ================= GLOBE =================
    if (isGlobe) {
      globe.rotation.y = 0; const pk = pop(T.kbPin, t, 0.5), pp = pop(T.phPin, t, 0.5);
      kbPin.m.scale.set(1, S0(pk), 1); kbPin.h.material.opacity = ss(T.kbPin, T.kbPin + 0.3, t) * (0.75 + 0.25 * Math.sin(t * 6)); kbPin.ring.scale.setScalar(S0(1 + ((t * 0.8) % 1) * 2.5)); kbPin.ring.material.opacity = (1 - ((t * 0.8) % 1)) * ss(T.kbPin, T.kbPin + 0.3, t);
      phPin.m.scale.set(1, S0(pp), 1); phPin.h.material.opacity = ss(T.phPin, T.phPin + 0.3, t) * (0.75 + 0.25 * Math.sin(t * 6 + 1)); phPin.ring.scale.setScalar(S0(1 + ((t * 0.8 + 0.5) % 1) * 2.5)); phPin.ring.material.opacity = (1 - ((t * 0.8 + 0.5) % 1)) * ss(T.phPin, T.phPin + 0.3, t);
      const au = ss(T.arc, T.arc + 1.8, t); arc.geometry.setDrawRange(0, Math.floor(arcIdx * au / 6) * 6); arcHead.position.copy(arcPts[Math.round(au * 100)]); arcHead.material.opacity = au > 0 && au < 1 ? 1 : 0;
    }
    composer.render();
    const out = { t, loc: L, anchors: {} }; const A = out.anchors;
    A.kelantan = proj(MP(101.95, 5.25, 3.0)); A.kb = proj(P("kb", 3.4)); A.sg = proj(P("sg", 1.2)); A.kl = proj(P("kl", 1.2));
    A.ships = proj(ships[2].g.position.clone().add(V(BX, 10, 0))); A.pill = proj(B(-26, 2.6, 7)); A.hudson = proj(hudsons[1].position.clone()); A.boats = proj(boatPos(boats[6], t).add(V(BX, 1.5, 0)));
    A.kbG = proj(kbPin.tip); A.phG = proj(phPin.tip); A.pillDay = proj(B(-26, 2.6, 7));
    return out;
  }
  function debug(t) { const o = render(t); return { t, cam: camera.position.toArray().map((x) => +x.toFixed(2)), anchors: Object.fromEntries(Object.entries(o.anchors).map(([k, v]) => [k, v.map((x) => Math.round(x))])) }; }
  return { render, debug, T };
}
