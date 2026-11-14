// "Macam mana pemetik api keluarkan api?" — dark studio teardown look.
// Everything on screen is a pure function of canonical time t (0..60 s).
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "./lib/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "./lib/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "./lib/jsm/utils/BufferGeometryUtils.js";
import { T, DURATION } from "./beats.js";

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const win = (a, b, x, f = 0.3) => ss(a, a + f, x) * (1 - ss(b - f, b, x)); // 0→1→0 window
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const PAL = {
  accent: 0xff7a1a, // UI orange: ring, sweep plane, key words
  shell: 0x1c8fd0, shellCut: 0x1a6fa8, cavity: 0x10202a, liquid: 0x3fb4e0, liquidCut: 0x2f9fd0,
  head: 0x1d1f25, headCut: 0x3a3e49, steel: 0xd9dde3, steelCut: 0x9aa3b0, brass: 0xe3b24a, brassCut: 0xf2d27c,
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
  renderer.toneMappingExposure = 0.92;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = opts.shadow ?? true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
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
  const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(-7, 13, 12); scene.add(key); scene.add(key.target); key.target.position.set(0, 3, 0);
  key.castShadow = true; key.shadow.mapSize.set(scale < 1 ? 1024 : 2048, scale < 1 ? 1024 : 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
  { const c = key.shadow.camera; c.left = -12; c.right = 12; c.top = 14; c.bottom = -10; c.near = 1; c.far = 60; }
  const fill = new THREE.DirectionalLight(0xbfd4ff, 0.7); fill.position.set(9, 4, 10); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffa25c, 1.4); rim.position.set(8, 5, -8); scene.add(rim);

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
    fragmentShader: `uniform float k; varying vec2 vU; void main(){ float d = length(vU-0.5)*2.0; gl_FragColor = vec4(0.0,0.0,0.0,(1.0-smoothstep(0.0,1.0,d))*0.3*k); }`,
  }));
  blob.rotation.x = -Math.PI / 2; blob.position.set(1.6, FLOOR + 0.02, -1.0); blob.scale.set(1, 0.55, 1); scene.add(blob);
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.5 })); shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.y = FLOOR + 0.01; shadowFloor.receiveShadow = true; scene.add(shadowFloor);
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
  // Local frame: base centre at the origin, +Y up. The cut plane is local z = c: everything in front of it is removed and
  // every solid gets a real, lit cut face there (stencil caps), so hollow parts show their inside with depth.
  const L = new THREE.Group(); scene.add(L);
  const planeTank = new THREE.Plane(V(0, 0, -1), 99), planeTop = new THREE.Plane(V(0, 0, -1), 99);
  const capRootTank = new THREE.Group(), capRootTop = new THREE.Group(); L.add(capRootTank, capRootTop);
  const capGeo = new THREE.PlaneGeometry(1, 1), stencilMeshes = [];
  let order = 1;
  const phys = (o) => new THREE.MeshPhysicalMaterial({ roughness: 0.4, metalness: 0, ...o });
  const metal = (c, r = 0.28, o = {}) => phys({ color: c, metalness: 1, roughness: r, ...o });
  function solid(parent, geo, mat, capOpts, plane, pos) {
    const g = new THREE.Group(); if (pos) g.position.copy(pos); parent.add(g);
    mat.clippingPlanes = [plane];
    const m = new THREE.Mesh(geo, mat); m.castShadow = !mat.transparent; m.receiveShadow = !mat.transparent; g.add(m);
    const sBase = { depthWrite: false, depthTest: false, colorWrite: false, stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, clippingPlanes: [plane] };
    const inc = THREE.IncrementWrapStencilOp, dcr = THREE.DecrementWrapStencilOp;
    const sb = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ ...sBase, side: THREE.BackSide, stencilFail: inc, stencilZFail: inc, stencilZPass: inc }));
    const sf = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ ...sBase, side: THREE.FrontSide, stencilFail: dcr, stencilZFail: dcr, stencilZPass: dcr }));
    sb.renderOrder = sf.renderOrder = order; g.add(sb, sf);
    const rep = THREE.ReplaceStencilOp;
    const cap = new THREE.Mesh(capGeo, phys({ roughness: 0.55, ...capOpts, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -4 * order, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: rep, stencilZFail: rep, stencilZPass: rep }));
    cap.renderOrder = order + 0.5; cap.receiveShadow = true;
    // the cap quad only covers this solid (it also resets the stencil it used), so cutting stays cheap
    geo.computeBoundingSphere(); L.updateMatrixWorld(true); const c = g.localToWorld(geo.boundingSphere.center.clone()); L.worldToLocal(c);
    cap.position.set(c.x, c.y, 0); cap.scale.setScalar(geo.boundingSphere.radius * 2.3);
    (plane === planeTank ? capRootTank : capRootTop).add(cap);
    stencilMeshes.push([sb, sf, cap, plane]); order += 1;
    return g;
  }
  const flip = (geo) => { const g = geo.index ? geo.toNonIndexed() : geo; for (const k of ["position", "normal", "uv"]) { const a = g.attributes[k]; if (!a) continue; const n = a.itemSize, arr = a.array;
      for (let i = 0; i < arr.length; i += 3 * n) for (let j = 0; j < n; j++) { const x = arr[i + n + j]; arr[i + n + j] = arr[i + 2 * n + j]; arr[i + 2 * n + j] = x; }
      if (k === "normal") for (let i = 0; i < arr.length; i++) arr[i] = -arr[i]; } return g; };
  const hollowBox = (w, h, d, r, th) => mergeGeometries([new RoundedBoxGeometry(w, h, d, 6, r), flip(new RoundedBoxGeometry(w - 2 * th, h - 2 * th, d - 2 * th, 6, Math.max(0.02, r - th)))]);
  const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  function gear(r0, r1, teeth, depth, bevel = 0) {
    const sh = new THREE.Shape(); const n = teeth * 4;
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, r = i % 4 < 2 ? r1 : r0; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 }); g.translate(0, 0, -depth / 2); return g;
  }
  function rrect(sh, w, h, r) { const x = -w / 2, y = -h / 2; sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.absarc(x + w - r, y + r, r, -Math.PI / 2, 0); sh.lineTo(x + w, y + h - r); sh.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    sh.lineTo(x + r, y + h); sh.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI); sh.lineTo(x, y + r); sh.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5); return sh; }
  const P = {}; // exploding groups
  const part = (name, off) => { const g = new THREE.Group(); g.userData.off = off; L.add(g); P[name] = g; return g; };
  const JX = -0.78, WX = 0.3, WY = 7.1; // jet/valve/dip-tube column, wheel/flint/spring column, wheel axle height

  // tank: hollow translucent shell (2.6 x 5.6 x 1.3, 0.16 wall) and the liquid butane inside it
  const tank = part("tank", V(0, 0, 0));
  const shellMat = phys({ color: PAL.shell, transparent: true, opacity: 0.42, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.FrontSide, envMapIntensity: 1.6 });
  solid(tank, hollowBox(2.6, 5.6, 1.3, 0.42, 0.16), shellMat, { color: PAL.shellCut, roughness: 0.25, clearcoat: 1 }, planeTank, V(0, 2.8, 0));
  const liquidMat = phys({ color: PAL.liquid, roughness: 0.04, clearcoat: 1, emissive: 0xff5a1a, emissiveIntensity: 0, envMapIntensity: 1.3 });
  const liquid = solid(tank, new RoundedBoxGeometry(2.24, 2.5, 0.94, 5, 0.24), liquidMat, { color: PAL.liquidCut, roughness: 0.15, clearcoat: 1, emissive: 0xff5a1a, emissiveIntensity: 0 }, planeTank, V(0, 1.43, 0));
  const liquidCapMat = stencilMeshes[stencilMeshes.length - 1][2].material;
  // head: plastic block with the valve body, dip tube, flint tube and the two wheel posts
  const head = part("head", V(0, 1.2, 0));
  solid(head, new RoundedBoxGeometry(2.6, 0.8, 1.3, 5, 0.14), phys({ color: PAL.head, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.3 }), { color: PAL.headCut }, planeTop, V(0, 5.95, 0));
  solid(head, lathe([[0.001, 0.7], [0.07, 0.7], [0.07, 5.3], [0.001, 5.3]], 14), phys({ color: 0xaab4bd, roughness: 0.45 }), { color: 0xc3ccd4 }, planeTop, V(JX, 0, 0));
  solid(head, lathe([[0.001, 5.28], [0.2, 5.28], [0.2, 5.9], [0.28, 5.92], [0.28, 6.2], [0.17, 6.22], [0.17, 6.42], [0.001, 6.42]]), metal(PAL.brass, 0.25), { color: PAL.brassCut, metalness: 1, roughness: 0.35 }, planeTop, V(JX, 0, 0));
  solid(head, lathe([[0.13, 4.7], [0.185, 4.7], [0.185, 6.42], [0.13, 6.42], [0.13, 4.7]], 24), metal(PAL.steel, 0.35), { color: PAL.steelCut, metalness: 1, roughness: 0.4 }, planeTop, V(WX, 0, 0));
  for (const z of [-0.5, 0.5]) solid(head, new RoundedBoxGeometry(0.46, 1.05, 0.05, 2, 0.02), metal(PAL.steel, 0.3), { color: PAL.steelCut, metalness: 1 }, planeTop, V(WX, 6.82, z));
  // jet: the needle the lever lifts to let gas out
  const jet = part("jet", V(-1.6, 3.4, 0));
  const jetBody = solid(jet, lathe([[0.001, 6.3], [0.075, 6.3], [0.075, 6.6], [0.2, 6.6], [0.2, 6.69], [0.075, 6.69], [0.075, 7.0], [0.11, 7.02], [0.11, 7.1], [0.06, 7.14], [0.001, 7.14]]), metal(PAL.brass, 0.22), { color: PAL.brassCut, metalness: 1, roughness: 0.35 }, planeTop, V(JX, 0, 0));
  // lever: thumb pad on the right, two side rails that run past the flint tube, fork bar under the jet collar
  const lever = part("lever", V(2.2, 2.5, 0));
  const leverPivot = new THREE.Group(); leverPivot.position.set(0.62, 6.48, 0); lever.add(leverPivot);
  const leverMat = phys({ color: PAL.lever, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  solid(leverPivot, new RoundedBoxGeometry(0.72, 0.3, 1.26, 4, 0.1), leverMat, { color: PAL.leverCut }, planeTop, V(0.3, 0.1, 0));
  for (let i = 0; i < 4; i++) solid(leverPivot, new RoundedBoxGeometry(0.06, 0.05, 1.1, 1, 0.02), leverMat, { color: PAL.leverCut }, planeTop, V(0.06 + i * 0.16, 0.27, 0));
  for (const z of [-0.56, 0.56]) solid(leverPivot, new THREE.BoxGeometry(1.75, 0.09, 0.07), leverMat, { color: PAL.leverCut }, planeTop, V(-0.8, 0.05, z));
  solid(leverPivot, new THREE.BoxGeometry(0.34, 0.07, 1.19), leverMat, { color: PAL.leverCut }, planeTop, V(-1.62, 0.05, 0));
  // spark wheel: knurled drum between two toothed thumb discs, on an axle
  const wheel = part("wheel", V(0.6, 4.9, 0));
  const wheelSpin = new THREE.Group(); wheelSpin.position.set(WX, WY, 0); wheel.add(wheelSpin);
  solid(wheelSpin, gear(0.385, 0.41, 40, 0.56), metal(0x7d848e, 0.5), { color: 0x8a919b, metalness: 1, roughness: 0.5 }, planeTop);
  for (const z of [-0.36, 0.36]) solid(wheelSpin, gear(0.47, 0.53, 14, 0.1, 0.015), metal(PAL.steel, 0.22), { color: PAL.steelCut, metalness: 1 }, planeTop, V(0, 0, z));
  const axle = solid(wheelSpin, new THREE.CylinderGeometry(0.07, 0.07, 1.16, 14), metal(0xb9c0c8, 0.3), { color: PAL.steelCut, metalness: 1 }, planeTop); axle.rotation.x = Math.PI / 2;
  // flint + spring: never clipped, they read as whole parts sitting in the cut tube
  const fl = part("flint", V(2.0, 1.1, 0));
  const flint = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.5, 18), phys({ color: PAL.flint, roughness: 0.75, metalness: 0.4 })); flint.castShadow = true; fl.add(flint);
  class Helix extends THREE.Curve { getPoint(u, o = new THREE.Vector3()) { const a = u * Math.PI * 2 * 10; return o.set(Math.cos(a) * 0.092, u, Math.sin(a) * 0.092); } }
  const spring = new THREE.Mesh(new THREE.TubeGeometry(new Helix(), 300, 0.024, 8), metal(0xdde2e8, 0.25)); spring.castShadow = true; spring.position.set(WX, 4.78, 0); fl.add(spring);
  // hood (wind guard): a chrome sleeve around the jet
  const hood = part("hood", V(-2.1, 5.2, 0));
  { const sh = rrect(new THREE.Shape(), 1.06, 1.22, 0.22); sh.holes.push(rrect(new THREE.Path(), 0.98, 1.14, 0.18));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: false, curveSegments: 8 }); g.rotateX(-Math.PI / 2);
    solid(hood, g, metal(0xe6e9ee, 0.3, { envMapIntensity: 1.4 }), { color: PAL.steelCut, metalness: 1, roughness: 0.3 }, planeTop, V(JX, 6.34, 0)); }

  // sweep sheet: the orange plane that "slices" the lighter
  const sweep = new THREE.Group(); L.add(sweep);
  const sweepFill = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 10.4), hot(PAL.accent, 1.0)); sweep.add(sweepFill);
  const sweepEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(5.4, 10.4)), new THREE.LineBasicMaterial({ color: new THREE.Color(PAL.accent).multiplyScalar(2.4), transparent: true, toneMapped: false })); sweep.add(sweepEdge);

  // ---------- effects: flame, sparks, gas, bubbles, hint arrows ----------
  const JET_TIP = V(JX, 7.14, 0), CONTACT = V(WX - 0.12, WY - 0.4, 0.04);
  const flame = new THREE.Group(); L.add(flame);
  const drop = (w, h) => new THREE.LatheGeometry([0, 0.04, 0.12, 0.22, 0.36, 0.5, 0.64, 0.78, 0.9, 1].map((u) => new THREE.Vector2(w * Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - 0.25 * u) + 0.001, u * h)), 24);
  const addMat = (c, m, o) => { const k = hot(c, m); k.blending = THREE.AdditiveBlending; k.opacity = o; return k; };
  const fOuter = new THREE.Mesh(drop(0.3, 1.9), addMat(0xff6a14, 1.2, 0.55)); flame.add(fOuter);
  const fInner = new THREE.Mesh(drop(0.19, 1.4), addMat(0xffd27a, 2.0, 0.9)); flame.add(fInner);
  const fBase = new THREE.Mesh(drop(0.15, 0.5), addMat(0x3f9bff, 1.8, 0.9)); flame.add(fBase);
  const flameLight = new THREE.PointLight(0xff9a4a, 0, 16, 1.5); flameLight.position.set(0, 0.9, 0.7); flame.add(flameLight);

  const SPARKS = 60, sparkSeed = []; for (let i = 0; i < SPARKS; i++) sparkSeed.push([rnd(), rnd(), rnd(), rnd()]);
  const sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 4), hot(0xffd98a, 3.4), SPARKS); sparks.frustumCulled = false; L.add(sparks);
  // [start, spawn window, life, speed]: the hook flick, the slow-motion look, the real ignition
  const BURSTS = [[T.flick, 0.25, 0.45, 1], [T.sparks1[0], T.sparks1[1] - T.sparks1[0] - 0.9, 1.2, 0.36], [T.spin2[0] + 0.08, 0.5, 0.5, 1]];
  const GAS = 34, gas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), hot(0xbdf3ff, 1.6), GAS); gas.frustumCulled = false; L.add(gas);
  const BUB = 14, bubSeed = []; for (let i = 0; i < BUB; i++) bubSeed.push([rnd(), rnd(), rnd()]);
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf2fdff, transparent: true, opacity: 0.85 }), BUB); bubbles.frustumCulled = false; L.add(bubbles);
  const arrowMat = hot(PAL.accent, 2.0);
  const arrow = (len = 0.7) => { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), arrowMat); st.position.y = 0.25 + len / 2; g.add(st);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 12), arrowMat); tip.rotation.z = Math.PI; tip.position.y = 0.12; g.add(tip); return g; }; // points down (-Y), tip at the origin
  const spinArrow = new THREE.Group(); spinArrow.position.set(WX, WY, 0.12); L.add(spinArrow);
  { const a0 = Math.PI * 0.15, a1 = a0 + Math.PI * 1.0; // counter-clockwise: the top of the wheel moves toward the jet
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.03, 6, 36, a1 - a0), arrowMat); arc.rotation.z = a0; spinArrow.add(arc);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 12), arrowMat); tip.position.set(0.74 * Math.cos(a1), 0.74 * Math.sin(a1), 0); tip.rotation.z = a1; spinArrow.add(tip); }
  const pressArrow = arrow(0.7); L.add(pressArrow);
  const pushArrow = arrow(0.5); pushArrow.rotation.z = Math.PI; L.add(pushArrow); // points up, beside the spring
  const squeeze = []; for (const [x, y] of [[-1, 1.5], [-1, 3.6], [1, 1.5], [1, 3.6]]) { const a = arrow(0.6); a.rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2; a.userData = { x, y }; L.add(a); squeeze.push(a); }

  // ---------- post ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, stencilBuffer: true, samples: opts.msaa ?? (scale < 1 ? 0 : 4) });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  if (opts.bloom ?? true) composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.3, 0.5, 1.6));
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- story curves (all on voiceover time, see beats.js) ----------
  const up = (a, d, t) => ss(a, a + d, t);
  const explode = (t) => ss(T.explode[0], T.explode[1], t) * (1 - ss(T.joinStart, T.joinEnd, t));
  const cutTank = (t) => ss(T.cutTank[0], T.cutTank[1], t) * (1 - up(T.uncut[0], 0.1, t)); // stays open until the whole lighter is cut
  const cutAll = (t) => ss(T.cutAll[0], T.cutAll[1], t) * (1 - ss(T.uncut[0], T.uncut[1], t));
  const press = (t) => win(T.flick - 0.12, T.flickOff + 0.15, t, 0.14) + up(T.press, 0.35, t) * (1 - up(T.release, 0.3, t));
  const lift = (t) => win(T.flick - 0.1, T.flickOff + 0.15, t, 0.14) + up(T.valveOpen, 0.3, t) * (1 - up(T.valveShut, 0.25, t));
  const flameK = (t) => win(T.flick + 0.1, T.flickOff + 0.2, t, 0.12) + up(T.ignite, 0.22, t) * (1 - ss(T.flameOut - 0.3, T.flameOut, t));
  const SPINS = [[T.flick - 0.06, 0.3, 2.6], [T.spin1[0], T.spin1[1] - T.spin1[0], 5.2], [T.spin2[0], T.spin2[1] - T.spin2[0], 2.8]];
  const wheelAngle = (t) => SPINS.reduce((a, [t0, d, ang]) => a + ang * ss(t0, t0 + d, t), 0); // top of the wheel moves toward the jet
  const gasK = (t) => up(T.gasOn, 0.5, t) * (1 - up(T.valveShut, 0.4, t));

  // ---------- camera: eased moves between keys, plus a slow orbit drift so it never sits still ----------
  // [time, camera position, look-at, view offset (fraction of H the subject is lifted above centre)]
  const KEYS = [
    [0, [8, 6.5, 40], [0, 3.8, 0], 0.2], [6.3, [5.5, 6, 31], [0, 4.7, 0], 0.2],
    [T.explode[0], [5.4, 6, 31], [0, 4.7, 0], 0.2], [T.explode[1], [5, 8.4, 54], [0, 6.9, 0], 0.2],
    [T.toTank[0], [5, 8.4, 53.5], [0, 6.9, 0], 0.2], [T.toTank[1] + 0.3, [3.6, 3.8, 25], [0, 2.8, 0], 0.2],
    [T.joinStart, [2.4, 3.3, 23], [0, 2.8, 0], 0.2], [T.joinEnd, [5, 5, 33], [0, 3.8, 0], 0.2],
    [T.toParts[0], [4.6, 5, 32], [0, 3.8, 0], 0.2], [T.toParts[1], [3.6, 6.2, 21], [0.25, 5.4, 0], 0.2],
    [T.toWheel[0], [2.6, 6.1, 20], [0.25, 5.4, 0], 0.2], [T.toWheel[1], [2.4, 7.9, 10.5], [0.05, 6.75, 0], 0.2],
    [T.toLever[0], [1.6, 7.6, 10], [0.05, 6.75, 0], 0.2], [T.toLever[1], [2.6, 7.4, 12.5], [0, 6.5, 0], 0.2],
    [T.toGas[0], [2.2, 7.3, 12], [0, 6.5, 0], 0.2], [T.toGas[1], [3.4, 4.9, 31], [0, 3.9, 0], 0.2],
    [T.toTop[0], [3, 4.9, 30], [0, 3.9, 0], 0.2], [T.toTop[1], [2.4, 7.9, 16.5], [-0.4, 7.0, 0], 0.2],
    [T.toEnd[0], [1.8, 7.7, 16], [-0.4, 7.0, 0], 0.2], [T.toEnd[1], [5.5, 5, 39], [0, 3.8, 0], 0.07],
    [DURATION, [7, 5, 41], [0, 3.8, 0], 0.07],
  ];
  let camO = 0.2; const camP = V(0, 0, 0), camL = V(0, 0, 0), a3 = V(0, 0, 0), b3 = V(0, 0, 0);
  function cam(t) {
    let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
    const k0 = KEYS[i], k1 = KEYS[i + 1], u = ss(k0[0], k1[0], t);
    camP.lerpVectors(a3.fromArray(k0[1]), b3.fromArray(k1[1]), u); camL.lerpVectors(a3.fromArray(k0[2]), b3.fromArray(k1[2]), u); camO = lerp(k0[3], k1[3], u);
    const d = camP.distanceTo(camL); camP.x += Math.sin(t * 0.33) * 0.05 * d; camP.y += Math.sin(t * 0.27 + 1) * 0.02 * d;
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), zhat = V(0, 0, 1), tmp = V(0, 0, 0), vel = V(0, 0, 0), xAxis = V(1, 0, 0), s3 = V(1, 1, 1);
  const put = (mesh, i, p, s) => { m4.compose(p, q.identity(), s3.setScalar(Math.max(1e-4, s))); mesh.setMatrixAt(i, m4); };
  function setPlane(plane, c) { zhat.set(0, 0, 1).applyQuaternion(L.quaternion); plane.normal.copy(zhat).negate(); plane.constant = c + zhat.dot(L.position); }

  function render(t) {
    const e = explode(t), ct = cutTank(t), ca = cutAll(t), p = clamp(press(t)), lf = clamp(lift(t)), fk = clamp(flameK(t)), gk = gasK(t);
    // pose: slow turn while whole; when cut it stays angled so the cut face keeps its depth
    L.rotation.y = lerp(-0.62 + 0.2 * Math.sin(t * 0.5), -0.36 + 0.07 * Math.sin(t * 0.4), Math.max(ct, ca, ss(T.toTank[0], T.toTank[1], t) * (1 - ss(T.uncut[0], T.uncut[1], t))));
    L.position.y = 0.1 * Math.sin(t * 0.9);
    L.updateMatrixWorld(true);
    for (const k in P) P[k].position.copy(P[k].userData.off).multiplyScalar(e);
    // cut planes: c = 1 is in front of everything (whole), c = 0 is the centre plane
    const cT = lerp(1.0, 0.0, Math.max(ct, ca)), cO = lerp(1.0, 0.0, ca);
    setPlane(planeTank, cT > 0.985 ? 99 : cT); setPlane(planeTop, cO > 0.985 ? 99 : cO);
    capRootTank.position.z = cT; capRootTop.position.z = cO;
    for (const [sb, sf, cap, plane] of stencilMeshes) sb.visible = sf.visible = cap.visible = (plane === planeTank ? cT : cO) <= 0.985;
    // the orange sheet rides the moving cut
    const sw = Math.max(win(T.cutTank[0] - 0.3, T.cutTank[1] + 0.35, t, 0.25), win(T.cutAll[0] - 0.3, T.cutAll[1] + 0.35, t, 0.25), win(T.uncut[0] - 0.3, T.uncut[1] + 0.35, t, 0.25));
    const tankOnly = t < T.joinStart;
    sweep.visible = sw > 0.01; sweepFill.material.opacity = 0.18 * sw; sweepEdge.material.opacity = sw;
    sweep.position.set(0, tankOnly ? 2.8 : 3.9, (tankOnly ? cT : cO) + 0.012); sweep.scale.set(tankOnly ? 0.74 : 1, tankOnly ? 0.68 : 1, 1);
    // mechanism
    wheelSpin.rotation.z = wheelAngle(t);
    leverPivot.rotation.z = -0.17 * (0.55 * p + 0.45 * lf); jetBody.position.y = 0.13 * lf;
    const sp = win(T.springPush[0], T.springPush[1], t, 0.3), bounce = sp * 0.5 * (1 - Math.cos((t - T.springPush[0]) * 7.5)); // the spring squeezes and pushes back
    const flintY = WY - 0.4 - 0.25 - 0.07 * bounce; flint.position.set(WX, flintY, 0); spring.scale.y = flintY - 0.25 - 4.78;
    liquid.position.y = 1.43 + 0.015 * Math.sin(t * 1.3);
    liquidMat.emissiveIntensity = liquidCapMat.emissiveIntensity = 0.55 * win(T.gasGlow[0], T.gasGlow[1], t, 0.35) * (0.7 + 0.3 * Math.sin(t * 9)) + 0.25 * win(T.liquidHi[0], T.liquidHi[1], t, 0.25);
    // flame
    flame.visible = fk > 0.01; const fl2 = 1 + 0.07 * Math.sin(t * 23) + 0.05 * Math.sin(t * 37 + 1);
    flame.scale.set(fk * (1 + 0.05 * Math.sin(t * 31)), fk * fl2, fk); flame.rotation.z = 0.05 * Math.sin(t * 11); flameLight.intensity = 16 * fk;
    flame.position.copy(JET_TIP).add(P.jet.position); flame.position.y += 0.13 * lf;
    // sparks: short streaks thrown from the wheel/flint contact toward the jet
    for (let i = 0; i < SPARKS; i++) {
      let shown = false;
      for (const [t0, w, life, spd] of BURSTS) {
        const [r0, r1, r2, r3] = sparkSeed[i], age = t - (t0 + r0 * w); if (age < 0 || age > life) continue;
        const a = age * spd, ang = 2.55 + (r1 - 0.5) * 1.1, v = 2.4 + r2 * 2.6;
        tmp.set(CONTACT.x + Math.cos(ang) * v * a, CONTACT.y + Math.sin(ang) * v * a - 3.0 * a * a, CONTACT.z + (r3 - 0.3) * 1.2 * a);
        vel.set(Math.cos(ang) * v, Math.sin(ang) * v - 6.0 * a, (r3 - 0.3) * 1.2).normalize(); q.setFromUnitVectors(xAxis, vel);
        const k = 1 - age / life; m4.compose(tmp, q, s3.set(3.2 * k + 0.6, 0.9 * k + 0.25, 0.9 * k + 0.25)); sparks.setMatrixAt(i, m4); shown = true; break;
      }
      if (!shown) put(sparks, i, tmp.set(0, -99, 0), 0);
    }
    sparks.instanceMatrix.needsUpdate = true;
    // gas: up the dip tube and out of the jet; the front of the stream climbs after the valve opens
    const front = clamp((t - T.gasOn) / 2.3);
    for (let i = 0; i < GAS; i++) {
      const u = (t * 0.42 + i / GAS) % 1; const y = lerp(0.9, 8.4, u), above = Math.max(0, y - 7.2);
      tmp.set(JX + Math.sin(i * 2.4 + t * 3) * 0.2 * above, y, 0.09 + Math.cos(i * 1.7) * 0.12 * above);
      put(gas, i, tmp, gk * (u <= front ? 1 : 0) * (above > 0 ? Math.max(0, 1.3 - above * 0.7) : 0.8) * (fk > 0.3 && above > 0 ? 0 : 1));
    }
    gas.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < BUB; i++) { const [r0, r1, r2] = bubSeed[i], u = (t * (0.25 + r1 * 0.3) + r0) % 1; put(bubbles, i, tmp.set(JX + (r2 - 0.5) * 0.7, lerp(0.5, 2.6, u), 0.06), gk * (0.5 + r2 * 0.6) * (1 - u * 0.4)); }
    bubbles.instanceMatrix.needsUpdate = true;
    // hint arrows
    const show = (o, k) => { o.visible = k > 0.01; if (o.visible) o.scale.setScalar(k); };
    show(spinArrow, win(T.spin1[0] - 0.4, T.spin1[0] + 2.4, t)); spinArrow.rotation.z = wheelAngle(t) * 0.25;
    show(pressArrow, win(T.press - 0.5, T.valveOpen + 0.3, t)); pressArrow.position.set(1.0, 6.95 + 0.1 * Math.sin(t * 7) - 0.2 * p, 0.45);
    show(pushArrow, sp); pushArrow.position.set(WX + 0.5, 5.9 + 0.12 * bounce, 0.2);
    const sq = win(T.squeeze[0], T.squeeze[1], t, 0.25); for (const a of squeeze) { show(a, sq); a.position.set(a.userData.x * (1.75 - 0.18 * (0.5 - 0.5 * Math.cos((t - T.squeeze[0]) * 9))), a.userData.y, 0.3); }
    // floor dressing
    ring.rotation.z = t * 0.08; dots.rotation.z = -t * 0.2; ringLine.scale.setScalar(1 + 0.03 * Math.sin(t * 1.6));
    blob.material.uniforms.k.value = 1 - 0.4 * e;
    const pa3 = dustGeo.attributes.position; for (let i = 0; i < dustN; i++) { const d = dustSeed[i]; pa3.setXYZ(i, d[0] + Math.sin(t * d[4] + d[3]) * 0.8, d[1] + ((t * d[4] * 0.4) % 2), d[2] + Math.cos(t * d[4] * 0.7 + d[3]) * 0.6); } pa3.needsUpdate = true;
    // camera
    cam(t); camera.position.copy(camP); camera.lookAt(camL);
    camera.setViewOffset(W, H, 0, H * camO, W, H); camera.updateProjectionMatrix();
    composer.render();
  }

  // label anchors: [group that carries it, local point]
  const ANCH = {
    liquid: [tank, V(0.5, 1.5, 0.05)], tube: [head, V(JX, 3.9, 0.08)], shell: [tank, V(-1.22, 4.3, 0.1)],
    wheel: [wheel, V(WX + 0.15, WY + 0.2, 0.1)], flint: [fl, V(WX, 6.45, 0.11)], spring: [fl, V(WX, 5.5, 0.1)], lever: [lever, V(1.0, 6.75, 0.3)],
    jet: [jet, V(JX, 6.65, 0.1)], spark: [L, V(-0.25, 7.0, 0.1)], gas: [L, V(JX, 7.5, 0.1)], flame: [L, V(JX, 7.9, 0.1)],
  };
  function project(name) { const [g, pt] = ANCH[name]; tmp.copy(pt); g.localToWorld(tmp); tmp.project(camera); return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H }; }
  function debug(t) { render(t); return Object.fromEntries(Object.keys(ANCH).map((k) => [k, project(k)])); }
  return { render, project, debug, scene, composer };
}
