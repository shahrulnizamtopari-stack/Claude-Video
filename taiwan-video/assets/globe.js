// Globe engine for the "PETA" look: dark satellite globe, regional hi-res patch,
// canvas overlay layers (country fills, borders, claim lines) and screen projection for HTML pins.
import * as THREE from "./lib/three.module.min.js";

const D = Math.PI / 180;

// Same convention as THREE.SphereGeometry + equirect texture (u=0 at lon -180).
export function ll(lat, lon, r = 1) {
  const phi = (lon + 180) * D, th = (90 - lat) * D;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(phi) * Math.sin(th) * r);
}

function patchGeo(r, lon0, lon1, lat0, lat1, seg = 160) {
  return new THREE.SphereGeometry(r, seg, seg, (lon0 + 180) * D, (lon1 - lon0) * D, (90 - lat1) * D, (lat1 - lat0) * D);
}

function loadTex(url) {
  return new Promise((res, rej) => new THREE.TextureLoader().load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, rej));
}

export async function createGlobe(canvas, { W, H, base = "assets/", scale = 1 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(scale);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x05070b, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.001, 50);

  const [earth, hi] = await Promise.all([loadTex(base + "tex/earth-4k.jpg"), loadTex(base + "tex/scs-hi.jpg")]);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 192, 192), new THREE.MeshBasicMaterial({ map: earth })));
  // hi-res patch lon 92-140, lat 0-34 with feathered edges so it melts into the base globe
  const hiMesh = new THREE.Mesh(patchGeo(1.0003, 92, 140, 0, 34), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { map: { value: hi } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: "uniform sampler2D map; varying vec2 vUv; void main(){ vec2 e=min(vUv,1.-vUv); float a=smoothstep(0.,0.06,e.x)*smoothstep(0.,0.08,e.y); vec4 c=texture2D(map,vUv); gl_FragColor=vec4(c.rgb,a);\n#include <colorspace_fragment>\n}",
  }));
  scene.add(hiMesh);

  // Soft blue rim (atmosphere)
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1.06, 96, 96), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false,
    uniforms: { c: { value: new THREE.Color(0x3a7bd5) } },
    vertexShader: "varying vec3 n; varying vec3 v; void main(){ n=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); v=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }",
    fragmentShader: "uniform vec3 c; varying vec3 n; varying vec3 v; void main(){ float i=pow(1.0-abs(dot(n,v)),5.0)*0.0+pow(max(0.0,0.62-dot(n,v)),3.0)*2.2; gl_FragColor=vec4(c,clamp(i,0.,0.55)); }",
  }));
  // atmosphere rim removed (user: thick blue band at the globe edge)
  // scene.add(atm);

  // Overlay layers on a regional patch
  // Each layer has its own lon/lat window and pixels-per-degree; draw with L.ox/L.oy.
  const DEF = { lon0: 92, lon1: 140, lat0: -6, lat1: 34, ppd: 100 };
  const layers = {};
  function layer(name, z, R = DEF) {
    const OW = Math.round((R.lon1 - R.lon0) * R.ppd), OH = Math.round((R.lat1 - R.lat0) * R.ppd);
    const ox = (lon) => (lon - R.lon0) * R.ppd, oy = (lat) => (R.lat1 - lat) * R.ppd;
    const c = document.createElement("canvas"); c.width = OW; c.height = OH;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = new THREE.Mesh(patchGeo(1.0006 + z * 0.0002, R.lon0, R.lon1, R.lat0, R.lat1, 220),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 1 }));
    m.renderOrder = 10 + z; scene.add(m);
    const ctx = c.getContext("2d");
    const path = (geom) => {
      const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
      ctx.beginPath();
      for (const poly of polys) for (const ring of poly) { ring.forEach(([lo, la], i) => (i ? ctx.lineTo(ox(lo), oy(la)) : ctx.moveTo(ox(lo), oy(la)))); ctx.closePath(); }
    };
    return (layers[name] = { c, ctx, tex, mesh: m, ox, oy, R, OW, OH, path, ppd: R.ppd });
  }

  // Ribbons: lines lying on the globe (dashes, routes, measures). Width is in screen-ish units:
  // the "w" uniform is multiplied by camera distance each frame so lines keep a steady pixel width.
  const ribbons = [];
  function ribbon(pts, { color = 0xff2d46, width = 1, dash = 0, glow = 0, r = 1.0016, seg = 6, order = 30 } = {}) {
    // densify along great circles
    const P = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = ll(pts[i][1], pts[i][0]), b = ll(pts[i + 1][1], pts[i + 1][0]);
      for (let k = 0; k < seg; k++) P.push(a.clone().lerp(b, k / seg).normalize());
    }
    P.push(ll(pts[pts.length - 1][1], pts[pts.length - 1][0]));
    const len = [0]; for (let i = 1; i < P.length; i++) len.push(len[i - 1] + P[i].distanceTo(P[i - 1]));
    const L = len[len.length - 1];
    const pos = [], side = [], uv = [], idx = [];
    P.forEach((p, i) => {
      const t = (P[Math.min(i + 1, P.length - 1)].clone().sub(P[Math.max(i - 1, 0)])).normalize();
      const sd = p.clone().cross(t).normalize();
      for (const s of [-1, 1]) { pos.push(p.x * r, p.y * r, p.z * r); side.push(sd.x * s, sd.y * s, sd.z * s); uv.push(len[i] / L, s * 0.5 + 0.5); }
      if (i) { const q = i * 2; idx.push(q - 2, q - 1, q, q - 1, q + 1, q); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("side", new THREE.Float32BufferAttribute(side, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
      uniforms: { col: { value: new THREE.Color(color) }, w: { value: 0.003 * width }, op: { value: 0 }, prog: { value: 1 },
        dash: { value: dash }, off: { value: 0 }, glow: { value: glow }, Lw: { value: L } },
      vertexShader: "attribute vec3 side; uniform float w; varying vec2 vUv; void main(){ vUv=uv; vec3 p=position+side*w; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }",
      fragmentShader: `uniform vec3 col; uniform float op, prog, dash, off, glow; varying vec2 vUv;
        void main(){ if(vUv.x>prog) discard; float a=op;
          float e=1.-abs(vUv.y*2.-1.);
          a*= glow>0. ? pow(e,1.6)*glow : smoothstep(0.,0.25,e);
          if(dash>0.){ float f=fract(vUv.x*dash-off); a*=step(f,0.42); }
          gl_FragColor=vec4(col,a);
          #include <colorspace_fragment>
        }`,
    });
    const m = new THREE.Mesh(g, mat); m.renderOrder = order; m.frustumCulled = false; scene.add(m);
    const R = { mesh: m, u: mat.uniforms, width, L };
    ribbons.push(R); return R;
  }

  const camState = { lat: 10, lon: 112, dist: 3, tilt: 0, yShift: 0 };
  function setView(s) {
    Object.assign(camState, s);
    const { lat, lon, dist, tilt, yShift } = camState;
    const n = ll(lat, lon);
    const east = new THREE.Vector3(0, 1, 0).cross(n).normalize();
    const north = n.clone().cross(east).normalize();
    const t = tilt * D;
    const pos = n.clone().add(n.clone().multiplyScalar(Math.cos(t) * dist).addScaledVector(north, -Math.sin(t) * dist));
    camera.position.copy(pos); camera.up.copy(north); camera.lookAt(n);
    // shift the focus point up/down on screen (fraction of height)
    camera.setViewOffset(W, H, 0, yShift * H, W, H);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    for (const r of ribbons) r.u.w.value = 0.0011 * r.width * dist;
  }

  function project(lat, lon) {
    const p = ll(lat, lon, 1.001); const v = p.clone().project(camera);
    const facing = p.clone().normalize().dot(camera.position.clone().sub(p).normalize()) > 0;
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, visible: facing };
  }

  return { THREE, renderer, scene, camera, setView, project, layer, layers, hiMesh, ribbon, camState,
    render: () => renderer.render(scene, camera) };
}
