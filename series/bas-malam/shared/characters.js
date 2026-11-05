// BAS MALAM: the cast. Shared by every part (copied into each part's assets/shared/ by tools/sync_shared.sh).
// Every character is built from primitives here, so they look identical in every episode.
// Each factory returns { root, ...parts, pose(state) } where state is plain numbers; no character keeps its own clock.
import * as THREE from "../lib/three.module.min.js";

export const COL = {
  skin: 0xf1efe9,       // the white "mannequin" skin everyone shares
  eye: 0x0a0a0c,
  kauShirt: 0x6d7077,   // KAU: grey T-shirt
  kauBag: 0x1d1e22,
  ainTudung: 0xf2c230,  // AIN: yellow tudung (the one bright colour in the series)
  ainBaju: 0x9cc3e6,    // AIN: light-blue baju kurung
  ainSelipar: 0xd8322b, // AIN: red slippers
  freckle: 0x8a6b5c,
  kondBody: 0x09090b,   // KONDUKTOR: black, featureless
  kondCap: 0x15213d, kondBand: 0xc9a23a, kondTag: 0xe8d9a0, punch: 0xc8ccd2,
  blanketA: 0x8e1f24, blanketB: 0x1b2a4e, // bus blanket check: dark red / navy
  trousers: 0x2a2c33, shoe: 0x141416,
};

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...o });

// ---------- blanket check texture (shared, deterministic) ----------
let _blanketTex = null;
export function blanketTexture() {
  if (_blanketTex) return _blanketTex;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  const A = "#" + COL.blanketA.toString(16).padStart(6, "0"), B = "#" + COL.blanketB.toString(16).padStart(6, "0");
  g.fillStyle = B; g.fillRect(0, 0, 256, 256);
  g.globalAlpha = 0.85; g.fillStyle = A;
  for (let i = 0; i < 4; i++) { g.fillRect(i * 64, 0, 30, 256); g.fillRect(0, i * 64, 256, 30); }
  g.globalAlpha = 0.5; g.fillStyle = "#d9c9a8";
  for (let i = 0; i < 4; i++) { g.fillRect(i * 64 + 44, 0, 3, 256); g.fillRect(0, i * 64 + 44, 256, 3); }
  _blanketTex = new THREE.CanvasTexture(c);
  _blanketTex.wrapS = _blanketTex.wrapT = THREE.RepeatWrapping;
  _blanketTex.repeat.set(2, 2);
  _blanketTex.colorSpace = THREE.SRGBColorSpace;
  return _blanketTex;
}
export const blanketMat = () => std(0xffffff, { map: blanketTexture(), roughness: 0.95 });

// ---------- generic seated/standing body with simple joints ----------
// Units: metres. Origin at the hips (seat contact). Sitting: thighs forward (-z), shins down.
function limb(r, len, mat) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat);
  m.position.y = -len / 2; g.add(m);
  return g;
}

