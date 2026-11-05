// BAS MALAM: the cast (v2 "clean" look). Shared by every part (copied into each part's assets/shared/ by tools/sync_shared.sh).
// Every character is built from primitives here, so they look identical in every episode.
// Each factory returns { root, ...parts, pose(state) }; state is plain numbers, no character keeps its own clock.
// Look: smooth satin mannequins with big round heads, soft folds of cloth, one glossy black villain.
import * as THREE from "three";

export const COL = {
  skin: 0xf3f1ec, eye: 0x08080a,
  kauShirt: 0x5d6168, kauHoodie: 0x3c4048, kauBag: 0x1d1e22,
  ainTudung: 0xf2c230, ainBaju: 0xa9cbe8, ainSelipar: 0xd8322b, freckle: 0x9a7362,
  kondSkin: 0x050506, kondJacket: 0x121a30, kondShirt: 0xe9e6df, kondCap: 0x101830, kondBand: 0xc9a23a, kondTag: 0xe8d9a0, punch: 0xc8ccd2,
  blanketA: 0x8e1f24, blanketB: 0x1b2a4e,
  trousers: 0x262830, shoe: 0x131316,
};

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o });
const satin = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.42, metalness: 0, sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), ...o });

// ---------- blanket check (shared, deterministic) ----------
let _blanketTex = null;
export function blanketTexture() {
  if (_blanketTex) return _blanketTex;
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d");
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");
  g.fillStyle = hex(COL.blanketB); g.fillRect(0, 0, 512, 512);
  g.globalAlpha = 0.9; g.fillStyle = hex(COL.blanketA);
  for (let i = 0; i < 4; i++) { g.fillRect(i * 128, 0, 56, 512); g.fillRect(0, i * 128, 512, 56); }
  g.globalAlpha = 0.55; g.fillStyle = "#d9c9a8";
  for (let i = 0; i < 4; i++) { g.fillRect(i * 128 + 88, 0, 5, 512); g.fillRect(0, i * 128 + 88, 512, 5); }
  g.globalAlpha = 0.07; let s = 99;   // woven fuzz
  for (let i = 0; i < 9000; i++) { s = (s * 16807) % 2147483647; const x = s % 512; s = (s * 16807) % 2147483647; const y = s % 512; g.fillStyle = i % 2 ? "#fff" : "#000"; g.fillRect(x, y, 2, 1); }
  _blanketTex = new THREE.CanvasTexture(c);
  _blanketTex.wrapS = _blanketTex.wrapT = THREE.RepeatWrapping; _blanketTex.repeat.set(1.6, 1.6);
  _blanketTex.colorSpace = THREE.SRGBColorSpace; _blanketTex.anisotropy = 8;
  return _blanketTex;
}
export const blanketMat = () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: blanketTexture(), roughness: 0.92, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(0x8899cc), side: THREE.DoubleSide });

// ---------- cloth shapes ----------
// A blanket thrown over a seated person, head and all: a lathe profile with soft folds that deepen toward the hem.
// `open` (radians) leaves a gap at the front (-z) so a face can peek out.
export function shroudGeometry({ seed = 1, h = 1.0, r = 1.0, open = 0 } = {}) {
  const P = [[0.0, 0.98], [0.07, 0.975], [0.12, 0.95], [0.155, 0.89], [0.165, 0.82], [0.15, 0.73], [0.14, 0.67], [0.2, 0.6], [0.25, 0.54],
    [0.255, 0.42], [0.245, 0.3], [0.255, 0.18], [0.275, 0.08], [0.29, 0.02]].map(([x, y]) => new THREE.Vector2(x * r, y * h));
  const g = new THREE.LatheGeometry(P, 56, Math.PI * 1.5 + open, Math.PI * 2 - 2 * open);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), low = Math.max(0, 1 - y / (0.98 * h));
    const fold = Math.sin(a * 7 + seed * 1.7) * 0.6 + Math.sin(a * 13 + seed * 0.9) * 0.4;
    const k = 1 + fold * 0.07 * Math.pow(low, 1.6);
    p.setXYZ(i, x * k, y, z * k * 0.86);
    uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 2.2);
  }
  g.computeVertexNormals();
  return g;
}
// cloth over a seated lap and knees (forward of the hips)
function lapGeometry(w = 0.5, d = 0.46) {
  const g = new THREE.PlaneGeometry(w, d, 24, 16); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), u = (y / d + 0.5);                // u 0 = knees, 1 = hips
    const sag = -Math.pow(Math.abs(x) / (w / 2), 2.2) * 0.14 - (1 - u) * 0.02 * Math.sin(x * 30);
    p.setXYZ(i, x * (1 + (1 - u) * 0.1), sag, -y);
  }
  g.computeVertexNormals(); return g;
}

