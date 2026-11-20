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

export async function createGlobe(canvas, { W, H, base = "assets/" } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
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
  scene.add(atm);

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
  }

  function project(lat, lon) {
    const p = ll(lat, lon, 1.001); const v = p.clone().project(camera);
    const facing = p.clone().normalize().dot(camera.position.clone().sub(p).normalize()) > 0;
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, visible: facing };
  }

  return { THREE, renderer, scene, camera, setView, project, layer, layers, hiMesh,
    render: () => renderer.render(scene, camera) };
}
