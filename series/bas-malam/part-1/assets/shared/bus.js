// BAS MALAM: the set (v2 "clean" look). Ekspres Seri Bulan, lower deck, plus the nameless R&R outside the left windows.
// Bus axis: front is -z, back is +z. Malaysian right-hand drive: driver on +x, passenger door front-left (-x).
// Lights are few and practical (aisle LEDs, the red clock, the windshield, passing street lamps, the torch); the
// environment map gives the soft fill and the reflections.
import * as THREE from "three";
import { RoundedBoxGeometry } from "../lib/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "../lib/jsm/utils/BufferGeometryUtils.js";

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0, ...o });
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });

export const BUS = {
  halfW: 1.25, height: 2.15, front: -6.0, back: 4.9,
  rows: 9, row0: -3.6, pitch: 0.95,          // row r: z = row0 + r * pitch
  seatX: { A: -0.92, B: -0.5, C: 0.78 },      // A window-left, B aisle-left, C single right
  aisleX: 0.12, seatY: 0.46,
  kauRow: 8, kauSeat: "A", ainSeat: "B",
};
export const rowZ = (r) => BUS.row0 + r * BUS.pitch;
export const seatHip = (r, s) => new THREE.Vector3(BUS.seatX[s], BUS.seatY, rowZ(r) + 0.05);