// ---------- generic body with simple joints ----------
function limb(r, len, mat) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mat); m.position.y = -len / 2; g.add(m);
  return g;
}
function body({ scale = 1, shirt, trousers = COL.trousers, shoe = COL.shoe, skin = COL.skin, headR = 0.16, skinMat }) {
  const s = scale;
  const root = new THREE.Group();
  const hips = new THREE.Group(); root.add(hips);
  const mShirt = std(shirt, { roughness: 0.85 }), mTrou = std(trousers, { roughness: 0.85 }), mSkin = skinMat || satin(skin), mShoe = std(shoe, { roughness: 0.5 });
  const torso = new THREE.Group(); hips.add(torso);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.15 * s, 0.3 * s, 6, 20), mShirt);
  chest.position.y = 0.27 * s; chest.scale.set(1.08, 1, 0.74); torso.add(chest);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.15 * s, 20, 14), mTrou); pelvis.scale.set(1.05, 0.6, 0.8); pelvis.position.y = 0.04 * s; torso.add(pelvis);
  const neck = new THREE.Group(); neck.position.y = 0.53 * s; torso.add(neck);
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.05 * s, 0.08 * s, 14), mSkin); neckM.position.y = 0.02 * s; neck.add(neckM);
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR * s, 48, 32), mSkin);
  head.position.y = headR * s * 0.92; head.scale.set(1, 0.97, 0.98); neck.add(head);
  // eyes: open (glossy ovals with a catch-light), closed (soft arcs), wide (bigger), none
  const eyes = new THREE.Group(); head.add(eyes);
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: COL.eye, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const mk = (x) => {
    const e = new THREE.Group();
    const r = headR * s, ay = 0.06;
    e.position.set(x * r, ay * r, -Math.sqrt(1 - x * x - ay * ay) * r * 0.985);
    e.lookAt(e.position.clone().multiplyScalar(2));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.15 * r, 20, 14), eyeMat); dot.scale.set(0.8, 1.05, 0.35); e.add(dot);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.035 * r, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(0.04 * r, 0.05 * r, 0.04 * r); e.add(glint);
    const line = new THREE.Mesh(new THREE.TorusGeometry(0.11 * r, 0.018 * r, 6, 16, Math.PI * 0.8), eyeMat);
    line.rotation.z = Math.PI * 1.1; line.position.y = 0.02 * r; e.add(line);
    e.userData = { dot, glint, line }; eyes.add(e); return e;
  };
  const eyeL = mk(-0.34), eyeR = mk(0.34);
  const arm = (side) => {
    const sh = new THREE.Group(); sh.position.set(side * 0.19 * s, 0.45 * s, 0); torso.add(sh);
    const upper = limb(0.05 * s, 0.22 * s, mShirt); sh.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.29 * s; upper.add(elbow);
    const fore = limb(0.042 * s, 0.2 * s, mSkin); elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052 * s, 16, 12), mSkin); hand.position.y = -0.28 * s; hand.scale.set(0.85, 1.15, 0.6); fore.add(hand);
    return { sh, elbow, hand };
  };
  const L = arm(-1), R = arm(1);
  const leg = (side) => {
    const hip = new THREE.Group(); hip.position.set(side * 0.085 * s, 0, 0); hips.add(hip);
    const thigh = limb(0.07 * s, 0.3 * s, mTrou); hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.41 * s; thigh.add(knee);
    const shin = limb(0.058 * s, 0.3 * s, mTrou); knee.add(shin);
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.045 * s, 0.12 * s, 4, 10), mShoe);
    foot.rotation.x = Math.PI / 2; foot.position.set(0, -0.43 * s, -0.05 * s); shin.add(foot);
    return { hip, knee, foot };
  };
  const LL = leg(-1), LR = leg(1);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // state: sit (1 seated, 0 standing), lean, headTilt (roll), headYaw, headPitch, armL/armR [pitch, roll, elbow], eyes, walk, walkAmp
  function pose(st = {}) {
    const sit = st.sit ?? 1, walk = st.walk ?? 0, wa = st.walkAmp ?? 0;
    const sw = Math.sin(walk * Math.PI * 2) * wa;
    LL.hip.rotation.x = sit * Math.PI / 2 + sw * 0.45; LR.hip.rotation.x = sit * Math.PI / 2 - sw * 0.45;
    LL.knee.rotation.x = -sit * Math.PI / 2 - Math.max(0, -sw) * 0.5; LR.knee.rotation.x = -sit * Math.PI / 2 - Math.max(0, sw) * 0.5;
    hips.position.y = (1 - sit) * 0.84 * s + Math.abs(Math.sin(walk * Math.PI * 2)) * 0.015 * wa;
    torso.rotation.x = -(st.lean ?? 0);
    neck.rotation.set(-(st.headPitch ?? 0), st.headYaw ?? 0, st.headTilt ?? 0);
    const a = (A, v, side) => { if (!v) return; A.sh.rotation.set(v[0], 0, side * (v[1] || 0)); A.elbow.rotation.x = v[2] || 0; };
    a(L, st.armL || [sw * 0.4, 0.08, 0.15], -1); a(R, st.armR || [-sw * 0.4, 0.08, 0.15], 1);
    const e = st.eyes || "open";
    for (const E of [eyeL, eyeR]) {
      const u = E.userData; E.visible = e !== "none";
      u.dot.visible = e === "open" || e === "wide"; u.glint.visible = u.dot.visible; u.line.visible = e === "closed";
      const k = e === "wide" ? 1.35 : 1; u.dot.scale.set(0.8 * k, 1.05 * k * (st.squint ? 0.5 : 1), 0.35);
    }
  }
  return { root, hips, torso, neck, head, eyes, eyeL, eyeR, armL: L, armR: R, legL: LL, legR: LR, pose, mats: { mShirt, mSkin } };
}

