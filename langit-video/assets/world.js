// "Kenapa Langit Biru?" — v3 look. Everything is a pure function of canonical time t (0..60 s).
// Stages: landscape (origin), prism lab (x=400), air molecules (x=800), Earth from space (x=1400), Moon (x=2200).
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "./lib/jsm/environments/RoomEnvironment.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const pop = (t0, t, d = 0.4) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S0 = (x) => Math.max(0.0001, x);
const C = (h) => new THREE.Color(h);

const SPEC = [0xff3b30, 0xff8a1f, 0xffd60a, 0x34c759, 0x2f6bff, 0x8a3cff]; // merah, jingga, kuning, hijau, biru, ungu
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o });

export function createWorld(canvas, W, H, scale = 1, opts = {}) {
  const FX = { bloom: opts.bloom ?? true, msaa: opts.msaa ?? (scale < 1 ? 0 : 4) };
  const realRandom = Math.random; Math.random = mulberry32(1234);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xa8d0ff, 300, 900);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45;
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 6000);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9d2c4, 1.0); scene.add(hemi);
  const sunL = new THREE.DirectionalLight(0xffffff, 2.0); sunL.position.set(-60, 120, 40); scene.add(sunL);
  const inkM = new THREE.LineBasicMaterial({ color: 0x15171c, transparent: true, opacity: 0.85 });
  const edges = (mesh, thr = 30) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, thr), inkM); mesh.add(l); return l; };
  const add = (parent, geo, m, pos, e = 30) => { const o = new THREE.Mesh(geo, m); if (pos) o.position.copy(pos); parent.add(o); if (e) edges(o, e); return o; };
  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.3, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, size, op = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false, fog: false })); s.scale.set(size, size, 1); return s; };

  // ---------- sky dome (follows the camera); colours driven per scene ----------
  const skyU = { top: { value: C(0x2f6fe0) }, hor: { value: C(0xa8d0ff) }, low: { value: C(0xe8eef8) } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top, hor, low; varying vec3 vD; void main(){ float h = vD.y; vec3 c = h > 0.0 ? mix(hor, top, pow(smoothstep(0.0, 0.7, h), 0.8)) : mix(hor, low, smoothstep(0.0, -0.2, h)); gl_FragColor = vec4(c, 1.0); }` }));
  scene.add(sky);
  const stars = new THREE.Group(); scene.add(stars);
  const starM = new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0 });
  { const N = 1100; const p = new Float32Array(N * 3); const r = mulberry32(3);
    for (let i = 0; i < N; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2; const rr = Math.sqrt(1 - u * u); p[i * 3] = Math.cos(a) * rr * 4500; p[i * 3 + 1] = u * 4500; p[i * 3 + 2] = Math.sin(a) * rr * 4500; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); stars.add(new THREE.Points(g, starM)); }

  // ---------- landscape: sea (x<0) and desert (x>0), a person ----------
  const LAND = new THREE.Group(); scene.add(LAND);
  { const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 1400, 60, 60).rotateX(-Math.PI / 2), mat(0x2f7fd0, { roughness: 0.15, metalness: 0.2 })); sea.position.set(-450, -0.4, -500); LAND.add(sea);
    const sg = new THREE.PlaneGeometry(260, 1400, 40, 80).rotateX(-Math.PI / 2); const p = sg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.max(0, (x + 130) * 0.02) * (2.2 + 1.6 * Math.sin(x * 0.05 + z * 0.02) * Math.sin(z * 0.035))); } sg.computeVertexNormals();
    const sand = new THREE.Mesh(sg, mat(0xe8c48a, { roughness: 0.95, flatShading: true })); sand.position.set(130, -0.2, -500); LAND.add(sand);
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(14, 1400).rotateX(-Math.PI / 2), mat(0xf0d9a8)); beach.position.set(0, -0.1, -500); LAND.add(beach); }
  const duskSun = glow(0xff9a4a, 160, 0); duskSun.position.set(-120, 18, -520); LAND.add(duskSun);
  const PERSON = new THREE.Group(); PERSON.position.set(1, 0, 10); LAND.add(PERSON);
  { add(PERSON, new THREE.CapsuleGeometry(0.9, 2.6, 6, 16), mat(0xff7a3d), V(0, 3.0, 0), 50); add(PERSON, new THREE.SphereGeometry(0.85, 24, 16), mat(0xf0c9a0), V(0, 5.7, 0), 50);
    for (const sx of [-1, 1]) add(PERSON, new THREE.CapsuleGeometry(0.36, 1.8, 4, 10), mat(0x3b4150), V(sx * 0.42, 1.1, 0), 50); }
  const EYE = V(1, 5.8, 10.6);

  // ---------- prism lab (x = 400) ----------
  const LAB = new THREE.Group(); LAB.position.set(400, 0, 0); scene.add(LAB);
  add(LAB, new THREE.BoxGeometry(70, 1, 40), mat(0xe9edf4, { roughness: 0.9 }), V(0, -0.5, 0), 30);
  { const tri = new THREE.Shape([new THREE.Vector2(-3.2, 0), new THREE.Vector2(3.2, 0), new THREE.Vector2(0, 5.6)].map((v) => v)); const g = new THREE.ExtrudeGeometry(tri, { depth: 5, bevelEnabled: false }); g.translate(0, 0, -2.5);
    add(LAB, g, new THREE.MeshPhysicalMaterial({ color: 0xdfeaff, roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false }), V(0, 0.01, 0), 30); }
  const beam = (c, w = 0.35) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, w, w), new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true, opacity: 0.95 })); LAB.add(m); return m; };
  const whiteBeam = beam(0xffffff, 0.55); const fan = SPEC.map((c) => beam(c));
  const setBeam = (m, a, b) => { const d = b.clone().sub(a); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(Math.max(0.01, d.length()), 1, 1); m.quaternion.setFromUnitVectors(V(1, 0, 0), d.normalize()); };

  // ---------- air molecules (x = 800) ----------
  const MOL = new THREE.Group(); MOL.position.set(800, 0, 0); scene.add(MOL);
  const mols = [];
  { const r = mulberry32(21); const nM = mat(0x8a9bb8, { roughness: 0.35 }), oM = mat(0xe5483a, { roughness: 0.35 });
    for (let i = 0; i < 22; i++) { const g = new THREE.Group(); const m = i % 4 === 0 ? oM : nM;
      for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), m); a.position.x = s * 0.36; g.add(a); edges(a, 60); }
      g.position.set((r() - 0.5) * 22, 8 + (r() - 0.5) * 14, (r() - 0.5) * 6); g.rotation.set(r() * 6, r() * 6, r() * 6); MOL.add(g); mols.push({ g, ph: r() * 6 }); }
    mols[0].g.position.set(0.5, 8, 0); }
  const HIT = V(800.5, 8, 0);
  const NWD = 1400;
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NWD);
  dots.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NWD * 3), 3); dots.frustumCulled = false; scene.add(dots);

  // ---------- Earth from space (x = 1400) ----------
  const EARTH = new THREE.Group(); EARTH.position.set(1400, 40, -40); scene.add(EARTH);
  const ER = 18;
  add(EARTH, new THREE.SphereGeometry(ER, 48, 32), mat(0x2f7fd0, { roughness: 0.6, emissive: 0x0b2a5a, emissiveIntensity: 0.4 }), V(0, 0, 0), 0);
  { const r = mulberry32(7); for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.004, 16, 12, r() * 6, 0.5 + r() * 0.6, 0.6 + r() * 1.2, 0.4 + r() * 0.5), mat(0x4fa15a, { roughness: 0.8 })); EARTH.add(c); } }
  const atm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.22, 48, 32), new THREE.MeshBasicMaterial({ color: 0x7fb6ff, transparent: true, opacity: 0.22, depthWrite: false })); EARTH.add(atm);
  const atmRing = new THREE.Mesh(new THREE.TorusGeometry(ER * 1.22, 0.12, 6, 96), new THREE.MeshBasicMaterial({ color: 0x9cc8ff, toneMapped: false })); EARTH.add(atmRing);
  const eSun = glow(0xfff1c0, 60, 1); eSun.position.set(-120, 0, 0); EARTH.add(eSun);
  // observers: noon at the top (sun overhead from the left -> we put the sun to the left, so the noon point faces left)
  const NOON = V(-ER, 0, 0), DUSK = V(0, ER, 0);
  const obs = (p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); m.position.copy(p); EARTH.add(m); return m; };
  obs(NOON); obs(DUSK);

  // ---------- Moon (x = 2200) ----------
  const MOON = new THREE.Group(); MOON.position.set(2200, 0, 0); scene.add(MOON);
  { const g = new THREE.PlaneGeometry(300, 300, 90, 90).rotateX(-Math.PI / 2); const p = g.attributes.position; const r = mulberry32(31);
    const craters = Array.from({ length: 40 }, () => [(r() - 0.5) * 200, (r() - 0.5) * 200, 2 + r() * 9]);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = 0.4 * Math.sin(x * 0.2) * Math.sin(z * 0.17);
      for (const [cx2, cz, cr] of craters) { const d = Math.hypot(x - cx2, z - cz) / cr; if (d < 1.3) y += d < 1 ? -0.6 * cr * 0.25 * (1 - d * d) : 0.15 * cr * (1.3 - d); } p.setY(i, y); }
    g.computeVertexNormals(); const ground = new THREE.Mesh(g, mat(0x6c6c74, { roughness: 1, flatShading: true })); MOON.add(ground);
    add(MOON, new THREE.CylinderGeometry(0.08, 0.08, 6, 8), mat(0xdfe3ea), V(4, 3, -8), 0); add(MOON, new THREE.BoxGeometry(3, 1.8, 0.05), mat(0xe5483a), V(5.5, 5.0, -8), 30); }
  const moonSun = glow(0xffffff, 46, 1); MOON.add(moonSun); moonSun.position.set(-40, 75, -260);
  const moonEarth = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 20), mat(0x3f86e0, { emissive: 0x1d4fa0, emissiveIntensity: 0.6 })); moonEarth.position.set(30, 95, -300); MOON.add(moonEarth);

  // ---------- post ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  if (FX.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.35, 0.4, 1.2));
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- camera ----------
  const L = (x, y, z) => V(400 + x, y, z), M = (x, y, z) => V(800 + x, y, z), E = (x, y, z) => V(1400 + x, 40 + y, -40 + z), MO = (x, y, z) => V(2200 + x, y, z);
  const K0 = { pos: V(-18, 7, 46), look: V(-30, 16, -60), fov: 40 };
  const keys = [
    { t: 0, ...K0 },
    { t: 3.4, pos: V(-14, 7, 44), look: V(-26, 16, -60), fov: 40 },
    { t: 5.4, pos: V(18, 8, 44), look: V(34, 16, -60), fov: 40 },
    { t: 7.0, pos: L(2, 12, 46), look: L(1, 4, 0), fov: 40 },
    { t: 12.8, pos: L(4, 13, 44), look: L(3, 4, 0), fov: 40 },
    { t: 14.4, pos: M(0, 10, 40), look: M(0, 8, 0), fov: 40 },
    { t: 27.6, pos: M(-2, 10, 38), look: M(0, 8, 0), fov: 40 },
    { t: 29.2, pos: V(10, 4, 36), look: V(-3, 12, -10), fov: 40 },
    { t: 33.6, pos: V(11, 4.5, 38), look: V(-3, 12, -10), fov: 40 },
    { t: 35.0, pos: M(0, 10, 46), look: M(0, 8, 0), fov: 40 },
    { t: 41.6, pos: M(0, 10, 48), look: M(0, 8, 0), fov: 40 },
    { t: 43.0, pos: E(-26, 10, 150), look: E(-22, 6, 0), fov: 40 },
    { t: 46.8, pos: E(-24, 10, 146), look: E(-20, 6, 0), fov: 40 },
    { t: 48.0, pos: V(-16, 6, 42), look: V(-34, 12, -60), fov: 40 },
    { t: 49.8, pos: V(-15, 6, 41), look: V(-34, 12, -60), fov: 40 },
    { t: 51.0, pos: MO(0, 6, 30), look: MO(-10, 18, -60), fov: 40 },
    { t: 54.8, pos: MO(2, 6, 28), look: MO(-10, 18, -60), fov: 40 },
    { t: 56.4, pos: V(-17, 7, 45), look: V(-30, 16, -60), fov: 40 },
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

  // sky palettes per scene
  const PALS = { day: [0x2f6fe0, 0xa8d0ff, 0xe8eef8], lab: [0xdfe5f1, 0xeef1f8, 0xeef1f8], space: [0x03050c, 0x05070f, 0x03050c], dusk: [0x2b2f6e, 0xff8a3d, 0x6a3a3a] };
  const scenePal = (t) => (t < 6.4 ? "day" : t < 28.6 ? "lab" : t < 34.4 ? "day" : t < 42.4 ? "lab" : t < 47.4 ? "space" : t < 50.4 ? "dusk" : t < 55.6 ? "space" : "day");
  const cA = new THREE.Color(), cB = new THREE.Color();
  const dummy = new THREE.Object3D(); const col = new THREE.Color();
  const hideD = (i) => { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix); };

  function render(t) {
    t = clamp(t, 0, 60);
    const cam = camAt(t); camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, -H * 0.04, W, H); camera.updateProjectionMatrix();
    sky.position.copy(camera.position); stars.position.copy(camera.position);
    // sky colours: blend over 0.5 s around each scene change
    const p0 = PALS[scenePal(t - 0.25)], p1 = PALS[scenePal(t + 0.25)]; const bl = scenePal(t - 0.25) === scenePal(t + 0.25) ? 0 : 0.5;
    ["top", "hor", "low"].forEach((k, i) => skyU[k].value.copy(cA.set(p0[i]).lerp(cB.set(p1[i]), bl)));
    const dark = scenePal(t) === "space" ? 1 : 0; starM.opacity = dark;
    scene.fog.color.copy(skyU.hor.value); scene.fog.near = dark ? 3000 : 300; scene.fog.far = dark ? 6000 : 900;
    hemi.intensity = scenePal(t) === "dusk" ? 0.6 : 1.0; duskSun.material.opacity = scenePal(t) === "dusk" ? 1 : 0; sunL.color.set(scenePal(t) === "dusk" ? 0xff9a5a : 0xffffff);
    // prism beams: white beam in, colours fan out one by one with the words
    { const inA = V(-30, 2.8, 0), hit = V(-1.4, 2.8, 0); setBeam(whiteBeam, inA, inA.clone().lerp(hit, ss(6.0, 6.8, t)));
      const times = [10.5, 10.9, 11.3, 11.7, 12.1, 12.5];
      fan.forEach((b, i) => { const g = ss(Math.min(times[i], 8.6), times[i] + 0.3, t) * 0.4 + ss(times[i] - 0.1, times[i] + 0.3, t) * 0.6; const ex = V(1.4, 2.6, 0);
        const end = V(30, 2.6 - (i - 2.5) * 2.4 - 3, 0); setBeam(b, ex, ex.clone().lerp(end, g * ss(8.6, 9.2, t))); b.visible = t > 8.6; }); }
    // molecules wobble
    mols.forEach((m, i) => { m.g.rotation.z += 0; m.g.position.y += 0; m.g.rotation.y = m.ph + t * 0.6; });
    // dots: red long wave straight through; blue short wave hits a molecule and scatters everywhere; plus scenes reuse them
    let q = 0;
    const molOn = t > 14 && t < 28.4;
    if (molOn) {
      const red = ss(18.4, 18.8, t) * (1 - ss(27.4, 28.0, t));
      if (red > 0.01) for (let i = 0; i < 160 && q < NWD; i++) { const u = (i / 160); const x = -30 + u * 60 + ((t * 9) % (60 / 160 * 1)) ; const px = -30 + ((u * 60 + t * 9) % 60);
        dummy.position.set(800 + px, 14 + 1.4 * Math.sin(px * 0.45 - t * 4), 1.5); dummy.scale.setScalar(S0(red * 1.1)); dummy.updateMatrix(); dots.setMatrixAt(q, dummy.matrix); col.setHex(SPEC[0]).multiplyScalar(1.4); dots.setColorAt(q++, col); }
      const blue = ss(20.6, 21.0, t) * (1 - ss(27.4, 28.0, t));
      if (blue > 0.01) { for (let i = 0; i < 90 && q < NWD; i++) { const u = (i / 90 + t * 0.3) % 1; const px = -30 + u * 30.5;
          dummy.position.set(800 + px, 8 + 0.8 * Math.sin(px * 1.6 - t * 9), 0); dummy.scale.setScalar(S0(blue)); dummy.updateMatrix(); dots.setMatrixAt(q, dummy.matrix); col.setHex(SPEC[4]).multiplyScalar(1.6); dots.setColorAt(q++, col); }
        const sc = ss(21.9, 22.4, t) * (1 - ss(27.4, 28.0, t));
        if (sc > 0.01) for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 + 0.2; const dir = V(Math.cos(a), Math.sin(a), 0); const side = V(-Math.sin(a), Math.cos(a), 0);
          for (let i = 0; i < 26 && q < NWD; i++) { const u = (i / 26 + t * 0.45) % 1; const r = 1 + u * 20; const p = HIT.clone().add(dir.clone().multiplyScalar(r)).add(side.clone().multiplyScalar(0.6 * Math.sin(r * 1.6 - t * 9)));
            dummy.position.copy(p); dummy.scale.setScalar(S0(sc * (1 - u * 0.6))); dummy.updateMatrix(); dots.setMatrixAt(q, dummy.matrix); col.setHex(SPEC[4]).multiplyScalar(1.6); dots.setColorAt(q++, col); } } }
    }
    // landscape: blue light arriving from every part of the sky into the eye
    const eyeOn = ss(29.6, 30.2, t) * (1 - ss(33.8, 34.4, t));
    if (eyeOn > 0.01) for (let k = 0; k < 22; k++) { const r = mulberry32(k * 7 + 3); const az = -1.4 + r() * 2.8, el = 0.25 + r() * 1.0; const dir = V(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
      for (let i = 0; i < 18 && q < NWD; i++) { const u = (i / 18 + t * 0.5 + r()) % 1; const p = EYE.clone().add(dir.clone().multiplyScalar(4 + (1 - u) * 60));
        dummy.position.copy(p); dummy.scale.setScalar(S0(eyeOn * (0.6 + 1.6 * (1 - u)))); dummy.updateMatrix(); dots.setMatrixAt(q, dummy.matrix); col.setHex(SPEC[4]).multiplyScalar(1.5); dots.setColorAt(q++, col); } }
    // Earth: noon path short (keeps its blue), dusk path long (loses blue on the way)
    const eOn = ss(42.6, 43.2, t) * (1 - ss(47.0, 47.6, t));
    if (eOn > 0.01) { const base = EARTH.position;
      const paths = [[V(-ER * 1.22 - 10, 0, 0), NOON, false], [V(-60, ER, 0), DUSK, true]];
      for (const [a, b, dusk] of paths) { const A = base.clone().add(a), B = base.clone().add(b); const len = A.distanceTo(B);
        for (let i = 0; i < 70 && q < NWD; i++) { const u = (i / 70 + t * 0.35) % 1; const p = A.clone().lerp(B, u); const ci = i % 6;
          const lost = dusk && ci >= 3 && u > 0.25 + (ci - 3) * 0.12 ? 1 : 0; if (lost) { const off = (u - 0.25) * 18; p.add(V(0, (ci % 2 ? 1 : -1) * off * 0.5, off * 0.7)); }
          dummy.position.copy(p); dummy.scale.setScalar(S0(eOn * (lost ? 0.6 * (1 - u) : 1) * 1.6)); dummy.updateMatrix(); dots.setMatrixAt(q, dummy.matrix); col.setHex(SPEC[[0, 1, 2, 3, 4, 5][ci]]).multiplyScalar(1.6); dots.setColorAt(q++, col); } } }
    for (; q < NWD; q++) hideD(q);
    dots.instanceMatrix.needsUpdate = true; dots.instanceColor.needsUpdate = true;
    composer.render();
    const out = { t, anchors: {}, pal: scenePal(t) }; const A = out.anchors;
    A["prism"] = proj(L(0, 4.4, 0)); A["white"] = proj(L(-16, 2.8, 0)); A["mol"] = proj(HIT.clone().add(V(0.6, 0.5, 0))); A["red"] = proj(M(14, 15.4, 1.5)); A["blue"] = proj(M(-14, 8.8, 0));
    A["eye"] = proj(EYE); A["noon"] = proj(EARTH.position.clone().add(NOON)); A["dusk"] = proj(EARTH.position.clone().add(DUSK)); A["msun"] = proj(MOON.position.clone().add(moonSun.position));
    return out;
  }
  function debug(t) { const o = render(t); return { t, cam: camera.position.toArray().map((x) => +x.toFixed(1)), anchors: Object.fromEntries(Object.entries(o.anchors).map(([k, v]) => [k, v.map((x) => Math.round(x))])) }; }
  return { render, debug };
}
