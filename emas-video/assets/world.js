// "Emas Datang Dari Bintang Yang Berlanggar" — v4 cinematic look (deep space, one dominant gold hue, bloom, vignette).
// Everything is a pure function of canonical time t (0..60 s). Periodic motions use periods that divide 60 so the film loops.
// Shots: A ring (0-7) · B cosmos at C = (60,0,0): star -> neutron star -> merger -> distance -> disk (7-54) · A ring again (54-60).
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
const pulse = (t, t0, k = 1.5) => (t > t0 ? Math.exp(-(t - t0) * k) : 0);
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S0 = (x) => Math.max(0.0001, x);
const TAU = Math.PI * 2;

// beat times (canonical), from the script's even word spread
export const B = {
  bang: 4.77, cutStar: 7.0, fuse: 9.04, open: 10.02, he: 10.99, c: 11.47, o: 11.96, fe: 12.93, stop: 14.39,
  collapse: 18.5, ns: 19.3, city: 22.07, spoon: 22.87, scoop: 23.4, heavy: 26.05,
  pull: 27.1, second: 27.53, hit: 30.97, kilo: 32.69, gold: 35.27, earths: 35.7, earthGold: 36.99,
  far: 38.1, light: 39.0, seen: 41.2, dist: 42.75, disk: 46.1, sun: 51.91, earth: 52.88, cutRing: 54.0,
};
const C = V(60, 0, 0);
const CP = (x, y, z) => V(C.x + x, C.y + y, C.z + z);

