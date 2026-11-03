// Floating-island world for "How a plane flies, the simple way".
// Everything on screen is a pure function of timeline time t (seconds, 0..60).
import * as THREE from "./lib/three.module.min.js";

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (e0, e1, x) => {
  const u = clamp((x - e0) / (e1 - e0));
  return u * u * (3 - 2 * u);
};
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const pop = (t0, t, d = 0.35) => {
  // 0 -> overshoot -> 1 (back-out), for parts attaching
  const u = clamp((t - t0) / d);
  if (u <= 0) return 0;
  const c1 = 1.9, c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
};
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- palette ----------
export const PAL = {
  skyTop: 0x5d4fa8, skyMid: 0xb784c4, skyHorizon: 0xffb48c, skyLow: 0xf59a9a,
  grass: 0x86c46b, grassDark: 0x5f9c50, soil: 0x9a6248, soilDark: 0x6b3f30,
  tree: [0x76b85e, 0x8fcc6c, 0x5fa452], trunk: 0x7a5236, stone: 0xe9dfd6,
  road: 0x4b4560, runway: 0x3b3750, white: 0xfff8f0, car: 0xe8453c,
  skin: 0xe8a984, sleeve: 0x4d7cff, plane: 0xf7f3ee, stripe: 0xff8a5c,
  metal: 0xc9ccd8, dark: 0x2a2638, lift: 0xffc531, air: 0x6fd8ff, thrust: 0xff6a3d,
  aero: 0x7ee8ff, flaps: 0xa8f07a, glass: 0x9fd6ff,
};
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, metalness: 0, ...o });

