// "Tembakan di Krakow" — sombre v2 look. A miniature Main Market Square on a floating island.
// Non-graphic by design: no weapon, no victims shown. The attack reads as a red route line and pulsing markers.
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
const pop = (t0, t, d = 0.45) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S0 = (x) => Math.max(0.0001, x);

export const PAL = {
  // warm afternoon (t<5) -> blue dusk (mood=1)
  skyA: [0x5d4fa8, 0xb784c4, 0xffb48c, 0xf59a9a],
  skyB: [0x141d3a, 0x34406e, 0x8a6f98, 0x5a4a78],
  grass: 0x7fb466, soil: 0x8a5a44, soilDark: 0x5e3a2e, tree: [0x5f9c58, 0x76ad62, 0x4f8a4c], trunk: 0x6a4a34,
  paving: 0xcdbfb2, cloth: 0xefe0c4, clothRoof: 0x9b5a45, brick: 0xa4483a, brickDark: 0x7c3329, spire: 0x5f9b86,
  houses: [0xf2d2a8, 0xe8b9a0, 0xf4e6c8, 0xd9c2d8, 0xc9d6b8, 0xf0c9b4, 0xe6d9b0], roof: 0x8a4a3c,
  danger: 0xff3b3b, police: 0x3d7bff, candle: 0xffc46b, safe: 0x7ee88f, yellow: 0xffc531,
};
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0, ...o });
const flat = (c, o = {}) => mat(c, { flatShading: true, roughness: 0.85, ...o });

