// Krakatau 1883 sets: ocean, volcano, eruption column, shockwave, lava bombs, lightning, village, palms, huts, boat,
// tsunami wave, lanterns, globe. World units: metres near characters; the volcano is drawn at "storybook" scale.
import * as THREE from '../../lib/three.module.min.js';
import { C, M, TM, add, box, canvasTex } from '../world.js';

let sd = 1234; export const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const ramp = new THREE.DataTexture(new Uint8Array([0, 255]), 2, 1, THREE.RedFormat); ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
export const VM = (opt = {}) => new THREE.MeshToonMaterial({ gradientMap: ramp, vertexColors: true, ...opt });
export const HDR = (r, g, b, opt = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false, ...opt });

// ---------- ocean ----------
export function makeOcean(parent) {
  const tex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#2f8cc6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const x = rnd() * w, y = rnd() * h, l = 30 + rnd() * 90;
      g.strokeStyle = rnd() < 0.6 ? 'rgba(170,225,250,.55)' : 'rgba(20,80,130,.35)'; g.lineWidth = 4 + rnd() * 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 8, x + l, y); g.stroke(); }
  }, [2000, 2000]);
  const m = add(parent, new THREE.PlaneGeometry(40000, 40000), TM(tex), 0, 0, 0, false); m.rotation.x = -Math.PI / 2;
  return m;
}
// near-field ocean patch with a finer texture (scrolls) for character shots
export function oceanPatch(parent, size = 400, rep = 40) {
  const tex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#2f8cc6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = rnd() * w, y = rnd() * h, l = 30 + rnd() * 60;
      g.strokeStyle = rnd() < 0.65 ? 'rgba(185,232,252,.7)' : 'rgba(20,80,130,.35)'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 7, x + l, y); g.stroke(); }
  }, [rep, rep]);
  const m = add(parent, new THREE.PlaneGeometry(size, size), TM(tex), 0, 0.02, 0, false); m.rotation.x = -Math.PI / 2;
  m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1; m.material.polygonOffsetUnits = -2;
  return m;
}

