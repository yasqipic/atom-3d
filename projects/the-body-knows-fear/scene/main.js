// THE BODY KNOWS FEAR: one continuous short. Cinema (hero + audience + screen) -> brain -> body -> skin -> cinema.
import * as THREE from '../../lib/three.module.min.js';
import { C, WORLD_U } from '../world.js';
import { POSES, track, blend, CHAR_U, HANDS } from '../rig.js';
import { createPost } from '../post.js';
import { createLighting, syncShade, EXPOSURE } from '../lights.js';
import { ss, V, lerpV, kick, applyCam, creep } from '../camera.js';
import { FX } from '../fx.js';
import { buildCinema, makeHero, makeAudience, HERO, ROW_Y, ROW_Z, SEAT_X, SCREEN } from './cinema.js';
import { buildMovie } from './movie.js';
import { buildScience } from './science.js';
import { buildSkin } from './skin.js';

const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 1080), H = Math.round(W * 16 / 9), FPS = 30;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const post = createPost(renderer, W, H);
const mix2d = document.createElement('canvas'); mix2d.width = W; mix2d.height = H; const m2 = mix2d.getContext('2d');
const D2R = Math.PI / 180, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), seg = (t, a, b) => clamp((t - a) / (b - a));

// ======================= CINEMA =======================
const cin = new THREE.Scene(); cin.background = C('#030409');
const camC = new THREE.PerspectiveCamera(40, W / H, 0.03, 200);
const CN = buildCinema(cin);
const Lc = createLighting(cin, { tod: 'night', az: 205, el: 14, area: 7 });
const hero = makeHero(); cin.add(hero.root);
const HX = HERO.x, HY = ROW_Y(HERO.row), HZ = ROW_Z(HERO.row) + 0.02;
hero.place(HX, HY, HZ, 180);
const crowd = makeAudience(cin, [[5, 11, 'hijab'], [5, 6, 'short'], [4, 5, 'short'], [4, 13, 'bun'], [3, 7, 'hijab'], [3, 10, 'short'], [3, 14, 'short'], [2, 4, 'bun'], [2, 9, 'short'], [2, 12, 'hijab'],
  [1, 8, 'short'], [1, 13, 'short'], [6, 6, 'short'], [6, 12, 'bun'], [7, 3, 'short'], [7, 13, 'hijab'], [7, 15, 'short'], [8, 6, 'short'], [8, 11, 'short'], [0, 6, 'short'], [0, 11, 'bun']]);
const neighbor = crowd[0];
// drink in the cup holder (front of the hero's right armrest, world -x side is his right? he faces -z: his right = world +x)
{ const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.17, 16), new THREE.MeshToonMaterial({ color: C('#c23b3b') })); cup.position.set(HX + 0.31, HY + 0.66, HZ - 0.2); cup.castShadow = true; cin.add(cup);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.015, 16), new THREE.MeshToonMaterial({ color: C('#efe9e0') })); lid.position.set(HX + 0.31, HY + 0.755, HZ - 0.2); cin.add(lid);
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 6), new THREE.MeshToonMaterial({ color: C('#efe9e0') })); straw.position.set(HX + 0.3, HY + 0.81, HZ - 0.2); straw.rotation.z = 0.15; cin.add(straw); }
// sound-wave rings from the wall speakers (Scene 04, no ink)
const ringMat = () => new THREE.ShaderMaterial({ uniforms: { op: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform float op; varying vec2 vUv; void main(){ gl_FragColor=vec4(vec3(.45,.75,1.)*op,1.); }' });
const rings = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 64), ringMat()); m.layers.set(2); m.visible = false; cin.add(m); return m; });
const SPK = [V([7.08, 5.33 + (-1.2 + 4.2) * 0.29, -1.2]), V([7.08, 5.33 + (3.0 + 4.2) * 0.29, 3.0]), V([-7.08, 5.33 + (-1.2 + 4.2) * 0.29, -1.2])];
const sweat = new FX('sweat', 0.06); const fxC = new THREE.Scene(); fxC.add(sweat.mesh); sweat.mesh.visible = false;

// hero rest head position (camera anchor, never follows small head moves -> no camera jitter)
hero.pose(POSES.sit); hero.root.updateMatrixWorld(true);
const HEAD = hero.j.head.getWorldPosition(new THREE.Vector3());
const EYES = HEAD.clone().add(V([0, 0.0, -0.16]));

