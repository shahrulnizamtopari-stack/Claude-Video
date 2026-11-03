// "Periuk Nasi Boleh Ditipu" — studio / technical-cutaway look.
// Everything on screen is a pure function of canonical time t (0..60 s).
// Units: cm. Cooker stands on the floor at y = 0, front faces +z.
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "./lib/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "./lib/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./lib/jsm/geometries/RoundedBoxGeometry.js";

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const pop = (t0, t, d = 0.4) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S0 = (x) => Math.max(0.0001, x);
const P2 = (a) => a.map(([x, y]) => new THREE.Vector2(x, y));

export const PAL = {
  bg: 0xeef1f8, floor: 0xf4f6fa, ink: 0x15171c,
  shell: 0xf3f4f6, shellCut: 0xb9bec9, foot: 0x3a3f4a, panel: 0x262b36,
  pot: 0xc9ced6, potCut: 0x8e96a3, heater: 0x4a4f5a, housing: 0xd5d9e0,
  ferrite: 0x2c3038, magnet: 0xe0453a, steel: 0xaab0ba, brass: 0xd8a640,
  blue: 0x2f5bff, water: 0x6fa8ff, rice: 0xf5f1e6, hot: 0xff6a2a, cook: 0xff7a1a, warm: 0x2fbf6a,
};
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0, ...o });