// ---------- KAU (the viewer): grey hoodie; a blanket from lap to shoulders, or pulled over the head ----------
export function makeKau() {
  const b = body({ shirt: COL.kauHoodie });
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 10, 24), std(COL.kauHoodie, { roughness: 0.9 }));
  hood.rotation.x = Math.PI / 2 - 0.2; hood.position.set(0, 0.5, 0.05); hood.scale.set(1.15, 1, 0.8); b.torso.add(hood);
  const mat = blanketMat();
  const lap = new THREE.Mesh(lapGeometry(0.5, 0.48), mat); lap.position.set(0, 0.13, -0.24); b.hips.add(lap);
  const chest = new THREE.Mesh(shroudGeometry({ seed: 3, h: 0.62, r: 1.08 }), mat); chest.position.y = -0.02; b.hips.add(chest);
  const full = new THREE.Mesh(shroudGeometry({ seed: 3, h: 1.04, r: 1.05 }), mat); full.position.y = -0.02; b.hips.add(full);
  [lap, chest, full].forEach((m) => { m.castShadow = m.receiveShadow = true; });
  const base = b.pose;
  b.pose = (st = {}) => {
    base(st);
    const c = st.cover ?? 0.5; // 0.5 = to the shoulders, 1 = over the head
    const u = Math.max(0, Math.min(1, (c - 0.5) / 0.5));
    chest.visible = u < 0.5; full.visible = u >= 0.5;
    full.scale.set(1, 0.62 + 0.38 * u, 1);
  };
  b.blanket = full; b.blanketChest = chest; b.lap = lap;
  return b;
}