// ---------- hero acting ----------
const SA = { ...POSES.sit, spine: [-6, 0, 0], neck: [2, 0, 0], head: [0, 0, 0], lSh: [-26, 0, 17], rSh: [-26, 0, -17], lEl: [-70, 0, 0], rEl: [-70, 0, 0], lHand: 'relaxed', rHand: 'relaxed', lHip: [-84, 0, 8], rHip: [-84, 0, -8], lKn: [82, 0, 0], rKn: [82, 0, 0] };
const P_ = (o) => ({ ...SA, ...o });
const PO = {
  rest: SA,
  watch: P_({ spine: [3, 0, 0], neck: [4, 0, 0], head: [-6, 0, 0], lHand: 'grip', rHand: 'grip' }),
  lean: P_({ spine: [8, 0, 0], neck: [4, 0, 0], head: [-8, 0, 0], lHand: 'grip', rHand: 'grip', lSh: [-33, 0, 16], rSh: [-33, 0, -16] }),
  recoil: P_({ spine: [-22, 0, 0], neck: [-8, 0, 0], head: [-14, 0, 0], lSh: [-12, 0, 20], rSh: [-12, 0, -20], lEl: [-88, 0, 0], rEl: [-88, 0, 0], lHand: 'grip', rHand: 'grip', lKn: [92, 0, 0], rKn: [92, 0, 0], lHip: [-90, 0, 8], rHip: [-90, 0, -8] }),
  stunned: P_({ spine: [-17, 0, 0], neck: [-5, 0, 0], head: [-10, 0, 0], lSh: [-15, 0, 19], rSh: [-15, 0, -19], lEl: [-84, 0, 0], rEl: [-84, 0, 0], lHand: 'grip', rHand: 'grip' }),
  exhale: P_({ spine: [-12, 0, 0], neck: [6, 0, 0], head: [6, 0, 0], lHand: 'relaxed', rHand: 'relaxed' }),
  glance: P_({ spine: [-12, 0, 0], neck: [6, 8, 0], head: [2, 14, -3], lHand: 'relaxed', rHand: 'relaxed' }),
  q: P_({ spine: [-9, 0, 0], neck: [3, 0, 0], head: [-3, 0, 0], lHand: 'claw', rHand: 'grip' }),
  lookHand: P_({ spine: [-4, 0, 0], neck: [10, 0, 0], head: [16, -14, 0], lHand: 'claw', rHand: 'grip' }),
  puzzled: P_({ spine: [-7, 0, 0], neck: [3, 0, 0], head: [-2, 4, 7], lHand: 'relaxed', rHand: 'grip' }),
  tenseUp: P_({ spine: [6, 0, 0], neck: [-2, 0, 0], head: [-6, 0, 0], lSh: [-34, 0, 15], rSh: [-34, 0, -15], lEl: [-62, 0, 0], rEl: [-62, 0, 0], lHand: 'grip', rHand: 'grip' }),
  relax: P_({ spine: [-11, 0, 0], neck: [4, 0, 0], head: [-2, 0, 0], lHand: 'relaxed', rHand: 'relaxed' }),
  knowing: P_({ spine: [-10, 0, 0], neck: [3, 0, 0], head: [-3, -5, 4], lHand: 'relaxed', rHand: 'claw' }),
  swallow: P_({ spine: [-8, 0, 0], neck: [6, 0, 0], head: [2, 0, 0], lHand: 'relaxed', rHand: 'grip' }),
  final: P_({ spine: [-9, 0, 0], neck: [3, 0, 0], head: [-5, 0, 0], lHand: 'relaxed', rHand: 'relaxed' }),
};
const POSE_KEYS = [
  { t: 0, pose: PO.watch }, { t: 2.3, pose: PO.lean, dur: 1.1 },
  { t: 4.36, pose: PO.recoil, dur: 0.1, ease: 'out' }, { t: 5.2, pose: PO.stunned, dur: 0.8 },
  { t: 8.2, pose: PO.exhale, dur: 0.6 }, { t: 8.55, pose: PO.glance, dur: 0.22 },
  { t: 9.75, pose: PO.q, dur: 0.4 }, { t: 12.35, pose: PO.lookHand, dur: 0.35 }, { t: 13.25, pose: PO.puzzled, dur: 0.4 },
  { t: 15.0, pose: PO.q, dur: 0.6 }, { t: 19.15, pose: PO.tenseUp, dur: 0.5 },
  { t: 45.0, pose: PO.relax, dur: 0.7 }, { t: 47.7, pose: PO.knowing, dur: 0.35 },
  { t: 48.45, pose: { ...PO.relax, rHand: 'grip' }, dur: 0.2 }, { t: 51.3, pose: PO.swallow, dur: 0.25 }, { t: 51.7, pose: PO.relax, dur: 0.3 },
  { t: 53.4, pose: PO.final, dur: 0.6 },
];
const FACE_KEYS = [
  { t: 0, e: 'watch' }, { t: 2.2, e: 'tense' }, { t: 4.27, e: 'shock' }, { t: 5.3, e: 'stunned' }, { t: 7.9, e: 'dazed' }, { t: 8.5, e: 'deadpan' },
  { t: 9.62, e: 'uneasy' }, { t: 11.1, e: 'calm' }, { t: 12.4, e: 'uneasy' }, { t: 13.25, e: 'confused' }, { t: 15.0, e: 'watch' }, { t: 19.1, e: 'tense' },
  { t: 44.4, e: 'linger' }, { t: 44.9, e: 'settle' }, { t: 47.6, e: 'smirk' }, { t: 48.9, e: 'linger' }, { t: 53.3, e: 'settle' }, { t: 56.6, e: 'calm' },
];
const LOOK_KEYS = [[0, 0, -0.1], [8.5, 0.75, 0.05], [9.7, 0, -0.15], [12.35, -0.3, 0.7], [13.25, 0.1, -0.1], [44.4, 0, -0.1], [45.6, 0.12, -0.2], [50.6, -0.05, -0.12], [53.3, 0.02, -0.18]];
const hsh = (n) => { const x = Math.sin(n * 127.1 + 4.7) * 43758.5453; return x - Math.floor(x); };
function heroFace(t, f) {
  let e = FACE_KEYS[0].e, sw = -9; for (const k of FACE_KEYS) if (t >= k.t) { e = k.e; sw = k.t; }
  const fs = f - Math.round(sw * FPS); let blink = fs >= -1 && fs < 2 && e !== 'shock' && e !== 'stunned';
  if (!(t > 3.4 && t < 7.8)) { let tb = 0.5, n = 1; while (tb + 0.9 + 2.1 * hsh(n) <= t) tb += 0.9 + 2.1 * hsh(n++); if (t - tb < 4 / FPS) blink = true; }
  if (t >= 7.9 && t < 8.05) blink = true; // slow blink on the recovery
  let look = [LOOK_KEYS[0][1], LOOK_KEYS[0][2]];
  for (let i = 1; i < LOOK_KEYS.length; i++) { const [kt, x, y] = LOOK_KEYS[i]; const k = ss(seg(t, kt - 0.12, kt + 0.12)); look = [look[0] + (x - look[0]) * k, look[1] + (y - look[1]) * k]; }
  look = look.map((v) => Math.round(v * 40) / 40);
  const o = { expr: e, blink, look };
  if (t > 5.4 && t < 7.05) o.reflect = 1;
  if (t > 4.2 && t < 7.8) o.dilate = 1.25;
  if (t > 50.7 && t < 52.1) o.sweat = Math.round(seg(t, 50.7, 52.1) * 30) / 30;
  return o;
}