export function createWorld(canvas, W, H, scale = 1, opts = {}) {
  const FX = { bloom: opts.bloom ?? true, msaa: opts.msaa ?? (scale < 1 ? 0 : 4) };
  const realRandom = Math.random; Math.random = mulberry32(1234);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.bg);
  scene.fog = new THREE.Fog(PAL.bg, 160, 520);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(34, W / H, 0.5, 2000);

  // ---------- light: soft studio ----------
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3ec, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.castShadow = true; key.shadow.mapSize.set(scale < 1 ? 1024 : 2048, scale < 1 ? 1024 : 2048);
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.05; key.shadow.radius = 6;
  const kc = key.shadow.camera; kc.left = -45; kc.right = 45; kc.top = 45; kc.bottom = -45; kc.near = 1; kc.far = 300;
  scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6); fill.position.set(-80, 40, 60); scene.add(fill);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(600, 64), mat(PAL.floor, { roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // glow sprite
  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.3, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, size, op = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false, fog: false })); s.scale.set(size, size, 1); return s; };

  // ---------- outline helper: crisp ink edges, like a technical drawing ----------
  const inkM = (clip) => new THREE.LineBasicMaterial({ color: PAL.ink, transparent: true, opacity: 1, clippingPlanes: clip || null });
  const edges = (mesh, thr = 28, clip) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, thr), inkM(clip)); mesh.add(l); return l; };
  // half lathe (back half z<=0 or front half z>=0) with caps on the cut plane (z = 0)
  const SEG = 72;
  function halfLathe(profile, material, capMaterial, front = false, clip) {
    const g = new THREE.Group();
    const lg = new THREE.LatheGeometry(P2(profile), SEG / 2, front ? -Math.PI / 2 : Math.PI / 2, Math.PI);
    const m = new THREE.Mesh(lg, material); m.castShadow = true; m.receiveShadow = true; g.add(m); edges(m, 28, clip);
    if (!front) {
      const shape = new THREE.Shape(P2(profile));
      for (const sx of [1, -1]) {
        const cg = new THREE.ShapeGeometry(shape); cg.scale(sx, 1, 1);
        const c = new THREE.Mesh(cg, capMaterial); c.position.z = 0.002; c.receiveShadow = true; g.add(c); edges(c, 1);
      }
    }
    return g;
  }

  // ---------- cooker factory ----------
  const PROF = {
    wall: [[13.0, 1.2], [14.4, 1.8], [14.7, 4], [14.7, 17.5], [14.2, 20.4], [13.4, 21.0], [12.7, 21.0], [12.7, 20.2], [13.9, 19.5], [13.9, 2.2], [13.0, 1.9], [13.0, 1.2]],
    bottom: [[3.0, 1.2], [13.0, 1.2], [13.0, 1.75], [3.0, 1.75], [3.0, 1.2]],
    foot: [[11.0, 0], [12.8, 0], [13.0, 1.2], [11.4, 1.2], [11.0, 0]],
    pot: [[0.01, 4.0], [10.6, 4.0], [11.0, 4.4], [11.0, 19.4], [12.4, 19.6], [12.4, 20.0], [10.65, 20.0], [10.65, 4.75], [10.3, 4.35], [0.01, 4.35], [0.01, 4.0]],
    heater: [[3.3, 3.0], [10.4, 3.0], [10.6, 3.3], [10.6, 3.98], [8.8, 3.98], [8.8, 3.6], [5.0, 3.6], [5.0, 3.98], [3.3, 3.98], [3.3, 3.0]],
    housing: [[0.01, 0.55], [2.75, 0.55], [2.75, 3.2], [2.45, 3.2], [2.45, 0.85], [0.01, 0.85], [0.01, 0.55]],
  };
  const MAG_UP = 2.0, MAG_DOWN = 1.0, MAG_H = 0.9; // permanent magnet bottom y: engaged / released

  function makeCooker(name) {
    const C = { name, group: new THREE.Group() }; const G = C.group; scene.add(G);
    const clipPlane = new THREE.Plane(V(0, -1, 0), 99); C.clip = clipPlane; const clip = [clipPlane];
    const shellM = mat(PAL.shell, { roughness: 0.45 }), shellFrontM = mat(PAL.shell, { roughness: 0.45, side: THREE.DoubleSide, clippingPlanes: clip });
    const cutM = mat(PAL.shellCut, { roughness: 0.8, side: THREE.DoubleSide });
    const potM = mat(PAL.pot, { metalness: 0.75, roughness: 0.32 }), potFrontM = mat(PAL.pot, { metalness: 0.75, roughness: 0.32, side: THREE.DoubleSide, clippingPlanes: clip });
    const potCutM = mat(PAL.potCut, { metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide });
    const footM = mat(PAL.foot, { roughness: 0.6 });
    C.heaterM = mat(PAL.heater, { roughness: 0.5, metalness: 0.3, emissive: PAL.hot, emissiveIntensity: 0, side: THREE.DoubleSide });
    // back halves (always) + front halves (clipped away by the sweep)
    for (const [p, m, cm] of [[PROF.wall, shellM, cutM], [PROF.bottom, shellM, cutM], [PROF.foot, footM, footM], [PROF.pot, potM, potCutM], [PROF.heater, C.heaterM, C.heaterM]]) {
      G.add(halfLathe(p, m, cm, false));
      const fm = m === shellM ? shellFrontM : m === potM ? potFrontM : m === footM ? mat(PAL.foot, { clippingPlanes: clip, side: THREE.DoubleSide }) : mat(PAL.heater, { clippingPlanes: clip, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 });
      if (m === C.heaterM) { C.heaterFrontM = fm; fm.emissive = new THREE.Color(PAL.hot); }
      G.add(halfLathe(p, fm, null, true, clip));
    }
    // front panel with lamps (clipped with the shell)
    const panelM = mat(PAL.panel, { roughness: 0.35, clippingPlanes: clip });
    const panel = new THREE.Mesh(new RoundedBoxGeometry(9.5, 8.5, 1.2, 3, 0.5), panelM); panel.position.set(0, 10.4, 14.35); panel.castShadow = true; G.add(panel); edges(panel, 40, clip);
    const lampMk = (color, x) => { const m = new THREE.MeshStandardMaterial({ color: 0x555a66, emissive: color, emissiveIntensity: 0, roughness: 0.3, clippingPlanes: clip });
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m); l.rotation.x = Math.PI / 2; l.position.set(x, 12.6, 14.95); G.add(l); return m; };
    C.lampCook = lampMk(PAL.cook, -2.1); C.lampWarm = lampMk(PAL.warm, 2.1);
    { const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; const g = cv.getContext("2d");
      g.font = "700 54px Inter, sans-serif"; g.fillStyle = "#e9ecf2"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("COOK", 152, 64); g.fillText("WARM", 360, 64);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.1), new THREE.MeshBasicMaterial({ map: tx, transparent: true, clippingPlanes: clip })); pl.position.set(0, 10.6, 14.97); G.add(pl); }
    // switch knob (pokes out of the front, under the panel): moves with the lever
    C.knob = new THREE.Group(); G.add(C.knob);
    { const k = new THREE.Mesh(new RoundedBoxGeometry(3.6, 1.4, 2.6, 2, 0.4), mat(0x3b4150, { roughness: 0.4 })); k.position.set(0, 0, 15.0); k.castShadow = true; C.knob.add(k); edges(k, 40);
      const link = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6.0, 0.5), mat(PAL.steel, { metalness: 0.6, roughness: 0.35 })); link.position.set(0, -3.0, 13.4); C.knob.add(link); edges(link, 40);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.8), mat(PAL.steel, { metalness: 0.6, roughness: 0.35 })); arm.position.set(0, 0, 14.0); C.knob.add(arm); }
    // lever under the cooker floor: pivot at z = 6.5
    C.lever = new THREE.Group(); C.lever.position.set(0, 0.35, 6.5); G.add(C.lever);
    { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 13.4), mat(PAL.steel, { metalness: 0.6, roughness: 0.35 })); bar.position.z = 0.0; C.lever.add(bar); edges(bar, 40);
      const piv = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.2, 16), mat(PAL.ferrite)); piv.rotation.z = Math.PI / 2; C.lever.add(piv); }
    // thermostat: housing cup (cut), contact cap + ferrite (fixed, touching the pot), permanent magnet (moves), spring, rod
    G.add(halfLathe(PROF.housing, mat(PAL.housing, { roughness: 0.5 }), mat(0x9aa1ad, { side: THREE.DoubleSide }), false));
    G.add(halfLathe(PROF.housing, mat(PAL.housing, { roughness: 0.5, side: THREE.DoubleSide, clippingPlanes: clip }), null, true, clip));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.4, 40), mat(PAL.steel, { metalness: 0.7, roughness: 0.3 })); cap.position.y = 3.8; cap.castShadow = true; G.add(cap); edges(cap);
    C.ferrite = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.7, 40), mat(PAL.ferrite, { roughness: 0.6, emissive: PAL.hot, emissiveIntensity: 0 })); C.ferrite.position.y = 3.25; G.add(C.ferrite); edges(C.ferrite);
    C.magnet = new THREE.Group(); G.add(C.magnet);
    { const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, MAG_H / 2, 40), mat(PAL.magnet, { roughness: 0.45 })); top.position.y = MAG_H * 0.75; C.magnet.add(top); edges(top);
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, MAG_H / 2, 40), mat(0x3d63d8, { roughness: 0.45 })); bot.position.y = MAG_H * 0.25; C.magnet.add(bot); edges(bot);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.4, 12), mat(PAL.steel, { metalness: 0.7, roughness: 0.3 })); rod.position.y = -1.2; C.magnet.add(rod); }
    // spring (helix) from the housing floor to the magnet bottom: rebuilt per frame by scaling
    { const pts = []; const turns = 5; for (let i = 0; i <= turns * 24; i++) { const a = (i / 24) * Math.PI * 2; pts.push(V(Math.cos(a) * 0.9, i / (turns * 24), Math.sin(a) * 0.9)); }
      C.spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.09, 6), mat(PAL.brass, { metalness: 0.7, roughness: 0.3 })); C.spring.position.y = 0.85; G.add(C.spring); }
    // magnetic field loops between the two magnets
    C.field = new THREE.Group(); G.add(C.field);
    C.fieldM = new THREE.MeshBasicMaterial({ color: PAL.blue, transparent: true, opacity: 0, depthWrite: false });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; const r0 = 1.6, r1 = 2.2 + (k % 2) * 0.5;
      const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; const r = r0 + (r1 - r0) * Math.sin(Math.PI * u); pts.push(V(Math.cos(a) * r, lerp(1.95, 3.55, u), Math.sin(a) * r)); }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 6), C.fieldM); C.field.add(tube); }
    // power wire: from the knob switch down and across to the heater; dots run along it while cooking
    C.wireCurve = new THREE.CatmullRomCurve3([V(1.2, 6.5, 13.3), V(1.6, 2.4, 12.8), V(8.5, 2.2, 9.0), V(11.6, 2.5, 1.0), V(9.5, 3.0, -4.0)]);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(C.wireCurve, 60, 0.13, 6), mat(0x2b2f38)); G.add(wire);
    C.dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: 0x7fb0ff, toneMapped: false }), 10); C.dots.frustumCulled = false; G.add(C.dots);
    C.heatGlow = glow(0xff8a4a, 26, 0); C.heatGlow.position.set(0, 3.6, 0); G.add(C.heatGlow);
    // sweep ring (where the cut passes)
    C.ring = new THREE.Mesh(new THREE.TorusGeometry(14.85, 0.16, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ color: 0x8fb0ff, toneMapped: false, transparent: true, opacity: 0 }));
    C.ring.rotation.x = Math.PI / 2; C.ring.rotation.z = Math.PI; G.add(C.ring);
    // lid: hinged at the back rim, open
    C.lid = new THREE.Group(); C.lid.position.set(0, 21.0, -13.9); G.add(C.lid);
    { const prof = [[0.01, 2.9], [6, 2.65], [11, 1.9], [13.7, 0.8], [14.3, 0.0], [12.6, 0.0], [12.6, -0.6], [0.01, -0.6]];
      const lm = new THREE.Mesh(new THREE.LatheGeometry(P2(prof), SEG), mat(PAL.shell, { roughness: 0.45 })); lm.position.z = 13.9; lm.castShadow = true; C.lid.add(lm); edges(lm, 30);
      const inner = new THREE.Mesh(new THREE.CircleGeometry(12.6, SEG), mat(0xc4c9d2, { metalness: 0.6, roughness: 0.35 })); inner.rotation.x = Math.PI / 2; inner.position.set(0, -0.61, 13.9); C.lid.add(inner);
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.8, 24), mat(0x3b4150)); vent.position.set(0, 3.0, 13.9 - 4.5); C.lid.add(vent); edges(vent, 40); }
    C.lid.rotation.x = -1.78;
    // water (back half + cut face) and rice (cut face + grains)
    C.waterM = new THREE.MeshStandardMaterial({ color: PAL.water, transparent: true, opacity: 0.42, roughness: 0.1, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
    C.water = new THREE.Mesh(new THREE.CylinderGeometry(10.62, 10.62, 1, SEG / 2, 1, false, Math.PI / 2, Math.PI), C.waterM); G.add(C.water);
    C.waterFace = new THREE.Mesh(new THREE.PlaneGeometry(21.24, 1), new THREE.MeshStandardMaterial({ color: PAL.water, transparent: true, opacity: 0.55, roughness: 0.2, depthWrite: false })); C.waterFace.position.z = 0.01; G.add(C.waterFace);
    C.waterTop = new THREE.Mesh(new THREE.CircleGeometry(10.62, SEG / 2, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: 0x9cc4ff, transparent: true, opacity: 0.5, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide })); C.waterTop.rotation.x = -Math.PI / 2; G.add(C.waterTop);
    C.riceFace = new THREE.Mesh(new THREE.PlaneGeometry(21.2, 1), mat(PAL.rice, { roughness: 0.9 })); C.riceFace.position.z = 0.02; G.add(C.riceFace);
    { const N = 900, r = mulberry32(31); C.grains = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.17, 0.42, 3, 6), mat(PAL.rice, { roughness: 0.7 }), N); C.grains.castShadow = false;
      const d = new THREE.Object3D();
      for (let i = 0; i < N; i++) { const a = Math.PI + r() * Math.PI, rr = Math.sqrt(r()) * 10.3; const onFace = i < 160;
        d.position.set(onFace ? (r() * 2 - 1) * 10.2 : Math.cos(a) * rr, 4.5 + r() * 3.6, onFace ? -0.05 - r() * 0.2 : Math.sin(a) * rr);
        d.rotation.set(r() * 6, r() * 6, r() * 6); d.scale.setScalar(1); d.updateMatrix(); C.grains.setMatrixAt(i, d.matrix); }
      G.add(C.grains); }
    // boiling bubbles
    C.NB = 70; C.bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe6f0ff, transparent: true, opacity: 0.8, roughness: 0.1 }), C.NB); C.bubbles.frustumCulled = false; G.add(C.bubbles);
    C.anchors = { ferrite: V(1.7, 3.25, 0.5), magnet: V(1.5, 2.4, 0.5), spring: V(0.9, 1.3, 0.6), button: V(2.2, 3.8, 0.4), heater: V(9.4, 3.6, 0.2), water: V(-6, 10, 0.2), lever: V(0, 0.4, 10), knob: V(0, 6.5, 16.3) };
    return C;
  }
  const dummy = new THREE.Object3D();
  const hide = (im, i) => { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); };

  // B = the empty cooker (hook, explanation, right side of the split, ending). A = the one with rice + water.
  const B = makeCooker("B"), A = makeCooker("A");

  // ---------- bowls ----------
  const BOWL_X = 48;
  const bowls = new THREE.Group(); scene.add(bowls);
  function makeBowl(x, soft) {
    const g = new THREE.Group(); g.position.set(BOWL_X + x, 0, 0); bowls.add(g);
    const prof = [[0.01, 0], [3.4, 0], [3.6, 0.6], [6.6, 2.4], [8.6, 5.6], [8.3, 5.7], [6.3, 2.8], [3.2, 1.2], [0.01, 1.2]];
    const b = new THREE.Mesh(new THREE.LatheGeometry(P2(prof), 64), mat(0xd9e2f2, { roughness: 0.35 })); b.castShadow = true; b.receiveShadow = true; g.add(b); edges(b, 30);
    const band = new THREE.Mesh(new THREE.TorusGeometry(7.7, 0.12, 6, 64), mat(PAL.blue)); band.rotation.x = Math.PI / 2; band.position.y = 4.4; g.add(band);
    if (soft) { // mushy: smooth wet mound + water sheen
      const m = new THREE.Mesh(new THREE.SphereGeometry(7.4, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf6f3ec, { roughness: 0.15, metalness: 0.05 })); m.scale.y = 0.42; m.position.y = 3.8; g.add(m); edges(m, 60);
      const sheen = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.35, 8, 64), new THREE.MeshStandardMaterial({ color: PAL.water, transparent: true, opacity: 0.6, roughness: 0.05 })); sheen.rotation.x = Math.PI / 2; sheen.position.y = 4.0; g.add(sheen);
    } else { // hard: lower, grainy, dry
      const r = mulberry32(soft ? 3 : 9); const N = 260; const gr = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.55, 3, 6), mat(0xeee3c8, { roughness: 0.95 }), N);
      for (let i = 0; i < N; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 6.6; const h = 3.6 + 1.6 * (1 - (rr / 6.6) ** 2) * r();
        dummy.position.set(Math.cos(a) * rr, h, Math.sin(a) * rr); dummy.rotation.set(r() * 6, r() * 6, r() * 6); dummy.scale.setScalar(1); dummy.updateMatrix(); gr.setMatrixAt(i, dummy.matrix); }
      g.add(gr); }
    return g;
  }
  const bowlSoft = makeBowl(-9.5, true), bowlHard = makeBowl(9.5, false);

  // ---------- post ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.3, 0.35, 1.6); if (FX.bloom) composer.addPass(bloom);
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, rew: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float rew; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = dot(c, vec3(0.299,0.587,0.114));
        vec3 r = mix(vec3(l), vec3(0.55,0.68,1.0) * l * 1.08, 0.55);                   // rewind: cool, desaturated
        r += 0.06 * step(0.5, fract(vUv.y * 160.0)) * rew;                             // faint scanlines
        gl_FragColor = vec4(mix(c, r, rew), 1.0); }`,
  });
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- story (canonical time) ----------
  const T = {
    hookClick: 0.15, rewOn: 10.5, rewKnobDown: 10.85, rewOff: 11.45, rewEnd: 11.95, cutA: 11.9, cutB: 13.3,
    press: 19.25, snap: 19.8, heat: 20.8,
    split0: 22.1, split1: 23.7, A100: 25.9, curieFade0: 33.8, curieFade1: 34.9, dropB: 37.15,
    merge0: 38.1, merge1: 39.6, drain0: 41.0, drain1: 42.6, dropA: 43.3,
    bowls0: 45.6, softPop: 46.9, hardPop: 48.6, swap: 50.0, end: 60,
  };
  // B state
  const bEngaged = (t) => { // 1 = lever down / magnet up (cooking)
    if (t < T.hookClick) return 1;
    if (t < T.rewKnobDown) return 0;                       // just clicked to Warm
    if (t < T.rewOff) return 1;                            // rewind: back to Cook
    if (t < T.press) return 0;                             // rewind further: before anyone pressed
    if (t < T.dropB) return 1;
    if (t < T.swap) return 0;
    return 1;                                              // reset for the loop
  };
  const bLamp = (t) => { // 'cook' | 'warm' | 'off'
    if (t < T.hookClick) return "cook"; if (t < T.rewKnobDown) return "warm"; if (t < T.rewOff) return "cook";
    if (t < T.press) return "off"; if (t < T.dropB) return "cook"; if (t < T.swap) return "warm"; return "cook"; };
  const aEngaged = (t) => (t < T.dropA ? 1 : 0);
  // temperatures (°C)
  const tempB = (t) => {
    if (t < T.press) return t < T.rewOff ? 103 : 28;
    if (t < 29.6) return lerp(28, 97, ss(T.press, 29.6, t) * 0.4 + clamp((t - T.press) / (29.6 - T.press)) * 0.6);
    if (t < 31.8) return lerp(97, 101, (t - 29.6) / 2.2);
    if (t < 32.5) return lerp(101, 103, (t - 31.8) / 0.7);
    if (t < T.dropB) return 103 + 0.4 * ss(32.5, 34, t);
    if (t < T.swap) return lerp(103.4, 70, ss(T.dropB, 46, t));
    return 103;
  };
  const tempA = (t) => {
    if (t < T.split0) return 28;
    if (t < T.A100) return lerp(28, 100, ss(T.split0 - 0.3, T.A100, t));
    if (t < T.drain1) return 100;
    if (t < T.dropA) return lerp(100, 103, (t - T.drain1) / (T.dropA - T.drain1));
    return lerp(103, 80, ss(T.dropA, 50, t));
  };
  const status = (temp, engaged, water, lamp) => (lamp === "off" ? "off" : !engaged ? "warm" : water > 0.02 && temp >= 99.5 ? "boil" : temp >= 100.5 ? "dry" : "cook");
  const cutH = (C, t) => (C === B ? (t < T.cutA ? 99 : t < T.swap ? lerp(23, -1, ss(T.cutA, T.cutB, t)) : 99) : -5);

  function setCooker(C, t, s) {
    C.group.visible = s.visible; if (!s.visible) return;
    C.group.position.set(s.x, 0, 0); C.lid.visible = s.cut > 30;
    // cut
    const h = s.cut; C.clip.constant = h; C.clip.normal.set(0, -1, 0);
    // clipping planes are in world space: translate by the group (only y matters, group y = 0)
    C.ring.position.y = h; C.ring.material.opacity = h > -0.5 && h < 22.5 ? 0.95 : 0;
    // lever/magnet
    const e = s.engaged; const magY = lerp(MAG_DOWN, MAG_UP, e);
    C.magnet.position.y = magY; C.spring.scale.set(1, S0(magY - 0.85), 1);
    C.lever.rotation.x = (magY - MAG_DOWN) / 6.5;   // inner end (z<pivot) up => outer end down
    C.knob.position.y = 6.6 - (magY - MAG_DOWN) * 1.0 - 0.0;
    C.fieldM.opacity = 0.9 * s.field;
    C.field.visible = s.field > 0.01;
    // heat + current
    const heat = s.heat; C.heaterM.emissiveIntensity = 2.2 * heat; if (C.heaterFrontM) C.heaterFrontM.emissiveIntensity = 2.2 * heat;
    C.heatGlow.material.opacity = 0.55 * heat;
    C.ferrite.material.emissiveIntensity = s.ferriteHot * 0.9;
    for (let i = 0; i < 10; i++) { if (s.current < 0.02) { hide(C.dots, i); continue; }
      const u = (i / 10 + t * 0.45) % 1; dummy.position.copy(C.wireCurve.getPointAt(u)); dummy.scale.setScalar(S0(s.current * Math.sin(Math.PI * u) * 1.2)); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); C.dots.setMatrixAt(i, dummy.matrix); }
    C.dots.instanceMatrix.needsUpdate = true;
    // lamps
    C.lampCook.emissiveIntensity = s.lamp === "cook" ? 3.0 : 0; C.lampWarm.emissiveIntensity = s.lamp === "warm" ? 3.0 : 0;
    // water + rice
    const lvl = s.water; // water top y
    const wOn = s.waterOn;
    C.water.visible = C.waterFace.visible = C.waterTop.visible = wOn > 0.01;
    const wy0 = 4.35, wh = Math.max(0.01, lvl - wy0);
    C.water.scale.set(1, wh, 1); C.water.position.y = wy0 + wh / 2; C.waterFace.scale.set(1, wh, 1); C.waterFace.position.y = wy0 + wh / 2; C.waterTop.position.y = lvl;
    C.waterM.opacity = 0.42 * wOn; C.waterFace.material.opacity = 0.55 * wOn; C.waterTop.material.opacity = 0.5 * wOn;
    C.riceFace.visible = C.grains.visible = s.rice;
    if (s.rice) { C.riceFace.scale.set(1, s.riceTop - 4.35, 1); C.riceFace.position.y = (s.riceTop + 4.35) / 2; C.grains.scale.set(1, 1, 1); }
    // bubbles
    for (let i = 0; i < C.NB; i++) { if (s.boil < 0.02 || !wOn) { hide(C.bubbles, i); continue; }
      const r = mulberry32(i * 7 + 1); const x = (r() * 2 - 1) * 9.5, z = -r() * 9.5; const ph = r(); const sp = 0.6 + r() * 0.6;
      const u = (t * sp + ph) % 1; const y = lerp(5.0, lvl - 0.2, u); dummy.position.set(x + Math.sin(u * 9 + i) * 0.3, y, Math.max(-9.5, Math.min(-0.2, z)));
      dummy.scale.setScalar(S0(s.boil * (0.5 + 0.9 * u) * (u > 0.95 ? (1 - u) * 20 : 1))); dummy.updateMatrix(); C.bubbles.setMatrixAt(i, dummy.matrix); }
    C.bubbles.instanceMatrix.needsUpdate = true;
  }

  // ---------- camera ----------
  let curT = 0;
  const bx = (t) => (t < T.split0 ? 0 : t < T.merge0 ? lerp(0, 15.6, ss(T.split0, T.split1, t)) : t < T.swap ? lerp(15.6, 140, ss(T.merge0, T.merge1, t)) : 0);
  const ax = (t) => (t < T.merge0 ? lerp(-80, -15.6, ss(T.split0, T.split1, t)) : lerp(-15.6, 0, ss(T.merge0, T.merge1, t)));
  const K0 = { pos: V(22, 68, 72), look: V(0, 11, 0), fov: 40 };
  const keys = [
    { t: 0, ...K0 },
    { t: 5.8, pos: V(16, 60, 64), look: V(0, 10.5, 0), fov: 40 },
    { t: 10.4, pos: V(9, 24, 92), look: V(0, 10, 0), fov: 40 },
    { t: 12.4, pos: V(6, 18, 84), look: V(0, 9, 0), fov: 40 },
    { t: 14.8, pos: V(16, 9, 30), look: V(0, 2.6, 0), fov: 40 },
    { t: 18.4, pos: V(-11, 6.5, 23), look: V(0, 2.4, 0), fov: 40 },
    { t: 21.4, pos: V(-9, 9, 36), look: V(0, 3.5, 0), fov: 40 },
    { t: 24.0, pos: V(0, 17, 150), look: V(0, 10, 0), fov: 40 },
    { t: 37.6, pos: V(0, 16, 144), look: V(0, 9.5, 0), fov: 40 },
    { t: 40.0, pos: V(10, 20, 90), look: V(0, 9, 0), fov: 40 },
    { t: 44.6, pos: V(-8, 16, 82), look: V(0, 8, 0), fov: 40 },
    { t: 46.8, pos: V(BOWL_X, 50, 85), look: V(BOWL_X, 3, 0), fov: 40 },
    { t: 51.4, pos: V(BOWL_X - 4, 45, 78), look: V(BOWL_X, 3, 0), fov: 40 },
    { t: 55.6, pos: V(40, 80, 150), look: V(4, 12, 0), fov: 40 },
    { t: 60, ...K0 },
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
    let u = clamp((t - k1.t) / (k2.t - k1.t)); u = u * u * (3 - 2 * u) * 0.7 + u * 0.3;
    return { P: hc(k0.pos, k1.pos, k2.pos, k3.pos, u), L: hc(k0.look, k1.look, k2.look, k3.look, u), fov: lerp(k1.fov, k2.fov, u) }; };

  // ---------- render ----------
  const proj = (v) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H, p.z < 1 ? 1 : 0]; };
  function render(t) {
    t = clamp(t, 0, 60); curT = t;
    // B
    const eB = bEngaged(t); const lampB = bLamp(t);
    const bHeat = lampB === "cook" ? (t < T.press ? 1 : ss(T.heat - 0.3, T.heat + 0.5, t)) : 0;
    const fieldB = eB * (t >= T.press && t < T.dropB ? 1 - ss(T.curieFade0, T.curieFade1, t) : t < T.press ? (t < T.rewOff && t >= T.rewKnobDown ? 1 : 0) : t >= T.swap ? 1 : 0);
    // snap: magnet rises from 19.25 and snaps at 19.8
    const eBs = t >= T.press && t < T.snap ? ss(T.press, T.snap, t) ** 2 : eB;
    const fieldShow = (t > T.cutA && t < T.swap) ? fieldB * (t < T.snap ? 0 : ss(T.snap, T.snap + 0.3, t)) : 0;
    setCooker(B, t, { visible: true, x: bx(t), cut: cutH(B, t), engaged: eBs, lamp: lampB, heat: bHeat, current: (t > T.snap && t < T.dropB) ? ss(T.snap, T.snap + 0.4, t) : 0, field: fieldShow,
      ferriteHot: t > 31.8 && t < 40 ? ss(31.8, 33.5, t) * (1 - ss(T.dropB + 1, 40, t)) : 0, water: 4.35, waterOn: 0, rice: false, boil: 0 });
    // A
    const aVis = t >= T.split0 - 0.01 && t < T.swap;
    const lvl = t < T.drain0 ? 12 : lerp(12, 8.6, ss(T.drain0, T.drain1, t));
    const wOn = t < T.drain0 ? 1 : 1 - ss(T.drain1 - 0.6, T.drain1, t);
    setCooker(A, t, { visible: aVis, x: ax(t), cut: -5, engaged: aEngaged(t), lamp: t < T.dropA ? "cook" : "warm", heat: t < T.dropA ? 1 : 0, current: t < T.dropA ? 1 : 0,
      field: t < T.dropA ? 1 - ss(T.dropA - 0.8, T.dropA - 0.1, t) : 0, ferriteHot: t > T.drain1 && t < 48 ? ss(T.drain1, T.dropA, t) * (1 - ss(45, 48, t)) : 0,
      water: lvl, waterOn: wOn, rice: true, riceTop: lerp(8.1, 8.9, ss(T.split0, T.drain1, t)), boil: ss(24.5, T.A100, t) * (1 - ss(T.drain1 - 1.2, T.drain1, t)) });
    // bowls
    bowls.visible = t > T.bowls0 - 2 && t < 54.5;
    bowlSoft.scale.setScalar(S0(pop(T.softPop, t, 0.45))); bowlHard.scale.setScalar(S0(pop(T.hardPop, t, 0.45)));
    // rewind tint
    finish.uniforms.rew.value = ss(T.rewOn, T.rewOn + 0.2, t) * (1 - ss(T.rewEnd - 0.2, T.rewEnd, t));
    // camera
    const cam = camAt(t);
    camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, -H * 0.07, W, H); camera.updateProjectionMatrix();
    const focus = cam.L.clone(); key.position.set(focus.x + 40, focus.y + 70, focus.z + 50); key.target.position.copy(focus);
    composer.render();
    // anchors for the HTML labels
    const out = { t, anchors: {} };
    for (const C of [B, A]) { if (!C.group.visible) continue; C.group.updateMatrixWorld(true);
      for (const [k, v] of Object.entries(C.anchors)) out.anchors[C.name + "." + k] = proj(v.clone().applyMatrix4(C.group.matrixWorld)); }
    out.anchors["bowl.soft"] = proj(V(BOWL_X - 9.5, 6.2, 0)); out.anchors["bowl.hard"] = proj(V(BOWL_X + 9.5, 6.2, 0));
    out.anchors["A.top"] = proj(V(ax(t), 24, 0)); out.anchors["B.top"] = proj(V(bx(t), 24, 0));
    out.B = { temp: tempB(t), status: status(tempB(t), eB, 0, lampB) };
    out.A = { temp: tempA(t), status: status(tempA(t), aEngaged(t), wOn, "cook"), water: wOn };
    return out;
  }
  function debug(t) { const o = render(t); return { t, cam: camera.position.toArray().map((x) => +x.toFixed(1)), anchors: Object.fromEntries(Object.entries(o.anchors).map(([k, v]) => [k, v.map((x) => Math.round(x))])) }; }
  return { render, debug, T };
}