export function createWorld(canvas, W, H, scale = 1, opts = {}) {
  const FX = { bloom: opts.bloom ?? true, msaa: opts.msaa ?? (scale < 1 ? 0 : 4) };
  const realRandom = Math.random; Math.random = mulberry32(1234);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  const BG = 0x07050a;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(BG); scene.fog = new THREE.Fog(BG, 40, 160);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 900);
  scene.add(new THREE.HemisphereLight(0xffc98a, 0x0a0614, 0.4));
  const key = new THREE.DirectionalLight(0xffb36b, 2.4); key.position.set(-8, 14, 12); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ab8ff, 1.2); rim.position.set(6, 8, -10); scene.add(rim);
  const camLight = new THREE.PointLight(0xffd29a, 7, 18, 1.8); scene.add(camLight);

  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.22, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, s = 1) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.scale.setScalar(s); scene.add(m); return m; };

  // ---------- starfield (follows the camera, so it reads as infinitely far) ----------
  const stars = (() => { const N = 2200, r = mulberry32(77), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u); pos.set([Math.cos(a) * s * 400, u * 400, Math.sin(a) * s * 400], i * 3);
      const b = 0.25 + Math.pow(r(), 3) * 1.4, w = r(); col.set([b, b * (0.85 + 0.15 * w), b * (0.7 + 0.35 * (1 - w))], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2 * scale, sizeAttenuation: false, vertexColors: true, fog: false, toneMapped: false, transparent: true, depthWrite: false })); p.frustumCulled = false; scene.add(p); return p; })();
  // faint nebula glows far behind each shot
  const neb = [glow(0x6a2a10, 260), glow(0x2a1440, 300), glow(0x5a3008, 220)];
  neb[0].position.set(-60, 40, -200); neb[1].position.set(140, -30, -220); neb[2].position.set(60, 60, -180);
  neb.forEach((n) => { n.material.opacity = 0.35; n.material.fog = false; });

  // ---------- A: the gold ring ----------
  const goldM = new THREE.MeshPhysicalMaterial({ color: 0xffc35a, metalness: 1, roughness: 0.14, clearcoat: 0.6, clearcoatRoughness: 0.05, emissive: 0x3a1c00, emissiveIntensity: 0.15 });
  const RING = new THREE.Group(); scene.add(RING);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.16, 48, 160), goldM); ring.scale.set(1, 1, 1.9); RING.add(ring);
  const bang = glow(0xffd48a, 1); bang.position.set(3.5, 2.6, -40);
  const glints = Array.from({ length: 3 }, () => glow(0xfff0c8, 0.5));

  // ---------- B1: the star, onion-shell cutaway (H, He, C, O, Fe) ----------
  const STAR = new THREE.Group(); STAR.position.copy(C); scene.add(STAR);
  const SH = [[3.0, 0xffe7a6, 0.9], [2.42, 0xffb347, 1.0], [1.88, 0xff7a2a, 1.0], [1.38, 0xe8462a, 1.0]];
  const shellMs = SH.map(([, c, e]) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 * e, roughness: 0.6, side: THREE.DoubleSide }));
  const shells = SH.map(([r], i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 72, 48, Math.PI / 2, Math.PI * 1.5), shellMs[i]); STAR.add(m); return m; });
  const ironM = new THREE.MeshPhysicalMaterial({ color: 0x9aa0aa, metalness: 1, roughness: 0.35, emissive: 0x401808, emissiveIntensity: 0 });
  const iron = new THREE.Mesh(new THREE.SphereGeometry(0.86, 48, 32), ironM); STAR.add(iron);
  const skinM = new THREE.MeshStandardMaterial({ color: 0xffc060, emissive: 0xff9a30, emissiveIntensity: 0.42, roughness: 0.7, transparent: true, opacity: 1 });
  const skin = new THREE.Mesh(new THREE.SphereGeometry(3.02, 72, 48), skinM); STAR.add(skin);
  STAR.rotation.y = -0.35;
  const starGlow = glow(0xffa640, 14);
  const atoms = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff1c0, toneMapped: false })); scene.add(m); return m; });
  const fuseFlash = glow(0xffffff, 1);

  // ---------- B2: neutron star, city for scale, the teaspoon ----------
  const nsM = () => new THREE.MeshStandardMaterial({ color: 0xd8e6ff, emissive: 0x9cc4ff, emissiveIntensity: 1.25, roughness: 0.3 });
  const NS = [0, 1].map(() => { const g = new THREE.Group(); scene.add(g); const s = new THREE.Mesh(new THREE.SphereGeometry(0.35, 48, 32), nsM()); g.add(s);
    const jm = new THREE.MeshBasicMaterial({ color: 0x9cc8ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const jets = new THREE.Group(); g.add(jets); for (const s2 of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 2.2, 24, 1, true), jm); c.position.y = s2 * 1.45; c.rotation.x = s2 > 0 ? Math.PI : 0; jets.add(c); }
    const gl = glow(0x8ab8ff, 2.2); return { g, s, jets, gl }; });
  const shock = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.BackSide })); scene.add(shock);
  const flashS = glow(0xfff4dc, 1);
  const CITY = new THREE.Group(); scene.add(CITY); CITY.position.copy(CP(0, -0.82, 0));
  { const base = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.02, 64), new THREE.MeshStandardMaterial({ color: 0x1a1420, roughness: 0.9 })); CITY.add(base);
    const r = mulberry32(31); const N = 260; const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x3a3448, emissive: 0xffb860, emissiveIntensity: 0.55, roughness: 0.6 }), N); const d = new THREE.Object3D();
    for (let i = 0; i < N; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * 0.4; const h = 0.012 + Math.pow(r(), 3) * (0.16 - rr * 0.25); d.position.set(Math.cos(a) * rr, h / 2 + 0.01, Math.sin(a) * rr); d.scale.set(0.022 + r() * 0.02, h, 0.022 + r() * 0.02); d.rotation.y = 0; d.updateMatrix(); bm.setMatrixAt(i, d.matrix); }
    CITY.add(bm); }
  const SPOON = new THREE.Group(); scene.add(SPOON);
  const silverM = new THREE.MeshPhysicalMaterial({ color: 0xe6e8ee, metalness: 1, roughness: 0.18, clearcoat: 0.5 });
  { const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 16, 0, TAU, Math.PI / 2, Math.PI / 2), silverM); bowl.material.side = THREE.DoubleSide; bowl.scale.set(1.35, 0.45, 1); SPOON.add(bowl);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, 0.05), silverM); h.position.set(0.5, 0.03, 0); h.rotation.z = 0.12; SPOON.add(h); }
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), nsM()); scene.add(bead); const beadGlow = glow(0x9cc4ff, 0.6);

  // ---------- B3: merger, gravitational-wave ripples, kilonova debris ----------
  const ripM = () => new THREE.MeshBasicMaterial({ color: 0x9cc4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const ripples = Array.from({ length: 9 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 128), ripM()); m.rotation.x = Math.PI / 2; m.position.copy(C); scene.add(m); return m; });
  const RIP_T = [28.6, 29.3, 29.8, 30.2, 30.5, 30.72, 30.88, 31.1, 31.6];
  const ND = 1500;
  const debris = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), ND); debris.frustumCulled = false; scene.add(debris);
  const dInfo = []; { const r = mulberry32(91); const col = new THREE.Color();
    for (let i = 0; i < ND; i++) { const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u); const dir = V(Math.cos(a) * s, u * 0.55, Math.sin(a) * s); const spd = 0.35 + Math.pow(r(), 0.6) * 0.9;
      const k = r(); col.setRGB(1.6, 0.95 + 0.4 * k, 0.25 + 0.25 * k); if (r() < 0.15) col.setRGB(1.5, 0.45, 0.2); debris.setColorAt(i, col);
      dInfo.push({ dir, spd, rr: 0.9 + Math.pow(r(), 0.8) * 4.4, a0: r() * TAU, yy: (r() - 0.5) * 0.18, sz: 0.5 + r() * 1.1, ph: r() }); } }
  debris.instanceColor.needsUpdate = true;
  const kiloGlow = glow(0xffa040, 1);
  const earthM = (i) => new THREE.MeshPhysicalMaterial({ color: 0x2a6cff, roughness: 0.45, metalness: 0, emissive: 0x1a4aba, emissiveIntensity: 0.7, clearcoat: 0.4 });
  const earths = Array.from({ length: 5 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 24), earthM(i)); scene.add(m);
    const land = new THREE.Mesh(new THREE.IcosahedronGeometry(0.365, 1), new THREE.MeshStandardMaterial({ color: 0x3fae5a, roughness: 0.8, flatShading: true, transparent: true, opacity: 0.85 })); land.scale.set(0.7, 1, 0.9); land.rotation.set(i, i * 2, 0); m.add(land); return { m, land }; });

  // ---------- B4: distance to Earth ----------
  const EARTH_FAR = CP(-6, -27, 6);
  const farEarth = new THREE.Mesh(new THREE.SphereGeometry(0.7, 40, 28), earthM()); farEarth.position.copy(EARTH_FAR); scene.add(farEarth); const farGlow = glow(0x4a8cff, 3.4); farGlow.position.copy(EARTH_FAR);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); scene.add(beam);
  const lightDot = glow(0xffe2a8, 2.2);

  // ---------- B5: disk, young Sun, forming Earth ----------
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffb84a, emissiveIntensity: 1.6 })); sun.position.copy(C); scene.add(sun); const sunGlow = glow(0xffb040, 6); sunGlow.position.copy(C);
  const babyEarth = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), earthM()); scene.add(babyEarth); const babyGlow = glow(0x4a8cff, 0.9);
  const DISK_TILT = new THREE.Euler(0.12, 0, 0.1);

  // ---------- gold motes drifting around the camera ----------
  const NP = 200;
  const motes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd88a, toneMapped: false, transparent: true, opacity: 0.85 }), NP); motes.frustumCulled = false; scene.add(motes);

  // ---------- post: bloom + warm grade, vignette, grain, cut flash ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  if (FX.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.6, 0.5, 0.9));
  const finish = new ShaderPass({ uniforms: { tDiffuse: { value: null }, seed: { value: 0 }, flash: { value: 0 }, res: { value: new THREE.Vector2(RW, RH) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float seed; uniform float flash; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + seed) * 43758.5453); }
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
        c = pow(c, vec3(0.98, 1.0, 1.06)); c *= vec3(1.04, 1.0, 0.94);
        vec2 q = vUv - 0.5; q.x *= res.x / res.y; c *= mix(0.5, 1.0, smoothstep(0.85, 0.25, length(q)));
        c = mix(c, vec3(1.0, 0.93, 0.8), flash);
        c += (h(vUv * res) - 0.5) * 0.012 * smoothstep(0.02, 0.12, dot(c, vec3(0.33)));
        gl_FragColor = vec4(c, 1.0); }` });
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- camera: shots, each a clamped-Hermite spline ----------
  const K0 = { pos: V(0.9, 0.7, 8.6), look: V(0, 0, 0) };
  const SHOTS = [
    [0, 7.0, [{ t: 0, ...K0 }, { t: 3.6, pos: V(-0.5, 0.4, 7.4), look: V(0, 0, 0) }, { t: 7.0, pos: V(-1.4, 0.15, 6.2), look: V(0, 0.05, 0) }]],
    [7.0, 54.0, [
      { t: 7.0, pos: CP(-6, 3.0, 26), look: CP(0, 0, 0) },
      { t: 9.8, pos: CP(-8.5, 3.2, 20.5), look: CP(-0.2, 0, 0) },
      { t: 13.0, pos: CP(-10.5, 3.8, 16.5), look: CP(-0.4, -0.2, 0) },
      { t: 18.3, pos: CP(-9.5, 3.4, 17.5), look: CP(-0.2, -0.1, 0) },
      { t: 19.8, pos: CP(-1.4, 0.9, 4.9), look: CP(0, 0, 0) },
      { t: 22.4, pos: CP(0.2, 1.3, 4.6), look: CP(0, -0.35, 0) },
      { t: 24.6, pos: CP(1.4, 0.8, 4.3), look: CP(0.55, -0.3, 0.3) },
      { t: 26.9, pos: CP(1.2, 0.9, 4.8), look: CP(0.45, -0.3, 0.2) },
      { t: 29.0, pos: CP(0, 6.0, 13.5), look: CP(0, 0, 0) },
      { t: 31.0, pos: CP(0, 5.4, 12.5), look: CP(0, 0, 0) },
      { t: 34.5, pos: CP(0.5, 5.0, 19.0), look: CP(0, -0.6, 0) },
      { t: 37.8, pos: CP(0.3, 3.4, 18.0), look: CP(0, -0.9, 1) },
      { t: 40.5, pos: CP(16, -9, 52), look: CP(-2, -13.5, 2) },
      { t: 45.6, pos: CP(14, -10, 50), look: CP(-2, -13.5, 2) },
      { t: 48.5, pos: CP(0.5, 4.2, 16.0), look: CP(0, 0, 0) },
      { t: 54.0, pos: CP(1.0, 3.0, 11.5), look: CP(0.4, 0, 0.4) },
    ]],
    [54.0, 60.0, [{ t: 54.0, pos: V(1.8, 1.3, 5.6), look: V(0, 0, 0) }, { t: 57.5, pos: V(1.4, 0.9, 7.6), look: V(0, 0, 0) }, { t: 60, ...K0 }]],
  ];
  const hc = (p0, p1, p2, p3, u) => { const seg = p2.distanceTo(p1);
    const m1 = p2.clone().sub(p0).multiplyScalar(0.5); if (m1.length() > seg) m1.setLength(seg);
    const m2 = p3.clone().sub(p1).multiplyScalar(0.5); if (m2.length() > seg) m2.setLength(seg);
    const u2 = u * u, u3 = u2 * u;
    return p1.clone().multiplyScalar(2 * u3 - 3 * u2 + 1).add(m1.multiplyScalar(u3 - 2 * u2 + u)).add(p2.clone().multiplyScalar(-2 * u3 + 3 * u2)).add(m2.multiplyScalar(u3 - u2)); };
  const camAt = (t) => { const sh = SHOTS.find(([a, b]) => t < b) || SHOTS[SHOTS.length - 1]; const keys = sh[2];
    let i = 0; while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    let u = clamp((t - k1.t) / (k2.t - k1.t)); u = u * u * (3 - 2 * u) * 0.7 + u * 0.3;
    return { P: hc(k0.pos, k1.pos, k2.pos, k3.pos, u), L: hc(k0.look, k1.look, k2.look, k3.look, u) }; };
  const proj = (v) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H, p.z < 1 ? 1 : 0]; };
  const dummy = new THREE.Object3D();

  // binary orbit: radius shrinks with a chirp, phase speeds up; merge at B.hit
  const orbit = (t) => { const T0 = B.second + 0.6, u = clamp((t - T0) / (B.hit - T0)); const r = 2.3 * Math.pow(1 - u, 0.3); const ph = 2.2 * (t - B.second) + 9 * (1 - Math.pow(1 - u, 0.6)) * 3.2; return { r, ph, u }; };
  const kiloR = (t) => (t > B.hit ? 5.2 * (1 - Math.exp(-(t - B.hit) * 0.55)) : 0);

  function render(t) {
    t = clamp(t, 0, 60);
    const cam = camAt(t); camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = 36;
    camera.setViewOffset(W, H, 0, -H * 0.03, W, H); camera.updateProjectionMatrix();
    camLight.position.copy(camera.position).add(V(1.5, 2, 0));
    stars.position.copy(camera.position);
    finish.uniforms.seed.value = (Math.round(t * 30) % 97) * 0.37;
    finish.uniforms.flash.value = 0.85 * pulse(t, B.cutStar, 6) + 0.7 * pulse(t, B.cutRing, 6) + 0.55 * pulse(t, B.hit, 3.5) + 0.25 * pulse(t, B.ns, 5);
    const inA = t < B.cutStar || t >= B.cutRing;

    // ring: slow turn (period 30 s), glints sliding over the band, distant flash on "letupan"
    RING.visible = inA; ring.rotation.set(0.18 + 0.05 * Math.sin(TAU * t / 20), TAU * t / 30, 0.08 * Math.sin(TAU * t / 15));
    glints.forEach((g, i) => { g.visible = inA; const a = TAU * (t / 6 + i / 3); const p = V(Math.cos(a), Math.sin(a), 0.32).applyEuler(ring.rotation); g.position.copy(p).add(RING.position);
      g.material.opacity = 0.5 * Math.pow(Math.max(0, p.clone().normalize().dot(camera.position.clone().sub(p).normalize())), 6); g.scale.setScalar(0.45); });
    { const e = t < B.cutStar ? pulse(t, B.bang, 1.1) * ss(B.bang - 0.15, B.bang, t) : 0; bang.visible = e > 0.002; bang.scale.setScalar(6 + 40 * e); bang.material.opacity = e; }

    // star: whole glowing ball, two atoms fuse in front, skin fades to reveal shells; core goes dark; collapse
    const inStar = t >= B.cutStar && t < B.ns + 0.2; STAR.visible = inStar; starGlow.visible = inStar; starGlow.position.copy(C);
    const col = t < B.collapse ? 1 : Math.pow(1 - ss(B.collapse, B.ns, t), 1.6);
    STAR.scale.setScalar(S0(col)); STAR.rotation.y = -0.35 + 0.04 * (t - 7);
    skinM.opacity = 1 - ss(B.open - 0.1, B.open + 0.6, t); skin.visible = skinM.opacity > 0.01;
    const dim = 1 - 0.75 * ss(B.stop, B.stop + 1.0, t) + 0.25 * ss(B.collapse - 0.5, B.collapse, t) * 0;
    const lit = [B.open, B.he, B.c, B.o];
    shellMs.forEach((m, i) => { m.emissiveIntensity = (0.45 + 1.1 * pulse(t, lit[i], 1.6)) * dim; });
    shells.forEach((s, i) => { s.scale.setScalar(S0(i === 0 ? 1 : pop(lit[i] - 0.15, t, 0.4) || (t > lit[i] ? 1 : 0.0001))); });
    iron.scale.setScalar(S0(pop(B.fe - 0.15, t, 0.4))); ironM.emissiveIntensity = 0.9 * pulse(t, B.fe, 1.2) + 0.6 * ss(B.collapse - 1.2, B.collapse, t) * (0.6 + 0.4 * Math.sin(t * 40));
    starGlow.scale.setScalar(16 * col * (0.95 + 0.05 * Math.sin(t * 3))); starGlow.material.opacity = 0.4 * dim + 0.3 * ss(B.collapse - 0.6, B.collapse, t);
    { const d = camera.position.clone().sub(C).normalize(); const front = C.clone().add(d.clone().multiplyScalar(6.5)); const side = V(1, 0, 0).cross(d).normalize().cross(d).normalize();
      const u = ss(B.fuse - 0.7, B.fuse, t), on = t > B.fuse - 0.9 && t < B.fuse + 0.05;
      atoms.forEach((a, i) => { a.visible = on; const s = i ? 1 : -1; a.position.copy(front).add(V(s * lerp(1.6, 0.0, u), 0.6 - 0.2 * s * (1 - u), 0)); a.scale.setScalar(S0(pop(B.fuse - 0.9, t, 0.3))); });
      const f = pulse(t, B.fuse, 3.5); fuseFlash.visible = f > 0.01 && t < B.open + 1; fuseFlash.position.copy(front).add(V(0, 0.6, 0)); fuseFlash.scale.setScalar(0.5 + 4 * f); fuseFlash.material.opacity = f; }

    // neutron stars
    const nsOn = t >= B.ns - 0.05 && t < B.hit;
    const o = orbit(t);
    NS.forEach((n, i) => { let on = nsOn && (i === 0 || t > B.second); n.g.visible = on; n.gl.visible = on; if (!on) return;
      let p = C.clone();
      if (t > B.second) { if (i === 0) { const k = ss(B.second, B.second + 0.9, t); p = C.clone().add(V(Math.cos(o.ph) * o.r * k, 0, Math.sin(o.ph) * o.r * k)); }
        else { const k = ss(B.second, B.second + 0.9, t); const target = C.clone().add(V(-Math.cos(o.ph) * o.r, 0, -Math.sin(o.ph) * o.r)); p = CP(9, 0.5, 2).lerp(target, k); } }
      n.g.position.copy(p); n.s.scale.setScalar(S0(i === 0 ? pop(B.ns, t, 0.35) : 1)); n.jets.rotation.set(0.5, 0, TAU * t / 2 + i); n.jets.visible = t < B.pull;
      n.gl.position.copy(p); n.gl.scale.setScalar(1.6 + 0.3 * Math.sin(t * 7 + i) + 1.2 * o.u); });
    { const e = pulse(t, B.ns, 1.8); shock.visible = t > B.ns && t < B.ns + 3 || (t > B.hit && t < B.hit + 4);
      const sk = t > B.hit ? t - B.hit : t - B.ns; shock.position.copy(C); shock.scale.setScalar(0.3 + sk * (t > B.hit ? 3.2 : 2.4)); shock.material.opacity = 0.35 * Math.exp(-sk * 1.4);
      const f = Math.max(e, 1.4 * pulse(t, B.hit, 1.3)); flashS.visible = f > 0.01; flashS.position.copy(C); flashS.scale.setScalar(1 + (t > B.hit ? 14 : 5) * f); flashS.material.opacity = Math.min(1, f); }
    const cityA = ss(B.city - 0.2, B.city + 0.4, t) * (1 - ss(B.pull, B.pull + 0.6, t)); CITY.visible = cityA > 0.01; CITY.scale.setScalar(S0(cityA)); CITY.rotation.y = 0.1 * t;
    { const a = pop(B.spoon, t, 0.45) * (1 - ss(B.pull, B.pull + 0.5, t)); SPOON.visible = a > 0.01; const sink = 0.08 * ss(B.heavy, B.heavy + 0.25, t) + 0.015 * Math.sin(t * 50) * pulse(t, B.heavy, 3);
      SPOON.position.copy(CP(0.62, -0.3 - sink, 0.45)); SPOON.rotation.set(0.25, -0.5, -0.12 - 0.25 * ss(B.heavy, B.heavy + 0.25, t)); SPOON.scale.setScalar(S0(a));
      const u = ss(B.scoop, B.scoop + 0.8, t); const p = CP(0.18, 0.12, 0.25).lerp(SPOON.position.clone().add(V(0, 0.04, 0)), u); p.y += Math.sin(u * Math.PI) * 0.25;
      bead.visible = SPOON.visible && t > B.scoop; bead.position.copy(p); bead.scale.setScalar(S0(pop(B.scoop, t, 0.3) * 0.7 * a)); beadGlow.visible = bead.visible; beadGlow.position.copy(p); beadGlow.scale.setScalar(0.5 * a); }

    // gravitational-wave ripples
    ripples.forEach((m, i) => { const te = RIP_T[i], k = t - te; const on = k > 0 && k < 2.6 && t < B.far; m.visible = on; if (!on) return; m.scale.setScalar(0.5 + k * 3.4); m.material.opacity = 0.55 * (1 - k / 2.6) * (i > 6 ? 1.3 : 1); });

    // kilonova debris -> distance -> disk
    const dOn = t > B.hit && t < B.cutRing; debris.visible = dOn; kiloGlow.visible = dOn;
    if (dOn) { const R = kiloR(t), toDisk = ss(B.disk, B.disk + 3.6, t), cool = 1 - 0.45 * ss(B.hit + 2, B.hit + 7, t) + 0.25 * toDisk;
      for (let i = 0; i < ND; i++) { const q = dInfo[i]; const ex = q.dir.clone().multiplyScalar(R * q.spd).add(V(0, 0, 0));
        const om = 0.9 * Math.pow(q.rr, -1.5); const a = q.a0 + om * (t - B.disk) * 1.6; const dk = V(Math.cos(a) * q.rr, q.yy, Math.sin(a) * q.rr).applyEuler(DISK_TILT);
        dummy.position.copy(C).add(ex.lerp(dk, toDisk)); dummy.scale.setScalar(q.sz * (1 - 0.45 * toDisk) * cool * (0.75 + 0.25 * Math.sin(t * 3 + q.ph * 20)) * (t < B.hit + 0.3 ? ss(B.hit, B.hit + 0.3, t) : 1)); dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix); }
      debris.instanceMatrix.needsUpdate = true;
      kiloGlow.position.copy(C); kiloGlow.scale.setScalar(4 + R * 2.2 * (1 - toDisk * 0.6)); kiloGlow.material.opacity = 0.55 * (1 - 0.4 * toDisk); }
    // Earth row: "beberapa kali ganda berat Bumi" — five Earths pop in, then turn gold
    earths.forEach(({ m, land }, i) => { const t0 = B.earths + i * 0.16; const on = t > t0 && t < B.far + 0.6; m.visible = on; if (!on) return;
      m.position.copy(CP((i - 2) * 0.95, -1.1, 4.2)); m.scale.setScalar(S0(pop(t0, t, 0.35)) * (1 - ss(B.far, B.far + 0.5, t)) + 0.0001); m.rotation.y = t * 0.6;
      const g = ss(B.earthGold + i * 0.14, B.earthGold + i * 0.14 + 0.35, t); m.material.color.set(0x2a6cff).lerp(new THREE.Color(0xffc35a), g); m.material.metalness = g; m.material.roughness = lerp(0.45, 0.15, g);
      m.material.emissive.set(0x0a2a6a).lerp(new THREE.Color(0x6a3800), g); land.material.opacity = 0.85 * (1 - g); });
    // distance: light travels from the kilonova to Earth
    { const on = t > B.far && t < B.disk + 0.6; farEarth.visible = on; farGlow.visible = on; beam.visible = on; lightDot.visible = on && t < B.seen + 0.3;
      farEarth.rotation.y = t * 0.3; const a = ss(B.far, B.far + 0.6, t) * (1 - ss(B.disk - 0.3, B.disk + 0.4, t)); farEarth.scale.setScalar(S0(a)); farGlow.scale.setScalar(3.4 * a * (1 + 0.8 * pulse(t, B.seen, 2)));
      const u = ss(B.light, B.seen, t); const tip = C.clone().lerp(EARTH_FAR, u); const mid = C.clone().add(tip).multiplyScalar(0.5);
      beam.position.copy(mid); beam.scale.set(1, S0(C.distanceTo(tip)), 1); beam.quaternion.setFromUnitVectors(V(0, 1, 0), EARTH_FAR.clone().sub(C).normalize()); beam.material.opacity = 0.55 * a;
      lightDot.position.copy(tip); lightDot.scale.setScalar(2.4 + 0.6 * Math.sin(t * 12)); lightDot.material.opacity = ss(B.light - 0.1, B.light + 0.2, t); }
    // young Sun + forming Earth
    { const s = pop(B.sun, t, 0.5) * (t < B.cutRing ? 1 : 0); sun.visible = s > 0.001; sunGlow.visible = sun.visible; sun.scale.setScalar(S0(s)); sunGlow.scale.setScalar(S0(s) * (6 + 3 * pulse(t, B.sun, 1.5)));
      const e = pop(B.earth, t, 0.45) * (t < B.cutRing ? 1 : 0); babyEarth.visible = e > 0.001; babyGlow.visible = babyEarth.visible; const a = 0.2 + 0.12 * (t - B.disk);
      const p = V(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2).applyEuler(DISK_TILT).add(C); babyEarth.position.copy(p); babyEarth.scale.setScalar(S0(e)); babyGlow.position.copy(p); babyGlow.scale.setScalar(1.1 * S0(e)); }

    // gold motes (periodic drift, 20 s period)
    for (let i = 0; i < NP; i++) { const r = mulberry32(i * 3 + 11); const ph = r(); const base = camera.position.clone().add(V((r() - 0.5) * 9, (r() - 0.5) * 14, -2 - r() * 10));
      const u = ((t / 20) + ph) % 1; dummy.position.copy(base).add(V(Math.sin(u * TAU + i) * 0.6, (u - 0.5) * 3, Math.cos(u * TAU * 2 + i) * 0.4)); dummy.scale.setScalar(0.5 + r() * 1.2 * (0.5 + 0.5 * Math.sin(u * TAU * 3 + i))); dummy.updateMatrix(); motes.setMatrixAt(i, dummy.matrix); }
    motes.instanceMatrix.needsUpdate = true;

    composer.render();
    const out = { t, anchors: {} }; const A = out.anchors;
    // shell labels: points on the +z cut face (local), staggered in elevation so tags never stack
    const sp = (r, el) => V(0, Math.sin(el) * r, Math.cos(el) * r).applyAxisAngle(V(0, 1, 0), STAR.rotation.y).multiplyScalar(STAR.scale.x).add(C);
    A["ring"] = proj(V(-0.9, 0.5, 0.3)); A["h"] = proj(sp(2.72, 1.05)); A["he"] = proj(sp(2.15, 0.72)); A["c"] = proj(sp(1.62, 0.42)); A["o"] = proj(sp(1.12, 0.12)); A["fe"] = proj(sp(0.6, -0.5));
    A["ns"] = proj(CP(0.05, 0.33, 0.1)); A["city"] = proj(CP(-0.3, -0.78, 0.1)); A["spoon"] = proj(SPOON.position.clone().add(V(0.0, -0.06, 0.05)));
    A["gw"] = proj(CP(-2.3, 0, 2.2)); A["kilo"] = proj(CP(-1.2, 1.0, 0)); A["gold"] = proj(CP(1.0, 0.9, 1.2)); A["earths"] = proj(CP(1.9, -0.8, 4.2));
    A["far"] = proj(EARTH_FAR.clone().add(V(0.7, 0.3, 0))); A["src"] = proj(CP(-1.5, 1.2, 0)); A["sun"] = proj(CP(-0.5, 0.3, 0)); A["babyEarth"] = proj(babyEarth.position.clone().add(V(0.15, 0.1, 0)));
    return out;
  }
  function debug(t) { const o = render(t); return { t, cam: camera.position.toArray().map((x) => +x.toFixed(2)), anchors: Object.fromEntries(Object.entries(o.anchors).map(([k, v]) => [k, v.map((x) => Math.round(x))])) }; }
  return { render, debug };
}