function body({ scale = 1, shirt, trousers = COL.trousers, shoe = COL.shoe, skin = COL.skin, headR = 0.13 }) {
  const s = scale;
  const root = new THREE.Group();
  const hips = new THREE.Group(); root.add(hips);
  const mShirt = std(shirt), mTrou = std(trousers), mSkin = std(skin, { roughness: 0.55 }), mShoe = std(shoe);
  const torso = new THREE.Group(); hips.add(torso);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.15 * s, 0.32 * s, 4, 12), mShirt);
  chest.position.y = 0.27 * s; chest.scale.set(1.05, 1, 0.75); torso.add(chest);
  const neck = new THREE.Group(); neck.position.y = 0.56 * s; torso.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR * s, 32, 24), mSkin);
  head.position.y = headR * s * 0.95; neck.add(head);
  // eyes: open (dots), closed (lines), wide (bigger dots + glint)
  const eyes = new THREE.Group(); head.add(eyes);
  const eyeMat = std(COL.eye, { roughness: 0.3 });
  const mk = (x) => {
    const e = new THREE.Group(); e.position.set(x * headR * s, 0.1 * headR * s, -0.93 * headR * s);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16 * headR * s, 14, 10), eyeMat); dot.scale.z = 0.5; e.add(dot);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.05 * headR * s, 8, 6), std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }));
    glint.position.set(0.05 * headR * s, 0.05 * headR * s, -0.06 * headR * s); e.add(glint);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.32 * headR * s, 0.045 * headR * s, 0.05 * headR * s), eyeMat); e.add(line);
    e.userData = { dot, glint, line }; eyes.add(e); return e;
  };
  const eyeL = mk(-0.36), eyeR = mk(0.36);
  const arm = (side) => {
    const sh = new THREE.Group(); sh.position.set(side * 0.19 * s, 0.47 * s, 0); torso.add(sh);
    const upper = limb(0.05 * s, 0.24 * s, mShirt); sh.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.3 * s; upper.add(elbow);
    const fore = limb(0.042 * s, 0.22 * s, mSkin); elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s, 12, 10), mSkin); hand.position.y = -0.3 * s; hand.scale.set(0.85, 1.1, 0.6); fore.add(hand);
    return { sh, elbow, hand };
  };
  const L = arm(-1), R = arm(1);
  const leg = (side) => {
    const hip = new THREE.Group(); hip.position.set(side * 0.09 * s, 0, 0); hips.add(hip);
    const thigh = limb(0.07 * s, 0.32 * s, mTrou); hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.42 * s; thigh.add(knee);
    const shin = limb(0.055 * s, 0.32 * s, mTrou); knee.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.07 * s, 0.22 * s), mShoe);
    foot.position.set(0, -0.44 * s, -0.05 * s); shin.add(foot);
    return { hip, knee, foot };
  };
  const LL = leg(-1), LR = leg(1);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // state: sit (1 seated, 0 standing), lean (torso pitch), headTilt (roll), headYaw, headPitch,
  //        armL/armR: [shoulderPitch, shoulderRoll, elbow], eyes: "open"|"closed"|"wide"|"none", walk (phase)
  function pose(st = {}) {
    const sit = st.sit ?? 1, walk = st.walk ?? 0, wa = st.walkAmp ?? 0;
    const sw = Math.sin(walk * Math.PI * 2) * wa;
    LL.hip.rotation.x = sit * Math.PI / 2 + sw * 0.45; LR.hip.rotation.x = sit * Math.PI / 2 - sw * 0.45;
    LL.knee.rotation.x = -sit * Math.PI / 2 - Math.max(0, -sw) * 0.5; LR.knee.rotation.x = -sit * Math.PI / 2 - Math.max(0, sw) * 0.5;
    hips.position.y = (1 - sit) * 0.86 * s + Math.abs(Math.sin(walk * Math.PI * 2)) * 0.015 * wa;
    torso.rotation.x = -(st.lean ?? 0);
    neck.rotation.set(-(st.headPitch ?? 0), st.headYaw ?? 0, st.headTilt ?? 0);
    const a = (A, v, side) => { if (!v) return; A.sh.rotation.set(v[0], 0, side * (v[1] || 0)); A.elbow.rotation.x = v[2] || 0; };
    a(L, st.armL || [sw * 0.4, 0.08, 0.15], -1); a(R, st.armR || [-sw * 0.4, 0.08, 0.15], 1);
    const e = st.eyes || "open";
    for (const E of [eyeL, eyeR]) {
      const u = E.userData; E.visible = e !== "none";
      u.dot.visible = e === "open" || e === "wide"; u.glint.visible = e === "wide";
      u.line.visible = e === "closed";
      const k = e === "wide" ? 1.45 : 1; u.dot.scale.set(k, k * (st.squint ? 0.45 : 1), 0.5);
    }
  }
  return { root, hips, torso, neck, head, eyes, eyeL, eyeR, armL: L, armR: R, legL: LL, legR: LR, pose, mats: { mShirt, mSkin } };
}