// ---------- AIN (girl, ~9): yellow tudung, under her blanket until she peeks ----------
export function makeAin() {
  const S = 0.74;
  const b = body({ scale: S, shirt: COL.ainBaju, trousers: COL.ainBaju, shoe: COL.ainSelipar, headR: 0.17 });
  const r = 0.17 * S;
  const tud = std(COL.ainTudung, { roughness: 0.85, side: THREE.DoubleSide });
  // open in front (-z) so the face shows: skip a wedge of azimuth around 3π/2
  const tudung = new THREE.Mesh(new THREE.SphereGeometry(r * 1.1, 40, 24, Math.PI * 1.5 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.8), tud);
  b.head.add(tudung);
  const drape = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 1.6, r * 1.3, 32, 1, true), tud); drape.position.y = -r * 1.05; b.head.add(drape);
  const fm = std(COL.freckle);
  [[-0.46, -0.24], [-0.38, -0.32], [-0.53, -0.34], [0.46, -0.24], [0.38, -0.32], [0.53, -0.34]].forEach(([x, y]) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(r * 0.028, 6, 4), fm);
    f.position.set(x * r, y * r, -Math.sqrt(Math.max(0, 1 - x * x - y * y)) * r * 1.0); b.head.add(f);
  });
  const mat = blanketMat();
  const full = new THREE.Mesh(shroudGeometry({ seed: 7, h: 0.98 * S + 0.06, r: S * 1.08 }), mat); full.position.y = -0.02; b.hips.add(full);
  const hood = new THREE.Mesh(shroudGeometry({ seed: 7, h: 0.98 * S + 0.06, r: S * 1.08, open: 0.75 }), mat); hood.position.y = -0.02; b.hips.add(hood);
  const lap = new THREE.Mesh(lapGeometry(0.4, 0.34), mat); lap.position.set(0, 0.1, -0.17); b.hips.add(lap);
  [full, hood, lap].forEach((m) => { m.castShadow = m.receiveShadow = true; });
  const base = b.pose;
  b.pose = (st = {}) => {
    base(st);
    const pk = st.peek ?? 0;
    full.visible = pk < 0.5; hood.visible = pk >= 0.5;
    tudung.visible = drape.visible = pk >= 0.5;
    hood.position.z = 0.03 * pk;
  };
  b.blanket = full;
  return b;
}

