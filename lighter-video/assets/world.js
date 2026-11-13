// "Macam mana pemetik api keluarkan api?" — dark studio teardown look.
// Everything on screen is a pure function of canonical time t (0..60 s).
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "./lib/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "./lib/jsm/environments/RoomEnvironment.js";

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const win = (a, b, x, f = 0.3) => ss(a, a + f, x) * (1 - ss(b - f, b, x)); // 0→1→0 window
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const PAL = {
  accent: 0xff7a1a, // UI orange: ring, sweep plane, key words
  shell: 0x29b6d8, shellCut: 0x157a96, cavity: 0x10202a, liquid: 0x7fd6ea, liquidCut: 0x4fb9d4,
  head: 0x2a2c33, headCut: 0x4a4e5a, steel: 0xd9dde3, steelCut: 0x9aa3b0, brass: 0xe3b24a, brassCut: 0xf2d27c,
  lever: 0xe8452e, leverCut: 0xff7a5c, flint: 0x6b6f78, spring: 0xf2f2f2,
};
const FLOOR = -5;

export function createWorld(canvas, W, H, scale = 1, opts = {}) {
  const realRandom = Math.random; Math.random = mulberry32(1234); // addons seed noise with Math.random
  const rnd = mulberry32(77);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 500);

  // ---------- backdrop: cool grey top, warm dark bottom, soft light behind the subject ----------
  {
    const c = document.createElement("canvas"); c.width = 270; c.height = 480; const g = c.getContext("2d");
    const lg = g.createLinearGradient(0, 0, 0, 480);
    lg.addColorStop(0, "#2f3440"); lg.addColorStop(0.34, "#626877"); lg.addColorStop(0.62, "#4a403d"); lg.addColorStop(0.82, "#2a1c16"); lg.addColorStop(1, "#0c0908");
    g.fillStyle = lg; g.fillRect(0, 0, 270, 480);
    const rg = g.createRadialGradient(135, 190, 0, 135, 190, 300);
    rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(0.55, "rgba(0,0,0,0.08)"); rg.addColorStop(1, "rgba(0,0,0,0.5)");
    g.fillStyle = rg; g.fillRect(0, 0, 270, 480);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; scene.background = tex;
  }

  // ---------- light ----------
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x3a2a22, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(6, 10, 12); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffa25c, 1.4); rim.position.set(-8, 3, -6); scene.add(rim);

  // ---------- floor: grid, shadow blob, orange ring ----------
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vP;
      float line(vec2 p, float s){ vec2 g = abs(fract(p/s - 0.5) - 0.5) / fwidth(p/s); return 1.0 - min(min(g.x, g.y), 1.0); }
      void main(){ float a = line(vP, 2.4)*0.55 + line(vP, 12.0)*0.35; a *= 1.0 - smoothstep(10.0, 58.0, length(vP)); gl_FragColor = vec4(vec3(0.92,0.94,1.0), a*0.24); }`,
  }));
  grid.rotation.x = -Math.PI / 2; grid.rotation.z = 0.62; grid.position.y = FLOOR; scene.add(grid);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(4.2, 48), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { k: { value: 1 } },
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float k; varying vec2 vU; void main(){ float d = length(vU-0.5)*2.0; gl_FragColor = vec4(0.0,0.0,0.0,(1.0-smoothstep(0.0,1.0,d))*0.55*k); }`,
  }));
  blob.rotation.x = -Math.PI / 2; blob.position.set(1.6, FLOOR + 0.02, -1.0); blob.scale.set(1, 0.55, 1); scene.add(blob);
  const hot = (c, m = 2.2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(m), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const ring = new THREE.Group(); ring.position.y = FLOOR + 0.03; ring.rotation.x = -Math.PI / 2; scene.add(ring);
  const ringLine = new THREE.Mesh(new THREE.RingGeometry(5.0, 5.09, 128), hot(PAL.accent, 1.6)); ring.add(ringLine);
  const dots = new THREE.Group(); ring.add(dots);
  for (let i = 0; i < 96; i++) { const a = (i / 96) * Math.PI * 2; const d = new THREE.Mesh(new THREE.CircleGeometry(0.055, 8), ringLine.material); d.position.set(Math.cos(a) * 5.75, Math.sin(a) * 5.75, 0); dots.add(d); }

  // ---------- dust ----------
  const dustN = 70, dustSeed = []; const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(dustN * 3), 3));
  for (let i = 0; i < dustN; i++) dustSeed.push([lerp(-12, 12, rnd()), lerp(-4, 14, rnd()), lerp(-10, 8, rnd()), rnd() * 6.28, 0.2 + rnd() * 0.3]);
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.35, depthWrite: false })); scene.add(dust);

  // ---------- the lighter ----------
  // Local frame: base centre at the origin, +Y up, the cut plane is local z = c (everything in front of it is removed).
  const L = new THREE.Group(); scene.add(L);
  const planeTank = new THREE.Plane(V(0, 0, -1), 99), planeTop = new THREE.Plane(V(0, 0, -1), 99);
  const caps = []; // flat-colour back faces: they read as the solid cut surface
  function solid(parent, geo, frontOpts, capColor, plane, pos) {
    const g = new THREE.Group(); if (pos) g.position.copy(pos); parent.add(g);
    if (frontOpts) g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0, clippingPlanes: [plane], ...frontOpts })));
    const cap = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: capColor, side: THREE.BackSide, clippingPlanes: [plane] })); cap.userData.plane = plane; g.add(cap); caps.push(cap);
    return g;
  }
  const metal = (c, r = 0.28) => ({ color: c, metalness: 1, roughness: r });
  const P = {}; // exploding groups
  const part = (name, off) => { const g = new THREE.Group(); g.userData.off = off; L.add(g); P[name] = g; return g; };

  // tank: translucent plastic shell, dark cavity, liquid butane
  const tank = part("tank", V(0, 0, 0));
  solid(tank, new RoundedBoxGeometry(2.6, 5.6, 1.3, 6, 0.42), { color: PAL.shell, transparent: true, opacity: 0.5, roughness: 0.15, depthWrite: false }, PAL.shellCut, planeTank, V(0, 2.8, 0));
  solid(tank, new RoundedBoxGeometry(2.24, 5.0, 0.98, 5, 0.3), null, PAL.cavity, planeTank, V(0, 2.8, 0));
  const liquid = solid(tank, new RoundedBoxGeometry(2.2, 3.1, 0.94, 5, 0.28), { color: PAL.liquid, transparent: true, opacity: 0.75, roughness: 0.1 }, PAL.liquidCut, planeTank, V(0, 1.87, 0));
  // head: plastic block, valve body, dip tube, flint tube
  const head = part("head", V(0, 1.2, 0));
  solid(head, new RoundedBoxGeometry(2.6, 0.75, 1.3, 4, 0.16), { color: PAL.head, roughness: 0.5 }, PAL.headCut, planeTop, V(0, 5.95, 0));
  solid(head, new THREE.CylinderGeometry(0.24, 0.24, 1.0, 24), metal(PAL.brass), PAL.brassCut, planeTop, V(-0.62, 5.9, 0));
  solid(head, new THREE.CylinderGeometry(0.075, 0.075, 4.7, 12), { color: 0xc9d0d6, roughness: 0.5 }, 0xb9c2c9, planeTop, V(-0.62, 3.05, 0));
  solid(head, new THREE.CylinderGeometry(0.17, 0.17, 1.5, 20), metal(PAL.steel, 0.4), PAL.cavity, planeTop, V(0.12, 5.6, 0));
  // jet (the valve needle the lever lifts)
  const jet = part("jet", V(-1.5, 3.2, 0));
  solid(jet, new THREE.CylinderGeometry(0.1, 0.12, 0.75, 16), metal(PAL.brass), PAL.brassCut, planeTop, V(-0.62, 6.72, 0));
  solid(jet, new THREE.CylinderGeometry(0.19, 0.19, 0.09, 16), metal(PAL.brass), PAL.brassCut, planeTop, V(-0.62, 6.74, 0));
  // lever: red thumb pad on the right, fork under the jet collar on the left, pivot in between
  const lever = part("lever", V(2.1, 2.4, 0));
  const leverPivot = new THREE.Group(); leverPivot.position.set(0.48, 6.5, 0); lever.add(leverPivot);
  solid(leverPivot, new RoundedBoxGeometry(1.0, 0.3, 1.24, 3, 0.1), { color: PAL.lever, roughness: 0.4 }, PAL.leverCut, planeTop, V(0.42, 0.12, 0));
  solid(leverPivot, new THREE.BoxGeometry(1.2, 0.1, 0.9), { color: PAL.lever, roughness: 0.4 }, PAL.leverCut, planeTop, V(-0.55, 0.14, 0));
  // spark wheel: knurled steel drum + two thumb discs
  const wheel = part("wheel", V(0.5, 4.6, 0));
  const wheelSpin = new THREE.Group(); wheelSpin.position.set(0.12, 7.12, 0); wheel.add(wheelSpin);
  const drum = solid(wheelSpin, new THREE.CylinderGeometry(0.42, 0.42, 0.56, 26, 1), { ...metal(0x8d939c, 0.55), flatShading: true }, PAL.steelCut, planeTop); drum.rotation.x = Math.PI / 2;
  for (const z of [-0.36, 0.36]) { const d = solid(wheelSpin, new THREE.CylinderGeometry(0.52, 0.52, 0.12, 18, 1), { ...metal(PAL.steel, 0.3), flatShading: true }, PAL.steelCut, planeTop, V(0, 0, z)); d.rotation.x = Math.PI / 2; }
  // flint + spring (never clipped, so they read as whole parts sitting in the cut tube)
  const fl = part("flint", V(1.9, 1.0, 0));
  const flint = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 14), new THREE.MeshStandardMaterial({ color: PAL.flint, roughness: 0.8 })); flint.position.set(0.12, 6.45, 0); fl.add(flint);
  class Helix extends THREE.Curve { getPoint(u, o = new THREE.Vector3()) { const a = u * Math.PI * 2 * 9; return o.set(Math.cos(a) * 0.1, u, Math.sin(a) * 0.1); } }
  const spring = new THREE.Mesh(new THREE.TubeGeometry(new Helix(), 220, 0.022, 6), new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.6, roughness: 0.5 })); spring.position.set(0.12, 4.9, 0); fl.add(spring);
  // hood (wind guard): chrome plates around the jet
  const hood = part("hood", V(-2.0, 4.8, 0));
  solid(hood, new RoundedBoxGeometry(1.25, 1.3, 0.06, 2, 0.02), metal(PAL.steel, 0.18), PAL.steelCut, planeTop, V(-0.68, 6.95, 0.62));
  solid(hood, new RoundedBoxGeometry(1.25, 1.3, 0.06, 2, 0.02), metal(PAL.steel, 0.18), PAL.steelCut, planeTop, V(-0.68, 6.95, -0.62));
  solid(hood, new RoundedBoxGeometry(0.06, 1.3, 1.3, 2, 0.02), metal(PAL.steel, 0.18), PAL.steelCut, planeTop, V(-1.28, 6.95, 0));

  // sweep plane (the orange sheet that "slices" the lighter)
  const sweep = new THREE.Group(); L.add(sweep);
  const sweepFill = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 10.4), hot(PAL.accent, 1.0)); sweep.add(sweepFill);
  const sweepEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(5.4, 10.4)), new THREE.LineBasicMaterial({ color: new THREE.Color(PAL.accent).multiplyScalar(2.4), transparent: true, toneMapped: false })); sweep.add(sweepEdge);
  sweep.position.set(0, 3.9, 0);

  // ---------- effects: flame, sparks, gas, bubbles, hint arrows ----------
  const JET_TIP = V(-0.62, 7.12, 0), CONTACT = V(0.12, 6.72, 0.02);
  const flame = new THREE.Group(); flame.position.copy(JET_TIP); L.add(flame);
  const drop = (w, h) => new THREE.LatheGeometry([0, 0.04, 0.12, 0.22, 0.36, 0.5, 0.64, 0.78, 0.9, 1].map((u) => new THREE.Vector2(w * Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - 0.25 * u) + 0.001, u * h)), 20);
  const fOuter = new THREE.Mesh(drop(0.34, 2.0), hot(0xff7a1a, 1.5)); fOuter.material.blending = THREE.AdditiveBlending; fOuter.material.opacity = 0.75; flame.add(fOuter);
  const fInner = new THREE.Mesh(drop(0.2, 1.45), hot(0xffe28a, 2.4)); fInner.material.blending = THREE.AdditiveBlending; flame.add(fInner);
  const fBase = new THREE.Mesh(drop(0.16, 0.5), hot(0x4aa8ff, 1.8)); fBase.material.blending = THREE.AdditiveBlending; flame.add(fBase);
  const flameLight = new THREE.PointLight(0xff9a4a, 0, 14, 1.6); flameLight.position.set(0, 0.9, 0.6); flame.add(flameLight);

  const SPARKS = 46, sparkSeed = []; for (let i = 0; i < SPARKS; i++) sparkSeed.push([rnd(), rnd(), rnd(), rnd()]);
  const sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), hot(0xffd98a, 3.2), SPARKS); sparks.frustumCulled = false; L.add(sparks);
  // [start, spawn window, life, speed]: the hook flick, the slow-motion look, the real ignition
  const BURSTS = [[0.55, 0.25, 0.45, 1], [34.2, 4.6, 1.3, 0.34], [48.7, 0.5, 0.5, 1]];
  const GAS = 30, gas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), hot(0xbdf3ff, 1.5), GAS); gas.frustumCulled = false; L.add(gas);
  const BUB = 12, bubSeed = []; for (let i = 0; i < BUB; i++) bubSeed.push([rnd(), rnd(), rnd()]);
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xeafcff, transparent: true, opacity: 0.8 }), BUB); bubbles.frustumCulled = false; tank.add(bubbles);
  const arrowMat = hot(PAL.accent, 2.0);
  const spinArrow = new THREE.Group(); spinArrow.position.set(0.12, 7.12, 0.75); L.add(spinArrow);
  { const arc = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.035, 6, 30, Math.PI * 1.1), arrowMat); arc.rotation.z = Math.PI * 0.1; spinArrow.add(arc);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 10), arrowMat); tip.position.set(0.78 * Math.cos(Math.PI * 0.1), 0.78 * Math.sin(Math.PI * 0.1) - 0.05, 0); tip.rotation.z = Math.PI; spinArrow.add(tip); }
  const pressArrow = new THREE.Group(); L.add(pressArrow);
  { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8), arrowMat); st.position.y = 0.45; pressArrow.add(st);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 10), arrowMat); tip.rotation.z = Math.PI; tip.position.y = 0.05; pressArrow.add(tip); }

  // ---------- post ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: opts.msaa ?? (scale < 1 ? 0 : 4) });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  if (opts.bloom ?? true) composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.45, 0.6, 1.05));
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- story curves ----------
  const explode = (t) => ss(5.3, 6.7, t) * (1 - ss(19.3, 20.9, t));
  const cutTank = (t) => ss(11.0, 12.2, t) * (1 - ss(18.8, 19.4, t)); // tank alone, while it is apart
  const cutAll = (t) => ss(21.3, 22.7, t) * (1 - ss(54.3, 55.5, t)); // the whole lighter
  const press = (t) => win(0.45, 2.7, t, 0.18) + win(41.4, 52.2, t, 0.3);
  const flameK = (t) => win(0.75, 2.75, t, 0.14) + win(49.2, 52.5, t, 0.22);
  const SPINS = [[0.5, 0.3, 2.6], [34.0, 5.0, 4.4], [48.6, 0.5, 2.6]];
  const wheelAngle = (t) => SPINS.reduce((a, [t0, d, ang]) => a - ang * ss(t0, t0 + d, t), 0);
  const gasK = (t) => ss(43.6, 44.6, t) * (1 - ss(52.0, 52.6, t));

  // ---------- camera: eased moves between keys, plus a slow drift so it never sits still ----------
  // [time, camera position, look-at, view offset (fraction of H the subject is lifted above centre)]
  const KEYS = [
    [0, [9, 6.5, 40], [0, 3.8, 0], 0.2], [5, [6.5, 5.5, 31], [0, 3.8, 0], 0.2],
    [6.8, [5, 7.5, 46], [0, 6.0, 0], 0.2], [9, [4.5, 7.5, 45], [0, 6.0, 0], 0.2],
    [10.4, [3.2, 3.6, 25], [0, 2.8, 0], 0.2], [19, [1.8, 3.2, 23], [0, 2.8, 0], 0.2],
    [21, [5, 5, 33], [0, 3.8, 0], 0.2], [23.4, [4, 5, 31], [0, 3.8, 0], 0.2],
    [24.6, [3, 5.2, 28], [0.2, 4.1, 0], 0.2], [32, [2.2, 5.2, 27], [0.2, 4.1, 0], 0.2],
    [33.4, [1.8, 7.6, 10.5], [-0.1, 6.6, 0], 0.2], [40, [1.2, 7.4, 10], [-0.1, 6.6, 0], 0.2],
    [41.2, [1.6, 7.2, 12.5], [-0.1, 6.4, 0], 0.2], [43.6, [1.4, 7.2, 12], [-0.1, 6.4, 0], 0.2],
    [45.2, [2.2, 4.8, 31], [0, 3.9, 0], 0.2], [47.8, [1.8, 4.8, 30], [0, 3.9, 0], 0.2],
    [49, [1.6, 7.8, 16], [-0.3, 7.0, 0], 0.2], [54, [1.2, 7.6, 15.5], [-0.3, 7.0, 0], 0.2],
    [56, [6, 5.2, 40], [0, 3.8, 0], 0.03], [60, [7, 5.2, 42], [0, 3.8, 0], 0.03],
  ];
  let camO = 0.2; const camP = V(0, 0, 0), camL = V(0, 0, 0), a3 = V(0, 0, 0), b3 = V(0, 0, 0);
  function cam(t) {
    let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
    const k0 = KEYS[i], k1 = KEYS[i + 1], u = ss(k0[0], k1[0], t);
    camP.lerpVectors(a3.fromArray(k0[1]), b3.fromArray(k1[1]), u); camL.lerpVectors(a3.fromArray(k0[2]), b3.fromArray(k1[2]), u);
    camO = lerp(k0[3], k1[3], u);
    camP.x += Math.sin(t * 0.37) * 0.35; camP.y += Math.sin(t * 0.29 + 1) * 0.2;
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), zhat = V(0, 0, 1), tmp = V(0, 0, 0), one = V(1, 1, 1), s3 = V(1, 1, 1);
  const put = (mesh, i, p, s) => { m4.compose(p, q.identity(), s3.setScalar(Math.max(1e-4, s))); mesh.setMatrixAt(i, m4); };
  function setPlane(plane, c) { zhat.set(0, 0, 1).applyQuaternion(L.quaternion); plane.normal.copy(zhat).negate(); plane.constant = c + zhat.dot(L.position); }

  function render(t) {
    const e = explode(t), ct = cutTank(t), ca = cutAll(t), p = clamp(press(t)), fk = clamp(flameK(t));
    // pose: a gentle sway while whole, turned square to the camera when it is cut open
    const cutK = Math.max(ct, ca);
    L.rotation.y = lerp(-0.5 + 0.16 * Math.sin(t * 0.45), 0.02 * Math.sin(t * 0.45), Math.max(cutK, ss(9.4, 10.6, t) * (1 - ss(19, 20, t))));
    L.position.y = 0.12 * Math.sin(t * 0.9);
    L.updateMatrixWorld(true);
    for (const k in P) P[k].position.copy(P[k].userData.off).multiplyScalar(e);
    // cut planes: c = 1 is in front of everything (whole), c = 0 is the centre plane
    const cT = lerp(1.0, 0.0, Math.max(ct, ca)), cO = lerp(1.0, 0.0, ca);
    setPlane(planeTank, cT > 0.98 ? 99 : cT); setPlane(planeTop, cO > 0.98 ? 99 : cO);
    for (const c of caps) c.visible = (c.userData.plane === planeTank ? cT : cO) < 0.98;
    // the orange sheet rides the moving cut
    const sw = Math.max(win(10.8, 12.5, t, 0.25), win(21.1, 23.0, t, 0.25), win(54.1, 55.8, t, 0.25));
    sweep.visible = sw > 0.01; sweepFill.material.opacity = 0.2 * sw; sweepEdge.material.opacity = sw;
    const tankOnly = t < 19.5; sweep.position.set(0, tankOnly ? 2.8 : 3.9, (tankOnly ? cT : cO) + 0.01); sweep.scale.set(tankOnly ? 0.72 : 1, tankOnly ? 0.66 : 1, 1);
    // mechanism
    wheelSpin.rotation.z = wheelAngle(t);
    leverPivot.rotation.z = -0.2 * p; jet.children.forEach((c, i) => (c.position.y = (i ? 6.74 : 6.72) + 0.13 * p));
    spring.scale.y = 1.3; // flint rides on the spring (no wear shown at this length)
    liquid.position.y = 1.87 + 0.02 * Math.sin(t * 1.3);
    // flame
    flame.visible = fk > 0.01; const fl2 = 1 + 0.07 * Math.sin(t * 23) + 0.05 * Math.sin(t * 37 + 1);
    flame.scale.set(fk * (1 + 0.05 * Math.sin(t * 31)), fk * fl2, fk); flame.rotation.z = 0.05 * Math.sin(t * 11); flameLight.intensity = 14 * fk;
    flame.position.copy(JET_TIP).add(P.jet.position); flame.position.y += 0.13 * p;
    // sparks: thrown from the wheel/flint contact toward the jet
    for (let i = 0; i < SPARKS; i++) {
      let shown = false;
      for (const [t0, w, life, sp] of BURSTS) {
        const [r0, r1, r2, r3] = sparkSeed[i], age = t - (t0 + r0 * w); if (age < 0 || age > life) continue;
        const a = age * sp, ang = 2.5 + (r1 - 0.5) * 1.3, v = 2.6 + r2 * 2.6;
        tmp.set(CONTACT.x + Math.cos(ang) * v * a, CONTACT.y + Math.sin(ang) * v * a - 3.2 * a * a, CONTACT.z + (r3 - 0.5) * 1.4 * a).add(P.wheel.position.clone().multiplyScalar(0));
        put(sparks, i, tmp, 1.2 * (1 - age / life) + 0.2); shown = true; break;
      }
      if (!shown) put(sparks, i, tmp.set(0, -99, 0), 0);
    }
    sparks.instanceMatrix.needsUpdate = true;
    // gas: up the dip tube, out of the jet
    const gk = gasK(t);
    for (let i = 0; i < GAS; i++) {
      const u = (t * 0.42 + i / GAS) % 1; const y = lerp(0.9, 8.3, u), above = Math.max(0, y - 7.1);
      tmp.set(-0.62 + Math.sin(i * 2.4 + t * 3) * 0.16 * above, y, 0.08 + Math.cos(i * 1.7) * 0.1 * above);
      put(gas, i, tmp, gk * (y > 7.1 ? 1.3 - above * 0.5 : 0.8) * (fk > 0.3 && y > 7.1 ? 0 : 1));
    }
    gas.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < BUB; i++) { const [r0, r1, r2] = bubSeed[i], u = (t * (0.25 + r1 * 0.3) + r0) % 1; put(bubbles, i, tmp.set(-0.62 + (r2 - 0.5) * 0.5, lerp(0.5, 3.3, u), 0.05), gk * (0.5 + r2 * 0.6) * (1 - u * 0.4)); }
    bubbles.instanceMatrix.needsUpdate = true;
    // hint arrows
    const sa = win(33.6, 36.4, t); spinArrow.visible = sa > 0.01; spinArrow.scale.setScalar(Math.max(1e-3, sa)); spinArrow.rotation.z = -wheelAngle(t) * -0.25;
    const pa = win(40.6, 43.2, t); pressArrow.visible = pa > 0.01; pressArrow.scale.setScalar(Math.max(1e-3, pa)); pressArrow.position.set(1.0, 6.95 + 0.12 * Math.sin(t * 7), 0.4);
    arrowMat.opacity = 1;
    // floor dressing
    ring.rotation.z = t * 0.08; dots.rotation.z = -t * 0.2; const rs = 1 + 0.03 * Math.sin(t * 1.6); ringLine.scale.setScalar(rs);
    const floorK = 1 - Math.max(win(9.6, 19.6, t, 0.8), win(32.6, 54.4, t, 0.8)) * 0.0; ringLine.material.opacity = floorK;
    blob.material.uniforms.k.value = 1 - 0.4 * e;
    const pa3 = dustGeo.attributes.position; for (let i = 0; i < dustN; i++) { const d = dustSeed[i]; pa3.setXYZ(i, d[0] + Math.sin(t * d[4] + d[3]) * 0.8, d[1] + ((t * d[4] * 0.4) % 2), d[2] + Math.cos(t * d[4] * 0.7 + d[3]) * 0.6); } pa3.needsUpdate = true;
    // camera
    cam(t); camera.position.copy(camP); camera.lookAt(camL);
    camera.setViewOffset(W, H, 0, H * camO, W, H); camera.updateProjectionMatrix();
    composer.render();
  }

  // label anchors: [group that carries it, local point]
  const ANCH = {
    liquid: [tank, V(0.55, 1.5, 0.05)], tube: [head, V(-0.62, 3.4, 0.08)], shell: [tank, V(-1.28, 1.6, 0.3)],
    wheel: [wheel, V(0.3, 7.3, 0.3)], flint: [fl, V(0.12, 6.4, 0.1)], spring: [fl, V(0.12, 5.5, 0.1)], lever: [lever, V(1.0, 6.7, 0.3)],
    jet: [jet, V(-0.62, 6.75, 0.1)], spark: [L, V(-0.25, 6.95, 0.1)], gas: [L, V(-0.62, 7.5, 0.1)], flame: [L, V(-0.62, 7.9, 0.1)],
  };
  function project(name) { const [g, p] = ANCH[name]; tmp.copy(p); g.localToWorld(tmp); tmp.project(camera); return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H }; }
  function debug(t) { render(t); return Object.fromEntries(Object.keys(ANCH).map((k) => [k, project(k)])); }
  return { render, project, debug, scene, composer };
}