// ======================= FILM (on the screen) =======================
const MV = buildMovie();
const rtFull = new THREE.WebGLRenderTarget(2048, 857, { samples: 4, type: THREE.HalfFloatType });
const rtCrop = new THREE.WebGLRenderTarget(1000, 1230, { samples: 4, type: THREE.HalfFloatType });
function filmFrame(t, crop) {
  const K = MV.kunti, cam = MV.cam;
  let show = false, kz = -11.6, wind = 0, scream = 0, tilt = 0, armF = 0, camZ = 0.8 - 0.5 * ss(seg(t, 0, 3.5)), fov = 38 - 9 * ss(seg(t, 2.0, 3.5)), ky = 0;
  // bulb flicker (a blackout at 2.0 s reveals her)
  const fl = t < 2.0 ? (Math.abs(t - 0.95) < 0.05 || Math.abs(t - 1.62) < 0.04 ? 0.25 : 1) : t < 2.12 ? 0.03 : 1;
  MV.bulb.intensity = 2.2 * fl; MV.bulbMesh.material.color.setScalar(0.3 + 0.7 * fl);
  MV.far.intensity = t >= 2.08 && t < 3.5 ? 1.6 : 0;
  if (t >= 2.08 && t < 3.5) { show = true; tilt = 0.22 * ss(seg(t, 2.55, 3.4)); }
  if (t >= 3.5 && t < 7.2) { // the lunge (shot 3) and the frame she leaves on the screen afterwards
    show = true; const u = t - 3.5; camZ = 0.0; fov = 38;
    const k = clamp(u / 0.2); kz = -6 + 5.38 * k * k + Math.max(0, u - 0.2) * 0.1; wind = 1 - 0.4 * seg(u, 0.25, 0.7); scream = clamp(u / 0.06); armF = clamp(u / 0.15); ky = -0.06 * k;
    MV.far.intensity = 2.4; MV.bulb.intensity = 1.1; MV.moon.position.set(0.25, 1.75, kz + 0.9); MV.moon.intensity = 2.2;
  }
  if (t >= 7.2 && t < 44) { show = false; MV.far.intensity = 0; }              // she is gone: the empty hall keeps playing
  if (t >= 44 && t < 52.5) { show = true; kz = -11.2; tilt = 0.15; MV.far.intensity = 1.3; } // "the monster on the screen" (far, still)
  if (t < 3.5 || t >= 7.2) { MV.moon.position.set(0.9, 1.7, -3.4); MV.moon.intensity = 1.4; }
  if (t >= 7.2) { camZ = -1.0 - 0.02 * (t - 7.2); fov = 36; MV.bulb.intensity = 2.0 * (0.85 + 0.15 * Math.sin(t * 9.1) * Math.sin(t * 3.3)); }
  K.root.visible = show; K.root.position.set(0, ky - 0.04, kz); K.head.rotation.z = tilt; K.head.rotation.x = -0.12 * scream;
  K.arms.forEach((a, i) => { a.rotation.x = -1.25 * armF; a.rotation.z = (i ? 1 : -1) * 0.12 * armF; });
  K.wind = wind; K.scream = scream; K.open = t >= 3.5 && t < 7.2 ? 1 : 0.15; K.update(t);
  cam.position.set(0, 1.55, camZ); cam.fov = fov; cam.lookAt(0, 1.52, -12);
  if (crop) cam.setViewOffset(2390, 1000, 1195 - 406, 0, 812, 1000); else cam.clearViewOffset();
  cam.aspect = 2.39; cam.updateProjectionMatrix();
  renderer.setRenderTarget(crop ? rtCrop : rtFull); renderer.setClearColor(0x000000, 1); renderer.render(MV.scene, cam); renderer.setRenderTarget(null);
  CN.screenU.map.value = (crop ? rtCrop : rtFull).texture;
  CN.screenU.rect.value.set(crop ? 0.5 - 0.17 : 0, 0, crop ? 0.34 : 1, 1);
  CN.screenU.t.value = t * 30 % 97; CN.screenU.gain.value = 1.5;
  return t >= 3.5 && t < 4.3 ? 1.9 : t >= 2.08 && t < 3.5 ? 1.0 : 0.85; // screen brightness -> room light
}