// ---------- volcano (lathe cone with ridges, vertex colours) ----------
export function makeVolcano(parent, { R = 200, Hh = 90, seed = 3 } = {}) {
  const pts = [];
  const N = 36;
  for (let j = 0; j <= N; j++) {
    const v = j / N; let r, y;
    if (v < 0.86) { const k = v / 0.86; y = -6 + (Hh + 6) * k; r = 22 + (R - 22) * Math.pow(1 - k, 1.7); }
    else { const k = (v - 0.86) / 0.14; y = Hh - 9 * Math.sin(k * Math.PI / 2); r = 22 - 14 * k; }
    pts.push(new THREE.Vector2(Math.max(0.5, r), y));
  }
  const geo = new THREE.LatheGeometry(pts, 96).toNonIndexed();
  const p = geo.attributes.position, col = [];
  const c1 = C('#4f9a3c'), c2 = C('#8a6a4a'), c3 = C('#6c6470'), c4 = C('#3a3236'), sand = C('#e8d29a');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
    const ridge = 1 + 0.07 * Math.sin(a * 9 + seed) + 0.05 * Math.sin(a * 23 + seed * 2) + 0.03 * Math.sin(a * 41);
    const s = y < Hh - 9 ? ridge : 1;
    p.setX(i, x * s); p.setZ(i, z * s);
    const k = THREE.MathUtils.clamp(y / Hh, 0, 1);
    const c = new THREE.Color();
    if (y < 1.2) c.copy(sand);
    else if (k < 0.45) c.copy(c1).lerp(c2, Math.max(0, (k - 0.3) / 0.15));
    else if (k < 0.9) c.copy(c2).lerp(c3, (k - 0.45) / 0.45);
    else c.copy(c3).lerp(c4, (k - 0.9) / 0.1);
    void r; col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const g = new THREE.Group(); parent.add(g);
  const mesh = new THREE.Mesh(geo, VM()); mesh.receiveShadow = true; g.add(mesh);
  // jungle bumps on the lower slopes
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, k = 0.08 + rnd() * 0.28, y = (Hh + 6) * k - 6, r = (22 + (R - 22) * Math.pow(1 - k, 1.7)) * 0.98;
    const b = add(g, new THREE.IcosahedronGeometry(4 + rnd() * 5, 0), '#3f8a36', Math.cos(a) * r, y + 1, Math.sin(a) * r, false); b.scale.y = 0.6;
  }
  // lava streaks (glow, no ink): alpha canvas over a slightly larger copy
  const lavaTex = canvasTex(1024, 512, (c2d, w, h) => {
    c2d.fillStyle = '#000'; c2d.fillRect(0, 0, w, h); c2d.strokeStyle = '#fff'; c2d.lineCap = 'round';
    for (let i = 0; i < 11; i++) { let x = rnd() * w, y = h * 0.02; c2d.lineWidth = 7 + rnd() * 9; c2d.beginPath(); c2d.moveTo(x, y);
      const len = h * (0.25 + rnd() * 0.4); while (y < len) { y += 12; x += (rnd() - 0.5) * 14; c2d.lineTo(x, y); } c2d.stroke(); }
  });
  const lavaGeo = new THREE.LatheGeometry(pts.map((q) => new THREE.Vector2(q.x * 1.012 + 0.3, q.y + 0.2)), 96);
  const lava = new THREE.Mesh(lavaGeo, HDR(3.2, 1.0, 0.18, { alphaMap: lavaTex, transparent: true, opacity: 0, depthWrite: false }));
  lava.layers.set(2); g.add(lava);
  // crater glow disc
  const glow = add(g, new THREE.CircleGeometry(9, 24), HDR(3.5, 1.3, 0.25), 0, Hh - 8.5, 0, false); glow.rotation.x = -Math.PI / 2; glow.layers.set(2);
  return { g, lava, glow, crater: new THREE.Vector3(0, Hh - 6, 0), Hh, R };
}
export function makeIsle(parent, x, z, R, Hh, colTop = '#4f9a3c') {
  const pts = []; for (let j = 0; j <= 12; j++) { const k = j / 12; pts.push(new THREE.Vector2(Math.max(0.3, R * Math.cos(k * Math.PI / 2) ** 0.8), -3 + (Hh + 3) * Math.sin(k * Math.PI / 2))); }
  const m = add(parent, new THREE.LatheGeometry(pts, 40), colTop, x, 0, z, false); m.scale.z = 0.7; return m;
}

