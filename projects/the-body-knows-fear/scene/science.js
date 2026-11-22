// Scientific visuals: stylised brain (gyri via ridged noise, inked), translucent brain + amygdala, upper body with
// spinal cord, nerves, heart, muscles. One scene so the brain close-up can dolly out into the full body.
import * as THREE from '../../lib/three.module.min.js';
import { M, C, add } from '../world.js';

// ---- 3D gradient noise ----
const P = new Uint8Array(512); { const p = [...Array(256).keys()]; let s = 7; for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10), lerp = (a, b, t) => a + (b - a) * t;
const grad = (h, x, y, z) => { const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
export function noise3(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255; x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z), A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return lerp(lerp(lerp(grad(P[AA] & 15, x, y, z), grad(P[BA] & 15, x - 1, y, z), u), lerp(grad(P[AB] & 15, x, y - 1, z), grad(P[BB] & 15, x - 1, y - 1, z), u), v),
    lerp(lerp(grad(P[AA + 1] & 15, x, y, z - 1), grad(P[BA + 1] & 15, x - 1, y, z - 1), u), lerp(grad(P[AB + 1] & 15, x, y - 1, z - 1), grad(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
}
// fresnel glass (no ink, layer 2)
export function glass(col, op = 0.5, base = 0.04) {
  const u = { col: { value: new THREE.Color(col) }, op: { value: op }, base: { value: base } };
  const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vN, vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vV=-mv.xyz; vN=normalMatrix*normal; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 col; uniform float op, base; varying vec3 vN, vV; void main(){ float f=1.-abs(dot(normalize(vN),normalize(vV))); float a=(base+pow(f,2.6))*op; gl_FragColor=vec4(col*a,1.); }' });
  m.u = u; return m;
}
// glowing additive material for nerves/pulses (u along the tube length)
export function nerveMat(col) {
  const u = { col: { value: new THREE.Color(col) }, head: { value: -1 }, base: { value: 0.12 }, len: { value: 0.12 }, lit: { value: 0 } };
  const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 col; uniform float head, base, len, lit; varying vec2 vUv; void main(){ float d=head-vUv.x; float p=d>=0.? exp(-d/len):exp(d*80.); float behind=step(0.,d); float a=base+lit*behind*.55+p*2.2*step(-.2,head); gl_FragColor=vec4(col*a,1.); }' });
  m.u = u; return m;
}
const tube = (pts, r, mat, seg = 64) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 8, false), mat);

export function buildBrainGeo() {
  const geo = new THREE.SphereGeometry(1, 220, 160), p = geo.attributes.position, v = new THREE.Vector3();
  const fold = [];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const n = v.clone();
    let x = v.x * 0.7, y = v.y * 0.6, z = v.z * 0.88;
    if (y < -0.1) y *= 0.82;                                   // flatter base
    x *= 1 - 0.18 * Math.max(0, z) * Math.max(0, -v.y);          // narrower frontal base
    if (v.y < 0.05 && v.z > -0.2 && v.z < 0.55) { x *= 1.06; y -= 0.05 * Math.abs(v.x); } // temporal bulge
    const groove = Math.exp(-((v.x / 0.055) ** 2)) * Math.max(0, Math.min(1, (v.y + 0.25) / 0.5)) * 0.13; // longitudinal fissure
    const syl = Math.exp(-(((v.y - (-0.02 - 0.25 * v.z)) / 0.05) ** 2)) * (Math.abs(v.x) > 0.6 ? 1 : 0) * Math.max(0, Math.min(1, (0.55 - v.z) / 0.3)) * 0.07; // lateral sulcus
    const r = 1 - Math.abs(noise3(n.x * 4.2 + 11, n.y * 4.2, n.z * 4.2)), r2 = 1 - Math.abs(noise3(n.x * 8, n.y * 8 + 5, n.z * 8));
    const ridge = r ** 3 * 0.7 + r2 ** 3 * 0.3;                  // wormy gyri
    const d = 0.075 * ridge - 0.04 - groove - syl;
    fold.push(ridge);
    const len = Math.hypot(x, y, z); p.setXYZ(i, x + (x / len) * d, y + (y / len) * d, z + (z / len) * d);
  }
  geo.computeVertexNormals(); geo.setAttribute('fold', new THREE.Float32BufferAttribute(fold, 1));
  return geo;
}
function brainMaterial(U) {
  const m = new THREE.MeshToonMaterial({ color: C('#e7a2a6'), gradientMap: M('#e7a2a6').gradientMap });
  m.onBeforeCompile = (sh) => {
    THREE.MeshToonMaterial.prototype.onBeforeCompile.call(m, sh);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'attribute float fold; varying float vFold; varying vec3 vLP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vFold=fold; vLP=position;');
    sh.fragmentShader = 'uniform float bT, bAct; varying float vFold; varying vec3 vLP;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(.55, 1.08, smoothstep(.15,.75,vFold));')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { // neural activity: waves spreading from the sensory areas + sparse sparkles on the ridges
          float w1 = sin(length(vLP-vec3(0.,-.1,-.85))*18.-bT*5.), w2 = sin(length(vLP-vec3(.7,-.25,.05))*18.-bT*5.2), w3 = sin(length(vLP-vec3(-.7,-.25,.05))*18.-bT*4.8);
          float wave = pow(max(max(w1,w2),w3)*.5+.5, 10.);
          float sp = pow(max(0., sin(vLP.x*71.+bT*3.)*sin(vLP.y*63.-bT*2.3)*sin(vLP.z*57.+bT*1.7)), 8.);
          totalEmissiveRadiance += vec3(.35,.75,1.)*bAct*(wave*.55*smoothstep(.3,.8,vFold) + sp*1.4); }`);
  };
  return m;
}

export function buildScience() {
  const scene = new THREE.Scene(); scene.background = C('#0b1220');
  // backdrop: soft gradient dome (no ink)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ vec3 d=normalize(vP); float g=smoothstep(-.6,.8,d.y*.5+d.z*.6); gl_FragColor=vec4(mix(vec3(.025,.04,.07),vec3(.09,.15,.22),g),1.); }' }));
  dome.layers.set(2); scene.add(dome);
  const U = { bT: { value: 0 }, bAct: { value: 0 } };
  // ---- brain (unit space; group scaled to the head) ----
  const brain = new THREE.Group(); brain.position.set(0, 1.705, 0.005); brain.scale.setScalar(0.072); scene.add(brain);
  const bGeo = buildBrainGeo();
  const opaque = new THREE.Group(); brain.add(opaque);
  const cortex = new THREE.Mesh(bGeo, brainMaterial(U)); cortex.castShadow = true; opaque.add(cortex);
  const cb = new THREE.SphereGeometry(1, 64, 40); { const p = cb.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), r = 1 + 0.035 * Math.sin(y * 34); p.setXYZ(i, p.getX(i) * 0.42 * r, y * 0.24 * r, p.getZ(i) * 0.3 * r); } cb.computeVertexNormals(); }
  const cere = new THREE.Mesh(cb, M('#d98d93')); cere.position.set(0, -0.42, -0.6); opaque.add(cere);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.75, 20), M('#d99299')); stem.position.set(0, -0.68, -0.28); stem.rotation.x = 0.35; opaque.add(stem);
  // translucent version + inner structures (shown when we look inside)
  const inside = new THREE.Group(); brain.add(inside);
  const shellG = glass('#ff9fb5', 0.75, 0.035); const shell = new THREE.Mesh(bGeo, shellG); shell.layers.set(2); inside.add(shell);
  const cbG = new THREE.Mesh(cb, glass('#ff9fb5', 0.6, 0.03)); cbG.position.copy(cere.position); cbG.layers.set(2); inside.add(cbG);
  const stG = new THREE.Mesh(stem.geometry, glass('#ff9fb5', 0.6, 0.03)); stG.position.copy(stem.position); stG.rotation.copy(stem.rotation); stG.layers.set(2); inside.add(stG);
  const thal = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 16), glass('#9cc8ff', 0.9, 0.12)); m.position.set(s * 0.075, 0.0, -0.08); m.scale.set(0.8, 0.75, 1.3); m.layers.set(2); inside.add(m); return m; });
  const amyU = { glow: { value: 0 } };
  const amyM = new THREE.MeshToonMaterial({ color: C('#e8862e'), gradientMap: M('#e8862e').gradientMap, emissive: C('#ff5a10'), emissiveIntensity: 0 });
  const amy = [-1, 1].map((s) => { const m = add(inside, new THREE.SphereGeometry(0.095, 24, 16), amyM, s * 0.31, -0.3, 0.14); m.scale.set(0.85, 0.8, 1.35); m.rotation.y = s * 0.3; return m; });
  const hippo = [-1, 1].map((s) => { const h = tube([[s * 0.31, -0.3, 0.06], [s * 0.33, -0.27, -0.1], [s * 0.3, -0.18, -0.3], [s * 0.22, -0.05, -0.42]], 0.03, glass('#d6a8ff', 0.8, 0.1), 24); h.layers.set(2); return h; });
  hippo.forEach((h) => inside.add(h));
  // sensory pathways -> thalamus -> amygdala (pulses)
  const paths = [];
  const mkPath = (pts, col, delay) => { const m = nerveMat(col); const t = tube(pts, 0.012, m, 48); t.layers.set(2); inside.add(t); paths.push({ m, delay }); };
  for (const s of [-1, 1]) {
    mkPath([[s * 0.28, -0.22, 1.05], [s * 0.2, -0.18, 0.55], [s * 0.1, -0.05, 0.1], [s * 0.085, 0, -0.05]], '#8fe3ff', 0);       // eye -> thalamus
    mkPath([[s * 0.92, -0.25, 0.05], [s * 0.55, -0.12, 0.0], [s * 0.2, -0.03, -0.05], [s * 0.085, 0, -0.07]], '#8fe3ff', 0.25);  // ear -> thalamus
    mkPath([[s * 0.085, 0, -0.05], [s * 0.2, -0.12, 0.05], [s * 0.31, -0.3, 0.14]], '#ffc070', 0.9);                            // thalamus -> amygdala
  }
  const amyRings = [-1, 1].map((s) => { const r = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), glass('#ffb060', 0, 0.0)); r.position.copy(amy[s < 0 ? 0 : 1].position); r.layers.set(2); inside.add(r); return r; });

  // ---- body (metres): translucent upper body ----
  const body = new THREE.Group(); scene.add(body);
  const prof = [[0.0, 0.95], [0.148, 0.95], [0.155, 1.02], [0.17, 1.12], [0.19, 1.24], [0.205, 1.34], [0.215, 1.41], [0.19, 1.455], [0.12, 1.48], [0.065, 1.5], [0.055, 1.56], [0.05, 1.6]].map(([r, y]) => new THREE.Vector2(r, y));
  const torsoGeo = new THREE.LatheGeometry(prof, 48); torsoGeo.scale(1, 1, 0.62);
  const skinG = glass('#8fc4ff', 0.55, 0.025);
  const parts = [new THREE.Mesh(torsoGeo, skinG)];
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), skinG); head.scale.set(0.088, 0.115, 0.105); head.position.set(0, 1.7, 0.01); parts.push(head);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 20), skinG); jaw.scale.set(0.07, 0.06, 0.075); jaw.position.set(0, 1.62, 0.035); parts.push(jaw);
  const armSeg = (a, b, r) => { const d = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 16), skinG); m.position.set(...a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; };
  const ARM = {}; for (const s of [-1, 1]) { ARM[s] = { sh: [s * 0.2, 1.41, 0], el: [s * 0.27, 1.14, -0.02], wr: [s * 0.3, 0.98, 0.2], hand: [s * 0.3, 0.95, 0.29] };
    parts.push(armSeg(ARM[s].sh, ARM[s].el, 0.045), armSeg(ARM[s].el, ARM[s].wr, 0.037)); const h = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skinG); h.scale.set(0.035, 0.05, 0.06); h.position.set(...ARM[s].hand); parts.push(h); }
  parts.forEach((m) => { m.layers.set(2); body.add(m); });
  // spinal cord + vertebrae
  const spinePts = [[0, 1.63, -0.02], [0, 1.52, -0.045], [0, 1.4, -0.07], [0, 1.25, -0.085], [0, 1.1, -0.07], [0, 0.97, -0.055]].map((p) => new THREE.Vector3(...p));
  const spineCurve = new THREE.CatmullRomCurve3(spinePts);
  const cord = new THREE.Mesh(new THREE.TubeGeometry(spineCurve, 64, 0.0085, 10), M('#f1e6c8')); body.add(cord);
  for (let i = 3; i < 22; i++) { const t = i / 21, p = spineCurve.getPoint(t), tg = spineCurve.getTangent(t); const v = add(body, new THREE.BoxGeometry(0.034, 0.014, 0.026), '#e3d6b8', p.x, p.y, p.z - 0.012); v.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg); }
  const cordGlow = nerveMat('#ffd27a'); const cg = new THREE.Mesh(new THREE.TubeGeometry(spineCurve, 64, 0.012, 10), cordGlow); cg.layers.set(2); body.add(cg);
  // brain -> stem link glow
  const stemGlow = nerveMat('#ffd27a'); const sg = tube([[0.022, 1.685, 0.015], [0.01, 1.665, -0.005], [0, 1.64, -0.02], [0, 1.63, -0.02]], 0.006, stemGlow, 16); sg.layers.set(2); body.add(sg);
  // heart
  const heart = new THREE.Group(); heart.position.set(0.03, 1.215, 0.035); heart.rotation.set(0.2, 0.3, -0.45); body.add(heart);
  const red = M('#c3303a'), red2 = M('#a9242f'), blue = M('#4c62b4');
  const vent = add(heart, new THREE.SphereGeometry(0.042, 32, 24), red, 0, -0.012, 0); vent.scale.set(0.95, 1.25, 0.85);
  { const p = vent.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0) { const k = 1 + y / 0.042 * 0.45; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } } vent.geometry.computeVertexNormals(); }
  const atr = [add(heart, new THREE.SphereGeometry(0.022, 20, 14), red2, -0.026, 0.03, 0.006), add(heart, new THREE.SphereGeometry(0.02, 20, 14), red2, 0.024, 0.034, -0.008)];
  const aorta = tube([[0.0, 0.03, 0.0], [0.0, 0.065, 0.004], [-0.012, 0.083, -0.012], [-0.03, 0.07, -0.03], [-0.032, 0.03, -0.035]], 0.0095, M('#d0424c'), 32); heart.add(aorta);
  const pulm = tube([[0.012, 0.025, 0.012], [0.018, 0.055, 0.016], [0.03, 0.068, 0.0]], 0.008, M('#5a72c8'), 16); heart.add(pulm);
  const vc = tube([[-0.03, 0.03, 0.0], [-0.035, 0.07, -0.005], [-0.037, 0.1, -0.01]], 0.007, blue, 16); heart.add(vc);
  const coro = tube([[-0.01, 0.02, 0.035], [0.0, -0.01, 0.036], [0.005, -0.04, 0.026], [0.002, -0.06, 0.01]], 0.002, M('#f0c040'), 24); heart.add(coro);
  heart.children.forEach((m) => { m.castShadow = true; });
  const heartGlow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), glass('#ff5060', 0, 0)); heartGlow.layers.set(2); heart.add(heartGlow);
  // muscles with fibre striations
  const fib = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += 9) { g.fillStyle = 'rgba(120,20,30,.32)'; g.fillRect(x, 0, 3, 256); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const musU = { tense: { value: 0 } };
  const musM = new THREE.MeshToonMaterial({ color: C('#c9484d'), map: fib, gradientMap: M('#c9484d').gradientMap, emissive: C('#ff3b30'), emissiveIntensity: 0 });
  const muscles = [];
  const mus = (pos, sc, rot) => { const m = add(body, new THREE.SphereGeometry(1, 28, 20), musM, ...pos); m.scale.set(...sc); m.rotation.set(...rot); m.userData.s = sc.slice(); muscles.push(m); return m; };
  for (const s of [-1, 1]) {
    mus([s * 0.085, 1.345, 0.075], [0.085, 0.055, 0.03], [0.1, 0, s * -0.25]);          // pectoralis
    mus([s * 0.205, 1.395, 0.0], [0.05, 0.065, 0.055], [0, 0, s * 0.35]);               // deltoid
    const e = ARM[s].el, sh = ARM[s].sh;
    mus([(e[0] + sh[0]) / 2, (e[1] + sh[1]) / 2, 0.015], [0.03, 0.095, 0.032], [0, 0, s * 0.25]); // biceps
        const w = ARM[s].wr; mus([(e[0] + w[0]) / 2, (e[1] + w[1]) / 2, (e[2] + w[2]) / 2 + 0.005], [0.026, 0.1, 0.026], [1.0, 0, s * 0.1]); // forearm
  }
  // nerves: brachial plexus to the arms, cardiac branch to the heart, intercostals
  const nerves = [];
  const nv = (pts, delay, col = '#ffd27a') => { const m = nerveMat(col); const t = tube(pts, 0.0028, m, 48); t.layers.set(2); body.add(t); nerves.push({ m, delay }); };
  for (const s of [-1, 1]) {
    const A = ARM[s];
    nv([[0, 1.5, -0.05], [s * 0.08, 1.46, -0.03], [s * 0.17, 1.42, 0.0], [A.el[0], A.el[1], A.el[2] + 0.02], [A.wr[0], A.wr[1], A.wr[2]], A.hand], 0.0);
    nv([[0, 1.36, -0.075], [s * 0.05, 1.33, -0.05], [s * 0.07, 1.3, 0.01], [s * 0.03, 1.29, 0.04]], 0.1);
    for (const y of [1.22, 1.14, 1.06]) nv([[0, y, -0.08], [s * 0.1, y + 0.01, -0.05], [s * 0.16, y + 0.02, 0.02], [s * 0.1, y + 0.03, 0.09]], 0.25 + (1.22 - y));
  }
  nv([[0, 1.4, -0.07], [0.02, 1.33, -0.02], [0.03, 1.26, 0.02], [0.03, 1.235, 0.03]], 0.05, '#ffb36a');
  return { scene, U, brain, opaque, inside, shell, amy, amyM, amyRings, thal, paths, body, parts, skinG, cordGlow, stemGlow, heart, vent, atr, heartGlow, muscles, musM, nerves, ARM };
}