// ======================= SCIENCE + SKIN =======================
const SC = buildScience();
const Ls = createLighting(SC.scene, { tod: 'interior', az: 55, el: 32, area: 1.2 });
const camS = new THREE.PerspectiveCamera(40, W / H, 0.005, 100);
const SK = buildSkin();
const Lk = createLighting(SK.scene, { tod: 'interior', az: -55, el: 38, area: 3 });
Lk.sun.color.set('#ffe9d6'); Lk.hemi.color.set('#ffe2dc'); Lk.hemi.groundColor.set('#7a4a48');
const camK = new THREE.PerspectiveCamera(36, W / H, 0.02, 100);

// ======================= LOOKS per scene =======================
function lookCinema(roomLight) {
  Lc.sun.color.set('#a9bdff'); Lc.sun.intensity = 0.9 * roomLight; Lc.hemi.color.set('#26304f'); Lc.hemi.groundColor.set('#100c16'); Lc.hemi.intensity = 0.8;
  syncShade(Lc.sun, Lc.hemi, { shade: ['#9c98ff', 1.1], expo: 0.62 + 0.2 * (roomLight - 0.85) });
  CHAR_U.expo.value = 0.32 + 0.22 * (roomLight - 0.85);
  hero.shell.material.color.setRGB(0.42, 0.45, 0.53).multiplyScalar(1 + 0.5 * (roomLight - 0.85));
  for (const p of crowd) p.shell.material.color.setRGB(0.36, 0.37, 0.44);
}
function lookScience() { syncShade(Ls.sun, Ls.hemi, { shade: ['#dcdcff', 1.2], expo: 0.92 }); }
function lookSkin() { syncShade(Lk.sun, Lk.hemi, { shade: ['#ffd8e4', 1.18], expo: 0.86 }); }