// ---------- eruption column (deterministic particle puffs) ----------
// power(b): emission power at eruption-clock time b. blasts: [{t, amp}]
export function makeEruption(parent, crater, { power, domains, blasts }) {
  const puffs = [], geo = new THREE.IcosahedronGeometry(1, 1);
  const hot = C('#ff8a3a');
  let i = 0;
  for (const [a, b] of domains) for (let t = a; t < b; t += 0.05, i++) {
    const p = power(t); if (p <= 0.01) continue;
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: C('#8d8590'), gradientMap: ramp, emissive: C('#000000') }));
    m.visible = false; m.castShadow = false; m.receiveShadow = false; parent.add(m);
    puffs.push({ m, b: t, p, h1: hash(i), h2: hash(i + 0.37), h3: hash(i + 0.71), h4: hash(i + 0.13) });
  }
  // lava bombs
  const bombs = [], bg = new THREE.SphereGeometry(1, 10, 8), bm = HDR(4, 1.5, 0.3);
  blasts.forEach((B, k) => { for (let j = 0; j < Math.round(26 * B.amp); j++) {
    const h = (x) => hash(k * 100 + j + x);
    const az = h(0.1) * Math.PI * 2, el = (50 + h(0.2) * 35) * Math.PI / 180, v = (60 + h(0.3) * 110) * (0.6 + B.amp * 0.5);
    const trail = [];
    for (let q = 0; q < 4; q++) { const s = new THREE.Mesh(bg, bm); s.layers.set(2); s.visible = false; parent.add(s); trail.push(s); }
    bombs.push({ t: B.t, az, el, v, r: 1.6 + h(0.4) * 2.4, trail });
  } });
  const flash = new THREE.PointLight(C('#ff9a4a'), 0, 0, 0); flash.position.copy(crater).add(new THREE.Vector3(0, 30, 0)); parent.add(flash);
  return {
    puffs, flash,
    update(eT, { hide = false, wind = 6 } = {}) {
      for (const q of puffs) {
        const a = eT - q.b, life = 5.5 + 5 * q.p + q.h4 * 2;
        if (hide || a < 0 || a > life) { q.m.visible = false; continue; }
        const Hmax = 50 + 950 * q.p * (0.75 + 0.35 * q.h1), tau = 1.1 + 0.9 * q.p;
        const y = Hmax * (1 - Math.exp(-a / tau));
        const top = Math.max(0, y / Hmax - 0.62) / 0.38;
        const ang = q.h2 * Math.PI * 2;
        const rad = (2 + 14 * q.p) * Math.sqrt(a) * (0.3 + q.h3) + top * top * Hmax * 0.55 * (0.35 + q.h3 * 0.65);
        const s = (5 + 34 * q.p) * (0.35 + Math.min(1, a / 1.4) * (0.85 + 0.45 * q.h4) + top * 0.5) * Math.min(1, (life - a) / 0.9);
        q.m.visible = s > 0.2;
        q.m.position.set(crater.x + Math.cos(ang) * rad + wind * a, crater.y + y, crater.z + Math.sin(ang) * rad);
        q.m.scale.set(s, s * 0.88, s);
        const heat = q.p > 0.25 ? Math.max(0, 1 - a / 0.7) : 0;
        const dark = 0.62 + 0.38 * Math.min(1, y / 500) + 0.08 * q.h1;
        q.m.material.color.setRGB(0.47 * dark, 0.44 * dark, 0.48 * dark);
        q.m.material.emissive.copy(hot).multiplyScalar(heat * 0.9);
      }
      let fl = 0;
      for (const B of blasts) { const a = eT - B.t; if (a >= 0 && a < 1.5) fl = Math.max(fl, B.amp * Math.exp(-a * 3)); }
      flash.intensity = hide ? 0 : fl * 3.5;
      for (const o of bombs) {
        for (let q = 0; q < 4; q++) {
          const a = eT - o.t - q * 0.035, s = o.trail[q];
          if (hide || a < 0) { s.visible = false; continue; }
          const vh = o.v * Math.cos(o.el), vy = o.v * Math.sin(o.el);
          const y = crater.y + vy * a - 0.5 * 120 * a * a;
          if (y < 0) { s.visible = false; continue; }
          s.visible = true; s.position.set(crater.x + Math.cos(o.az) * vh * a, y, crater.z + Math.sin(o.az) * vh * a); s.scale.setScalar(o.r * (1 - q * 0.22));
        }
      }
      return fl;
    },
  };
}

// ---------- shockwave: translucent dome + ring on the water ----------
export function makeShock(parent, centre) {
  const domeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { op: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform float op; varying vec3 vN; varying vec3 vV; void main(){ float f=1.-abs(dot(vN,vV)); float a=op*(0.08+0.9*pow(f,3.)); gl_FragColor=vec4(vec3(1.,.97,.9)*1.2,a); }' });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat); dome.layers.set(2); dome.position.copy(centre); dome.position.y = 0; parent.add(dome);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 128), new THREE.MeshBasicMaterial({ color: C('#ffffff'), transparent: true, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(centre.x, 0.3, centre.z); ring.layers.set(2); parent.add(ring);
  const ring2 = ring.clone(); ring2.material = ring.material.clone(); parent.add(ring2);
  return {
    update(eT, blasts, speed = 700) {
      let best = null;
      for (const B of blasts) { const a = eT - B.t; if (a >= 0 && a < 4 && B.dome) best = { a, B }; }
      dome.visible = ring.visible = ring2.visible = !!best; if (!best) return;
      const R = Math.max(1, best.a * speed * best.B.dome);
      dome.scale.set(R, R * 0.55, R); domeMat.uniforms.op.value = Math.max(0, 1 - best.a / 3.2);
      ring.scale.setScalar(R); ring.material.opacity = Math.max(0, 1 - best.a / 3.5);
      ring2.scale.setScalar(R * 0.78); ring2.material.opacity = 0.5 * Math.max(0, 1 - best.a / 3);
    },
  };
}

// ---------- volcanic lightning ----------
export function makeBolts(parent, n = 4) {
  const bolts = [];
  for (let k = 0; k < n; k++) {
    const pts = []; let p = new THREE.Vector3((hash(k) - 0.5) * 120, 0, (hash(k + 9) - 0.5) * 60);
    for (let j = 0; j < 9; j++) { pts.push(p.clone()); p = p.clone().add(new THREE.Vector3((hash(k * 10 + j) - 0.5) * 70, -30 - hash(k * 7 + j) * 25, (hash(k * 13 + j) - 0.5) * 30)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), 40, 1.6, 5), HDR(3.2, 3.0, 4.5));
    m.layers.set(2); m.visible = false; parent.add(m); bolts.push(m);
  }
  return bolts;
}