const FONT = '"Montserrat", "Arial Black", sans-serif';
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function prng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// classic express-bus moquette: deep blue with little orange and teal squiggles
function moquette() {
  const t = canvasTex(256, 256, (g) => {
    g.fillStyle = "#1c2a55"; g.fillRect(0, 0, 256, 256);
    const r = prng(5); g.lineWidth = 3; g.lineCap = "round";
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = ["#d77a2e", "#2fa6a0", "#c33b4f", "#e6d7a8"][i % 4]; g.globalAlpha = 0.55;
      const x = r() * 256, y = r() * 256; g.beginPath(); g.moveTo(x, y);
      g.bezierCurveTo(x + 10, y - 12, x + 18, y + 12, x + 26, y); g.stroke();
    }
    g.globalAlpha = 0.08; for (let i = 0; i < 4000; i++) { g.fillStyle = i % 2 ? "#fff" : "#000"; g.fillRect(r() * 256, r() * 256, 1, 1); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
}
// white headrest cover with the company name
function headrestTex() {
  return canvasTex(256, 128, (g) => {
    g.fillStyle = "#ece9e1"; g.fillRect(0, 0, 256, 128);
    g.strokeStyle = "#c9c4b6"; g.lineWidth = 4; g.strokeRect(8, 8, 240, 112);
    g.fillStyle = "#1b2a4e"; g.font = `800 26px ${FONT}`; g.textAlign = "center"; g.fillText("SERI BULAN", 128, 74);
  });
}

// ---------- the rules sticker (8 boxes). `rules` = filled box numbers ----------
export function stickerTexture(rules = [1]) {
  return canvasTex(600, 840, (g, W, H) => {
    g.fillStyle = "#ebe1c6"; g.fillRect(0, 0, W, H);
    const grd = g.createRadialGradient(W * 0.5, H * 0.45, 50, W * 0.5, H * 0.5, W * 0.85);
    grd.addColorStop(0, "rgba(0,0,0,0)"); grd.addColorStop(1, "rgba(90,60,20,0.3)"); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = "#1b2a4e"; g.fillRect(0, 0, W, 120);
    g.fillStyle = "#f2c230"; g.beginPath(); g.arc(62, 60, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1b2a4e"; g.beginPath(); g.arc(74, 52, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#ffffff"; g.font = `800 34px ${FONT}`; g.fillText("EKSPRES SERI BULAN", 108, 58);
    g.fillStyle = "#f2c230"; g.font = `800 26px ${FONT}`; g.fillText("PERATURAN PENUMPANG", 108, 96);
    const bx = 30, by = 145, bw = (W - 60 - 20) / 2, bh = (H - by - 40 - 3 * 18) / 4;
    for (let i = 0; i < 8; i++) {
      const col = i % 2, row = Math.floor(i / 2), x = bx + col * (bw + 20), y = by + row * (bh + 18);
      g.strokeStyle = "#6f6450"; g.lineWidth = 4; g.strokeRect(x, y, bw, bh);
      g.fillStyle = "#6f6450"; g.beginPath(); g.arc(x + 22, y + 22, 15, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#ebe1c6"; g.font = `800 20px ${FONT}`; g.textAlign = "center"; g.fillText(String(i + 1), x + 22, y + 29); g.textAlign = "left";
      if (rules.includes(i + 1) && i === 0) {
        const cx = x + bw * 0.36, cy = y + 78;
        g.fillStyle = "#111"; g.beginPath(); g.arc(cx, cy, 26, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#1b2a4e"; g.fillRect(cx - 28, cy - 34, 56, 16); g.fillStyle = "#c9a23a"; g.fillRect(cx - 28, cy - 22, 56, 4);
        g.fillStyle = "#fff"; g.strokeStyle = "#111"; g.lineWidth = 3;
        g.beginPath(); g.ellipse(cx + 58, cy - 14, 26, 18, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.strokeStyle = "#c0262b"; g.lineWidth = 6; g.beginPath(); g.arc(cx + 58, cy - 14, 30, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(cx + 37, cy + 7); g.lineTo(cx + 79, cy - 35); g.stroke();
        g.fillStyle = "#1a1a1a"; g.font = `800 17px ${FONT}`;
        ["BILA LAMPU PADAM,", "JANGAN BERCAKAP", "DENGAN KONDUKTOR."].forEach((s, k) => g.fillText(s, x + 14, y + 140 + k * 21));
      }
    }
  });
}

export function buildBus(scene) {
  const B = BUS, W = B.halfW, Hh = B.height, L = B.back - B.front, zc = (B.back + B.front) / 2;
  const grp = new THREE.Group(); scene.add(grp);
  const add = (m, x, y, z) => { m.position.set(x, y, z); m.receiveShadow = true; grp.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, r = 0) => add(new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d), mat), x, y, z);

  // ---------- shell ----------
  const wallMat = std(0x3a3f4a, { roughness: 0.6 }), panel = std(0xb9bcc4, { roughness: 0.5 }), trim = std(0x16181d, { roughness: 0.4, metalness: 0.4 });
  const floorTex = canvasTex(64, 64, (g) => { g.fillStyle = "#2a2c31"; g.fillRect(0, 0, 64, 64); g.fillStyle = "#33363c"; for (let i = 0; i < 8; i++) g.fillRect(0, i * 8, 64, 3); });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(4, 40);
  box(W * 2, 0.04, L, std(0xffffff, { map: floorTex, roughness: 0.55 }), 0, -0.02, zc);
  const carpet = std(0x3a2333, { roughness: 1 }); box(0.6, 0.006, L - 1.2, carpet, B.aisleX, 0.003, zc + 0.3);
  // curved ceiling (a shallow vault) in pale panels, luggage racks
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, L, 48, 1, true, Math.PI - 0.4, 0.8), std(0x8d929d, { roughness: 0.7, side: THREE.BackSide }));
  vault.rotation.x = Math.PI / 2; vault.position.set(0, Hh - 3.2 + 0.22, zc); grp.add(vault); vault.receiveShadow = true;
  for (const s of [-1, 1]) {
    box(0.05, 0.92, L, wallMat, s * W, 0.46, zc);                                       // lower wall
    box(0.05, Hh - 1.74, L, panel, s * W, (Hh + 1.74) / 2, zc);                         // upper wall
    box(0.07, 0.05, L, trim, s * (W - 0.01), 0.92, zc);
    for (let z = B.front + 1.6; z < B.back; z += 1.25) box(0.08, 0.84, 0.1, trim, s * (W - 0.01), 1.33, z, 0.02);
    // luggage rack with a lip, and a strip of reading-light pods under it
    box(0.44, 0.05, L - 1.4, std(0x2a2e37, { roughness: 0.45, metalness: 0.3 }), s * (W - 0.24), 1.83, zc + 0.4, 0.02);
    box(0.05, 0.16, L - 1.4, std(0x2a2e37, { roughness: 0.45, metalness: 0.3 }), s * (W - 0.46), 1.79, zc + 0.4, 0.02);
  }
  box(W * 2, Hh, 0.05, wallMat, 0, Hh / 2, B.back);
  // night outside the side windows
  const nightPlanes = [];
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.84), basic(0x04060b)); m.position.set(s * (W + 0.06), 1.33, zc); m.rotation.y = -s * Math.PI / 2; grp.add(m); nightPlanes.push(m); }

  // ---------- aisle LED strips + the ceiling light strips (off until "menyala") ----------
  const ledMat = basic(0x3d6dff);
  for (const x of [B.aisleX - 0.31, B.aisleX + 0.31]) box(0.025, 0.012, L - 1.4, ledMat, x, 0.012, zc + 0.3);
  const stripMat = basic(0x0b0c10);
  for (const s of [-1, 1]) box(0.05, 0.02, L - 1.6, stripMat, s * (W - 0.47), 1.7, zc + 0.4);
  box(0.16, 0.02, L - 1.4, stripMat, B.aisleX, Hh + 0.2, zc);

  // ---------- seats: one merged mesh per material (fast), rounded cushions ----------
  const fabric = std(0xffffff, { map: moquette(), roughness: 0.95 }), cloth = std(0xffffff, { map: headrestTex(), roughness: 0.9 }), frame = std(0x1c1e24, { metalness: 0.5, roughness: 0.4 });
  const gFab = [], gCloth = [], gFrame = [];
  const place = (geo, x, y, z, rx = 0) => { let g = geo.clone(); if (g.index) g = g.toNonIndexed(); g.rotateX(rx); g.translate(x, y, z); return g; };
  const cushion = new RoundedBoxGeometry(1, 0.13, 0.5, 3, 0.05), backG = new RoundedBoxGeometry(1, 0.66, 0.13, 3, 0.05), headG = new RoundedBoxGeometry(1, 0.18, 0.15, 3, 0.04);
  const seats = {};
  const seat = (key, x, z, w) => {
    const s = (geo) => { const g = geo.clone(); g.scale(w, 1, 1); return g; };
    gFab.push(place(s(cushion), x, 0.4, z), place(s(backG), x, 0.78, z + 0.27, 0.12));
    gCloth.push(place(s(headG), x, 1.06, z + 0.31, 0.12));
    gFrame.push(place(new THREE.BoxGeometry(0.04, 0.34, 0.36), x - w / 2, 0.19, z), place(new RoundedBoxGeometry(0.05, 0.05, 0.42, 2, 0.02), x + w / 2 + 0.025, 0.6, z - 0.02));
    seats[key] = { x, z, w };
  };
  for (let r = 0; r < B.rows; r++) {
    const z = rowZ(r);
    seat(`${r}A`, B.seatX.A, z, 0.42); seat(`${r}B`, B.seatX.B, z, 0.42); seat(`${r}C`, B.seatX.C, z, 0.46);
  }
  seat("kond", B.seatX.C, rowZ(-1) - 0.1, 0.46);
  for (const [arr, m] of [[gFab, fabric], [gCloth, cloth], [gFrame, frame]]) {
    const mesh = new THREE.Mesh(mergeGeometries(arr), m); mesh.castShadow = mesh.receiveShadow = true; grp.add(mesh);
  }

  // the rules sticker on the back of the seat in front of KAU (row 7, A), facing +z
  const sticker = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.336), std(0xffffff, { map: stickerTexture([1]), roughness: 0.45 }));
  sticker.position.set(B.seatX.A, 0.76, rowZ(B.kauRow - 1) + 0.345); sticker.rotation.x = 0.12; grp.add(sticker);
  const stickerPoint = (u, v) => { sticker.updateWorldMatrix(true, false); return new THREE.Vector3((u - 0.5) * 0.24, (0.5 - v) * 0.336, 0).applyMatrix4(sticker.matrixWorld); };

  // ---------- front: dashboard, LED destination sign, the red clock, mirror, driver, windshield onto the road ----------
  box(W * 2, 0.6, 0.6, std(0x121317, { roughness: 0.5 }), 0, 0.55, B.front + 0.32, 0.04);
  box(W * 2, 0.3, 0.08, std(0x0d0e11), 0, 2.0, B.front + 0.06);
  const signTex = canvasTex(512, 64, (g) => { g.fillStyle = "#060202"; g.fillRect(0, 0, 512, 64); g.fillStyle = "#ff3b1f"; g.font = `800 40px ${FONT}`; g.textAlign = "center"; g.fillText("KL  ▸  KOTA BHARU", 256, 46); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.14), basic(0xffffff, { map: signTex })); sign.position.set(-0.45, 2.0, B.front + 0.105); grp.add(sign);
  const clockTex = canvasTex(256, 96, (g) => { g.fillStyle = "#080202"; g.fillRect(0, 0, 256, 96); g.fillStyle = "#ff2a1f"; g.font = `800 78px ${FONT}`; g.textAlign = "center"; g.fillText("2:47", 128, 78); });
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), basic(0xffffff, { map: clockTex })); clock.position.set(0.62, 2.0, B.front + 0.105); grp.add(clock);
  const clockLight = new THREE.PointLight(0xff2a1f, 1.4, 3.2, 2); clockLight.position.set(0.55, 1.85, B.front + 0.35); grp.add(clockLight);

  const mirror = new THREE.Group(); mirror.position.set(0.1, 1.74, B.front + 0.38); grp.add(mirror);
  mirror.add(new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.2, 0.035, 3, 0.03), std(0x050505, { roughness: 0.4 })));
  const glass = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.17, 0.03, 3, 0.025), std(0x0b0e15, { metalness: 0.95, roughness: 0.08 })); glass.position.z = 0.006; mirror.add(glass);
  const eyes = new THREE.Group(); eyes.position.z = 0.024; mirror.add(eyes);
  const eyeMat = basic(0xffffff, { transparent: true, opacity: 1, toneMapped: false });
  for (const x of [-0.055, 0.055]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.018, 24), eyeMat); e.position.set(x, 0.008, 0); e.scale.set(1.2, 0.8, 1); eyes.add(e); }
  eyes.visible = false;

  const drv = new THREE.Group(); drv.position.set(0.72, 0, B.front + 1.05); grp.add(drv);
  const dMat = std(0x050506, { roughness: 0.3 });
  const dBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 14), std(0x0e1426)); dBody.position.y = 0.95; drv.add(dBody);
  const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 20), dMat); dHead.position.y = 1.42; drv.add(dHead);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.022, 12, 40), std(0x111216, { roughness: 0.4 })); wheel.position.set(0.72, 0.95, B.front + 0.62); wheel.rotation.x = -1.05; grp.add(wheel);

  // windshield: real glass onto a moving night road (lane dashes and lamps flowing toward the bus)
  const road = new THREE.Group(); road.position.set(0, -0.3, B.front); grp.add(road);
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(14, 120), std(0x0d0e10, { roughness: 0.9 })); asphalt.rotation.x = -Math.PI / 2; asphalt.position.z = -60; road.add(asphalt);
  const dashes = [], roadLamps = [];
  const dashMat = basic(0x8a8a80);
  for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2.2), dashMat); d.rotation.x = -Math.PI / 2; d.position.set(-1.6, 0.01, 0); road.add(d); dashes.push(d); }
  const lampHead = basic(0xffb35c, { toneMapped: false });
  for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), lampHead); road.add(l); roadLamps.push(l); }
  const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 1.35), new THREE.MeshPhysicalMaterial({ color: 0x0a1020, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.18, metalness: 0.2 }));
  glassPane.position.set(0, 1.27, B.front + 0.02); grp.add(glassPane);
  const skyGlow = new THREE.Mesh(new THREE.PlaneGeometry(30, 6), basic(0x0d1830)); skyGlow.position.set(0, 2.5, B.front - 40); grp.add(skyGlow);

  // passenger door, front left
  const door = new THREE.Mesh(new RoundedBoxGeometry(0.05, 1.9, 0.85, 2, 0.02), std(0x1d2027, { roughness: 0.4 })); door.position.set(-W + 0.01, 0.97, B.front + 1.0); grp.add(door);
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.9), basic(0xff9a3c, { transparent: true, opacity: 0, toneMapped: false }));
  doorGlow.position.set(-W - 0.03, 0.97, B.front + 1.0); doorGlow.rotation.y = Math.PI / 2; grp.add(doorGlow);

  // curtains: deep pleats, a tie strap; KAU's (left, row 8) can be pulled aside
  const curtainMat = new THREE.MeshPhysicalMaterial({ color: 0x1a2550, roughness: 0.85, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x5f74c8), side: THREE.DoubleSide });
  const curtainGeo = (() => { const g = new THREE.PlaneGeometry(1.16, 0.84, 64, 8); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, (Math.sin(x * 38) * 0.022 + Math.sin(x * 11) * 0.01) * (1 + (0.42 - y) * 0.6)); }
    g.computeVertexNormals(); return g; })();
  const curtains = [];
  for (const s of [-1, 1]) for (let z = B.front + 2.22; z < B.back - 0.3; z += 1.25) {
    const m = new THREE.Mesh(curtainGeo, curtainMat); m.position.set(s * (W - 0.06), 1.33, z); m.rotation.y = s * Math.PI / 2; m.castShadow = true; m.receiveShadow = true; grp.add(m);
    curtains.push({ m, side: s, z });
  }
  const kauCurtain = curtains.filter((c) => c.side === -1).reduce((a, c) => (Math.abs(c.z - rowZ(B.kauRow)) < Math.abs(a.z - rowZ(B.kauRow)) ? c : a));

  // ---------- lights (few, practical) ----------
  const hemi = new THREE.HemisphereLight(0x5a74c0, 0x0a0806, 0.35); scene.add(hemi);
  const aisle = [];
  for (const z of [-2.5, 0.8, 3.6]) { const l = new THREE.PointLight(0x3d6dff, 2.2, 3.4, 1.8); l.position.set(B.aisleX, 0.1, z); grp.add(l); aisle.push(l); }
  const front = new THREE.PointLight(0x7f98d8, 4, 9, 1.4); front.position.set(0, 1.5, B.front + 0.4); grp.add(front);
  const street = new THREE.PointLight(0xff9a3c, 0, 5, 1.6); street.position.set(-W + 0.12, 1.4, 0); grp.add(street);
  const street2 = new THREE.PointLight(0xff9a3c, 0, 5, 1.6); street2.position.set(W - 0.12, 1.4, 0); grp.add(street2);
  const cabin = [];
  for (const z of [-3.4, 0.0, 3.3]) { const l = new THREE.PointLight(0xe8eeff, 0, 7, 1.3); l.position.set(B.aisleX, 2.0, z); grp.add(l); cabin.push(l); }
  const torch = new THREE.SpotLight(0xfff0d2, 0, 10, 0.34, 0.6, 1.2); torch.castShadow = true; torch.shadow.mapSize.set(1024, 1024); torch.shadow.bias = -0.0008;
  scene.add(torch); scene.add(torch.target);

  function setLights({ on = 0, streetL = 0, streetZ = 0, streetR = 0, floor = 1, t = 0, speed = 1 }) {
    hemi.intensity = 0.35 + on * 0.3; hemi.color.setHex(on > 0.5 ? 0xdfe6ff : 0x5a74c0);
    cabin.forEach((l) => (l.intensity = on * 2.4));
    stripMat.color.setRGB(0.04 + on * 0.9, 0.045 + on * 0.92, 0.06 + on * 0.98);
    aisle.forEach((l) => (l.intensity = 2.2 * floor * (1 - on * 0.7)));
    street.intensity = streetL; street.position.z = streetZ; street2.intensity = streetR; street2.position.z = -streetZ * 0.7 + 1;
    front.intensity = 2.6 * (1 - on * 0.5);
    // road flows toward the bus while it drives (`t` here is distance-like: integrated speed)
    dashes.forEach((d, i) => { d.position.z = -(((i * 5 - t * 14) % 80) + 80) % 80 - 2; });
    roadLamps.forEach((l, i) => { const z = -(((i * 14 - t * 14) % 84) + 84) % 84 - 3; l.position.set(i % 2 ? -5.5 : 5.5, 6, z); });
  }

  return { grp, nightPlanes, seats, sticker, stickerPoint, clock, mirror, mirrorEyes: eyes, eyeMat, door, doorGlow, curtains, kauCurtain, torch, setLights, drv };
}

