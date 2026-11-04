// "Periuk Yang Langgar Had 100°C" — v3 studio / technical-cutaway look.
// Everything on screen is a pure function of canonical time t (0..60 s). Units: cm. Stove top at y = 3, front faces +z.
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

export const PAL = { bg: 0xeef1f8, floor: 0xf4f6fa, ink: 0x15171c, steel: 0xc3c9d2, steelCut: 0x8e96a3, dark: 0x2b2f38, water: 0x6fa8ff, meat: 0x8a4a2a, blue: 0x2f5bff, gasket: 0x3d63d8, snow: 0xc6d3e8, rock: 0x5f6672 };
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
  const scene = new THREE.Scene(); scene.background = new THREE.Color(PAL.bg); scene.fog = new THREE.Fog(PAL.bg, 500, 1500);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6;
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 2000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3ec, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.0); key.castShadow = true;
  key.shadow.mapSize.set(scale < 1 ? 1024 : 2048, scale < 1 ? 1024 : 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.05; key.shadow.radius = 6;
  const kc = key.shadow.camera; kc.left = -50; kc.right = 50; kc.top = 50; kc.bottom = -50; kc.near = 1; kc.far = 400;
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
  const SEG = 72;
  function halfLathe(profile, material, capMaterial, front = false, clip) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.LatheGeometry(P2(profile), SEG / 2, front ? -Math.PI / 2 : Math.PI / 2, Math.PI), material); m.castShadow = true; m.receiveShadow = true; g.add(m); edges(m, 28, clip);
    if (!front && capMaterial) for (const sx of [1, -1]) { const cg = new THREE.ShapeGeometry(new THREE.Shape(P2(profile)), 24); cg.scale(sx, 1, 1);
      const c = new THREE.Mesh(cg, capMaterial); c.position.z = 0.003; g.add(c); edges(c, 1); }
    return g;
  }
  const clipPlane = new THREE.Plane(V(0, -1, 0), 99); const clip = [clipPlane];

  // ---------- stove ----------
  add(scene, new RoundedBoxGeometry(46, 3, 34, 3, 0.8), mat(0x2d323c, { roughness: 0.35, metalness: 0.2 }), V(0, 1.5, 0), 30);
  add(scene, new THREE.TorusGeometry(6.5, 0.6, 10, 48), mat(0x555b66, { metalness: 0.5 }), V(0, 3.2, 0), 0).rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; add(scene, new THREE.BoxGeometry(5, 0.8, 1), mat(0x1d2028), V(Math.cos(a) * 8.5, 3.4, Math.sin(a) * 8.5), 30).rotation.y = -a; }
  const NF = 28;
  const flames = new THREE.InstancedMesh(new THREE.ConeGeometry(0.55, 2.2, 10), new THREE.MeshBasicMaterial({ color: 0x5f8cff, toneMapped: false, transparent: true, opacity: 0.85 }), NF); flames.frustumCulled = false; scene.add(flames);
  const flameGlow = glow(0x6f9bff, 26, 0.35); flameGlow.position.set(0, 4, 0); scene.add(flameGlow);
  add(scene, new RoundedBoxGeometry(5, 2.2, 2.4, 2, 0.5), mat(0x3b4150), V(15, 1.6, 17.6), 30); // knob

  // ---------- pressure cooker (back halves + caps, front halves clipped by the sweep) ----------
  const PC = new THREE.Group(); PC.position.y = 3.4; scene.add(PC);
  const BODY = [[0.01, 0], [11.4, 0], [12.0, 0.6], [12.0, 15.2], [12.8, 15.6], [12.8, 16.0], [11.6, 16.0], [11.6, 0.6], [11.2, 0.35], [0.01, 0.35], [0.01, 0]];
  const steelM = mat(PAL.steel, { metalness: 0.75, roughness: 0.3 }), steelFront = mat(PAL.steel, { metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide, clippingPlanes: clip });
  const cutM = mat(PAL.steelCut, { metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide });
  PC.add(halfLathe(BODY, steelM, cutM)); PC.add(halfLathe(BODY, steelFront, null, true, clip));
  // handles (body + lid), along +x and -x
  add(PC, new RoundedBoxGeometry(14, 2.0, 3.0, 3, 0.8), mat(PAL.dark, { roughness: 0.5 }), V(19.5, 14.6, 0), 30);
  add(PC, new RoundedBoxGeometry(6, 1.8, 2.6, 3, 0.7), mat(PAL.dark, { roughness: 0.5 }), V(-15.0, 14.6, 0), 30);
  // lid group (opens in the warning scene)
  const LID = new THREE.Group(); LID.position.y = 16.0; PC.add(LID);
  const LIDP = [[0.01, 3.2], [5, 3.0], [10, 1.8], [12.6, 0.4], [12.9, 0.0], [12.9, -0.8], [12.3, -0.8], [12.3, 0.0], [10, 1.2], [5, 2.4], [0.01, 2.6]];
  LID.add(halfLathe(LIDP, steelM, cutM)); LID.add(halfLathe(LIDP, steelFront, null, true, clip));
  const gasketM = mat(0x2a2e36, { roughness: 0.7, emissive: PAL.gasket, emissiveIntensity: 0 });
  const gasket = new THREE.Mesh(new THREE.TorusGeometry(12.05, 0.45, 10, 72), gasketM); gasket.rotation.x = Math.PI / 2; gasket.position.y = -0.35; LID.add(gasket);
  add(LID, new RoundedBoxGeometry(15, 1.8, 2.6, 3, 0.7), mat(PAL.dark, { roughness: 0.5 }), V(19.8, 1.4, 0), 30);
  add(LID, new THREE.CylinderGeometry(0.55, 0.7, 1.6, 20), mat(PAL.steel, { metalness: 0.8, roughness: 0.25 }), V(0, 3.9, 0), 30);     // vent pipe
  const WEIGHT = new THREE.Group(); WEIGHT.position.y = 4.6; LID.add(WEIGHT);
  add(WEIGHT, new THREE.CylinderGeometry(1.3, 1.5, 2.0, 24), mat(0x3b4150, { roughness: 0.4, metalness: 0.3 }), V(0, 1.0, 0), 30);
  add(WEIGHT, new THREE.SphereGeometry(0.7, 16, 10), mat(0x3b4150, { roughness: 0.4, metalness: 0.3 }), V(0, 2.2, 0), 0);
  add(LID, new THREE.CylinderGeometry(0.6, 0.6, 0.6, 16), mat(0xd94a3a), V(-5.5, 2.95, -2), 30);   // safety plug
  // contents: water (back half + cut face), meat chunks, steam molecules, bubbles
  const waterM = new THREE.MeshStandardMaterial({ color: PAL.water, transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(11.55, 11.55, 1, SEG / 2, 1, false, Math.PI / 2, Math.PI), waterM); PC.add(water);
  const waterFace = new THREE.Mesh(new THREE.PlaneGeometry(23.1, 1), new THREE.MeshStandardMaterial({ color: PAL.water, transparent: true, opacity: 0.55, roughness: 0.2, depthWrite: false })); waterFace.position.z = 0.02; PC.add(waterFace);
  const WATER_TOP = 7.6;
  water.scale.y = WATER_TOP - 0.4; water.position.y = 0.4 + (WATER_TOP - 0.4) / 2; waterFace.scale.y = WATER_TOP - 0.4; waterFace.position.y = water.position.y;
  { const r = mulberry32(8); for (let i = 0; i < 7; i++) { const a = Math.PI + 0.3 + r() * (Math.PI - 0.6), rr = 2 + r() * 7;
      const m = add(PC, new RoundedBoxGeometry(3 + r() * 1.5, 2.2 + r(), 2.6 + r(), 2, 0.6), mat(PAL.meat, { roughness: 0.6 }), V(Math.cos(a) * rr, 1.8 + r() * 3.5, Math.sin(a) * rr * 0.7 - 0.8), 40); m.rotation.set(r(), r() * 3, r()); } }
  const NS = 70;
  const steam = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 12, 8), mat(0xffffff, { roughness: 0.3, emissive: 0xdfe8ff, emissiveIntensity: 0.4 }), NS); steam.frustumCulled = false; PC.add(steam);
  const NB = 160;
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe6f0ff, transparent: true, opacity: 0.85, roughness: 0.1 }), NB); bubbles.frustumCulled = false; PC.add(bubbles);
  const NJ = 260;
  const jet = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }), NJ); jet.frustumCulled = false; scene.add(jet);
  const sweepRing = new THREE.Mesh(new THREE.TorusGeometry(12.9, 0.16, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ color: 0x8fb0ff, toneMapped: false, transparent: true, opacity: 0 }));
  sweepRing.rotation.x = Math.PI / 2; sweepRing.rotation.z = Math.PI; scene.add(sweepRing);

  // ---------- Everest (far left) ----------
  const EV = new THREE.Group(); EV.position.set(-170, 0, -20); scene.add(EV);
  { const g = new THREE.ConeGeometry(95, 66, 9, 6); const p = g.attributes.position; const r = mulberry32(13);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 32.9 && y > -32.9) { p.setX(i, p.getX(i) * (0.85 + 0.3 * r())); p.setZ(i, p.getZ(i) * (0.85 + 0.3 * r())); p.setY(i, y + (r() - 0.5) * 4); } }
    g.computeVertexNormals(); const m = add(EV, g, mat(PAL.rock, { flatShading: true, roughness: 0.9 }), V(0, 33, 0), 25);
    const sg = new THREE.ConeGeometry(36, 25, 9, 2); const sm = add(EV, sg, mat(PAL.snow, { flatShading: true, roughness: 0.8 }), V(0, 54.2, 0), 25); sm.rotation.y = 0.2;
    const cm = mat(0xffffff, { roughness: 1, emissive: 0xeef2ff, emissiveIntensity: 0.4, flatShading: true });
    for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), cm); const a = (i / 9) * Math.PI * 2; c.scale.set(14 + r() * 8, 3.5, 9); c.position.set(Math.cos(a) * 110, 6 + r() * 6, Math.sin(a) * 80 + 10); EV.add(c); } }
  const SUM = V(-170, 67.2, -20);
  const evPot = new THREE.Group(); evPot.position.copy(SUM); scene.add(evPot);
  { add(evPot, new THREE.CylinderGeometry(1.6, 1.8, 0.8, 20), mat(0x3b4150), V(0, 0.4, 0), 30);
    const potP = [[0.01, 0], [3.0, 0], [3.2, 0.3], [3.2, 3.6], [2.9, 3.6], [2.9, 0.3], [0.01, 0.3]];
    evPot.add((() => { const g = new THREE.Group(); g.position.y = 0.8; g.add(halfLathe(potP, mat(0xc9824a, { metalness: 0.6, roughness: 0.35 }), mat(0x9a6038, { side: THREE.DoubleSide }))); return g; })());
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 2.4), new THREE.MeshStandardMaterial({ color: PAL.water, transparent: true, opacity: 0.6 })); ew.position.set(0, 2.4, 0.02); evPot.add(ew);
    const r = mulberry32(4); for (let i = 0; i < 40; i++) { const gr = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 3, 6), mat(0xf2ead6)); gr.position.set((r() - 0.5) * 5, 1.3 + r() * 0.8, -r() * 2.4); gr.rotation.set(r() * 6, r() * 6, r() * 6); evPot.add(gr); }
    const flag = add(evPot, new THREE.BoxGeometry(2.4, 1.5, 0.08), mat(0xe5483a), V(5.6, 5.0, -1), 30); add(evPot, new THREE.CylinderGeometry(0.07, 0.07, 6, 8), mat(PAL.dark), V(4.4, 3.0, -1), 0); }

  // ---------- post ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  if (FX.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.3, 0.35, 1.6));
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- story (canonical time) ----------
  const T = { cutA: 15.5, cutB: 17.0, press0: 19.4, press1: 24.5, lift: 38.7, liftEnd: 40.6, open: 48.3, flash0: 48.9, flash1: 52.1, close0: 52.7, close1: 54.3 };
  const pressure = (t) => { // atm absolute shown on the HUD
    if (t < T.press0) return t < 7 ? 2.0 : 1.0; if (t < T.press1) return lerp(1.0, 2.0, ss(T.press0, T.press1, t));
    if (t < 35) return 2.0; if (t < 43) return 2.0 + 0.1 * ss(37.8, 38.7, t) * (1 - ss(T.lift, T.liftEnd, t));
    if (t < T.open) return 2.0; if (t < 52) return lerp(2.0, 1.0, ss(T.open, T.open + 0.5, t)); return 2.0; };
  const tempOf = (p) => 100 + (p - 1) * 20;
  const dummy = new THREE.Object3D();
  const hide = (im, i) => { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); };

  // ---------- camera ----------
  const K0 = { pos: V(16, 36, 80), look: V(1, 14, 0), fov: 40 };
  const EVL = SUM.clone().add(V(0, 2, 0));
  const keys = [
    { t: 0, ...K0 },
    { t: 6.6, pos: V(12, 32, 70), look: V(1, 14, 0), fov: 40 },
    { t: 8.2, pos: V(10, 30, 66), look: V(1, 14, 0), fov: 40 },
    { t: 10.0, pos: EVL.clone().add(V(26, -10, 62)), look: EVL.clone().add(V(0, -8, 0)), fov: 40 },
    { t: 11.8, pos: EVL.clone().add(V(9, 1.5, 18)), look: EVL, fov: 40 },
    { t: 14.6, pos: EVL.clone().add(V(6, 1.0, 16)), look: EVL, fov: 40 },
    { t: 16.2, pos: V(8, 26, 60), look: V(0, 13, 0), fov: 40 },
    { t: 19.6, pos: V(-10, 24, 50), look: V(0, 12, 0), fov: 40 },
    { t: 24.6, pos: V(6, 22, 52), look: V(0, 12, 0), fov: 40 },
    { t: 34.8, pos: V(0, 26, 70), look: V(0, 14, 0), fov: 40 },
    { t: 36.2, pos: V(7, 31, 17), look: V(0, 26.5, 0), fov: 40 },
    { t: 42.6, pos: V(-5, 31, 16), look: V(0, 26.5, 0), fov: 40 },
    { t: 44.0, pos: V(10, 27, 60), look: V(0, 14, 0), fov: 40 },
    { t: 51.8, pos: V(8, 30, 66), look: V(0, 17, 0), fov: 40 },
    { t: 56.0, pos: V(14, 34, 76), look: V(1, 14, 0), fov: 40 },
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
  const wp = (o, v) => { o.updateMatrixWorld(true); return v.clone().applyMatrix4(o.matrixWorld); };

  function render(t) {
    t = clamp(t, 0, 60);
    const p = pressure(t), press = clamp((p - 1) / 1);
    // cut-away: sweep down at 15.5, sweep back up (re-assemble) at the end
    const h = t < T.cutA ? 99 : t < T.close0 ? lerp(25, -0.5, ss(T.cutA, T.cutB, t)) : lerp(-0.5, 25.5, ss(T.close0, T.close1, t));
    const hh = h > 25 ? 99 : h; clipPlane.constant = hh + 3.4 * 0; // plane in world space; PC sits at y 3.4
    clipPlane.constant = hh > 90 ? 99 : hh + 3.4;
    sweepRing.position.y = hh + 3.4; sweepRing.material.opacity = hh > -0.4 && hh < 24.6 ? 0.95 : 0;
    // lid: opens in the warning scene, closes again before the loop
    const lidOpen = ss(T.open, T.open + 0.7, t) * (1 - ss(T.close0 - 0.2, T.close0 + 0.8, t));
    LID.position.y = 16.0 + lidOpen * 9; LID.rotation.z = lidOpen * 0.35; LID.position.x = -lidOpen * 3;
    gasketM.emissiveIntensity = 1.6 * ss(17.0, 17.6, t) * (1 - ss(24.4, 25.0, t));
    // weight jiggles while venting (hook + whistle scene), lifts clearly at 38.7
    const venting = (t < 8.2 ? 1 : 0) + (t > 56 ? ss(56, 57, t) : 0);
    const lift = ss(T.lift, T.lift + 0.25, t) * (1 - ss(T.liftEnd - 0.3, T.liftEnd, t));
    WEIGHT.position.y = 4.6 + 0.12 * venting * Math.abs(Math.sin(t * 22)) + 0.9 * lift + 0.1 * lift * Math.sin(t * 40);
    // flames
    for (let i = 0; i < NF; i++) { const a = (i / NF) * Math.PI * 2; const f = 0.85 + 0.25 * Math.sin(t * 17 + i * 2.3);
      dummy.position.set(Math.cos(a) * 6.5, 4.2, Math.sin(a) * 6.5); dummy.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); dummy.scale.set(1, f, 1); dummy.updateMatrix(); flames.setMatrixAt(i, dummy.matrix); }
    flames.instanceMatrix.needsUpdate = true;
    // steam molecules in the head space: faster + denser as pressure rises
    const showMol = t > T.cutA && t < T.close0;
    const nOn = Math.round(lerp(26, NS, press));
    for (let i = 0; i < NS; i++) { if (!showMol || i >= nOn || LID.position.y > 17) { hide(steam, i); continue; }
      const r = mulberry32(i * 31 + 7); const sp = lerp(0.6, 1.8, press) * (0.7 + r() * 0.6);
      const ph = r() * 100; const fx = (x) => 2 * Math.abs(((x % 2) + 2) % 2 - 1) - 1;   // triangle wave: bounce between the walls
      const x = 10.6 * fx(ph + t * sp * 0.31), y = lerp(8.4, 18.6, 0.5 + 0.5 * fx(ph * 1.7 + t * sp * 0.43)), z = -0.6 - 9.0 * (0.5 + 0.5 * fx(ph * 0.6 + t * sp * 0.29));
      dummy.position.set(x * Math.sqrt(1 - (z / 11) ** 2 * 0.6), y, z); dummy.scale.setScalar(1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); steam.setMatrixAt(i, dummy.matrix); }
    steam.instanceMatrix.needsUpdate = true;
    // bubbles: gentle simmer; flash-boil everywhere when the lid comes off under pressure
    const flash = ss(T.flash0, T.flash0 + 0.4, t) * (1 - ss(T.flash1, T.flash1 + 0.6, t));
    const simmer = showMol || t < 8.2 ? 0.35 : 0;
    for (let i = 0; i < NB; i++) { const lvl = i < 40 ? simmer + flash : flash; if (lvl < 0.02) { hide(bubbles, i); continue; }
      const r = mulberry32(i * 13 + 5); const x = (r() * 2 - 1) * 10.5, z = -r() * 10.4; const u = (t * (0.8 + r() * 0.8) * (1 + flash) + r()) % 1;
      dummy.position.set(x, lerp(1.0, WATER_TOP + flash * 1.2, u), Math.max(-10.4, Math.min(-0.2, z))); dummy.scale.setScalar(S0(lvl * (0.5 + u) * (1 + flash * 0.8))); dummy.updateMatrix(); bubbles.setMatrixAt(i, dummy.matrix); }
    bubbles.instanceMatrix.needsUpdate = true;
    // steam jets: whistle (hook, whistle scene, ending) and the eruption when opened
    let q = 0; const top = wp(WEIGHT, V(0, 0.4, 0));
    const jetOn = Math.max(venting * (0.5 + 0.5 * (Math.sin(t * 5) > 0.2 ? 1 : 0)), lift);
    if (jetOn > 0.02) for (let i = 0; i < 90 && q < NJ; i++) { const r = mulberry32(i * 3 + 1); const u = (t * 1.1 + r()) % 1; const a = r() * Math.PI * 2;
      dummy.position.set(top.x + Math.cos(a) * (0.3 + u * 2.5), top.y + u * 14, top.z + Math.sin(a) * (0.3 + u * 2.5)); dummy.scale.setScalar(S0(jetOn * (0.4 + u * 2.4) * (1 - u))); dummy.updateMatrix(); jet.setMatrixAt(q++, dummy.matrix); }
    const erupt = ss(T.flash0, T.flash0 + 0.3, t) * (1 - ss(T.flash1 - 0.2, T.flash1 + 0.6, t));
    if (erupt > 0.02) for (let i = 0; i < 160 && q < NJ; i++) { const r = mulberry32(i * 7 + 9); const u = (t * 0.9 + r()) % 1; const a = r() * Math.PI * 2, rr = r() * 10;
      dummy.position.set(Math.cos(a) * rr * (1 + u * 0.8), 3.4 + 12 + u * 34 - u * u * 10, Math.sin(a) * rr * 0.5 - 4 + u * 3); dummy.scale.setScalar(S0(erupt * (0.6 + u * 2.6) * (1 - u * 0.8))); dummy.updateMatrix(); jet.setMatrixAt(q++, dummy.matrix); }
    const evs = t > 8 && t < 16.5;
    if (evs) for (let i = 0; i < 24 && q < NJ; i++) { const r = mulberry32(i * 5 + 3); const u = (t * 0.5 + r()) % 1;
      dummy.position.copy(SUM).add(V((r() - 0.5) * 3, 4.6 + u * 6, (r() - 0.5) * 2)); dummy.scale.setScalar(S0(0.25 + u * 0.7) * (1 - u)); dummy.updateMatrix(); jet.setMatrixAt(q++, dummy.matrix); }
    for (; q < NJ; q++) hide(jet, q);
    jet.instanceMatrix.needsUpdate = true;
    // camera
    const cam = camAt(t); camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, -H * 0.07, W, H); camera.updateProjectionMatrix();
    const focus = cam.L.clone(); key.position.set(focus.x + 40, focus.y + 70, focus.z + 50); key.target.position.copy(focus);
    composer.render();
    const out = { t, anchors: {}, p, temp: tempOf(p) };
    const A = out.anchors;
    A["getah"] = proj(wp(LID, V(11.0, -0.35, 0.3))); A["steam"] = proj(V(-6, 3.4 + 15, -0.5)); A["weight"] = proj(wp(WEIGHT, V(1.4, 1.2, 0.5)));
    A["vent"] = proj(wp(LID, V(-0.6, 3.6, 0.6))); A["everest"] = proj(SUM.clone().add(V(-1, 1.8, 0.5))); A["water"] = proj(V(-7, 3.4 + 5, 0.2));
    return out;
  }
  function debug(t) { const o = render(t); return { t, cam: camera.position.toArray().map((x) => +x.toFixed(1)), anchors: Object.fromEntries(Object.entries(o.anchors).map(([k, v]) => [k, v.map((x) => Math.round(x))])) }; }
  return { render, debug, T };
}
