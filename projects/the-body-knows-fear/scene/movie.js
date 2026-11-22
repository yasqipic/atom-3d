// The horror film shown on the cinema screen: an old Indonesian house hallway + the kuntilanak.
// Rendered with standard (non-toon) materials into a texture, so the film reads as a different, "live" image.
// The kuntilanak exists ONLY in this scene (never in the auditorium).
import * as THREE from '../../lib/three.module.min.js';
import { canvasTex } from '../world.js';

const S = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.85, metalness: 0, ...o });
export function buildMovie() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#020304');
  scene.fog = new THREE.FogExp2('#030406', 0.11);
  const cam = new THREE.PerspectiveCamera(38, 2.39, 0.05, 60);
  const g = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); scene.add(m); return m; };
  const plaster = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#9d9a8a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(${50 + (i % 4) * 10},${48 + (i % 3) * 8},${36},${0.08 + (i % 5) * 0.03})`; c.beginPath(); c.ellipse((i * 157) % w, (i * 83) % h, 20 + (i % 7) * 14, 30 + (i % 5) * 20, i, 0, 7); c.fill(); }
    for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(40,36,26,.18)'; c.fillRect((i * 97) % w, 0, 3 + (i % 3) * 3, h * (0.3 + (i % 4) * 0.15)); } }, [3, 1]);
  const planks = canvasTex(512, 512, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = ['#3b2a1e', '#33251a', '#412f21', '#2e2117'][i % 4]; c.fillRect(i * 64, 0, 64, h); c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(i * 64, 0, 3, h); } }, [2, 8]);
  const wall = S('#ffffff', { map: plaster }), wood = S('#3a2618', { roughness: 0.6 }), dark = S('#120c08');
  const L = 16;
  const fl = g(new THREE.PlaneGeometry(2.4, L), S('#ffffff', { map: planks, roughness: 0.45 }), 0, 0, -L / 2 + 2); fl.rotation.x = -Math.PI / 2;
  const ce = g(new THREE.PlaneGeometry(2.4, L), S('#2e2c27'), 0, 2.8, -L / 2 + 2); ce.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    const w = g(new THREE.PlaneGeometry(L, 2.8), wall, s * 1.2, 1.4, -L / 2 + 2); w.rotation.y = -s * Math.PI / 2;
    g(new THREE.BoxGeometry(0.03, 0.9, L), wood, s * 1.19, 0.45, -L / 2 + 2);             // wainscot
    g(new THREE.BoxGeometry(0.05, 0.05, L), wood, s * 1.18, 0.92, -L / 2 + 2);
  }
  // doors (one ajar), photo frame, wall clock, jalousie window
  for (const [s, z, ajar] of [[-1, -2.6, false], [1, -4.8, true], [-1, -7.4, false], [1, -9.6, false]]) {
    g(new THREE.BoxGeometry(0.08, 2.2, 1.05), wood, s * 1.17, 1.1, z);
    const d = g(new THREE.BoxGeometry(0.05, 2.05, 0.9), S('#4a3020', { roughness: 0.55 }), s * 1.14, 1.03, z);
    if (ajar) { d.rotation.y = s * 0.5; d.position.x -= s * 0.2; d.position.z += 0.2; g(new THREE.PlaneGeometry(0.9, 2.05), dark, s * 1.185, 1.03, z).rotation.y = -s * Math.PI / 2; }
    for (const y of [0.55, 1.5]) g(new THREE.BoxGeometry(0.06, 0.5, 0.65), S('#3e281a'), s * 1.12, y, z);
  }
  const photo = canvasTex(128, 160, (c, w, h) => { c.fillStyle = '#6e604a'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2219'; c.beginPath(); c.ellipse(64, 62, 22, 28, 0, 0, 7); c.fill(); c.fillRect(30, 90, 68, 70); });
  const ph = g(new THREE.PlaneGeometry(0.34, 0.42), S('#ffffff', { map: photo }), -1.17, 1.65, -5.6); ph.rotation.y = Math.PI / 2;
  g(new THREE.BoxGeometry(0.03, 0.48, 0.4), wood, -1.185, 1.65, -5.6);
  const clock = g(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 24), S('#d8cfb4'), 1.16, 1.9, -6.6); clock.rotation.z = Math.PI / 2;
  for (let k = 0; k < 9; k++) g(new THREE.BoxGeometry(0.04, 0.03, 0.7), wood, 1.16, 1.35 + k * 0.09, -3.4); // jalousie slats
  // end of hallway: dark doorway
  g(new THREE.PlaneGeometry(2.4, 2.8), wall, 0, 1.4, -13.2);
  g(new THREE.PlaneGeometry(1.0, 2.2), S('#000000'), 0, 1.1, -13.17);
  g(new THREE.BoxGeometry(1.2, 0.1, 0.1), wood, 0, 2.22, -13.15);
  // lights: flickering bulb mid-hall, cold moon from the window, a faint far light that reveals her
  const bulb = new THREE.PointLight('#ffcf8a', 2.2, 7, 2); bulb.position.set(0, 2.3, -4.2); scene.add(bulb);
  const bulbMesh = g(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff0c8' }), 0, 2.45, -4.2);
  g(new THREE.CylinderGeometry(0.004, 0.004, 0.35), S('#111'), 0, 2.63, -4.2);
  const moon = new THREE.PointLight('#7f9cff', 1.4, 5, 2); moon.position.set(0.9, 1.7, -3.4); scene.add(moon);
  const far = new THREE.PointLight('#a8bcff', 0, 6, 2); far.position.set(0.2, 2.3, -10.6); scene.add(far);
  scene.add(new THREE.AmbientLight('#2a3550', 0.35));
  const kunti = makeKuntilanak(); scene.add(kunti.root);
  return { scene, cam, bulb, bulbMesh, moon, far, kunti };
}

// ---------- kuntilanak: long black hair, white dress, pale non-graphic face ----------
function makeKuntilanak() {
  const root = new THREE.Group();
  const dressM = S('#e9e7df', { roughness: 0.9, emissive: new THREE.Color('#2b3038'), side: THREE.DoubleSide });
  const pts = []; for (let i = 0; i <= 30; i++) { const y = 1.48 - i * 0.05; pts.push(new THREE.Vector2(0.15 + 0.3 * Math.pow(i / 30, 1.3) + (i < 4 ? -0.02 * (4 - i) : 0), y)); }
  const dressGeo = new THREE.LatheGeometry(pts, 48); const dress = new THREE.Mesh(dressGeo, dressM); root.add(dress);
  const base = dressGeo.attributes.position.array.slice();
  // sleeves + hands
  const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(s * 0.17, 1.42, 0); root.add(a);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.06, 0.62, 12), dressM); sl.position.y = -0.31; a.add(sl);
    const hand = new THREE.Group(); hand.position.y = -0.64; a.add(hand);
    const skin = S('#b9c2c0', { roughness: 0.7, emissive: new THREE.Color('#1a2224') });
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), skin); palm.scale.set(1, 1.3, 0.6); hand.add(palm);
    for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.11, 6), skin); f.position.set((k - 1.5) * 0.014, -0.08, 0); hand.add(f); }
    return a; });
  // head
  const head = new THREE.Group(); head.position.set(0, 1.62, 0.0); root.add(head);
  // equirectangular face map: 1024 px = 360 deg, face centre at u = 0.5
  const fc = canvasTex(1024, 512, (c) => {
    c.fillStyle = '#c3ccc8'; c.fillRect(0, 0, 1024, 512);
    const gr = c.createRadialGradient(512, 270, 30, 512, 270, 210); gr.addColorStop(0, 'rgba(230,238,236,.55)'); gr.addColorStop(1, 'rgba(40,55,60,.5)'); c.fillStyle = gr; c.fillRect(0, 0, 1024, 512);
    for (const s of [-1, 1]) { const x = 512 + s * 44, y = 238;
      const e = c.createRadialGradient(x, y, 3, x, y, 44); e.addColorStop(0, 'rgba(5,4,6,1)'); e.addColorStop(0.6, 'rgba(20,18,24,.95)'); e.addColorStop(1, 'rgba(70,80,86,0)'); c.fillStyle = e; c.beginPath(); c.ellipse(x, y, 40, 34, 0, 0, 7); c.fill();
      c.fillStyle = '#f2f5f5'; c.beginPath(); c.ellipse(x, y, 20, 11, 0, 0, 7); c.fill();
      c.fillStyle = '#7d878b'; c.beginPath(); c.arc(x - s * 2, y, 5.5, 0, 7); c.fill(); c.fillStyle = '#101014'; c.beginPath(); c.arc(x - s * 2, y, 2.2, 0, 7); c.fill();
      c.strokeStyle = 'rgba(20,20,26,.85)'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, 18, 10, 0, 0, 7); c.stroke();
      c.strokeStyle = 'rgba(70,80,90,.35)'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x - 18, y + 14 + i * 5); c.quadraticCurveTo(x, y + 20 + i * 6, x + 18, y + 14 + i * 5); c.stroke(); } }
    c.strokeStyle = 'rgba(60,70,76,.55)'; c.lineWidth = 3; c.beginPath(); c.moveTo(512, 255); c.lineTo(507, 292); c.quadraticCurveTo(512, 298, 518, 294); c.stroke();
    c.fillStyle = 'rgba(80,88,92,.8)'; c.beginPath(); c.ellipse(512, 336, 26, 5, 0, 0, 7); c.fill();
  }); fc.colorSpace = THREE.SRGBColorSpace;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 32, 24), S('#ffffff', { map: fc, roughness: 0.7, emissive: new THREE.Color('#141a1c') }));
  skull.scale.set(0.95, 1.18, 1); skull.rotation.y = -Math.PI / 2; head.add(skull); fc.wrapS = THREE.ClampToEdgeWrapping;
  // mouth: closed (thin grey) -> open (dark oval) for the scream
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 10), S('#0a0606', { roughness: 1 })); mouth.position.set(0, -0.072, 0.1); mouth.scale.set(1, 0.25, 0.4); head.add(mouth);
  // hair: ribbons from the scalp, updated every frame (gravity + slow sway + wind when she lunges)
  const hairM = S('#07070a', { roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide });
  const strands = [];
  for (let i = 0; i < 150; i++) {
    const a = (i / 150) * Math.PI * 2 + Math.sin(i * 7.1) * 0.05, front = Math.cos(a) > 0.2;
    const part = Math.abs(Math.sin(a)) < 0.06 && Math.cos(a) > 0; if (part) continue; // centre parting shows a sliver of face
    const len = (front ? 0.75 : 1.05) + Math.sin(i * 3.3) * 0.1;
    const geo = new THREE.PlaneGeometry(0.045, 1, 1, 16); const m = new THREE.Mesh(geo, hairM); m.frustumCulled = false; head.add(m);
    const sx = Math.sin(a) * 0.112, sz = Math.cos(a) * 0.118;
    strands.push({ m, geo, a, len, root: new THREE.Vector3(sx, 0.08 + (front ? 0.02 : -0.01), sz), seed: i, front });
  }
  const K = { root, head, mouth, arms, dress, strands, wind: 0, scream: 0, open: 0, t: 0 };
  K.update = (t) => {
    const v = new THREE.Vector3(), P = [];
    for (const s of strands) {
      const pos = s.geo.attributes.position, n = 17;
      const out = new THREE.Vector3(Math.sin(s.a), 0, Math.cos(s.a));
      // hair falls over the face: front strands curtain in front, a gap on one side reveals an eye
      const gap = s.front && Math.sin(s.a) < -0.25 && Math.sin(s.a) > -0.65 ? 0.035 : 0;
      for (let k = 0; k < n; k++) {
        const u = k / (n - 1), d = u * s.len;
        const sway = Math.sin(t * 0.9 + s.seed * 0.7 + u * 2) * 0.012 * u + Math.sin(t * 2.1 + s.seed) * 0.004 * u;
        const part = s.front ? Math.sign(out.x || 1) * (0.012 + 0.075 * K.open) * (0.55 + 0.45 * Math.min(1, u * 2.5)) : 0;
        const x = s.root.x + out.x * (0.035 + gap) * Math.min(1, u * 6) + sway - out.x * 0.02 * u + part + K.wind * Math.sin(s.seed * 1.7) * 0.18 * u * u;
        const z = s.root.z + out.z * (s.front ? 0.06 : 0.04) * Math.min(1, u * 5) - K.wind * 0.55 * u * u + (s.front ? 0.03 * u : -0.02 * u);
        const y = s.root.y + 0.02 - d + K.wind * 0.22 * u * u;
        for (const side of [-1, 1]) {
          const idx = k * 2 + (side > 0 ? 1 : 0);
          const tx = -out.z, tz = out.x; // ribbon width along the tangent of the scalp
          pos.setXYZ(idx, x + tx * side * 0.022 * (1 - u * 0.5), y, z + tz * side * 0.022 * (1 - u * 0.5));
        }
      }
      pos.needsUpdate = true; s.geo.computeVertexNormals();
    }
    // dress ripple
    const dp = K.dress.geometry.attributes.position;
    for (let i = 0; i < dp.count; i++) { const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2], h = (1.48 - by) / 1.5, a = Math.atan2(bx, bz);
      const r = 1 + 0.035 * h * Math.sin(a * 5 + t * 1.3) + 0.02 * h * Math.sin(a * 9 - t * 2.1);
      dp.setXYZ(i, bx * r, by + K.wind * 0.15 * h * h, bz * r - K.wind * 0.5 * h * h); }
    dp.needsUpdate = true; K.dress.geometry.computeVertexNormals();
    mouth.scale.set(1 - 0.2 * K.scream, 0.25 + 1.15 * K.scream, 0.4 + 0.2 * K.scream);
  };
  return K;
}