// ---------- the nameless R&R, out past the left side ----------
export function buildRnR(scene, makeFigure) {
  const g = new THREE.Group(); g.position.set(-BUS.halfW, 0, 0); scene.add(g);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), std(0x1c1b1a, { roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(-28, -0.35, 0); ground.receiveShadow = true; g.add(ground);
  const lineMat = basic(0x6f685c);
  for (let i = -6; i <= 6; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 4.5), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(-14, -0.34, i * 2.6); g.add(l); }
  const signTex = canvasTex(512, 384, (c, W, H) => {
    c.fillStyle = "#0d3c8c"; c.fillRect(0, 0, W, H); c.strokeStyle = "#fff"; c.lineWidth = 10; c.strokeRect(12, 12, W - 24, H - 24);
    c.fillStyle = "#fff"; c.font = `800 150px ${FONT}`; c.textAlign = "center"; c.fillText("R&R", W / 2, 190);
    c.fillStyle = "#e8e4da"; c.fillRect(60, 240, W - 120, 90);
  });
  const sign = new THREE.Group(); sign.position.set(-7.5, 0, -2.5); g.add(sign);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 10), std(0x55575c, { metalness: 0.5, roughness: 0.4 })); pole.position.y = 1.75; sign.add(pole);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), std(0xffffff, { map: signTex, roughness: 0.5, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.18 }));
  board.position.set(0, 3.9, 0.1); board.rotation.y = Math.PI / 2; sign.add(board);
  const lamps = [];
  for (const [x, z] of [[-4.5, -9], [-4.5, 3.5], [-13, -4], [-13, 8]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 6, 8), std(0x3a3b3e)); p.position.set(x, 2.65, z); g.add(p);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), basic(0xffb15a, { toneMapped: false })); head.position.set(x, 5.65, z); g.add(head);
    const l = new THREE.PointLight(0xff9a3c, 16, 16, 1.5); l.position.set(x, 5.3, z); g.add(l); lamps.push(l);
  }
  const figures = [];
  for (let i = 0; i < 30; i++) {
    const rr = Math.sin(i * 91.7) * 43758.5453, u = rr - Math.floor(rr), v = (Math.sin(i * 17.3) * 9341.7) % 1;
    const f = makeFigure(i, i % 4 === 0);
    f.root.position.set(-5 - (i % 6) * 1.5 - u * 0.6, -0.35, -8 + Math.floor(i / 6) * 3.2 + (v - 0.5) * 1.2 + (i % 6) * 0.25);
    f.root.rotation.y = -Math.PI / 2 + (u - 0.5) * 0.2;
    g.add(f.root); figures.push(f);
  }
  return { grp: g, figures, sign, lamps };
}
