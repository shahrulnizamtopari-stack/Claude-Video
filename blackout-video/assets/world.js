// "Macam mana kalau satu Malaysia blackout 7 hari?" — v2 look (post-processed Three.js), night street on the floating island.
// Everything on screen is a pure function of canonical time t (0..60 s).
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { GTAOPass } from "./lib/jsm/postprocessing/GTAOPass.js";
import { ShaderPass } from "./lib/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "./lib/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "./lib/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "./lib/jsm/utils/BufferGeometryUtils.js";

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const pop = (t0, t, d = 0.4) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S0 = (x) => Math.max(0.0001, x);

export const PAL = {
  skyTop: 0x5d4fa8, skyMid: 0xb784c4, skyHorizon: 0xffb48c, skyLow: 0xf59a9a,
  nTop: 0x0d1238, nMid: 0x1d2360, nHorizon: 0x4a3f86, nLow: 0x2a2858,
  grass: 0x86c46b, soil: 0x9a6248, soilDark: 0x6b3f30, tree: [0x76b85e, 0x8fcc6c, 0x5fa452], trunk: 0x7a5236,
  wall: [0xeedccf, 0xe2d2e6, 0xd6e4d8], roof: [0xd9694a, 0x8d6ab8, 0x4fa3a0, 0xe0a04a], inner: 0xf3e2d2, wood: 0xc98b5a,
  road: 0x6f6478, steel: 0x5b5866, steelLight: 0x9a98a8,
  warm: 0xffc070, power: 0xffc531, danger: 0xff5a3d, safe: 0x7ee8ff, ok: 0x8dff7a, spark: 0xffd27a, box: 0x2c2a33,
};
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o });
const flat = (c, o = {}) => mat(c, { flatShading: true, roughness: 0.85, ...o });

