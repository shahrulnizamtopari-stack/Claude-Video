// "Kenapa Bulan Ikut Kereta Kita?" — v3 look, night variant.
// Everything on screen is a pure function of canonical time t (0..60 s). Units: metres. The car drives along +x on the road (z = 0).
// The scenery repeats every 1800 m (= 60 s at 30 m/s), so the last frame matches the first and the film loops.
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "./lib/jsm/geometries/RoundedBoxGeometry.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const pop = (t0, t, d = 0.4) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S0 = (x) => Math.max(0.0001, x);

export const PAL = { sky: 0x0e1633, ground: 0x22344e, road: 0x2a303c, line: 0xe9eef8, tree: 0x2f6f60, treeHi: 0x3f8f7a, hill: 0x3a5078, car: 0xff7a3d, moon: 0xfff1c4, edge: 0xb9c7ff };
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0, ...o });

export function createWorld(canvas, W, H, scale = 1, opts = {}) {
  const FX = { bloom: opts.bloom ?? true, msaa: opts.msaa ?? (scale < 1 ? 0 : 4) };
  const realRandom = Math.random; Math.random = mulberry32(1234);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(PAL.sky); scene.fog = new THREE.Fog(PAL.sky, 250, 1400);
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 20000);
  scene.add(new THREE.HemisphereLight(0x8fa6e8, 0x1a2440, 2.2));
  const moonLight = new THREE.DirectionalLight(0xcfdcff, 2.2); scene.add(moonLight); scene.add(moonLight.target);
  const inkM = new THREE.LineBasicMaterial({ color: PAL.edge, transparent: true, opacity: 0.55 });
  const edges = (mesh, thr = 30) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, thr), inkM); mesh.add(l); return l; };
  const add = (parent, geo, m, pos, e = 30) => { const o = new THREE.Mesh(geo, m); if (pos) o.position.copy(pos); parent.add(o); if (e) edges(o, e); return o; };
  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.3, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, size, op = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false, fog: false })); s.scale.set(size, size, 1); return s; };

  const PERIOD = 1800;
  // car x: normal speed, but it crawls during the top-view diagram (17.4-29.8) so the two positions stay in frame.
  // The normal speed is scaled so the car covers exactly one scenery period in 60 s (seamless loop).
  const slow = (t) => ss(17.0, 17.6, t) * (1 - ss(29.6, 30.2, t));
  const XT = (() => { const dt = 1 / 240, n = Math.round(60 / dt); const raw = new Float64Array(n + 1); let x = 0, xs = 0;
    for (let i = 0; i < n; i++) { const t = i * dt; const sl = slow(t); x += (1 - sl) * dt; xs += sl * dt; raw[i + 1] = x; }
    const crawl = 1.6; const vn = (PERIOD - crawl * xs) / x; const out = new Float64Array(n + 1); let acc = 0;
    for (let i = 0; i < n; i++) { const t = i * dt; const sl = slow(t); acc += ((1 - sl) * vn + sl * crawl) * dt; out[i + 1] = acc; } return { out, dt }; })();
  const cx = (t) => { const f = clamp(t, 0, 60) / XT.dt; const i = Math.floor(f), u = f - i; return i >= XT.out.length - 1 ? XT.out[XT.out.length - 1] : XT.out[i] + (XT.out[i + 1] - XT.out[i]) * u; };
  // ground + road (long strips), dashed centre line
  add(scene, new THREE.PlaneGeometry(6000, 3000).rotateX(-Math.PI / 2), mat(PAL.ground, { roughness: 1 }), V(900, 0, -1200), 0);
  add(scene, new THREE.PlaneGeometry(6000, 9).rotateX(-Math.PI / 2), mat(PAL.road, { roughness: 0.9 }), V(900, 0.02, 0), 0);
  { const n = 1200; const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 0.03, 0.18), new THREE.MeshBasicMaterial({ color: PAL.line }), n); const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) { d.position.set(-1200 + i * 6, 0.04, 0); d.updateMatrix(); dash.setMatrixAt(i, d.matrix); } scene.add(dash); }
  // trees (near, z = -11): periodic every 15 m
  const tr = mulberry32(5);
  { const N = 320; const cone = new THREE.ConeGeometry(2.2, 6, 7); const trunk = new THREE.CylinderGeometry(0.25, 0.35, 2, 6);
    const tm = new THREE.InstancedMesh(cone, mat(PAL.treeHi, { flatShading: true }), N), km = new THREE.InstancedMesh(trunk, mat(0x3a2e2a), N); const d = new THREE.Object3D();
    const shapes = Array.from({ length: 4 }, () => [0.8 + tr() * 0.5, (tr() - 0.5) * 3]);
    for (let i = 0; i < N; i++) { const [s, dz] = shapes[i % 4]; const x = -1200 + i * 15;
      d.position.set(x, 2 + 3 * s * 0.8, -22 + dz); d.scale.setScalar(s * 0.8); d.updateMatrix(); tm.setMatrixAt(i, d.matrix);
      d.position.set(x, 1, -22 + dz); d.scale.setScalar(1); d.updateMatrix(); km.setMatrixAt(i, d.matrix); }
    scene.add(tm); scene.add(km); }
  // street lamps on the near side (z = +7), every 45 m
  { const N = 110; const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.12, 7, 6), mat(0x4a5266), N); const d = new THREE.Object3D();
    for (let i = 0; i < N; i++) { d.position.set(-1200 + i * 45, 3.5, 7); d.updateMatrix(); pole.setMatrixAt(i, d.matrix);
      const g = glow(0xffd38a, 5, 0.9); g.position.set(-1200 + i * 45, 7.1, 6.4); scene.add(g); }
    scene.add(pole); }
  // hills (far, z = -420): periodic every 200 m, low-poly
  { const hr = mulberry32(9); const shapes = Array.from({ length: 3 }, () => [40 + hr() * 30, 30 + hr() * 30]);
    const hm = mat(PAL.hill, { flatShading: true, roughness: 1 });
    for (let i = 0; i < 40; i++) { const [rad, h] = shapes[i % 3]; const g = new THREE.ConeGeometry(rad, h, 7, 2); const m = add(scene, g, hm, V(-2400 + i * 200 + (i % 3) * 40, h / 2 - 2, -420 - (i % 2) * 60), 25); m.rotation.y = i; } }
  // stars (fixed to the camera: infinitely far) + the moon (also fixed direction from the camera: no parallax)
  const stars = new THREE.Group(); scene.add(stars);
  { const N = 900; const p = new Float32Array(N * 3); const r = mulberry32(3);
    for (let i = 0; i < N; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2; const y = Math.abs(u) * 0.95 + 0.05; const rr = Math.sqrt(1 - y * y); p[i * 3] = Math.cos(a) * rr * 9000; p[i * 3 + 1] = y * 9000; p[i * 3 + 2] = Math.sin(a) * rr * 9000; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    stars.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }))); }
  const MOON_DIR = V(0.12, 0.3, -1).normalize(), MOON_D = 4000;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(52, 48, 32), new THREE.MeshBasicMaterial({ color: PAL.moon, fog: false, toneMapped: false })); scene.add(moon);
  { const r = mulberry32(17); for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.CircleGeometry(4 + r() * 7, 20), new THREE.MeshBasicMaterial({ color: 0xe6d9ae, fog: false, toneMapped: false }));
      const a = r() * Math.PI * 2, rr = r() * 38; c.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 51.5 - rr * 0.35); moon.add(c); } }
  const moonGlow = glow(0xfff0c0, 420, 0.5); scene.add(moonGlow);

  // car (low-poly), headlight beams
  const CAR = new THREE.Group(); scene.add(CAR);
  { add(CAR, new RoundedBoxGeometry(4.4, 1.0, 1.9, 3, 0.3), mat(PAL.car, { roughness: 0.45, metalness: 0.2 }), V(0, 0.85, 1.3), 30);
    add(CAR, new RoundedBoxGeometry(2.4, 0.8, 1.7, 3, 0.3), new THREE.MeshStandardMaterial({ color: 0x9cc4ff, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.65 }), V(-0.2, 1.65, 1.3), 30);
    for (const [x, z] of [[-1.4, 0.4], [1.4, 0.4], [-1.4, 2.2], [1.4, 2.2]]) { const w = add(CAR, new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16), mat(0x15171c), V(x, 0.38, z), 30); w.rotation.x = Math.PI / 2; }
    for (const z of [0.7, 1.9]) { const h = glow(0xfff4d6, 2.2, 1); h.position.set(2.25, 0.9, z); CAR.add(h); }
    const beam = new THREE.Mesh(new THREE.ConeGeometry(4, 22, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide })); beam.rotation.z = Math.PI / 2; beam.position.set(13, 0.8, 1.3); CAR.add(beam);
    const tl = glow(0xff3a2a, 1.4, 0.9); tl.position.set(-2.25, 0.95, 1.3); CAR.add(tl); }
  // window frame (only in the window view): a dark frame right in front of the camera
  const WIN = new THREE.Group(); scene.add(WIN);
  { const fm = new THREE.MeshBasicMaterial({ color: 0x0a0e1a }); const rim = new THREE.MeshBasicMaterial({ color: 0x3a4566 });
    const bar = (w, h, x, y) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fm); b.position.set(x, y, 0); WIN.add(b); };
    bar(3, 0.9, 0, -0.62); bar(3, 0.9, 0, 0.62); bar(0.9, 3, -0.55, 0); bar(0.9, 3, 0.55, 0);
    const edgeG = new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.2, 0.34)); const el = new THREE.LineSegments(edgeG, new THREE.LineBasicMaterial({ color: 0x8fa2d8 })); el.position.set(0, 0.0, 0.001); WIN.add(el); }

  // ---------- top-down diagram: sight lines ----------
  const LINES = new THREE.Group(); scene.add(LINES);
  const lineMat = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true, opacity: 0.95 });
  const mkLine = (c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1, 8), lineMat(c)); LINES.add(m); return m; };
  const placeLine = (m, a, b) => { const d = b.clone().sub(a); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(1, Math.max(0.01, d.length()), 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); };
  const treeL0 = mkLine(0x7ef0a8), treeL1 = mkLine(0x7ef0a8), moonL0 = mkLine(0xffd36b), moonL1 = mkLine(0xffd36b);
  const ghost = new THREE.Group(); LINES.add(ghost);
  add(ghost, new RoundedBoxGeometry(4.4, 1.0, 1.9, 3, 0.3), new THREE.MeshBasicMaterial({ color: PAL.car, transparent: true, opacity: 0.35 }), V(0, 0.85, 1.3), 30);
  const target = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.25, 8, 40), lineMat(0x7ef0a8)); target.rotation.x = Math.PI / 2; LINES.add(target);

  // ---------- space: stellar parallax (high above the road, follows the car in x) ----------
  const SPACE = new THREE.Group(); scene.add(SPACE);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(8, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffd36b, toneMapped: false, fog: false })); SPACE.add(sun);
  const sunGlow = glow(0xffb347, 60, 0.8); SPACE.add(sunGlow);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(45, 0.25, 6, 120), new THREE.MeshBasicMaterial({ color: 0x5f7ad8, fog: false })); orbit.rotation.x = Math.PI / 2; SPACE.add(orbit);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0x4f86ff, emissive: 0x1f4fbf, emissiveIntensity: 0.6, fog: false })); SPACE.add(earth);
  const earthGhost = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0x4f86ff, transparent: true, opacity: 0.35, fog: false })); SPACE.add(earthGhost);
  const NEAR = V(0, 0, -170);
  const nearStar = new THREE.Mesh(new THREE.SphereGeometry(3.5, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false })); nearStar.position.copy(NEAR); SPACE.add(nearStar);
  const nsGlow = glow(0xcfe0ff, 30, 0.9); nsGlow.position.copy(NEAR); SPACE.add(nsGlow);
  const pL0 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1, 8), lineMat(0x8fb0ff)), pL1 = pL0.clone(); pL1.material = lineMat(0x8fb0ff); SPACE.add(pL0); SPACE.add(pL1);
  const SPACE_Y = 2600, SPACE_Z = -60;

  // ---------- post ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  if (FX.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.55, 0.5, 0.8));
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- camera (car-relative keys) ----------
  const T = { win0: 6.4, diag0: 16.2, ghostT: 18.4, win1: 30.0, space0: 40.2, back: 48.2 };
  const HOOK = { pos: V(2, 2.6, 24), look: V(-1, 8.5, -30), fov: 40 };
  const WINV = { pos: V(-0.3, 1.45, 1.0), look: V(-0.3, 3.0, -10), fov: 40 };
  const SP = (x, y, z) => V(x, SPACE_Y + y, SPACE_Z + z);
  const keys = [
    { t: 0, ...HOOK },
    { t: 5.4, pos: V(1.6, 2.4, 20), look: V(-1, 8.5, -30), fov: 40 },
    { t: 7.2, ...WINV },
    { t: 15.6, ...WINV },
    { t: 17.6, pos: V(4, 58, 18), look: V(4, 0, -7), fov: 40 },
    { t: 29.4, pos: V(-4, 60, 18), look: V(-4, 0, -7), fov: 40 },
    { t: 31.0, ...WINV },
    { t: 39.6, ...WINV },
    { t: 41.4, pos: SP(30, 150, 150), look: SP(0, 0, -75), fov: 40 },
    { t: 47.6, pos: SP(36, 156, 158), look: SP(0, 0, -75), fov: 40 },
    { t: 49.6, pos: V(2.4, 2.8, 26), look: V(-1, 8.5, -30), fov: 40 },
    { t: 60, ...HOOK },
  ];
  const hc = (p0, p1, p2, p3, u) => { const seg = p2.distanceTo(p1);
    const m1 = p2.clone().sub(p0).multiplyScalar(0.5); if (m1.length() > seg) m1.setLength(seg);
    const m2 = p3.clone().sub(p1).multiplyScalar(0.5); if (m2.length() > seg) m2.setLength(seg);
    const u2 = u * u, u3 = u2 * u;
    return p1.clone().multiplyScalar(2 * u3 - 3 * u2 + 1).add(m1.multiplyScalar(u3 - 2 * u2 + u)).add(p2.clone().multiplyScalar(-2 * u3 + 3 * u2)).add(m2.multiplyScalar(u3 - u2)); };
  const camAt = (t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    let u = clamp((t - k1.t) / (k2.t - k1.t)); u = u * u * (3 - 2 * u) * 0.7 + u * 0.3;
    return { P: hc(k0.pos, k1.pos, k2.pos, k3.pos, u), L: hc(k0.look, k1.look, k2.look, k3.look, u), fov: lerp(k1.fov, k2.fov, u) }; };
  const proj = (v) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H, p.z < 1 ? 1 : 0]; };

  function render(t) {
    t = clamp(t, 0, 60);
    const x = cx(t) >= PERIOD - 1e-6 ? 0 : cx(t) % PERIOD; const carPos = V(x, 0, 0);
    CAR.position.copy(carPos); CAR.position.y = 0.03 * Math.sin(t * 9);
    // camera (car-relative)
    const cam = camAt(t); const off = V(x, 0, 0);
    camera.position.copy(cam.P).add(off); camera.lookAt(cam.L.clone().add(off)); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, -H * 0.04, W, H); camera.updateProjectionMatrix();
    // things with no parallax: stars + moon follow the camera
    stars.position.copy(camera.position);
    moon.position.copy(camera.position).add(MOON_DIR.clone().multiplyScalar(MOON_D)); moon.lookAt(camera.position); moonGlow.position.copy(moon.position);
    moonLight.position.copy(carPos).add(MOON_DIR.clone().multiplyScalar(100)); moonLight.target.position.copy(carPos);
    // window frame: glued in front of the camera in the window view
    const inWin = (t > 6.9 && t < 15.9) || (t > 30.7 && t < 39.9);
    WIN.visible = inWin; if (inWin) { WIN.position.copy(camera.position); WIN.quaternion.copy(camera.quaternion); WIN.translateZ(-0.62); }
    CAR.visible = !inWin;
    // diagram lines (top view): ghost car at 18.4 with its two sight lines; current car with its lines
    const dOn = t > 17.2 && t < 30.4; LINES.visible = dOn;
    if (dOn) { const g = cx(T.ghostT) % PERIOD; const tx = Math.round((g + 10 + 1200) / 15) * 15 - 1200; const tz = -22;
      const tp = V(tx, 0.5, tz);
      ghost.position.set(g, 0, 0); ghost.visible = t > 19.0;
      target.position.set(tx, 0.5, tz); target.scale.setScalar(S0(pop(18.0, t, 0.4)));
      const a0 = V(g, 0.6, 1.3), a1 = V(x, 0.6, 1.3);
      const grow = ss(18.3, 18.9, t), grow2 = ss(20.8, 21.4, t);
      placeLine(treeL0, a0, a0.clone().lerp(tp, grow)); treeL0.visible = t > 19.0;
      placeLine(treeL1, a1, a1.clone().lerp(tp, grow)); treeL1.visible = grow > 0.01;
      const md = V(0.12, 0, -1).normalize().multiplyScalar(60 * grow2);
      placeLine(moonL0, a0, a0.clone().add(md)); moonL0.visible = t > 19.0 && grow2 > 0.01;
      placeLine(moonL1, a1, a1.clone().add(md)); moonL1.visible = grow2 > 0.01; }
    // space scene
    const sOn = t > 40.0 && t < 49.0; SPACE.visible = sOn;
    SPACE.position.set(x, 0, 0);
    if (sOn) { const sc = SPACE.position.clone().add(V(0, SPACE_Y, SPACE_Z)); sun.position.set(0, SPACE_Y, SPACE_Z); sunGlow.position.copy(sun.position); orbit.position.copy(sun.position);
      nearStar.position.set(0, SPACE_Y, SPACE_Z - 170); nsGlow.position.copy(nearStar.position);
      const a = Math.PI * ss(41.6, 44.0, t);                  // half an orbit (6 months)
      const ep = V(-45 * Math.cos(a), SPACE_Y, SPACE_Z + 45 * Math.sin(a) * -1 * -1); earth.position.copy(ep);
      earthGhost.position.set(-45, SPACE_Y, SPACE_Z); earthGhost.visible = t > 41.8;
      placeLine(pL0, earthGhost.position, earthGhost.position.clone().lerp(nearStar.position, ss(42.0, 42.6, t)));
      placeLine(pL1, earth.position, earth.position.clone().lerp(nearStar.position, ss(44.0, 44.6, t))); pL1.visible = t > 44.0; }
    composer.render();
    const out = { t, anchors: {} }; const A = out.anchors;
    const tree = V(Math.floor((x + 6) / 15) * 15 + 15 - 1200 % 15, 7, -11);
    A["tree"] = proj(V(x - 1, 4.5, -21)); A["hill"] = proj(V(x + 10, 26, -420)); A["moon"] = proj(moon.position.clone().add(V(-40, -30, 0)));
    A["tangle"] = proj(V(cx(T.ghostT) % PERIOD + 6, 0.5, -10)); A["mlines"] = proj(V(cx(T.ghostT) % PERIOD + 1.0, 0.5, -8));
    A["earth0"] = proj(V(x - 45, SPACE_Y + 4, SPACE_Z)); A["earth1"] = proj(V(x + 45, SPACE_Y + 4, SPACE_Z)); A["star"] = proj(V(x + 4, SPACE_Y + 4, SPACE_Z - 170)); A["plx"] = proj(V(x, SPACE_Y, SPACE_Z - 120));
    A["car"] = proj(V(x, 2.2, 1.3));
    return out;
  }
  function debug(t) { const o = render(t); return { t, cam: camera.position.toArray().map((x) => +x.toFixed(1)), anchors: Object.fromEntries(Object.entries(o.anchors).map(([k, v]) => [k, v.map((x) => Math.round(x))])) }; }
  return { render, debug, T };
}
