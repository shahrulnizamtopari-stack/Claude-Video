// "Bom Bawah Kaki Kau" — v4 cinematic look, volcano edition (black-red night, glowing magma, bloom, vignette).
// Everything is a pure function of canonical time t (0..60 s); periodic motion uses periods that divide 60 (loop).
// Stages: volcano exterior (origin), Earth + apple (x=300), volcano cut-away (x=600), soda bottle (x=900),
// runny vs sticky vent (x=1200), Krakatau map (x=1500).
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
const P2 = (a) => a.map(([x, y]) => new THREE.Vector2(x, y));

export function createWorld(canvas, W, H, scale = 1, opts = {}) {
  const FX = { bloom: opts.bloom ?? true, msaa: opts.msaa ?? (scale < 1 ? 0 : 4) };
  const realRandom = Math.random; Math.random = mulberry32(1234);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const RW = Math.round(W * scale), RH = Math.round(H * scale);
  renderer.setSize(RW, RH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  const BG = 0x0c0504;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(BG); scene.fog = new THREE.Fog(BG, 80, 420);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.25;
  const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 3000);
  const hemi = new THREE.HemisphereLight(0x6a3a2a, 0x0a0303, 0.7); scene.add(hemi);
  const lavaLight = new THREE.PointLight(0xff5a1a, 900, 160, 1.6); lavaLight.position.set(0, 44, 0); scene.add(lavaLight);
  const rim = new THREE.DirectionalLight(0x8aa0ff, 0.6); rim.position.set(-60, 40, -80); scene.add(rim);
  const key = new THREE.DirectionalLight(0xffb07a, 0.8); key.position.set(40, 60, 60); scene.add(key);
  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  { const g = gcv.getContext("2d"); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.25, "rgba(255,255,255,0.5)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); }
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, size, op = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, opacity: op, depthWrite: false, fog: false })); s.scale.set(size, size, 1); return s; };
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
  const lavaMat = (o = {}) => new THREE.MeshBasicMaterial({ color: 0xff6a1a, toneMapped: false, ...o });

  // shared noise for lava/mantle shaders
  const NOISE = `float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float nn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hh(i), hh(i+vec2(1,0)), f.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * nn(p); p *= 2.03; a *= 0.5; } return s; }
    vec3 lavaCol(float k){ k = clamp(k, 0.0, 1.0); return mix(mix(vec3(0.25,0.02,0.0), vec3(1.0,0.28,0.02), smoothstep(0.0,0.5,k)), vec3(1.0,0.85,0.35), smoothstep(0.55,1.0,k)); }`;
  const flowMat = (speed = 0.25, scale = 0.2, boost = 2.2) => new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, amt: { value: 1 } }, transparent: false, fog: false,
    vertexShader: `varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float time, amt; varying vec3 vW; varying vec2 vUv; ${NOISE}
      void main(){ vec2 p = vec2(vUv.x * 3.0, vUv.y * 6.0 - time * ${speed.toFixed(2)} * 6.0); float k = fbm(p * ${(scale * 10).toFixed(2)}) ; k = smoothstep(0.25, 0.85, k);
        vec3 c = lavaCol(k * amt) * ${boost.toFixed(2)}; gl_FragColor = vec4(c, 1.0); }` });

  // ---------- volcano exterior (origin) ----------
  const EXT = new THREE.Group(); scene.add(EXT);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(260, 64).rotateX(-Math.PI / 2), mat(0x1a0e0a, { roughness: 1 })); EXT.add(ground);
  function volcanoGeo(h = 40, r = 70, crater = 7, seed = 3) { const g = new THREE.ConeGeometry(r, h, 48, 18, true); const p = g.attributes.position; const rr = mulberry32(seed);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = (y + h / 2) / h; const a = Math.atan2(z, x); const rad = Math.hypot(x, z);
      const shape = rad * (1 + 0.08 * Math.sin(a * 5 + seed) + 0.05 * Math.sin(a * 13)) ; const nr = lerp(shape, crater + 2 * Math.sin(a * 3), Math.pow(k, 3) * 0.0) + 0;
      const rad2 = Math.max(crater * k, rad) ; const s = rad > 0.001 ? (nr / rad) : 1; p.setX(i, x * s * (k > 0.96 ? 1 : 1)); p.setZ(i, z * s); p.setY(i, y + h / 2 - (k > 0.97 ? 2.5 : 0) + (rr() - 0.5) * 0.8 * (1 - k)); }
    g.computeVertexNormals(); return g; }
  const cone = new THREE.Mesh(volcanoGeo(), mat(0x2a1812, { flatShading: true, roughness: 0.95 })); EXT.add(cone);
  // crater rim cut: top cap ring
  const crater = new THREE.Mesh(new THREE.CircleGeometry(4.2, 24).rotateX(-Math.PI / 2), lavaMat({ color: 0xffb040 })); crater.position.y = 37.6; EXT.add(crater);
  const craterGlow = glow(0xff6a20, 60, 0.9); craterGlow.position.set(0, 40, 0); EXT.add(craterGlow);
  // lava rivers down the slopes (flow shader on thin ribbons)
  const rivers = []; { const rr = mulberry32(19); for (let k = 0; k < 4; k++) { const a = -0.9 + k * 0.6 + rr() * 0.2; const pts = [];
      for (let i = 0; i <= 24; i++) { const u = i / 24; const r = 4 + u * 66; const y = 37.5 * (1 - u) - 0.3; const aa = a + Math.sin(u * 6 + k) * 0.08; pts.push(V(Math.cos(aa) * r, y + 0.6, Math.sin(aa) * r)); }
      const curve = new THREE.CatmullRomCurve3(pts); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.9 + rr() * 0.5, 6, false), flowMat(0.2, 0.25, 2.0)); tube.scale.y = 1; EXT.add(tube); rivers.push(tube); } }
  // fertile fields (south side, z+): instanced rice clumps that grow green near the end
  const NF = 900; const field = new THREE.InstancedMesh(new THREE.ConeGeometry(0.35, 1.6, 4), mat(0x5fae3e, { roughness: 0.7, emissive: 0x1a3a0a, emissiveIntensity: 0.4 }), NF); field.frustumCulled = false; EXT.add(field);
  const FIELD = []; { const rr = mulberry32(41); for (let i = 0; i < NF; i++) { const x = (rr() - 0.5) * 120, z = 82 + rr() * 70; FIELD.push([x, z, rr()]); } }
  const fieldGround = new THREE.Mesh(new THREE.PlaneGeometry(130, 80).rotateX(-Math.PI / 2), mat(0x3b2a1a, { roughness: 1 })); fieldGround.position.set(0, 0.05, 117); EXT.add(fieldGround);

  // ---------- Earth + apple (x = 300) ----------
  const EA = new THREE.Group(); EA.position.set(300, 0, 0); scene.add(EA);
  const mantleMat = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 } }, side: THREE.DoubleSide, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float time; varying vec3 vP; ${NOISE}
      void main(){ float r = length(vP) / 10.0; vec2 q = vec2(atan(vP.y, vP.x) * 2.0, r * 6.0); float k = fbm(q * 1.4 + vec2(time * 0.08, -time * 0.05));
        vec3 c; if (r < 0.2) c = vec3(1.0, 0.92, 0.7) * 1.3; else if (r < 0.55) c = mix(vec3(1.0,0.75,0.25), vec3(0.95,0.45,0.1), (r - 0.2) / 0.35) * 1.05;
        else c = lavaCol(0.25 + 0.45 * k * (1.0 - (r - 0.55) / 0.45)) * 0.9;
        gl_FragColor = vec4(c, 1.0); }` });
  const earthG = new THREE.Group(); earthG.position.set(0, -9, 0); EA.add(earthG);
  { const shell = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 48, Math.PI, Math.PI), mat(0x2f6fd0, { roughness: 0.6, emissive: 0x0a2a5a, emissiveIntensity: 0.5, side: THREE.DoubleSide })); earthG.add(shell);
    const land = new THREE.Mesh(new THREE.SphereGeometry(10.04, 48, 32, Math.PI * 1.15, 0.6, 0.7, 0.7), mat(0x4f9a4a)); earthG.add(land);
    const land2 = new THREE.Mesh(new THREE.SphereGeometry(10.04, 48, 32, Math.PI * 1.6, 0.5, 1.5, 0.6), mat(0x4f9a4a)); earthG.add(land2);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(9.9, 96), mantleMat); disc.position.z = 0.01; earthG.add(disc);
    const crust = new THREE.Mesh(new THREE.RingGeometry(9.86, 10.06, 96), new THREE.MeshBasicMaterial({ color: 0x9a7a52, side: THREE.DoubleSide })); crust.position.z = 0.02; earthG.add(crust); }
  const appleG = new THREE.Group(); appleG.position.set(0, 11.5, 0); EA.add(appleG);
  { const prof = []; for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + (i / 24) * Math.PI; const r = 5 * Math.cos(a) * (1 + 0.12 * Math.sin(a * 2)); prof.push([Math.max(0.01, r), 4.6 * Math.sin(a)]); }
    const skin = new THREE.Mesh(new THREE.LatheGeometry(P2(prof), 48, Math.PI / 2, Math.PI), new THREE.MeshPhysicalMaterial({ color: 0xd01a1a, roughness: 0.3, clearcoat: 0.8, side: THREE.DoubleSide })); appleG.add(skin);
    const face = [...prof.map(([x, y]) => [x * 0.965, y * 0.965]), ...prof.slice().reverse().map(([x, y]) => [-x * 0.965, y * 0.965])];
    const flesh = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(P2(face))), mat(0xfff2c8, { roughness: 0.7, side: THREE.DoubleSide })); flesh.position.z = 0.01; appleG.add(flesh);
    const skinRim = new THREE.Mesh(new THREE.ShapeGeometry((() => { const sh = new THREE.Shape(P2([...prof, ...prof.slice().reverse().map(([x, y]) => [-x, y])])); sh.holes.push(new THREE.Path(P2(face))); return sh; })()), new THREE.MeshBasicMaterial({ color: 0xb01010, side: THREE.DoubleSide })); skinRim.position.z = 0.015; appleG.add(skinRim);
    for (const sx of [-1, 1]) { const seed = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), mat(0x3a2210)); seed.scale.set(0.6, 1, 0.4); seed.position.set(sx * 0.8, 0.2, 0.05); appleG.add(seed); }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 2, 8), mat(0x5a3a1a)); stem.position.set(0, 5.2, -0.3); appleG.add(stem); }

  // ---------- volcano cut-away (x = 600): back half + strata cut face, chamber, conduit ----------
  const CUT = new THREE.Group(); CUT.position.set(600, 0, 0); scene.add(CUT);
  const PROF = [[0.01, -34], [72, -34], [72, 0], [70, 0], [52, 8], [34, 18], [18, 28], [8, 36], [4.5, 37.5], [0.01, 37.5]];
  CUT.add(new THREE.Mesh(new THREE.LatheGeometry(P2(PROF), 48, Math.PI / 2, Math.PI), mat(0x2a1812, { flatShading: true })));
  const strata = new THREE.ShaderMaterial({ side: THREE.DoubleSide, fog: false, uniforms: { heat: { value: 0 } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float heat; varying vec2 vP; ${NOISE}
      void main(){ float b = fbm(vec2(vP.x * 0.05, vP.y * 0.35)); vec3 c = mix(vec3(0.16,0.08,0.05), vec3(0.32,0.18,0.10), b);
        c = mix(c, vec3(0.09,0.05,0.04), step(0.5, fract(vP.y * 0.12 + b * 0.6)) * 0.5);
        float depth = clamp(-vP.y / 34.0, 0.0, 1.0); c += vec3(0.6, 0.12, 0.0) * depth * depth * (0.4 + heat);
        gl_FragColor = vec4(c, 1.0); }` });
  for (const sx of [1, -1]) { const g = new THREE.ShapeGeometry(new THREE.Shape(P2(PROF))); g.scale(sx, 1, 1); const m = new THREE.Mesh(g, strata); m.position.z = 0.01; CUT.add(m); }
  const chamberMat = flowMat(0.06, 0.18, 2.4);
  const chamber = new THREE.Mesh(new THREE.CircleGeometry(1, 64), chamberMat); chamber.scale.set(16, 6.5, 1); chamber.position.set(0, -16, 0.05); CUT.add(chamber);
  const conduitMat = flowMat(0.35, 0.22, 2.4);
  const conduit = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 46), conduitMat); conduit.position.set(0, 14.5, 0.06); CUT.add(conduit);
  const cracks = []; { const rr = mulberry32(23); for (let k = 0; k < 3; k++) { const pts = []; let x = (k - 1) * 18, y = -34; for (let i = 0; i < 8; i++) { pts.push(V(x, y, 0.07)); x += (rr() - 0.5) * 4 - x * 0.12; y += 2.6; }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.55, 5), lavaMat({ color: 0xff4a10 })); CUT.add(m); cracks.push({ m, curve: new THREE.CatmullRomCurve3(pts) }); } }
  const cutGlow = glow(0xff5a1a, 90, 0.6); cutGlow.position.set(0, -16, 2); CUT.add(cutGlow);

  // ---------- soda bottle (x = 900) ----------
  const SODA = new THREE.Group(); SODA.position.set(900, 0, 0); scene.add(SODA);
  const BOT = new THREE.Group(); SODA.add(BOT);
  { const prof = [[0.01, 0], [2.6, 0], [2.9, 0.6], [2.9, 8], [2.4, 9.6], [1.0, 12.2], [0.9, 13.6], [0.01, 13.6]];
    const glass = new THREE.Mesh(new THREE.LatheGeometry(P2(prof), 48), new THREE.MeshPhysicalMaterial({ color: 0x7ad08a, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.5, thickness: 0.5, depthWrite: false, side: THREE.DoubleSide })); BOT.add(glass);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 7.5, 40), new THREE.MeshPhysicalMaterial({ color: 0x5a2a10, roughness: 0.1, clearcoat: 1, emissive: 0x2a0a00, emissiveIntensity: 0.4 })); liq.position.y = 4.0; BOT.add(liq);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.8, 24), new THREE.MeshPhysicalMaterial({ color: 0xd8262a, metalness: 0.6, roughness: 0.3 })); cap.position.y = 14.0; BOT.add(cap); BOT.userData.cap = cap; }
  BOT.position.y = -6;

  // ---------- runny vs sticky vent (x = 1200) ----------
  const VENT = new THREE.Group(); VENT.position.set(1200, 0, 0); scene.add(VENT);
  VENT.add(new THREE.Mesh(new THREE.CircleGeometry(80, 48).rotateX(-Math.PI / 2), mat(0x1a0e0a, { roughness: 1 })));
  const shield = new THREE.Mesh(volcanoGeo(9, 34, 3, 7), mat(0x2a1812, { flatShading: true })); VENT.add(shield);
  const runny = []; for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.3; const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16; const r = 2 + u * 30; pts.push(V(Math.cos(a + Math.sin(u * 4 + k) * 0.1) * r, 8.4 * (1 - u) + 0.4, Math.sin(a + Math.sin(u * 4 + k) * 0.1) * r)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 1.1, 6), flowMat(0.15, 0.2, 2.0)); VENT.add(m); runny.push(m); }
  const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(5.5, 2), new THREE.MeshStandardMaterial({ color: 0x2a1610, roughness: 0.9, flatShading: true, emissive: 0xff3a00, emissiveIntensity: 0 })); dome.scale.y = 0.6; dome.position.y = 8.0; VENT.add(dome);
  const domeGlow = glow(0xff4a10, 14, 0); domeGlow.position.set(0, 10, 4); VENT.add(domeGlow);

  // ---------- Krakatau map (x = 1500) ----------
  const MAP = new THREE.Group(); MAP.position.set(1500, 0, 0); scene.add(MAP);
  { const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 260).rotateX(-Math.PI / 2), mat(0x081018, { roughness: 0.4, metalness: 0.2 })); MAP.add(sea);
    const gridM = new THREE.LineBasicMaterial({ color: 0x8a5a2a, transparent: true, opacity: 0.35 }); const pts = [];
    for (let i = -6; i <= 6; i++) { pts.push(V(i * 20, 0.05, -130), V(i * 20, 0.05, 130), V(-130, 0.05, i * 20), V(130, 0.05, i * 20)); }
    MAP.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), gridM));
    // rough landmasses: Sumatra, Java, Borneo, the Malay peninsula (stylised low-poly blobs)
    const landM = mat(0x5a3e24, { roughness: 1, flatShading: true, emissive: 0x2a1408, emissiveIntensity: 0.6 });
    const blob = (pts2, h = 0.6) => { const g = new THREE.ExtrudeGeometry(new THREE.Shape(P2(pts2)), { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, landM); MAP.add(m); return m; };
    blob([[-6, 2], [-2, -6], [6, -16], [12, -26], [16, -30], [14, -20], [8, -10], [2, 0]]);           // Sumatra (NW-SE)
    blob([[2, 4], [12, 6], [26, 8], [30, 10], [24, 12], [10, 10], [2, 8]]);                           // Java
    blob([[20, -14], [30, -20], [40, -18], [42, -8], [34, -2], [24, -4]]);                             // Borneo
    blob([[4, -30], [6, -40], [8, -48], [10, -44], [9, -34]]); }                                        // peninsula
  const KRA = V(1500 + 2, 0.8, 2), ROD = V(1500 - 92, 0.8, 22);   // 1 unit ~ 50 km, Rodrigues ~4800 km WSW
  const kDot = glow(0xffb040, 10, 1); kDot.position.copy(KRA); scene.add(kDot);
  const rDot = glow(0xffe0a0, 9, 1); rDot.position.copy(ROD); scene.add(rDot);
  const rings = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 160), new THREE.MeshBasicMaterial({ color: 0xffc04a, toneMapped: false, transparent: true, opacity: 0 })); m.rotation.x = Math.PI / 2; m.position.copy(KRA); scene.add(m); return m; });

  // ---------- particles: lava/embers/foam/burst (emissive), ash (dark) ----------
  const NL = 1600, NA = 420;
  const hot = new THREE.InstancedMesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NL);
  hot.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NL * 3), 3); hot.frustumCulled = false; scene.add(hot);
  const ash = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x3a3030, roughness: 1, transparent: true, opacity: 0.85, emissive: 0x401204, emissiveIntensity: 0.6 }), NA);
  ash.frustumCulled = false; scene.add(ash);

  // ---------- post ----------
  const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: FX.msaa });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  if (FX.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.7, 0.55, 0.85));
  const finish = new ShaderPass({ uniforms: { tDiffuse: { value: null }, seed: { value: 0 }, res: { value: new THREE.Vector2(RW, RH) }, flash: { value: 0 }, shake: { value: V(0, 0, 0) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float seed, flash; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + seed) * 43758.5453); }
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
        c = pow(c, vec3(0.97, 1.0, 1.08)) * vec3(1.05, 0.98, 0.92);
        vec2 q = vUv - 0.5; q.x *= res.x / res.y; c *= mix(0.5, 1.0, smoothstep(0.85, 0.25, length(q)));
        c += (h(vUv * res) - 0.5) * 0.012;
        c = mix(c, vec3(1.0, 0.95, 0.85), flash);
        gl_FragColor = vec4(c, 1.0); }` });
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  Math.random = realRandom;

  // ---------- eruption strength over time (exterior) ----------
  const erupt = (t) => Math.max(1 - ss(6.8, 8.0, t), ss(32.3, 32.6, t) * (1 - ss(34.0, 36.0, t)) * 1.4, ss(57.2, 59.6, t), 0.12);
  const BOOM = 32.5;

  // ---------- camera ----------
  const EA_ = (x, y, z) => V(300 + x, y, z), CU = (x, y, z) => V(600 + x, y, z), SO = (x, y, z) => V(900 + x, y, z), VE = (x, y, z) => V(1200 + x, y, z), MA = (x, y, z) => V(1500 + x, y, z);
  const K0 = { pos: V(38, 14, 92), look: V(0, 30, 0), fov: 36 };
  const keys = [
    { t: 0, ...K0 },
    { t: 7.25, pos: V(30, 12, 80), look: V(0, 32, 0), fov: 36 },
    { t: 7.3, pos: EA_(0, 2, 74), look: EA_(0, 1, 0), fov: 36 },
    { t: 14.15, pos: EA_(-3, 2, 66), look: EA_(0, 1, 0), fov: 36 },
    { t: 14.2, pos: CU(0, 2, 140), look: CU(0, 0, 0), fov: 36 },
    { t: 20.6, pos: CU(0, -8, 104), look: CU(0, -8, 0), fov: 36 },
    { t: 24.55, pos: CU(4, -2, 112), look: CU(0, 0, 0), fov: 36 },
    { t: 24.6, pos: SO(3, 5, 36), look: SO(0, 2, 0), fov: 36 },
    { t: 27.15, pos: SO(2, 5, 31), look: SO(0, 3, 0), fov: 36 },
    { t: 27.2, pos: CU(0, 16, 84), look: CU(0, 16, 0), fov: 36 },
    { t: 32.45, pos: CU(0, 26, 66), look: CU(0, 26, 0), fov: 36 },
    { t: 32.5, pos: V(52, 12, 130), look: V(0, 38, 0), fov: 36 },
    { t: 33.55, pos: V(46, 12, 118), look: V(0, 40, 0), fov: 36 },
    { t: 33.6, pos: VE(10, 12, 58), look: VE(0, 4, 0), fov: 36 },
    { t: 40.35, pos: VE(-8, 10, 46), look: VE(0, 6, 0), fov: 36 },
    { t: 40.4, pos: MA(-32, 360, 190), look: MA(-32, 0, 8), fov: 36 },
    { t: 50.15, pos: MA(-34, 380, 200), look: MA(-34, 0, 10), fov: 36 },
    { t: 50.2, pos: V(0, 8, 178), look: V(0, 20, 60), fov: 36 },
    { t: 57.4, pos: V(12, 10, 168), look: V(0, 24, 40), fov: 36 },
    { t: 60, ...K0 },
  ];
  const isCut = (a, b) => b && a && Math.abs(b.t - a.t) < 0.1;
  const hc = (p0, p1, p2, p3, u) => { const seg = p2.distanceTo(p1);
    const m1 = p2.clone().sub(p0).multiplyScalar(0.5); if (m1.length() > seg) m1.setLength(seg);
    const m2 = p3.clone().sub(p1).multiplyScalar(0.5); if (m2.length() > seg) m2.setLength(seg);
    const u2 = u * u, u3 = u2 * u;
    return p1.clone().multiplyScalar(2 * u3 - 3 * u2 + 1).add(m1.multiplyScalar(u3 - 2 * u2 + u)).add(p2.clone().multiplyScalar(-2 * u3 + 3 * u2)).add(m2.multiplyScalar(u3 - u2)); };
  const camAt = (t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    let k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    if (isCut(k1, k2)) return { P: (t < k2.t ? k1 : k2).pos.clone(), L: (t < k2.t ? k1 : k2).look.clone(), fov: k1.fov };
    if (isCut(k0, k1) || k0 === k1) k0 = { ...k1, pos: k1.pos.clone().multiplyScalar(2).sub(k2.pos), look: k1.look.clone().multiplyScalar(2).sub(k2.look) };
    if (isCut(k2, k3) || k3 === k2) k3 = { ...k2, pos: k2.pos.clone().multiplyScalar(2).sub(k1.pos), look: k2.look.clone().multiplyScalar(2).sub(k1.look) };
    let u = clamp((t - k1.t) / (k2.t - k1.t)); u = u * u * (3 - 2 * u) * 0.7 + u * 0.3;
    return { P: hc(k0.pos, k1.pos, k2.pos, k3.pos, u), L: hc(k0.look, k1.look, k2.look, k3.look, u), fov: lerp(k1.fov, k2.fov, u) }; };
  const proj = (v) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H, p.z < 1 ? 1 : 0]; };
  const dummy = new THREE.Object3D(); const col = new THREE.Color();

  function render(t) {
    t = clamp(t, 0, 60);
    const cam = camAt(t); camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    // BOOM shake (0.6 s) and flash
    const sh = Math.exp(-Math.max(0, t - BOOM) * 4) * (t > BOOM ? 1 : 0);
    if (sh > 0.01) camera.position.add(V(Math.sin(t * 90) * 1.2 * sh, Math.cos(t * 77) * 1.2 * sh, 0));
    camera.setViewOffset(W, H, 0, -H * 0.03, W, H); camera.updateProjectionMatrix();
    finish.uniforms.flash.value = 0.85 * Math.exp(-Math.max(0, t - BOOM) * 7) * (t > BOOM - 0.02 ? 1 : 0) + 0.6 * Math.exp(-Math.max(0, t - 39.5) * 7) * (t > 39.48 ? 1 : 0) * 0.5;
    const CUTS = [7.3, 14.2, 24.6, 27.2, 33.6, 40.4, 50.2]; let cf = 0; for (const c of CUTS) if (t >= c) cf = Math.max(cf, 0.35 * Math.exp(-(t - c) * 10));
    finish.uniforms.flash.value = Math.min(1, finish.uniforms.flash.value + cf);
    finish.uniforms.seed.value = (Math.round(t * 30) % 97) * 0.37;
    const flowT = t; [...rivers, ...runny].forEach((m) => (m.material.uniforms.time.value = flowT)); chamberMat.uniforms.time.value = t; conduitMat.uniforms.time.value = t; mantleMat.uniforms.time.value = t;
    const e = erupt(t);
    lavaLight.intensity = 500 + 900 * e * (0.85 + 0.15 * Math.sin(t * 13)); craterGlow.material.opacity = 0.5 + 0.5 * e;
    // Earth + apple: apple pops at "epal" (8.1), crust highlight
    appleG.scale.setScalar(S0(pop(7.9, t, 0.5))); earthG.scale.setScalar(S0(pop(7.3, t, 0.5)));
    earthG.rotation.y = 0.18 * Math.sin(t * 0.5); appleG.rotation.y = 0.18 * Math.sin(t * 0.5 + 1);
    // cut-away: magma blobs rise through the cracks 14.4-20.6, chamber brightens; bubbles in the conduit 27.4-32.4
    const cham = lerp(0.6, 1.3, ss(15.0, 20.6, t)) * (t > 32.4 ? 0.8 : 1);
    chamberMat.uniforms.amt.value = cham; chamber.scale.set(lerp(12, 16, ss(15, 20.6, t)), lerp(5, 6.5, ss(15, 20.6, t)), 1); strata.uniforms.heat.value = ss(15, 20.6, t) * 0.6;
    conduitMat.uniforms.amt.value = ss(27.0, 28.0, t) * 1.2 + 0.25;
    // soda: shake then the cap pops at "dibuka"
    { const shake = ss(25.0, 25.3, t) * (1 - ss(26.6, 26.8, t)); BOT.rotation.z = 0.25 * Math.sin(t * 38) * shake; BOT.position.x = 0.6 * Math.sin(t * 38) * shake;
      const pc = ss(26.8, 27.2, t); BOT.userData.cap.position.y = 14.0 + pc * 12; BOT.userData.cap.rotation.x = pc * 6; }
    // runny vs sticky: runny glow until 36.8, then the dome swells and bursts at 39.5
    const runOn = 1 - ss(36.8, 37.4, t); runny.forEach((m) => (m.visible = runOn > 0.02)); runny.forEach((m) => (m.material.uniforms.amt.value = runOn));
    const sw = ss(37.0, 39.4, t); dome.scale.set(1 + 0.2 * sw, 0.6 + 0.4 * sw, 1 + 0.2 * sw); dome.material.emissiveIntensity = sw * 0.35 * (1 + 0.5 * Math.sin(t * 20)); domeGlow.material.opacity = (t > 36.9 && t < 39.55) ? sw * 0.5 * (0.7 + 0.3 * Math.sin(t * 20)) : 0; dome.visible = t > 36.9 && t < 39.55;
    // Krakatau rings
    rings.forEach((m, i) => { const t0 = 43.4 + i * 0.5; const u = clamp((t - t0) / 3.4); m.scale.setScalar(S0(2 + u * 100)); m.material.opacity = t > t0 && t < 50.2 ? 0.9 * (1 - u * 0.7) : 0; m.scale.z = 1; });
    kDot.material.opacity = t > 40 && t < 50 ? 0.7 + 0.3 * Math.sin(t * 6) : 0; rDot.material.opacity = t > 40 && t < 50.2 ? 0.4 + 0.6 * ss(46.0, 46.8, t) : 0; kDot.scale.setScalar(10 + 20 * Math.exp(-Math.max(0, t - 43.4) * 2) * (t > 43.4 ? 1 : 0));
    // fertile fields grow after the ash settles
    { const g = ss(52.6, 55.2, t) * (1 - ss(59.0, 60, t)); fieldGround.material.color.set(0x3b2a1a).lerp(new THREE.Color(0x2c4a1c), g);
      for (let i = 0; i < NF; i++) { const [x, z, r] = FIELD[i]; dummy.position.set(x, 0.8 * g, z); dummy.scale.set(1, S0(g * (0.8 + 0.4 * r)), 1); dummy.rotation.set(0.1 * Math.sin(t * 2 + x), r * 6, 0); dummy.updateMatrix(); field.setMatrixAt(i, dummy.matrix); }
      field.instanceMatrix.needsUpdate = true; }
    // ---- hot particles ----
    let q = 0;
    const put = (p, s, c, m = 1) => { if (q >= NL) return; dummy.position.copy(p); dummy.scale.setScalar(S0(s)); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); hot.setMatrixAt(q, dummy.matrix); col.setHex(c).multiplyScalar(m); hot.setColorAt(q++, col); };
    // lava fountain (exterior), 2 s cycles (period divides 60)
    if (e > 0.13 && camera.position.x < 200) for (let i = 0; i < 520; i++) { const r = mulberry32(i * 7 + 3); const ph = r(); const life = 2.0; const u = ((t / life) + ph) % 1;
      const a = r() * TAU, sp = (8 + r() * 16) * Math.sqrt(e), up = (22 + r() * 30) * Math.sqrt(e); const tt = u * life * 1.3;
      const p = V(Math.cos(a) * sp * tt, 38 + up * tt - 14 * tt * tt, Math.sin(a) * sp * tt); if (p.y < 0) continue;
      put(p, (0.5 + r() * 0.9) * (1 - u * 0.6), u < 0.4 ? 0xffd070 : 0xff5a1a, 2.2 - u); }
    // embers drifting toward the camera everywhere it is dark (periodic 12 s)
    for (let i = 0; i < 160; i++) { const r = mulberry32(i * 13 + 5); const u = ((t / 12) + r()) % 1; const base = camera.position.clone().add(V((r() - 0.5) * 40, (r() - 0.5) * 60, -30 - r() * 40));
      put(base.add(V(Math.sin(u * TAU + i) * 3, (u - 0.5) * 30, Math.cos(u * TAU * 2 + i) * 2)), 0.12 + r() * 0.25, 0xff8a3a, 1.6 * (0.5 + 0.5 * Math.sin(u * TAU * 3 + i))); }
    // magma blobs rising through the cracks (cut-away)
    if (t > 14.2 && t < 21.4) cracks.forEach(({ curve }, k) => { for (let i = 0; i < 10; i++) { const u = ((t * 0.18) + i / 10 + k * 0.13) % 1; const p = curve.getPointAt(u); put(V(600 + p.x, p.y, 0.3), 0.9 * (0.6 + u * 0.6), 0xffa040, 2.0); } });
    // gas bubbles in the conduit: tiny deep down, huge near the top, faster near the end
    if (t > 27.2 && t < 32.7) { const sp = lerp(0.12, 0.6, ss(28.5, 32.3, t)); for (let i = 0; i < 70; i++) { const r = mulberry32(i * 5 + 1); const u = ((t * sp) + r()) % 1; const y = lerp(-8, 37, u);
        put(V(600 + (r() - 0.5) * 2.0, y, 0.4), 0.15 + Math.pow(u, 2) * 1.2 * ss(28.8, 31.3, t) + 0.1, 0xfff0c0, 1.8); } }
    // soda foam burst
    if (t > 26.8 && t < 28.0) { const u0 = t - 26.8; for (let i = 0; i < 200; i++) { const r = mulberry32(i * 3 + 7); const a = r() * TAU, sp = 2 + r() * 6, up = 10 + r() * 14; const tt = clamp(u0 - r() * 0.3, 0, 1);
        put(V(900 + Math.cos(a) * sp * tt, 8 + up * tt - 9 * tt * tt, Math.sin(a) * sp * tt), 0.35 * (1 - tt * 0.5), 0xfff4e0, 1.3); } }
    // runny vent: gentle bubbles escaping; sticky dome: burst at 39.5
    if (t > 33 && t < 37) for (let i = 0; i < 30; i++) { const r = mulberry32(i * 9 + 2); const u = ((t * 0.5) + r()) % 1; put(V(1200 + (r() - 0.5) * 3, 9 + u * 4, (r() - 0.5) * 3), 0.25 * (1 - u), 0xffc060, 1.6); }
    if (t > 39.45 && t < 41.2) { const u0 = t - 39.45; for (let i = 0; i < 360; i++) { const r = mulberry32(i * 11 + 4); const a = r() * TAU, sp = 6 + r() * 16, up = 14 + r() * 26; const tt = clamp(u0 * 0.9 - r() * 0.1, 0, 1.6);
        const p = V(1200 + Math.cos(a) * sp * tt, 10 + up * tt - 12 * tt * tt, Math.sin(a) * sp * tt); if (p.y > 0) put(p, 0.6 * (1 - tt * 0.4), r() < 0.5 ? 0xffd070 : 0xff4a10, 2.2); } }
    for (; q < NL; q++) { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); hot.setMatrixAt(q, dummy.matrix); }
    hot.instanceMatrix.needsUpdate = true; hot.instanceColor.needsUpdate = true;
    // ---- ash plume (exterior) + ash fall at the end ----
    let qa = 0;
    for (let i = 0; i < 300; i++) { const r = mulberry32(i * 17 + 9); const u = ((t / 15) + r()) % 1; const a = r() * TAU; const s = e > 0.3 ? 1 : 0.5;
      const p = V(Math.cos(a) * (2 + u * 26) * s + u * 18, 40 + u * 70 * (0.5 + 0.5 * s), Math.sin(a) * (2 + u * 20) * s); dummy.position.copy(p); dummy.scale.setScalar(S0((1.5 + u * 7) * (0.6 + r() * 0.6))); dummy.rotation.set(u * 3, r() * 6, 0); dummy.updateMatrix(); ash.setMatrixAt(qa++, dummy.matrix); }
    const fall = ss(50.2, 51.2, t) * (1 - ss(53.2, 54.2, t));
    for (let i = 0; i < 120; i++) { const r = mulberry32(i * 29 + 1); const u = ((t * 0.35) + r()) % 1; dummy.position.set((r() - 0.5) * 120, 40 * (1 - u), 90 + r() * 60); dummy.scale.setScalar(S0(fall * (0.3 + r() * 0.5))); dummy.updateMatrix(); ash.setMatrixAt(qa++, dummy.matrix); }
    for (; qa < NA; qa++) { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); ash.setMatrixAt(qa, dummy.matrix); }
    ash.instanceMatrix.needsUpdate = true;
    // golden-hour tint at the end (fertile scene)
    const gold = ss(51.0, 52.5, t) * (1 - ss(57.0, 59.0, t)); hemi.color.set(0x6a3a2a).lerp(new THREE.Color(0xffc080), gold); hemi.intensity = 0.7 + 0.8 * gold; key.intensity = 0.8 + 1.4 * gold;
    scene.background.set(BG).lerp(new THREE.Color(0x3a1a0c), gold); scene.fog.color.copy(scene.background);
    composer.render();
    const out = { t, anchors: {} }; const A = out.anchors;
    A["crater"] = proj(V(4, 39, 2)); A["crust"] = proj(EA_(9.4, -9 + 3.0, 0.2)); A["skin"] = proj(EA_(4.7, 11.5 + 1.2, 0.2)); A["mantle"] = proj(EA_(-5, -9 + 3, 0.2));
    A["chamber"] = proj(CU(9, -16, 0.2)); A["conduit"] = proj(CU(1.4, 20, 0.2)); A["bubble"] = proj(CU(1.4, 30, 0.4)); A["soda"] = proj(SO(2.8, 3, 0.2));
    A["runny"] = proj(VE(14, 4, 8)); A["dome"] = proj(VE(5, 11, 0)); A["kra"] = proj(KRA); A["rod"] = proj(ROD); A["field"] = proj(V(20, 1.2, 100));
    return out;
  }
  function debug(t) { const o = render(t); return { t, cam: camera.position.toArray().map((x) => +x.toFixed(1)), anchors: Object.fromEntries(Object.entries(o.anchors).map(([k, v]) => [k, v.map((x) => Math.round(x))])) }; }
  return { render, debug };
}
