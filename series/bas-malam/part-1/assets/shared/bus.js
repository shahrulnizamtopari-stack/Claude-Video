// BAS MALAM: the set. Ekspres Seri Bulan, lower deck, plus the nameless R&R outside the left windows.
// Bus axis: front is -z, back is +z. Malaysian right-hand drive: driver on +x, passenger door front-left (-x).
import * as THREE from "../lib/three.module.min.js";

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });

export const BUS = {
  halfW: 1.25, height: 2.1, front: -6.0, back: 4.9,
  rows: 9, row0: -3.6, pitch: 0.95,          // row r: z = row0 + r * pitch
  seatX: { A: -0.92, B: -0.5, C: 0.78 },      // A window-left, B aisle-left, C single right
  aisleX: 0.12, seatY: 0.46,
  kauRow: 8, kauSeat: "A", ainSeat: "B",
};
export const rowZ = (r) => BUS.row0 + r * BUS.pitch;
export const seatHip = (r, s) => new THREE.Vector3(BUS.seatX[s], BUS.seatY, rowZ(r) + 0.05);

const FONT = '"Montserrat", "Arial Black", sans-serif';

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ---------- the rules sticker (8 boxes, rule 1 filled). `rules` = array of filled box numbers ----------
export function stickerTexture(rules = [1]) {
  return canvasTex(600, 840, (g, W, H) => {
    g.fillStyle = "#e9dfc4"; g.fillRect(0, 0, W, H);                         // yellowed plastic
    const grd = g.createRadialGradient(W * 0.5, H * 0.45, 50, W * 0.5, H * 0.5, W * 0.85);
    grd.addColorStop(0, "rgba(0,0,0,0)"); grd.addColorStop(1, "rgba(90,60,20,0.35)"); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = "#1b2a4e"; g.fillRect(0, 0, W, 120);
    g.fillStyle = "#f2c230"; g.beginPath(); g.arc(62, 60, 30, 0, Math.PI * 2); g.fill();              // little moon logo
    g.fillStyle = "#1b2a4e"; g.beginPath(); g.arc(74, 52, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#ffffff"; g.font = `800 34px ${FONT}`; g.fillText("EKSPRES SERI BULAN", 108, 58);
    g.fillStyle = "#f2c230"; g.font = `800 26px ${FONT}`; g.fillText("PERATURAN PENUMPANG", 108, 96);
    const bx = 30, by = 145, bw = (W - 60 - 20) / 2, bh = (H - by - 40 - 3 * 18) / 4;
    for (let i = 0; i < 8; i++) {
      const col = i % 2, row = Math.floor(i / 2), x = bx + col * (bw + 20), y = by + row * (bh + 18);
      g.strokeStyle = "#6f6450"; g.lineWidth = 4; g.strokeRect(x, y, bw, bh);
      g.fillStyle = "#6f6450"; g.beginPath(); g.arc(x + 22, y + 22, 15, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e9dfc4"; g.font = `800 20px ${FONT}`; g.textAlign = "center"; g.fillText(String(i + 1), x + 22, y + 29); g.textAlign = "left";
      if (rules.includes(i + 1) && i === 0) {
        // icon: conductor head with cap + crossed-out speech bubble
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
  const add = (m, p) => { if (p) m.position.copy(p); m.receiveShadow = true; grp.add(m); return m; };
  const box = (w, h, d, mat, x, y, z) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), new THREE.Vector3(x, y, z));

  // shell
  const wallMat = std(0x30343d, { roughness: 0.9 }), trim = std(0x1a1c22), ceil = std(0x3a3e47);
  box(W * 2, 0.04, L, std(0x24262b), 0, -0.02, zc);                              // floor
  box(0.62, 0.005, L - 1.2, std(0x3b2430, { roughness: 1 }), B.aisleX, 0.003, zc + 0.3); // aisle carpet
  box(W * 2, 0.04, L, ceil, 0, Hh + 0.02, zc);                                   // ceiling
  for (const s of [-1, 1]) {
    box(0.05, 0.9, L, wallMat, s * W, 0.45, zc);                                 // lower wall
    box(0.05, Hh - 1.72, L, wallMat, s * W, (Hh + 1.72) / 2, zc);                // upper wall
    box(0.06, 0.05, L, trim, s * (W - 0.01), 0.9, zc);
    for (let z = B.front + 1.6; z < B.back; z += 1.25) box(0.06, 0.82, 0.12, trim, s * (W - 0.01), 1.31, z); // window pillars
    // luggage rack + its underside reading-light strip (the "lights on" moment)
    box(0.42, 0.04, L - 1.4, std(0x23262d), s * (W - 0.23), 1.8, zc + 0.4);
    box(0.04, 0.12, L - 1.4, std(0x23262d), s * (W - 0.44), 1.76, zc + 0.4);
  }
  box(W * 2, Hh, 0.05, wallMat, 0, Hh / 2, B.back);                             // back wall
  // night outside the windows (seen in gaps): a dark plane each side, plus the windshield
  const night = basic(0x05070c);
  const nightPlanes = [];
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.82), night); m.position.set(s * (W + 0.03), 1.31, zc); m.rotation.y = -s * Math.PI / 2; grp.add(m); nightPlanes.push(m); }
  const wsTex = canvasTex(256, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#03050a"); gr.addColorStop(0.62, "#0d1626"); gr.addColorStop(0.66, "#1d2a44"); gr.addColorStop(1, "#05070c"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 1.3), basic(0xffffff, { map: wsTex }));
  windshield.position.set(0, 1.25, B.front + 0.01); grp.add(windshield);
  box(W * 2, 0.55, 0.5, std(0x15171b), 0, 0.5, B.front + 0.3);                  // dashboard
  box(W * 2, 0.24, 0.06, std(0x101114), 0, 1.98, B.front + 0.05);               // header above the windshield

  // aisle floor lights (the only light in the dark cabin)
  const floorLightMat = basic(0x3d6dff);
  const floorLights = [];
  for (let r = -1; r <= B.rows; r++) for (const x of [B.aisleX - 0.33, B.aisleX + 0.33]) {
    const m = box(0.05, 0.015, 0.09, floorLightMat, x, 0.02, rowZ(r) + 0.45); floorLights.push(m);
  }
  // ceiling light strips (off until "Semua lampu menyala")
  const stripMat = basic(0x1a1d24);
  for (const s of [-1, 1]) box(0.06, 0.02, L - 1.6, stripMat, s * (W - 0.46), 1.69, zc + 0.4);
  box(0.12, 0.02, L - 1.0, stripMat, B.aisleX, Hh - 0.005, zc);

  // seats (high-back coach seats with the classic white headrest cloth)
  const fabric = std(0x2b3550, { roughness: 1 }), cloth = std(0xe9e6dd, { roughness: 1 }), frame = std(0x16181d, { metalness: 0.3, roughness: 0.5 });
  const seats = {};
  const seat = (x, z, w) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); grp.add(g);
    const p = (m, x2, y2, z2, rx = 0) => { m.position.set(x2, y2, z2); m.rotation.x = rx; m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    p(new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.5), fabric), 0, 0.4, 0);
    const back = p(new THREE.Mesh(new THREE.BoxGeometry(w, 0.62, 0.12), fabric), 0, 0.77, 0.27, 0.12);
    p(new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.16, 0.135), cloth), 0, 1.0, 0.3, 0.12);
    p(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.4), frame), -w / 2, 0.2, 0);
    p(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.45), frame), w / 2 + 0.02, 0.58, 0);   // armrest
    return { g, back };
  };
  for (let r = 0; r < B.rows; r++) {
    const z = rowZ(r);
    seats[`${r}A`] = seat(B.seatX.A, z, 0.42);
    seats[`${r}B`] = seat(B.seatX.B, z, 0.42);
    seats[`${r}C`] = seat(B.seatX.C, z, 0.46);
  }
  // conductor's seat at the front right, driver's seat in front of it
  seat(B.seatX.C, rowZ(-1) - 0.1, 0.46);

  // the rules sticker on the back of the seat in front of KAU (row 7, A), facing +z
  const sticker = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.336), std(0xffffff, { map: stickerTexture([1]), roughness: 0.55 }));
  const sb = seats[`${B.kauRow - 1}A`];
  sticker.position.set(0, 0.76, 0.337); sticker.rotation.x = 0.12; sb.g.add(sticker);
  const stickerPoint = (u, v) => { sticker.updateWorldMatrix(true, false); return new THREE.Vector3((u - 0.5) * 0.24, (0.5 - v) * 0.336, 0).applyMatrix4(sticker.matrixWorld); };

  // red digital clock above the driver, "2:47"
  const clockTex = canvasTex(256, 96, (g) => { g.fillStyle = "#080202"; g.fillRect(0, 0, 256, 96); g.fillStyle = "#ff2a1f"; g.font = `800 78px ${FONT}`; g.textAlign = "center"; g.fillText("2:47", 128, 78); });
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), basic(0xffffff, { map: clockTex }));
  clock.position.set(0.55, 1.93, B.front + 0.09); grp.add(clock);
  const clockLight = new THREE.PointLight(0xff2a1f, 1.6, 3.5, 2); clockLight.position.set(0.55, 1.85, B.front + 0.3); grp.add(clockLight);

  // rear-view mirror (driver's eyes appear in it), centre top of the windshield, facing back
  const mirror = new THREE.Group(); mirror.position.set(0.1, 1.74, B.front + 0.35); grp.add(mirror);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.17, 0.03), std(0x0c0f16, { metalness: 0.9, roughness: 0.18 }));
  mirror.add(glass);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.21, 0.025), std(0x050505)); rim.position.z = -0.01; mirror.add(rim);
  const eyes = new THREE.Group(); eyes.position.z = 0.018; mirror.add(eyes);
  const faceShade = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), basic(0x000000, { transparent: true, opacity: 0.6 })); eyes.add(faceShade);
  const eyeMat = basic(0xffffff, { transparent: true, opacity: 1 });
  for (const x of [-0.055, 0.055]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.018, 20), eyeMat); e.position.set(x, 0.01, 0.002); e.scale.y = 1.15; eyes.add(e); }
  eyes.visible = false;

  // driver: a dark shape and two hands on a big wheel
  const drv = new THREE.Group(); drv.position.set(0.72, 0, B.front + 1.05); grp.add(drv);
  const dBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 4, 10), std(0x07070a)); dBody.position.y = 0.95; drv.add(dBody);
  const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), std(0x07070a, { roughness: 0.35 })); dHead.position.y = 1.42; drv.add(dHead);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.022, 10, 36), std(0x111216)); wheel.position.set(0.72, 0.95, B.front + 0.62); wheel.rotation.x = -1.05; grp.add(wheel);

  // passenger door, front left: a panel that slides out and back
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.9, 0.85), std(0x1d2027)); door.position.set(-W + 0.01, 0.97, B.front + 1.0); grp.add(door);
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.9), basic(0xff9a3c, { transparent: true, opacity: 0 }));
  doorGlow.position.set(-W - 0.02, 0.97, B.front + 1.0); doorGlow.rotation.y = Math.PI / 2; grp.add(doorGlow);

  // curtains: one folded panel per window bay each side; KAU's panel (left, row 8) can be pulled aside
  const curtainMat = std(0x16224a, { roughness: 1, side: THREE.DoubleSide });
  const curtainGeo = (() => { const g = new THREE.PlaneGeometry(1.18, 0.8, 40, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 34) * 0.018); g.computeVertexNormals(); return g; })();
  const curtains = [];
  for (const s of [-1, 1]) for (let z = B.front + 2.22; z < B.back - 0.3; z += 1.25) {
    const m = new THREE.Mesh(curtainGeo, curtainMat); m.position.set(s * (W - 0.05), 1.31, z); m.rotation.y = s * Math.PI / 2; m.castShadow = true; grp.add(m);
    curtains.push({ m, side: s, z });
  }
  const kauCurtain = curtains.filter((c) => c.side === -1).reduce((a, c) => (Math.abs(c.z - rowZ(B.kauRow)) < Math.abs(a.z - rowZ(B.kauRow)) ? c : a));

  // ---------- lights ----------
  const amb = new THREE.AmbientLight(0x2a3a6a, 1.2); scene.add(amb);
  const hemi = new THREE.HemisphereLight(0x8aa4ff, 0x1a1410, 0.0); scene.add(hemi);
  const floorGlow = [];
  for (let r = -1; r <= B.rows; r += 2) { const l = new THREE.PointLight(0x3d6dff, 2.5, 2.8, 2); l.position.set(B.aisleX, 0.12, rowZ(r) + 0.45); grp.add(l); floorGlow.push(l); }
  const front = new THREE.PointLight(0x7a92c8, 5, 8, 1.6); front.position.set(0, 1.4, B.front + 0.4); grp.add(front); // windshield back-light (silhouettes)
  const street = new THREE.PointLight(0xff9a3c, 0, 5, 1.8); street.position.set(-W + 0.1, 1.35, 0); grp.add(street);
  const street2 = new THREE.PointLight(0xff9a3c, 0, 5, 1.8); street2.position.set(W - 0.1, 1.35, 0); grp.add(street2);
  const cabin = [];
  for (let z = B.front + 1.5; z < B.back; z += 2.2) { const l = new THREE.PointLight(0xe4ecff, 0, 6, 1.4); l.position.set(B.aisleX, 1.95, z); grp.add(l); cabin.push(l); }
  const torch = new THREE.SpotLight(0xfff0d2, 0, 10, 0.36, 0.55, 1.2); torch.castShadow = true; torch.shadow.mapSize.set(1024, 1024); torch.shadow.bias = -0.0008;
  scene.add(torch); scene.add(torch.target);

  // "lightsOn" 0..1 (with a flicker handled by the caller), streetSweep: phase 0..1 of the passing lamp
  const dbg = (typeof window !== "undefined" && window.__debugBright) ? 6 : 1;
  function setLights({ on = 0, streetL = 0, streetZ = 0, streetR = 0, floor = 1 }) {
    amb.intensity = (1.2 + on * 1.0) * dbg; amb.color.setHex(on > 0.5 ? 0x9aa8c8 : 0x2a3a6a);
    hemi.intensity = on * 2.2;
    cabin.forEach((l) => (l.intensity = on * 14));
    stripMat.color.setRGB(0.02 + on * 0.98, 0.022 + on * 0.978, 0.03 + on * 0.97);
    floorGlow.forEach((l) => (l.intensity = 2.5 * floor * (1 - on * 0.6)));
    floorLightMat.color.setHex(0x3d6dff).multiplyScalar(0.3 + 0.7 * floor);
    street.intensity = streetL; street.position.z = streetZ; street2.intensity = streetR; street2.position.z = -streetZ * 0.7;
    front.intensity = 5 * (1 - on * 0.5);
  }

  return { grp, nightPlanes, seats, sticker, stickerPoint, clock, mirror, mirrorEyes: eyes, eyeMat, door, doorGlow, curtains, kauCurtain, torch, setLights, windshield, drv };
}