// ---------- KAU (the viewer) ----------
export function makeKau() {
  const b = body({ shirt: COL.kauShirt });
  // blanket: a draped sheet from lap to (shoulders | over the head), driven by pose({ cover })
  const blanket = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), blanketMat());
  blanket.castShadow = blanket.receiveShadow = true;
  b.hips.add(blanket);
  const base = b.pose;
  b.pose = (st = {}) => {
    base(st);
    const c = st.cover ?? 0; // 0 = lap only, 0.5 = to shoulders, 1 = over the head
    blanket.position.set(0, 0.12 + c * 0.32, -0.08 + c * 0.05);
    blanket.scale.set(1.0 + c * 0.05, 0.6 + c * 1.1, 1.05 - c * 0.15);
    blanket.rotation.x = -0.25 + c * 0.25;
  };
  b.blanket = blanket;
  return b;
}

// ---------- AIN (girl, ~9) ----------
export function makeAin() {
  const b = body({ scale: 0.72, shirt: COL.ainBaju, trousers: COL.ainBaju, shoe: COL.ainSelipar, headR: 0.125 });
  // tudung: a slightly larger shell over the back and top of the head, open at the face
  // open in front (-z) so the face shows: skip a wedge of azimuth around 3π/2
  const tudung = new THREE.Mesh(new THREE.SphereGeometry(0.125 * 0.72 * 1.14, 28, 20, Math.PI * 1.5 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * 0.72), std(COL.ainTudung, { roughness: 0.9, side: THREE.DoubleSide }));
  b.head.add(tudung);
  const brow = new THREE.Mesh(new THREE.TorusGeometry(0.125 * 0.72 * 1.02, 0.012, 8, 24, Math.PI * 0.62), std(COL.ainTudung, { roughness: 0.9 }));
  brow.rotation.set(0, Math.PI / 2, Math.PI / 2 - Math.PI * 0.31); brow.position.set(0, 0.012, -0.012); b.head.add(brow);
  const drape = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.16, 24, 1, true), std(COL.ainTudung, { roughness: 0.9, side: THREE.DoubleSide }));
  drape.position.y = -0.1; b.head.add(drape);
  // freckles
  const fm = std(COL.freckle);
  [[-0.5, -0.25], [-0.42, -0.35], [-0.58, -0.38], [0.5, -0.25], [0.42, -0.35], [0.58, -0.38]].forEach(([x, y]) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 4), fm);
    const r = 0.125 * 0.72; f.position.set(x * r, y * r, -Math.sqrt(Math.max(0, 1 - x * x - y * y)) * r * 1.01); b.head.add(f);
  });
  // her own blanket (over the head until she peeks)
  const blanket = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), blanketMat());
  blanket.castShadow = blanket.receiveShadow = true; b.hips.add(blanket);
  const base = b.pose;
  b.pose = (st = {}) => {
    base(st);
    const c = st.cover ?? 1;   // 1 = over the head, 0 = lap
    const pk = st.peek ?? 0;   // 0..1: the blanket slides back off her face like a hood
    blanket.position.set(0, 0.08 + c * 0.25, -0.05 + pk * 0.2);
    blanket.scale.set(1.0, 0.6 + c * 1.1, 1.0 - c * 0.1);
    blanket.rotation.x = -0.25 + c * 0.25 + pk * 0.35;
  };
  b.blanket = blanket;
  return b;
}