// ======================= CINEMA SHOTS =======================
const H0 = HEAD, ANC = {};
function anc(tr) { // head / eye anchors of the posed hero at a reference time (cameras never jitter with small head moves)
  if (ANC[tr]) return ANC[tr];
  hero.pose(track(POSE_KEYS, tr)); hero.root.updateMatrixWorld(true);
  const h = hero.j.head.getWorldPosition(new THREE.Vector3()), e = hero.j.head.localToWorld(V([0, 0.004, 0.15]));
  const fwd = e.clone().sub(h).setY(0).normalize(), right = new THREE.Vector3().crossVectors(fwd, V([0, 1, 0])).normalize();
  const at = (x, y, z, base = h) => base.clone().addScaledVector(right, x).add(V([0, y, 0])).addScaledVector(fwd, z); // x: hero's right(+)/left, z: in front
  return (ANC[tr] = { h, e, fwd, right, at });
}
function cinemaCam(t) {
  if (t < 2.0) { const k = ss(t / 2.0) * 0.6 + t / 2.0 * 0.4; return { pos: lerpV(V([-0.55, 4.35, 5.7]), V([-0.42, 4.05, 4.4]), k), look: V([0, 3.45, SCREEN.z]), fov: 48, dof: 0 }; }
  if (t < 3.5) { const k = seg(t, 2.0, 3.5); return { pos: lerpV(V([H0.x + 0.38, H0.y + 0.3, H0.z + 0.95]), V([H0.x + 0.33, H0.y + 0.27, H0.z + 0.7]), ss(k) * 0.5 + k * 0.5), look: V([0.05, 3.2, SCREEN.z]), fov: 27 - 5 * k, dof: 4, focus: 9.5 }; }
  if (t < 4.2) return { pos: V([0, 3.5, -0.15]), look: V([0, 3.52, SCREEN.z]), fov: 29 - 1.5 * seg(t, 3.5, 4.2), dof: 0 };
  if (t < 5.5) { const A = anc(5.0); return { pos: A.at(-0.5, 0.1, 1.85), look: A.at(-0.05, -0.2, 0), fov: 34, dof: 6, focus: 1.9 }; }
  if (t < 7.0) { const A = anc(6.2), k = seg(t, 5.5, 7.0); return { pos: A.at(-0.006, 0.0, 0.36 - 0.05 * k, A.e), look: A.at(-0.006, -0.002, 0, A.e), fov: 30, dof: 10, focus: 0.33 }; }
  if (t < 9.55) { const A = anc(8.0); return { pos: A.at(0.42, 0.02, 1.6), look: A.at(0.02, -0.17, 0), fov: 30 * creep(t, 0.0012, 7.0), dof: 7, focus: 1.65 }; }
  if (t < 14.3) { const A = anc(11.0), k = ss(seg(t, 9.55, 14.3)); return { pos: lerpV(A.at(-0.5, 0.0, 1.35), A.at(-0.4, 0.0, 1.1), k), look: A.at(-0.05, -0.2, 0), fov: 32, dof: 7, focus: 1.2 }; }
  if (t < 20.8) { // orbit from 3/4 front to profile, then push into the side of the head
    const A = anc(16.0), k = ss(seg(t, 14.4, 19.4)), a = (35 - 125 * k) * D2R, r = 1.4 - 0.3 * k;
    let pos = A.at(Math.sin(a) * r, 0.06 - 0.05 * k, Math.cos(a) * r), look = A.at(0, -0.15 + 0.13 * k, 0), fov = 38;
    const p2 = ss(seg(t, 19.5, 20.7)); pos = lerpV(pos, A.at(-0.3, 0.03, 0.06), p2); look = lerpV(look, A.at(0, 0.02, 0.03), p2); fov = 38 - 22 * p2;
    return { pos, look, fov, dof: 6 + 4 * p2, focus: pos.distanceTo(look) };
  }
  if (t < 48.4) { const A = anc(46.0); return { pos: A.at(-0.62, 0.04, 1.5), look: A.at(0.0, -0.26, 0), fov: 37 * creep(t, 0.001, 44.4), dof: 6, focus: 1.55 }; }
  if (t < 50.5) { const A = anc(49.5); hero.pose(track(POSE_KEYS, 49.5)); hero.root.updateMatrixWorld(true); const hp = hero.j.rHand.getWorldPosition(new THREE.Vector3());
    return { pos: hp.clone().add(V([0.2, 0.22, -0.38])), look: hp.clone().add(V([0, -0.02, 0.02])), fov: 34 * creep(t, 0.0012, 48.4), dof: 9, focus: 0.47 }; }
  if (t < 52.4) { const A = anc(51.0); return { pos: A.at(-0.3, 0.0, 0.95), look: A.at(-0.02, -0.1, 0), fov: 34 * creep(t, 0.0015, 50.5), dof: 8, focus: 0.98 }; }
  { // final pull back: close-up -> the dark auditorium
    const A = anc(54.0), k = ss(seg(t, 52.9, 59.2)), a = A.at(0.06, -0.03, 0.85), c = A.at(0.15, 0.75, 2.6), b = V([0.35, 3.95, -5.6]);
    const pos = a.clone().multiplyScalar((1 - k) ** 2).add(c.clone().multiplyScalar(2 * k * (1 - k))).add(b.clone().multiplyScalar(k * k));
    const look = lerpV(A.at(0, -0.08, 0), V([0.25, 2.6, 2.4]), ss(seg(t, 53.4, 59.3)));
    return { pos, look, fov: 34 + 12 * k, dof: 8 * (1 - k), focus: pos.distanceTo(look) };
  }
}
function renderCinema(t, f) {
  const crop = t >= 3.5 && t < 4.2;
  const room = filmFrame(t, crop);
  lookCinema(room);
  if (t > 53) { const k = ss(seg(t, 54, 59)); EXPOSURE.value *= 1 + 0.55 * k; CN.screenU.gain.value = 1.5 + 0.5 * k; }
  // hero
  let pose = track(POSE_KEYS, t);
  if (t > 4.3 && t < 7.6) { const tr = Math.sin(t * 47) * Math.sin(t * 13.3); pose = { ...pose, lWiggle: tr * 0.9, rWiggle: -tr * 0.9 }; } // trembling fingers
  if (t > 48.4 && t < 50.6) pose = { ...pose, rWiggle: Math.sin(t * 31) * 0.55 + Math.sin(t * 11) * 0.3 };
  hero.pose(pose); for (const n of ['l', 'r']) { const g = pose[n + 'Hand']; const c = Array.isArray(g) ? g[0] / 105 : g === 'grip' ? 0.8 : g === 'fist' ? 1 : 0.25; hero.j[n + 'Hand'].rotation.set(0.2 + 0.75 * c, 0, 0); }
  hero.face(heroFace(t, f));
  // neighbour flinches too (a beat later, smaller)
  const nb = track([{ t: 0, pose: { ...POSES.sit, lSh: [-30, 0, 14], rSh: [-30, 0, -14] } }, { t: 4.36, pose: { ...POSES.sit, spine: [-14, 0, 0], head: [-10, -10, 0], lSh: [-70, 0, 0], rSh: [-75, 0, 0], lEl: [-95, 0, 0], rEl: [-95, 0, 0] }, dur: 0.12 }, { t: 6.6, pose: { ...POSES.sit, spine: [-8, 0, 0], lSh: [-40, 0, 10], rSh: [-40, 0, -10], lEl: [-80, 0, 0], rEl: [-80, 0, 0] }, dur: 0.8 }], t);
  neighbor.pose(nb);
  { let e = 'watch'; for (const [kt, ke] of [[4.4, 'shock'], [5.4, 'stunned'], [7.6, 'uneasy'], [10.5, 'watch']]) if (t >= kt) e = ke;
    const bl = (f % 97 < 4) || (t > 4.36 && t < 4.43); neighbor.face({ expr: e, blink: bl && e !== 'shock', look: [0.05, -0.12] }); }
  // sound rings (Scene 04)
  rings.forEach((m, i) => { const t0 = 16.95 + i * 0.36, k = (t - t0) / 1.25; if (k < 0 || k > 1 || t > 20.4) { m.visible = false; return; }
    m.visible = true; const sp = SPK[i % 2]; const tgt = H0.clone(); m.position.copy(lerpV(sp, tgt, 0.12 + k * 0.82)); m.lookAt(tgt); m.scale.setScalar(0.18 + 0.55 * k); m.material.uniforms.op.value = 0.3 * Math.sin(Math.PI * k) * (1 - ss(seg(t, 19.5, 20.2))); });
  CN.beamU.op.value = 0.05 + 0.05 * (room - 0.85);
  const c = cinemaCam(t);
  if (Q.get('dbg')) { const d = Q.get('dbg').split(',').map(Number); c.pos = V(d.slice(0, 3)); c.look = V(d.slice(3, 6)); c.fov = d[6] || 40; c.dof = 0; }
  let roll = 0; if (t >= 3.5 && t < 4.2) roll = kick(t, 3.52, 1.6); if (t >= 4.2 && t < 5.5) roll += kick(t, 4.28, 1.0);
  applyCam(camC, { pos: c.pos.toArray(), look: c.look.toArray(), fov: c.fov, roll: c.roll || 0 }, roll);
  Lc.update(V([HX, HY + 0.5, HZ]));
  sweat.set(t > 50.7 && t < 52.1 ? -1 : -1, camC);
  const flash = t >= 3.5 && t < 3.6 ? 0.55 * (1 - seg(t, 3.5, 3.6)) : 0;
  return post.render(cin, camC, { focus: c.focus ?? c.pos.distanceTo(c.look), dof: c.dof ?? 0, flash, fx: fxC });
}

