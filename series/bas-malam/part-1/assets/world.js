// BAS MALAM Part 1: the film. Every frame is a pure function of film time t (seconds).
// Beat times come from assets/timing.js (real voice times), so picture and voice can never drift.
import * as THREE from "./lib/three.module.min.js";
import { L, W, DURATION } from "./timing.js";
import { makeKau, makeAin, makeKonduktor, makePenumpang, makeOrangRnR } from "./shared/characters.js";
import { BUS, rowZ, seatHip, buildBus, buildRnR } from "./shared/bus.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, u) => a.clone().lerp(b, u);
const S = (id) => L[id][0], E = (id) => L[id][1];
const w = (id, k) => W[id][Math.min(k, W[id].length - 1)][0];
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

// ---------- beats (film time) ----------
export const T = {
  wake: E(1) - 0.9,
  standUp: w(11, 6) - 0.4,              // "berdiri"
  walk1: [S(13), S(14)],                // front -> row 0
  taps0: [w(14, 0), w(14, 1), w(14, 2)],
  walk2: [S(15) + 0.3, S(18) - 0.2],    // row 0 -> row 7, silent counting
  taps7: [w(18, 0), w(18, 3)],
  arrive: S(19),
  tapKau: w(19, 7),                     // "ketuk"
  tapAin: S(22),
  tilt: [S(23), E(24)],
  pull: w(16, 1),                       // "tarik"
  blanketPOV: [S(17), S(19)],
  stop: w(25, 3),                       // "berhenti"
  lightsOn: w(25, 6),                   // "menyala"
  exitStart: S(26) + 0.6,
  curtainPull: S(28) - 0.2,
  grab: S(30) + 0.5,
  peek: S(31) - 0.3,
  doorOpen: S(26) + 1.0,
  mirrorEyes: w(34, 13),                // "pemandu"
  pillA: S(33), pillB: S(34),
  endCard: E(35) + 0.4,
};