export function createWorld(canvas, W, H, scale = 1, opts = {}) {
  const FX = { ao: opts.ao ?? true, bloom: opts.bloom ?? true, finish: opts.finish ?? true, msaa: opts.msaa ?? (scale < 1 ? 0 : 2), half: opts.half ?? true };
  const realRandom = Math.random; Math.random = mulberry32(1234);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  const fogA = new THREE.Color(0xf2a7a4), fogB = new THREE.Color(0x3a3a66);
  scene.fog = new THREE.Fog(0xf2a7a4, 300, 1400);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.5, 5000);

  // ---------- sky ----------
  const skyU = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, low: { value: new THREE.Color() }, sunDir: { value: V(-0.35, 0.08, -1).normalize() }, sunAmt: { value: 1 } };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(2400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform vec3 top,mid,hor,low,sunDir; uniform float sunAmt; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 c;
        if(h>0.0){ c = mix(hor, mid, smoothstep(0.0,0.28,h)); c = mix(c, top, smoothstep(0.25,0.85,h)); } else { c = mix(hor, low, smoothstep(0.0,-0.35,h)); }
        float s = max(dot(normalize(vDir), sunDir),0.0); c += sunAmt*(vec3(1.0,0.85,0.6)*pow(s,80.0)*0.6 + vec3(1.0,0.7,0.45)*pow(s,6.0)*0.12);
        gl_FragColor = vec4(c,1.0); }`,
  })));
  const skyCols = (m) => { const k = ["top", "mid", "hor", "low"]; k.forEach((n, i) => skyU[n].value.setHex(PAL.skyA[i]).lerp(new THREE.Color(PAL.skyB[i]), m)); };

  // ---------- light ----------
  const hemi = new THREE.HemisphereLight(0xffd8c2, 0xd99a86, 0.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffdcbc, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(scale < 1 ? 1024 : 2048, scale < 1 ? 1024 : 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.4; sun.shadow.radius = 5;
  const sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 600;
  scene.add(sun); scene.add(sun.target);
  const rim = new THREE.DirectionalLight(0xffa27a, 1.1); rim.position.set(-120, 60, -200); scene.add(rim);

  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.3, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, size, op = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false, fog: false })); s.scale.set(size, size, 1); scene.add(s); return s; };
  const sunGlow = glow(0xffd9a8, 240, 0.55); sunGlow.position.set(-700, 160, -2000);

  // ---------- island builder ----------
  const statics = new THREE.Group(); scene.add(statics);
  function islandAt(group, RX, RZ, seed) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.97, 1, 40, 1), flat(PAL.grass)); top.scale.set(RX, 3, RZ); top.position.y = -1.5; top.receiveShadow = true; group.add(top);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.985, 0.94, 1, 40, 1), flat(PAL.soil)); band.scale.set(RX, 5, RZ); band.position.y = -5.4; group.add(band);
    const cg = new THREE.ConeGeometry(1, 1, 20, 5); cg.rotateX(Math.PI);
    const p = cg.attributes.position; const r2 = mulberry32(seed);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0.49 && y > -0.49) { p.setX(i, p.getX(i) * (0.85 + 0.3 * r2())); p.setZ(i, p.getZ(i) * (0.85 + 0.3 * r2())); } }
    cg.computeVertexNormals();
    const under = new THREE.Mesh(cg, flat(PAL.soilDark)); under.scale.set(RX * 0.94, RX * 0.9, RZ * 0.94); under.position.y = -7.9 - RX * 0.45; group.add(under);
    for (let i = 0; i < 14; i++) { const a = r2() * Math.PI * 2, r = 0.25 + r2() * 0.5; const x = Math.cos(a) * RX * r * 0.8, z = Math.sin(a) * RZ * r * 0.8; const y0 = -8 - RX * 0.3 * (1 - r);
      const pts = []; for (let k = 0; k < 6; k++) pts.push(V(x + Math.sin(k + i) * 2.5, y0 - k * (5 + r2() * 3), z + Math.cos(k * 1.3 + i) * 2.5));
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.45, 5), flat(0x4f2e24))); }
  }
  islandAt(statics, 74, 66, 11);

  // ---------- the square ----------
  const SQ = 44; // paving half-size (x and z)
  { // cobbles texture
    const cv = document.createElement("canvas"); cv.width = cv.height = 512; const g = cv.getContext("2d"); g.fillStyle = "#cdbfb2"; g.fillRect(0, 0, 512, 512);
    const r = mulberry32(3); for (let y = 0; y < 512; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < 512; x += 16) { const l = 186 + Math.floor(r() * 26); g.fillStyle = `rgb(${l + 14},${l + 4},${l - 6})`; g.fillRect(x + 1, y + 1, 14, 14); }
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(12, 12); tx.anisotropy = 4;
    const pav = new THREE.Mesh(new THREE.BoxGeometry(SQ * 2 + 18, 0.3, SQ * 2 + 18), mat(0xffffff, { map: tx, roughness: 0.95 })); pav.position.y = 0.15; pav.receiveShadow = true; scene.add(pav);
    // streets leaving the square: Sławkowska (north), Grodzka (south), east street (police)
    const st = (x0, x1, z0, z1) => { const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.3, z1 - z0), mat(0xffffff, { map: tx, roughness: 0.95 })); s.position.set((x0 + x1) / 2, 0.14, (z0 + z1) / 2); s.receiveShadow = true; scene.add(s); };
    st(-26, -18, -66, -50); st(-12, -4, 52, 66); st(52, 76, 26, 34);
  }
  const statMats = new Map(); const addS = (geo, m, x, y, z, ry = 0) => { const g = geo.clone(); g.rotateY(ry); g.translate(x, y, z); if (!statMats.has(m)) statMats.set(m, []); statMats.get(m).push(g); };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const prism = (w, h, d) => { const g = new THREE.CylinderGeometry(1, 1, 1, 3, 1); g.rotateZ(Math.PI / 2); g.rotateX(Math.PI / 2); g.rotateZ(0); const p = g.attributes.position;
    // triangular roof: ridge along z
    const out = new THREE.BufferGeometry(); const s = [[-w / 2, 0], [w / 2, 0], [0, h]]; const v = [];
    const tri = (a, b, c) => v.push(...a, ...b, ...c);
    const A = (i, z) => [s[i][0], s[i][1], z];
    tri(A(0, d / 2), A(1, d / 2), A(2, d / 2)); tri(A(1, -d / 2), A(0, -d / 2), A(2, -d / 2));
    tri(A(0, -d / 2), A(0, d / 2), A(2, d / 2)); tri(A(0, -d / 2), A(2, d / 2), A(2, -d / 2));
    tri(A(1, d / 2), A(1, -d / 2), A(2, -d / 2)); tri(A(1, d / 2), A(2, -d / 2), A(2, d / 2));
    tri(A(0, d / 2), A(0, -d / 2), A(1, -d / 2)); tri(A(0, d / 2), A(1, -d / 2), A(1, d / 2));
    out.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); out.computeVertexNormals(); return out; };
  const winM = mat(0x3b3550, { roughness: 0.3, emissive: 0xffb36b, emissiveIntensity: 0 });
  const roofM = flat(PAL.roof), clothM = mat(PAL.cloth, { roughness: 0.85 }), clothRoofM = flat(PAL.clothRoof), arcadeM = mat(0x5a4a48, { roughness: 0.9 });
  const brickM = mat(PAL.brick, { roughness: 0.85 }), brickDM = mat(PAL.brickDark, { roughness: 0.9 }), spireM = flat(PAL.spire, { roughness: 0.6, metalness: 0.2 }), goldM = mat(0xe6b45a, { metalness: 0.6, roughness: 0.35 });
  const houseMs = PAL.houses.map((c) => mat(c, { roughness: 0.85 }));
  // townhouses around the square (front faces the square), with gaps for the three streets
  { const r = mulberry32(21);
    const side = (fixed, axis, from, to, face) => { let a = from; while (a < to - 3) { const w = 6 + Math.floor(r() * 3); const near = (axis === "x" && fixed > 0) || (axis === "z" && fixed < 0); const h = near ? 5 + r() * 3 : 9 + r() * 6; const d = 9; const m = houseMs[Math.floor(r() * houseMs.length)];
        const c = a + w / 2; const [x, z] = axis === "x" ? [c, fixed] : [fixed, c]; const ry = axis === "x" ? 0 : Math.PI / 2;
        // skip street gaps
        const gap = (axis === "x" && fixed < 0 && c > -28 && c < -16) || (axis === "x" && fixed > 0 && c > -14 && c < -2) || (axis === "z" && fixed > 0 && c > 24 && c < 36);
        if (!gap) { addS(box(w - 0.3, h, d), m, x, h / 2, z, ry); addS(prism(w - 0.1, 3.2, d + 0.4), roofM, x, h, z, ry);
          for (let fl = 0; fl < Math.floor(h / 3.2); fl++) for (let k = 0; k < Math.floor(w / 2.4); k++) { const off = -w / 2 + 1.5 + k * 2.4; const wy = 2.2 + fl * 3.2;
            const [wx, wz] = axis === "x" ? [x + off, z - face * (d / 2 + 0.05)] : [x - face * (d / 2 + 0.05), z + off]; addS(box(axis === "x" ? 1.1 : 0.1, 1.6, axis === "x" ? 0.1 : 1.1), winM, wx, wy, wz); } }
        a += w; } };
    side(-SQ - 5, "x", -SQ - 9, SQ + 9, -1); side(SQ + 5, "x", -SQ - 9, SQ + 9, 1);
    side(-SQ - 5, "z", -SQ, SQ, -1); side(SQ + 5, "z", -SQ, SQ, 1);
  }
  // Cloth Hall (Sukiennice) in the middle: long hall, arcades, crenellated attic, corner turrets
  const CH = { x: 0, z: 2, w: 12, l: 46, h: 8 };
  { addS(box(CH.w, CH.h, CH.l), clothM, CH.x, CH.h / 2, CH.z); addS(prism(CH.w - 1, 4, CH.l - 1), clothRoofM, CH.x, CH.h, CH.z);
    for (let i = 0; i < 13; i++) { const z = CH.z - CH.l / 2 + 2 + i * 3.5; for (const sx of [-1, 1]) addS(box(0.3, 4.2, 2.2), arcadeM, CH.x + sx * (CH.w / 2 + 0.02), 2.1, z); }
    for (let i = 0; i < 24; i++) { const z = CH.z - CH.l / 2 + 1 + i * (CH.l - 2) / 23; for (const sx of [-1, 1]) addS(box(0.8, 1.4, 0.9), clothM, CH.x + sx * (CH.w / 2 - 0.4), CH.h + 0.7 + (i % 2) * 0.4, z); }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { addS(box(1.6, 3.4, 1.6), clothM, CH.x + sx * (CH.w / 2 - 0.8), CH.h + 1.7, CH.z + sz * (CH.l / 2 - 0.8)); addS(new THREE.ConeGeometry(1.2, 2.4, 4), clothRoofM, CH.x + sx * (CH.w / 2 - 0.8), CH.h + 4.6, CH.z + sz * (CH.l / 2 - 0.8), Math.PI / 4); }
    addS(box(CH.w + 0.4, 0.5, 4), clothM, CH.x, CH.h + 0.25, CH.z); }
  // St Mary's Basilica (NE corner): nave + two unequal towers facing west
  const SM = { x: 34, z: -28 };
  { addS(box(22, 15, 11), brickM, SM.x + 7, 7.5, SM.z); addS(prism(11, 7, 22), brickDM, SM.x + 7, 15, SM.z, Math.PI / 2);
    for (let i = 0; i < 5; i++) for (const sz of [-1, 1]) addS(box(1.6, 8, 0.2), winM, SM.x + 0 + i * 4, 7, SM.z + sz * 5.6);
    // taller north tower with the crown of pinnacles and a green spire
    const T1 = { x: SM.x - 4, z: SM.z - 3.8 }; addS(box(5, 30, 5), brickM, T1.x, 15, T1.z); addS(box(5.4, 1, 5.4), brickDM, T1.x, 30, T1.z);
    addS(new THREE.ConeGeometry(2.6, 6, 8), spireM, T1.x, 34, T1.z); addS(new THREE.ConeGeometry(1.2, 10, 8), spireM, T1.x, 41, T1.z);
    for (const [px, pz] of [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]]) addS(new THREE.ConeGeometry(0.6, 4.5, 6), spireM, T1.x + px, 32.6, T1.z + pz);
    addS(new THREE.SphereGeometry(0.5, 8, 6), goldM, T1.x, 46.4, T1.z);
    // shorter south tower with a small dome
    const T2 = { x: SM.x - 4, z: SM.z + 3.8 }; addS(box(4.6, 23, 4.6), brickM, T2.x, 11.5, T2.z); addS(new THREE.SphereGeometry(2.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), spireM, T2.x, 23, T2.z); addS(new THREE.ConeGeometry(0.5, 3, 6), spireM, T2.x, 26.6, T2.z);
    for (const T of [T1, T2]) for (let k = 0; k < 4; k++) addS(box(0.1, 3, 1.2), winM, T.x - 2.56, 8 + k * 5, T.z); }
  // Town Hall Tower (SW of the Cloth Hall)
  const TH = { x: -20, z: 20 };
  { addS(box(6, 24, 6), brickM, TH.x, 12, TH.z); addS(box(6.6, 1, 6.6), brickDM, TH.x, 24, TH.z); addS(new THREE.ConeGeometry(3, 4, 8), spireM, TH.x, 26.5, TH.z); addS(new THREE.ConeGeometry(0.9, 6, 8), spireM, TH.x, 31, TH.z);
    for (let k = 0; k < 5; k++) addS(box(0.1, 2.2, 1.4), winM, TH.x + 3.06, 5 + k * 4, TH.z); }
  // Adam Mickiewicz-style monument plinth (generic) east of the Cloth Hall
  addS(box(3, 3, 3), mat(0x8c8e98, { roughness: 0.6 }), 14, 1.5, 24); addS(new THREE.CylinderGeometry(0.8, 1, 3.4, 8), mat(0x51605a, { metalness: 0.4, roughness: 0.4 }), 14, 4.7, 24);
  // market stalls along the east side of the Cloth Hall
  { const r = mulberry32(5); const stallCols = [0xe9e2d6, 0xc94a3c];
    for (let i = 0; i < 9; i++) { const x = 12, z = -18 + i * 4.4; addS(box(3.2, 2.4, 3.2), mat(0x8a6447), x, 1.2, z); addS(prism(3.8, 1.6, 3.8), mat(stallCols[i % 2], { roughness: 0.8 }), x, 2.4, z); } }
  // trees around the square, outside the houses
  { const r = mulberry32(9); const treeG = new THREE.IcosahedronGeometry(1, 1), trunkG = new THREE.CylinderGeometry(0.35, 0.5, 3, 7);
    const tms = PAL.tree.map((c) => flat(c)), trunkM = flat(PAL.trunk);
    let n = 0, guard = 0; while (n < 46 && guard++ < 2000) { const a = r() * Math.PI * 2, rr = 0.86 + r() * 0.1; const x = Math.cos(a) * 74 * rr, z = Math.sin(a) * 66 * rr;
      if (Math.abs(x) < SQ + 12 && Math.abs(z) < SQ + 12) continue; if (x > -30 && x < -14 && z < 0) continue; if (x > -16 && x < 0 && z > 0) continue; if (z > 22 && z < 38 && x > 0) continue;
      const s = 2.2 + r() * 2.0; const tg = treeG.clone(); tg.scale(s, s * 1.15, s); addS(tg, tms[n % 3], x, s + 2.6, z);
      addS(trunkG, trunkM, x, 1.5, z); n++; } }
  // merge statics by material
  for (const [m, gs] of statMats) { const gg = gs.map((g) => { const h = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(h.attributes)) if (!["position", "normal"].includes(k)) h.deleteAttribute(k); return h; });
    const mesh = new THREE.Mesh(mergeGeometries(gg, false), m); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); }

  // street lamps (glow at dusk)
  const lamps = []; { const pm = mat(0x2b2b33, { metalness: 0.5, roughness: 0.4 });
    const pts = []; for (let i = -3; i <= 3; i++) { pts.push([i * 12, -SQ + 2], [i * 12, SQ - 2]); } for (let i = -2; i <= 2; i++) pts.push([-SQ + 2, i * 14], [SQ - 2, i * 14]);
    for (const [x, z] of pts) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4, 6), pm); p.position.set(x, 2, z); scene.add(p); const g = glow(0xffc27a, 4, 0); g.position.set(x, 4.3, z); lamps.push(g); } }
  // Polish flag on the Town Hall Tower (half-mast at the end)
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 8, 6), mat(0xdddddd, { metalness: 0.6 })); flagPole.position.set(TH.x, 37.5, TH.z); scene.add(flagPole);
  const flag = new THREE.Group(); scene.add(flag);
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.9), mat(0xf4f4f4, { side: THREE.DoubleSide })); w.position.set(1.6, 0.45, 0); const rd = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.9), mat(0xd4213d, { side: THREE.DoubleSide })); rd.position.set(1.6, -0.45, 0); flag.add(w, rd); }

  // ---------- crowd (instanced; heads share the matrices) ----------
  const NPPL = 170;
  const bodyG = new THREE.CylinderGeometry(0.42, 0.5, 1.5, 8); bodyG.translate(0, 0.75, 0);
  const headG = new THREE.SphereGeometry(0.34, 10, 8); headG.translate(0, 1.85, 0);
  const bodies = new THREE.InstancedMesh(bodyG, mat(0xffffff, { roughness: 0.8 }), NPPL); bodies.castShadow = true; scene.add(bodies);
  const heads = new THREE.InstancedMesh(headG, mat(0xf0c6a4, { roughness: 0.7 }), NPPL); heads.castShadow = true; scene.add(heads);
  const ppl = []; { const r = mulberry32(31); const cs = [0x3f6fb5, 0xd65a4a, 0xf2c14e, 0x6aa86a, 0xe9e2d6, 0x8b5fbf, 0x2f3542, 0xe58f5b]; const c = new THREE.Color();
    let guard = 0; while (ppl.length < NPPL && guard++ < 6000) { const x = (r() * 2 - 1) * (SQ - 2), z = (r() * 2 - 1) * (SQ - 2);
      if (Math.abs(x - CH.x) < CH.w / 2 + 1.5 && Math.abs(z - CH.z) < CH.l / 2 + 1.5) continue; if (x > SM.x - 8 && z < SM.z + 8) continue; if (Math.hypot(x - TH.x, z - TH.z) < 5) continue;
      if (Math.abs(x - 12) < 2.5 && z > -21 && z < 21) continue;
      const i = ppl.length; ppl.push({ x, z, ph: r() * 6.28, dir: r() * 6.28, flee: 6.0 + r() * 3.2, fdir: 0 }); bodies.setColorAt(i, c.setHex(cs[i % cs.length])); }
    bodies.instanceColor.needsUpdate = true; }

  // ---------- vehicles ----------
  const mkCar = (body, top) => { const g = new THREE.Group(); const b = new THREE.Mesh(new RoundedBoxGeometry(2.4, 1.1, 4.6, 3, 0.35), mat(body, { roughness: 0.35, metalness: 0.3 })); b.position.y = 0.85; b.castShadow = true; g.add(b);
    const c = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.9, 2.6, 3, 0.3), mat(top, { roughness: 0.15, metalness: 0.2 })); c.position.set(0, 1.75, 0.3); c.castShadow = true; g.add(c);
    for (const [x, z] of [[-1.1, -1.5], [1.1, -1.5], [-1.1, 1.5], [1.1, 1.5]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), mat(0x18181c)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w); }
    scene.add(g); return g; };
  const sCar = mkCar(0x15151a, 0x2a2f3a); const head1 = glow(0xfff1d0, 3, 0), head2 = glow(0xfff1d0, 3, 0);
  const police = [0, 1, 2].map(() => { const g = mkCar(0xf4f6fb, 0x2b56b8); const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.4), mat(0x222222)); bar.position.set(0, 2.32, 0.3); g.add(bar); return { g, r: glow(PAL.danger, 4, 0), b: glow(PAL.police, 4, 0) }; });

  // suspect route (canonical time keys). North entry via Sławkowska, three stops on the west side, out by Grodzka, arrest 1 km south (compressed).
  const ROUTE = [
    [4.6, -22, -72], [6.2, -22, -38], [7.2, -28, -24], [8.2, -28, -24], [9.4, -30, -2], [10.2, -30, -2], [11.2, -26, 22], [12.4, -26, 22],
    [14.0, -16, 36], [16.0, -8, 40], [19.5, -8, 58], [21.4, -8, 64], [60, -8, 64],
  ];
  const STOPS = [[-28, -24], [-30, -2], [-26, 22], [-12, 38]];
  const pathAt = (K, t) => { if (t <= K[0][0]) return V(K[0][1], 0, K[0][2]); for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const u = ease((t - K[i - 1][0]) / (K[i][0] - K[i - 1][0])); return V(lerp(K[i - 1][1], K[i][1], u), 0, lerp(K[i - 1][2], K[i][2], u)); } const k = K[K.length - 1]; return V(k[1], 0, k[2]); };
  // heading: precomputed, holds when stationary
  const HD = new Map(); const headingOf = (K, id) => { const arr = []; let h = 0; for (let k = 0; k <= 6000; k++) { const t = k / 100; const a = pathAt(K, t - 0.05), b = pathAt(K, t + 0.05); const d = b.sub(a); if (d.length() > 0.02) h = Math.atan2(d.x, d.z); arr.push(h); } HD.set(id, arr); };
  const hAt = (id, t) => HD.get(id)[clamp(Math.round(t * 100), 0, 6000)];
  headingOf(ROUTE, "s");
  const PK = [0, 1, 2].map((i) => [[14.5 + i * 0.5, 82, 30 - i * 0.2], [16.4 + i * 0.5, 40, 30], [18.0 + i * 0.5, -4, 40 + i * 0.3], [21.0 + i * 0.3, -8 + (i - 1) * 3.4, 56 - i * 2.6], [60, -8 + (i - 1) * 3.4, 56 - i * 2.6]]);
  PK.forEach((K, i) => headingOf(K, "p" + i));

  // red route trail (instanced ribbon pieces)
  const NT = 400; const trailM = new THREE.MeshBasicMaterial({ color: PAL.danger, toneMapped: false, transparent: true, opacity: 0.9 });
  const trail = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.08, 1), trailM, NT); trail.frustumCulled = false; scene.add(trail);
  const trailPts = []; { let prev = null; for (let t = 4.6; t <= 21.4 && trailPts.length < NT; t += 0.02) { const p = pathAt(ROUTE, t); if (prev && p.distanceTo(prev) < 0.55) continue; if (prev) trailPts.push({ t, a: prev.clone(), b: p.clone() }); prev = p; } }
  // pulsing markers at the stops + arrest ring
  const ringG = new THREE.RingGeometry(0.85, 1, 48); ringG.rotateX(-Math.PI / 2);
  const markers = STOPS.map(([x, z]) => { const m = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: PAL.danger, transparent: true, opacity: 0, toneMapped: false, depthWrite: false })); m.position.set(x, 0.4, z); scene.add(m);
    const pin = new THREE.Group(); const pm = mat(PAL.danger, { emissive: PAL.danger, emissiveIntensity: 0.9 }); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), pm); ball.position.y = 1.5; const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 16), pm); cone.rotation.x = Math.PI; cone.position.y = 0.55; pin.add(ball, cone); pin.position.set(x, 5.5, z); scene.add(pin); return { ring: m, pin }; });
  const STOP_T = [7.2, 9.4, 11.2, 14.4];
  const arrestRing = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: PAL.police, transparent: true, opacity: 0, toneMapped: false, depthWrite: false })); arrestRing.position.set(-8, 0.4, 62); scene.add(arrestRing);
  const officers = [0, 1].map((i) => { const g = new THREE.Group(); const b = new THREE.Mesh(bodyG, mat(0x1f2f5a)); const h = new THREE.Mesh(headG, mat(0xf0c6a4)); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 10), mat(0x101a33)); cap.position.y = 2.15; g.add(b, h, cap); g.position.set(-11.5 + i * 7, 0.3, 60); g.scale.setScalar(1.3); scene.add(g); return g; });
  const arrestPin = new THREE.Group(); { const pm = mat(PAL.police, { emissive: PAL.police, emissiveIntensity: 0.9 }); const ball = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), pm); ball.position.y = 1.8; const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2, 16), pm); cone.rotation.x = Math.PI; cone.position.y = 0.6; arrestPin.add(ball, cone); arrestPin.position.set(-8, 6.5, 64); scene.add(arrestPin); }

  // ---------- candles ----------
  const mkCandle = () => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 10), mat(0xf6efe2, { roughness: 0.6 })); c.position.y = 0.55; c.castShadow = true;
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 1.3, 10), new THREE.MeshPhysicalMaterial({ color: 0xff5040, transparent: true, opacity: 0.55, roughness: 0.2 })); jar.position.y = 0.65;
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false })); fl.position.y = 1.35; g.add(c, jar, fl); scene.add(g); const gl = glow(PAL.candle, 3.2, 0); return { g, gl }; };
  const victims = STOPS.slice(0, 3).flatMap(([x, z], i) => [mkCandle(), mkCandle()].map((c, k) => ({ ...c, x: x + 2.4 + k * 1.3, z: z + (k ? 0.9 : -0.6), t0: 29.6 + (i * 2 + k) * 0.32 })));
  const vigil = []; for (let i = 0; i < 44; i++) { const c = mkCandle(); const side = i % 2 ? 1 : -1; vigil.push({ ...c, x: CH.x - CH.w / 2 - 2.2 - (i % 4 < 2 ? 0 : 1.2), z: CH.z - 20 + Math.floor(i / 2) * 1.85, t0: 54.2 + i * 0.03 }); }

  // ---------- the suspect's home town (small far island) ----------
  const HO = V(150, -6, 70);
  const home = new THREE.Group(); home.position.copy(HO); scene.add(home);
  { islandAt(home, 22, 20, 41);
    const blk = new THREE.Mesh(new RoundedBoxGeometry(12, 14, 9, 2, 0.2), mat(0xb9b2aa, { roughness: 0.9 })); blk.position.set(0, 7, -2); blk.castShadow = true; blk.receiveShadow = true; home.add(blk);
    for (let f = 0; f < 4; f++) for (let k = 0; k < 4; k++) { const w = new THREE.Mesh(box(1.4, 1.6, 0.1), mat(0x2d2a38, { roughness: 0.3 })); w.position.set(-4.2 + k * 2.8, 2.6 + f * 3.1, 2.56); home.add(w); }
    const door = new THREE.Mesh(box(2, 2.6, 0.2), mat(0x4a3b33)); door.position.set(0, 1.3, 2.6); home.add(door);
    const pav = new THREE.Mesh(box(18, 0.3, 8), mat(0xc5bcb2)); pav.position.set(0, 0.15, 6); pav.receiveShadow = true; home.add(pav);
    for (const [x, z] of [[-7, 9], [8, -6], [-8, -8], [9, 8]]) { const t = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 1), flat(PAL.tree[1])); t.position.set(x, 4.4, z); t.castShadow = true; home.add(t); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 6), flat(PAL.trunk)); tr.position.set(x, 1.5, z); home.add(tr); } }
  const homeCandles = [0, 1, 2].map((i) => { const c = mkCandle(); return { ...c, x: HO.x - 1.6 + i * 1.6, z: HO.z + 4.6, y: HO.y + 0.3, t0: 34.6 + i * 0.4 }; });
  const homeTag = (() => { const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; const g = cv.getContext("2d");
    g.fillStyle = "rgba(20,24,44,0.85)"; g.beginPath(); g.roundRect(4, 4, 504, 120, 30); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 6; g.stroke();
    g.font = "800 50px Montserrat, sans-serif"; g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("OSTROWIEC", 256, 68);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })); s.scale.set(12, 3, 1); s.position.copy(HO).add(V(0, 19, 0)); scene.add(s); return s; })();
  // permit card (no weapon shown): a sports-shooting permit with a target icon
  const card = (() => { const cv = document.createElement("canvas"); cv.width = 640; cv.height = 400; const g = cv.getContext("2d");
    g.fillStyle = "#f5f1e8"; g.beginPath(); g.roundRect(0, 0, 640, 400, 40); g.fill(); g.fillStyle = "#d4213d"; g.beginPath(); g.roundRect(0, 0, 640, 96, [40, 40, 0, 0]); g.fill();
    g.font = "800 50px Montserrat, sans-serif"; g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText("PERMIT", 40, 50);
    for (let r = 4; r >= 1; r--) { g.fillStyle = r % 2 ? "#d4213d" : "#fff"; g.beginPath(); g.arc(170, 250, r * 26, 0, 6.29); g.fill(); }
    g.fillStyle = "#2a2a35"; g.font = "800 52px Montserrat, sans-serif"; g.fillText("SUKAN", 320, 210); g.fillText("MENEMBAK", 320, 280);
    g.fillStyle = "#b9b2aa"; g.fillRect(320, 330, 260, 16);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.BoxGeometry(12.8, 8, 0.3), [mat(0xf5f1e8), mat(0xf5f1e8), mat(0xf5f1e8), mat(0xf5f1e8), mat(0xffffff, { map: tx, roughness: 0.5, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 0.25 }), mat(0xe6e0d4)]);
    m.castShadow = true; scene.add(m); return m; })();
  // dark cloud of ideology above the home island
  const storm = new THREE.Group(); scene.add(storm);
  { const cm = flat(0x2c2638, { roughness: 1, emissive: 0x5a1020, emissiveIntensity: 0.0 }); const r = mulberry32(77);
    for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), cm); const s = 3 + r() * 3; b.scale.set(s * 1.4, s * 0.8, s); b.position.set((r() - 0.5) * 18, r() * 3, (r() - 0.5) * 8); storm.add(b); } storm.userData.m = cm; storm.position.copy(HO).add(V(0, 30, -4)); }
  const flash = glow(0xff3b5c, 30, 0); flash.position.copy(storm.position);
  // shield (Poland: one of the safest countries)
  const shield = (() => { const s = new THREE.Shape(); s.moveTo(0, 10); s.quadraticCurveTo(5, 9.6, 8, 8); s.lineTo(8, 1); s.quadraticCurveTo(7, -5, 0, -8.5); s.quadraticCurveTo(-7, -5, -8, 1); s.lineTo(-8, 8); s.quadraticCurveTo(-5, 9.6, 0, 10);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.4, bevelSegments: 3 }); g.center();
    const m = new THREE.Mesh(g, mat(PAL.safe, { emissive: PAL.safe, emissiveIntensity: 0.5, transparent: true, opacity: 0.85, roughness: 0.3 })); scene.add(m);
    const ck = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.7, 8, 24, Math.PI * 1.1), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 })); m.add(ck); ck.position.z = 1.2; ck.rotation.z = Math.PI * 1.05;
    return m; })();
  const shieldGlow = glow(PAL.safe, 60, 0);

  // ---------- post-processing ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: FX.half ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, RW, RH);
  gtao.updateGtaoMaterial({ radius: 0.8, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: scale < 1 ? 6 : 10, distanceFallOff: 1, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 });
  gtao.blendIntensity = 0.85;
  if (FX.ao) composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.3, 0.5, 1.0); if (FX.bloom) composer.addPass(bloom);
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(RW, RH) }, focusY: { value: 0.6 }, band: { value: 0.2 }, blurAmt: { value: 1.0 }, vig: { value: 0.32 }, mood: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; uniform float focusY, band, blurAmt, vig, mood; varying vec2 vUv;
      void main(){
        float d = max(0.0, abs(vUv.y - focusY) - band); float r = clamp(d * 3.2, 0.0, 1.0) * blurAmt * 7.0;
        vec4 acc = vec4(0.0); float wsum = 0.0;
        for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) { vec2 o = vec2(float(i), float(j)) / 2.0; float w = exp(-dot(o,o)*1.5); acc += texture2D(tDiffuse, vUv + o * r / res) * w; wsum += w; }
        vec3 c = (acc / wsum).rgb;
        float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, mix(1.12, 0.78, mood));
        c = (c - 0.5) * 1.06 + 0.5;
        c *= mix(vec3(1.03, 1.0, 0.97), vec3(0.93, 0.97, 1.06), mood);
        vec2 q = vUv - 0.5; q.x *= res.x / res.y; float v = smoothstep(0.95, 0.25, length(q)); c *= mix(1.0 - vig - 0.12 * mood, 1.0, v);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  if (FX.finish) composer.addPass(finish);
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- camera ----------
  let curT = 0;
  const carP = () => pathAt(ROUTE, curT);
  const W0 = { pos: V(-120, 100, 160), look: V(0, 4, -2) };
  const HP = (x, y, z) => () => HO.clone().add(V(x, y, z));
  const keys = [
    { t: 0, pos: () => W0.pos, look: () => W0.look, fov: 40 },
    { t: 4.2, pos: () => V(-100, 84, 130), look: () => V(0, 4, -8), fov: 40 },
    { t: 6.4, pos: () => V(-120, 88, 40), look: () => V(-22, 2, -28), fov: 40 },
    { t: 9.8, pos: () => carP().add(V(-62, 56, 52)), look: () => carP().add(V(4, 1, -2)), fov: 40 },
    { t: 12.6, pos: () => carP().add(V(-60, 58, 60)), look: () => carP().add(V(4, 1, 2)), fov: 40 },
    { t: 16.0, pos: () => V(90, 90, 160), look: () => V(4, 1, 34), fov: 42 },
    { t: 19.6, pos: () => V(62, 62, 128), look: () => V(-6, 1, 46), fov: 40 },
    { t: 23.0, pos: () => V(36, 42, 128), look: () => V(-8, 1.5, 60), fov: 40 },
    { t: 28.0, pos: () => V(40, 38, 122), look: () => V(-8, 1.5, 60), fov: 40 },
    { t: 30.4, pos: () => V(-100, 66, 52), look: () => V(-25, 1, 0), fov: 40 },
    { t: 33.0, pos: () => V(-100, 64, 32), look: () => V(-25, 1, -4), fov: 40 },
    { t: 35.2, pos: HP(-30, 28, 62), look: HP(0, 5, 2), fov: 40 },
    { t: 38.8, pos: HP(-32, 34, 76), look: HP(0, 14, 0), fov: 40 },
    { t: 44.5, pos: HP(16, 40, 84), look: HP(0, 20, 0), fov: 42 },
    { t: 47.2, pos: () => V(-30, 150, 270), look: () => V(10, 20, 0), fov: 42 },
    { t: 53.0, pos: () => V(-60, 120, 240), look: () => V(0, 16, 0), fov: 42 },
    { t: 56.0, pos: () => V(-90, 60, 86), look: () => V(-8, 4, 2), fov: 40 },
    { t: 60, pos: () => W0.pos, look: () => W0.look, fov: 40 },
  ];
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

  const dummy = new THREE.Object3D(); const hideI = (im, i) => { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); };
  const placeCandle = (c, t, y = 0.3) => { const s = pop(c.t0, t, 0.4); c.g.visible = s > 0.01; c.g.scale.setScalar(S0(s) * 1.4); c.g.position.set(c.x, c.y ?? y, c.z);
    c.gl.position.set(c.x, (c.y ?? y) + 2.0, c.z); c.gl.material.opacity = 0.75 * ss(c.t0 + 0.1, c.t0 + 0.5, t) * (0.85 + 0.15 * Math.sin(t * 13 + c.x)); };

  // ---------- render ----------
  function render(t) {
    t = clamp(t, 0, 60); curT = t;
    const mood = ss(4.4, 6.5, t);
    skyCols(mood); skyU.sunAmt.value = 1 - mood; scene.fog.color.copy(fogA).lerp(fogB, mood);
    sun.intensity = lerp(2.6, 1.0, mood); sun.color.setHex(0xffdcbc).lerp(new THREE.Color(0xb8c4ff), mood);
    hemi.intensity = lerp(0.55, 0.42, mood); hemi.color.setHex(0xffd8c2).lerp(new THREE.Color(0x9aa6d8), mood); hemi.groundColor.setHex(0xd99a86).lerp(new THREE.Color(0x5a4a6a), mood);
    rim.color.setHex(0xffa27a).lerp(new THREE.Color(0x8a7cff), mood); sunGlow.material.opacity = 0.55 * (1 - mood);
    winM.emissiveIntensity = 0.15 + 0.9 * mood; lamps.forEach((g) => (g.material.opacity = 0.9 * mood));

    // crowd: strolls, then scatters away from the route once the car is in the square; returns for the vigil at the end
    const back = ss(54.6, 55.6, t);
    for (let i = 0; i < NPPL; i++) { const p = ppl[i]; let x = p.x + Math.sin(t * 0.4 + p.ph) * 0.8, z = p.z + Math.cos(t * 0.33 + p.ph) * 0.8;
      const run = ss(p.flee, p.flee + 2.4, t) * (1 - back); const ang = Math.atan2(p.z - 0, p.x - (-30)); x += Math.cos(ang) * 26 * run; z += Math.sin(ang) * 10 * run;
      const s = back > 0 ? pop(54.6 + (i % 20) * 0.05, t, 0.4) : 1 - ss(p.flee + 1.4, p.flee + 2.6, t);
      if (s < 0.01) { hideI(bodies, i); hideI(heads, i); continue; }
      dummy.position.set(x, 0.3 + Math.abs(Math.sin(t * (run > 0.01 ? 9 : 2.2) + p.ph)) * (run > 0.01 ? 0.25 : 0.05), z); dummy.rotation.set(0, run > 0.01 ? ang + Math.PI / 2 : p.dir, 0); dummy.scale.setScalar(S0(s) * 1.25); dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix); heads.setMatrixAt(i, dummy.matrix); }
    bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;

    // suspect car + trail + markers
    const cp = pathAt(ROUTE, t); const carOn = t > 4.6 && t < 47;
    sCar.visible = carOn; sCar.position.copy(cp).setY(0.3); sCar.rotation.y = hAt("s", t);
    const fwd = V(Math.sin(sCar.rotation.y), 0, Math.cos(sCar.rotation.y)), rgt = V(fwd.z, 0, -fwd.x);
    const hl = carOn && t < 21.6 ? 1 : 0; [head1, head2].forEach((h, k) => { h.position.copy(cp).add(fwd.clone().multiplyScalar(2.5)).add(rgt.clone().multiplyScalar(k ? 0.8 : -0.8)).setY(1.1); h.material.opacity = 0.9 * hl * mood; });
    const trailFade = 1 - ss(44, 46.5, t);
    for (let k = 0; k < NT; k++) { const P = trailPts[k]; if (!P || P.t > t || trailFade <= 0) { hideI(trail, k); continue; }
      const d = P.b.clone().sub(P.a); dummy.position.copy(P.a).add(P.b).multiplyScalar(0.5).setY(0.42); dummy.rotation.set(0, Math.atan2(d.x, d.z), 0); dummy.scale.set(1.1, 1, d.length() + 0.1); dummy.updateMatrix(); trail.setMatrixAt(k, dummy.matrix); }
    trail.instanceMatrix.needsUpdate = true; trailM.opacity = 0.9 * trailFade;
    markers.forEach((m, i) => { const t0 = STOP_T[i]; const on = t >= t0 && t < 46.5; const ph = ((t - t0) % 0.9) / 0.9;
      m.ring.material.opacity = on ? 0.9 * (1 - ph) * (1 - ss(44, 46.5, t)) : 0; m.ring.scale.setScalar(1 + ph * 5);
      const s = pop(t0, t, 0.4) * (1 - ss(44, 46.5, t)); m.pin.visible = s > 0.01; m.pin.scale.setScalar(S0(s) * 1.2); m.pin.position.y = 5.5 + Math.sin(t * 2 + i) * 0.3; m.pin.rotation.y = t; });

    // police
    police.forEach((P, i) => { const K = PK[i]; const on = t > K[0][0] && t < 47; P.g.visible = on; const p = pathAt(K, t); P.g.position.copy(p).setY(0.3); P.g.rotation.y = hAt("p" + i, t);
      const blink = Math.floor(t * 6 + i) % 2; const lo = on ? 1 : 0; P.r.position.copy(p).add(V(-0.5, 2.8, 0)); P.b.position.copy(p).add(V(0.5, 2.8, 0)); P.r.material.opacity = lo * (blink ? 1 : 0.15); P.b.material.opacity = lo * (blink ? 0.15 : 1); });
    { const ph = ((t - 21.4) % 1.1) / 1.1; arrestRing.material.opacity = t > 21.4 && t < 46.5 ? 0.9 * (1 - ph) * (1 - ss(44, 46.5, t)) : 0; arrestRing.scale.setScalar(2 + ph * 8);
      const s = pop(21.6, t, 0.45) * (1 - ss(44, 46.5, t)); arrestPin.visible = s > 0.01; arrestPin.scale.setScalar(S0(s) * 1.3); arrestPin.rotation.y = t; arrestPin.position.y = 7 + Math.sin(t * 2) * 0.3;
      officers.forEach((o, i) => { const s2 = pop(22.0 + i * 0.25, t, 0.4) * (1 - ss(44, 46.5, t)); o.visible = s2 > 0.01; o.scale.setScalar(S0(s2) * 1.3); o.rotation.y = i ? -1.3 : 1.3; }); }

    // candles
    victims.forEach((c) => { placeCandle(c, t); if (t > 46.5 && t < 54) { /* keep */ } });
    vigil.forEach((c) => placeCandle(c, t)); homeCandles.forEach((c) => placeCandle(c, t));
    homeTag.material.opacity = ss(34.0, 34.6, t) * (1 - ss(46, 47, t)); homeTag.visible = false;
    // permit card + storm
    { const s = pop(39.3, t, 0.5) * (1 - ss(46, 46.8, t)); card.visible = s > 0.01; card.scale.setScalar(S0(s)); card.position.copy(HO).add(V(0, 18 + Math.sin(t * 1.3) * 0.4, 8)); card.rotation.set(-0.12, Math.sin(t * 0.7) * 0.25 - 0.15, 0.04);
      const st = pop(42.2, t, 0.6) * (1 - ss(46, 47, t)); storm.visible = st > 0.01; storm.scale.setScalar(S0(st)); storm.rotation.y = t * 0.15;
      const fl = t > 43 && t < 46 && (Math.floor(t * 5) % 7 === 0) ? 1 : 0; storm.userData.m.emissiveIntensity = 0.25 + 1.6 * fl; flash.material.opacity = 0.6 * fl * st; }
    // shield
    { const s = pop(48.4, t, 0.6) * (1 - ss(53.4, 54.2, t)); shield.visible = s > 0.01; shield.scale.setScalar(S0(s) * 2.6); shield.position.set(0, 42 + Math.sin(t * 1.2) * 1.2, 0); shield.rotation.y = Math.sin(t * 0.6) * 0.35;
      shieldGlow.position.copy(shield.position); shieldGlow.material.opacity = 0.35 * s; }
    // flag: full mast, lowered to half-mast for mourning from 54
    { const y = lerp(41, 38.4, ss(54.4, 56, t)); flag.position.set(TH.x, y, TH.z); flag.children.forEach((m, k) => { m.rotation.y = Math.sin(t * 3 + k) * 0.08; }); }

    // camera
    const cam = camAt(t);
    camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, H * 0.1, W, H); camera.updateProjectionMatrix();
    const lp = cam.L.clone().project(camera); finish.uniforms.focusY.value = clamp(0.5 + lp.y * 0.5, 0.2, 0.85);
    const wide = ss(46.5, 48.5, t) * (1 - ss(53.5, 55.5, t)); finish.uniforms.blurAmt.value = 0.5 + 0.5 * wide; finish.uniforms.band.value = lerp(0.22, 0.14, wide);
    finish.uniforms.mood.value = mood;
    const focus = cam.L.clone(); sun.position.set(focus.x + 70, focus.y + 110, focus.z + 80); sun.target.position.copy(focus);
    composer.render();
  }

  function debug(t) { render(t); const v = sCar.position.clone().project(camera); return { t, car: sCar.position.toArray().map((x) => +x.toFixed(1)), ndc: [+v.x.toFixed(2), +v.y.toFixed(2)], cam: camera.position.toArray().map((x) => +x.toFixed(1)) }; }
  return { render, debug, scene, composer };
}