export function createWorld(canvas, W, H, scale = 1, opts = {}) {
  const FX = { ao: opts.ao ?? true, bloom: opts.bloom ?? true, finish: opts.finish ?? true, msaa: opts.msaa ?? (scale < 1 ? 0 : 2), half: opts.half ?? true };
  const realRandom = Math.random; Math.random = mulberry32(1234);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  const FOG_DAY = new THREE.Color(0xf2a7a4), FOG_NIGHT = new THREE.Color(0x232552);
  scene.fog = new THREE.Fog(0xf2a7a4, 260, 1200);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 4000);

  // ---------- sky (dusk <-> night) ----------
  const C = (h) => new THREE.Color(h);
  const SKY = { top: [C(PAL.skyTop), C(PAL.nTop)], mid: [C(PAL.skyMid), C(PAL.nMid)], hor: [C(PAL.skyHorizon), C(PAL.nHorizon)], low: [C(PAL.skyLow), C(PAL.nLow)] };
  const skyU = { top: { value: C(0) }, mid: { value: C(0) }, hor: { value: C(0) }, low: { value: C(0) }, sunDir: { value: V(-0.35, 0.1, -1).normalize() }, sunAmt: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform vec3 top,mid,hor,low,sunDir; uniform float sunAmt; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 c;
        if(h>0.0){ c = mix(hor, mid, smoothstep(0.0,0.28,h)); c = mix(c, top, smoothstep(0.25,0.85,h)); } else { c = mix(hor, low, smoothstep(0.0,-0.35,h)); }
        float s = max(dot(normalize(vDir), sunDir),0.0); c += (vec3(1.0,0.85,0.6)*pow(s,80.0)*0.6 + vec3(1.0,0.7,0.45)*pow(s,6.0)*0.12)*sunAmt;
        gl_FragColor = vec4(c,1.0); }`,
  }));
  scene.add(sky);

  // ---------- light ----------
  const hemi = new THREE.HemisphereLight(0xffd8c2, 0xd99a86, 0.55); scene.add(hemi);
  const HEMI = { sky: [C(0xffd8c2), C(0x8f9be8)], ground: [C(0xd99a86), C(0x3a3760)] };
  const sun = new THREE.DirectionalLight(0xffdcbc, 2.6);
  const SUNC = [C(0xffdcbc), C(0x9db2ff)];
  sun.castShadow = true; sun.shadow.mapSize.set(scale < 1 ? 1024 : 2048, scale < 1 ? 1024 : 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.4; sun.shadow.radius = 5;
  const sc = sun.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 500;
  scene.add(sun); scene.add(sun.target);
  const rim = new THREE.DirectionalLight(0xffa27a, 1.1); rim.position.set(-120, 60, -200); scene.add(rim);
  const heroLamp = new THREE.PointLight(0xffd29a, 0, 22, 1.6); scene.add(heroLamp);   // the one house that still has power
  const fill = new THREE.PointLight(0xaebcff, 0, 16, 1.4); scene.add(fill);            // faint "eyes adjusted to the dark" light near the subject

  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.3, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, size, op = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false, fog: false })); s.scale.set(size, size, 1); return s; };
  const sunGlow = glow(0xffd9a8, 220, 0.5); sunGlow.position.set(-640, 180, -1800); scene.add(sunGlow);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(55, 24, 16), new THREE.MeshBasicMaterial({ color: C(0xf2efff).multiplyScalar(1.5), transparent: true, opacity: 0, fog: false, depthWrite: false })); moon.position.set(330, 760, -1500); scene.add(moon);
  const moonGlow = glow(0xbfc8ff, 520, 0); moonGlow.position.copy(moon.position); scene.add(moonGlow);
  const stars = (() => { const r = mulberry32(99), p = []; for (let i = 0; i < 420; i++) { const a = r() * Math.PI * 2, y = 0.08 + r() * 0.9, q = Math.sqrt(1 - y * y); p.push(Math.cos(a) * q * 1800, y * 1800, Math.sin(a) * q * 1800); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ color: C(0xffffff).multiplyScalar(2.2), size: 4.2 * scale + 1.0, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(m); return m; })();

  // ---------- floating island ----------
  const rnd = mulberry32(7);
  const RX = 50, RZ = 50;
  const island = new THREE.Group(); scene.add(island);
  { const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.97, 1, 40, 1), flat(PAL.grass)); top.scale.set(RX, 3, RZ); top.position.y = -1.5; top.receiveShadow = true; island.add(top);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.985, 0.94, 1, 40, 1), flat(PAL.soil)); band.scale.set(RX, 5, RZ); band.position.y = -5.4; island.add(band);
    const cg = new THREE.ConeGeometry(1, 1, 20, 5); cg.rotateX(Math.PI);
    const p = cg.attributes.position; const r2 = mulberry32(11);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0.49 && y > -0.49) { p.setX(i, p.getX(i) * (0.85 + 0.3 * r2())); p.setZ(i, p.getZ(i) * (0.85 + 0.3 * r2())); } }
    cg.computeVertexNormals();
    const under = new THREE.Mesh(cg, flat(PAL.soilDark)); under.scale.set(RX * 0.94, 58, RZ * 0.94); under.position.y = -7.9 - 29; island.add(under);
    for (let i = 0; i < 16; i++) { const a = rnd() * Math.PI * 2, r = 0.25 + rnd() * 0.5; const x = Math.cos(a) * RX * r * 0.8, z = Math.sin(a) * RZ * r * 0.8; const y0 = -8 - 18 * (1 - r);
      const pts = []; for (let k = 0; k < 6; k++) pts.push(V(x + Math.sin(k + i) * 2.5, y0 - k * (5 + rnd() * 3), z + Math.cos(k * 1.3 + i) * 2.5));
      island.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.4, 5), flat(0x5a3326))); }
    const treeG = new THREE.IcosahedronGeometry(1, 1), trunkG = new THREE.CylinderGeometry(0.35, 0.5, 1, 7);
    let placed = 0, guard = 0;
    while (placed < 30 && guard++ < 1500) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.92; const x = Math.cos(a) * RX * r, z = Math.sin(a) * RZ * r;
      if (Math.abs(x) < 17 && z > -36) continue;      // keep the street and the houses clear
      if (Math.abs(x) < 26 && z > 24) continue;       // nothing tall between the opening camera and the street
      const s = 2.4 + rnd() * 2.6; const t = new THREE.Mesh(treeG, flat(PAL.tree[placed % 3])); t.scale.set(s, s * 1.1, s); t.position.set(x, s + 2.4, z); t.castShadow = true; island.add(t);
      const tr = new THREE.Mesh(trunkG, flat(PAL.trunk)); tr.scale.set(1, 3, 1); tr.position.set(x, 1.5, z); tr.castShadow = true; island.add(tr); placed++;
    }
    const fc = [0xff8fb1, 0xffd36e, 0xc9a2ff, 0xffffff];
    for (let i = 0; i < 110; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.95; const x = Math.cos(a) * RX * r, z = Math.sin(a) * RZ * r; if (Math.abs(x) < 15 && z > -34) continue;
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), flat(fc[i % 4])); f.position.set(x, 0.25, z); island.add(f); }
  }
  const cloudM = flat(0xffe9ef, { roughness: 1, emissive: 0xffc9c9, emissiveIntensity: 0.45 });
  { for (let i = 0; i < 8; i++) { const c = new THREE.Group(); const n = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), cloudM); const s = 5 + rnd() * 7; b.scale.set(s * 1.4, s * 0.7, s); b.position.set(k * 7 - n * 3.5, rnd() * 2, rnd() * 4); c.add(b); }
      const a = (i / 8) * Math.PI * 2 + 0.3, r = 150 + rnd() * 90; c.position.set(Math.cos(a) * r, -20 + rnd() * 90, Math.sin(a) * r - 60); scene.add(c); } }

  // ---------- the street ----------
  const town = new THREE.Group(); scene.add(town);
  const add = (parent, geo, m, x, y, z, o = {}) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (o.rx) me.rotation.x = o.rx; if (o.ry) me.rotation.y = o.ry; if (o.rz) me.rotation.z = o.rz; me.castShadow = o.shadow ?? true; me.receiveShadow = true; if (o.dyn) me.userData.dyn = true; parent.add(me); return me; };
  const box = (parent, w, h, d, m, x, y, z, o) => add(parent, new THREE.BoxGeometry(w, h, d), m, x, y, z, o);
  const rbox = (parent, w, h, d, m, x, y, z, o = {}) => add(parent, new RoundedBoxGeometry(w, h, d, 2, o.r ?? 0.08), m, x, y, z, o);
  const roadM = mat(PAL.road, { roughness: 0.95 }), kerbM = mat(0xe8dcd4, { roughness: 0.9 }), lineM = mat(0xf3ead9, { roughness: 0.8 });
  const HERO_Z = -27, ZS = [19, 5, -9];
  box(town, 6.4, 0.3, 58, roadM, 0, 0.05, 6);
  add(town, new THREE.CylinderGeometry(8.2, 8.2, 0.3, 40), roadM, 0, 0.05, -21);
  for (let i = 0; i < 9; i++) box(town, 0.22, 0.04, 2.2, lineM, 0, 0.22, 32 - i * 5.6, { shadow: false });
  for (const sx of [-1, 1]) box(town, 0.35, 0.42, 46, kerbM, sx * 3.35, 0.06, 12);

  const wallMs = PAL.wall.map((c) => mat(c, { roughness: 0.9 })), roofMs = PAL.roof.map((c) => flat(c)), floorM = mat(PAL.wood, { roughness: 0.7 }), sofaMs = [mat(0x7c8fd0), mat(0xd88a9a), mat(0x78b59a)], poleM = mat(PAL.steel, { metalness: 0.6, roughness: 0.4 });
  const roofG = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 3); g.rotateX(-Math.PI / 2); return g.toNonIndexed(); })(); roofG.computeVertexNormals();
  const heroRoofM = flat(PAL.roof[3], { transparent: true, opacity: 1 });
  const houses = [];
  function mkHouse(x, z, ry, i, o = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; town.add(g);
    const HW = o.w ?? 9, HD = o.d ?? 7, WH = 4.0, wm = wallMs[i % 3];
    const inM = mat(PAL.inner, { roughness: 0.9, emissive: 0xffb46a, emissiveIntensity: 0 });
    const winM = mat(0x3a3350, { roughness: 0.25, emissive: PAL.warm, emissiveIntensity: 0 });
    const bulbM = mat(0xfff3d6, { emissive: 0xffd9a0, emissiveIntensity: 0 });
    box(g, HW, 0.3, HD, floorM, 0, 0.15, 0);
    box(g, HW, WH, 0.3, wm, 0, WH / 2 + 0.3, -HD / 2 + 0.15); box(g, HW - 0.6, WH, 0.06, inM, 0, WH / 2 + 0.3, -HD / 2 + 0.34, { shadow: false });
    for (const sx of [-1, 1]) { box(g, 0.3, WH, HD, wm, sx * (HW / 2 - 0.15), WH / 2 + 0.3, 0); box(g, 0.06, WH, HD - 0.3, inM, sx * (HW / 2 - 0.34), WH / 2 + 0.3, 0.15, { shadow: false });
      for (const wz of [-1.5, 1.5]) { box(g, 0.1, 1.5, 1.6, winM, sx * (HW / 2 + 0.02), 2.6, wz, { shadow: false }); box(g, 0.14, 0.14, 1.9, kerbM, sx * (HW / 2 + 0.04), 1.78, wz, { shadow: false }); } }
    if (!o.hero) box(g, HW - 0.6, 0.06, HD - 0.3, inM, 0, WH + 0.24, 0.15, { shadow: false });
    box(g, HW, 0.5, 0.36, o.hero ? heroRoofM : wm, 0, WH + 0.05, HD / 2 - 0.18, { dyn: !!o.hero });
    const roofH = 2.6; const rf = add(g, roofG, o.hero ? heroRoofM : roofMs[i % 4], 0, WH + 0.3 + roofH / 3, 0, { dyn: !!o.hero }); rf.scale.set((HW + 1.4) / 1.732, roofH / 1.5, HD + 1.2);
    add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), poleM, 0, WH - 0.05, 0.4, { shadow: false });
    add(g, new THREE.SphereGeometry(0.3, 16, 12), bulbM, 0, WH - 0.5, 0.4, { shadow: false });
    const sm = sofaMs[i % 3]; rbox(g, 3.2, 0.7, 1.2, sm, o.sofaX ?? -1.6, 0.65, -HD / 2 + 1.1, { r: 0.2 }); rbox(g, 3.2, 1.0, 0.4, sm, o.sofaX ?? -1.6, 1.3, -HD / 2 + 0.65, { r: 0.15 });
    add(g, new THREE.CylinderGeometry(1.7, 1.7, 0.05, 24), mat(0xe9c9a8), 0.4, 0.33, 1.0, { shadow: false });
    const spill = glow(0xffb870, 13, 0); spill.position.set(0, 2.4, HD / 2 - 1.5); g.add(spill);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(6.5, 28), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffb060, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.26, HD / 2 + 1.2); g.add(pool);
    const h = { g, inM, winM, bulbM, spill, pool, z, i, HW, HD, WH }; houses.push(h); return h;
  }
  ZS.forEach((z, k) => { mkHouse(-9.6, z, Math.PI / 2, k * 2); mkHouse(9.6, z, -Math.PI / 2, k * 2 + 1); });
  const hero = mkHouse(0, HERO_Z, 0, 3, { w: 11, d: 8, sofaX: 1.2, hero: true });
  const fridgeHouse = houses[2];   // left side, middle

  // street lamps
  const lamps = [[-3.9, 27], [3.9, 12], [-3.9, -3]].map(([x, z]) => { const sgn = Math.sign(x);
    add(town, new THREE.CylinderGeometry(0.1, 0.14, 6.2, 8), poleM, x, 3.1, z); box(town, 1.3, 0.12, 0.12, poleM, x - sgn * 0.6, 6.15, z);
    const m = mat(0xfff3d6, { emissive: 0xffd9a0, emissiveIntensity: 0 }); rbox(town, 0.9, 0.2, 0.45, m, x - sgn * 1.2, 6.02, z, { shadow: false, r: 0.06 });
    const gl = glow(0xffc27a, 9, 0); gl.position.set(x - sgn * 1.2, 5.8, z); scene.add(gl);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(5.2, 28), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffb060, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.set(x - sgn * 1.6, 0.24, z); scene.add(pool);
    return { m, gl, pool, z }; });

  // fridge (cut-away) in the middle-left house
  const fridge = new THREE.Group(); fridge.position.set(2.5, 0.3, -2.3); fridgeHouse.g.add(fridge);
  const fridgeSkin = new THREE.MeshPhysicalMaterial({ color: 0xf4f6fa, roughness: 0.3, transparent: true, opacity: 1 });
  const foodFresh = [0xff5a4a, 0x7ed957, 0xffd23f, 0xfdfdfd, 0xff9a3d].map(C), foodBad = [0x6e5a2e, 0x5b6a34, 0x77703a, 0xb7b57a, 0x5e4a30].map(C), foodM = foodFresh.map((c) => mat(c.getHex(), { roughness: 0.6 }));
  { const b = new THREE.Mesh(new RoundedBoxGeometry(1.7, 3.3, 1.4, 3, 0.12), fridgeSkin); b.position.y = 1.65; b.userData.dyn = true; fridge.add(b);
    const shM = mat(PAL.steelLight, { metalness: 0.5, roughness: 0.4 });
    for (const y of [0.55, 1.35, 2.15]) box(fridge, 1.45, 0.06, 1.15, shM, 0, y, 0, { dyn: true, shadow: false });
    const items = [[-0.4, 0.82, 0, 0], [0.15, 0.78, 1, 0.1], [0.5, 0.8, 2, -0.1], [-0.35, 1.72, 3, 0], [0.3, 1.6, 4, 0.1], [-0.1, 2.42, 1, 0], [0.45, 2.4, 0, 0.1]];
    items.forEach(([x, y, k, z], n) => { const geo = n === 3 ? new RoundedBoxGeometry(0.4, 0.7, 0.4, 2, 0.06) : n === 5 ? new RoundedBoxGeometry(0.6, 0.45, 0.5, 2, 0.1) : new THREE.SphereGeometry(0.22, 14, 10); add(fridge, geo, foodM[k], x, y, z + 0.15, { dyn: true, shadow: false }); }); }
  const fridgeEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7, 3.3, 1.4)), new THREE.LineBasicMaterial({ color: PAL.danger, transparent: true, opacity: 0 })); fridgeEdge.position.y = 1.65; fridge.add(fridgeEdge);
  const puddle = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.03, 24), new THREE.MeshPhysicalMaterial({ color: 0x9fd8ff, roughness: 0.1, transparent: true, opacity: 0.45 })); puddle.position.set(0.1, 0.03, 1.0); fridge.add(puddle);

  // ---------- inside the one house with power ----------
  const HL = (x, y, z) => V(x, y, z + HERO_Z);
  // power station (the product): dark box, handle, LCD, sockets, LED bar; skin goes see-through for the cut-away
  const ps = new THREE.Group(); ps.position.copy(HL(-0.5, 0.3, 2.5)); ps.rotation.y = 0.12; ps.scale.setScalar(1.3); scene.add(ps);
  const PSW = 1.5, PSH = 0.95, PSD = 0.9;
  const psSkin = new THREE.MeshPhysicalMaterial({ color: 0x23222a, roughness: 0.5, metalness: 0.1, transparent: true, opacity: 1 });
  const cellM = mat(0xff9a3d, { emissive: 0xff7a1a, emissiveIntensity: 0, metalness: 0.3, roughness: 0.4 });
  const psEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PSW, PSH, PSD)), new THREE.LineBasicMaterial({ color: PAL.power, transparent: true, opacity: 0 }));
  { const b = new THREE.Mesh(new RoundedBoxGeometry(PSW, PSH, PSD, 3, 0.1), psSkin); b.position.y = PSH / 2 + 0.06; b.castShadow = true; ps.add(b); psEdge.position.copy(b.position); ps.add(psEdge);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(ps, new THREE.CylinderGeometry(0.07, 0.07, 0.08, 10), poleM, sx * 0.55, 0.03, sz * 0.3, { shadow: false });
    for (const sx of [-1, 1]) box(ps, 0.08, 0.2, 0.1, poleM, sx * 0.4, PSH + 0.15, 0); rbox(ps, 0.95, 0.11, 0.16, poleM, 0, PSH + 0.26, 0, { r: 0.03 });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { const cy = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, PSD - 0.25, 14), cellM); cy.rotation.x = Math.PI / 2; cy.position.set(-0.5 + c * 0.333, 0.3 + r * 0.36, -0.02); ps.add(cy); }
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const q = cv.getContext("2d"); q.fillStyle = "#0b1a2c"; q.fillRect(0, 0, 256, 128); q.fillStyle = "#7ee8ff"; q.font = "800 78px Montserrat, sans-serif"; q.textAlign = "center"; q.textBaseline = "middle"; q.fillText("100%", 128, 68);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.3), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false })); lcd.position.set(-0.3, 0.74, PSD / 2 + 0.012); ps.add(lcd);
    const led = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.07), new THREE.MeshBasicMaterial({ color: C(0xffffff).multiplyScalar(1.6), toneMapped: false })); led.position.set(0.4, 0.8, PSD / 2 + 0.012); ps.add(led);
    for (const sx of [-0.52, -0.1]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x8a8794 })); s.position.set(sx, 0.34, PSD / 2 + 0.012); ps.add(s); }
    for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), new THREE.MeshBasicMaterial({ color: C(0x7ee8ff).multiplyScalar(1.3), toneMapped: false })); s.position.set(0.42, 0.24 + k * 0.13, PSD / 2 + 0.012); ps.add(s); } }
  const psHalo = glow(PAL.power, 5, 0); psHalo.position.copy(ps.position).add(V(0, 0.6, 0.3)); scene.add(psHalo);
  // table with three phones on charge
  { const tm = mat(0xdcb893, { roughness: 0.6 }); const T = HL(2.3, 0, 2.3); rbox(town, 2.2, 0.14, 1.3, tm, T.x, 1.25, T.z, { r: 0.05 }); for (const [dx, dz] of [[-0.95, -0.5], [0.95, -0.5], [-0.95, 0.5], [0.95, 0.5]]) add(town, new THREE.CylinderGeometry(0.06, 0.06, 0.95, 8), tm, T.x + dx, 0.78, T.z + dz); }
  const tablePhones = [-0.65, 0, 0.65].map((dx, k) => { const g = new THREE.Group(); g.position.copy(HL(2.3 + dx, 1.36, 2.3 + (k - 1) * 0.08)); g.rotation.set(-1.15, (k - 1) * 0.25, 0); scene.add(g);
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.66, 0.05, 2, 0.02), mat(0x1c1a22, { roughness: 0.3 })); g.add(b);
    const sm = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.58), sm); s.position.z = 0.03; g.add(s); return { g, sm }; });
  // stand fan
  const fan = new THREE.Group(); fan.position.copy(HL(-2.6, 0.3, 0.4)); fan.rotation.y = 0.45; fan.scale.setScalar(1.15); scene.add(fan);
  const blades = new THREE.Group(); blades.position.set(0, 2.25, 0.12); fan.add(blades);
  { const fm = mat(0xf1ece6, { roughness: 0.4 }); add(fan, new THREE.CylinderGeometry(0.5, 0.55, 0.1, 20), fm, 0, 0.05, 0); add(fan, new THREE.CylinderGeometry(0.05, 0.05, 2.1, 8), fm, 0, 1.1, 0); add(fan, new THREE.SphereGeometry(0.2, 12, 10), fm, 0, 2.25, -0.08);
    add(fan, new THREE.TorusGeometry(0.72, 0.035, 8, 36), fm, 0, 2.25, 0.12); add(fan, new THREE.TorusGeometry(0.72, 0.035, 8, 36), fm, 0, 2.25, 0.3);
    const bm = mat(0x7ecbe6, { roughness: 0.35, transparent: true, opacity: 0.92 }); for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CircleGeometry(0.33, 14), bm); b.material.side = THREE.DoubleSide; b.scale.set(0.75, 1.5, 1); b.position.set(Math.sin(k * 2.094) * 0.34, Math.cos(k * 2.094) * 0.34, 0.09); b.rotation.z = -k * 2.094; blades.add(b); } }
  // cables from the box: to the ceiling lamp, to the phones, to the fan (they light up, with pulses, in the explanation)
  const cableM = mat(0x3a3742, { roughness: 0.5, emissive: PAL.power, emissiveIntensity: 0 });
  const P0 = ps.position.clone().add(V(0, 0.5, -0.6));
  const cablePaths = [
    [P0, HL(-0.9, 0.36, 0.6), HL(-1.6, 0.4, -3.3), HL(-1.6, 2.4, -3.6), HL(-1.1, 4.15, -3.3), HL(0, 4.2, -1.4), HL(0, 4.15, 0.4)],
    [P0, HL(0.5, 0.36, 1.5), HL(1.2, 0.36, 3.0), HL(1.6, 0.7, 3.1), HL(1.8, 1.38, 2.8), HL(2.3, 1.36, 1.95)],
    [P0, HL(-1.3, 0.36, 1.5), HL(-2.1, 0.36, 0.9), HL(-2.6, 0.42, 0.5)],
  ].map((pts) => { const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.2); const me = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.04, 6), cableM); me.userData.dyn = true; scene.add(me); return curve; });

  // ---------- people (one per side house), each with a phone ----------
  const pCols = [0xff8a5c, 0x6fb0ff, 0xa8f07a, 0xffc531, 0xc9a2ff, 0xff8fb1];
  const batCv = document.createElement("canvas"); batCv.width = 128; batCv.height = 232; const batTex = new THREE.CanvasTexture(batCv); batTex.colorSpace = THREE.SRGBColorSpace;
  let lastBat = "";
  const drawBat = (pct, on) => { const k = on ? String(Math.round(pct)) : "off"; if (k === lastBat) return; lastBat = k; const g = batCv.getContext("2d"); g.fillStyle = on ? "#10131f" : "#050507"; g.fillRect(0, 0, 128, 232); if (!on) { batTex.needsUpdate = true; return; }
    const col = pct <= 20 ? "#ff5a3d" : "#8dff7a"; g.strokeStyle = "#ffffff"; g.lineWidth = 7; g.strokeRect(34, 46, 60, 100); g.fillStyle = "#ffffff"; g.fillRect(52, 34, 24, 12);
    g.fillStyle = col; const h = Math.max(3, 88 * pct / 100); g.fillRect(40, 140 - h, 48, h); g.font = "800 40px Montserrat, sans-serif"; g.textAlign = "center"; g.fillText(Math.round(pct) + "%", 64, 200); batTex.needsUpdate = true; };
  const people = [];
  houses.slice(0, 6).forEach((h, i) => { const left = h.g.position.x < 0; const p = new THREE.Group(); p.scale.setScalar(1.25); scene.add(p);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.85, 4, 12), mat(pCols[i], { roughness: 0.55 })); body.position.y = 0.78; body.castShadow = true; p.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 18, 14), mat(0xf0b993, { roughness: 0.6 })); head.position.y = 1.78; head.castShadow = true; p.add(head);
    const ph = new THREE.Group(); ph.position.set(0.34, 1.22, 0.56); ph.rotation.set(-0.22, -0.2, 0); p.add(ph);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 3, 8), mat(pCols[i], { roughness: 0.55 })); arm.position.set(0.4, 1.12, 0.3); arm.rotation.x = 1.1; p.add(arm);
    ph.add(new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.64, 0.05, 2, 0.02), mat(0x1c1a22, { roughness: 0.3 })));
    const sm = new THREE.MeshBasicMaterial(i === 0 ? { map: batTex, toneMapped: false } : { color: 0x000000, toneMapped: false }); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.57), sm); s.position.z = 0.03; ph.add(s);
    const pg = glow(0xbfe0ff, 1.6, 0); pg.position.set(0.34, 1.25, 0.75); p.add(pg);
    const home = V(left ? -4.7 : 4.7, 0.2, h.z + (left ? 1.3 : -1.3)), homeRy = left ? Math.PI / 2 : -Math.PI / 2;
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    const slot = V(side * (2.7 + row * 0.35), 0.2, -21.4 + row * 2.2), slotRy = -side * 0.6;
    people.push({ g: p, sm, pg, home, homeRy, slot, slotRy, i }); });
  // candles on a stool by each side house
  const candles = houses.slice(0, 6).map((h, i) => { const left = h.g.position.x < 0; const g = new THREE.Group(); g.position.set(left ? -5.1 : 5.1, 0.2, h.z + (left ? 3.2 : -3.2)); scene.add(g);
    add(g, new THREE.CylinderGeometry(0.42, 0.36, 0.7, 12), mat(0xb98a62), 0, 0.35, 0); add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.42, 10), mat(0xfff6e6), 0, 0.91, 0, { shadow: false });
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: C(0xffb347).multiplyScalar(2.6), toneMapped: false })); fl.scale.y = 1.8; fl.position.y = 1.24; g.add(fl);
    const gl = glow(0xff9d3c, 4.2, 0); gl.position.y = 1.3; g.add(gl); const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff9a40, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.06; g.add(pool);
    return { g, fl, gl, pool, i }; });

  // merge static town geometry by material
  { town.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(town.matrixWorld).invert(); const byMat = new Map(), drop = [];
    town.traverse((o) => { if (!o.isMesh || o.material.transparent || o.material.map || o.userData.dyn) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); for (const k of Object.keys(g.attributes)) if (!["position", "normal"].includes(k)) g.deleteAttribute(k);
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); if (!byMat.has(o.material)) byMat.set(o.material, []); byMat.get(o.material).push(g); drop.push(o); });
    drop.forEach((o) => o.parent.remove(o));
    for (const [m, gs] of byMat) { const mesh = new THREE.Mesh(mergeGeometries(gs, false), m); mesh.castShadow = true; mesh.receiveShadow = true; town.add(mesh); } }

  // ---------- particles ----------
  const NP = 420;
  const parts = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NP);
  parts.frustumCulled = false; parts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NP * 3), 3); scene.add(parts);
  const dummy = new THREE.Object3D(); const col = new THREE.Color();
  const hide = (im, i) => { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); };

  // ---------- post-processing ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: FX.half ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, RW, RH);
  gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: scale < 1 ? 6 : 10, distanceFallOff: 1, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 });
  gtao.blendIntensity = 0.85;
  if (FX.ao) composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.22, 0.5, 1.05); if (FX.bloom) composer.addPass(bloom);
  // tilt-shift (miniature look) + warm grade + vignette, all in one pass
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(RW, RH) }, focusY: { value: 0.6 }, band: { value: 0.2 }, blurAmt: { value: 1.0 }, vig: { value: 0.32 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; uniform float focusY, band, blurAmt, vig; varying vec2 vUv;
      void main(){
        float d = max(0.0, abs(vUv.y - focusY) - band); float r = clamp(d * 3.2, 0.0, 1.0) * blurAmt * 7.0;
        vec4 acc = vec4(0.0); float wsum = 0.0;
        for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) {
          vec2 o = vec2(float(i), float(j)) / 2.0; float w = exp(-dot(o,o)*1.5);
          acc += texture2D(tDiffuse, vUv + o * r / res) * w; wsum += w; }
        vec3 c = (acc / wsum).rgb;
        float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, 1.12);               // a touch more saturation
        c = (c - 0.5) * 1.06 + 0.5;                                                            // contrast
        c *= vec3(1.03, 1.0, 0.97);                                                            // warm
        vec2 q = vUv - 0.5; q.x *= res.x / res.y; float v = smoothstep(0.95, 0.25, length(q)); c *= mix(1.0 - vig, 1.0, v);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  if (FX.finish) composer.addPass(finish);
  composer.addPass(new OutputPass());
  Math.random = realRandom;
  // ---------- story functions (canonical time) ----------
  const NIGHT = (t) => ss(2.9, 5.2, t) - ss(56.4, 58.6, t);
  const wave = (z) => (z - HERO_Z) / 54 * 0.9;                                   // the blackout sweeps from the far end of the street towards us
  const mains = (t, z) => 1 - ss(2.8 + wave(z), 2.9 + wave(z), t) + ss(56.8 + wave(z), 57.0 + wave(z), t);
  const battery = (t) => (t > 4.6 && t < 57.2 ? (t < 4.75 ? (Math.floor(t * 40) % 2 ? 1 : 0.2) : 1) : 0);  // the one house flickers back on
  const FW = 14.04;
  const fanAngle = (t) => (t < 2.8 ? FW * t : t < 43.6 ? FW * (2.8 + 0.6 * (1 - Math.exp(-(t - 2.8) / 0.6))) : FW * (t - 60) + FW * 0.7 * Math.exp(-(t - 43.6) / 0.7));
  const DIE = [19.0, 15.6, 16.3, 17.0, 17.6, 18.2], CHG = [50.0, 50.5, 51.0, 51.5, 52.0, 52.5];
  const phonePct = (t) => (t < 3 ? 100 : t < 13.5 ? lerp(100, 15, (t - 3) / 10.5) : t < 19 ? lerp(15, 0, ss(13.5, 19, t)) : t < CHG[0] ? 0 : 100);
  const WALK = (i) => [47.3 + i * 0.18, 49.6 + i * 0.18, 56.4 + i * 0.1, 59.3];
  const DAYS = [[6, 1], [13, 2], [21, 3], [54.6, 7]];
  const day = (t) => { let d = null; for (const [a, n] of DAYS) if (t >= a) d = { n, since: t - a }; return t > 58.2 ? null : d; };
  const BURSTS = [
    ...[27, 12, -3].map((z, k) => ({ t: 2.8 + wave(z), p: V(k % 2 ? 2.7 : -2.7, 5.9, z), c: [PAL.spark, 0xffffff], n: 14, spd: 1.6, sz: 0.06 })),
    ...CHG.map((c, i) => ({ t: c, person: i, c: [PAL.ok, 0xffffff], n: 14, spd: 1.2, sz: 0.05 })),
    { t: 38.6, p: ps.position.clone().add(V(0, 0.6, 0.4)), c: [PAL.power, 0xffffff], n: 26, spd: 1.8, sz: 0.05 },
  ];

  // ---------- camera keys ----------
  const P0p = people[0].home, F = V(-12.0, 0, 5 - 2.5), PSP = ps.position;
  const keys = [
    { t: 0, pos: () => V(0, 30, 66), look: () => V(0, 2, 3), fov: 40 },
    { t: 4.8, pos: () => V(0, 26, 60), look: () => V(0, 2, 0), fov: 40 },
    { t: 9.0, pos: () => V(1.2, 8, 44), look: () => V(0, 1.8, 12), fov: 40 },
    { t: 12.6, pos: () => V(-1.2, 4.6, 33), look: () => V(1.5, 1.6, 17), fov: 40 },
    { t: 15.2, pos: () => V(-0.2, 2.6, 21.4), look: () => P0p.clone().add(V(-0.1, 1.55, 0)), fov: 38 },
    { t: 20.2, pos: () => V(0.6, 2.9, 14.6), look: () => P0p.clone().add(V(-0.1, 1.55, -0.3)), fov: 38 },
    { t: 23.6, pos: () => V(0.6, 3.6, 5.2), look: () => F.clone().add(V(0, 2.0, 0)), fov: 40 },
    { t: 28.4, pos: () => V(-2.0, 3.0, 4.0), look: () => F.clone().add(V(0, 1.9, 0)), fov: 38 },
    { t: 31.2, pos: () => V(0, 9.5, 14), look: () => V(0, 3, HERO_Z), fov: 40 },
    { t: 36.4, pos: () => V(0, 5.6, -8), look: () => V(0, 2.4, HERO_Z), fov: 40 },
    { t: 39.6, pos: () => PSP.clone().add(V(1.5, 3.6, 6.0)), look: () => PSP.clone().add(V(0, 0.5, -0.3)), fov: 38 },
    { t: 42.6, pos: () => PSP.clone().add(V(-0.6, 4.6, 7.2)), look: () => PSP.clone().add(V(0.3, 1.0, -0.8)), fov: 40 },
    { t: 46.6, pos: () => V(0, 9.5, -12.5), look: () => V(0, 1.4, HERO_Z + 1.6), fov: 44 },
    { t: 49.8, pos: () => V(0.6, 7.6, -1.5), look: () => V(0, 1.8, -21.5), fov: 40 },
    { t: 53.8, pos: () => V(-0.6, 8.2, -0.5), look: () => V(0, 1.8, -21.5), fov: 40 },
    { t: 56.8, pos: () => V(0, 24, 56), look: () => V(0, 2, 0), fov: 40 },
    { t: 60, pos: () => V(0, 30, 66), look: () => V(0, 2, 3), fov: 40 },
  ];
  const cr = (p0, p1, p2, p3, u) => { const u2 = u * u, u3 = u2 * u; return p1.clone().multiplyScalar(2).add(p2.clone().sub(p0).multiplyScalar(u)).add(p0.clone().multiplyScalar(2).sub(p1.clone().multiplyScalar(5)).add(p2.clone().multiplyScalar(4)).sub(p3).multiplyScalar(u2)).add(p1.clone().multiplyScalar(3).sub(p0).sub(p2.clone().multiplyScalar(3)).add(p3).multiplyScalar(u3)).multiplyScalar(0.5); };
  // Hermite with tangents clamped to the current segment length: smooth through keys, never overshoots
  const hc = (p0, p1, p2, p3, u) => {
    const seg = p2.distanceTo(p1);
    const m1 = p2.clone().sub(p0).multiplyScalar(0.5); if (m1.length() > seg) m1.setLength(seg);
    const m2 = p3.clone().sub(p1).multiplyScalar(0.5); if (m2.length() > seg) m2.setLength(seg);
    const u2 = u * u, u3 = u2 * u;
    return p1.clone().multiplyScalar(2 * u3 - 3 * u2 + 1).add(m1.multiplyScalar(u3 - 2 * u2 + u)).add(p2.clone().multiplyScalar(-2 * u3 + 3 * u2)).add(m2.multiplyScalar(u3 - u2));
  };
  const camAt = (t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    let u = clamp((t - k1.t) / (k2.t - k1.t)); u = u * u * (3 - 2 * u) * 0.65 + u * 0.35;
    return { P: hc(k0.pos(t), k1.pos(t), k2.pos(t), k3.pos(t), u), L: hc(k0.look(t), k1.look(t), k2.look(t), k3.look(t), u), fov: lerp(k1.fov, k2.fov, u) }; };
  // ---------- render ----------
  const ang = (a, b, u) => a + (((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * u;
  function render(t) {
    t = clamp(t, 0, 60);
    const N = NIGHT(t);
    // sky, fog, light
    for (const k of ["top", "mid", "hor", "low"]) skyU[k].value.copy(SKY[k][0]).lerp(SKY[k][1], N);
    skyU.sunAmt.value = 1 - N; sunGlow.material.opacity = 0.5 * (1 - N); moon.material.opacity = N; moonGlow.material.opacity = 0.32 * N; stars.material.opacity = 0.9 * N;
    scene.fog.color.copy(FOG_DAY).lerp(FOG_NIGHT, N); scene.environmentIntensity = lerp(0.28, 0.1, N);
    hemi.color.copy(HEMI.sky[0]).lerp(HEMI.sky[1], N); hemi.groundColor.copy(HEMI.ground[0]).lerp(HEMI.ground[1], N); hemi.intensity = lerp(0.55, 0.3, N);
    sun.color.copy(SUNC[0]).lerp(SUNC[1], N); sun.intensity = lerp(2.1, 0.7, N); rim.intensity = lerp(1.1, 0.25, N);
    cloudM.emissiveIntensity = lerp(0.45, 0.05, N);

    // houses and street lamps
    for (const h of houses) { const v = h === hero ? Math.max(mains(t, h.z), battery(t)) : mains(t, h.z);
      h.inM.emissiveIntensity = (h === hero ? 0.22 : 0.5) * v; h.winM.emissiveIntensity = 2.2 * v; h.bulbM.emissiveIntensity = 3.2 * v; h.spill.material.opacity = (h === hero ? 0.4 * (1 - ss(35.5, 38, t) * (1 - ss(54, 56, t))) : 0.32) * v * (0.5 + 0.5 * N); h.pool.material.opacity = 0.5 * v * (0.55 + 0.45 * N); }
    const heroOn = Math.max(mains(t, HERO_Z), battery(t));
    heroLamp.position.copy(HL(0, 3.3, 0.6)); heroLamp.intensity = 11 * heroOn * (0.35 + 0.65 * N);
    heroRoofM.opacity = 1 - 0.9 * ss(37.2, 38.6, t) * (1 - ss(46.8, 48.2, t)); heroRoofM.depthWrite = heroRoofM.opacity > 0.95;
    for (const l of lamps) { const v = mains(t, l.z); l.m.emissiveIntensity = 3 * v; l.gl.material.opacity = 0.55 * v; l.pool.material.opacity = 0.45 * v * (0.5 + 0.5 * N); }

    // candles: lit on day 1, blown out when the power returns
    for (const c of candles) { const on = pop(6.8 + c.i * 0.4, t, 0.4) * (1 - ss(56.9, 57.3, t)); const fk = 0.85 + 0.15 * Math.sin(t * 13 + c.i * 2.1) * Math.sin(t * 7.3 + c.i);
      c.g.visible = t > 6.2 && t < 58.4; c.g.scale.setScalar(S0(1.5 * pop(6.3 + c.i * 0.4, t, 0.4) * (1 - ss(58.0, 58.4, t)))); c.fl.visible = on > 0.05; c.fl.scale.set(on, 1.8 * on * fk, on); c.gl.material.opacity = 0.75 * on * fk; c.pool.material.opacity = 0.42 * on * fk; }

    // people: at home, then they walk over to the lit house (47-50) and home again at the end
    for (const p of people) { const [a, b, c, d] = WALK(p.i); const u = ease(clamp((t - a) / (b - a))) - ease(clamp((t - c) / (d - c)));
      const moving = (t > a && t < b) || (t > c && t < d);
      p.g.position.lerpVectors(p.home, p.slot, u); p.g.position.y += moving ? 0.1 * Math.abs(Math.sin(t * 9 + p.i)) : 0.02 * Math.sin(t * 2 + p.i);
      p.g.rotation.y = ang(p.homeRy, p.slotRy, u);
      const alive = t < DIE[p.i], charged = t >= CHG[p.i];
      const back = ss(58.4, 59.4, t);
      if (p.i === 0) drawBat(phonePct(t), alive || charged);
      else { if (alive) col.setHex(0xcfe6ff).multiplyScalar(1.5); else if (charged) col.setHex(PAL.ok).multiplyScalar(1.7).lerp(new THREE.Color(0xcfe6ff).multiplyScalar(1.5), back); else col.setHex(0x050507); p.sm.color.copy(col); }
      p.pg.material.color.setHex(charged && !alive ? PAL.ok : 0xbfe0ff); p.pg.material.opacity = (alive || charged ? 0.3 : 0) * (0.25 + 0.75 * N) * (alive && p.i === 0 && phonePct(t) < 20 ? 0.6 : 1); }

    // fridge: skin turns see-through on day 3, food goes off, a puddle spreads
    { const cut = ss(22.4, 23.4, t) * (1 - ss(29.5, 30.5, t)); fridgeSkin.opacity = 1 - 0.68 * cut; fridgeSkin.depthWrite = cut < 0.05; fridgeEdge.material.opacity = 0.9 * cut;
      const rot = ss(23.6, 27.5, t) * (1 - ss(57, 58, t)); foodM.forEach((m, k) => m.color.copy(foodFresh[k]).lerp(foodBad[k], rot));
      const pu = ss(23.0, 27.0, t) * (1 - ss(56.5, 58, t)); puddle.visible = pu > 0.01; puddle.scale.set(S0(1.3 * pu), 1, S0(0.9 * pu)); }

    // the box: cut-away 39.6-46, cells glow, cables carry power
    { const cut = ss(39.8, 40.6, t) * (1 - ss(45.6, 46.6, t)); psSkin.opacity = 1 - 0.64 * cut; psSkin.depthWrite = cut < 0.05; psEdge.material.opacity = 0.95 * cut;
      cellM.emissiveIntensity = 1.9 * cut * (0.85 + 0.15 * Math.sin(t * 6)); psHalo.material.opacity = 0.22 * ss(37.6, 38.6, t) * (1 - ss(39.6, 40.6, t));
      cableM.emissiveIntensity = 1.3 * ss(40.6, 41.4, t) * (1 - ss(54.5, 56, t)); }
    blades.rotation.z = -fanAngle(t);
    tablePhones.forEach((p, k) => { const on = battery(t) > 0.5 || mains(t, HERO_Z) > 0.5; p.sm.color.setHex(on ? PAL.ok : 0x050507).multiplyScalar(on ? 1.25 : 1); });

    // particles
    let q = 0;
    for (const B of BURSTS) { const dtb = t - B.t; if (dtb < 0 || dtb > 1.0) continue; const r2 = mulberry32(Math.round(B.t * 100) + 3);
      const c0 = B.p ? B.p : people[B.person].g.position.clone().add(V(0, 1.4, 0.3));
      for (let i = 0; i < B.n && q < NP; i++) { const d = V(r2() - 0.5, r2() - 0.25, r2() - 0.5).normalize(); const p = c0.clone().add(d.multiplyScalar(B.spd * (1 - Math.exp(-dtb * 3.5)))); p.y -= 1.6 * dtb * dtb;
        dummy.position.copy(p); dummy.rotation.set(r2() * 6, r2() * 6, dtb * 4); dummy.scale.setScalar(S0(B.sz * (1 - dtb) * (0.6 + r2()))); dummy.updateMatrix(); parts.setMatrixAt(q, dummy.matrix); col.setHex(B.c[i % B.c.length]).multiplyScalar(2.2); parts.setColorAt(q, col); q++; } }
    // power pulses along the three cables: lamp from 41.0, phones 42.3, fan 43.6
    cablePaths.forEach((cv, k) => { const t0 = 41.0 + k * 1.3; if (t < t0 || t > 56) return; const fade = 1 - ss(54.5, 56, t); const n = k === 0 ? 9 : 5;
      for (let i = 0; i < n && q < NP; i++) { const u = ((t - t0) * (k === 0 ? 0.42 : 0.7) + i / n) % 1; if ((t - t0) * (k === 0 ? 0.42 : 0.7) < 1 - i / n && u < i / n) continue;
        dummy.position.copy(cv.getPointAt(u)); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(S0(0.085 * fade * Math.sin(Math.PI * u) ** 0.4)); dummy.updateMatrix(); parts.setMatrixAt(q, dummy.matrix); col.setHex(PAL.power).multiplyScalar(2.6); parts.setColorAt(q, col); q++; } });
    // the smell of a warm fridge (day 3)
    if (t > 24.2 && t < 30.4) { const r2 = mulberry32(41); const base = fridge.getWorldPosition(V()); const inten = ss(24.2, 25.2, t) * (1 - ss(29.6, 30.4, t));
      for (let i = 0; i < 16 && q < NP; i++) { const age = (t * 0.45 + r2()) % 1; dummy.position.set(base.x + 0.9 + 0.5 * Math.sin(age * 6 + i), base.y + 1.0 + age * 3.2, base.z + (r2() - 0.5) * 1.2); dummy.rotation.set(i, age * 3, 0); dummy.scale.setScalar(S0(0.16 * inten * Math.sin(Math.PI * age)));
        dummy.updateMatrix(); parts.setMatrixAt(q, dummy.matrix); col.setHex(0x7fae4a).multiplyScalar(0.9); parts.setColorAt(q, col); q++; } }
    for (; q < NP; q++) hide(parts, q);
    parts.instanceMatrix.needsUpdate = true; parts.instanceColor.needsUpdate = true;

    // camera
    const cam = camAt(t);
    camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, H * 0.1, W, H); camera.updateProjectionMatrix();
    fill.position.copy(cam.L).lerp(cam.P, 0.35).add(V(0, 1.5, 0)); fill.intensity = 7 * N * (1 - 0.75 * ss(30.5, 33, t) * (1 - ss(54, 56.5, t)));
    const lp = cam.L.clone().project(camera); finish.uniforms.focusY.value = clamp(0.5 + lp.y * 0.5, 0.2, 0.85);
    const wide = 1 - ss(5, 8.5, t) + ss(55, 57, t);
    finish.uniforms.blurAmt.value = 0.55 + 0.2 * wide; finish.uniforms.band.value = lerp(0.2, 0.13, wide);
    const focus = cam.L.clone(); sun.position.set(focus.x + 60, focus.y + 90, focus.z + 70); sun.target.position.copy(focus);
    composer.render();
  }

  function debug(t) { render(t); const out = {}; for (const [k, v] of Object.entries({ hero: V(0, 2, HERO_Z), ps: ps.position, p0: people[0].g.position, fridge: fridge.getWorldPosition(V()) })) { const n = v.clone().project(camera); out[k] = [+n.x.toFixed(2), +n.y.toFixed(2)]; } return { t, ...out, cam: camera.position.toArray().map((x) => +x.toFixed(1)) }; }
  return { render, day, debug, scene, composer, passes: { gtao, bloom, finish } };
}