// ---------- the nameless R&R, out past the left side ----------
export function buildRnR(scene, makeFigure) {
  const g = new THREE.Group(); g.position.set(-BUS.halfW, 0, 0); scene.add(g);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), std(0x1c1b1a, { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(-28, -0.35, 0); ground.receiveShadow = true; g.add(ground);
  const lineMat = basic(0x7c7466);
  for (let i = -6; i <= 6; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 4.5), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(-14, -0.34, i * 2.6); g.add(l); }
  // sign: "R&R" and an empty white strip where the name should be
  const signTex = canvasTex(512, 384, (c, W, H) => {
    c.fillStyle = "#0d3c8c"; c.fillRect(0, 0, W, H); c.strokeStyle = "#fff"; c.lineWidth = 10; c.strokeRect(12, 12, W - 24, H - 24);
    c.fillStyle = "#fff"; c.font = `800 150px ${FONT}`; c.textAlign = "center"; c.fillText("R&R", W / 2, 190);
    c.fillStyle = "#e8e4da"; c.fillRect(60, 240, W - 120, 90);
  });
  const sign = new THREE.Group(); sign.position.set(-7.5, 0, -2.5); g.add(sign);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 10), std(0x55575c, { metalness: 0.5 })); pole.position.y = 1.75; sign.add(pole);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), std(0xffffff, { map: signTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.12 }));
  board.position.set(0, 3.9, 0.1); board.rotation.y = Math.PI / 2; sign.add(board);
  // sodium street lamps
  const lamps = [];
  for (const [x, z] of [[-4.5, -9], [-4.5, 3.5], [-13, -4], [-13, 8], [-20, 1]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 6, 8), std(0x3a3b3e)); p.position.set(x, 2.65, z); g.add(p);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), basic(0xffb15a)); head.position.set(x, 5.65, z); g.add(head);
    const l = new THREE.PointLight(0xff9a3c, 14, 16, 1.6); l.position.set(x, 5.3, z); g.add(l); lamps.push(l);
  }
  // the people of the R&R, all facing the bus (+x)
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
