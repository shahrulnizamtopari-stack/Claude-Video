// "Lebah Lebih Bijak Dari Ahli Matematik" — cinematic warm look (dark amber, glossy honey, bloom, vignette).
// Everything is a pure function of canonical time t (0..60 s). Periodic motions use periods that divide 60 so the film loops.
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "./lib/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "./lib/jsm/environments/RoomEnvironment.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const pop = (t0, t, d = 0.4) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S0 = (x) => Math.max(0.0001, x);
const TAU = Math.PI * 2;

export function createWorld(canvas, W, H, scale = 1, opts = {}) {
  const FX = { bloom: opts.bloom ?? true, msaa: opts.msaa ?? (scale < 1 ? 0 : 4) };
  const realRandom = Math.random; Math.random = mulberry32(1234);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  const BG = 0x140b05;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(BG); scene.fog = new THREE.Fog(BG, 14, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 400);
  scene.add(new THREE.HemisphereLight(0xffc98a, 0x1a0c04, 0.55));
  const key = new THREE.DirectionalLight(0xffb36b, 2.4); key.position.set(-8, 14, 12); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ab8ff, 1.0); rim.position.set(6, 8, -10); scene.add(rim);
  const camLight = new THREE.PointLight(0xffd29a, 7, 18, 1.8); scene.add(camLight);

  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.25, "rgba(255,255,255,0.5)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);

  // ---------- materials ----------
  const waxM = new THREE.MeshPhysicalMaterial({ color: 0xf0b445, roughness: 0.38, metalness: 0, sheen: 0.6, sheenColor: new THREE.Color(0xffe0a0), emissive: 0x4a2400, emissiveIntensity: 0.12 });
  const honeyM = new THREE.MeshPhysicalMaterial({ color: 0xff9a1a, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, emissive: 0x8a3a00, emissiveIntensity: 0.45, transmission: 0, ior: 1.5 });
  const capM = new THREE.MeshStandardMaterial({ color: 0xf6deaa, roughness: 0.7, emissive: 0x3a2000, emissiveIntensity: 0.3 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x2a1508, roughness: 0.9 });

  // ---------- honeycomb wall (instanced hex tubes, flat-topped, in the plane z = 0, cells open towards +z) ----------
  const R = 0.62, WALL = 0.07, DEPTH = 1.8;
  const hexShape = (r) => { const s = new THREE.Shape(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const p = [Math.cos(a) * r, Math.sin(a) * r]; i ? s.lineTo(...p) : s.moveTo(...p); } s.closePath(); return s; };
  const tubeShape = hexShape(R); tubeShape.holes.push(hexShape(R - WALL));
  const tubeG = new THREE.ExtrudeGeometry(tubeShape, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 1 }); tubeG.translate(0, 0, -DEPTH);
  const honeyG = new THREE.ExtrudeGeometry(hexShape(R - WALL - 0.005), { depth: 1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.03, bevelSegments: 2 }); honeyG.translate(0, 0, -1);
  const capG = new THREE.CylinderGeometry(R - WALL, R - WALL, 0.05, 6); capG.rotateX(Math.PI / 2); capG.rotateZ(Math.PI / 6 * 0);
  const cells = []; { const r = mulberry32(5); const NC = 24, NR = 30;
    for (let c = 0; c < NC; c++) for (let rr = 0; rr < NR; rr++) { const x = (c - NC / 2) * 1.5 * R, y = (rr - NR / 2) * Math.sqrt(3) * R + (c % 2 ? Math.sqrt(3) * R / 2 : 0);
      const v = r(); cells.push({ x, y, fill: v < 0.18 ? 0 : 0.35 + r() * 0.6, cap: v > 0.82, ph: r() }); } }
  const COMB = new THREE.Group(); scene.add(COMB);
  const tubes = new THREE.InstancedMesh(tubeG, waxM, cells.length), fills = new THREE.InstancedMesh(honeyG, honeyM, cells.length), caps = new THREE.InstancedMesh(capG, capM, cells.length);
  { const d = new THREE.Object3D(); cells.forEach((c, i) => { d.position.set(c.x, c.y, 0); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); tubes.setMatrixAt(i, d.matrix);
      d.position.set(c.x, c.y, -DEPTH + 0.05); d.scale.set(1, 1, S0(c.fill * (DEPTH - 0.25))); d.position.z = -DEPTH + 0.05 + c.fill * (DEPTH - 0.25); d.updateMatrix(); fills.setMatrixAt(i, d.matrix);
      d.position.set(c.x, c.y, c.cap ? -0.02 : -999); d.scale.set(1, 1, 1); d.updateMatrix(); caps.setMatrixAt(i, d.matrix); }); }
  COMB.add(tubes); COMB.add(fills); COMB.add(caps);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), darkM); back.position.z = -DEPTH - 0.02; COMB.add(back);

  // ---------- bees ----------
  function makeBee() {
    const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
    const yel = new THREE.MeshPhysicalMaterial({ color: 0xffc21a, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0xfff0b0) }), blk = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.6 });
    const abd = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), yel); abd.scale.set(1.45, 1, 1); abd.position.x = -0.32; body.add(abd);
    for (const [x, s] of [[-0.18, 1.0], [-0.42, 0.92], [-0.64, 0.7]]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.3 * s, 0.07, 8, 24), blk); b.rotation.y = Math.PI / 2; b.position.x = x; body.add(b); }
    const thor = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0x8a5a1a, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color(0xffd28a) })); thor.position.x = 0.12; body.add(thor);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), blk); head.position.x = 0.4; body.add(head);
    for (const z of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.5 })); e.position.set(0.48, 0.05, z); body.add(e);
      const an = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), blk); an.position.set(0.52, 0.22, z * 0.8); an.rotation.z = -0.6; body.add(an); }
    const wingM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false, iridescence: 1, iridescenceIOR: 1.6 });
    const wg = new THREE.CircleGeometry(0.42, 20); wg.scale(1.3, 0.55, 1); wg.translate(-0.25, 0, 0);
    const wings = []; for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(0.12, 0.2, s * 0.12); const w = new THREE.Mesh(wg, wingM); w.rotation.x = Math.PI / 2; w.position.z = s * 0.38; piv.add(w); body.add(piv); wings.push({ piv, s }); }
    g.userData.wings = wings; g.scale.setScalar(1); scene.add(g); return g; }
  const hero = makeBee();
  const swarm = Array.from({ length: 7 }, () => makeBee());
  // wax flakes (from the hero's abdomen)
  const flakeM = new THREE.MeshPhysicalMaterial({ color: 0xfff3d6, roughness: 0.3, transmission: 0.3, transparent: true, opacity: 0.95, emissive: 0x6a5a30, emissiveIntensity: 0.4 });
  const flakes = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.09, 6), flakeM); m.material.side = THREE.DoubleSide; scene.add(m); return m; });

  // ---------- balance scale (wax vs honey) ----------
  const SCALE = new THREE.Group(); scene.add(SCALE); SCALE.position.set(0, -1.2, 6);
  const goldM = new THREE.MeshPhysicalMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.22, clearcoat: 0.6 });
  { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.2, 20), goldM); post.position.y = 1.6; SCALE.add(post);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.25, 32), goldM); SCALE.add(base); }
  const beam = new THREE.Group(); beam.position.y = 3.25; SCALE.add(beam);
  { const b = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.09, 0.09), goldM); beam.add(b); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), goldM); beam.add(knob); }
  const pans = [-1, 1].map((s) => { const g = new THREE.Group(); scene.add(g);
    const pan = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 12, 0, TAU, Math.PI * 0.62, Math.PI * 0.38), goldM); pan.material.side = THREE.DoubleSide; g.add(pan);
    for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.35, 4), goldM); str.position.set(Math.cos(a) * 0.32, 0.25, Math.sin(a) * 0.32); str.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); g.add(str); }
    return { g, s }; });
  const waxBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 6), flakeM); scene.add(waxBlock);
  const drops = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), honeyM); m.scale.set(1, 1.25, 1); scene.add(m); return m; });

  // ---------- shape lab (x = 60): circles, triangles, squares, hexagons ----------
  const LAB = new THREE.Group(); LAB.position.set(60, 0, 0); scene.add(LAB);
  const labBack = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), new THREE.MeshStandardMaterial({ color: 0x1d1008, roughness: 0.95 })); labBack.position.z = -0.4; LAB.add(labBack);
  const gapM = new THREE.MeshBasicMaterial({ color: 0xff3b2a, transparent: true, opacity: 0, toneMapped: false });
  const circleGap = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 6.8), gapM); circleGap.position.z = -0.2; LAB.add(circleGap);
  const tileM = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.35, sheen: 0.5, sheenColor: new THREE.Color(0xffe0a0), emissive: 0x3a1c00, emissiveIntensity: 0.3 });
  function tiling(kind, cx, cy, size, mat) {
    const g = new THREE.Group(); g.position.set(cx, cy, 0); LAB.add(g); const items = [];
    const prism = (shape) => { const ge = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 }); return ge; };
    const gap = 0.07;
    if (kind === "circle") { const geo = new THREE.CylinderGeometry(size / 2 - 0.02, size / 2 - 0.02, 0.35, 48).rotateX(Math.PI / 2);
      for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) { const m = new THREE.Mesh(geo, mat); m.position.set(i * size, j * size, 0); g.add(m); items.push(m); } }
    if (kind === "square") { const s = new THREE.Shape(); const h = size / 2 - gap; s.moveTo(-h, -h); s.lineTo(h, -h); s.lineTo(h, h); s.lineTo(-h, h); s.closePath(); const geo = prism(s);
      for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) { const m = new THREE.Mesh(geo, mat); m.position.set(i * size, j * size, 0); g.add(m); items.push(m); } }
    if (kind === "tri") { const a = size; const hgt = a * Math.sqrt(3) / 2; const s = new THREE.Shape(); const k = 0.9; s.moveTo(-a / 2 * k, -hgt / 3 * k); s.lineTo(a / 2 * k, -hgt / 3 * k); s.lineTo(0, hgt * 2 / 3 * k); s.closePath(); const geo = prism(s);
      for (let i = -6; i <= 6; i++) for (let j = -1; j <= 1; j++) { const up = (i + j) % 2 === 0; const m = new THREE.Mesh(geo, mat); m.position.set(i * a / 2, j * hgt + (up ? 0 : hgt / 3), 0); if (!up) m.rotation.z = Math.PI; g.add(m); items.push(m); } }
    if (kind === "hex") { const r = size / Math.sqrt(3); const geo = prism(hexShape(r - gap)); geo.rotateZ(Math.PI / 6);
      for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) { const m = new THREE.Mesh(geo, mat); m.position.set(i * size + (j % 2 ? size / 2 : 0), j * size * Math.sqrt(3) / 2, 0); g.add(m); items.push(m); } }
    g.userData.items = items; return g; }
  const circles = tiling("circle", 0, 0, 1.15, tileM(0xe8b04a));
  const triG = tiling("tri", 0, 3.6, 1.3, tileM(0xd99a3a)), sqG = tiling("square", 0, 0, 1.05, tileM(0xd99a3a)), hexG = tiling("hex", 0, -3.6, 1.1, tileM(0xf0b445));
  const hexFill = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 6).rotateX(Math.PI / 2).rotateZ(0), honeyM, 30); hexFill.frustumCulled = false; LAB.add(hexFill);

  // ---------- comb section (x = 120): two layers back-to-back, cells tilted up ----------
  const SEC = new THREE.Group(); SEC.position.set(120, 0, 0); scene.add(SEC);
  const midM = new THREE.MeshStandardMaterial({ color: 0xf6c35a, roughness: 0.4, emissive: 0xff8a00, emissiveIntensity: 0 });
  const sharedM = new THREE.MeshStandardMaterial({ color: 0xf0b445, roughness: 0.4, emissive: 0xffa020, emissiveIntensity: 0 });
  { const mid = new THREE.Mesh(new THREE.BoxGeometry(0.16, 9.6, 1.2), midM); SEC.add(mid);
    const tilt = 0.2; const L = 2.6, gapY = 1.15;
    for (const side of [-1, 1]) for (let k = -4; k <= 4; k++) { const g = new THREE.Group(); g.position.set(side * 0.08, k * gapY, 0); g.rotation.z = side > 0 ? tilt : -tilt; SEC.add(g);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(L, 0.09, 1.2), sharedM); wall.position.set(side * L / 2, gapY / 2, 0); g.add(wall);
      if (k === -4) { const w2 = wall.clone(); w2.position.y = -gapY / 2; g.add(w2); }
      const hn = new THREE.Mesh(new THREE.BoxGeometry(L * 0.72, gapY - 0.14, 1.0), honeyM); hn.position.set(side * L * 0.38, 0, 0); g.add(hn); } }

  // ---------- pollen motes + honey drip ----------
  const NP = 220;
  const motes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd88a, toneMapped: false, transparent: true, opacity: 0.9 }), NP); motes.frustumCulled = false; scene.add(motes);
  const drip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), honeyM); scene.add(drip);
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 1, 12), honeyM); scene.add(thread);
  const DRIP_AT = V(cells[0] ? 0.93 : 0, -0.54, 0.12);

  // ---------- post: bloom + warm grade, vignette, grain ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  if (FX.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.55, 0.5, 0.92));
  const finish = new ShaderPass({ uniforms: { tDiffuse: { value: null }, seed: { value: 0 }, res: { value: new THREE.Vector2(RW, RH) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float seed; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + seed) * 43758.5453); }
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
        c = pow(c, vec3(0.98, 1.0, 1.06)); c *= vec3(1.04, 1.0, 0.94);                       // warm grade
        vec2 q = vUv - 0.5; q.x *= res.x / res.y; c *= mix(0.55, 1.0, smoothstep(0.85, 0.25, length(q)));   // vignette
        c += (h(vUv * res) - 0.5) * 0.025;                                                     // fine grain
        gl_FragColor = vec4(c, 1.0); }` });
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- camera ----------
  const LB = (x, y, z) => V(60 + x, y, z), SC = (x, y, z) => V(120 + x, y, z);
  const K0 = { pos: V(-1.6, 1.2, 4.6), look: V(0.6, -0.2, 0), fov: 36 };
  const keys = [
    { t: 0, ...K0 },
    { t: 3.6, pos: V(-0.6, 0.6, 3.9), look: V(1.2, -0.4, 0), fov: 36 },
    { t: 6.6, pos: V(0.6, 0.2, 4.4), look: V(1.4, -0.6, 0), fov: 36 },
    { t: 8.0, pos: V(0.2, 3.6, 9.6), look: V(-1.4, 3.2, 5.0), fov: 36 },
    { t: 10.8, pos: V(-0.4, 2.0, 14.5), look: V(-0.4, 1.8, 5.5), fov: 36 },
    { t: 14.8, pos: V(-0.2, 1.8, 14.0), look: V(-0.2, 1.6, 5.8), fov: 36 },
    { t: 16.0, pos: LB(0, 0, 13), look: LB(0, 0, 0), fov: 36 },
    { t: 20.4, pos: LB(0.4, 0.2, 12.4), look: LB(0, 0, 0), fov: 36 },
    { t: 24.0, pos: LB(0, 0, 18.5), look: LB(0, 0, 0), fov: 36 },
    { t: 35.6, pos: LB(0.4, -0.6, 17.5), look: LB(0, -0.4, 0), fov: 36 },
    { t: 36.8, pos: SC(4.4, 1.0, 11.5), look: SC(0, 0, 0), fov: 36 },
    { t: 44.6, pos: SC(5.2, 1.6, 10.5), look: SC(0.4, 0.4, 0), fov: 36 },
    { t: 46.0, pos: V(-3.0, 2.6, 9.0), look: V(0, 0.4, 0), fov: 36 },
    { t: 51.8, pos: V(-2.4, 2.2, 8.2), look: V(0, 0.2, 0), fov: 36 },
    { t: 56.6, pos: V(-1.0, 0.6, 15), look: V(0, 0.2, 0), fov: 36 },
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

  const dummy = new THREE.Object3D();
  const flyBee = (b, pos, dir, t, flap = 1) => { b.position.copy(pos); const yaw = Math.atan2(-dir.z, dir.x); b.rotation.set(0, yaw, 0); b.children[0].rotation.z = clamp(dir.y, -0.5, 0.5) * 0.6 + 0.05 * Math.sin(t * 6);
    b.userData.wings.forEach(({ piv, s }) => (piv.rotation.x = s * (0.15 + 0.75 * flap * (0.5 + 0.5 * Math.sin(t * TAU * 40))))); };
  // periodic bee paths (period divides 60)
  const swarmPath = (i, t) => { const r = mulberry32(i * 9 + 1); const P = [10, 12, 15, 20, 30][i % 5]; const a = TAU * t / P + r() * TAU;
    const c = V((r() - 0.5) * 8, (r() - 0.5) * 9, 1.4 + r() * 3); return c.add(V(Math.cos(a) * (2 + r() * 2), Math.sin(a * 2) * 1.2, Math.sin(a) * 1.0)); };

  function render(t) {
    t = clamp(t, 0, 60);
    const cam = camAt(t); camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, -H * 0.03, W, H); camera.updateProjectionMatrix();
    camLight.position.copy(camera.position).add(V(1.5, 2, 0));
    finish.uniforms.seed.value = (Math.round(t * 30) % 97) * 0.37;
    // hero bee: hook flight across the comb, then hovering for the wax scene, then off
    { let p, d, f = 1; const vis = (t < 15.4) || (t > 52.6);
      if (t < 7.2) { const u = (t + 60 - 52.6) / 14; p = V(lerp(-4.5, 4.5, u), 0.3 + 0.4 * Math.sin(u * 9), 2.0 + 0.4 * Math.sin(u * 5)); d = V(1, 0.1 * Math.cos(u * 9), 0); }
      else if (t < 15.4) { p = V(-1.6 + 0.08 * Math.sin(t * 3), 3.4 + 0.12 * Math.sin(t * 2.2), 5.2); d = V(0.6, 0, 1).normalize(); }
      else { const u = (t - 52.6) / 14; p = V(lerp(-4.5, 4.5, u), 0.3 + 0.4 * Math.sin(u * 9), 2.0 + 0.4 * Math.sin(u * 5)); d = V(1, 0.1 * Math.cos(u * 9), 0); }
      hero.visible = vis; if (vis) flyBee(hero, p, d, t, f); hero.scale.setScalar(t > 7.2 && t < 15.4 ? 1.1 : 1); }
    swarm.forEach((b, i) => { const on = (t < 6.6 || t > 45.8) && i < (t > 52 ? 7 : 4); b.visible = on; if (!on) return; const p = swarmPath(i, t), p2 = swarmPath(i, t + 0.05); flyBee(b, p, p2.clone().sub(p).normalize(), t + i); });
    // wax flakes slide out of the hero's abdomen and drift onto the scale pan
    flakes.forEach((f, i) => { const t0 = 9.4 + i * 0.35; const on = t > t0 && t < 15.2; f.visible = on; if (!on) return; const u = clamp((t - t0) / 1.2);
      const start = hero.position.clone().add(V(-0.7, -0.4, 0)); const end = V(-2.1 + (i - 1.5) * 0.12, 1.1 + i * 0.03, 6.0);
      f.position.copy(start.lerp(end, ss(0, 1, u))); f.rotation.set(t * 2 + i, t * 1.5, 0); f.scale.setScalar(S0(pop(t0, t, 0.3)) * 1.4); });
    // balance scale: appears at 10.0, wax on the left, honey drops pop in on the right at 13.1-14.1, beam settles level
    const sOn = t > 9.6 && t < 15.6; SCALE.visible = sOn; SCALE.scale.setScalar(S0(pop(9.6, t, 0.5)) * (1 - ss(15.0, 15.6, t)));
    const nd = Math.round(clamp((t - 12.9) / 0.18, 0, 8)); const tiltB = sOn ? (-0.32 * ss(10.4, 11.0, t) + 0.32 * ss(13.0, 14.3, t)) + 0.02 * Math.sin(t * 3) : 0;
    beam.rotation.z = tiltB;
    pans.forEach(({ g, s }) => { g.visible = sOn; const end = V(s * 2.05, 0, 0).applyEuler(new THREE.Euler(0, 0, tiltB)).add(V(0, 3.25, 0)); g.position.copy(SCALE.position).add(end.multiplyScalar(SCALE.scale.x)).add(V(0, -1.1 * SCALE.scale.x, 0)); g.scale.setScalar(SCALE.scale.x); });
    waxBlock.visible = sOn && t > 10.4; waxBlock.position.copy(pans[0].g.position).add(V(0, -0.38, 0)); waxBlock.scale.setScalar(S0(pop(10.4, t, 0.35)) * SCALE.scale.x);
    drops.forEach((dp, i) => { const on = sOn && i < nd; dp.visible = on; if (!on) return; const r = mulberry32(i + 3); dp.position.copy(pans[1].g.position).add(V((r() - 0.5) * 0.7, -0.35 + Math.floor(i / 4) * 0.2, (r() - 0.5) * 0.5)); dp.scale.set(1, 1.2, 1).multiplyScalar(S0(pop(12.9 + i * 0.18, t, 0.3)) * SCALE.scale.x); });
    // shape lab
    const circOn = ss(17.2, 17.6, t) * (1 - ss(20.4, 20.8, t)); circles.visible = circOn > 0.01; circles.scale.setScalar(S0(circOn)); gapM.opacity = 0.9 * ss(18.3, 18.8, t) * (1 - ss(20.4, 20.8, t)) * (0.75 + 0.25 * Math.sin(t * 8));
    [[triG, 21.2, 25.0], [sqG, 21.7, 26.0], [hexG, 22.2, 27.4]].forEach(([g, t0, tn]) => { const on = t > t0 - 0.05 && t < 36.2; g.visible = on; g.userData.items.forEach((m, i) => m.scale.setScalar(S0(pop(t0 + i * 0.012, t, 0.35)) * (1 + 0.08 * Math.exp(-Math.max(0, t - tn) * 4) * (t > tn ? 1 : 0)))); });
    const win = ss(31.4, 31.9, t); const nameGlow = (tn) => (t > tn ? Math.exp(-(t - tn) * 1.5) : 0); triG.userData.items.forEach((m) => (m.material.emissiveIntensity = (0.15 + 1.2 * nameGlow(25.0)) * (1 - win * 0.8))); sqG.userData.items.forEach((m) => (m.material.emissiveIntensity = (0.15 + 1.2 * nameGlow(26.0)) * (1 - win * 0.8)));
    hexG.userData.items.forEach((m) => (m.material.emissiveIntensity = 0.15 + 1.2 * nameGlow(27.4) + 1.0 * win * (0.8 + 0.2 * Math.sin(t * 4))));
    triG.userData.items[0].material.color.set(0xd99a3a).lerp(new THREE.Color(0x6b4a24), win * 0.7);
    { let q = 0; const fill = ss(33.8, 35.2, t) * (1 - ss(35.8, 36.2, t)); hexG.userData.items.forEach((m) => { if (q >= 30) return; dummy.position.copy(m.position).add(hexG.position).add(V(0, 0, 0.42)); dummy.rotation.set(0, 0, Math.PI / 6 * 0); dummy.scale.set(S0(fill), S0(fill), 1); dummy.updateMatrix(); hexFill.setMatrixAt(q++, dummy.matrix); });
      for (; q < 30; q++) { dummy.position.set(0, -999, 0); dummy.updateMatrix(); hexFill.setMatrixAt(q, dummy.matrix); } hexFill.instanceMatrix.needsUpdate = true; }
    // comb section: shared walls light up one by one; mid-rib glows
    sharedM.emissiveIntensity = 1.4 * ss(36.6, 37.4, t) * (1 - ss(39.0, 39.6, t)) * (0.7 + 0.3 * Math.sin(t * 6)); midM.emissiveIntensity = 0.8 * ss(37.5, 38.2, t) * (1 - ss(40.4, 41.0, t));
    // pollen motes (periodic drift, 20 s period)
    for (let i = 0; i < NP; i++) { const r = mulberry32(i * 3 + 11); const ph = r(); const base = camera.position.clone().add(V((r() - 0.5) * 9, (r() - 0.5) * 14, -2 - r() * 10));
      const u = ((t / 20) + ph) % 1; dummy.position.copy(base).add(V(Math.sin(u * TAU + i) * 0.6, (u - 0.5) * 3, Math.cos(u * TAU * 2 + i) * 0.4)); dummy.scale.setScalar(0.6 + r() * 1.4 * (0.5 + 0.5 * Math.sin(u * TAU * 3 + i))); dummy.updateMatrix(); motes.setMatrixAt(i, dummy.matrix); }
    motes.instanceMatrix.needsUpdate = true;
    // honey drip: 6 s cycle from a cell edge near the hook view (slow-motion stretch, fall)
    { const u = (t % 6) / 6; const top = V(0.93, -0.5, 0.08); const stretch = ss(0.0, 0.62, u), fall = clamp((u - 0.62) / 0.38);
      const dy = 0.15 + stretch * 0.55 + fall * fall * 6; drip.position.copy(top).add(V(0, -dy, 0)); drip.scale.set(1 - 0.15 * stretch, 1 + 0.5 * stretch, 1 - 0.15 * stretch).multiplyScalar(0.7 + 0.5 * stretch);
      const tl = fall > 0 ? Math.max(0.01, 0.4 * (1 - fall * 3)) : dy; thread.visible = tl > 0.02; thread.scale.set(1 - 0.5 * stretch, tl, 1 - 0.5 * stretch); thread.position.copy(top).add(V(0, -tl / 2, 0)); drip.visible = dy < 6; }
    composer.render();
    const out = { t, anchors: {} }; const A = out.anchors;
    A["cell"] = proj(V(cells[300].x, cells[300].y, 0.05)); A["flake"] = proj(waxBlock.position.clone().add(V(0, 0.2, 0))); A["drops"] = proj(pans[1].g.position.clone().add(V(0.3, -0.1, 0)));
    A["gap"] = proj(LB(0.575, 0.575, 0.1)); A["tri"] = proj(LB(2.4, 3.6, 0.4)); A["sq"] = proj(LB(2.6, 0, 0.4)); A["hex"] = proj(LB(2.6, -3.6, 0.4));
    A["shared"] = proj(SC(1.4, 0.6, 0.6)); A["tilt"] = proj(SC(-2.2, -0.2, 0.6)); A["mid"] = proj(SC(0, 3.4, 0.6));
    return out;
  }
  function debug(t) { const o = render(t); return { t, cam: camera.position.toArray().map((x) => +x.toFixed(2)), anchors: Object.fromEntries(Object.entries(o.anchors).map(([k, v]) => [k, v.map((x) => Math.round(x))])) }; }
  return { render, debug };
}