// ---------- KONDUKTOR: glossy black, featureless, in a navy conductor's uniform ----------
export function makeKonduktor() {
  const skin = new THREE.MeshPhysicalMaterial({ color: COL.kondSkin, roughness: 0.18, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.08 });
  const b = body({ shirt: COL.kondJacket, trousers: COL.kondJacket, shoe: 0x050506, headR: 0.165, skinMat: skin });
  b.eyes.visible = false; b.eyes.scale.setScalar(0.0001);
  const r = 0.165;
  const shirt = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 3), std(COL.kondShirt)); shirt.rotation.x = Math.PI; shirt.position.set(0, 0.47, -0.105); shirt.scale.set(0.6, 0.7, 0.3); b.torso.add(shirt);
  for (let i = 0; i < 3; i++) { const bt = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), std(COL.kondBand, { metalness: 0.8, roughness: 0.3 })); bt.position.set(0.02, 0.33 - i * 0.09, -0.113); b.torso.add(bt); }
  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.005), std(COL.kondTag, { metalness: 0.7, roughness: 0.25, emissive: 0x403418, emissiveIntensity: 0.4 }));
  tag.position.set(-0.075, 0.38, -0.112); b.torso.add(tag);
  const cap = new THREE.Group(); cap.position.y = r * 0.78; b.head.add(cap);
  const capMat = std(COL.kondCap, { roughness: 0.55 });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 0.95, r * 0.55, 40), capMat); crown.position.y = r * 0.18; cap.add(crown);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.06, r * 0.08, 40), capMat); top.position.y = r * 0.48; cap.add(top);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.97, r * 0.97, r * 0.14, 40), std(COL.kondBand, { metalness: 0.7, roughness: 0.3 })); cap.add(band);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, r * 0.05, 32, 1, false, Math.PI * 0.5, Math.PI), new THREE.MeshPhysicalMaterial({ color: 0x050508, roughness: 0.15, clearcoat: 1 }));
  brim.position.set(0, -r * 0.05, -r * 0.35); brim.scale.set(1.15, 1, 0.75); cap.add(brim);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(r * 0.12, 16), std(COL.kondBand, { metalness: 0.8, roughness: 0.25 })); badge.position.set(0, r * 0.22, -r * 1.03); badge.rotation.y = Math.PI; cap.add(badge);
  const punch = new THREE.Group();
  const pm = std(COL.punch, { metalness: 0.85, roughness: 0.28 });
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.022), pm); punch.add(p1);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.09, 0.018), pm); p2.position.set(0, -0.02, -0.03); p2.rotation.x = 0.35; punch.add(p2);
  punch.position.set(0, -0.06, -0.02); b.armR.hand.add(punch);
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.15, 14), std(0x1c1c20, { metalness: 0.6, roughness: 0.35 }));
  torch.rotation.x = Math.PI / 2; torch.position.set(0, -0.04, -0.06); b.armL.hand.add(torch);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.019, 16), new THREE.MeshBasicMaterial({ color: 0xfff2d0 }));
  lens.position.set(0, -0.04, -0.136); lens.rotation.y = Math.PI; b.armL.hand.add(lens);
  b.cap = cap; b.tag = tag; b.punch = punch; b.torch = torch; b.lens = lens;
  b.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return b;
}

// ---------- PENUMPANG: a seated person under a blanket, head and all (shins and shoes show) ----------
export function makePenumpang(seed = 1) {
  const rnd = (k) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const b = body({ shirt: 0x333640, trousers: [0x23252c, 0x3a3226, 0x1e2733, 0x2e2e2e][Math.floor(rnd(2) * 4)], shoe: [0x131316, 0x3b2a1e, 0xd8d4cc][Math.floor(rnd(7) * 3)], scale: 0.95 + rnd(3) * 0.1 });
  b.eyes.visible = false; b.head.visible = false; b.torso.visible = false;
  const mat = blanketMat();
  const shroud = new THREE.Mesh(shroudGeometry({ seed: seed * 2.3, h: 0.98 + rnd(4) * 0.08, r: 1.0 + rnd(5) * 0.08 }), mat);
  shroud.position.y = -0.02; shroud.rotation.y = (rnd(6) - 0.5) * 0.4; shroud.castShadow = shroud.receiveShadow = true; b.hips.add(shroud);
  const lap = new THREE.Mesh(lapGeometry(0.5, 0.46), mat); lap.position.set(0, 0.13, -0.23); lap.castShadow = lap.receiveShadow = true; b.hips.add(lap);
  const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.09, 4, 10), satin(COL.skin));
  hand.position.set((rnd(9) > 0.5 ? 1 : -1) * 0.25, 0.12, -0.12); hand.rotation.z = 0.3; hand.visible = rnd(8) > 0.55; b.hips.add(hand);
  b.shroud = shroud; b.lap = lap; b.rnd = rnd;
  return b;
}

// ---------- ORANG R&R: standing figure, faceless, arms down, facing the bus ----------
export function makeOrangRnR(seed = 1, covered = false) {
  const b = body({ shirt: [0xbab7b0, 0x8f8d88, 0xa8a49b][seed % 3], trousers: 0x6d6a66, scale: 0.92 + ((seed * 37) % 10) / 70 });
  b.eyes.visible = false;
  if (covered) {
    b.head.visible = false; b.torso.visible = false;
    const sh = new THREE.Mesh(shroudGeometry({ seed, h: 1.45, r: 1.0 }), blanketMat()); sh.position.y = -0.62; b.hips.add(sh);
  }
  b.pose({ sit: 0, armL: [0, 0.05, 0.05], armR: [0, 0.05, 0.05] });
  return b;
}
