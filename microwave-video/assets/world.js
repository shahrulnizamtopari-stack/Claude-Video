// "Microwave Tak Masak Dari Dalam" — v3 studio / technical-cutaway look.
// Everything on screen is a pure function of canonical time t (0..60 s). Units: cm, counter top at y = 0, front faces +z.
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "./lib/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "./lib/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./lib/jsm/geometries/RoundedBoxGeometry.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
const pop = (t0, t, d = 0.4) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S0 = (x) => Math.max(0.0001, x);
const P2 = (a) => a.map(([x, y]) => new THREE.Vector2(x, y));

export const PAL = {
  bg: 0xeef1f8, floor: 0xf4f6fa, ink: 0x15171c, shell: 0xf3f4f6, cavity: 0xe3e7ee, panel: 0x262b36, steel: 0xaab0ba,
  copper: 0xc9824a, blue: 0x2f5bff, wave: 0x5f8cff, curry: 0xb8662c, bowl: 0xf7f8fa, glass: 0xdfeaf5, hot: 0xff5a2a,
  oxygen: 0xe5483a, hydrogen: 0xf4f6fa, chicken: 0xe9c79a, crisp: 0xb8692a,
};
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
  const scene = new THREE.Scene(); scene.background = new THREE.Color(PAL.bg); scene.fog = new THREE.Fog(PAL.bg, 220, 700);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 2000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3ec, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.0); key.castShadow = true;
  key.shadow.mapSize.set(scale < 1 ? 1024 : 2048, scale < 1 ? 1024 : 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.05; key.shadow.radius = 6;
  const kc = key.shadow.camera; kc.left = -60; kc.right = 60; kc.top = 60; kc.bottom = -60; kc.near = 1; kc.far = 400;
  scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6); fill.position.set(-80, 40, 60); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(900, 64), mat(PAL.floor, { roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

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

  // ---------- thermal colour map (shared by the lauk cut faces and the plate layer) ----------
  const THERMAL = `vec3 thermal(float u){ u = clamp(u,0.0,1.0);
      vec3 c0 = vec3(0.18,0.33,1.0), c1 = vec3(0.62,0.83,1.0), c2 = vec3(1.0,0.82,0.45), c3 = vec3(1.0,0.29,0.12);
      if (u < 0.35) return mix(c0, c1, u / 0.35); if (u < 0.65) return mix(c1, c2, (u - 0.35) / 0.3); return mix(c2, c3, (u - 0.65) / 0.35); }`;
  // lauk profile (inside the bowl) and its distance field, used to colour the cut face by depth
  const BOWL = [[0.01, 0], [4, 0], [4.3, 0.6], [8, 3], [9.6, 7.6], [9.25, 7.75], [7.6, 3.4], [4, 1.0], [0.01, 1.0]];
  const LAUK = [[0.01, 1.0], [4, 1.0], [7.6, 3.4], [8.95, 7.0], [6.5, 7.9], [3, 8.3], [0.01, 8.4], [0.01, 1.0]];
  const DF = (() => { const NX = 128, NY = 64, X0 = -9.2, X1 = 9.2, Y0 = 0.8, Y1 = 8.6; const data = new Float32Array(NX * NY);
    const poly = [...LAUK.map(([x, y]) => [x, y]), ...LAUK.slice().reverse().map(([x, y]) => [-x, y])];
    const segd = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; const u = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy + 1e-9)); const qx = ax + u * dx - px, qy = ay + u * dy - py; return Math.sqrt(qx * qx + qy * qy); };
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const px = lerp(X0, X1, i / (NX - 1)), py = lerp(Y0, Y1, j / (NY - 1)); let d = 1e9;
      // outer boundary only (skip the axis seam): the two mirrored halves of LAUK minus the x=0 edges
      for (let k = 0; k < LAUK.length - 2; k++) { const [ax, ay] = LAUK[k], [bx, by] = LAUK[k + 1]; d = Math.min(d, segd(Math.abs(px), py, ax, ay, bx, by)); }
      data[j * NX + i] = d; }
    const tex = new THREE.DataTexture(data, NX, NY, THREE.RedFormat, THREE.FloatType); tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
    return { tex, X0, X1, Y0, Y1 }; })();
  const capMat = () => new THREE.ShaderMaterial({
    uniforms: { df: { value: DF.tex }, band: { value: 1.5 }, Th: { value: 80 }, Tc: { value: 12 }, wet: { value: 0 } },
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D df; uniform float band, Th, Tc; varying vec2 vP; ${THERMAL}
      void main(){ vec2 uv = vec2((vP.x - (${DF.X0.toFixed(2)})) / ${(DF.X1 - DF.X0).toFixed(2)}, (vP.y - ${DF.Y0.toFixed(2)}) / ${(DF.Y1 - DF.Y0).toFixed(2)});
        float d = texture2D(df, uv).r; float q = d / max(band, 0.01); float T = Tc + (Th - Tc) * exp(-q * q);
        vec3 c = thermal((T - 10.0) / 80.0); float iso = smoothstep(0.08, 0.0, abs(fract(T / 10.0) - 0.5) - 0.42) * 0.12;
        gl_FragColor = vec4(c * (1.0 - iso), 1.0); }`,
  });
  function makeBowl(pos) {
    const g = new THREE.Group(); g.position.copy(pos); scene.add(g);
    const bowlM = new THREE.MeshPhysicalMaterial({ color: PAL.glass, roughness: 0.08, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    g.add(halfLathe(BOWL, bowlM, mat(0xc7d3e2, { side: THREE.DoubleSide }), false));
    const cap = capMat(); const laukM = mat(PAL.curry, { roughness: 0.5 });
    const lauk = halfLathe(LAUK, laukM, cap, false); g.add(lauk);
    // a few chunks on top so it reads as food
    const r = mulberry32(5); for (let i = 0; i < 9; i++) { const a = Math.PI + r() * Math.PI, rr = 1.5 + r() * 5.5; add(g, new THREE.IcosahedronGeometry(0.9 + r() * 0.7, 1), mat(i % 3 ? 0x9c4f22 : 0xe0a43c, { roughness: 0.6 }), V(Math.cos(a) * rr, 8.0 - rr * 0.08, Math.sin(a) * rr * 0.9 - 0.4), 0); }
    return { g, cap, laukM };
  }

  // ---------- microwave ----------
  const MW = new THREE.Group(); scene.add(MW);
  const clipPlane = new THREE.Plane(V(0, -1, 0), 99); const clip = [clipPlane];
  const shellM = mat(PAL.shell, { roughness: 0.45, side: THREE.DoubleSide, clippingPlanes: clip });
  const cavM = mat(PAL.cavity, { roughness: 0.7, side: THREE.DoubleSide });
  const cavClipM = mat(PAL.cavity, { roughness: 0.7, side: THREE.DoubleSide, clippingPlanes: clip });
  // casing: walls as thin rounded boxes (clipped by the sweep)
  add(MW, new RoundedBoxGeometry(51, 1.2, 37, 2, 0.5), shellM, V(0, 31, 0), 30, clip);              // top
  add(MW, new RoundedBoxGeometry(1.2, 30, 37, 2, 0.5), shellM, V(-25, 16, 0), 30, clip);            // left
  add(MW, new RoundedBoxGeometry(1.2, 30, 37, 2, 0.5), shellM, V(25, 16, 0), 30, clip);             // right
  add(MW, new RoundedBoxGeometry(51, 30, 1.2, 2, 0.5), shellM, V(0, 16, -18), 30, clip);            // back
  add(MW, new RoundedBoxGeometry(51, 1.6, 37, 2, 0.5), mat(PAL.shell, { roughness: 0.45 }), V(0, 1.6, 0), 30); // base (kept)
  for (const [x, z] of [[-22, -15], [22, -15], [-22, 15], [22, 15]]) add(MW, new THREE.CylinderGeometry(1.2, 1.4, 0.9, 16), mat(0x2b2f38), V(x, 0.45, z), 0);
  // door + window (dot mesh) + panel
  { const door = add(MW, new RoundedBoxGeometry(34, 27.5, 1.4, 2, 0.6), mat(0xe9ecf1, { roughness: 0.4, clippingPlanes: clip }), V(-8, 16, 18.4), 30, clip);
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 384; const g = cv.getContext("2d"); g.fillStyle = "#1d222c"; g.fillRect(0, 0, 512, 384);
    g.fillStyle = "#4a5568"; for (let y = 6; y < 384; y += 12) for (let x = 6 + ((y / 12) % 2) * 6; x < 512; x += 12) { g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill(); }
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(26, 19), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.15, metalness: 0.2, clippingPlanes: clip })); win.position.set(-9, 16.5, 19.15); MW.add(win); edges(win, 1, clip);
    const handle = add(MW, new RoundedBoxGeometry(1.4, 20, 1.6, 2, 0.6), mat(0xc9ced6, { metalness: 0.6, roughness: 0.3, clippingPlanes: clip }), V(6.5, 16, 19.8), 30, clip);
    const panel = add(MW, new RoundedBoxGeometry(14, 27.5, 1.2, 2, 0.5), mat(PAL.panel, { roughness: 0.35, clippingPlanes: clip }), V(16.6, 16, 18.3), 30, clip);
    const dc = document.createElement("canvas"); dc.width = 256; dc.height = 96; const d = dc.getContext("2d"); d.fillStyle = "#0e1a12"; d.fillRect(0, 0, 256, 96);
    d.font = "700 64px Inter, sans-serif"; d.fillStyle = "#6dfc9a"; d.textAlign = "center"; d.textBaseline = "middle"; d.fillText("0:00", 128, 52);
    const dtx = new THREE.CanvasTexture(dc); dtx.colorSpace = THREE.SRGBColorSpace;
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 3.6), new THREE.MeshBasicMaterial({ map: dtx, clippingPlanes: clip, toneMapped: false })); disp.position.set(16.6, 25.4, 18.95); MW.add(disp);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) add(MW, new RoundedBoxGeometry(2.6, 1.8, 0.6, 2, 0.3), mat(0x3b4150, { clippingPlanes: clip }), V(13.3 + c * 3.3, 20.5 - r * 2.7, 19.0), 40, clip);
    add(MW, new RoundedBoxGeometry(9.6, 2.6, 0.6, 2, 0.3), mat(PAL.blue, { clippingPlanes: clip }), V(16.6, 7.6, 19.0), 40, clip); }
  // cavity (kept), ceiling clipped
  add(MW, new THREE.BoxGeometry(32, 0.4, 32), cavM, V(-8, 3.0, 0), 30);
  add(MW, new THREE.BoxGeometry(0.4, 25, 32), cavM, V(-24, 15.5, 0), 30);
  add(MW, new THREE.BoxGeometry(0.4, 25, 32), cavM, V(8, 15.5, 0), 30);
  add(MW, new THREE.BoxGeometry(32, 25, 0.4), cavM, V(-8, 15.5, -16), 30);
  add(MW, new THREE.BoxGeometry(32, 0.4, 32), cavClipM, V(-8, 28.0, 0), 30, clip);
  // turntable: glass plate + roller ring + motor
  const TT = new THREE.Group(); TT.position.set(-8, 3.2, 0); MW.add(TT);
  { const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.35, 8, 48), mat(0x8a909c)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.4; TT.add(ring);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 0.5, 64), new THREE.MeshPhysicalMaterial({ color: PAL.glass, roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false })); plate.position.y = 0.95; TT.add(plate); edges(plate, 30);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; add(TT, new THREE.SphereGeometry(0.45, 10, 8), mat(0x2b2f38), V(Math.cos(a) * 12.2, 1.35, Math.sin(a) * 12.2), 0); } }
  add(MW, new THREE.CylinderGeometry(1.4, 1.4, 1.6, 20), mat(0x6c7383), V(-8, 2.0, 0), 30);
  // magnetron (behind the panel) + waveguide into the cavity's right wall
  const MAG = new THREE.Group(); MAG.position.set(16.5, 15, -4); MW.add(MAG);
  { add(MAG, new THREE.BoxGeometry(7, 7, 7), mat(0xb9c0cc, { metalness: 0.5, roughness: 0.35 }), V(0, 0, 0), 30);
    for (let i = 0; i < 7; i++) add(MAG, new THREE.BoxGeometry(9.5, 0.25, 9.5), mat(0xd6dbe3, { metalness: 0.6, roughness: 0.3 }), V(0, -2.8 + i * 0.95, 0), 40);
    add(MAG, new THREE.CylinderGeometry(2.4, 2.4, 1.2, 32), mat(0x55595f, { metalness: 0.3 }), V(0, 4.1, 0), 30);
    add(MAG, new THREE.CylinderGeometry(2.4, 2.4, 1.2, 32), mat(0x55595f, { metalness: 0.3 }), V(0, -4.1, 0), 30);
    add(MAG, new THREE.CylinderGeometry(0.9, 0.9, 2.2, 20), mat(PAL.copper, { metalness: 0.7, roughness: 0.3 }), V(0, 5.6, 0), 30);
    add(MAG, new THREE.SphereGeometry(1.0, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(PAL.copper, { metalness: 0.7, roughness: 0.3 }), V(0, 6.7, 0), 0); }
  const magGlow = glow(0x7fa6ff, 16, 0); magGlow.position.set(16.5, 22, -4); MW.add(magGlow);
  add(MW, new THREE.BoxGeometry(9, 3.6, 7), mat(0xc4cad4, { metalness: 0.5, roughness: 0.35, transparent: true, opacity: 0.55, depthWrite: false }), V(12.7, 23.4, -4), 30); // waveguide
  add(MW, new THREE.BoxGeometry(8, 6, 8), mat(0x4a505c, { roughness: 0.5 }), V(16.5, 6, 8), 30);   // transformer
  { const cg = new THREE.TorusGeometry(2.0, 0.7, 10, 24); add(MW, cg, mat(PAL.copper, { metalness: 0.6, roughness: 0.35 }), V(16.5, 9.4, 8), 0).rotation.x = Math.PI / 2; }
  const OUTLET = V(8, 23.4, -4);
  const sweepRing = new THREE.Mesh(new THREE.BoxGeometry(52, 0.3, 38), new THREE.MeshBasicMaterial({ color: 0x8fb0ff, toneMapped: false, transparent: true, opacity: 0, wireframe: true })); MW.add(sweepRing);

  // bowls: one outside (hook + loop), one inside on the turntable
  const bowlOut = makeBowl(V(-6, 0, 36));
  const bowlIn = makeBowl(V(0, 1.45, 0)); TT.add(bowlIn.g);

  // plate heat layer (hot/cold spots, fixed to the cavity; layer turns with the plate)
  const spotM = new THREE.ShaderMaterial({
    uniforms: { amt: { value: 0 }, even: { value: 0 }, c: { value: new THREE.Vector2(-8, 0) } }, transparent: true,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float amt, even; uniform vec2 c; varying vec3 vW; ${THERMAL}
      void main(){ vec2 p = vW.xz - c; float s = abs(sin(3.14159*p.x/6.0) * sin(3.14159*p.y/6.0)); s = pow(s, 1.6);
        float T = 15.0 + amt * mix(70.0 * s, 40.0, even); gl_FragColor = vec4(thermal((T - 10.0)/80.0), 1.0); }`,
  });
  const layer = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 0.5, 72), spotM); layer.position.y = 1.45; TT.add(layer); edges(layer, 30);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; add(layer, new RoundedBoxGeometry(2.2, 0.6, 2.2, 2, 0.2), mat(0x3b4150), V(Math.cos(a) * 10.2, 0.4, Math.sin(a) * 10.2), 40); }
  const ruler = new THREE.Group(); MW.add(ruler); ruler.position.set(-8, 5.3, 3);
  { const rm = new THREE.MeshBasicMaterial({ color: PAL.ink }); const bar = new THREE.Mesh(new THREE.BoxGeometry(6, 0.18, 0.18), rm); ruler.add(bar);
    for (const x of [-3, 3]) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.4), rm); tk.position.x = x; ruler.add(tk); } }

  // ---------- waves: dots running along sine rays from the waveguide outlet ----------
  const NWD = 900;
  const waveDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0x86a8ff, toneMapped: false }), NWD); waveDots.frustumCulled = false; scene.add(waveDots);
  const RAYS = [V(-8, 13, 0), V(-14, 12, -2), V(-3, 12, 2), V(-20, 20, -10), V(-22, 8, 10), V(-10, 4.5, -12), V(-16, 26, 8), V(-6, 26, -12)];
  // ---------- water molecules (close-up inside the lauk's cut face) ----------
  const MOL = new THREE.Group(); bowlIn.g.add(MOL); MOL.position.set(-3, 4.0, 0.45);
  const mols = [];
  { const oM = mat(PAL.oxygen, { roughness: 0.35, emissive: PAL.hot, emissiveIntensity: 0 }), hM = mat(PAL.hydrogen, { roughness: 0.35 });
    const r = mulberry32(21);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) {
      const m = new THREE.Group(); m.position.set((i - 2.5) * 0.62 + (r() - 0.5) * 0.15, (j - 1.5) * 0.62 + (r() - 0.5) * 0.15, (r() - 0.5) * 0.2);
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), oM); m.add(o); edges(o, 60);
      for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), hM); h.position.set(s * 0.19, -0.15, 0); m.add(h); edges(h, 60); }
      MOL.add(m); mols.push({ m, ph: r() * 6.28, sp: 0.7 + r() * 0.6, base: m.position.clone() }); }
    MOL.userData.oM = oM; }
  const field = new THREE.Group(); MOL.add(field); field.position.set(0, 1.35, 0.2);
  { const fm = new THREE.MeshBasicMaterial({ color: PAL.blue, toneMapped: false });
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 10), fm); sh.rotation.z = Math.PI / 2; field.add(sh);
    const hd = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 14), fm); hd.rotation.z = -Math.PI / 2; hd.position.x = 1.45; field.add(hd); }

  // ---------- comparison stage: oven (left) vs microwave (right) ----------
  const STAGE_X = 110;
  const stage = new THREE.Group(); stage.position.set(STAGE_X, 0, 0); scene.add(stage);
  function chamber(x, dark) {
    const g = new THREE.Group(); g.position.x = x; stage.add(g);
    const m = mat(dark ? 0x3a3f4a : PAL.cavity, { roughness: 0.6, side: THREE.DoubleSide });
    add(g, new THREE.BoxGeometry(20, 0.5, 16), m, V(0, 0.25, 0), 30); add(g, new THREE.BoxGeometry(20, 0.5, 16), m, V(0, 17.75, 0), 30);
    add(g, new THREE.BoxGeometry(0.5, 18, 16), m, V(-10, 9, 0), 30); add(g, new THREE.BoxGeometry(0.5, 18, 16), m, V(10, 9, 0), 30); add(g, new THREE.BoxGeometry(20, 18, 0.5), m, V(0, 9, -8), 30);
    return g; }
  const ovenC = chamber(-12, true), mwC = chamber(12, false);
  const elemM = mat(0x5a2a20, { emissive: 0xff3a10, emissiveIntensity: 0, roughness: 0.5 });
  for (const y of [2.0, 16.0]) { const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push(V(-8 + 16 * u, y, -5 + 10 * (0.5 + 0.5 * Math.sin(u * Math.PI * 6)))); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.3, 8), elemM); ovenC.add(tube); }
  const ovenGlow = glow(0xff6a2a, 34, 0); ovenGlow.position.set(0, 9, 0); ovenC.add(ovenGlow);
  // drumsticks: crispy (noisy) base with a smooth, sagging morph target for "lembik"
  function drumstick() {
    const prof = [[0.01, 0], [1.0, 0.1], [1.1, 0.8], [0.6, 1.4], [0.6, 4.0], [1.6, 5.0], [3.0, 7.0], [3.5, 9.5], [3.2, 12.0], [2.2, 13.6], [0.01, 14.0]];
    const geo = new THREE.LatheGeometry(P2(prof), 48); geo.computeVertexNormals();
    const pos = geo.attributes.position; const soft = new Float32Array(pos.count * 3); const r = mulberry32(77);
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      soft[i * 3] = x * 1.06; soft[i * 3 + 1] = y; soft[i * 3 + 2] = z * 1.06 - (y > 4.5 ? 0.6 * Math.sin(Math.PI * clamp((y - 4.5) / 9.5)) : 0);
      if (y > 4.5 && y < 13.8) { const k = 1 + (r() - 0.5) * 0.12 + 0.05 * Math.sin(y * 7 + Math.atan2(z, x) * 9); pos.setXYZ(i, x * k, y, z * k); } }
    geo.morphAttributes.position = [new THREE.Float32BufferAttribute(soft, 3)]; geo.computeVertexNormals();
    const meatM = mat(PAL.chicken, { roughness: 0.75 });
    const m = new THREE.Mesh(geo, meatM); m.castShadow = true; m.rotation.z = Math.PI / 2; m.position.set(7, 3.4, 0); m.morphTargetInfluences = [0];
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4.5, 12), mat(0xf1ead8)); bone.rotation.z = Math.PI / 2; bone.position.set(6.2, 3.4, 0);
    const g = new THREE.Group(); g.add(m); g.add(bone); edges(bone, 40); return { g, m, meatM }; }
  const dOven = drumstick(); ovenC.add(dOven.g); dOven.g.position.set(0, 0.5, 0);
  const dMw = drumstick(); mwC.add(dMw.g); dMw.g.position.set(0, 0.5, 0);
  { const plate = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.4, 48), new THREE.MeshPhysicalMaterial({ color: PAL.glass, roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false })); plate.position.y = 0.7; mwC.add(plate); edges(plate, 30);
    const tray = add(ovenC, new THREE.BoxGeometry(17, 0.3, 12), mat(0x22252c, { metalness: 0.6, roughness: 0.4 }), V(0, 0.7, 0), 30); }
  const NP = 220;
  const parts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.85 }), NP);
  parts.frustumCulled = false; parts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NP * 3), 3); scene.add(parts);

  // ---------- post ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  if (FX.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.3, 0.35, 1.6));
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- story (canonical time) ----------
  const T = { salah: 3.1, cutA: 7.5, cutB: 9.2, cook: 10.6, molIn: 15.1, mol: 16.9, crash: 21.4, pen: 25.4, spots: 34.0, spin: 37.7, stage: 40.6, brown0: 43.8, brown1: 45.8, stick: 49.5, soggy: 57.8, back: 58.3, restore: 41.5 };
  const dummy = new THREE.Object3D(); const col = new THREE.Color();
  const hide = (im, i) => { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); };
  const surfT = (t) => (t < T.cook ? 12 : lerp(12, 85, ss(T.cook, 24, t)));
  const centreT = (t) => (t < T.cook || t >= T.restore ? 12 : lerp(12, 15, ss(26, 33, t)));
  const bandIn = (t) => (t < T.cook ? 0.2 : t < 24 ? lerp(0.3, 1.1, ss(T.cook, 24, t)) : t < 26.5 ? lerp(1.1, 2.6, ss(24, 26.5, t)) : lerp(2.6, 3.3, ss(26.5, 32.5, t)));
  const molT = (t) => lerp(12, 70, ss(T.mol, 23.5, t));
  const ovenSurf = (t) => lerp(25, 165, ss(T.stage, 46.5, t));
  const mwSurf = (t) => (t < T.stage ? 25 : lerp(25, 100, ss(T.stage, 46.5, t)));

  // ---------- camera ----------
  const MOLW = V(-11, 7.6, 0.45);
  const K0 = { pos: V(6, 34, 142), look: V(0, 11, 18), fov: 40 };
  const keys = [
    { t: 0, ...K0 },
    { t: 6.4, pos: V(4, 31, 132), look: V(0, 11, 18), fov: 40 },
    { t: 8.0, pos: V(8, 30, 132), look: V(0, 15, 0), fov: 40 },
    { t: 10.0, pos: V(34, 26, 44), look: V(13, 18, -3), fov: 40 },
    { t: 13.2, pos: V(12, 26, 66), look: V(-5, 14, 0), fov: 40 },
    { t: 15.6, pos: V(-9, 13, 28), look: V(-10, 8, 0), fov: 40 },
    { t: 17.2, pos: MOLW.clone().add(V(0.4, 0.3, 8.2)), look: MOLW.clone().add(V(0, 0.4, 0)), fov: 40 },
    { t: 23.4, pos: MOLW.clone().add(V(-0.4, 0.5, 7.6)), look: MOLW.clone().add(V(0, 0.4, 0)), fov: 40 },
    { t: 25.0, pos: V(-7, 12, 40), look: V(-8, 7.5, 0), fov: 40 },
    { t: 32.8, pos: V(-9, 11.5, 37), look: V(-8, 7.5, 0), fov: 40 },
    { t: 34.4, pos: V(-8, 66, 16), look: V(-8, 4, 0), fov: 40 },
    { t: 39.8, pos: V(-6, 62, 22), look: V(-8, 4, 0), fov: 40 },
    { t: 41.6, pos: V(STAGE_X, 24, 128), look: V(STAGE_X, 9, 0), fov: 40 },
    { t: 51.0, pos: V(STAGE_X, 22, 120), look: V(STAGE_X, 9, 0), fov: 40 },
    { t: 55.4, pos: V(STAGE_X + 14, 14, 42), look: V(STAGE_X + 12, 5, 0), fov: 40 },
    { t: 58.2, pos: V(STAGE_X + 13, 13, 39), look: V(STAGE_X + 12, 5, 0), fov: 40 },
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
    // cut sweep (front/top of the casing) and restore once the camera has left
    const cutting = t >= T.cutA && t < T.restore;
    const h = cutting ? lerp(33, 2.6, ss(T.cutA, T.cutB, t)) : 99; clipPlane.constant = h;
    sweepRing.position.y = h; sweepRing.material.opacity = cutting && h > 2.8 && h < 32.5 ? 0.9 : 0;
    // bowls
    bowlOut.g.visible = t < 9.5 || t >= 57.5;
    Object.assign(bowlOut.cap.uniforms, {}); bowlOut.cap.uniforms.band.value = 1.6; bowlOut.cap.uniforms.Th.value = 82; bowlOut.cap.uniforms.Tc.value = 12;
    const inOn = t >= 9 && t < 33.6;
    bowlIn.g.visible = inOn; bowlIn.cap.uniforms.band.value = bandIn(t); bowlIn.cap.uniforms.Th.value = surfT(t); bowlIn.cap.uniforms.Tc.value = centreT(t);
    // turntable spin (only while showing the hot/cold spots)
    TT.rotation.y = ss(T.spin, 39.6, t) * Math.PI * 1.2;
    layer.visible = t >= 33.4 && t < 41;
    spotM.uniforms.amt.value = ss(T.spots, 35.4, t); spotM.uniforms.even.value = ss(T.spin + 0.3, 39.6, t);
    ruler.visible = t >= 36.2 && t < 40; ruler.scale.setScalar(S0(pop(36.2, t, 0.35)));
    // magnetron glow while cooking
    const cooking = t >= T.cook && t < 33.6 ? 1 : 0;
    magGlow.material.opacity = 0.7 * cooking * (0.85 + 0.15 * Math.sin(t * 40));
    // molecules: twist with the flipping field, then jostle and heat up
    MOL.visible = t > 14.8 && t < 24.4;
    const fieldDir = Math.sin(t * 2 * Math.PI * 1.1);
    field.scale.x = S0(Math.abs(fieldDir) > 0.02 ? Math.sign(fieldDir) : 1) * (0.4 + 0.6 * Math.abs(fieldDir)); field.visible = t > T.mol - 0.3;
    const jostle = ss(T.crash - 0.6, T.crash + 0.6, t);
    for (const M of mols) { const a = 0.9 * Math.sin(t * 2 * Math.PI * 1.1 + M.ph * 0.25) * ss(T.mol - 0.4, T.mol + 0.2, t);
      M.m.rotation.z = a + jostle * 0.6 * Math.sin(t * 13 * M.sp + M.ph);
      M.m.position.set(M.base.x + jostle * 0.12 * Math.sin(t * 17 * M.sp + M.ph), M.base.y + jostle * 0.12 * Math.cos(t * 15 * M.sp + M.ph * 2), M.base.z); }
    MOL.userData.oM.emissiveIntensity = 1.2 * ss(T.crash, 23.5, t);
    // waves (dots), inside the microwave while cooking + inside the stage's microwave chamber
    let q = 0;
    if (cooking && t < 25.2) { const amp = 0.9;
      RAYS.forEach((end, ri) => { const dir = end.clone().sub(OUTLET); const L = dir.length(); dir.normalize(); const side = V(0, 1, 0).cross(dir).normalize(); if (side.lengthSq() < 0.1) side.set(0, 0, 1);
        const n = Math.floor(L / 0.7); for (let i = 0; i < n && q < NWD; i++) { const u = ((i / n) + t * 0.35) % 1; const p = OUTLET.clone().add(dir.clone().multiplyScalar(u * L)).add(side.clone().multiplyScalar(amp * Math.sin(u * L * 0.9 - t * 9 + ri)));
          dummy.position.copy(p); dummy.scale.setScalar(S0(ss(T.cook, T.cook + 0.6, t) * Math.sin(Math.PI * u) * 1.1)); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); waveDots.setMatrixAt(q++, dummy.matrix); } }); }
    // penetration: waves fall onto the lauk and die out within the hot band
    if (t > 24.0 && t < 33.4) { const bw = wp(bowlIn.g, V(0, 0, 0)); const on = ss(24, 24.6, t) * (1 - ss(33, 33.4, t));
      for (let k = 0; k < 9; k++) { const x = -7.2 + k * 1.8; const top = 8.2 - Math.abs(x) * 0.12;
        for (let i = 0; i < 22 && q < NWD; i++) { const u = ((i / 22) + t * 0.45 + k * 0.13) % 1; const y = top + 7 - u * (7 + bandIn(t));
          const depthFade = y < top ? clamp(1 - (top - y) / bandIn(t)) : 1;
          dummy.position.set(bw.x + x + 0.35 * Math.sin(u * 30 - t * 8 + k), bw.y + y, bw.z + 0.5); dummy.scale.setScalar(S0(on * depthFade * 0.9)); dummy.updateMatrix(); waveDots.setMatrixAt(q++, dummy.matrix); } } }
    if (t > T.stage && t < 59) { const c0 = V(STAGE_X + 12, 0, 0); const on = ss(T.stage, T.stage + 0.6, t) * (1 - ss(58.6, 59, t));
      for (let k = 0; k < 7; k++) for (let i = 0; i < 20 && q < NWD; i++) { const u = ((i / 20) + t * 0.5 + k * 0.17) % 1;
        dummy.position.set(c0.x - 7 + k * 2.3 + 0.35 * Math.sin(u * 28 - t * 8 + k), 16.5 - u * 11, c0.z + 2 + (k % 3) - 1); dummy.scale.setScalar(S0(on * Math.sin(Math.PI * u) * 0.8)); dummy.updateMatrix(); waveDots.setMatrixAt(q++, dummy.matrix); } }
    for (; q < NWD; q++) hide(waveDots, q);
    waveDots.instanceMatrix.needsUpdate = true;
    // stage: oven browning vs microwave steam; soggy at the end
    stage.visible = t > 39.5 && t < 59.6;
    elemM.emissiveIntensity = 2.4 * ss(T.stage, T.stage + 1, t) * (0.9 + 0.1 * Math.sin(t * 7)); ovenGlow.material.opacity = 0.55 * ss(T.stage, T.stage + 1, t);
    const br = ss(T.brown0, T.brown1, t);
    dOven.meatM.color.set(PAL.chicken).lerp(new THREE.Color(PAL.crisp), br); dOven.meatM.roughness = lerp(0.75, 0.9, br);
    const sg = ss(T.soggy, T.soggy + 0.5, t);
    const fried = ss(55.0, 55.8, t); // "ayam goreng semalam": golden first, then soggy and oily
    dMw.meatM.color.set(0xe2c49a).lerp(new THREE.Color(0xc4802f), fried).lerp(new THREE.Color(0x9a5a22), sg); dMw.meatM.roughness = lerp(0.45, 0.18, sg); dMw.m.morphTargetInfluences[0] = sg;
    // particles: hot-air swirl (oven) + steam (microwave)
    let pq = 0; const r2 = mulberry32(9);
    if (stage.visible && t > T.stage) { const on = ss(T.stage, T.stage + 1, t);
      for (let i = 0; i < 90; i++) { const ph = r2(); const a = (t * 1.3 + ph) * Math.PI * 2; const rr = 5 + r2() * 2.5;
        dummy.position.set(STAGE_X - 12 + Math.cos(a) * rr, 9 + Math.sin(a) * rr * 0.75, (r2() - 0.5) * 8); dummy.scale.setScalar(S0(on * 0.7)); dummy.updateMatrix(); parts.setMatrixAt(pq, dummy.matrix); col.setHex(0xff8a4a).multiplyScalar(1.6); parts.setColorAt(pq++, col); }
      const st = ss(44, 46, t);
      for (let i = 0; i < 70; i++) { const ph = r2(); const u = (t * 0.35 + ph) % 1;
        dummy.position.set(STAGE_X + 12 + 4 - r2() * 9 + Math.sin(u * 9 + i) * 0.6, 5 + u * 10, (r2() - 0.5) * 4); dummy.scale.setScalar(S0(st * (0.5 + u * 1.6) * (1 - u))); dummy.updateMatrix(); parts.setMatrixAt(pq, dummy.matrix); col.setHex(0xffffff); parts.setColorAt(pq++, col); } }
    for (; pq < NP; pq++) hide(parts, pq);
    parts.instanceMatrix.needsUpdate = true; parts.instanceColor.needsUpdate = true;
    // camera
    const cam = camAt(t); camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, -H * 0.07, W, H); camera.updateProjectionMatrix();
    const focus = cam.L.clone(); key.position.set(focus.x + 40, focus.y + 80, focus.z + 60); key.target.position.copy(focus);
    composer.render();
    const out = { t, anchors: {} };
    out.anchors["out.centre"] = proj(wp(bowlOut.g, V(0, 4.5, 0.1))); out.anchors["out.edge"] = proj(wp(bowlOut.g, V(-7.6, 6.2, 0.1)));
    out.anchors["mag"] = proj(V(16.5, 18, -0.5)); out.anchors["outlet"] = proj(V(4, 23.4, -2));
    out.anchors["mol"] = proj(wp(MOL, V(1.55, 0.31, 0.2)));
    out.anchors["band"] = proj(wp(bowlIn.g, V(5.2, 7.2, 0.2))); out.anchors["in.centre"] = proj(wp(bowlIn.g, V(0, 4.2, 0.2)));
    out.anchors["spot"] = proj(V(-5, 5.4, 3)); out.anchors["plate"] = proj(V(-8 + 12.5, 4.4, 4));
    out.anchors["oven.el"] = proj(V(STAGE_X - 12 + 6, 16, 2)); out.anchors["oven.d"] = proj(V(STAGE_X - 12 + 3, 6.6, 1.5)); out.anchors["mw.d"] = proj(V(STAGE_X + 12 + 3, 6.6, 1.5));
    out.anchors["oven.top"] = proj(V(STAGE_X - 12, 19, 0)); out.anchors["mw.top"] = proj(V(STAGE_X + 12, 19, 0));
    out.temps = { surf: surfT(t), centre: centreT(t), mol: molT(t), oven: ovenSurf(t), mw: mwSurf(t) };
    return out;
  }
  function debug(t) { const o = render(t); return { t, cam: camera.position.toArray().map((x) => +x.toFixed(1)), anchors: Object.fromEntries(Object.entries(o.anchors).map(([k, v]) => [k, v.map((x) => Math.round(x))])) }; }
  return { render, debug, T };
}