// ---------- science timeline ----------
function heartPhase(t) { // integrate beat rate: 1.15 Hz -> 2.3 Hz from 35.9 to 36.7
  const r0 = 1.15, r1 = 2.3, a = 35.9, b = 36.7;
  if (t < a) return r0 * t; if (t < b) { const u = t - a, d = b - a; return r0 * a + r0 * u + (r1 - r0) * u * u / (2 * d); } return r0 * a + (r0 + r1) / 2 * (b - a) + r1 * (t - b);
}
const AMY_W = new THREE.Vector3();
function renderScience(t, mode, bodyOn) {
  lookScience();
  const S = SC;
  S.U.bT.value = t; S.U.bAct.value = 0.9 * ss(seg(t, 21.5, 22.4)) * (1 - 0.6 * seg(t, 25.0, 25.6));
  const showBody = bodyOn ?? t > 30.95;
  S.body.visible = showBody; S.skinG.u.op.value = 0.55 * ss(seg(t, 30.7, 32.0));
  S.parts.forEach((m) => { m.visible = showBody; });
  const inside = mode === 'inside' || (mode !== 'opaque' && t >= 25.3);
  S.opaque.visible = !inside; S.inside.visible = inside;
  // amygdala glow
  const ig = ss(seg(t, 26.2, 26.7)), flash = Math.exp(-Math.max(0, t - 32.15) * 3) * (t > 32.15 ? 1 : 0);
  const pulse = 0.5 + 0.5 * Math.sin((t - 26.2) * 5.2);
  S.amyM.emissiveIntensity = ig * (0.55 + 0.35 * pulse) + flash * 0.9;
  S.amyRings.forEach((r, i) => { const k = ((t - 26.4 + i * 0.4) % 1.2) / 1.2; r.scale.setScalar(0.6 + 2.2 * k); r.material.u.op.value = ig * 0.5 * (1 - k) * (t < 30.6 ? 1 : 0.4); });
  S.paths.forEach((p) => { const cyc = t < 27.5 ? (t - 25.6 - p.delay) / 0.9 : (t - 27.7 - p.delay) / 0.9; p.m.u.head.value = cyc > 1.25 || cyc < 0 ? -1 : cyc; p.m.u.base.value = 0.08; p.m.u.lit.value = 0; });
  // signal down the cord + nerves
  S.stemGlow.u.head.value = t < 33.1 ? -1 : seg(t, 33.1, 33.45) * 1.15; S.stemGlow.u.lit.value = t > 33.1 ? 1 : 0;
  S.cordGlow.u.head.value = t < 33.4 ? -1 : seg(t, 33.4, 34.9) * 1.15; S.cordGlow.u.lit.value = t > 33.4 ? 1 : 0; S.cordGlow.u.len.value = 0.08;
  S.nerves.forEach((n) => { n.m.u.head.value = t < 34.2 + n.delay ? -1 : seg(t, 34.2 + n.delay, 35.4 + n.delay) * 1.2; n.m.u.lit.value = t > 34.2 + n.delay ? 1 : 0; });
  // heart
  const ph = heartPhase(t) % 1, beat = Math.exp(-((ph - 0.08) ** 2) / 0.003) + 0.55 * Math.exp(-((ph - 0.3) ** 2) / 0.003);
  S.vent.scale.set(0.95 * (1 - 0.08 * beat), 1.25 * (1 - 0.07 * beat), 0.85 * (1 - 0.08 * beat)); S.atr.forEach((a) => a.scale.setScalar(1 - 0.1 * (0.55 * Math.exp(-((ph - 0.92) ** 2) / 0.003))));
  S.heartGlow.material.u.op.value = (t > 35.8 && t < 39.3 ? 0.22 : 0) * beat;
  // muscles tense
  const te = ss(seg(t, 37.25, 37.6)), tr = te * Math.sin(t * 70) * 0.006;
  S.muscles.forEach((m) => { const s = m.userData.s; m.scale.set(s[0] * (1 - 0.06 * te + tr), s[1] * (1 + 0.05 * te), s[2] * (1 + 0.1 * te - tr)); });
  S.musM.emissiveIntensity = 0.32 * te; S.musM.color.set(te > 0 ? '#d4494c' : '#c9484d');
  // camera
  const B = new THREE.Vector3(0, 1.705, 0.005);
  S.amy[0].getWorldPosition(AMY_W);
  let pos, look, fov = 40, dof = 0, focus;
  if (t < 25.3) { const k = ss(seg(t, 20.4, 25.4)), a = (-90 + 48 * k) * D2R, r = 0.3 - 0.13 * (1 - ss(seg(t, 20.3, 21.9))); pos = V([B.x + Math.sin(a) * r, B.y + 0.03 + 0.05 * k, B.z + Math.cos(a) * r]); look = B.clone().add(V([0, -0.004, 0])); fov = 40; dof = 2; }
  else if (t < 30.5) { const k = ss(seg(t, 25.2, 27.4)), k2 = ss(seg(t, 27.4, 30.5)); const a = (-42 + 18 * k + 26 * k2) * D2R, r = 0.3 - 0.13 * k - 0.02 * k2;
    const c = B.clone().lerp(AMY_W, k); pos = V([c.x + Math.sin(a) * r, c.y + 0.02 - 0.03 * k, c.z + Math.cos(a) * r]); look = c; fov = 40; dof = 5 * k; }
  else if (t < 33.1) { const k = ss(seg(t, 30.5, 32.9)), c = AMY_W.clone().lerp(V([0, 1.62, 0]), k); const a = (2 - 32 * k) * D2R, r = 0.15 + 0.85 * k; pos = V([c.x + Math.sin(a) * r, c.y - 0.01 * (1 - k) + 0.12 * k, c.z + Math.cos(a) * r]); look = c; dof = 4 * (1 - k); }
  else if (t < 35.75) { const k = ss(seg(t, 33.1, 35.6)); const c = V([0, 1.6 - 0.32 * k, -0.02 * k]); const a = (-30 - 25 * k) * D2R, r = 1.0 - 0.15 * k; pos = V([c.x + Math.sin(a) * r, c.y + 0.05, c.z + Math.cos(a) * r]); look = c; }
  else if (t < 37.25) { const k = ss(seg(t, 35.6, 36.35)), hp = S.heart.getWorldPosition(new THREE.Vector3()); const c = V([0, 1.28, -0.02]).lerp(hp, k); const a = (-55 + 75 * k) * D2R, r = 0.85 - 0.5 * k; pos = V([c.x + Math.sin(a) * r, c.y + 0.03 - 0.07 * k, c.z + Math.cos(a) * r]); look = c; dof = 5 * k; }
  else if (t < 38.7) { const k = ss(seg(t, 37.25, 38.05)), hp = S.heart.getWorldPosition(new THREE.Vector3()), sh = V([0.21, 1.33, 0.02]); const c = hp.clone().lerp(sh, k); const a = (20 + 25 * k) * D2R, r = 0.35 + 0.33 * k; pos = V([c.x + Math.sin(a) * r, c.y - 0.04 * (1 - k) + 0.04 * k, c.z + Math.cos(a) * r]); look = c; dof = 5 * k; }
  else { const k = ss(seg(t, 38.6, 39.6)); const A = S.ARM[1], c = V([0.21, 1.33, 0.02]).lerp(V([(A.el[0] + A.wr[0]) / 2, (A.el[1] + A.wr[1]) / 2, (A.el[2] + A.wr[2]) / 2]), k);
    const a = 45 * D2R, r = 0.68 - 0.59 * k; pos = V([c.x + Math.sin(a) * r, c.y + 0.04 - 0.02 * k, c.z + Math.cos(a) * r]); look = c; dof = 5; fov = 40 - 8 * k; }
  if (Q.get('dbs')) { const d = Q.get('dbs').split(',').map(Number); pos = V(d.slice(0, 3)); look = V(d.slice(3, 6)); fov = d[6] || 40; dof = 0; }
  applyCam(camS, { pos: pos.toArray(), look: look.toArray(), fov, roll: 0 });
  Ls.update(V([0, 1.4, 0]));
  return post.render(S.scene, camS, { focus: focus ?? pos.distanceTo(look), dof });
}
function renderSkin(t) {
  lookSkin();
  SK.update(t, 40.5);
  const k = ss(seg(t, 39.2, 44.5)), k2 = ss(seg(t, 41.6, 43.6));
  const pos = lerpV(V([-1.55, 0.55, 2.55]), V([0.85, 0.5, 2.25]), k).add(V([0, 0.55 * k2, 0.35 * k2]));
  const look = lerpV(V([-0.2, -0.32, 0]), V([0.15, -0.2, -0.3]), k).add(V([0, 0.1 * k2, -0.2 * k2]));
  applyCam(camK, { pos: pos.toArray(), look: look.toArray(), fov: 38 - 4 * k, roll: -2 + 3 * k });
  Lk.update(V([0, 0, -0.8]));
  return post.render(SK.scene, camK, { focus: pos.distanceTo(V([0, -0.2, 0])), dof: 7 });
}

