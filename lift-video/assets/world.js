// "Kenapa lif tak terus jatuh bila kabel putus?" — v2 look (post-processed Three.js).
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
  grass: 0x86c46b, soil: 0x9a6248, soilDark: 0x6b3f30, tree: [0x76b85e, 0x8fcc6c, 0x5fa452], trunk: 0x7a5236,
  wall: 0xe9d3c6, wallShade: 0xc9ab9e, concrete: 0x9d8a91, steel: 0x5b5866, steelLight: 0x9a98a8, cable: 0x3a3742,
  car: 0xfaf3ea, carTrim: 0xe8a66a, wood: 0xc98b5a, glass: 0xbfe6ff,
  lift: 0xffc531, danger: 0xff5a3d, safe: 0x7ee8ff, ok: 0xa8f07a, spark: 0xffd27a, history: 0xd8b07a,
};
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o });
const flat = (c, o = {}) => mat(c, { flatShading: true, roughness: 0.85, ...o });

export function createWorld(canvas, W, H, scale = 1) {
  // deterministic construction: some three.js addons seed noise with Math.random
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
  scene.fog = new THREE.Fog(0xf2a7a4, 260, 1200);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 4000);

  // ---------- sky ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(PAL.skyTop) }, mid: { value: new THREE.Color(PAL.skyMid) }, hor: { value: new THREE.Color(PAL.skyHorizon) }, low: { value: new THREE.Color(PAL.skyLow) }, sunDir: { value: V(-0.35, 0.1, -1).normalize() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform vec3 top,mid,hor,low,sunDir; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 c;
        if(h>0.0){ c = mix(hor, mid, smoothstep(0.0,0.28,h)); c = mix(c, top, smoothstep(0.25,0.85,h)); } else { c = mix(hor, low, smoothstep(0.0,-0.35,h)); }
        float s = max(dot(normalize(vDir), sunDir),0.0); c += vec3(1.0,0.85,0.6)*pow(s,80.0)*0.6 + vec3(1.0,0.7,0.45)*pow(s,6.0)*0.12;
        gl_FragColor = vec4(c,1.0); }`,
  }));
  scene.add(sky);

  // ---------- light ----------
  scene.add(new THREE.HemisphereLight(0xffd8c2, 0xd99a86, 0.55));
  const sun = new THREE.DirectionalLight(0xffdcbc, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(scale < 1 ? 1024 : 2048, scale < 1 ? 1024 : 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.4; sun.shadow.radius = 5;
  const sc = sun.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 500;
  scene.add(sun); scene.add(sun.target);
  const rim = new THREE.DirectionalLight(0xffa27a, 1.1); rim.position.set(-120, 60, -200); scene.add(rim);
  // warm interior light that follows the car
  const carLamp = new THREE.PointLight(0xffd6a0, 9, 9, 1.8); scene.add(carLamp);

  // glow sprite
  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.3, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, size, op = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false, fog: false })); s.scale.set(size, size, 1); return s; };
  const sunGlow = glow(0xffd9a8, 220, 0.5); sunGlow.position.set(-640, 180, -1800); scene.add(sunGlow);

  // ---------- floating island ----------
  const rnd = mulberry32(7);
  const RX = 58, RZ = 46;
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
    // path, trees, bushes, flowers
    for (let i = 0; i < 9; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.25, 10), flat(0xe9dfd6)); st.position.set(2 + Math.sin(i * 0.7) * 2, 0.12, 16 + i * 2.6); st.receiveShadow = true; island.add(st); }
    const treeG = new THREE.IcosahedronGeometry(1, 1), trunkG = new THREE.CylinderGeometry(0.35, 0.5, 1, 7);
    let placed = 0, guard = 0;
    while (placed < 26 && guard++ < 900) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.92; const x = Math.cos(a) * RX * r, z = Math.sin(a) * RZ * r;
      if (Math.abs(x) < 17 && z > -16 && z < 46) continue; // keep tower + front clear
      if (x < -6 && x > -48 && z > 0) continue;               // keep the 1854 rig and its sightline clear
      const s = 2.6 + rnd() * 3; const t = new THREE.Mesh(treeG, flat(PAL.tree[placed % 3])); t.scale.set(s, s * 1.1, s); t.position.set(x, s + 2.4, z); t.castShadow = true; island.add(t);
      const tr = new THREE.Mesh(trunkG, flat(PAL.trunk)); tr.scale.set(1, 3, 1); tr.position.set(x, 1.5, z); tr.castShadow = true; island.add(tr); placed++;
    }
    const fc = [0xff8fb1, 0xffd36e, 0xc9a2ff, 0xffffff];
    for (let i = 0; i < 110; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.95; const x = Math.cos(a) * RX * r, z = Math.sin(a) * RZ * r; if (Math.abs(x) < 10 && z > -14 && z < 12) continue;
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), flat(fc[i % 4])); f.position.set(x, 0.25, z); island.add(f); }
  }
  const clouds = [];
  { const cm = flat(0xffe9ef, { roughness: 1, emissive: 0xffc9c9, emissiveIntensity: 0.45 });
    for (let i = 0; i < 8; i++) { const c = new THREE.Group(); const n = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), cm); const s = 5 + rnd() * 7; b.scale.set(s * 1.4, s * 0.7, s); b.position.set(k * 7 - n * 3.5, rnd() * 2, rnd() * 4); c.add(b); }
      const a = (i / 8) * Math.PI * 2 + 0.3, r = 150 + rnd() * 90; c.position.set(Math.cos(a) * r, -20 + rnd() * 90, Math.sin(a) * r - 60); scene.add(c); clouds.push(c); } }

  // ---------- tower (cutaway: the lift shaft is open at the front) ----------
  const FLOOR_H = 2.4, NFLOORS = 32, TOP = NFLOORS * FLOOR_H; // roof at 76.8 (tower-local)
  const BASE = 4.0, TOPW = BASE + TOP;                     // building stands on a 4 m podium
  const SHAFT = { x0: -2.6, x1: 2.6, z0: 1.6, z1: 7.0 };   // the facade is recessed to z=7, so the shaft is open from the front   // shaft volume, front open at z1
  const CARZ = (SHAFT.z0 + SHAFT.z1) / 2 + 0.3, RAILX = 2.15;
  const tower = new THREE.Group(); tower.position.y = BASE; scene.add(tower);
  { const wallM = mat(PAL.wall, { roughness: 0.85 }), shadeM = mat(PAL.wallShade, { roughness: 0.9 }), winM = mat(0x8a7bb8, { roughness: 0.15, metalness: 0.2, emissive: 0xffb27a, emissiveIntensity: 0.0 });
    // slabs: everything except the shaft
    for (let i = 0; i <= NFLOORS; i++) {
      const y = i * FLOOR_H;
      const parts = [[-9, -9, SHAFT.x0, 7], [SHAFT.x1, -9, 9, 7], [SHAFT.x0, -9, SHAFT.x1, SHAFT.z0]];
      for (const [x0, z0, x1, z1] of parts) { const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.32, z1 - z0), i % 4 === 0 ? shadeM : wallM); s.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); s.receiveShadow = true; s.castShadow = true; tower.add(s); }
    }
    // side and back walls with window bands
    const H = TOP;
    const back = new THREE.Mesh(new THREE.BoxGeometry(18, H, 0.5), wallM); back.position.set(0, H / 2, -9); back.castShadow = true; tower.add(back);
    for (const sx of [-9, 9]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, H, 16), wallM); w.position.set(sx, H / 2, -1); w.castShadow = true; tower.add(w);
      for (let i = 0; i < NFLOORS; i++) { const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 12), winM); win.position.set(sx + Math.sign(sx) * 0.26, i * FLOOR_H + 1.25, -1); tower.add(win); } }
    // front facade (glass) either side of the shaft
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffd9c4, roughness: 0.08, metalness: 0, transmission: 0, transparent: true, opacity: 0.28, envMapIntensity: 1.2 });
    for (const [x0, x1] of [[-9, SHAFT.x0 - 0.3], [SHAFT.x1 + 0.3, 9]]) { const g = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, H, 0.15), glassM); g.position.set((x0 + x1) / 2, H / 2, 7); tower.add(g);
      for (let i = 0; i <= NFLOORS; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.18, 0.25), shadeM); m.position.set((x0 + x1) / 2, i * FLOOR_H, 7.05); tower.add(m); } }
    // shaft walls (inner), pit, door frames on each floor (back of shaft)
    const shaftM = mat(PAL.concrete, { roughness: 0.95 });
    const sb = new THREE.Mesh(new THREE.BoxGeometry(SHAFT.x1 - SHAFT.x0 + 0.6, H + 6, 0.3), shaftM); sb.position.set(0, H / 2 - 3, SHAFT.z0 - 0.15); sb.receiveShadow = true; tower.add(sb);
    for (const sx of [SHAFT.x0 - 0.15, SHAFT.x1 + 0.15]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, H + 6, SHAFT.z1 - SHAFT.z0), shaftM); w.position.set(sx, H / 2 - 3, (SHAFT.z0 + SHAFT.z1) / 2); w.receiveShadow = true; tower.add(w); }
    const pit = new THREE.Mesh(new THREE.BoxGeometry(SHAFT.x1 - SHAFT.x0 + 0.6, 0.4, SHAFT.z1 - SHAFT.z0), shaftM); pit.position.set(0, -3.2, (SHAFT.z0 + SHAFT.z1) / 2); tower.add(pit);
    // podium (tower-local y from -BASE to 0) with the front cut away at the shaft
    const podM = mat(0xd8c2b6, { roughness: 0.9 });
    for (const [x0, x1, z0, z1] of [[-11, SHAFT.x0 - 0.3, -11, SHAFT.z1], [SHAFT.x1 + 0.3, 11, -11, SHAFT.z1], [SHAFT.x0 - 0.3, SHAFT.x1 + 0.3, -11, SHAFT.z0 - 0.3]]) {
      const b = new THREE.Mesh(new RoundedBoxGeometry(x1 - x0, BASE, z1 - z0, 2, 0.15), podM); b.position.set((x0 + x1) / 2, -BASE / 2, (z0 + z1) / 2); b.castShadow = true; b.receiveShadow = true; tower.add(b); }
    const lip = new THREE.Mesh(new THREE.BoxGeometry(SHAFT.x1 - SHAFT.x0 + 0.6, 0.25, 0.4), mat(PAL.lift, { emissive: PAL.lift, emissiveIntensity: 0.15 })); lip.position.set(0, 0.0, SHAFT.z1 + 0.1); tower.add(lip);
    // floor numbers painted on the shaft back wall
    for (let i = 1; i <= NFLOORS; i++) {
      const cv = document.createElement("canvas"); cv.width = 128; cv.height = 64; const g = cv.getContext("2d"); g.fillStyle = "rgba(0,0,0,0)"; g.fillRect(0, 0, 128, 64);
      g.font = "800 46px Montserrat, sans-serif"; g.fillStyle = "#6d5d68"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(i), 64, 34);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); pl.position.set(-1.6, i * FLOOR_H + 1.6, SHAFT.z0 + 0.02); tower.add(pl);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.0, 0.08), mat(0xcfc6cf, { metalness: 0.5, roughness: 0.35 })); door.position.set(0.6, i * FLOOR_H + 1.05, SHAFT.z0 + 0.04); tower.add(door);
    }
    // roof + glass machine room
    const roof = new THREE.Mesh(new RoundedBoxGeometry(18.6, 0.6, 18.6, 3, 0.2), shadeM); roof.position.set(0, TOP + 0.3, 0); roof.castShadow = true; tower.add(roof);
    // pad around the tower base
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.3, 40), flat(0xe8d8cc)); pad.position.set(0, 0.05 - BASE, 2); pad.receiveShadow = true; tower.add(pad);
  }
  // rails (T-section) in the shaft
  const railM = mat(PAL.steel, { metalness: 0.7, roughness: 0.35 });
  for (const sx of [-RAILX, RAILX]) {
    const web = new THREE.Mesh(new THREE.BoxGeometry(0.12, TOP + 4, 0.34), railM); web.position.set(sx, (TOP + 4) / 2 - 3.2, CARZ); tower.add(web);
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.34, TOP + 4, 0.1), railM); fl.position.set(sx + Math.sign(sx) * 0.17, (TOP + 4) / 2 - 3.2, CARZ); tower.add(fl);
  }
  // machine room on the roof: glass box, motor, main sheave, governor
  const MR = new THREE.Group(); MR.position.set(0, TOPW + 0.6, CARZ); scene.add(MR);
  const mrGlass = new THREE.Mesh(new RoundedBoxGeometry(9, 5, 7, 3, 0.25), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.18, envMapIntensity: 1.5, depthWrite: false }));
  mrGlass.position.set(0, 2.5, -0.5); MR.add(mrGlass);
  const mrFrame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(9, 5, 7)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); mrFrame.position.copy(mrGlass.position); MR.add(mrFrame);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.2, 28), mat(0x6c7fa6, { metalness: 0.4, roughness: 0.4 })); motor.rotation.z = Math.PI / 2; motor.position.set(-2.4, 1.4, -1.6); motor.castShadow = true; MR.add(motor);
  const SHEAVE_R = 1.15;
  const sheave = new THREE.Group(); sheave.position.set(0, 1.6, -1.0); MR.add(sheave);
  { const disc = new THREE.Mesh(new THREE.CylinderGeometry(SHEAVE_R, SHEAVE_R, 1.4, 40), mat(PAL.steelLight, { metalness: 0.8, roughness: 0.3 })); disc.rotation.z = Math.PI / 2; disc.castShadow = true; sheave.add(disc);
    for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 2.0), mat(PAL.steel, { metalness: 0.6 })); sp.rotation.x = (i / 6) * Math.PI; sheave.add(sp); } }
  // counterweight (behind the car, hangs from the far side of the sheave)
  const cw = new THREE.Group(); scene.add(cw);
  { for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.42, 0.7, 2, 0.06), mat(0x7b6f86, { metalness: 0.5, roughness: 0.4 })); b.position.y = i * 0.45; b.castShadow = true; cw.add(b); }
    const fr = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.2, 0.8), railM); fr.position.y = 3.7; cw.add(fr); }
  // governor: small sheave with fly-weights at the right rail
  const GOV = new THREE.Group(); GOV.position.set(RAILX + 0.25, 1.5, 0.9); MR.add(GOV);
  const GOV_R = 0.75;
  const govWheel = new THREE.Group(); GOV.add(govWheel);
  const govMat = mat(0xffb36b, { metalness: 0.4, roughness: 0.35, emissive: 0xff7a2d, emissiveIntensity: 0 });
  { const rim2 = new THREE.Mesh(new THREE.TorusGeometry(GOV_R, 0.09, 10, 36), mat(PAL.steelLight, { metalness: 0.8, roughness: 0.3 })); govWheel.add(rim2);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.3, 16), railM); hub.rotation.x = Math.PI / 2; govWheel.add(hub); }
  const flyW = [];
  for (let i = 0; i < 2; i++) { const arm = new THREE.Group(); arm.rotation.z = i * Math.PI; govWheel.add(arm);
    const piv = new THREE.Group(); piv.position.set(0.1, 0, 0.14); arm.add(piv);
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), railM); rod.position.x = 0.25; piv.add(rod);
    const wgt = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.22, 0.16, 2, 0.05), govMat); wgt.position.x = 0.52; piv.add(wgt); flyW.push(piv); }
  const pawl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.12), mat(PAL.steel, { metalness: 0.6, emissive: PAL.danger, emissiveIntensity: 0 })); pawl.position.set(0, GOV_R + 0.35, 0.14); GOV.add(pawl);
  const govHousing = new THREE.Mesh(new THREE.CylinderGeometry(GOV_R + 0.3, GOV_R + 0.3, 0.5, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })); govHousing.rotation.x = Math.PI / 2; GOV.add(govHousing);
  const govGlow = glow(0xff9a4a, 3.2, 0); GOV.add(govGlow);

  // ---------- the car ----------
  const car = new THREE.Group(); scene.add(car);
  const CAR_W = 3.3, CAR_H = 3.4, CAR_D = 3.3;
  { const shellM = mat(PAL.car, { roughness: 0.45 }), trimM = mat(PAL.carTrim, { roughness: 0.4, metalness: 0.2 });
    const backW = new THREE.Mesh(new RoundedBoxGeometry(CAR_W, CAR_H, 0.2, 3, 0.08), shellM); backW.position.set(0, CAR_H / 2, -CAR_D / 2 + 0.1); car.add(backW);
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new RoundedBoxGeometry(0.2, CAR_H, CAR_D, 3, 0.08), shellM); w.position.set(sx * (CAR_W / 2 - 0.1), CAR_H / 2, 0); w.castShadow = true; car.add(w); }
    const roofC = new THREE.Mesh(new RoundedBoxGeometry(CAR_W, 0.25, CAR_D, 3, 0.1), shellM); roofC.position.y = CAR_H; roofC.castShadow = true; car.add(roofC);
    const floorC = new THREE.Mesh(new RoundedBoxGeometry(CAR_W, 0.3, CAR_D, 3, 0.1), mat(PAL.wood, { roughness: 0.6 })); floorC.position.y = 0.15; floorC.castShadow = true; car.add(floorC);
    // front: glass doors (we look in), trim band
    const doorG = new THREE.Mesh(new THREE.BoxGeometry(CAR_W - 0.4, CAR_H - 0.5, 0.06), new THREE.MeshPhysicalMaterial({ color: 0xfff2e6, roughness: 0.05, transparent: true, opacity: 0.22, envMapIntensity: 1.4, depthWrite: false })); doorG.position.set(0, CAR_H / 2, CAR_D / 2 - 0.05); car.add(doorG);
    const band = new THREE.Mesh(new RoundedBoxGeometry(CAR_W + 0.06, 0.18, CAR_D + 0.06, 2, 0.06), trimM); band.position.y = CAR_H - 0.25; car.add(band);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, CAR_W - 0.6, 8), mat(0xd8d2dc, { metalness: 0.9, roughness: 0.2 })); rail.rotation.z = Math.PI / 2; rail.position.set(0, 1.0, -CAR_D / 2 + 0.3); car.add(rail);
    const ceilL = new THREE.Mesh(new THREE.BoxGeometry(CAR_W - 0.8, 0.05, CAR_D - 0.8), new THREE.MeshBasicMaterial({ color: 0xfff1d6 })); ceilL.position.y = CAR_H - 0.14; car.add(ceilL);
  }
  // sling: crosshead, stiles, plank (steel frame around the car)
  const sling = new THREE.Group(); car.add(sling);
  { const m = railM;
    const ch = new THREE.Mesh(new THREE.BoxGeometry(CAR_W + 0.9, 0.35, 0.45), m); ch.position.y = CAR_H + 0.55; sling.add(ch);
    for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.22, CAR_H + 1.2, 0.36), m); st.position.set(sx * (CAR_W / 2 + 0.33), CAR_H / 2 + 0.05, 0); sling.add(st); }
    const pl = new THREE.Mesh(new THREE.BoxGeometry(CAR_W + 0.9, 0.3, 0.6), m); pl.position.y = -0.2; sling.add(pl);
    // guide shoes at the rails
    for (const sx of [-1, 1]) for (const y of [-0.25, CAR_H + 0.55]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.5), mat(0x3c3846)); sh.position.set(sx * (RAILX - 0.05), y, 0); sling.add(sh); }
  }
  // floor indicator above the doors
  const indCv = document.createElement("canvas"); indCv.width = 256; indCv.height = 128;
  const indTex = new THREE.CanvasTexture(indCv); indTex.colorSpace = THREE.SRGBColorSpace;
  const indicator = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshBasicMaterial({ map: indTex, toneMapped: false }));
  indicator.position.set(0, CAR_H + 0.05, CAR_D / 2 + 0.06); car.add(indicator);
  let lastInd = "";
  const drawInd = (txt, col) => { const k = txt + col; if (k === lastInd) return; lastInd = k; const g = indCv.getContext("2d"); g.fillStyle = "#1b1622"; g.fillRect(0, 0, 256, 128);
    g.font = "800 92px Montserrat, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = col; g.fillText(txt, 128, 70); indTex.needsUpdate = true; };
  // people inside (simple, friendly figures)
  const people = [];
  { const cols = [0xff8a5c, 0x6fb0ff, 0xa8f07a, 0xffc531, 0xc9a2ff, 0xff8fb1];
    const spots = [[-0.9, -0.8], [0.0, -1.0], [0.9, -0.7], [-0.7, 0.3], [0.6, 0.4], [0.05, -0.2]];
    spots.forEach(([x, z], i) => { const p = new THREE.Group(); p.position.set(x, 0.3, z);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.75, 4, 10), mat(cols[i], { roughness: 0.55 })); body.position.y = 0.68; body.castShadow = true; p.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12), mat(0xf0b993, { roughness: 0.6 })); head.position.y = 1.5; p.add(head);
      car.add(p); people.push(p); }); }
  // safety gear: wedge blocks at the bottom of each stile + lever linkage (cutaway housing)
  const safety = [];
  const wedgeM = mat(0x8e8a9c, { metalness: 0.8, roughness: 0.3, emissive: PAL.safe, emissiveIntensity: 0 });
  for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * RAILX, -0.2, 0); car.add(g);
    const housing = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.9, 0.75, 2, 0.08), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0.1, depthWrite: false })); g.add(housing);
    const wedges = [];
    for (const side of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.5), wedgeM); w.position.set(0, -0.05, side * 0.18); g.add(w); wedges.push({ m: w, side }); }
    safety.push({ g, wedges, sx });
  }
  const lever = new THREE.Group(); lever.position.set(RAILX + 0.25, CAR_H + 0.9, 0.9); car.add(lever);
  const leverArm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.12), mat(PAL.steel, { metalness: 0.6, emissive: PAL.danger, emissiveIntensity: 0 })); leverArm.position.x = -0.4; lever.add(leverArm);
  const linkRod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, CAR_H + 1.0, 8), mat(PAL.steel, { metalness: 0.6, emissive: PAL.danger, emissiveIntensity: 0 })); linkRod.position.set(RAILX + 0.05, (CAR_H + 0.9) / 2 - 0.3, 0.9); car.add(linkRod);

  // ---------- cables ----------
  const NC = 6;
  const cableM = () => mat(PAL.cable, { metalness: 0.7, roughness: 0.35, emissive: 0x000000, emissiveIntensity: 0 });
  const cables = [];
  for (let i = 0; i < NC; i++) {
    const x = -0.75 + (i % 3) * 0.75, z = (i < 3 ? -0.12 : 0.12);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 10), cableM());
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 10), cableM());
    lower.material = upper.material; // glow together
    scene.add(upper); scene.add(lower); cables.push({ x, z, upper, lower, m: upper.material });
  }
  // counterweight cables (behind), governor rope (loop to the pit)
  const cwCables = []; for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), mat(PAL.cable, { metalness: 0.7, roughness: 0.35 })); scene.add(c); cwCables.push(c); }
  const govRopeM = mat(0x2e2a36, { emissive: PAL.lift, emissiveIntensity: 0, roughness: 0.4 });
  const govRope = [0, 1].map(() => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), govRopeM); scene.add(c); return c; });
  const tension = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 24), railM); tension.position.set(RAILX + 0.25, BASE - 2.4, CARZ + 0.9); scene.add(tension);
  const placeCyl = (m, a, b, r) => { const d = b.clone().sub(a); const L = d.length(); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(r || 1, Math.max(0.001, L), r || 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); };

  // ---------- buffers in the pit ----------
  const buffers = new THREE.Group(); buffers.position.set(0, BASE - 3.0, CARZ); scene.add(buffers);
  const springs = [];
  for (const sx of [-0.9, 0.9]) {
    const g = new THREE.Group(); g.position.x = sx; buffers.add(g);
    const pts = []; for (let k = 0; k <= 160; k++) { const a = k / 160 * Math.PI * 2 * 7; pts.push(V(Math.cos(a) * 0.38, k / 160, Math.sin(a) * 0.38)); }
    const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.06, 6), mat(PAL.lift, { metalness: 0.6, roughness: 0.3, emissive: PAL.lift, emissiveIntensity: 0.15 }));
    coil.scale.y = 1.6; g.add(coil);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.18, 20), railM); g.add(base);
    const capP = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 20), railM); capP.position.y = 1.66; g.add(capP);
    springs.push({ g, coil, capP });
  }
  const ghost = new THREE.Mesh(new RoundedBoxGeometry(CAR_W, CAR_H, CAR_D, 3, 0.12), new THREE.MeshPhysicalMaterial({ color: PAL.safe, transparent: true, opacity: 0.25, roughness: 0.2, emissive: PAL.safe, emissiveIntensity: 0.4, depthWrite: false }));
  scene.add(ghost);
  const ghostEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CAR_W, CAR_H, CAR_D)), new THREE.LineBasicMaterial({ color: PAL.safe, transparent: true })); ghost.add(ghostEdges);

  // ---------- 1854 platform (history beat), on the island to the left ----------
  const otis = new THREE.Group(); otis.position.set(-30, 0, 12); otis.rotation.y = 0.5; scene.add(otis);
  const woodM = flat(0xb27a4c), woodD = flat(0x8a5a36);
  const otisParts = {};
  { const posts = new THREE.Group(); otis.add(posts); otisParts.posts = posts;
    for (const sx of [-2.2, 2.2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 0.5), woodM); p.position.set(sx, 6, 0); p.castShadow = true; posts.add(p);
      // ratchet teeth on the inner face
      for (let k = 0; k < 18; k++) { const tth = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 4), mat(0x6b6676, { metalness: 0.6 })); tth.position.set(sx - Math.sign(sx) * 0.3, 1.5 + k * 0.55, 0); tth.rotation.z = Math.sign(sx) * Math.PI / 2; posts.add(tth); } }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 0.6), woodM); beam.position.y = 12; beam.castShadow = true; posts.add(beam);
    const pul = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.1, 8, 20), mat(0x6b6676, { metalness: 0.6 })); pul.position.set(0, 11.5, 0); posts.add(pul);
    const plat = new THREE.Group(); otis.add(plat); otisParts.plat = plat;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.3, 3.0), woodD); deck.castShadow = true; plat.add(deck);
    for (const sx of [-1.9, 1.9]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), woodD); s.position.set(sx, 0.6, -1.3); plat.add(s); }
    const spring = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.12, 0.25), mat(0x6b6676, { metalness: 0.6 })); spring.position.y = 1.4; plat.add(spring); otisParts.wagonSpring = spring;
    // the man in the top hat
    const man = new THREE.Group(); man.position.set(0.3, 0.15, 0.2); plat.add(man); otisParts.man = man;
    const coat = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 10), mat(0x2f2a3a)); coat.position.y = 0.8; man.add(coat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), mat(0xf0b993)); head.position.y = 1.65; man.add(head);
    const hat = new THREE.Group(); hat.position.y = 1.85; man.add(hat); otisParts.hat = hat;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 20), mat(0x1c1820)); hat.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.5, 20), mat(0x1c1820)); crown.position.y = 0.26; hat.add(crown);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), mat(0xd8c08a)); otis.add(rope); otisParts.rope = rope;
    const ropeTop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), mat(0xd8c08a)); otis.add(ropeTop); otisParts.ropeTop = ropeTop;
    const axe = new THREE.Group(); axe.position.set(1.2, 8.6, 1.2); otis.add(axe); otisParts.axe = axe;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.1), woodM); handle.position.y = -0.5; axe.add(handle);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.06), mat(0xc8c6d4, { metalness: 0.9, roughness: 0.2 })); blade.position.set(-0.2, 0.1, 0); axe.add(blade);
    const stamp = glow(PAL.history, 9, 0); stamp.position.set(0, 7, 0); otis.add(stamp); otisParts.halo = stamp;
  }

  // ---------- arrows ----------
  const mkArrow = (color) => { const a = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.4 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 12), m); shaft.position.y = 0.35; a.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 16), m); head.position.y = 0.88; a.add(head); a.userData.m = m; scene.add(a); return a; };
  const weightArrow = mkArrow(PAL.danger), holdArrow = mkArrow(PAL.lift);

  // ---------- particles (sparks, dust) ----------
  const NP = 420;
  const parts = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NP);
  parts.frustumCulled = false; parts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NP * 3), 3); scene.add(parts);
  const NS = 120;
  const streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }), NS);
  streaks.frustumCulled = false; scene.add(streaks);
  const dummy = new THREE.Object3D(); const col = new THREE.Color();
  const hide = (im, i) => { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); };

  // ---------- post-processing ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, RW, RH);
  gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: scale < 1 ? 8 : 12, distanceFallOff: 1, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 });
  gtao.blendIntensity = 0.85;
  composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.22, 0.5, 1.05); composer.addPass(bloom);
  // tilt-shift (miniature look) + warm grade + vignette, all in one pass
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(RW, RH) }, focusY: { value: 0.6 }, band: { value: 0.2 }, blurAmt: { value: 1.0 }, vig: { value: 0.32 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; uniform float focusY, band, blurAmt, vig; varying vec2 vUv;
      void main(){
        float d = max(0.0, abs(vUv.y - focusY) - band); float r = clamp(d * 3.2, 0.0, 1.0) * blurAmt * 7.0;
        vec4 acc = vec4(0.0); float wsum = 0.0;
        for (int i = -4; i <= 4; i++) for (int j = -4; j <= 4; j++) {
          vec2 o = vec2(float(i), float(j)) / 4.0; float w = exp(-dot(o,o)*1.5);
          acc += texture2D(tDiffuse, vUv + o * r / res) * w; wsum += w; }
        vec3 c = (acc / wsum).rgb;
        float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, 1.12);               // a touch more saturation
        c = (c - 0.5) * 1.06 + 0.5;                                                            // contrast
        c *= vec3(1.03, 1.0, 0.97);                                                            // warm
        vec2 q = vUv - 0.5; q.x *= res.x / res.y; float v = smoothstep(0.95, 0.25, length(q)); c *= mix(1.0 - vig, 1.0, v);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- story functions (canonical time) ----------
  const CAR_Y0 = BASE + 30 * FLOOR_H;                      // parked at floor 30
  // fall: slow-motion free fall from 22.3, governor trips ~28, safeties grip 32.4-36.8
  const vFall = (t) => (t < 22.3 ? 0 : t < 27.5 ? 4.2 * ss(22.3, 27.5, t) : t < 32.4 ? 4.2 : 4.2 * (1 - ss(32.4, 36.8, t)));
  const YT = []; { let y = CAR_Y0, dt = 1 / 120; for (let t = 0; t <= 61; t += dt) { if (t > 4.9 && t < 5.25) y -= 0.5 * dt; y -= vFall(t) * dt; YT.push(y); } }
  const carY = (t) => {
    if (t >= 54.5) return CAR_Y0; // next ride: a fresh, intact lift (loop)
    return YT[clamp(Math.round(t * 120), 0, YT.length - 1)];
  };
  const speedMS = (t) => (t >= 54.5 ? 0 : vFall(t) / 4.2 * 2.6 + (t > 4.9 && t < 5.25 ? 0.4 : 0)); // shown on the dial (m/s, illustrative)

  // cable snap times
  const SNAP = [4.9, 21.55, 21.7, 21.85, 22.0, 22.15];
  const BURSTS = [
    { t: 4.9, at: "cable0", c: [PAL.spark, 0xffffff, 0xff8a5c], n: 40, spd: 4 },
    ...SNAP.slice(1).map((s, i) => ({ t: s, at: "cable" + (i + 1), c: [PAL.spark, 0xffffff], n: 24, spd: 3.5 })),
    { t: 28.0, at: "gov", c: [0xff8a5c, PAL.spark, 0xffffff], n: 28, spd: 2.2 },
    { t: 45.3, at: "pit", c: [0xe7c9a8, 0xf3dcc6], n: 40, spd: 3, dust: true },
    { t: 52.15, at: "otis", c: [PAL.spark, 0xffffff], n: 26, spd: 2.5 },
  ];

  // ---------- camera keys ----------
  const cpos = () => V(0, carY(curT), CARZ);
  let curT = 0;
  const W0 = { pos: V(2.2, CAR_Y0 + 1.6, CARZ + 11.5), look: V(0, CAR_Y0 + 3.2, CARZ) }; // the hook shot: car front + cables
  const keys = [
    { t: 0, pos: () => W0.pos, look: () => W0.look, fov: 38 },
    { t: 4.4, pos: () => cpos().add(V(1.6, 1.9, 10.2)), look: () => cpos().add(V(0, 3.4, 0)), fov: 38 },
    { t: 7.2, pos: () => cpos().add(V(3.2, 3.0, 14.0)), look: () => cpos().add(V(0, 5.0, 0)), fov: 40 },
    { t: 12.8, pos: () => cpos().add(V(-2.6, 5.5, 15.0)), look: () => cpos().add(V(0, 5.2, 0)), fov: 40 },
    { t: 16.5, pos: () => cpos().add(V(-1.8, 2.2, 10.0)), look: () => cpos().add(V(0, 2.0, 0)), fov: 40 },
    { t: 20.5, pos: () => cpos().add(V(2.4, 3.0, 11.0)), look: () => cpos().add(V(0, 2.8, 0)), fov: 40 },
    { t: 23.0, pos: () => V(RAILX + 2.6, TOPW + 3.6, CARZ + 8.5), look: () => V(RAILX + 0.25, TOPW + 2.9, CARZ + 0.9), fov: 40 },
    { t: 29.5, pos: () => V(RAILX + 1.6, TOPW + 2.5, CARZ + 5.4), look: () => V(RAILX + 0.25, TOPW + 2.7, CARZ + 0.9), fov: 38 },
    { t: 32.6, pos: () => cpos().add(V(2.8, -0.8, 10.5)), look: () => cpos().add(V(0.6, 0.6, 0)), fov: 40 },
    { t: 37.5, pos: () => cpos().add(V(3.2, -0.2, 11.5)), look: () => cpos().add(V(0.4, 1.0, 0)), fov: 40 },
    { t: 42.0, pos: () => V(0.8, BASE + 1.4, CARZ + 12.5), look: () => V(0, BASE - 1.2, CARZ), fov: 40 },
    { t: 47.0, pos: () => V(1.2, BASE + 1.0, CARZ + 11.5), look: () => V(0, BASE - 1.3, CARZ), fov: 40 },
    { t: 49.6, pos: () => V(-14, 12, 38), look: () => V(-30, 6.0, 12), fov: 40 },
    { t: 52.0, pos: () => V(-15.5, 10.5, 36), look: () => V(-30, 5.5, 12), fov: 40 },
    { t: 54.6, pos: () => V(-16, 10, 35), look: () => V(-30, 5.5, 12), fov: 40 },
    { t: 57.4, pos: () => V(40, 58, 170), look: () => V(-4, 36, 0), fov: 42 },
    { t: 60, pos: () => W0.pos, look: () => W0.look, fov: 38 },
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
  function render(t) {
    t = clamp(t, 0, 60); curT = t;
    const cy = carY(t);
    const fresh = t >= 54.5;              // new, intact lift for the loop
    const shake = (t > 4.9 && t < 5.5 ? 0.06 * Math.sin(t * 90) * (1 - ss(4.9, 5.5, t)) : 0) + (t > 32.4 && t < 36.8 ? 0.03 * Math.sin(t * 120) : 0);
    car.position.set(shake, cy, CARZ);
    carLamp.position.set(0, cy + CAR_H - 0.5, CARZ + 0.3);
    // indicator
    const floor = Math.max(1, Math.round((cy - BASE) / FLOOR_H));
    const alarm = !fresh && t > 4.9 && t < 38 && Math.floor(t * 4) % 2 === 0;
    drawInd(String(floor), alarm ? "#ff5a3d" : "#ffc531");
    // people pop in 14.5-16 and stay until the fresh ride
    people.forEach((p, i) => { const s = i === 0 ? 1 : fresh ? 0 : pop(14.5 + i * 0.22, t, 0.4); p.visible = s > 0.01; p.scale.setScalar(S0(s)); });

    // main cables: upper (to sheave) and lower (to crosshead); snapped ones split
    const topY = TOPW + 0.6 + 1.6; // sheave centre height
    cables.forEach((c, i) => {
      const snapT = SNAP[i]; const broken = !fresh && t >= snapT;
      const a = V(c.x * 0.6, topY - SHEAVE_R * 0.2, CARZ - 1.0 + SHEAVE_R + c.z);   // leaves the sheave towards the car
      const b = V(c.x, cy + CAR_H + 0.72, CARZ + c.z);
      if (!broken) { c.upper.visible = true; c.lower.visible = false; placeCyl(c.upper, a, b); }
      else {
        const dt = t - snapT; const mid = a.clone().lerp(b, 0.5);
        // upper part springs up, lower part whips and dangles from the crosshead
        const upEnd = mid.clone().add(V(0.4 * Math.sin(dt * 6) * Math.exp(-dt * 2), 3 + 6 * (1 - Math.exp(-dt * 3)), 0.3 * Math.sin(dt * 5) * Math.exp(-dt)));
        const lowLen = Math.min(4.5, b.distanceTo(mid));
        const sway = Math.sin(dt * 4 + i) * Math.exp(-dt * 0.8);
        const lowEnd = b.clone().add(V(0.9 * sway + 0.6 * (i % 2 ? 1 : -1), Math.min(-0.2, lowLen * (0.4 - 0.8 * ss(0, 1.2, dt))), 0.8 + 0.4 * sway));
        c.upper.visible = true; c.lower.visible = true; placeCyl(c.upper, a, upEnd); placeCyl(c.lower, b, lowEnd);
      }
      // glow: counting 9.5-12.5 (cyan), then only cable 3 holds the load (yellow) 17-21
      const count = ss(9.3 + (i - 1) * 0.55, 9.6 + (i - 1) * 0.55, t) * (1 - ss(13.5, 14.2, t)) * (i > 0 ? 1 : 0);
      const holder = i === 3 ? ss(17.0, 17.4, t) * (1 - ss(21.0, 21.5, t)) : 0;
      const dim = i !== 3 && i !== 0 ? ss(17.0, 17.4, t) * (1 - ss(21.0, 21.5, t)) : 0;
      c.m.emissive.setHex(holder > 0.01 ? PAL.lift : PAL.safe); c.m.emissiveIntensity = fresh ? 0 : Math.max(count * 1.6, holder * 2.2);
      c.m.color.setHex(PAL.cable); c.m.opacity = 1; c.m.transparent = dim > 0.01; c.m.opacity = 1 - 0.75 * dim;
    });
    // counterweight: moves opposite the car
    const cwy = TOP - 6 - (cy - CAR_Y0) * -1 - 4 - (CAR_Y0 - cy);
    const cwY = TOPW - 12;
    cw.position.set(0, cwY, SHAFT.z0 + 0.55);
    cwCables.forEach((c, i) => placeCyl(c, V(-0.5 + i * 0.5, topY, SHAFT.z0 + 0.55), V(-0.5 + i * 0.5, cwY + 3.8, SHAFT.z0 + 0.55)));
    // sheave turns with car motion (until cables are gone)
    sheave.rotation.x = (CAR_Y0 - cy) / SHEAVE_R;
    // governor: wheel speed follows car speed until tripped; fly-weights swing out with speed; pawl catches at 28
    const tripped = !fresh && t >= 28.0;
    const govAngle = tripped ? (CAR_Y0 - YT[Math.round(28 * 120)]) / GOV_R : (CAR_Y0 - cy) / GOV_R;
    govWheel.rotation.z = -govAngle;
    const spin = fresh ? 0 : Math.min(1, vFall(Math.min(t, 28)) / 4.2);
    flyW.forEach((p) => (p.rotation.z = 0.15 + 0.9 * ss(0.45, 1.0, spin) * (tripped ? 1 : 1)));
    govMat.emissiveIntensity = fresh ? 0 : 1.6 * ss(25.5, 27.5, t) * (1 - ss(31, 32, t));
    pawl.rotation.z = tripped ? -0.5 : 0; pawl.material.emissiveIntensity = tripped && t < 33 ? 2.0 : 0;
    govGlow.material.opacity = fresh ? 0 : 0.9 * ss(27.8, 28.1, t) * (1 - ss(29.5, 31, t));
    // governor rope: from the governor wheel down to the tension sheave in the pit; it is clamped to the car's lever
    const gx = RAILX + 0.25, gz = CARZ + 0.9;
    placeCyl(govRope[0], V(gx + GOV_R, TOPW + 2.1, gz), V(gx + 0.55, BASE - 2.4, gz));
    placeCyl(govRope[1], V(gx - GOV_R, TOPW + 2.1, gz), V(gx - 0.55, BASE - 2.4, gz));
    govRopeM.emissiveIntensity = fresh ? 0 : 2.0 * ss(28.1, 28.6, t) * (1 - ss(34.5, 35.5, t));
    // lever + safety wedges
    const pull = fresh ? 0 : ss(31.6, 32.4, t);
    lever.rotation.z = 0.55 * pull;
    leverArm.material.emissiveIntensity = linkRod.material.emissiveIntensity = 2.0 * pull * (1 - ss(37.5, 38.5, t));
    safety.forEach((s) => s.wedges.forEach((w) => { w.m.position.y = -0.05 + 0.22 * pull; w.m.position.z = w.side * (0.18 - 0.08 * pull); }));
    wedgeM.emissiveIntensity = 1.4 * ss(32.3, 32.6, t) * (1 - ss(37.5, 38.5, t)) * (fresh ? 0 : 1);
    safety.forEach((s) => (s.g.children[0].material.opacity = 0.2 + 0.25 * ss(31, 32, t) * (1 - ss(39, 40, t))));

    // arrows (segment 3): weight down, cable holds up
    { const on = fresh ? 0 : pop(17.6, t, 0.45) * (1 - ss(20.8, 21.3, t)); weightArrow.visible = on > 0.01; weightArrow.scale.setScalar(S0(on) * 1.3); weightArrow.position.set(-1.0, cy + 2.4, CARZ + 2.4); weightArrow.rotation.set(Math.PI, 0, 0); }
    { const on = fresh ? 0 : pop(18.3, t, 0.45) * (1 - ss(20.8, 21.3, t)); holdArrow.visible = on > 0.01; holdArrow.scale.setScalar(S0(on) * 1.4); holdArrow.position.set(1.0, cy + CAR_H + 1.2, CARZ + 1.6); }

    // buffers (pit): appear 42.5 / 43.0; ghost car drops 44.5-45.3 and compresses them
    springs.forEach((s, i) => { const on = pop(42.5 + i * 0.35, t, 0.45); s.g.visible = on > 0.01; s.g.scale.setScalar(S0(on)); });
    const gT = t - 44.5; const gOn = t > 44.2 && t < 48 ? 1 : 0;
    ghost.visible = gOn > 0;
    const impact = 45.3;
    let gy = 10 - 18 * clamp(gT / 0.8) ** 2; let comp = 0;
    if (t >= impact) { const u = t - impact; comp = 0.55 * Math.exp(-u * 3) * Math.cos(u * 9) + 0.15 * (1 - Math.exp(-u * 4)); gy = BASE - 3.0 + 1.72 - comp + CAR_H / 2 - 0.12; }
    else gy = Math.max(BASE + gy + CAR_H / 2, BASE - 3.0 + 1.72 + CAR_H / 2);
    ghost.position.set(0, gy, CARZ);
    ghost.material.opacity = 0.25 * (1 - ss(47.2, 48, t)); ghostEdges.material.opacity = 0.9 * (1 - ss(47.2, 48, t));
    springs.forEach((s) => { const sq = 1 - clamp(comp, 0, 0.55); s.coil.scale.y = 1.6 * sq; s.capP.position.y = 1.66 * sq; });

    // 1854 platform
    { const P = otisParts; const on = (a) => S0(pop(a, t, 0.45));
      P.posts.scale.setScalar(on(48.6)); P.plat.scale.setScalar(on(49.0)); P.man.scale.setScalar(on(49.4));
      const cut = t >= 51.6; const drop = t < 51.6 ? 0 : t < 52.15 ? -0.9 * ((t - 51.6) / 0.55) ** 2 : -0.9 + 0.05 * Math.exp(-(t - 52.15) * 6) * Math.sin((t - 52.15) * 30);
      const platY = 5.0 + drop; P.plat.position.y = platY;
      P.wagonSpring.scale.x = cut ? 1.12 : 0.85; // spring snaps out into the teeth
      const r0 = V(0, 11.4, 0), r1 = V(0, platY + 1.4, 0);
      const ropeOn = on(49.8) > 0.05;
      P.rope.visible = ropeOn; P.ropeTop.visible = ropeOn && cut;
      if (!cut) placeCyl(P.rope, r0, r1); else { placeCyl(P.ropeTop, r0, V(0.1, 9.6 + Math.exp(-(t - 51.6) * 3), 0)); placeCyl(P.rope, r1, r1.clone().add(V(0.4, 1.4 * Math.exp(-(t - 51.6) * 2) + 0.3, 0))); }
      const swing = t < 51.1 ? 0 : t < 51.6 ? -1.6 * ss(51.1, 51.6, t) : -1.6 + 0.4 * ss(51.6, 52.4, t);
      P.axe.visible = t > 50.3 && t < 53.2; P.axe.rotation.z = 0.9 + swing;
      P.hat.rotation.z = 0.5 * (ss(53.4, 53.8, t) - ss(54.2, 54.6, t)); P.hat.position.y = 1.85 + 0.25 * (ss(53.4, 53.8, t) - ss(54.2, 54.6, t));
      P.halo.material.opacity = 0.35 * ss(48.6, 49.2, t) * (1 - ss(55, 56, t));
      otis.visible = t > 48.3 && t < 58.5; }

    // particles
    let q = 0; const gpos = V();
    for (const B of BURSTS) {
      const dtb = t - B.t; if (dtb < 0 || dtb > 1.2 || (fresh && B.t < 50)) continue;
      const r2 = mulberry32(Math.round(B.t * 100));
      let c0;
      if (B.at.startsWith("cable")) { const c = cables[+B.at.slice(5)]; c0 = V(c.x * 0.8, (TOPW + 2 + YT[Math.round(B.t * 120)] + CAR_H) / 2, CARZ + c.z); }
      else if (B.at === "gov") { GOV.getWorldPosition(gpos); c0 = gpos.clone(); }
      else if (B.at === "pit") c0 = V(0, BASE - 1.3, CARZ);
      else { otis.updateMatrixWorld(true); c0 = V(2.0, 5.2, 0).applyMatrix4(otis.matrixWorld); }
      for (let i = 0; i < B.n && q < NP; i++) {
        const d = V(r2() - 0.5, B.dust ? r2() * 0.4 : r2() - 0.3, r2() - 0.5).normalize();
        const p = c0.clone().add(d.multiplyScalar(B.spd * (1 - Math.exp(-dtb * 3.5)))); p.y -= (B.dust ? 0.2 : 3.0) * dtb * dtb;
        dummy.position.copy(p); dummy.rotation.set(r2() * 6, r2() * 6, dtb * 4);
        const s = (B.dust ? 0.35 : 0.07) * (1 - dtb / 1.2) * (0.6 + r2()); dummy.scale.setScalar(S0(s)); dummy.updateMatrix(); parts.setMatrixAt(q, dummy.matrix);
        col.setHex(B.c[i % B.c.length]).multiplyScalar(B.dust ? 1 : 2.2); parts.setColorAt(q, col); q++;
      }
    }
    // continuous sparks while the safeties grip the rails (32.4-36.8)
    if (!fresh && t > 32.4 && t < 37.0) {
      const r2 = mulberry32(5); const inten = 1 - ss(35.5, 37.0, t);
      for (let i = 0; i < 120 && q < NP; i++) {
        const side = i % 2 ? 1 : -1; const age = ((t * 2.2 + r2()) % 1);
        const p = V(side * RAILX + side * 0.2 * age * (r2() + 0.3), cy - 0.3 - age * 2.2 * (0.5 + r2()), CARZ + (r2() - 0.5) * 0.6 + age * 0.8);
        dummy.position.copy(p); dummy.rotation.set(r2() * 6, r2() * 6, 0); dummy.scale.set(S0(0.03 * inten), S0(0.16 * inten * (1 - age)), S0(0.03 * inten)); dummy.updateMatrix(); parts.setMatrixAt(q, dummy.matrix);
        col.setHex(age < 0.3 ? 0xffffff : PAL.spark).multiplyScalar(2.5); parts.setColorAt(q, col); q++;
      }
    }
    for (; q < NP; q++) hide(parts, q);
    parts.instanceMatrix.needsUpdate = true; parts.instanceColor.needsUpdate = true;
    // fall streaks (moving up past the camera while the car drops)
    let k = 0; const fallOn = fresh ? 0 : clamp(vFall(t) / 4.2);
    if (fallOn > 0.05) { const r2 = mulberry32(17);
      for (let i = 0; i < 60 && k < NS; i++) { const ph = r2(); const s = (t * 1.4 + ph) % 1;
        const p = V((r2() - 0.5) * 6, cy - 6 + s * 16, CARZ + 2.0 + r2() * 2.5);
        dummy.position.copy(p); dummy.rotation.set(0, 0, 0); dummy.scale.set(0.03, S0(1.6 * fallOn * Math.sin(Math.PI * s)), 0.03); dummy.updateMatrix(); streaks.setMatrixAt(k++, dummy.matrix); } }
    for (; k < NS; k++) hide(streaks, k);
    streaks.instanceMatrix.needsUpdate = true;

    // camera
    const cam = camAt(t);
    camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, H * 0.1, W, H); camera.updateProjectionMatrix();
    // tilt-shift focus follows the look target on screen
    const lp = cam.L.clone().project(camera); finish.uniforms.focusY.value = clamp(0.5 + lp.y * 0.5, 0.2, 0.85);
    const wide = ss(55, 57.2, t) * (1 - ss(58.6, 60, t));
    finish.uniforms.blurAmt.value = 0.55 + 0.6 * wide; finish.uniforms.band.value = lerp(0.2, 0.12, wide);
    // sun / shadow camera follows the action
    const focus = cam.L.clone(); sun.position.set(focus.x + 60, focus.y + 90, focus.z + 70); sun.target.position.copy(focus);
    composer.render();
    return { speed: speedMS(t) };
  }

  function debug(t) { render(t); const v = car.position.clone().project(camera); return { t, car: car.position.toArray().map((x) => +x.toFixed(1)), ndc: [+v.x.toFixed(2), +v.y.toFixed(2)], cam: camera.position.toArray().map((x) => +x.toFixed(1)) }; }
  return { render, speed: speedMS, debug, scene };
}
