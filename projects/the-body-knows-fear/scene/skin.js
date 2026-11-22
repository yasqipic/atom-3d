// Extreme macro of skin: cut-away block (epidermis / dermis / fat), hair follicles with arrector pili muscles.
// Muscles contract -> follicles rotate upright -> hairs stand -> goosebump bumps rise. Units: 1 = ~1 mm.
import * as THREE from '../../lib/three.module.min.js';
import { M, C, add, canvasTex } from '../world.js';
import { noise3 } from './science.js';

export function buildSkin() {
  const scene = new THREE.Scene(); scene.background = C('#140c0c');
  const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ vec3 d=normalize(vP); float g=smoothstep(-.5,.9,d.y*.6+d.z*.5); gl_FragColor=vec4(mix(vec3(.05,.025,.03),vec3(.2,.11,.1),g),1.); }' }));
  dome.layers.set(2); scene.add(dome);
  const W = 4.2, D = 3.0, SX = 300, SZ = 200;
  // skin surface texture: mottled tone + polygonal crease network
  const skinTex = canvasTex(1024, 1024, (c, w, h) => { c.fillStyle = '#dca084'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(${170 + (i % 5) * 10},${100 + (i % 7) * 6},${80},${0.05 + (i % 4) * 0.02})`; c.beginPath(); c.arc((i * 241) % w, (i * 157) % h, 10 + (i % 9) * 6, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(120,60,50,.35)'; c.lineWidth = 2.5; let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, a = r() * Math.PI; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 70, y + Math.sin(a) * 70); c.stroke(); } });
  const surfGeo = new THREE.PlaneGeometry(W, D, SX, SZ); surfGeo.rotateX(-Math.PI / 2); surfGeo.translate(0, 0, -D / 2);
  const sp = surfGeo.attributes.position, base = new Float32Array(sp.count);
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), z = sp.getZ(i); base[i] = 0.012 * noise3(x * 2.2, 0.3, z * 2.2) - 0.008 * Math.abs(noise3(x * 5, 1.7, z * 5)); }
  const surfM = M('#ffffff').clone(); surfM.map = skinTex;
  const surf = new THREE.Mesh(surfGeo, surfM); surf.receiveShadow = true; scene.add(surf);
  // cut face with the layers
  const layerTex = canvasTex(1024, 512, (c, w, h) => {
    const y = (mm) => (mm / 1.6) * h;  // 1.6 units tall
    c.fillStyle = '#f2d58e'; c.fillRect(0, 0, w, h);                                   // hypodermis (fat)
    for (let i = 0; i < 70; i++) { c.strokeStyle = 'rgba(200,150,60,.6)'; c.lineWidth = 3; c.fillStyle = 'rgba(255,230,150,.6)'; c.beginPath(); c.arc((i * 151) % w, y(1.05) + ((i * 37) % 110), 22 + (i % 4) * 6, 0, 7); c.fill(); c.stroke(); }
    c.fillStyle = '#e59a98'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); for (let x = w; x >= 0; x -= 16) c.lineTo(x, y(1.0) + Math.sin(x * 0.03) * 10); c.fill(); // dermis
    c.strokeStyle = 'rgba(250,200,200,.55)'; c.lineWidth = 3; for (let i = 0; i < 60; i++) { c.beginPath(); const yy = y(0.2) + (i * 29) % (y(0.8)); c.moveTo((i * 97) % w, yy); c.bezierCurveTo((i * 97) % w + 60, yy - 20, (i * 97) % w + 100, yy + 20, (i * 97) % w + 160, yy); c.stroke(); }
    for (let i = 0; i < 14; i++) { const cx = (i * 233) % w, cy = y(0.55) + (i % 3) * 30; c.fillStyle = i % 2 ? '#b3313c' : '#4a5aa8'; c.beginPath(); c.ellipse(cx, cy, 9, 6, 0, 0, 7); c.fill(); }
    c.fillStyle = '#d98e78'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); for (let x = w; x >= 0; x -= 8) c.lineTo(x, y(0.11) + Math.sin(x * 0.09) * 6); c.fill(); // epidermis
    c.fillStyle = '#b8705e'; for (let x = 0; x < w; x += 8) c.fillRect(x, y(0.11) + Math.sin(x * 0.09) * 6 - 3, 8, 5);  // basal layer
    c.fillStyle = '#e8b49c'; c.fillRect(0, 0, w, y(0.025));                              // stratum corneum
  });
  const cutGeo = new THREE.PlaneGeometry(W, 1.6, SX, 1); cutGeo.translate(0, -0.8, 0.0);
  const cutM = M('#ffffff').clone(); cutM.map = layerTex;
  const cut = new THREE.Mesh(cutGeo, cutM); scene.add(cut);
  const sideGeo = new THREE.PlaneGeometry(D, 1.6, SZ, 1); sideGeo.rotateY(Math.PI / 2); sideGeo.translate(W / 2, -0.8, -D / 2); const side = new THREE.Mesh(sideGeo, cutM); scene.add(side);
  // follicles: front row sits in the cut plane; more hairs behind on the surface
  const hairM = M('#2b1a12'), folM = M('#c98a7c'), bulbM = M('#8e4a3a'), glandM = M('#f0d08a');
  const musM = new THREE.MeshToonMaterial({ color: C('#c04452'), gradientMap: M('#c04452').gradientMap, emissive: C('#ff4050'), emissiveIntensity: 0 });
  const hairs = [];
  const mkHair = (x, z, front, delay, lean = 1) => {
    const piv = new THREE.Group(); piv.position.set(x, 0, z); scene.add(piv);
    const tilt = new THREE.Group(); piv.add(tilt);
    const L = 0.95 + Math.sin(x * 9 + z * 5) * 0.12;
    const shaft = add(tilt, new THREE.CylinderGeometry(0.005, front ? 0.018 : 0.013, L, 8), hairM, 0, L / 2 - 0.02, 0); shaft.castShadow = true;
    const h = { piv, tilt, delay, front, lean, x, z, mus: null };
    if (front) {
      add(tilt, new THREE.CapsuleGeometry(0.05, 0.62, 6, 14), folM, 0, -0.38, 0);
      add(tilt, new THREE.SphereGeometry(0.085, 16, 12), bulbM, 0, -0.74, 0).scale.set(1, 1.2, 1);
      add(tilt, new THREE.CylinderGeometry(0.012, 0.016, 0.7, 8), hairM, 0, -0.36, 0.0);
      for (let k = 0; k < 3; k++) add(tilt, new THREE.SphereGeometry(0.05, 12, 10), glandM, 0.07 + k * 0.025, -0.16 - k * 0.05, 0.0);
      const mm = new THREE.Mesh(new THREE.BufferGeometry(), musM); mm.castShadow = true; scene.add(mm); h.mus = mm;
    }
    hairs.push(h); return h;
  };
  const front = [-1.5, -0.75, 0, 0.75, 1.5].map((x, i) => mkHair(x, 0.05, true, Math.abs(i - 2) * 0.22));
  let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) { const x = -1.95 + r() * 3.9, z = -0.35 - r() * 2.5; mkHair(x, z, false, 0.15 + Math.hypot(x, z + 0.3) * 0.28 + r() * 0.15, 0.85 + r() * 0.3); }
  const tmp = new THREE.Vector3();
  const S = {
    scene, hairs, front, musM, surf, cut,
    // k: contraction per hair (0..1) from a global time
    update(t, t0) {
      const bumps = [];
      for (const h of hairs) {
        const k = Math.min(1, Math.max(0, (t - t0 - h.delay) / 1.4)), e = k * k * (3 - 2 * k);
        h.k = e;
        const ang = (62 - 52 * e) * h.lean * Math.PI / 180;   // from vertical: lying (62 deg) -> upright (10 deg)
        h.tilt.rotation.z = -ang;
        h.piv.position.y = 0.05 * e + base0(h.x, h.z);
        bumps.push([h.x, h.z, e]);
        if (h.mus) { // arrector pili: from the follicle bulge to the underside of the epidermis on the lean side
          const a = new THREE.Vector3(0, -0.42, 0.0).applyAxisAngle(new THREE.Vector3(0, 0, 1), -ang).add(h.piv.position);
          const b = new THREE.Vector3(h.x + 0.42, -0.14, h.z);
          const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0.02, -0.06 * (1 - e), 0));
          h.mus.geometry.dispose();
          const c = new THREE.QuadraticBezierCurve3(a, mid, b);
          const g = new THREE.TubeGeometry(c, 16, 0.028 + 0.016 * e, 8, false);
          // fusiform: thicker in the middle
          const p = g.attributes.position, uv = g.attributes.uv;
          for (let i = 0; i < p.count; i++) { const u = uv.getX(i), pt = c.getPoint(u); tmp.fromBufferAttribute(p, i).sub(pt); const f = 0.55 + 0.75 * Math.sin(Math.PI * u); tmp.multiplyScalar(f); p.setXYZ(i, pt.x + tmp.x, pt.y + tmp.y, pt.z + tmp.z); }
          g.computeVertexNormals(); h.mus.geometry = g;
        }
      }
      musM.emissiveIntensity = 0.0;
      // goosebump bumps on the surface + cut-face top edge
      const H = (x, z) => { let y = 0; for (const [bx, bz, e] of bumps) { if (e <= 0) continue; const d2 = (x - bx) ** 2 + (z - bz) ** 2; if (d2 < 0.12) y += 0.075 * e * Math.exp(-d2 / 0.018); } return y; };
      for (let i = 0; i < sp.count; i++) sp.setY(i, base[i] + H(sp.getX(i), sp.getZ(i)));
      sp.needsUpdate = true; surfGeo.computeVertexNormals();
      const cp = cutGeo.attributes.position; for (let i = 0; i < cp.count; i++) if (cp.getY(i) > -0.01 || i <= SX) { if (i <= SX) cp.setY(i, H(cp.getX(i), 0) + 0.004 * noise3(cp.getX(i) * 2.2, 0.3, 0)); }
      cp.needsUpdate = true;
    },
  };
  function base0(x, z) { return 0.012 * noise3(x * 2.2, 0.3, z * 2.2); }
  return S;
}