// ---------- KONDUKTOR ----------
export function makeKonduktor() {
  const b = body({ shirt: COL.kondBody, trousers: COL.kondBody, shoe: 0x050506, skin: COL.kondBody, headR: 0.135 });
  b.mats.mSkin.roughness = 0.32; b.mats.mSkin.metalness = 0.15; // the blank glossy face catches the torch
  b.eyes.visible = false;
  b.eyes.scale.setScalar(0.0001);
  const cap = new THREE.Group(); cap.position.y = 0.105; b.head.add(cap);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.135, 0.09, 28), std(COL.kondCap, { roughness: 0.6 }));
  crown.position.y = 0.03; cap.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.137, 0.137, 0.025, 28), std(COL.kondBand, { metalness: 0.6, roughness: 0.35 }));
  band.position.y = -0.005; cap.add(band);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 24, 1, false, Math.PI * 0.5, Math.PI), std(0x050508, { roughness: 0.3 }));
  brim.position.set(0, -0.02, -0.11); brim.scale.set(1.2, 1, 0.8); cap.add(brim);
  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.02, 0.006), std(COL.kondTag, { metalness: 0.7, roughness: 0.25, emissive: 0x403418, emissiveIntensity: 0.6 }));
  tag.position.set(0.075, 0.38, -0.115); b.torso.add(tag);
  const punch = new THREE.Group();
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.11, 0.025), std(COL.punch, { metalness: 0.8, roughness: 0.3 })); punch.add(p1);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.02), std(COL.punch, { metalness: 0.8, roughness: 0.3 })); p2.position.set(0, -0.02, -0.03); p2.rotation.x = 0.35; punch.add(p2);
  punch.position.set(0, -0.06, -0.02); b.armR.hand.add(punch);
  // torch in the left hand (the spotlight itself is owned by the scene so it can be switched per shot)
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.15, 12), std(0x222226, { metalness: 0.5, roughness: 0.4 }));
  torch.rotation.x = Math.PI / 2; torch.position.set(0, -0.04, -0.06); b.armL.hand.add(torch);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.019, 16), new THREE.MeshBasicMaterial({ color: 0xfff2d0 }));
  lens.position.set(0, -0.04, -0.136); lens.rotation.y = Math.PI; b.armL.hand.add(lens);
  b.cap = cap; b.tag = tag; b.punch = punch; b.torch = torch; b.lens = lens;
  b.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return b;
}

// ---------- PENUMPANG: a seated person under a blanket, head and all ----------
export function makePenumpang(seed = 1) {
  const rnd = (k) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const shirts = [0x3d4250, 0x5a4a3c, 0x2f3a33, 0x4a3046, 0x6b6e75, 0x2b3346];
  const b = body({ shirt: shirts[Math.floor(rnd(1) * shirts.length)], trousers: [0x23252c, 0x3a3226, 0x1e2733][Math.floor(rnd(2) * 3)], scale: 0.94 + rnd(3) * 0.1 });
  b.eyes.visible = false;
  const shroud = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), blanketMat());
  shroud.position.set(0, 0.36, -0.03); shroud.scale.set(0.95, 2.0, 0.85); shroud.rotation.z = (rnd(4) - 0.5) * 0.15;
  shroud.castShadow = shroud.receiveShadow = true; b.hips.add(shroud);
  b.head.visible = false; b.armL.sh.visible = rnd(5) > 0.6; b.armR.sh.visible = rnd(6) > 0.75;
  b.shroud = shroud;
  b.rnd = rnd;
  return b;
}

// ---------- ORANG R&R: standing figure, faceless, arms down, facing the bus ----------
export function makeOrangRnR(seed = 1, covered = false) {
  const b = body({ shirt: [0xbab7b0, 0x8f8d88, 0xa8a49b][seed % 3], trousers: 0x6d6a66, scale: 0.92 + ((seed * 37) % 10) / 70 });
  b.eyes.visible = false;
  if (covered) {
    const shroud = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), blanketMat());
    shroud.position.set(0, 0.55, 0); shroud.scale.set(1, 2.1, 0.95); b.torso.add(shroud); b.head.visible = false;
  }
  b.pose({ sit: 0, armL: [0, 0.05, 0.05], armR: [0, 0.05, 0.05] });
  return b;
}