// ======================= TIMELINE =======================
const XF = (a, b, fa, fb, t0, t1, t, f) => { // crossfade two renders
  const k = ss(seg(t, t0, t1)); if (k <= 0) return fa(); if (k >= 1) return fb();
  fa(); m2.globalAlpha = 1; m2.drawImage(renderer.domElement, 0, 0); fb(); m2.globalAlpha = k; m2.drawImage(renderer.domElement, 0, 0); m2.globalAlpha = 1;
  return mix2d.toDataURL('image/jpeg', 0.93);
};
const END = 59.5;
window.renderFrame = (f) => {
  const t = f / FPS;
  let url;
  if (t < 20.4) url = renderCinema(t, f);
  else if (t < 20.85) url = XF(0, 0, () => renderCinema(t, f), () => renderScience(t), 20.4, 20.85, t, f);
  else if (t >= 25.0 && t < 25.6) url = XF(0, 0, () => renderScience(t, 'opaque'), () => renderScience(t, 'inside'), 25.0, 25.6, t, f);
  else if (t >= 30.6 && t < 31.3) url = XF(0, 0, () => renderScience(t, undefined, false), () => renderScience(t, undefined, true), 30.6, 31.3, t, f);
  else if (t < 39.15) url = renderScience(t);
  else if (t < 39.55) url = XF(0, 0, () => renderScience(t), () => renderSkin(t), 39.15, 39.55, t, f);
  else if (t < 44.2) url = renderSkin(t);
  else if (t < 44.5) url = XF(0, 0, () => renderSkin(t), () => renderCinema(t, f), 44.2, 44.5, t, f);
  else url = renderCinema(t, f);
  const fo = seg(t, END - 0.55, END - 0.05);
  if (fo > 0) { m2.globalAlpha = 1; const img = new Image(); m2.drawImage(renderer.domElement, 0, 0); m2.fillStyle = `rgba(0,0,0,${fo})`; m2.fillRect(0, 0, W, H); url = mix2d.toDataURL('image/jpeg', 0.93); }
  return url;
};
window.ready = true;