export function createWorld(canvas, Wd, Hd, scale = 1) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(Math.round(Wd * scale), Math.round(Hd * scale), false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.4;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020306);
  scene.fog = new THREE.FogExp2(0x05060a, 0.035);
  const camera = new THREE.PerspectiveCamera(42, Wd / Hd, 0.02, 200);

  const bus = buildBus(scene);
  const rnr = buildRnR(scene, (i, covered) => makeOrangRnR(i + 3, covered));

  // ---------- cast ----------
  const kau = makeKau(); scene.add(kau.root); kau.root.position.copy(seatHip(BUS.kauRow, "A"));
  const ain = makeAin(); scene.add(ain.root); ain.root.position.copy(seatHip(BUS.kauRow, "B")).add(V(0, -0.02, 0.02));
  const kond = makeKonduktor(); scene.add(kond.root);
  // AIN's small hand on KAU's sleeve (her arm is under the blanket; only the hand comes out)
  const grabHand = new THREE.Group(); scene.add(grabHand);
  { const m = new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 0.55 });
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10), m); palm.scale.set(1, 0.55, 1.25); grabHand.add(palm);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.03, 3, 6), m); f.position.set(-0.03, -0.012, -0.024 + i * 0.016); f.rotation.z = 1.2; grabHand.add(f); }
    const wrist = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.12, 4, 8), new THREE.MeshStandardMaterial({ color: 0x9cc3e6, roughness: 0.9 }));
    wrist.position.set(0.09, 0.01, 0); wrist.rotation.z = Math.PI / 2; grabHand.add(wrist); }
  const faceLight = new THREE.PointLight(0xffb070, 0, 2.2, 1.5); faceLight.position.set(-1.05, 1.35, 3.55); scene.add(faceLight);
  const stickerLight = new THREE.PointLight(0xffc890, 0, 1.6, 1.5); stickerLight.position.set(-0.75, 1.15, 3.95); scene.add(stickerLight);
  const rim = new THREE.PointLight(0x7f9bff, 0, 2.6, 1.6); scene.add(rim);   // cool rim so the black figure reads against black
  const pass = [];
  let n = 0;
  for (let r = 0; r < BUS.rows; r++) for (const s of ["A", "B", "C"]) {
    if (r === BUS.kauRow && (s === "A" || s === "B")) continue;
    const p = makePenumpang(++n); scene.add(p.root);
    p.home = seatHip(r, s); p.row = r; p.seat = s; p.root.position.copy(p.home);
    pass.push(p);
  }

  // ---------- konduktor path ----------
  const AX = BUS.aisleX, zFront = rowZ(-1) + 0.05;
  const seatTarget = (r, s) => seatHip(r, s).add(V(0, 0.75, 0));
  function kondState(t) {
    // returns { pos, yaw, sit, walk, walkAmp, armR, armL, headTilt, headPitch, aim, torch }
    const st = { pos: V(BUS.seatX.C, BUS.seatY, rowZ(-1) - 0.05), yaw: 0, sit: 1, walk: 0, walkAmp: 0, armR: [0.3, 0.05, 0.6], armL: [0.6, 0.1, 0.9], headTilt: 0, headPitch: 0, torch: 0, aim: null };
    if (t < T.standUp) return st;
    // stand + step into the aisle, turn to face the back (+z)
    const su = ss(T.standUp, T.standUp + 1.2, t);
    st.sit = 1 - su; st.pos = V(lerp(BUS.seatX.C, AX, ss(T.standUp + 0.6, T.standUp + 1.6, t)), BUS.seatY, zFront);
    st.yaw = Math.PI * ss(T.standUp + 0.7, T.standUp + 1.8, t);
    st.torch = ss(S(12) - 0.2, S(12) + 0.4, t);
    if (t >= S(25) && t < T.lightsOn) { st.torch = 0; }
    // walking
    let z = zFront, walking = 0;
    const seg = (a, b, z0, z1) => { if (t > a && t < b) walking = 1; return lerp(z0, z1, clamp((t - a) / (b - a))); };
    if (t >= T.walk1[0]) z = seg(T.walk1[0], T.walk1[1], zFront, rowZ(0) - 0.15);
    if (t >= T.walk2[0]) z = seg(T.walk2[0], T.walk2[1], rowZ(0) - 0.15, rowZ(7) - 0.1);
    if (t >= T.arrive - 0.2) z = seg(T.arrive - 0.2, T.arrive + 0.9, rowZ(7) - 0.1, rowZ(8) - 0.25);
    st.pos.z = z; st.walk = t * 0.9; st.walkAmp = walking * 0.9;
    // aim the torch: floor ahead while walking, at a head while tapping
    st.aim = V(AX, 0.0, z + 1.8);
    const tap = (t0, r, s, arm = "R") => {
      const u = clamp((t - (t0 - 0.35)) / 0.75);
      if (u <= 0 || u >= 1) return false;
      const target = seatTarget(r, s);
      const dx = target.x - st.pos.x, dz = target.z - st.pos.z;
      st.yaw = Math.atan2(-dx, -dz);
      const lift = Math.sin(u * Math.PI);
      st.armR = [0.6 + lift * 0.9, 0.0, 0.4 + (1 - lift) * 0.4];
      st.aim = target; return true;
    };
    T.taps0.forEach((tt, i) => tap(tt, 0, ["A", "B", "C"][i]));
    // silent counting while walking rows 1..6 (one tap per row, alternating sides)
    for (let r = 1; r <= 6; r++) { const tt = lerp(T.walk2[0], T.walk2[1], r / 7) + 0.25; tap(tt, r, r % 2 ? "B" : "C"); }
    T.taps7.forEach((tt, i) => tap(tt, 7, ["C", "B"][i]));
    const faceKau = () => { const g = seatTarget(8, "A"); return Math.atan2(-(g.x - st.pos.x), -(g.z - st.pos.z)); };
    if (t >= T.arrive + 0.6) st.yaw = lerp(Math.PI, faceKau(), ss(T.arrive + 0.6, T.arrive + 1.2, t));
    tap(T.tapKau, 8, "A"); tap(T.tapAin, 8, "B");
    if (t >= T.tilt[0] && t < S(25)) {
      st.headTilt = -0.55 * ss(T.tilt[0], T.tilt[0] + 2.2, t); st.headPitch = 0.35 * ss(T.tilt[0], T.tilt[1], t);
      st.aim = seatTarget(8, "A").add(V(0, 0.15, 0));
      st.yaw = faceKau();
    }
    if (t >= T.arrive && t < S(25)) { st.aim = st.aim || seatTarget(8, "A"); }
    // the PA announcement from the front, then waiting by the door
    if (t >= S(25) + 0.9) {
      st.pos = V(-0.35, BUS.seatY, rowZ(-1) - 0.25); st.yaw = Math.PI - 0.25; st.sit = 0; st.walkAmp = 0; st.headTilt = 0; st.headPitch = 0;
      st.armR = t < E(26) + 0.4 ? [1.35, -0.25, 1.7] : [0.2, 0.05, 0.3];  // mic to the face
      st.armL = [0.1, 0.05, 0.2]; st.torch = 0; st.aim = null;
    }
    return st;
  }

  // ---------- passengers leaving (from the front rows back) ----------
  const doorZ = BUS.front + 1.0;
  function passState(p, t) {
    const order = p.row * 3 + { C: 0, B: 1, A: 2 }[p.seat];
    const t0 = T.exitStart + order * 0.33;
    if (t < t0) return { pos: p.home, sit: 1, yaw: 0, walk: 0, walkAmp: 0, visible: true, sway: Math.sin(t * 0.7 + p.row) * 0.02 };
    const su = ss(t0, t0 + 0.8, t);
    const toAisle = ss(t0 + 0.6, t0 + 1.4, t);
    const pos = V(lerp(p.home.x, AX, toAisle), p.home.y, p.home.z);
    const dist = (p.home.z - doorZ);
    const tw = t - (t0 + 1.3), speed = 1.05;
    let yaw = toAisle * (p.home.x < AX ? -0.6 : 0.6) * (1 - ss(t0 + 1.0, t0 + 1.5, t));
    if (tw > 0) pos.z = p.home.z - Math.min(dist, tw * speed);
    const atDoor = tw * speed >= dist;
    if (atDoor) { const u = clamp((tw * speed - dist) / 0.9); pos.x = lerp(AX, -BUS.halfW - 0.3, u); yaw = Math.PI / 2 * 0.0 + 0.9; }
    return { pos, sit: 1 - su, yaw, walk: t * 0.9 + p.row * 0.3, walkAmp: tw > 0 ? 0.8 : 0, visible: !(atDoor && pos.x < -BUS.halfW - 0.1), sway: 0 };
  }

  // ---------- camera shots ----------
  const kauHead = () => { kau.head.updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixPosition(kau.head.matrixWorld); };
  const ainHead = () => { ain.head.updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixPosition(ain.head.matrixWorld); };
  const kondHead = () => { kond.head.updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixPosition(kond.head.matrixWorld); };
  const stick = (u, v) => bus.stickerPoint(u, v);
  const signPos = V(-BUS.halfW - 7.5, 3.9, -2.5);
  const doorPos = V(-BUS.halfW, 1.05, doorZ);
  const mirrorPos = V(0.1, 1.74, BUS.front + 0.35);

  // each: [t0, fn(u, t) -> { p, l, fov, hide: [...] }]; u = 0..1 across the shot
  const SH = [
    [0, (u) => { const h = kauHead(); return { p: h.clone().add(V(0.78, 0.1, -0.85 + u * 0.12)), l: h.clone().add(V(0, -0.1, 0)), fov: 38 }; }],
    [S(2), (u) => ({ p: V(AX, 1.62, 4.75 - u * 0.4), l: V(AX - 0.05, 0.95, -6), fov: 50 })],
    [S(3), (u) => { const z = lerp(-2.4, 0.9, u); return { p: V(0.62, 1.55, z), l: V(-1.0, 0.85, z + 0.5), fov: 48 }; }],
    [S(4), (u) => ({ p: V(0.38, 0.78, 3.3 - u * 0.05), l: V(-0.5, 0.32, 3.95), fov: 50 })],
    [S(5), (u) => ({ p: V(0.4, 1.3, 3.35 + u * 0.08), l: V(-0.8, 0.85, 4.05), fov: 42 })],
    [S(6), (u) => ({ p: V(0.05, 1.35, 2.6), l: V(-1.25, 1.31, lerp(2.0, 1.4, u)), fov: 44 })],
    [w(6, 3), (u) => ({ p: lerpV(V(AX, 1.6, -1.2), V(0.4, 1.8, -4.6), ss(0, 1, u)), l: V(0.55, 1.93, BUS.front + 0.09), fov: 40 })],
    [S(7), (u) => { const c = stick(0.5, 0.5); return { p: c.clone().add(V(0.05, 0.06, 0.62 - u * 0.12)), l: c, fov: 40 }; }],
    [S(8), (u) => { const c = stick(lerp(0.3, 0.7, u), 0.55); return { p: c.clone().add(V(0, 0.02, 0.3)), l: c, fov: 40 }; }],
    [S(9), (u) => { const c = stick(0.3, 0.36); return { p: c.clone().add(V(0, 0, 0.27 - u * 0.05)), l: c, fov: 40 }; }],
    [S(10), (u) => { const h = kauHead(); return { p: h.clone().add(V(0.7, 0.02, -0.75 + u * 0.1)), l: h.clone().add(V(0, -0.06, 0)), fov: 34 }; }],
    [S(11), (u) => ({ p: V(AX, 1.3, 2.4), l: V(0.35, 1.25, -4.5), fov: 30 - u * 4 })],
    [S(12), (u) => { const h = kondHead(); return { p: h.clone().add(V(-0.3, -0.2, 1.25 - u * 0.2)), l: h.clone().add(V(0, -0.3 - 0.1 * u, 0)), fov: 36 }; }],
    [S(13), (u) => { const h = kondHead(); return { p: V(AX + 0.05, 1.4, -0.6), l: h.clone().add(V(0, -0.3, 0)), fov: 36 }; }],
    [T.taps0[0] - 0.25, () => ({ p: V(0.35, 1.45, rowZ(0) + 0.75), l: seatTarget(0, "A").add(V(0, 0.15, 0)), fov: 40 })],
    [T.taps0[1] - 0.25, () => ({ p: V(-0.1, 1.85, rowZ(0) - 0.55), l: seatTarget(0, "B").add(V(0, 0.1, 0)), fov: 44 })],
    [T.taps0[2] - 0.25, () => ({ p: V(0.15, 1.4, rowZ(0) + 0.6), l: seatTarget(0, "C").add(V(0, 0.15, 0)), fov: 40 })],
    [S(15), (u) => ({ p: V(-0.45, 1.42, 4.45), l: V(AX, 1.2, rowZ(0)), fov: 30 })],
    [S(16), (u) => { const h = kauHead(); return { p: h.clone().add(V(0.95, 0.1, -0.55)), l: h.clone().add(V(0, -0.2, 0)), fov: 40 }; }],
    [T.blanketPOV[0], () => { const h = kauHead(); return { p: h.clone().add(V(0, 0, -0.05)), l: h.clone().add(V(0.25, -0.05, -1)), fov: 50, hide: [kau.head, kau.blanket] }; }],
    [S(19), (u) => ({ p: V(0.45, 1.5, 3.05), l: V(-0.6, 1.05, 4.05), fov: 40 })],
    [S(20), (u) => { const h = kondHead(); return { p: V(-0.7, 0.9, 4.1), l: h.clone().add(V(0, -0.15, 0)), fov: 50 - u * 4 }; }],
    [S(21), (u) => ({ p: V(0.85, 1.65, 4.6), l: ainHead().add(V(0, -0.05, 0)), fov: 40 })],
    [S(23), (u) => { const h = kondHead(); return { p: V(-0.72, 0.95, 4.1).lerp(h, u * 0.15), l: h.clone().add(V(0, -0.08, 0)), fov: 52 - u * 14 }; }],
    [S(25), (u, t) => { const sh = (1 - ss(T.stop - 0.4, T.stop + 0.6, t)) * 0.004; return { p: V(-0.55 + Math.sin(t * 41) * sh, 1.32 + Math.sin(t * 57) * sh, 2.1), l: V(-1.25, 1.3, 1.3), fov: 42 }; }],
    [w(25, 4) - 0.15, (u) => ({ p: V(AX, 1.62, 4.75), l: V(AX - 0.05, 1.0, -6), fov: 48 })],
    [S(26), (u) => { const h = kondHead(); return { p: V(AX, 1.5, -1.6 + u * 0.2), l: h.clone().add(V(0, -0.1, 0)), fov: 34 }; }],
    [S(27), (u) => ({ p: V(-0.3, 1.3, 4.55), l: V(AX, 1.0, -5.5), fov: 44 })],
    [S(28), (u) => ({ p: V(-0.98, 1.3, 4.0), l: V(-6, 1.7, lerp(2.2, 0.5, u)), fov: 46, hide: [kau.head] })],
    [w(28, 5), (u) => ({ p: V(-1.15, 1.32, 3.65), l: signPos, fov: 26 - u * 3, hide: [kau.head] })],
    [S(29), (u) => ({ p: V(-1.12, 1.3, 3.8), l: V(-9.5, 0.9, -0.8), fov: 44 - u * 10, hide: [kau.head] })],
    [S(30), (u) => ({ p: V(-0.12, 1.45, 3.15), l: V(-0.6, 0.86, 3.62), fov: 32 })],
    [S(31), (u) => { const h = ainHead(); return { p: h.clone().add(V(0.12, 0.02, -0.62 + u * 0.1)), l: h.clone().add(V(0, -0.02, 0)), fov: 32 }; }],
    [S(32), (u) => ({ p: V(AX, 1.45, 3.4 - u * 0.4), l: doorPos, fov: 40 })],
    [S(34), (u) => ({ p: V(0.55, 1.55, 2.85), l: V(-0.72, 0.85, 4.05), fov: 42 })],
    [w(34, 12) - 0.1, (u) => ({ p: V(0.1, 1.62, lerp(-4.0, -4.6, u)), l: mirrorPos, fov: 34 })],
    [S(35), (u) => ({ p: V(0.85, 1.65, 4.6), l: V(-0.45, 1.2, -4.5), fov: 52 })],
  ];
  const shotAt = (t) => { let i = 0; for (let k = 0; k < SH.length; k++) if (t >= SH[k][0]) i = k; return i; };

  const tmpV = new THREE.Vector3();
  function project(v) { tmpV.copy(v).project(camera); return { x: (tmpV.x * 0.5 + 0.5) * Wd, y: (-tmpV.y * 0.5 + 0.5) * Hd, vis: tmpV.z < 1 && Math.abs(tmpV.x) < 1.05 && Math.abs(tmpV.y) < 1.05 }; }

  // ---------- render ----------
  let hidden = [];
  function render(t) {
    // KAU
    const wake = ss(T.wake, T.wake + 0.6, t);
    const cover = t < T.pull ? 0.5 : t < S(27) - 0.4 ? lerp(0.5, 1, ss(T.pull, T.pull + 0.8, t)) : lerp(1, 0.55, ss(S(27) - 0.4, S(27) + 0.4, t));
    let kEyes = t < T.wake + 0.2 ? "closed" : "open";
    if (t >= S(10) && t < E(10) + 0.3) kEyes = "open";
    if (t >= S(15) && t < T.pull + 0.4) kEyes = "wide";
    if (t >= S(31)) kEyes = "wide";
    kau.pose({ sit: 1, cover, eyes: kEyes, headTilt: -0.32 * (1 - wake), headPitch: 0.1 * (1 - wake) + (t >= S(5) && t < E(5) ? 0.5 : 0) - (t >= S(10) && t < E(10) ? 0.0 : 0),
      headYaw: t >= S(10) && t < E(10) + 0.3 ? 0.18 : 0,
      armL: [0.7, 0.15, 0.6], armR: [0.75 + 1.5 * Math.sin(Math.PI * ss(T.pull - 0.4, T.pull + 1.0, t)), -0.1, 0.65 + 1.0 * Math.sin(Math.PI * ss(T.pull - 0.4, T.pull + 1.0, t))] });
    if (t >= S(10) && t < E(10)) kau.neck.rotation.z = 0.12;
    // AIN
    const peek = ss(T.peek, T.peek + 0.5, t);
    const grab = ss(T.grab, T.grab + 0.45, t);
    ain.pose({ sit: 1, cover: 1, peek, eyes: peek > 0.5 ? "wide" : "none", headTilt: -0.12 * peek, headYaw: 0.35 * peek,
      armL: [0.55 + grab * 0.6, grab * 0.9, 0.5 + grab * 0.5], armR: [0.6, 0.05, 0.6] });
    ain.legL.knee.rotation.x = -1.2; ain.legR.knee.rotation.x = -1.25;
    ain.legL.hip.rotation.x = 1.45 + Math.sin(t * 1.3) * 0.04; ain.legR.hip.rotation.x = 1.45 - Math.sin(t * 1.3 + 1) * 0.04;
    grabHand.visible = t >= T.grab - 0.1;
    grabHand.position.copy(lerpV(V(-0.45, 0.86, 3.68), V(-0.62, 0.88, 3.6), grab));
    grabHand.rotation.set(0, 0, -0.2 * grab);
    stickerLight.intensity = t >= S(7) - 0.1 && t < S(10) ? 0.75 : 0;
    { const sh = shotAt(t); const faceShots = [0, 3, 4, 10, 18, 31, 32]; faceLight.intensity = faceShots.includes(sh) && t < T.lightsOn ? 1.6 + 0.6 * Math.sin(t * 1.3) : 0; }
    // KONDUKTOR
    const k = kondState(t);
    kond.root.position.copy(k.pos); kond.root.rotation.y = k.yaw;
    kond.pose({ sit: k.sit, walk: k.walk, walkAmp: k.walkAmp, armR: k.armR, armL: k.armL, headTilt: k.headTilt, headPitch: k.headPitch, eyes: "none" });
    if (t >= S(14) - 1 && t < S(25)) kond.armL.sh.rotation.set(0.9, 0, -0.15);  // torch forward
    rim.position.set(k.pos.x + Math.sin(k.yaw) * 0.7, 1.75, k.pos.z + Math.cos(k.yaw) * 0.7);
    rim.intensity = t >= T.standUp && t < T.lightsOn ? 4 : 0;
    // PASSENGERS
    for (const p of pass) {
      const s = passState(p, t);
      p.root.visible = s.visible; p.root.position.copy(s.pos); p.root.rotation.y = s.yaw;
      p.pose({ sit: s.sit, walk: s.walk, walkAmp: s.walkAmp, armL: [0.05, 0.08, 0.1], armR: [0.05, 0.08, 0.1] });
      p.torso.rotation.z = s.sway;
    }
    // LIGHTS
    const fl = t - T.lightsOn;
    const on = fl < 0 ? 0 : fl < 0.06 ? 1 : fl < 0.13 ? 0.05 : fl < 0.2 ? 0.9 : fl < 0.27 ? 0.3 : 1;
    const moving = 1 - ss(T.stop - 1.2, T.stop, t);
    const period = 2.9, ph = ((t * (0.6 + 0.4 * moving)) % period) / period;
    const sweep = Math.exp(-Math.pow((ph - 0.5) / 0.09, 2));
    bus.setLights({ on, streetL: moving > 0.01 ? sweep * 9 * moving : (t > T.stop ? 6 : 0), streetZ: moving > 0.01 ? lerp(-6, 5, ph) : 2.0, streetR: sweep * 5 * moving });
    bus.nightPlanes[0].visible = t < T.stop;            // left: the R&R becomes visible
    rnr.grp.visible = t >= T.stop;
    // torch
    const torchOn = t < T.lightsOn ? k.torch : 0;
    kond.lens.material.color.setScalar(0.2 + torchOn * 0.8);
    bus.torch.intensity = torchOn * 45;
    kond.lens.updateWorldMatrix(true, false);
    bus.torch.position.setFromMatrixPosition(kond.lens.matrixWorld);
    if (k.aim) bus.torch.target.position.copy(k.aim); else bus.torch.target.position.copy(bus.torch.position).add(V(0, -1, 1));
    // curtain pulled aside by KAU's hand
    const cp = ss(T.curtainPull, T.curtainPull + 0.7, t);
    bus.kauCurtain.m.scale.x = 1 - cp * 0.55; bus.kauCurtain.m.position.z = bus.kauCurtain.z + cp * 0.33;
    // door
    const dOpen = ss(T.doorOpen, T.doorOpen + 0.9, t);
    bus.door.position.set(-BUS.halfW - dOpen * 0.08, 0.97, doorZ - dOpen * 0.8);
    bus.doorGlow.material.opacity = dOpen * 0.35;
    // driver eyes in the mirror
    bus.mirrorEyes.visible = t >= T.mirrorEyes;
    bus.eyeMat.opacity = ss(T.mirrorEyes, T.mirrorEyes + 0.5, t);

    // CAMERA
    const i = shotAt(t), t0 = SH[i][0], t1 = i + 1 < SH.length ? SH[i + 1][0] : DURATION;
    const u = clamp((t - t0) / Math.max(0.01, t1 - t0));
    for (const o of hidden) o.visible = true;
    const c = SH[i][1](u, t);
    hidden = c.hide || []; for (const o of hidden) o.visible = false;
    camera.position.copy(c.p); camera.lookAt(c.l); camera.fov = c.fov; camera.updateProjectionMatrix();
    // a whisper of handheld drift, seeded by time
    camera.rotation.z += Math.sin(t * 0.7) * 0.004; camera.rotateX(Math.sin(t * 0.53 + 1) * 0.003); camera.rotateY(Math.sin(t * 0.41 + 2) * 0.003);
    renderer.render(scene, camera);

    return {
      shot: i,
      pillA: project(doorPos), pillB: project(ainHead().add(V(-0.2, 0.1, 0))),
      kondDist: kond.root.position.distanceTo(kau.root.position), torchOn,
    };
  }
  return { render, T };
}
