// "Aircond Tak Buat Sejuk" — v3 studio / technical-cutaway look.
// Everything on screen is a pure function of canonical time t (0..60 s). Units: dm (10 cm). Ground at y = 0, front faces +z.
// Room (inside) is x < 0, the exterior wall is x 0..1.6, outside is x > 1.6.
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "./lib/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./lib/jsm/geometries/RoundedBoxGeometry.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S0 = (x) => Math.max(0.0001, x);
const P2 = (a) => a.map(([x, y]) => new THREE.Vector2(x, y));

export const PAL = {
  bg: 0xeef1f8, floor: 0xf4f6fa, ink: 0x15171c, shell: 0xf3f4f6, wall: 0xf1ede6, wallCut: 0xc9b9a6, wood: 0xe6d5bd,
  copper: 0xc9824a, steel: 0xaab0ba, dark: 0x3a3f4a, blue: 0x2f5bff, cold: 0x4f86ff, hot: 0xff4a1f, skin: 0xf0c9a0,
};
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0, ...o });

export function createWorld(canvas, W, H, scale = 1, opts = {}) {
  const FX = { bloom: opts.bloom ?? true, msaa: opts.msaa ?? (scale < 1 ? 0 : 4) };
  const realRandom = Math.random; Math.random = mulberry32(1234);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(PAL.bg); scene.fog = new THREE.Fog(PAL.bg, 160, 500);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 2000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3ec, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.0); key.castShadow = true;
  key.shadow.mapSize.set(scale < 1 ? 1024 : 2048, scale < 1 ? 1024 : 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03; key.shadow.radius = 6;
  const kc = key.shadow.camera; kc.left = -40; kc.right = 40; kc.top = 40; kc.bottom = -40; kc.near = 1; kc.far = 300;
  scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6); fill.position.set(-80, 40, 60); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 64), mat(PAL.floor, { roughness: 0.9 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.3, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, size, op = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false, fog: false })); s.scale.set(size, size, 1); return s; };
  const inkM = (clip) => new THREE.LineBasicMaterial({ color: PAL.ink, transparent: true, opacity: 1, clippingPlanes: clip || null });
  const edges = (mesh, thr = 28, clip) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, thr), inkM(clip)); mesh.add(l); return l; };
  const add = (parent, geo, m, pos, e = 30, clip) => { const o = new THREE.Mesh(geo, m); if (pos) o.position.copy(pos); o.castShadow = true; o.receiveShadow = true; parent.add(o); if (e) edges(o, e, clip); return o; };

  // ---------- house cut-away: room + exterior wall ----------
  const clipPlane = new THREE.Plane(V(0, -1, 0), 99); const clip = [clipPlane];
  add(scene, new THREE.BoxGeometry(22, 0.6, 18), mat(PAL.wood, { roughness: 0.7 }), V(-11, 0.3, -1), 30);           // room floor
  add(scene, new THREE.BoxGeometry(22, 27, 0.6), mat(PAL.wall, { roughness: 0.85 }), V(-11, 13.5, -10.3), 30);      // back wall
  add(scene, new THREE.BoxGeometry(0.6, 27, 18), mat(PAL.wall, { roughness: 0.85 }), V(-22.3, 13.5, -1), 30);       // left wall
  add(scene, new THREE.BoxGeometry(1.6, 29, 18), mat(PAL.wallCut, { roughness: 0.9 }), V(0.8, 14.5, -1), 30);      // exterior wall (cut)
  add(scene, new THREE.BoxGeometry(22, 0.25, 0.3), mat(0xd9cbb8), V(-11, 0.7, -9.9), 0);                            // skirting
  // sofa + a person inside (cool), a neighbour outside (hot)
  { const sofaM = mat(0x8fa4c8, { roughness: 0.8 });
    add(scene, new RoundedBoxGeometry(9, 2.2, 4, 3, 0.5), sofaM, V(-12, 1.7, -6.5), 40); add(scene, new RoundedBoxGeometry(9, 4.2, 1.2, 3, 0.4), sofaM, V(-12, 3.8, -8.4), 40);
    for (const sx of [-1, 1]) add(scene, new RoundedBoxGeometry(1.2, 3, 4, 3, 0.4), sofaM, V(-12 + sx * 4.9, 2.6, -6.5), 40); }
  function person(color) { const g = new THREE.Group(); const body = add(g, new THREE.CapsuleGeometry(1.0, 3.0, 6, 16), mat(color, { roughness: 0.6 }), V(0, 3.6, 0), 50);
    const head = add(g, new THREE.SphereGeometry(0.95, 24, 16), mat(PAL.skin, { roughness: 0.6 }), V(0, 6.6, 0), 50);
    for (const sx of [-1, 1]) add(g, new THREE.CapsuleGeometry(0.42, 2.2, 4, 10), mat(0x3b4150), V(sx * 0.5, 1.3, 0), 50);
    scene.add(g); return { g, head, body }; }
  const inside = person(0x6f9bff); inside.g.position.set(-12, 0.6, -5.6); inside.g.scale.setScalar(0.85);
  const outside = person(0xff8a5c); outside.g.position.set(13.5, 0, -1.5); outside.g.rotation.y = -0.5;
  const sunGlow = glow(0xffb070, 60, 0.35); sunGlow.position.set(30, 34, -30); scene.add(sunGlow);

  // ---------- indoor unit (wall split) ----------
  const IN = new THREE.Group(); IN.position.set(-10, 21.5, -8.6); scene.add(IN);
  const coverM = mat(PAL.shell, { roughness: 0.4, side: THREE.DoubleSide, clippingPlanes: clip });
  add(IN, new RoundedBoxGeometry(9.2, 3.1, 2.5, 3, 0.6), coverM, V(0, 0, 0), 30, clip);
  add(IN, new THREE.BoxGeometry(9.0, 2.9, 0.2), mat(0xd8dde5), V(0, 0, -1.15), 30);                              // back plate (kept)
  const evapM = mat(0x8fb4ff, { roughness: 0.35, metalness: 0.4, emissive: 0x2f5bff, emissiveIntensity: 0.0 });
  const evap = new THREE.Group(); evap.position.set(0, 0.35, 0.25); evap.rotation.x = -0.45; IN.add(evap);
  for (let i = 0; i < 34; i++) add(evap, new THREE.BoxGeometry(0.05, 1.9, 0.7), evapM, V(-4.1 + i * 0.25, 0, 0), 0);
  add(evap, new THREE.BoxGeometry(8.4, 1.9, 0.7), new THREE.MeshStandardMaterial({ color: 0x9fc0ff, transparent: true, opacity: 0.25, depthWrite: false }), V(0, 0, 0), 30);
  const inFan = add(IN, new THREE.CylinderGeometry(0.55, 0.55, 8.0, 18), mat(0x9aa2b0, { roughness: 0.5 }), V(0, -0.7, -0.2), 0); inFan.rotation.z = Math.PI / 2;
  const tray = add(IN, new THREE.BoxGeometry(8.6, 0.25, 1.0), mat(0xc9d0da), V(0, -0.65, 0.65), 30);
  // ---------- outdoor unit on a bracket ----------
  const OUT = new THREE.Group(); OUT.position.set(7.4, 9, -6); scene.add(OUT);
  add(OUT, new RoundedBoxGeometry(8.2, 6.8, 3.4, 3, 0.4), mat(0xeceef2, { roughness: 0.45, side: THREE.DoubleSide, clippingPlanes: clip }), V(0, 0, 0), 30, clip);
  add(OUT, new THREE.BoxGeometry(8.0, 6.6, 0.2), mat(0xc4cad4), V(0, 0, -1.6), 30);                              // back panel (kept)
  add(OUT, new THREE.BoxGeometry(8.0, 0.25, 3.2), mat(0xc4cad4), V(0, -3.3, 0), 30);                              // base (kept)
  for (const x of [-3, 3]) { add(scene, new THREE.BoxGeometry(0.4, 0.4, 4.6), mat(PAL.dark), V(7.4 + x, 5.4, -7.4), 30); add(scene, new THREE.BoxGeometry(0.4, 3.2, 0.4), mat(PAL.dark), V(7.4 + x, 7.0, -9.5), 30); }
  // compressor (cut capsule) with a piston inside
  const COMP = new THREE.Group(); COMP.position.set(-2.3, -1.4, 0.1); OUT.add(COMP);
  { const prof = [[0.01, -1.6], [0.8, -1.55], [1.15, -1.2], [1.2, 0], [1.15, 1.2], [0.8, 1.55], [0.01, 1.6]];
    const shell = new THREE.Mesh(new THREE.LatheGeometry(P2(prof), 36, Math.PI / 2, Math.PI), mat(0x3d4350, { roughness: 0.45, metalness: 0.4, side: THREE.DoubleSide })); COMP.add(shell); edges(shell, 30);
    const cyl = add(COMP, new THREE.CylinderGeometry(0.62, 0.62, 1.8, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x9aa2b0, metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.45 }), V(0, 0.3, 0), 30); }
  const piston = add(COMP, new THREE.CylinderGeometry(0.58, 0.58, 0.5, 24), mat(0xc9ced6, { metalness: 0.7, roughness: 0.25 }), V(0, 0, 0), 30);
  const gasPocket = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1, 24), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.6, toneMapped: false })); COMP.add(gasPocket);
  // condenser coil along the back + fan in front
  const condM = mat(0xe0a070, { roughness: 0.35, metalness: 0.4, emissive: 0xff4a1f, emissiveIntensity: 0 });
  for (let i = 0; i < 30; i++) add(OUT, new THREE.BoxGeometry(0.05, 6.0, 0.6), condM, V(-3.7 + i * 0.255, 0.1, -1.1), 0);
  const fanG = new THREE.Group(); fanG.position.set(1.6, 0.3, 0.9); OUT.add(fanG);
  for (let i = 0; i < 3; i++) { const b = add(fanG, new THREE.BoxGeometry(0.9, 2.3, 0.1), mat(0x6c7383, { roughness: 0.4 }), V(0, 1.15, 0), 40); const p = new THREE.Group(); p.rotation.z = (i / 3) * Math.PI * 2; p.add(b); fanG.add(p); }
  add(fanG, new THREE.CylinderGeometry(0.45, 0.45, 0.5, 20), mat(PAL.dark), V(0, 0, 0), 0).rotation.x = Math.PI / 2;
  const fanRing = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.12, 8, 48), mat(0x9aa2b0)); fanRing.position.copy(fanG.position); OUT.add(fanRing);

  // ---------- refrigerant loop (polyline path) ----------
  const LP = [
    [-14.2, 21.0, -7.9], [-13.5, 22.2, -8.0], [-12.0, 21.0, -7.9], [-10.5, 22.2, -8.0], [-9.0, 21.0, -7.9], [-7.5, 22.2, -8.0], [-6.0, 21.2, -7.9],  // evaporator (0..)
    [-5.0, 21.4, -9.4], [0.0, 21.4, -9.4], [2.4, 21.4, -9.4], [2.4, 13.4, -9.4], [4.4, 11.6, -7.0], [5.1, 8.6, -6.0],                            // suction line
    [5.1, 7.6, -5.9], [5.1, 6.6, -5.9],                                                                                                       // through the compressor
    [5.1, 9.4, -6.3], [3.9, 12.0, -7.1], [5.6, 6.6, -7.1], [7.3, 12.0, -7.1], [9.0, 6.6, -7.1], [10.8, 12.0, -7.1], [10.8, 6.2, -7.0],             // discharge + condenser
    [6.0, 6.0, -5.2], [3.6, 6.0, -5.2], [2.6, 6.0, -5.2],                                                                                      // liquid line -> valve
    [2.2, 6.4, -9.0], [2.2, 20.6, -9.0], [0.0, 20.6, -9.0], [-14.6, 20.6, -9.0], [-14.2, 21.0, -7.9],                                         // back to the evaporator
  ].map(([x, y, z]) => V(x, y, z));
  const loop = new THREE.CurvePath(); for (let i = 0; i < LP.length - 1; i++) loop.add(new THREE.LineCurve3(LP[i], LP[i + 1]));
  const lens = loop.getCurveLengths(); const TOT = lens[lens.length - 1]; const uAt = (i) => (i === 0 ? 0 : lens[i - 1] / TOT);
  const U = { evap1: uAt(6), compIn: uAt(13), compOut: uAt(15), condEnd: uAt(21), valve: uAt(24) };
  add(scene, new THREE.TubeGeometry(loop, 400, 0.16, 8, false), mat(PAL.copper, { metalness: 0.65, roughness: 0.3 }), null, 0);
  const valve = add(scene, new THREE.CylinderGeometry(0.42, 0.42, 1.0, 20), mat(0xb08a3a, { metalness: 0.7, roughness: 0.3 }), V(3.1, 6.0, -5.2), 30); valve.rotation.z = Math.PI / 2;
  // drain pipe (condensate) from the indoor tray, through the wall, down the outside
  const drain = new THREE.CurvePath(); const DP = [V(-5.6, 20.6, -8.0), V(-5.0, 20.2, -9.7), V(2.0, 20.2, -9.7), V(2.3, 16.0, -9.6)];
  for (let i = 0; i < DP.length - 1; i++) drain.add(new THREE.LineCurve3(DP[i], DP[i + 1]));
  add(scene, new THREE.TubeGeometry(drain, 80, 0.14, 8, false), mat(0xe8ecf2, { roughness: 0.5 }), null, 0);
  // gas temperature along the loop (°C) -> colour
  const gasT = (u) => { if (u < U.evap1) return 5; if (u < U.compIn) return 9; if (u < U.compOut) return lerp(9, 70, (u - U.compIn) / (U.compOut - U.compIn)); if (u < U.condEnd) return lerp(70, 42, (u - U.compOut) / (U.condEnd - U.compOut)); if (u < U.valve) return 40; return lerp(40, 5, clamp((u - U.valve) / 0.015)); };
  const tCol = (T, c) => { const u = clamp((T - 5) / 65); return c.setRGB(lerp(0.25, 1.0, u), lerp(0.5, 0.33, u) + 0.25 * Math.sin(Math.PI * u) * 0.6, lerp(1.0, 0.15, u)); };
  const ND = 150;
  const gas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), ND);
  gas.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ND * 3), 3); gas.frustumCulled = false; scene.add(gas);
  // air particles (room intake/outflow, outdoor hot blast), drips
  const NA = 420;
  const air = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9 }), NA);
  air.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NA * 3), 3); air.frustumCulled = false; scene.add(air);
  const sweepRing = new THREE.Group(); scene.add(sweepRing);
  for (const [x, w] of [[-10, 9.6], [7.4, 8.6]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 3.6), new THREE.MeshBasicMaterial({ color: 0x8fb0ff, toneMapped: false, transparent: true, opacity: 0.9, wireframe: true })); r.userData.x = x; sweepRing.add(r); }

  // ---------- post ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  if (FX.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.3, 0.35, 1.6));
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- story (canonical time) ----------
  const T = { cutA: 8.6, cutB: 10.2, drips: 35.6 };
  const dummy = new THREE.Object3D(); const col = new THREE.Color();
  const hide = (im, i) => { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); };
  // the gas HUD reading by scene
  const gasHud = (t) => (t < 19 ? 5 : t < 28 ? lerp(9, 70, ss(20.4, 24.0, t)) : t < 34 ? lerp(40, 5, ss(30.0, 30.8, t)) : 5);

  // ---------- camera ----------
  const K0 = { pos: V(-2, 22, 96), look: V(-3, 13, -3), fov: 40 };
  const keys = [
    { t: 0, ...K0 },
    { t: 5.4, pos: V(-1, 21, 90), look: V(-2, 13, -3), fov: 40 },
    { t: 7.6, pos: V(13, 13, 40), look: V(9, 8.5, -4), fov: 40 },
    { t: 9.0, pos: V(-2, 22, 92), look: V(-3, 13, -3), fov: 40 },
    { t: 12.8, pos: V(-6.5, 22.6, 16), look: V(-10, 21.2, -8.4), fov: 40 },
    { t: 18.6, pos: V(-12.5, 22.2, 15), look: V(-10, 21.2, -8.4), fov: 40 },
    { t: 20.2, pos: V(12, 11.5, 16), look: V(7, 8.6, -6), fov: 40 },
    { t: 27.6, pos: V(4, 10.5, 17), look: V(7, 8.6, -6), fov: 40 },
    { t: 29.6, pos: V(6.2, 8.4, 4.2), look: V(3.0, 6.1, -5.2), fov: 40 },
    { t: 31.6, pos: V(5.4, 8.0, 3.4), look: V(3.0, 6.1, -5.2), fov: 40 },
    { t: 33.8, pos: V(-2, 19, 72), look: V(-3, 13, -5), fov: 40 },
    { t: 35.8, pos: V(-8, 18.6, 11), look: V(-9, 20.6, -8.4), fov: 40 },
    { t: 40.6, pos: V(-10.5, 18.8, 11.5), look: V(-9, 20.6, -8.4), fov: 40 },
    { t: 42.4, pos: V(-5, 17, 58), look: V(-7, 14, -6), fov: 40 },
    { t: 51.6, pos: V(-4, 18, 64), look: V(-5, 14, -5), fov: 40 },
    { t: 53.6, pos: V(-2, 22, 94), look: V(-3, 13, -3), fov: 40 },
    { t: 56.4, pos: V(10, 13, 46), look: V(8, 8, -3), fov: 40 },
    { t: 58.2, pos: V(9, 13.5, 44), look: V(8, 8, -3), fov: 40 },
    { t: 60, ...K0 },
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
    // cut-away covers (both units), restored for the final wide shots
    const cut = t >= T.cutA && t < 52.8;
    const h = cut ? lerp(26, 4, ss(T.cutA, T.cutB, t)) : 99; clipPlane.constant = h;
    sweepRing.children.forEach((r, i) => { r.position.set(r.userData.x, h, i === 0 ? -8.6 : -6); r.material.opacity = cut && t < T.cutB + 0.1 && (i === 0 ? h < 23.2 && h > 19.8 : h < 12.6 && h > 5.4) ? 0.9 : 0; });
    // moving parts
    inFan.rotation.x = t * 14; fanG.rotation.z = -t * 12;
    const pz = Math.sin(t * Math.PI * 2 * 1.4); piston.position.y = 0.3 - 0.55 + 0.55 * (pz * 0.5 + 0.5) * 2 - 0.55;
    const top = 1.2, py = piston.position.y + 0.25; gasPocket.scale.set(1, S0(top - py), 1); gasPocket.position.y = (top + py) / 2;
    gasPocket.material.color.setRGB(1, lerp(0.75, 0.35, pz * 0.5 + 0.5), lerp(0.6, 0.15, pz * 0.5 + 0.5));
    evapM.emissiveIntensity = 0.6 * ss(12.0, 13.0, t) * (t < 19 || (t > 34 && t < 41) ? 1 : 0.3);
    condM.emissiveIntensity = 0.9 * ss(22.6, 24.2, t) * (t < 28 ? 1 : 0.4);
    // gas dots along the loop (always running); bigger + brighter in the scene that talks about them
    for (let i = 0; i < ND; i++) { const u = (i / ND + t * 0.045) % 1; dummy.position.copy(loop.getPointAt(u));
      const inComp = u > U.compIn && u < U.compOut; dummy.scale.setScalar(inComp ? 0.0001 : 1); dummy.updateMatrix(); gas.setMatrixAt(i, dummy.matrix);
      tCol(gasT(u), col); gas.setColorAt(i, col); }
    gas.instanceMatrix.needsUpdate = true; gas.instanceColor.needsUpdate = true;
    // air: room air pulled into the indoor unit (warm), blown out cold; outdoor unit blows hot air at the neighbour; drips
    let q = 0; const r2 = mulberry32(3);
    for (let i = 0; i < 90; i++) { const ph = r2(); const u = (t * 0.32 + ph) % 1; const x = -14 + r2() * 8;
      dummy.position.set(x, lerp(26.5, 23.4, u), lerp(-3.0, -8.0, u) + (r2() - 0.5) * 0.6); dummy.scale.setScalar(S0(Math.sin(Math.PI * u))); dummy.updateMatrix(); air.setMatrixAt(q, dummy.matrix); col.setHex(0xff7a4a).multiplyScalar(1.3); air.setColorAt(q++, col); }
    for (let i = 0; i < 90; i++) { const ph = r2(); const u = (t * 0.3 + ph) % 1; const x = -14 + r2() * 8;
      dummy.position.set(x + (r2() - 0.5) * u * 2, 20.2 - u * 8 - u * u * 2, -7.2 + u * 6); dummy.scale.setScalar(S0(Math.sin(Math.PI * u))); dummy.updateMatrix(); air.setMatrixAt(q, dummy.matrix); col.setHex(0x6fa0ff).multiplyScalar(1.4); air.setColorAt(q++, col); }
    for (let i = 0; i < 150; i++) { const ph = r2(); const u = (t * 0.4 + ph) % 1; const a = r2() * Math.PI * 2, rr = r2() * 2.2;
      const p = V(7.4 + 1.6 + Math.cos(a) * rr, 9.3 + Math.sin(a) * rr, -5.0 + u * 4); p.x += u * 7; p.y -= u * 1.5;
      dummy.position.copy(p); dummy.scale.setScalar(S0(Math.sin(Math.PI * u) * 1.2)); dummy.updateMatrix(); air.setMatrixAt(q, dummy.matrix); col.setHex(0xff4a1f).multiplyScalar(1.6); air.setColorAt(q++, col); }
    // condensate: drops form on the cold coil, fall into the tray; and drip out of the drain outside
    const dr = ss(T.drips - 0.4, T.drips + 0.6, t) * (t < 41.5 ? 1 : 0.25);
    for (let i = 0; i < 40; i++) { const ph = r2(); const u = (t * 0.25 + ph) % 1; const x = -14 + r2() * 8;
      const grow = clamp(u / 0.7), fall = clamp((u - 0.7) / 0.3);
      dummy.position.set(x, 20.9 - fall * 0.7, -8.0 + 0.6 + r2() * 0.3); dummy.scale.set(S0(dr * (0.4 + 0.6 * grow)), S0(dr * (0.5 + 0.9 * grow) * (1 + fall)), S0(dr * (0.4 + 0.6 * grow)));
      dummy.updateMatrix(); air.setMatrixAt(q, dummy.matrix); col.setHex(0x9cc4ff).multiplyScalar(1.2); air.setColorAt(q++, col); }
    for (let i = 0; i < 6; i++) { const u = (t * 0.7 + i / 6) % 1; dummy.position.set(2.3, 15.8 - u * u * 15, -9.6); dummy.scale.setScalar(S0(dr * 1.2)); dummy.updateMatrix(); air.setMatrixAt(q, dummy.matrix); col.setHex(0x9cc4ff).multiplyScalar(1.2); air.setColorAt(q++, col); }
    for (; q < NA; q++) hide(air, q);
    air.instanceMatrix.needsUpdate = true; air.instanceColor.needsUpdate = true;
    // neighbour: fanning himself, sweat
    outside.head.rotation.z = 0.15 * Math.sin(t * 3);
    outside.g.position.y = 0.08 * Math.abs(Math.sin(t * 2.2));
    // camera
    const cam = camAt(t); camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, -H * 0.07, W, H); camera.updateProjectionMatrix();
    const focus = cam.L.clone(); key.position.set(focus.x + 30, focus.y + 60, focus.z + 50); key.target.position.copy(focus);
    composer.render();
    const out = { t, anchors: {} };
    const A = out.anchors;
    A["in.unit"] = proj(V(-5.4, 22.6, -7.4)); A["out.unit"] = proj(V(11.5, 11.8, -4.4));
    A["room.top"] = proj(V(-11, 27, -1)); A["out.top"] = proj(V(9, 17, -4));
    A["pipe"] = proj(V(2.4, 17.5, -9.4)); A["evap"] = proj(V(-6.4, 21.6, -7.6)); A["intake"] = proj(V(-12, 23.6, -6.5));
    A["comp"] = proj(V(5.1, 6.6, -4.8)); A["fan"] = proj(V(10.2, 11.2, -4.9)); A["valve"] = proj(V(3.1, 6.45, -5.2));
    A["drips"] = proj(V(-7.0, 20.5, -7.3)); A["drain"] = proj(V(2.3, 14.6, -9.6));
    A["kau"] = proj(V(-12, 6.6, -5.6)); A["jiran"] = proj(V(13.5, 7.9, -1.5));
    out.gas = gasHud(t);
    return out;
  }
  function debug(t) { const o = render(t); return { t, cam: camera.position.toArray().map((x) => +x.toFixed(1)), anchors: Object.fromEntries(Object.entries(o.anchors).map(([k, v]) => [k, v.map((x) => Math.round(x))])) }; }
  return { render, debug, T };
}