// ---------- palm ----------
export function makePalm(parent, x, z, h = 6, lean = 0.3, rot = 0, y0 = 0) {
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = rot; parent.add(g);
  const top = new THREE.Vector3(h * lean, h, 0);
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, h * 0.6, 0), top);
  add(g, new THREE.TubeGeometry(curve, 12, h * 0.035, 8), '#8a6a48');
  const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(h * 0.25, h * 0.08, h * 0.5, 0); leaf.quadraticCurveTo(h * 0.25, -h * 0.03, 0, 0);
  const lg = new THREE.ExtrudeGeometry(leaf, { depth: 0.04, bevelEnabled: false });
  for (let i = 0; i < 8; i++) {
    const piv = new THREE.Group(); piv.position.copy(top); g.add(piv);
    const l = add(piv, lg, i % 2 ? '#3f9a3a' : '#4fae44'); l.rotation.x = Math.PI / 2;
    piv.rotation.set(0, (i / 8) * Math.PI * 2 + rnd() * 0.3, -0.25 - (i % 3) * 0.15);
  }
  for (let i = 0; i < 3; i++) add(g, new THREE.SphereGeometry(h * 0.04, 8, 6), '#6a4a2a', top.x + Math.cos(i * 2) * 0.2, top.y - 0.2, top.z + Math.sin(i * 2) * 0.2);
  return g;
}
// ---------- stilt hut (rumah panggung) ----------
const weave = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d4ad6c'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,80,40,.45)'; g.lineWidth = 4;
  for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(0, i * 16); g.lineTo(w, i * 16); g.stroke(); } for (let i = 0; i < 16; i++) { g.strokeStyle = 'rgba(255,240,200,.25)'; g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, h); g.stroke(); } }, [2, 1]);
const thatch = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9a6e3a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(60,35,15,.5)'; g.lineWidth = 3;
  for (let i = 0; i < 60; i++) { const x = (i * 37) % w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, h); g.stroke(); } for (let y = 40; y < h; y += 64) { g.fillStyle = 'rgba(60,35,15,.45)'; g.fillRect(0, y, w, 5); } }, [3, 2]);