// ---------- scene ----------
export function createWorld(canvas, W, H, scale = 1) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(Math.round(W * scale), Math.round(H * scale), false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf2a7a4, 380, 1300);
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 4000);

  // sky dome
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(PAL.skyTop) }, mid: { value: new THREE.Color(PAL.skyMid) },
        hor: { value: new THREE.Color(PAL.skyHorizon) }, low: { value: new THREE.Color(PAL.skyLow) },
        sunDir: { value: V(-0.25, 0.08, -1).normalize() },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform vec3 top,mid,hor,low,sunDir; varying vec3 vDir;
        void main(){ float h = vDir.y; vec3 c;
          if(h>0.0){ c = mix(hor, mid, smoothstep(0.0,0.28,h)); c = mix(c, top, smoothstep(0.25,0.85,h)); }
          else { c = mix(hor, low, smoothstep(0.0,-0.35,h)); }
          float s = max(dot(normalize(vDir), sunDir),0.0);
          c += vec3(1.0,0.85,0.6)*pow(s,60.0)*0.5 + vec3(1.0,0.7,0.45)*pow(s,6.0)*0.14;
          gl_FragColor = vec4(c,1.0); }`,
    })
  );
  scene.add(sky);

  scene.add(new THREE.HemisphereLight(0xffd2b8, 0xd99a86, 0.95)); // warm bounce so undersides read peach, not green
  const sun = new THREE.DirectionalLight(0xffe0c2, 2.4);
  sun.position.set(-120, 160, 140);
  sun.castShadow = true;
  sun.shadow.mapSize.set(scale < 1 ? 1024 : 2048, scale < 1 ? 1024 : 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.6;
  sun.shadow.radius = 4;
  const sc = sun.shadow.camera; sc.left = -110; sc.right = 110; sc.top = 110; sc.bottom = -110; sc.near = 10; sc.far = 600;
  scene.add(sun); scene.add(sun.target);
  const rim = new THREE.DirectionalLight(0xc9a0ff, 0.7);
  rim.position.set(80, 40, -160);
  scene.add(rim);

  // glow sprite texture
  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  const g = gcv.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.25, "rgba(255,255,255,0.55)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(gcv);
  const glow = (color, size) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    s.scale.set(size, size, 1); return s;
  };
  const sunGlow = glow(0xffd9a8, 240); sunGlow.material.opacity = 0.55; sunGlow.position.set(-480, 150, -1700); scene.add(sunGlow);

  // ---------- island ----------
  const rnd = mulberry32(7);
  const island = new THREE.Group(); scene.add(island);
  const RX = 64, RZ = 44;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.97, 1, 36, 1), mat(PAL.grass));
  top.scale.set(RX, 3, RZ); top.position.y = -1.5; top.receiveShadow = true; island.add(top);
  const soilBand = new THREE.Mesh(new THREE.CylinderGeometry(0.985, 0.94, 1, 36, 1), mat(PAL.soil));
  soilBand.scale.set(RX, 5, RZ); soilBand.position.y = -5.4; island.add(soilBand);
  const coneG = new THREE.ConeGeometry(1, 1, 18, 5);
  coneG.rotateX(Math.PI);
  { const p = coneG.attributes.position; const r2 = mulberry32(11);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0.49 && y > -0.49) { p.setX(i, p.getX(i) * (0.85 + 0.3 * r2())); p.setZ(i, p.getZ(i) * (0.85 + 0.3 * r2())); p.setY(i, y + (r2() - 0.5) * 0.08); } }
    coneG.computeVertexNormals(); }
  const under = new THREE.Mesh(coneG, mat(PAL.soilDark));
  under.scale.set(RX * 0.94, 62, RZ * 0.94); under.position.y = -7.9 - 31; island.add(under);
  // hanging roots
  const rootMat = mat(0x5a3326);
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, r = 0.25 + rnd() * 0.5;
    const x = Math.cos(a) * RX * r * 0.8, z = Math.sin(a) * RZ * r * 0.8;
    const y0 = -8 - (1 - r) * 40 * 0.2 - 18 * (1 - r);
    const pts = []; for (let k = 0; k < 6; k++) pts.push(V(x + Math.sin(k + i) * 2.5, y0 - k * (5 + rnd() * 3), z + Math.cos(k * 1.3 + i) * 2.5));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.45, 5), rootMat);
    island.add(tube);
  }
  // ring road (oval)
  const ROADX = 52, ROADZ = 33, ROADW = 5;
  const roadPt = (phi) => V(ROADX * Math.cos(phi), 0, ROADZ * Math.sin(phi));
  {
    const N = 160, pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const p = (i / N) * Math.PI * 2; const c = roadPt(p);
      const tx = -ROADX * Math.sin(p), tz = ROADZ * Math.cos(p); const l = Math.hypot(tx, tz);
      const nx = tz / l, nz = -tx / l;
      pos.push(c.x + nx * ROADW / 2, 0.06, c.z + nz * ROADW / 2, c.x - nx * ROADW / 2, 0.06, c.z - nz * ROADW / 2);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx); gg.computeVertexNormals();
    const road = new THREE.Mesh(gg, mat(PAL.road, { side: THREE.DoubleSide })); road.receiveShadow = true; island.add(road);
    const dashG = new THREE.BoxGeometry(1.6, 0.05, 0.25);
    for (let i = 0; i < 70; i++) {
      const p = (i / 70) * Math.PI * 2; const c = roadPt(p);
      const d = new THREE.Mesh(dashG, mat(PAL.white)); d.position.set(c.x, 0.1, c.z);
      d.rotation.y = -Math.atan2(ROADZ * Math.cos(p), -ROADX * Math.sin(p)); island.add(d);
    }
  }
  // runway
  const RWZ = -8, RWX0 = -44, RWX1 = 44;
  {
    const rw = new THREE.Mesh(new THREE.BoxGeometry(RWX1 - RWX0, 0.2, 11), mat(PAL.runway)); rw.position.set(0, 0.05, RWZ); rw.receiveShadow = true; island.add(rw);
    for (let x = RWX0 + 8; x < RWX1 - 6; x += 5) { const d = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.35), mat(PAL.white)); d.position.set(x, 0.18, RWZ); island.add(d); }
    for (const sx of [RWX0 + 2, RWX1 - 2]) for (let k = -3; k <= 3; k++) { if (!k) continue; const d = new THREE.Mesh(new THREE.BoxGeometry(3, 0.06, 0.5), mat(PAL.white)); d.position.set(sx, 0.18, RWZ + k * 1.2); island.add(d); }
    for (let x = RWX0; x <= RWX1; x += 8) for (const s of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe2a8 })); l.position.set(x, 0.4, RWZ + s * 5.9); island.add(l);
      const gl = glow(0xffc27a, 3.2); gl.position.copy(l.position); island.add(gl);
    }
  }
  // trees, bushes, stones, flowers
  const inRoad = (x, z) => { const r = Math.hypot(x / ROADX, z / ROADZ); return Math.abs(r - 1) < 0.13; };
  const inRunway = (x, z) => Math.abs(z - RWZ) < 10 && x > RWX0 - 6 && x < RWX1 + 6;
  const treeG = new THREE.IcosahedronGeometry(1, 0), trunkG = new THREE.CylinderGeometry(0.35, 0.5, 1, 6);
  let placed = 0, guard = 0;
  while (placed < 30 && guard++ < 800) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.93; const x = Math.cos(a) * RX * r, z = Math.sin(a) * RZ * r;
    if (inRoad(x, z) || inRunway(x, z)) continue;
    const big = (z < RWZ - 8 || Math.abs(x) > 50) && rnd() < 0.8; const s = big ? 3.5 + rnd() * 2.5 : 1.4 + rnd() * 1.2;
    const t = new THREE.Mesh(treeG, mat(PAL.tree[placed % 3])); t.scale.set(s, s * 1.05, s);
    t.position.set(x, big ? s + 2.5 : s * 0.7, z); t.rotation.set(rnd(), rnd() * 6, 0); t.castShadow = true; island.add(t);
    if (big) { const tr = new THREE.Mesh(trunkG, mat(PAL.trunk)); tr.scale.set(1, 3.2, 1); tr.position.set(x, 1.6, z); tr.castShadow = true; island.add(tr); }
    placed++;
  }
  const flowerCols = [0xff8fb1, 0xffd36e, 0xc9a2ff, 0xffffff];
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.95; const x = Math.cos(a) * RX * r, z = Math.sin(a) * RZ * r;
    if (inRoad(x, z) || inRunway(x, z)) continue;
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), mat(flowerCols[i % 4])); f.position.set(x, 0.25, z); island.add(f);
  }
  for (let i = 0; i < 7; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.25, 9), mat(PAL.stone)); st.position.set(-20 + i * 2.6, 0.12, 22 + Math.sin(i) * 1.4); st.receiveShadow = true; island.add(st); }
  // windsock
  { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), mat(PAL.white)); pole.position.set(30, 3, RWZ - 9); island.add(pole);
    const sock = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3, 8, 1, true), mat(PAL.stripe, { side: THREE.DoubleSide })); sock.rotation.z = Math.PI / 2; sock.position.set(28.5, 5.6, RWZ - 9); island.add(sock); }
  // clouds
  const cloudMat = mat(0xffe9ef, { roughness: 1 });
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group(); const n = 3 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), cloudMat); const s = 5 + rnd() * 7; b.scale.set(s * 1.4, s * 0.7, s); b.position.set(k * 7 - n * 3.5, rnd() * 2, rnd() * 4); c.add(b); }
    const a = (i / 9) * Math.PI * 2 + 0.3; const r = 150 + rnd() * 90;
    c.position.set(Math.cos(a) * r, -30 + rnd() * 70, Math.sin(a) * r - 40);
    { const camP = V(205, 14, 222), d = camP.clone().normalize(); const along = c.position.dot(d); const perp = c.position.clone().sub(d.clone().multiplyScalar(along));
      if (along > 0 && perp.length() < 110) c.position.add(perp.lengthSq() > 1 ? perp.normalize().multiplyScalar(120) : V(0, 0, -150)); }
    scene.add(c); clouds.push(c);
  }

  // ---------- car + arm ----------
  const car = new THREE.Group(); scene.add(car);
  { const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.0, 2.1), mat(PAL.car, { roughness: 0.5 })); body.position.y = 0.95; body.castShadow = true; car.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.9), mat(0x2b2b3d, { roughness: 0.3 })); cab.position.set(-0.2, 1.85, 0); car.add(cab);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 1.95), mat(PAL.car, { roughness: 0.5 })); roof.position.set(-0.25, 2.32, 0); roof.castShadow = true; car.add(roof);
    for (const [x, z] of [[1.5, 1.05], [-1.5, 1.05], [1.5, -1.05], [-1.5, -1.05]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.4, 10), mat(0x22202a)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.48, z); car.add(w); }
    for (const z of [0.65, -0.65]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.45), new THREE.MeshBasicMaterial({ color: 0xfff1c4 })); hl.position.set(2.31, 1.05, z); car.add(hl); }
  }
  const arm = new THREE.Group(); arm.position.set(0.15, 1.75, 0.98); car.add(arm);
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.9), mat(PAL.sleeve)); sleeve.position.z = 0.3; arm.add(sleeve);
  const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.55), mat(PAL.skin)); forearm.position.z = 0.95; arm.add(forearm);
  const hand = new THREE.Group(); hand.position.z = 1.2; arm.add(hand);
  { const skin = mat(PAL.skin, { roughness: 0.7 });
    const palm = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), skin); palm.scale.set(0.33, 0.075, 0.34); palm.position.z = 0.33; palm.castShadow = true; hand.add(palm);
    const fl = [0.36, 0.42, 0.4, 0.32];
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, fl[i], 3, 6), skin); f.rotation.x = Math.PI / 2; f.position.set(0.21 - i * 0.14, 0.005, 0.62 + fl[i] / 2); f.castShadow = true; hand.add(f); }
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 3, 6), skin); th.rotation.set(Math.PI / 2, 0, 0); th.rotation.y = 0; th.position.set(0.38, -0.01, 0.3); th.rotateX(0); th.rotation.z = 0; th.rotation.y = 0.0; const thg = new THREE.Group(); thg.add(th); thg.rotation.y = 0.75; thg.position.set(0.12, 0, 0.05); hand.add(thg); }

  // ---------- plane (origin = wing centre) ----------
  const plane = new THREE.Group(); scene.add(plane);
  const CH = 6; // chord
  // wing profile: m=0 flat plate, m=1 aerofoil; returns closed shape points (x: +LE .. -TE)
  const profilePts = (m, n = 28) => {
    const up = [], lo = [];
    for (let i = 0; i <= n; i++) {
      const xc = 0.5 * (1 - Math.cos((i / n) * Math.PI)); // 0..1 from LE
      const tFlat = 0.018, tAero = 0.13 * (2.969 * Math.sqrt(xc) - 1.26 * xc - 3.516 * xc * xc + 2.843 * xc ** 3 - 1.015 * xc ** 4) / 1.0;
      const camber = xc < 0.4 ? (0.06 / 0.16) * (0.8 * xc - xc * xc) : (0.06 / 0.36) * (0.2 + 0.8 * xc - xc * xc);
      const th = lerp(tFlat, tAero * 0.68, m), cb = camber * m;
      const X = (0.5 - xc) * CH;
      up.push([X, (cb + th) * CH]); lo.push([X, (cb - th) * CH]);
    }
    return { up, lo };
  };
  const wingGeo = (m, span) => {
    const { up, lo } = profilePts(m);
    const shape = new THREE.Shape();
    shape.moveTo(up[0][0], up[0][1]);
    for (let i = 1; i < up.length; i++) shape.lineTo(up[i][0], up[i][1]);
    for (let i = lo.length - 1; i >= 0; i--) shape.lineTo(lo[i][0], lo[i][1]);
    const gg = new THREE.ExtrudeGeometry(shape, { depth: span, bevelEnabled: false, curveSegments: 2 });
    gg.translate(0, 0, -span / 2); gg.computeVertexNormals();
    return gg;
  };
  const wingMat = mat(PAL.plane, { roughness: 0.55, transparent: true, opacity: 1 });
  const wing = new THREE.Mesh(wingGeo(0, 1), wingMat); wing.castShadow = true; plane.add(wing);
  const geoCache = new Map();
  let lastKey = "";
  const setWing = (m, span) => {
    const k = Math.round(m * 40) + "_" + Math.round(span * 4);
    if (k === lastKey) return; lastKey = k;
    if (!geoCache.has(k)) geoCache.set(k, wingGeo(Math.round(m * 40) / 40, Math.round(span * 4) / 4));
    wing.geometry = geoCache.get(k);
  };
  // cutaway: ribs + glowing tip outline
  const ribs = new THREE.Group(); plane.add(ribs);
  const ribMat = new THREE.MeshStandardMaterial({ color: 0xffb36b, flatShading: true, emissive: 0xff8a3d, emissiveIntensity: 0.35 });
  const ribObjs = [];
  for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(wingGeo(1, 0.12), ribMat); ribs.add(r); ribObjs.push(r); }
  const outlineMat = new THREE.LineBasicMaterial({ color: PAL.aero, transparent: true });
  const outline = new THREE.LineLoop(new THREE.BufferGeometry(), outlineMat); plane.add(outline);
  const outlineTube = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: PAL.aero, transparent: true, fog: false }));
  plane.add(outlineTube);
  const setOutline = (m, z) => {
    const { up, lo } = profilePts(m, 24);
    const pts = up.map(([x, y]) => V(x, y, z)).concat(lo.slice().reverse().map(([x, y]) => V(x, y, z)));
    outlineTube.geometry.dispose();
    outlineTube.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, 0.06, 5, true);
  };

  // fuselage group (sits above the wing)
  const fus = new THREE.Group(); fus.position.set(-1.5, 1.4, 0); plane.add(fus);
  const pMat = mat(PAL.plane, { roughness: 0.5 });
  { const body = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 26, 14), pMat); body.rotation.z = Math.PI / 2; body.castShadow = true; fus.add(body);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(2.3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), pMat); nose.rotation.z = -Math.PI / 2; nose.scale.set(1, 1.9, 1); nose.position.x = 13; nose.castShadow = true; fus.add(nose);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 0.6, 10, 14), pMat); tail.rotation.z = Math.PI / 2; tail.position.set(-18, 0.8, 0); tail.castShadow = true; fus.add(tail);
    const cock = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 3.2), mat(PAL.dark, { roughness: 0.2 })); cock.position.set(15.2, 0.9, 0); cock.rotation.z = -0.35; fus.add(cock);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.32, 2.32, 30, 14, 1, true, Math.PI * 0.45, Math.PI * 0.1), mat(PAL.stripe, { side: THREE.DoubleSide })); stripe.rotation.z = Math.PI / 2; stripe.rotation.x = 0; fus.add(stripe);
    const winG = new THREE.BoxGeometry(0.5, 0.55, 0.1); const winM = mat(PAL.dark, { roughness: 0.2 });
    for (const s of [1, -1]) for (let i = 0; i < 18; i++) { const w = new THREE.Mesh(winG, winM); w.position.set(10 - i * 1.25, 0.75, s * 2.22); fus.add(w); }
  }
  // tail surfaces
  const finGrp = new THREE.Group(); finGrp.position.set(-20, 2.2, 0); fus.add(finGrp);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 0.4), pMat); fin.position.set(0.5, 3.5, 0); fin.geometry.translate(0, 0, 0); finGrp.add(fin);
  const finTip = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 0.42), mat(PAL.stripe)); finTip.position.set(0.5, 6.4, 0); finGrp.add(finTip);
  const rudderPivot = new THREE.Group(); rudderPivot.position.set(-2, 0.3, 0); finGrp.add(rudderPivot);
  const ctrlMat = () => mat(0xe9e4f2, { roughness: 0.5, emissive: 0x000000 });
  const rudder = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6.2, 0.36), ctrlMat()); rudder.position.set(-0.8, 3.1, 0); rudderPivot.add(rudder);
  const stab = new THREE.Group(); stab.position.set(-19.5, 0.9, 0); fus.add(stab);
  const stabM = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 15), pMat); stab.add(stabM);
  const elevPivot = new THREE.Group(); elevPivot.position.set(-1.8, 0, 0); stab.add(elevPivot);
  const elevator = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 14.4), ctrlMat()); elevator.position.set(-0.7, 0, 0); elevPivot.add(elevator);
  // control surfaces on wing trailing edge (TE at x=-CH/2)
  const mkTE = (z0, z1, color) => {
    const p = new THREE.Group(); p.position.set(-CH / 2, 0, (z0 + z1) / 2);
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, Math.abs(z1 - z0)), ctrlMat()); m.position.x = -0.75; p.add(m); plane.add(p); return p;
  };
  const flapR = mkTE(3, 10), flapL = mkTE(-3, -10), ailR = mkTE(11, 16.5), ailL = mkTE(-11, -16.5);
  // engines
  const mkEngine = () => {
    const e = new THREE.Group();
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.4), pMat); pylon.position.set(0.5, -0.9, 0); e.add(pylon);
    const nac = new THREE.Group(); nac.position.set(1.8, -2.6, 0); e.add(nac);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.1, 5, 14, 1, true), mat(PAL.metal, { roughness: 0.45, side: THREE.DoubleSide })); shell.rotation.z = Math.PI / 2; nac.add(shell);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.33, 0.18, 6, 16), mat(0xe8eaf0)); lip.rotation.y = Math.PI / 2; lip.position.x = 2.5; nac.add(lip);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 10), mat(0x8a8ea0)); core.rotation.z = Math.PI / 2; core.position.x = -3.2; nac.add(core);
    const prop = new THREE.Group(); prop.position.x = 2.2; nac.add(prop);
    const hub = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1, 10), mat(PAL.dark)); hub.rotation.z = -Math.PI / 2; hub.position.x = 0.5; prop.add(hub);
    const blades = [];
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.35), mat(PAL.dark)); b.position.y = 0.65; const bg = new THREE.Group(); bg.rotation.x = (i / 6) * Math.PI * 2; b.rotation.y = 0.5; bg.add(b); prop.add(bg); blades.push(b); }
    const exGlow = glow(0xffa45c, 4); exGlow.position.set(-4.2, 0, 0); nac.add(exGlow);
    return { e, pylon, nac, shell, lip, core, prop, blades, exGlow };
  };
  const engR = mkEngine(), engL = mkEngine(); plane.add(engR.e); plane.add(engL.e);
  // landing gear
  const gear = new THREE.Group(); plane.add(gear);
  const gearParts = [];
  for (const [x, z] of [[-0.5, 3.6], [-0.5, -3.6], [10.5, 0]]) {
    const leg = new THREE.Group(); leg.position.set(x, x > 5 ? 0.2 : -0.2, z);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.6, 6), mat(PAL.metal)); l.position.y = -1.3; leg.add(l);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.7, 12), mat(0x23212b)); w.rotation.x = Math.PI / 2; w.position.y = -2.65; leg.add(w);
    gear.add(leg); gearParts.push(leg);
  }
  const GEAR_H = 3.5; // wing-centre height above ground when on wheels
  plane.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // ---------- arrows ----------
  const mkArrow = (color, len = 1) => {
    const a = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, flatShading: true });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), m); shaft.position.y = 0.35; a.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 10), m); head.position.y = 0.88; a.add(head);
    const gl = glow(color, 1.3); gl.material.opacity = 0.5; gl.position.y = 0.6; a.add(gl); a.userData = { m, gl };
    scene.add(a); return a;
  };
  const downArrows = [0, 1, 2].map(() => mkArrow(PAL.air));
  const liftArrow = mkArrow(PAL.lift);
  const thrustArrow = mkArrow(PAL.thrust);

  // ---------- instanced streaks (airflow lines) ----------
  const NS = 260;
  const streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false }), NS);
  streaks.frustumCulled = false; scene.add(streaks);
  const NP = 220;
  const parts = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, fog: false }), NP);
  parts.frustumCulled = false; parts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NP * 3), 3); scene.add(parts);
  const dummy = new THREE.Object3D();
  const XAXIS = V(1, 0, 0);
  const hide = (im, i) => { dummy.position.set(0, -9999, 0); dummy.scale.set(0.0001, 0.0001, 0.0001); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); };

  // ---------- timeline functions ----------
  const CAR_PERIOD = 60, PHI0 = Math.PI / 2 + 0.55; // car at front-centre around t ~ 5
  const carPhi = (t) => PHI0 - (2 * Math.PI * t) / CAR_PERIOD;
  const carPose = (t) => {
    const p = carPhi(t); const c = roadPt(p);
    const tx = ROADX * Math.sin(p), tz = -ROADZ * Math.cos(p); // velocity dir (phi decreasing)
    return { pos: c, yaw: -Math.atan2(tz, tx) };
  };

  // takeoff roll / flight integration (precomputed, deterministic)
  const kmh = (t) => (t < 36.6 ? 0 : t < 44.2 ? 255 * Math.pow((t - 36.6) / 7.6, 1.25) : 255);
  const FLY = []; // {t, x,y,z, yaw, pitch, roll}
  {
    let x = RWX0 + 6, y = GEAR_H, z = RWZ, yaw = 0, dt = 1 / 120;
    for (let t = 34; t <= 62.001; t += dt) {
      const v = kmh(t) * 0.066 * (1 - 0.45 * ss(46.5, 49, t));
      // manoeuvres: bank + turn right 48-51.4 (aileron, rudder), climb 51.2-52.6 / descend 52.9-54.4 (elevator),
      // then a gentle climbing left turn that carries it up behind the island for the final wide shot
      const roll = 0.6 * (ss(48.4, 49.0, t) - ss(50.6, 51.2, t)) + 0.4 * (ss(51.2, 51.8, t) - ss(54.2, 54.8, t)) + 0.35 * (ss(55.2, 56.2, t) - ss(59.0, 60.0, t)); // banking right, towards the camera side
      const yawRate = -roll * 0.9;
      const pitch = (t < 44.6 ? 0.16 * ss(44.0, 44.8, t) : 0.16 - 0.1 * ss(46, 48, t)) + 0.22 * (ss(51.2, 51.8, t) - ss(52.4, 52.9, t)) - 0.2 * (ss(52.9, 53.4, t) - ss(53.8, 54.4, t)) + 0.3 * ss(55.5, 57, t);
      yaw += yawRate * dt;
      const airborne = t > 45.0;
      x += Math.cos(yaw) * v * dt; z += -Math.sin(yaw) * v * dt;
      if (airborne) y += Math.sin(pitch) * v * dt * 1.0;
      FLY.push({ t, x, y, z, yaw, pitch, roll, v });
    }
  }
  const fly = (t) => { const i = clamp(Math.round((t - 34) * 120), 0, FLY.length - 1); return FLY[i]; };

  // where the plane is posed in the "sky studio" (segments 2-4)
  const STUDIO = V(-6, 40, 40);
  const handWorld = (t) => { car.updateMatrixWorld(true); const v = V(0, 0, 0.35); hand.localToWorld(v); return v; };

  // ---------- camera keys ----------
  // Each key: t, pos(t) and look(t) evaluated live so follow-shots track their subject.
  const W0 = { pos: V(205, 14, 222), look: V(4, -2, 0), fov: 44 };
  // chase from outside the plane's circle, so the island stays behind it
  const radPos = (t, D, H, back) => { const f = fly(t); const l = Math.hypot(f.x, f.z) || 1; return V(f.x + (f.x / l) * D - Math.cos(f.yaw) * back, f.y + H, f.z + (f.z / l) * D + Math.sin(f.yaw) * back); };
  const flyPos = (t, off) => { const f = fly(t); const c = Math.cos(f.yaw), s = Math.sin(f.yaw); return V(f.x + off.x * c + off.z * s, f.y + off.y, f.z - off.x * s + off.z * c); };
  const keys = [
    { t: 0, pos: () => W0.pos, look: () => W0.look, fov: 44 },
    { t: 1.0, pos: (t) => carPose(t).pos.clone().add(V(-6, 34, 96)), look: (t) => carPose(t).pos.clone().add(V(0, 2, 0)), fov: 42 },
    { t: 2.2, pos: (t) => handWorld(t).add(V(-7.5, 3.0, 9.5)), look: (t) => handWorld(t).add(V(-0.8, -0.4, 0)), fov: 40 },
    { t: 4.2, pos: (t) => handWorld(t).add(V(-5.2, 2.0, 6.8)), look: (t) => handWorld(t).add(V(-0.6, -0.3, 0)), fov: 40 },
    { t: 6.0, pos: (t) => handWorld(t).add(V(-2.6, 1.2, 3.4)), look: (t) => handWorld(t), fov: 40 },
    { t: 8.5, pos: (t) => obj.pos.clone().add(V(-16, 9, 34)), look: () => obj.pos.clone(), fov: 40 },
    { t: 14.5, pos: (t) => obj.pos.clone().add(V(-13, 8, 33)), look: () => obj.pos.clone().add(V(0, -0.5, 0)), fov: 40 },
    { t: 16.8, pos: (t) => obj.pos.clone().add(V(4, 9, 31)), look: () => obj.pos.clone().add(V(0, -0.5, -1)), fov: 40 },
    { t: 19.2, pos: (t) => obj.pos.clone().add(V(17, -9, 24)), look: () => obj.pos.clone().add(V(1, -2.2, -3)), fov: 40 },
    { t: 22.8, pos: (t) => obj.pos.clone().add(V(13, -8, 26)), look: () => obj.pos.clone().add(V(0, -2.2, -3)), fov: 40 },
    { t: 25.0, pos: (t) => obj.pos.clone().add(V(2.0, 5.0, 27)), look: () => obj.pos.clone().add(V(0, -0.3, 7)), fov: 38 },
    { t: 31.5, pos: (t) => obj.pos.clone().add(V(-1.5, 4.0, 26)), look: () => obj.pos.clone().add(V(0, -0.3, 7)), fov: 38 },
    { t: 33.6, pos: (t) => obj.pos.clone().add(V(30, 30, 92)), look: () => obj.pos.clone().add(V(0, -3, 0)), fov: 40 },
    { t: 37.0, pos: (t) => obj.pos.clone().add(V(52, 12, 66)), look: () => obj.pos.clone().add(V(3, -4, 0)), fov: 40 },
    { t: 40.6, pos: (t) => obj.pos.clone().add(V(-38, 22, 50)), look: () => obj.pos.clone().add(V(-3, -4, 4)), fov: 40 },
    { t: 43.0, pos: (t) => obj.pos.clone().add(V(-8, 10, 66)), look: () => obj.pos.clone().add(V(-2, -3, 0)), fov: 40 },
    { t: 47.8, pos: (t) => obj.pos.clone().add(V(14, 16, 78)), look: () => obj.pos.clone().add(V(0, -5, 0)), fov: 42 },
    { t: 50.0, pos: (t) => radPos(t, 80, 16, 34), look: () => obj.pos.clone().add(V(0, -2, 0)), fov: 40 },
    { t: 54.0, pos: (t) => radPos(t, 62, 12, 24), look: () => obj.pos.clone().add(V(0, -2, 0)), fov: 40 },
    { t: 56.2, pos: (t) => radPos(t, 70, 18, 30), look: () => obj.pos.clone().add(V(0, -3, 0)), fov: 40 },
    { t: 60, pos: () => W0.pos, look: () => W0.look, fov: 44 },
  ];
  const cr = (p0, p1, p2, p3, u) => {
    const u2 = u * u, u3 = u2 * u;
    return p1.clone().multiplyScalar(2).add(p2.clone().sub(p0).multiplyScalar(u)).add(p0.clone().multiplyScalar(2).sub(p1.clone().multiplyScalar(5)).add(p2.clone().multiplyScalar(4)).sub(p3).multiplyScalar(u2)).add(p1.clone().multiplyScalar(3).sub(p0).sub(p2.clone().multiplyScalar(3)).add(p3).multiplyScalar(u3)).multiplyScalar(0.5);
  };
  const camAt = (t) => {
    let i = 0; while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    let u = clamp((t - k1.t) / (k2.t - k1.t)); u = u * u * (3 - 2 * u) * 0.65 + u * 0.35;
    const P = cr(k0.pos(t), k1.pos(t), k2.pos(t), k3.pos(t), u);
    const L = cr(k0.look(t), k1.look(t), k2.look(t), k3.look(t), u);
    return { P, L, fov: lerp(k1.fov, k2.fov, u) };
  };

  // ---------- object state ----------
  const obj = { pos: V(0, 0, 0), scale: 1 };

  // events for particle bursts
  const BURSTS = [
    { t: 6.4, c: [0xffd36e, 0xff8fb1, 0xffffff] },
    { t: 19.3, c: [0xffd36e, 0xffffff] },
    { t: 20.9, c: [0xff8a5c, 0xffd36e] },
    { t: 21.6, c: [0xff8a5c, 0xffffff] },
    { t: 27.0, c: [0x7ee8ff, 0xffffff] },
    { t: 32.3, c: [0xffd36e, 0xffffff, 0xff8fb1] },
    { t: 32.8, c: [0xffd36e, 0xffffff] },
    { t: 33.2, c: [0xffd36e, 0xffffff] },
    { t: 33.6, c: [0xffd36e, 0xffffff] },
    { t: 34.1, c: [0xe7c9a8, 0xf3dcc6], dust: true },
    { t: 40.9, c: [0xa8f07a, 0xffffff] },
  ];

  // ---------- render ----------
  function render(t) {
    t = clamp(t, 0, 60);
    // clouds drift
    clouds.forEach((c, i) => { c.rotation.y = 0; c.position.x += 0; });

    // car
    const cp = carPose(t); car.position.copy(cp.pos); car.rotation.y = cp.yaw;
    // arm: out of window 0.6-1.4, tilt 1.6-2.6, lift 2.6-4.5, hidden after morph
    const out = ss(1.3, 2.1, t);
    arm.scale.set(1, 1, Math.max(0.001, out));
    const tilt = 0.34 * ss(2.3, 3.2, t) + 0.03 * Math.sin(t * 7) * ss(3.2, 3.6, t);
    hand.rotation.z = tilt;
    arm.rotation.x = -0.34 * ss(3.6, 4.6, t) - 0.02 * Math.sin(t * 9) * ss(3.6, 4.4, t);
    const handVis = t < 6.6;
    arm.visible = t < 7.2; hand.visible = handVis;
    hand.scale.setScalar(1 - ss(6.0, 6.6, t));

    // plane / wing object
    const hw = handWorld(Math.min(t, 6.0));
    let pos, sc, aoa = 0, yaw = 0, roll = 0, pitch = 0, span = 14, m = 0;
    if (t < 32) {
      sc = lerp(0.105, 1, ease(ss(6.0, 9.5, t)));
      const rise = ease(ss(6.2, 10.0, t));
      pos = hw.clone().lerp(STUDIO, rise);
      pos.add(V(2.2 * Math.max(0, t - 15) * ss(15, 17, t) * 0.0, 0.2 * Math.sin(t * 1.6) * ss(9, 11, t), 0));
      aoa = lerp(0.32, 0.22, ss(7, 9, t));
      aoa = lerp(aoa, 0.1, ss(15, 17, t));
      aoa = lerp(aoa, 0.0, ss(23, 25, t));
      m = ease(ss(27.0, 28.8, t));
    } else {
      // assemble while descending onto the runway
      const f = fly(Math.max(34, t)); const land = ease(ss(32.0, 34.1, t));
      const start = STUDIO.clone();
      const ground = V(f.x, f.y, f.z);
      pos = start.lerp(ground, land);
      pos.y += 1.2 * Math.sin(Math.PI * clamp((t - 34.1) / 0.35)) * -1 * (t > 34.1 && t < 34.5 ? 1 : 0);
      sc = 1; m = 1; yaw = f.yaw; pitch = f.pitch; roll = f.roll;
      span = lerp(14, 34, pop(32.3, t, 0.5));
    }
    obj.pos.copy(pos); obj.scale = sc; // logical "wing" position: the camera follows this, never the loop plane
    // seamless loop: plane already flying away in the opening frames
    let loopPlane = false;
    if (t < 6) {
      const f = fly(60), fp = fly(59.9);
      const vx = (f.x - fp.x) * 10, vy = (f.y - fp.y) * 10, vz = (f.z - fp.z) * 10;
      pos = V(f.x + vx * t, f.y + vy * t, f.z + vz * t); sc = 1; m = 1; span = 34; yaw = f.yaw; pitch = f.pitch; roll = f.roll; aoa = 0; loopPlane = true;
    }
    plane.position.copy(pos); plane.scale.setScalar(sc);
    plane.rotation.set(0, 0, 0); plane.rotation.order = "YXZ";
    plane.rotation.y = yaw; plane.rotation.z = aoa + pitch; plane.rotation.x = roll;
    plane.visible = loopPlane ? true : t >= 6.0;
    setWing(m, span);

    // which parts exist
    const full = loopPlane || t >= 32;
    const b = (t0) => (loopPlane ? 1 : pop(t0, t, 0.4));
    fus.visible = full; fus.scale.setScalar(Math.max(0.001, b(32.3)));
    finGrp.scale.setScalar(Math.max(0.001, b(33.2)));
    stab.scale.setScalar(Math.max(0.001, b(33.35)));
    gear.visible = full; gearParts.forEach((g) => g.scale.setScalar(Math.max(0.001, b(33.6))));
    // gear retract 46-47.2
    const retract = loopPlane ? 1 : ss(46, 47.2, t);
    gearParts.forEach((g) => { g.rotation.z = retract * 1.4; if (retract > 0.98) g.visible = false; else g.visible = true; });
    // engines
    const eR = engR, eL = engL;
    const engZ = loopPlane ? -8.5 : t < 32 ? -3.5 : lerp(-3.5, -8.5, pop(32.3, t, 0.5)); // first engine on the far half, so the near tip stays clear for the cutaway
    eR.e.position.set(0.3, 0, engZ); eL.e.position.set(0.3, 0, 8.5);
    eR.e.visible = loopPlane || t >= 18.9;
    eR.pylon.scale.setScalar(Math.max(0.001, b(19.3)));
    const nacS = loopPlane ? 1 : pop(21.6, t, 0.45);
    eR.shell.scale.setScalar(Math.max(0.001, nacS)); eR.lip.scale.setScalar(Math.max(0.001, nacS)); eR.core.scale.setScalar(Math.max(0.001, nacS));
    eR.prop.scale.setScalar(Math.max(0.001, loopPlane ? 1 : pop(20.9, t, 0.4)));
    eL.e.visible = full; eL.e.scale.setScalar(Math.max(0.001, b(32.8)));
    const spin = t * 26;
    [eR, eL].forEach((e) => { e.prop.rotation.x = spin; e.exGlow.material.opacity = (loopPlane || t > 21.8 ? 0.8 : 0) * (0.85 + 0.15 * Math.sin(t * 30)); });

    // control surfaces
    const ctrlVis = full;
    [flapR, flapL, ailR, ailL].forEach((p) => (p.visible = ctrlVis));
    const flap = 0.5 * ss(40.9, 41.7, t) * (1 - ss(46.5, 48, t));
    flapR.rotation.z = flap; flapL.rotation.z = flap;
    // aileron 48.6-51 (bank) + name flash 54.6 ; rudder 49-51 + 55.0 ; elevator 51.2-54.2 + 55.35
    const ail = 0.45 * (ss(48.5, 48.9, t) - ss(50.4, 50.8, t)) + 0.4 * Math.sin((t - 54.6) * 18) * (ss(54.5, 54.6, t) - ss(54.95, 55.0, t));
    ailR.rotation.z = -ail; ailL.rotation.z = ail;
    rudderPivot.rotation.y = 0.4 * (ss(48.8, 49.2, t) - ss(50.4, 50.8, t)) + 0.4 * Math.sin((t - 55) * 18) * (ss(54.95, 55.0, t) - ss(55.3, 55.35, t));
    elevPivot.rotation.z = -0.45 * (ss(51.0, 51.3, t) - ss(52.2, 52.5, t)) + 0.4 * (ss(52.7, 53.0, t) - ss(53.8, 54.1, t)) + 0.4 * Math.sin((t - 55.35) * 18) * (ss(55.3, 55.35, t) - ss(55.8, 55.85, t));
    const glowOn = (o, on, col) => o.traverse((c) => { if (c.isMesh) { c.material.emissive.setHex(col); c.material.emissiveIntensity = on; } });
    glowOn(ailR, ss(48.4, 48.6, t) - ss(50.8, 51.2, t) + (t > 54.55 && t < 55.0 ? 1 : 0), PAL.lift);
    glowOn(ailL, ss(48.4, 48.6, t) - ss(50.8, 51.2, t) + (t > 54.55 && t < 55.0 ? 1 : 0), PAL.lift);
    glowOn(rudderPivot, ss(48.7, 48.9, t) - ss(50.8, 51.2, t) + (t > 54.95 && t < 55.35 ? 1 : 0), PAL.air);
    glowOn(elevPivot, ss(50.9, 51.1, t) - ss(54.1, 54.4, t) + (t > 55.3 && t < 55.9 ? 1 : 0), PAL.thrust);
    glowOn(flapR, ss(40.8, 41.0, t) - ss(43, 44, t), PAL.flaps); glowOn(flapL, ss(40.8, 41.0, t) - ss(43, 44, t), PAL.flaps);

    // cutaway (segment 4): transparent skin, ribs, glowing profile outline at the tip
    const cut = ss(23.4, 24.4, t) * (1 - ss(31.9, 32.4, t));
    wingMat.opacity = 1 - 0.62 * cut; wingMat.depthWrite = cut < 0.1;
    ribs.visible = cut > 0.02;
    ribObjs.forEach((r, i) => { r.geometry = geoCache.get("ribs_" + Math.round(m * 40)) || (geoCache.set("ribs_" + Math.round(m * 40), wingGeo(Math.round(m * 40) / 40, 0.12)), geoCache.get("ribs_" + Math.round(m * 40))); r.position.z = -span / 2 + (i + 0.5) * (span / 6); r.scale.y = 0.96; });
    outlineTube.visible = cut > 0.02;
    if (outlineTube.visible) { setOutline(m, span / 2 + 0.05); outlineTube.material.opacity = cut; outlineTube.material.color.setHex(t > 31.4 && t < 32 ? 0xffffff : PAL.aero); }

    // arrows (segment 2 & 3)
    const sw = sc;
    downArrows.forEach((a, i) => {
      const on = ss(9.5 + i * 0.15, 9.9 + i * 0.15, t) * (1 - ss(14.9, 15.4, t));
      a.visible = on > 0.01; a.scale.setScalar(Math.max(0.001, on) * 3.2 * sw);
      a.position.copy(pos).add(V(-4.5 - i * 0.2, -2.5 - 1.6 * ((t * 1.3 + i * 0.33) % 1), (i - 1) * 4.5));
      a.rotation.set(Math.PI, 0, 0);
    });
    { const on = pop(13.2, t, 0.5) * (1 - ss(14.9, 15.4, t)); liftArrow.visible = on > 0.01; liftArrow.scale.setScalar(Math.max(0.001, on) * 6.5);
      liftArrow.position.copy(pos).add(V(0, 1.0, 0)); const pulse = t > 14.5 && t < 15 ? 1.8 : 0.6; liftArrow.userData.m.emissiveIntensity = pulse; liftArrow.userData.gl.material.opacity = t > 14.5 ? 1 : 0.6; }
    { const on = pop(22.3, t, 0.5) * (1 - ss(23.2, 23.6, t)); thrustArrow.visible = on > 0.01; thrustArrow.scale.setScalar(Math.max(0.001, on) * 6);
      thrustArrow.position.copy(pos).add(V(5.5, -2.6, engZ)); thrustArrow.rotation.set(0, 0, -Math.PI / 2); thrustArrow.userData.m.emissiveIntensity = t > 22.6 ? 1.8 : 0.6; }

    // ---- airflow streaks ----
    plane.updateMatrixWorld(true);
    let k = 0;
    const flowOn = t < 6.6 ? ss(1.6, 2.4, t) : t < 32 ? 1 : 0;
    if (flowOn > 0.01) {
      // flow in the object's frame (chord-normalised), relative flow towards -x
      const isHand = t < 6.4;
      const C = isHand ? 0.62 : CH * sc; // chord in world units
      const O = isHand ? hw : pos.clone();
      const deflect = isHand ? 0.32 * ss(2.3, 3.2, t) : aoa * 1.6 + 0.05;
      const rough = ss(23.6, 24.4, t) * (1 - ss(27.2, 29.8, t));
      const prof = profilePts(m, 12);
      const surfY = (xn, upper) => { // xn chord-normalised (+0.5 LE .. -0.5 TE)
        if (xn > 0.5 || xn < -0.5) return 0; const idx = Math.round((0.5 - xn) * 12);
        const r = (upper ? prof.up : prof.lo)[Math.round(clamp(idx, 0, 12) / 12 * 12)] || [0, 0]; return r[1] / CH;
      };
      const zs = isHand ? [-0.3, 0.3, 0.9] : t > 23 ? [7.6] : [-5, 0, 5, 9];
      const ys = isHand ? [-0.55, -0.25, 0.3, 0.6, 0.95] : t > 23 ? [-0.45, -0.22, 0.14, 0.26, 0.42, 0.65] : [-0.75, -0.42, -0.2, 0.18, 0.4, 0.7, 1.05];
      const perLine = isHand ? 3 : t > 23 ? 5 : 2;
      for (const zz of zs) for (const y0 of ys) for (let j = 0; j < perLine; j++) {
        if (k >= NS) break;
        const s = ((t * (isHand ? 0.9 : 0.55) + j / perLine + (y0 * 3.7 + zz * 1.3) * 0.13) % 1 + 1) % 1;
        const fx = (sv) => 2.2 - 4.6 * sv;
        const fy = (xn) => {
          let y = y0;
          const dec = Math.exp(-Math.abs(y0) * 2.2);
          y += surfY(xn, y0 > 0) * dec * 1.2;
          y += Math.sin(aoa) * (-xn) * dec * (xn > -0.5 && xn < 0.5 ? 1 : 0);
          y -= deflect * ss(0.4, -1.2, xn) * (0.6 + 0.4 * dec) * 1.4;
          y += 0.06 * deflect * ss(1.6, 0.5, xn) * dec;
          if (rough > 0 && y0 > 0) y += rough * 0.16 * Math.sin(xn * 17 + t * 14 + y0 * 9) * ss(0.35, -0.2, xn) * Math.exp(-y0 * 1.2);
          return y;
        };
        const xn = fx(s), xn2 = fx(s + 0.02);
        const p1 = V(xn * C, fy(xn) * C, (isHand ? zz * C : zz * sc)).add(O);
        const p2 = V(xn2 * C, fy(xn2) * C, (isHand ? zz * C : zz * sc)).add(O);
        const dir = p2.clone().sub(p1); const len = (isHand ? 0.55 : 0.5) * C * 0.6;
        const fade = Math.sin(Math.PI * s) * flowOn;
        dummy.position.copy(p1); dummy.quaternion.setFromUnitVectors(XAXIS, dir.clone().normalize());
        const th = (isHand ? 0.018 : 0.022) * C;
        dummy.scale.set(len * fade + 0.0001, th, th);
        dummy.updateMatrix(); streaks.setMatrixAt(k++, dummy.matrix);
      }
    }
    // ground-rush / speed lines on runway and in flight
    const speedOn = t >= 36.8 && t < 56 ? clamp((kmh(t) - 30) / 120) * (1 - ss(54, 56, t)) : 0;
    if (speedOn > 0.01) {
      const f = fly(t); const r2 = mulberry32(99);
      for (let i = 0; i < 70 && k < NS; i++) {
        const oy = -2 + r2() * 14, oz = -14 + r2() * 30, ph = r2();
        const s = ((t * 1.6 + ph) % 1);
        const lx = 30 - 70 * s;
        const p = V(f.x + Math.cos(f.yaw) * lx, f.y + oy, f.z + Math.sin(f.yaw) * lx + oz);
        dummy.position.copy(p); dummy.rotation.set(0, f.yaw, 0);
        dummy.scale.set(6 * speedOn * Math.sin(Math.PI * s) + 0.001, 0.1, 0.1); dummy.updateMatrix(); streaks.setMatrixAt(k++, dummy.matrix);
      }
    }
    for (; k < NS; k++) hide(streaks, k);
    streaks.instanceMatrix.needsUpdate = true;

    // ---- particles: exhaust + bursts ----
    let q = 0; const col = new THREE.Color();
    const exhaustOn = loopPlane || (t > 21.8 && !(t > 24 && t < 32));
    if (exhaustOn && plane.visible) {
      const engs = (full ? [eR, eL] : [eR]);
      for (const e of engs) for (let i = 0; i < 40 && q < NP; i++) {
        const age = ((t * 1.7 + i / 40) % 1); const r2 = mulberry32(i * 31 + (e === eL ? 7 : 0));
        const local = V(-4 - age * 16, (r2() - 0.5) * 1.2 * (1 + age * 2), (r2() - 0.5) * 1.2 * (1 + age * 2));
        e.nac.localToWorld(local);
        dummy.position.copy(local); dummy.rotation.set(r2() * 6, r2() * 6, 0);
        const s = (0.55 + age * 0.9) * (1 - age) * sc; dummy.scale.set(s, s, s); dummy.updateMatrix(); parts.setMatrixAt(q, dummy.matrix);
        col.setHex(age < 0.25 ? 0xffd9a0 : 0xffffff); parts.setColorAt(q, col); q++;
      }
    }
    for (const B of BURSTS) {
      const dtb = t - B.t; if (dtb < 0 || dtb > 1.0) continue;
      const r2 = mulberry32(Math.round(B.t * 100));
      const c0 = B.dust ? V(pos.x - 1, 0.5, pos.z) : B.t < 6.6 ? hw : pos.clone().add(V(B.t > 19 && B.t < 22 ? 2 : 0, B.t > 19 && B.t < 22 ? -2.6 : 0, B.t > 19 && B.t < 22 ? engZ : 0));
      const n = B.dust ? 34 : 22; const spd = (B.dust ? 9 : B.t < 7 ? 3 : 12);
      for (let i = 0; i < n && q < NP; i++) {
        const d = V(r2() - 0.5, B.dust ? r2() * 0.35 : r2() - 0.4, r2() - 0.5).normalize();
        const p = c0.clone().add(d.multiplyScalar(spd * (1 - Math.exp(-dtb * 3.2)))); p.y -= (B.dust ? 0 : 2.5) * dtb * dtb;
        dummy.position.copy(p); dummy.rotation.set(r2() * 6, r2() * 6, dtb * 4);
        const s = (B.dust ? 1.1 : B.t < 7 ? 0.08 : 0.35) * (1 - dtb) * (0.6 + r2()); dummy.scale.set(s, s, s); dummy.updateMatrix(); parts.setMatrixAt(q, dummy.matrix);
        col.setHex(B.c[i % B.c.length]); parts.setColorAt(q, col); q++;
      }
    }
    for (; q < NP; q++) hide(parts, q);
    parts.instanceMatrix.needsUpdate = true; if (parts.instanceColor) parts.instanceColor.needsUpdate = true;

    // ---- camera ----
    const cam = camAt(t);
    camera.position.copy(cam.P); camera.lookAt(cam.L); camera.fov = cam.fov;
    camera.setViewOffset(W, H, 0, H * 0.13, W, H); // look-target sits at ~37% height, captions own the centre
    camera.updateProjectionMatrix();
    // keep shadow camera around the action
    const focus = t < 6.6 ? cp.pos : (t > 33 && t < 50 ? pos : V(0, 0, 0));
    sun.position.set(focus.x - 120, 160, focus.z + 140); sun.target.position.copy(focus);
    renderer.render(scene, camera);
    return { kmh: kmh(t), t };
  }
  function debug(t) {
    render(t);
    const v = plane.position.clone().project(camera);
    return { t, plane: plane.position.toArray().map((x) => +x.toFixed(1)), ndc: [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(3)], visible: plane.visible, cam: camera.position.toArray().map((x) => +x.toFixed(1)) };
  }
  return { render, kmh, debug };
}
