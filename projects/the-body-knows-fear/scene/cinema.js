// Dark modern cinema auditorium + the moviegoer + audience silhouettes. Screen at -z, rows climb toward +z.
import * as THREE from '../../lib/three.module.min.js';
import { M, C, add, box, canvasTex } from '../world.js';
import { Puppet, POSES, CHAR_LAYER, charMat } from '../rig.js';
import { makeGloved } from '../dika.js';
import { drawFace } from './face.js';

export const ROW_Z = (i) => -4.2 + i * 1.05, ROW_Y = (i) => i * 0.3;
export const SCREEN = { y: 3.55, z: -8.6, w: 9.6, h: 4.02 };
export const HERO = { row: 5, x: 0.31 };
const SEAT_X = (k) => -5.27 + k * 0.62; // 18 seats, aisle on the right (x > 6)

export function buildCinema(scene) {
  const g = new THREE.Group(); scene.add(g);
  // carpet steps
  const carpet = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#1d1b2a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${60 + (i % 5) * 8},${40 + (i % 3) * 6},${70},.35)`; c.fillRect((i * 137) % w, (i * 71) % h, 3, 3); }
    c.strokeStyle = 'rgba(120,70,90,.35)'; c.lineWidth = 3; for (let x = 0; x < w; x += 64) for (let y = 0; y < h; y += 64) { c.beginPath(); c.arc(x + 32, y + 32, 14, 0, 7); c.stroke(); } }, [8, 2]);
  const cm = M('#ffffff').clone(); cm.map = carpet;
  for (let i = 0; i < 10; i++) {
    const y = ROW_Y(i), z = ROW_Z(i);
    const st = add(g, box(15, Math.max(0.05, y), 1.05), cm, 0, Math.max(0.05, y) / 2, z, false); st.receiveShadow = true;
    // step nosing light strip on the aisle side + row edge
    add(g, box(1.3, 0.025, 0.04), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 0.35) }), 6.6, y + 0.012, z - 0.5, false);
  }
  add(g, box(15, 0.05, 6), cm, 0, 0.0, -7.2, false);
  // seats (instanced)
  const seatMat = M('#43141d'), seatDark = M('#2a0b11'), armMat = M('#24222a');
  const parts = [
    [box(0.52, 0.13, 0.5), seatMat, 0, 0.36, -0.02],
    [box(0.54, 0.66, 0.12), seatMat, 0, 0.75, 0.26],
    [box(0.5, 0.06, 0.08), seatDark, 0, 1.06, 0.27],
    [box(0.07, 0.07, 0.52), armMat, 0.31, 0.53, 0.0],
    [box(0.06, 0.5, 0.06), armMat, 0.31, 0.26, 0.18],
  ];
  const seats = [];
  for (let i = 0; i < 10; i++) for (let k = 0; k < 18; k++) seats.push([SEAT_X(k), ROW_Y(i), ROW_Z(i)]);
  const dummy = new THREE.Object3D();
  for (const [geo, mat, ox, oy, oz] of parts) {
    const im = new THREE.InstancedMesh(geo, mat, seats.length); im.castShadow = true; im.receiveShadow = true;
    seats.forEach(([x, y, z], n) => { dummy.position.set(x + ox, y + oy, z + oz); dummy.rotation.set(oz > 0.2 && oy > 0.6 ? 0.1 : 0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(n, dummy.matrix); });
    g.add(im);
  }
  // left armrest of the first seat in each row
  for (let i = 0; i < 10; i++) add(g, box(0.07, 0.07, 0.52), armMat, SEAT_X(0) - 0.31, ROW_Y(i) + 0.53, ROW_Z(i));
  // walls: acoustic panels, sconces, speakers
  const panel = canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#1a2033'; c.fillRect(0, 0, w, h); c.fillStyle = '#212a42'; c.fillRect(10, 10, w - 20, h - 20); c.strokeStyle = 'rgba(0,0,0,.4)'; for (let y = 20; y < h; y += 14) { c.beginPath(); c.moveTo(14, y); c.lineTo(w - 14, y); c.stroke(); } });
  const pm = M('#ffffff').clone(); pm.map = panel;
  for (const s of [-1, 1]) {
    add(g, box(0.1, 9, 16), '#12141f', s * 7.6, 4.5, -1.5, false);
    for (let k = 0; k < 7; k++) { const z = -7.5 + k * 1.9; add(g, box(0.12, 3.2, 1.7), pm, s * 7.5, 2.2 + Math.max(0, (z + 4.2) * 0.29), z, false);
      if (k % 2 === 1) { add(g, box(0.1, 0.32, 0.18), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.5, 0.24) }), s * 7.43, 4.4 + Math.max(0, (z + 4.2) * 0.29), z, false); } }
    for (const z of [-5.5, -1.2, 3.0]) { const sp = add(g, box(0.4, 0.62, 0.42), '#0c0c10', s * 7.3, 5.4 + Math.max(0, (z + 4.2) * 0.29), z); sp.rotation.z = s * 0.15;
      add(g, new THREE.CylinderGeometry(0.13, 0.13, 0.03, 18), '#20232c', s * 7.08, 5.33 + Math.max(0, (z + 4.2) * 0.29), z).rotation.z = Math.PI / 2; }
  }
  // exit sign
  const ex = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#0d5a2c'; c.fillRect(0, 0, w, h); c.fillStyle = '#d9ffe4'; c.font = 'bold 64px sans-serif'; c.textAlign = 'center'; c.fillText('EXIT', w / 2, 70); });
  const exm = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.23), new THREE.MeshBasicMaterial({ map: ex, color: new THREE.Color(1.3, 1.3, 1.3) })); exm.position.set(7.42, 3.6, -7.0); exm.rotation.y = -Math.PI / 2; g.add(exm);
  // ceiling + back wall + projection booth window
  add(g, box(16, 0.1, 16), '#0b0c13', 0, 9.2, -1.5, false);
  add(g, box(16, 9, 0.1), '#10121b', 0, 4.5, 6.4, false);
  add(g, box(0.9, 0.5, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.5, 1.8) }), 0.0, 6.4, 6.33, false);
  // stage, screen frame, curtains
  add(g, box(15, 1.35, 1.4), '#141420', 0, 0.68, -8.1);
  add(g, box(SCREEN.w + 0.5, SCREEN.h + 0.45, 0.06), '#050508', 0, SCREEN.y, SCREEN.z - 0.04, false);
  const cur = new THREE.Group(); g.add(cur);
  for (const s of [-1, 1]) for (let k = 0; k < 9; k++) { const c = add(cur, new THREE.CylinderGeometry(0.17, 0.2, 7.2, 10), k % 2 ? '#5a0f1a' : '#6d1420', s * (SCREEN.w / 2 + 0.45 + k * 0.27), 4.4, SCREEN.z + 0.05 + (k % 2) * 0.08); c.scale.z = 0.6; }
  add(g, box(15, 1.2, 0.5), '#3d0b13', 0, 8.3, SCREEN.z + 0.2);
  // the screen (film texture set by setScreen)
  const screenU = { map: { value: null }, rect: { value: new THREE.Vector4(0, 0, 1, 1) }, gain: { value: 1 }, t: { value: 0 } };
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), new THREE.ShaderMaterial({ uniforms: screenU, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D map; uniform vec4 rect; uniform float gain, t; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){ vec2 q=(vUv-rect.xy)/rect.zw; vec3 c=vec3(0.004,0.005,0.008);
        if(q.x>=0.&&q.x<=1.&&q.y>=0.&&q.y<=1.) c=texture2D(map,q).rgb;
        float l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,.72)*vec3(.86,.96,1.12);          // cold film grade
        c+= (h(floor(vUv*vec2(900.,380.))+t)-.5)*.004*(.3+l*4.);                                       // grain
        float v=length((vUv-.5)*vec2(1.,.8)); c*=1.-.35*smoothstep(.35,.8,v);
        gl_FragColor=vec4(max(c,0.)*gain,1.); }` }));
  screen.position.set(0, SCREEN.y, SCREEN.z); g.add(screen);
  // projector beam (no ink) from the booth to the screen
  const beamGeo = new THREE.CylinderGeometry(0.05, 1, 1, 24, 1, true); beamGeo.translate(0, -0.5, 0); beamGeo.rotateX(-Math.PI / 2);
  const beamU = { op: { value: 0.07 } };
  const beam = new THREE.Mesh(beamGeo, new THREE.ShaderMaterial({ uniforms: beamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.); vV=-mv.xyz; vN=normalMatrix*normal; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform float op; varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ float f=abs(dot(normalize(vN),normalize(vV))); float a=op*pow(f,2.)*(0.4+0.6*smoothstep(0.,0.4,-vP.z)); gl_FragColor=vec4(vec3(.55,.7,1.)*a,1.); }' }));
  const from = new THREE.Vector3(0, 6.4, 6.3), to = new THREE.Vector3(0, SCREEN.y, SCREEN.z);
  beam.position.copy(from); beam.lookAt(to); beam.rotateY(Math.PI); // geometry runs along -z after rotateX
  beam.scale.set(SCREEN.w / 2.1, SCREEN.h / 2.1, from.distanceTo(to)); beam.layers.set(2); g.add(beam);
  // dust motes in the beam
  const dp = []; for (let i = 0; i < 400; i++) { const k = 0.05 + ((i * 0.618) % 1) * 0.95, a = Math.sin(i * 91.7), b = Math.cos(i * 37.3); dp.push(a * 4.4 * k, 6.4 + (SCREEN.y - 6.4) * k + b * 1.9 * k, 6.3 + (SCREEN.z - 6.3) * k); }
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(dp, 3)),
    new THREE.PointsMaterial({ color: new THREE.Color(0.5, 0.6, 0.8), size: 0.012, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.layers.set(2); dust.visible = false; g.add(dust);
  return { group: g, screen, screenU, beamU, beam, dust };
}

// natural(er) proportions: smaller head, longer torso/limbs than the stock cartoon puppet
export function humanize(p, hs = [0.128, 0.142, 0.135]) {
  const J = p.j;
  p.setHeadScale(...hs); J.head.position.y = 0.125;
  const prof = [[0.001, -0.06], [0.1, -0.055], [0.135, -0.02], [0.14, 0.05], [0.128, 0.14], [0.14, 0.24], [0.168, 0.32], [0.18, 0.37], [0.162, 0.41], [0.1, 0.437], [0.05, 0.445], [0.001, 0.447]].map(([r, y]) => new THREE.Vector2(r, y));
  const tg = new THREE.LatheGeometry(prof, 40, -Math.PI, Math.PI * 2); tg.scale(1, 1, 0.66);
  J.spine.children.forEach((m) => { if (m.isMesh && m.geometry.type === 'LatheGeometry') { m.geometry = tg; m.position.y = 0; } });
  J.neck.position.y = 0.43;
  for (const [n, s] of [['l', 1], ['r', -1]]) {
    J[n + 'Sh'].position.set(s * 0.175, 0.37, 0); J[n + 'El'].position.y = -0.25; J[n + 'Hand'].position.y = -0.235;
    J[n + 'Kn'].position.y = -0.39; J[n + 'Ank'].position.y = -0.4; J[n + 'Hip'].position.x = s * 0.075;
  }
}
// hijab: fabric over the crown, sides, back and under the chin, with an oval opening for the face; drape to the shoulders.
// Built relative to the head size, so every hijab NPC has the same proportions in every shot.
export function addHijab(p, col) {
  const mat = charMat(new THREE.Color(col), null, 'cloth', p.shadeU), hs = p.headMesh.scale;
  const g = new THREE.Group(); g.scale.set(hs.x * 1.12, hs.y * 1.1, hs.z * 1.12); p.j.head.add(g);
  const mk = (geo) => { const m = new THREE.Mesh(geo, mat); m.layers.set(CHAR_LAYER); m.castShadow = true; g.add(m); return m; };
  const W = 1.0; // half-width of the face opening (rad)
  mk(new THREE.SphereGeometry(1, 36, 12, 0, Math.PI * 2, 0, 0.72)).rotation.x = -0.12;             // crown + forehead band
  mk(new THREE.SphereGeometry(1, 36, 20, Math.PI / 2 + W, Math.PI * 2 - 2 * W, 0.66, 1.62)).rotation.x = -0.12; // sides + back
  const chin = mk(new THREE.SphereGeometry(1, 36, 10, 0, Math.PI * 2, 2.2, 0.94)); chin.rotation.x = -0.12; // wrap under the chin
  // drape over the shoulders (in spine space so it follows the body)
  const dr = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.215, 0.2, 28, 1, true), mat); dr.material.side = THREE.DoubleSide;
  dr.position.set(0, 0.36, 0.005); dr.scale.z = 0.8; dr.layers.set(CHAR_LAYER); dr.castShadow = true; p.j.spine.add(dr);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.088, 0.08, 24), mat); top.position.set(0, 0.47, -0.005); top.layers.set(CHAR_LAYER); p.j.spine.add(top);
}
// ---------- the moviegoer (own design: young adult, mustard jacket over a white tee, jeans, short black hair) ----------
export function makeHero() {
  const SKIN = '#c98d68';
  const p = new Puppet({ skin: SKIN, top: '#ece7dd', vest: '#c38a2c', pants: '#34405e', look2d: true });
  humanize(p);
  // bigger face canvas for the eye close-up
  p.fc.width = p.fc.height = 2048; p.fg = p.fc.getContext('2d');
  p.face = function (f) { const k = JSON.stringify(f); if (k === this.faceKey) return; drawFace(this.fg, f); this.faceTex.needsUpdate = true; this.faceKey = k; };
  p.faceKey = ''; p.face({ expr: 'calm' });
  const sh = p.shadeU, CM = (c, kind = 'cloth') => charMat(new THREE.Color(c), null, kind, sh);
  const put = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.layers.set(CHAR_LAYER); m.castShadow = true; parent.add(m); return m; };
  // neck
  put(p.j.neck, new THREE.CylinderGeometry(0.046, 0.054, 0.14, 14), CM(SKIN, 'skin'), 0, 0.02, -0.005);
  // collar of the jacket
  const col = put(p.j.spine, new THREE.TorusGeometry(0.08, 0.026, 8, 20), CM('#b07c26'), 0, 0.41, -0.005); col.rotation.x = Math.PI / 2 + 0.15; col.scale.set(1.1, 1, 1);
  // hair: cap + swept fringe + nape
  const HAIR = CM('#17100f', 'flat');
  const cap = put(p.j.head, new THREE.SphereGeometry(1.05, 32, 18, 0, Math.PI * 2, 0, 1.25), HAIR, 0, 0.012, -0.01); cap.scale.set(0.136, 0.15, 0.143); cap.rotation.x = -0.4;
  for (const [x, y, z, sx, sy, sz, rz] of [[-0.015, 0.1, 0.07, 0.095, 0.034, 0.07, -0.22]]) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), HAIR); t.position.set(x, y, z); t.scale.set(sx, sy, sz); t.rotation.z = rz; t.layers.set(CHAR_LAYER); t.castShadow = true; p.j.head.add(t); }
  const ears = [-1, 1].map((s) => { const e = put(p.j.head, new THREE.SphereGeometry(0.03, 10, 8), CM(SKIN, 'skin'), s * 0.124, -0.012, -0.005); e.scale.set(0.32, 0.7, 0.5); return e; });
  // thicker, natural limbs: jacket sleeves + jeans
  for (const n of p.noodles || []) { const arm = n.a === p.j.lSh || n.a === p.j.rSh; n.src.scale.x = arm ? 2.9 : 3.1; n.src.material = CM(arm ? '#b98226' : '#34405e'); }
  // hands with fingers (skin) + sneakers
  makeGloved(p, SKIN);
  for (const n of ['l', 'r']) { p.gloves[n].group.scale.setScalar(0.78);
    p.j[n + 'Ank'].children.forEach((m) => { if (m.geometry?.type === 'CapsuleGeometry') m.visible = false; });
    const up = put(p.j[n + 'Ank'], new THREE.CapsuleGeometry(0.042, 0.09, 4, 10), CM('#2a2c33'), 0, -0.005, 0.045); up.rotation.x = Math.PI / 2; up.scale.set(1, 1, 0.85);
    const so = put(p.j[n + 'Ank'], new THREE.CapsuleGeometry(0.04, 0.1, 4, 10), CM('#e9e6df'), 0, -0.03, 0.05); so.rotation.x = Math.PI / 2; so.scale.set(1.08, 1, 0.42);
    const cuff = put(p.j[n + 'El'], new THREE.CylinderGeometry(0.036, 0.038, 0.05, 12), CM('#8f5f1a'), 0, -0.215, 0);
  }
  p.pose(POSES.sit);
  return p;
}

// audience: silhouettes with simple hair / hijab variants
export function makeAudience(scene, list) {
  const out = [];
  const TOPS = ['#3b4a6b', '#5a3a4a', '#2f4f4a', '#6b5a3a', '#44405e', '#5e3434'];
  list.forEach(([row, k, style], i) => {
    const p = new Puppet({ skin: i % 3 ? '#b98466' : '#d1a07c', top: TOPS[i % TOPS.length], pants: '#22252e', hair: style === 'hijab' ? null : '#151012', bun: style === 'bun' });
    p.hijab = style === 'hijab' ? ['#5b3d6e', '#2f5a6a', '#7a4a3a'][i % 3] : null;
    humanize(p); p.j.head.children.forEach((m) => { if (m.isMesh && m.geometry.parameters?.radius === 1.03) m.scale.copy(p.headMesh.scale); if (m.isMesh && m.geometry.parameters?.radius === 0.075) m.position.set(0, 0.15, -0.1); });
    for (const n of p.noodles || []) n.src.scale.x = 2.6;
    if (p.hijab) addHijab(p, p.hijab);
    p.place(SEAT_X(k) + 0, ROW_Y(row), ROW_Z(row) + 0.02, 180); p.pose({ ...POSES.sit, lSh: [-30, 0, 14], rSh: [-30, 0, -14] });
    // same face design as the hero (consistent cast); default = watching the film
    p.face = function (f) { const o = { expr: f.expr && f.expr !== 'neutral' ? f.expr : 'watch', blink: !!f.blink, look: f.look || [0, -0.12] }; const k = JSON.stringify(o); if (k === this.faceKey) return; drawFace(this.fg, o); this.faceTex.needsUpdate = true; this.faceKey = k; };
    p.faceKey = ''; p.face({}); p.shadeU.value = 0.35; scene.add(p.root); out.push(p);
  });
  return out;
}
export { SEAT_X };