export function makeHut(parent, x, z, rot = 0, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; g.scale.setScalar(s); parent.add(g);
  for (const [px, pz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) add(g, new THREE.CylinderGeometry(0.09, 0.11, 1.4, 6), '#6b4a30', px, 0.7, pz);
  add(g, box(3.1, 0.18, 3.1), '#8a6440', 0, 1.45, 0);
  const wm = TM(weave); add(g, box(2.8, 1.7, 2.8), wm, 0, 2.4, 0);
  add(g, box(0.7, 1.1, 0.06), '#4a3020', 0.5, 2.15, 1.42);
  add(g, box(0.6, 0.45, 0.06), '#2c2430', -0.7, 2.6, 1.42);
  const shp = new THREE.Shape([new THREE.Vector2(-2.0, 0), new THREE.Vector2(2.0, 0), new THREE.Vector2(0, 1.8)]);
  const roof = add(g, new THREE.ExtrudeGeometry(shp, { depth: 3.6, bevelEnabled: false }), TM(thatch), 0, 3.22, -1.8);
  void roof;
  for (let i = 0; i < 4; i++) add(g, box(0.5, 0.05, 0.12), '#7a5636', 0.5, 0.3 + i * 0.32, 1.9 - i * 0.1);
  return g;
}
// ---------- outrigger boat (bow toward +z) ----------
export function makeBoat(parent) {
  const g = new THREE.Group(); parent.add(g);
  const hull = add(g, new THREE.CylinderGeometry(0.55, 0.55, 5, 16, 1, false, 0, Math.PI), '#a0522d', 0, 0.35, 0);
  hull.rotation.set(Math.PI / 2, 0, Math.PI); hull.scale.set(1, 1, 0.75);
  add(g, box(0.95, 0.08, 4.4), '#c8925a', 0, 0.36, 0);
  add(g, box(1.12, 0.12, 5), '#f2e6c8', 0, 0.38, 0).scale.set(1, 1, 1);
  for (const s of [-1, 1]) { add(g, box(3.8, 0.08, 0.08), '#7a5636', 0, 0.5, s * 1.2); }
  for (const s of [-1, 1]) { const o = add(g, new THREE.CylinderGeometry(0.11, 0.11, 3.6, 8), '#d9b98a', s * 1.85, 0.2, 0); o.rotation.x = Math.PI / 2; }
  const prow = add(g, new THREE.ConeGeometry(0.4, 1.2, 12), '#a0522d', 0, 0.45, 2.9); prow.rotation.x = Math.PI / 2;
  return g;
}

// ---------- tsunami wave (curling crest, vertex colours) ----------
export function makeWave(width = 160, H = 1) {
  const P = [[-40, 0], [-24, 0.38], [-10, 0.8], [0, 1.0], [6, 1.04], [10.5, 0.95], [12.5, 0.8], [11.5, 0.68], [8.5, 0.72], [5.5, 0.6], [4.4, 0.36], [5.6, 0.14], [9, 0]];
  const sh = new THREE.Shape(P.map(([z, y]) => new THREE.Vector2(z * 0.6, y * 10)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: false, curveSegments: 2, steps: 40 }).toNonIndexed();
  geo.translate(0, 0, -width / 2);
  const p = geo.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) {
    const zz = p.getZ(i), xx = p.getX(i), y = p.getY(i) / 10;
    p.setY(i, p.getY(i) * (1 + 0.12 * Math.sin(zz * 0.09) + 0.06 * Math.sin(zz * 0.23 + 1)));
    p.setX(i, xx + 1.2 * Math.sin(zz * 0.05));
    const foam = (xx > 3.6 && y > 0.7) || y > 0.95;
    const c = foam ? C('#f4fbff') : C('#1d5f96').lerp(C('#3fb4d8'), Math.min(1, y * 1.1));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, VM({ side: THREE.DoubleSide })); m.rotation.y = -Math.PI / 2; m.scale.y = H;
  const g = new THREE.Group(); g.add(m);
  // foam puffs on the lip
  const fm = M('#f6fbff');
  for (let i = 0; i < 200; i++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8 + rnd() * 1.0, 1), fm); f.position.set(-width / 2 + (i / 199) * width + rnd() * 3, 0, 0); f.userData.h = rnd(); g.add(f); }
  g.userData.wave = m;
  g.userData.setH = (Hh) => { m.scale.y = Hh / 10; g.children.forEach((f) => { if (f !== m) { const ph = f.userData.h; f.position.y = Hh * (0.98 + 0.12 * Math.sin(f.position.x * 0.09)) + ph * 0.8; f.position.z = 4.6 + ph * 2.2; f.scale.setScalar(Math.max(0.4, Hh / 10)); } }); };
  return g;
}

// ---------- lanterns (glow, no ink) ----------
export function makeLanterns(parent, pts) {
  const geo = new THREE.SphereGeometry(0.16, 8, 6);
  const im = new THREE.InstancedMesh(geo, HDR(3.0, 1.55, 0.45), pts.length);
  const d = new THREE.Object3D();
  pts.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.scale.set(1, 1.25, 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
  im.layers.set(2); parent.add(im); return im;
}

// ---------- globe ----------
const LANDS = {
  na: [[-165, 65], [-140, 70], [-110, 73], [-85, 70], [-75, 62], [-60, 55], [-55, 48], [-66, 44], [-70, 41], [-76, 35], [-81, 31], [-80, 25], [-82, 28], [-84, 30], [-90, 29], [-97, 27], [-97, 22], [-92, 18], [-87, 21], [-88, 15], [-83, 9], [-79, 8], [-86, 13], [-92, 15], [-105, 20], [-110, 24], [-112, 30], [-117, 32], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 55], [-160, 60]],
  gl: [[-50, 60], [-42, 60], [-20, 70], [-20, 80], [-40, 83], [-65, 80], [-55, 70]],
  sa: [[-80, 9], [-75, 11], [-62, 10], [-50, 0], [-35, -6], [-39, -14], [-41, -22], [-48, -26], [-53, -33], [-58, -38], [-65, -42], [-68, -50], [-70, -55], [-74, -50], [-73, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -6], [-80, 0], [-78, 5]],
  eu: [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [10, 58], [5, 62], [15, 68], [25, 71], [40, 68], [60, 70], [70, 73], [90, 76], [110, 77], [130, 72], [150, 71], [170, 70], [180, 68], [180, 65], [170, 60], [160, 58], [155, 50], [140, 54], [135, 44], [128, 38], [126, 35], [122, 40], [120, 33], [122, 30], [117, 23], [110, 20], [108, 15], [109, 11], [105, 9], [103, 13], [100, 13], [101, 6], [103, 1], [100, 4], [98, 10], [98, 16], [94, 18], [92, 22], [88, 21], [80, 15], [78, 8], [73, 17], [72, 21], [66, 25], [57, 26], [56, 23], [59, 22], [52, 16], [44, 12], [43, 16], [35, 28], [32, 31], [35, 36], [27, 37], [26, 40], [23, 36], [20, 40], [16, 38], [12, 44], [8, 44], [3, 43], [-1, 37]],
  af: [[-17, 15], [-17, 21], [-13, 28], [-6, 36], [10, 37], [11, 33], [20, 31], [32, 31], [34, 28], [39, 18], [43, 12], [51, 12], [51, 10], [44, 0], [40, -5], [40, -15], [35, -24], [32, -29], [27, -34], [19, -35], [17, -29], [12, -17], [13, -8], [9, -1], [9, 4], [4, 6], [-5, 5], [-12, 7], [-16, 12]],
  mg: [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17]],
  au: [[114, -22], [114, -34], [118, -35], [124, -33], [131, -31], [138, -35], [141, -38], [147, -39], [150, -37], [153, -28], [153, -25], [146, -19], [142, -11], [141, -17], [136, -12], [131, -11], [126, -14], [122, -18]],
  su: [[95, 5.5], [98, 4], [104, -2], [106, -6], [104, -5.8], [101, -3], [96, 3]],
  jv: [[105.2, -6.8], [106, -5.9], [111, -6.4], [114.5, -7.6], [114, -8.7], [110, -8.2], [106, -7.5]],
  bo: [[109, 2], [110, -2], [114, -4], [116, -3.5], [118, 1], [119, 5], [117, 7], [115, 5], [111, 2]],
  sl: [[119, -5.5], [120, 0], [121, 1], [125, 1.5], [123, -1], [121, -1], [123, -4], [121, -5], [120, -3]],
  ng: [[131, -1], [135, -3], [141, -2.5], [146, -5], [150, -10], [147, -10], [141, -9], [138, -8], [135, -4.5]],
  jp: [[130, 31], [132, 34], [135, 34], [140, 36], [141, 41], [141, 45], [143, 43], [140, 40], [139, 36], [135, 35], [131, 34]],
  uk: [[-5, 50], [1, 51], [0, 53], [-2, 56], [-5, 58], [-6, 56], [-3, 54], [-5, 52]],
  ph: [[120, 18], [122, 18], [124, 13], [126, 7], [125, 6], [122, 7], [121, 12]],
  nz: [[172, -34], [178, -38], [174, -41], [171, -44], [167, -46], [172, -41]],
};
export const lonlat = (lon, lat, r = 1) => { const a = (lon * Math.PI) / 180, b = (lat * Math.PI) / 180; return new THREE.Vector3(Math.cos(b) * Math.cos(a) * r, Math.sin(b) * r, -Math.cos(b) * Math.sin(a) * r); };
export function makeGlobe(parent, R = 10) {
  const W = 2048, H = 1024, X = (lon) => ((lon + 180) / 360) * W, Y = (lat) => ((90 - lat) / 180) * H;
  const tex = canvasTex(W, H, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#2c6fc0'); grd.addColorStop(0.5, '#2f86d4'); grd.addColorStop(1, '#2c6fc0');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.lineJoin = 'round';
    for (const [k, poly] of Object.entries(LANDS)) {
      g.beginPath(); poly.forEach(([lo, la], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la)))); g.closePath();
      g.fillStyle = k === 'af' ? '#c9b46a' : k === 'au' ? '#d6a65e' : k === 'gl' ? '#eef4f6' : '#5aaa4c'; g.fill();
      g.lineWidth = 3; g.strokeStyle = '#1a2a22'; g.stroke();
    }
    // greens on the desert continents, deserts on Eurasia
    g.fillStyle = '#5aaa4c'; g.beginPath(); g.ellipse(X(20), Y(-2), 70, 60, 0, 0, 7); g.fill();
    g.fillStyle = '#d2bb72'; g.beginPath(); g.ellipse(X(48), Y(24), 60, 30, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(X(95), Y(42), 90, 22, 0, 0, 7); g.fill();
    g.fillStyle = '#eef4f6'; g.fillRect(0, Y(-68), W, H - Y(-68)); g.fillRect(0, 0, W, Y(82));
  });
  const g = new THREE.Group(); parent.add(g);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshToonMaterial({ map: tex, gradientMap: ramp }));
  g.add(earth);
  // cloud wisps
  const ct = canvasTex(1024, 512, (c2) => { c2.clearRect(0, 0, 1024, 512); c2.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 45; i++) { const x = rnd() * 1024, y = 60 + rnd() * 390; c2.beginPath(); c2.ellipse(x, y, 8 + rnd() * 22, 2.5 + rnd() * 4, 0, 0, 7); c2.fill(); } });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 64, 32), new THREE.MeshToonMaterial({ map: ct, transparent: true, gradientMap: ramp, depthWrite: false }));
  clouds.layers.set(2); g.add(clouds);
  // atmosphere rim
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 64, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, uniforms: {},
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-abs(dot(vN,vV)),2.); gl_FragColor=vec4(0.45,0.75,1.,f*0.9); }' }));
  atm.layers.set(2); g.add(atm);
  // pressure rings (3 trailing)
  const rings = [0, 1, 2].map((k) => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 160), HDR(2.2 - k * 0.5, 2.1 - k * 0.5, 1.9 - k * 0.5, { transparent: true })); m.layers.set(2); g.add(m); return m; });
  // ash veil
  const ash = new THREE.Mesh(new THREE.SphereGeometry(R * 1.022, 96, 48), new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { k: { value: 0 }, src: { value: lonlat(105.4, -6.1) } },
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float k; uniform vec3 src; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p,vec3(12.9,78.2,37.7)))*43758.5); }
      float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); float a=mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); return a; }
      void main(){
        float lat=asin(vP.y), slat=asin(src.y);
        float lon=atan(-vP.z,vP.x), slon=atan(-src.z,src.x);
        float dl=abs(mod(lon-slon+3.14159,6.28318)-3.14159);
        float spreadLon=k*3.3, spreadLat=0.12+k*0.75;
        float m=smoothstep(spreadLon+0.15,spreadLon-0.25,dl)*smoothstep(spreadLat+0.12,spreadLat-0.2,abs(lat-slat*0.4));
        float nn=n(vP*4.)*0.65+n(vP*9.)*0.35;
        float a=m*(0.35+0.5*smoothstep(0.3,0.75,nn));
        gl_FragColor=vec4(mix(vec3(.10,.075,.06),vec3(.30,.19,.12),nn),a);
      }` }));
  ash.layers.set(2); g.add(ash);
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), HDR(4, 1.4, 0.3)); pin.position.copy(lonlat(105.4, -6.1, R * 1.005)); pin.layers.set(2); g.add(pin);
  return { g, earth, clouds, rings, ash, pin, R };
}
export function makeStars(parent, n = 900) {
  const pos = []; for (let i = 0; i < n; i++) { const v = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(900); pos.push(v.x, v.y, v.z); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: C('#ffffff'), size: 2.2, sizeAttenuation: false, fog: false })); p.layers.set(2); parent.add(p); return p;
}
