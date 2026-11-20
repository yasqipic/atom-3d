// KRAKATAU 1883 — 44.28 s vertical short (voice: Indonesian narration). Dika = the witness who hears, flees, mourns, wonders.
import * as THREE from '../../lib/three.module.min.js';
import { C, makeSky, add, box, M } from '../world.js';
import { Puppet, POSES, walk, blend, faceAt, track } from '../rig.js';
import { makeDika, DIKA_POSES } from '../dika.js';
import { createPost } from '../post.js';
import { makeStreet } from '../places.js';
import { TOD, applyTOD } from '../lights.js';
import { FX } from '../fx.js';
import { ss, V, camTrack, applyCam, kick, creep } from '../camera.js';
import { rnd, makeOcean, oceanPatch, makeVolcano, makeIsle, makeEruption, makeShock, makeBolts, makePalm, makeHut, makeBoat, makeWave, makeLanterns, makeGlobe, makeStars, lonlat } from './sets.js';

const W = +(new URLSearchParams(location.search).get('w') || 720), H = Math.round(W * 16 / 9), FPS = 30;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 15000);
const post = createPost(renderer, W, H);
const D2R = Math.PI / 180;

// ---------- time-of-day presets added for this story ----------
Object.assign(TOD, {
  blast: { sky: ['#40467e', '#8a6a9a', '#f0957a', '#ffc58a', '#e0a070'], sun: ['#ffc28a', 2.1], el: 14, az: 150, hemi: ['#9a8fd0', '#ffcf9e', 1.5], fog: '#ffc58a' },
  ash: { sky: ['#5d5a6e', '#857a80', '#b89a82', '#d6b48e', '#a89080'], sun: ['#ffd2a0', 1.6], el: 30, az: 120, hemi: ['#b0a8c0', '#e8d0b0', 1.7], fog: '#cdb294' },
  red: { sky: ['#3e1a4a', '#9c2c4c', '#ff5a32', '#ffb04a', '#d0703a'], sun: ['#ff8a50', 2.2], el: 7, az: 160, hemi: ['#a05a8a', '#ffb07a', 1.45], fog: '#ff9a5a' },
  space: { sky: ['#03040c', '#050818', '#0a1030', '#0d1438', '#03040c'], sun: ['#fff4e6', 2.6], el: 10, az: 75, hemi: ['#3c4c8c', '#1c1830', 0.9], fog: '#000000' },
});

function makeEnv(fog = [300, 9000]) {
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(C('#d8ecf7'), ...fog);
  const sky = makeSky(); scene.add(sky);
  const sun = new THREE.DirectionalLight(); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 220 }); sun.shadow.camera.layers.enableAll(); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  const hemi = new THREE.HemisphereLight(); scene.add(sun, sun.target, hemi);
  const fxScene = new THREE.Scene();
  return { scene, sky, sun, hemi, fxScene };
}

// ================= WORLD (sea, volcano, islet, village) =================
const WO = makeEnv();
const ocean = makeOcean(WO.scene);
const volc = makeVolcano(WO.scene);
makeIsle(WO.scene, -270, 140, 70, 40, '#3f8a36'); makeIsle(WO.scene, 250, 40, 45, 28, '#3f8a36'); makeIsle(WO.scene, 160, -280, 34, 20, '#4a9a3e');
makeIsle(WO.scene, -1500, -2600, 1500, 150, '#4a8f3c').scale.set(1, 1, 0.35);   // Sumatra coast
makeIsle(WO.scene, 2600, 1300, 1500, 130, '#4a8f3c').scale.set(0.4, 1, 1);      // Java coast
// eruption clock domains: hook [-8,4.3], story [44,78] (= t+50), finale [126,145] (= t+100)
const BLASTS = [{ t: 0.1, amp: 1.0, dome: 3.2 }, { t: 60.35, amp: 0.45 }, { t: 60.95, amp: 0.6 }, { t: 61.4, amp: 0.8, dome: 0.5 }, { t: 62.45, amp: 1.25, dome: 1.2 },
  { t: 140.7, amp: 0.75 }, { t: 142.25, amp: 1.05 }];
const blastSum = (b) => BLASTS.reduce((s, B) => s + (b >= B.t ? B.amp * Math.exp(-(b - B.t) / 0.7) : 0), 0);
const power = (b) => {
  if (b < 10) return b < 0.1 ? 0.07 : 0.42 + 0.65 * Math.exp(-(b - 0.1) / 0.9);
  if (b < 100) return Math.min(1.3, 0.1 + blastSum(b) + (b > 62.45 ? 0.42 : 0));
  return Math.min(1.3, 0.58 + blastSum(b));
};
const erupt = makeEruption(WO.scene, volc.crater, { power, domains: [[-8, 4.3], [44, 78], [126, 145]], blasts: BLASTS });
const shock = makeShock(WO.scene, volc.crater);
const bolts = makeBolts(WO.scene, 5);
const eClock = (t) => (t < 4.25 ? t : t < 38.35 ? t + 50 : t + 100);

// islet far away (hook)
const IS = V([0, 0, 4200]);
add(WO.scene, new THREE.CylinderGeometry(9, 12, 1.2, 28), '#ecd6a0', IS.x, 0, IS.z, false).scale.z = 0.8;
makePalm(WO.scene, IS.x - 3.2, IS.z - 1.5, 6.5, 0.35, 0.4, 0.6);
// boat near the volcano (shot 3 + finale)
const BOAT = V([110, 0, 980]);
const boat = makeBoat(WO.scene); boat.position.copy(BOAT); boat.rotation.y = Math.PI + 0.3;

// village (local frame: sea toward local -z, which points at the volcano)
const VG = V([600, 0, 1300]);
const vill = new THREE.Group(); vill.position.copy(VG); vill.rotation.y = Math.atan2(VG.x, VG.z); WO.scene.add(vill);
const sandM = M('#ecd6a0'), wetM = M('#b9a37a');
const land = add(vill, new THREE.PlaneGeometry(500, 300), '#7fae54', 0, 0.55, 162, false); land.rotation.x = -Math.PI / 2;
const sandStrip = add(vill, new THREE.PlaneGeometry(500, 16), sandM, 0, 0.56, 6, false); sandStrip.rotation.x = -Math.PI / 2;
const slope = add(vill, new THREE.PlaneGeometry(500, 44), wetM, 0, -1.4, -20, false); slope.rotation.x = -Math.PI / 2 - Math.atan2(4.0, 44);
const huts = [];
for (const [x, z, r] of [[-7, -0.5, 0.2], [9, 4, -0.3], [-15, 9, 0.5], [17, 12, -0.1], [-26, 3, 0.3], [27, 1, -0.4], [-4, 18, 0.1], [7, 24, 0.2], [-34, 16, 0.6], [36, 18, -0.5], [-48, 6, 0.2], [50, 8, 0.1]]) {
  const h = makeHut(vill, x, z, r); h.position.y = 0.55; huts.push({ g: h, x, z, r, seed: rnd() });
}
const palms = [];
for (const [x, z] of [[-11, 3], [4, 7], [13, 0], [-20, 13], [22, 6], [-30, 9], [31, 12], [-2, 30], [42, 2], [-42, 1], [60, 10], [-60, 12]]) palms.push(makePalm(vill, x, z, 6 + rnd() * 3, 0.25 + rnd() * 0.2, rnd() * 6, 0.55));
// stranded canoe on the receding beach
const canoe = makeBoat(vill); canoe.position.set(-4, -0.6, -12); canoe.rotation.set(0, 1.2, 0.18); canoe.scale.setScalar(0.8);
// debris (aftermath)
const debris = new THREE.Group(); vill.add(debris);
for (let i = 0; i < 60; i++) { const b = add(debris, box(0.2 + rnd() * 0.3, 0.1, 1.2 + rnd() * 2.6), rnd() < 0.5 ? '#8a6440' : '#6b4a30', (rnd() - 0.5) * 90, 0.62, 2 + rnd() * 40); b.rotation.set(0, rnd() * 6, (rnd() - 0.5) * 0.3); }
for (let i = 0; i < 8; i++) { const r = add(debris, new THREE.ConeGeometry(1.8, 1.2, 4), '#9a6e3a', (rnd() - 0.5) * 80, 0.9, 6 + rnd() * 30); r.rotation.set(0.3 * rnd(), rnd() * 6, 0.5); }
debris.visible = false;
// tsunami
const wave = makeWave(420); vill.add(wave);
const flood = add(vill, new THREE.PlaneGeometry(500, 1), new THREE.MeshToonMaterial({ color: C('#4a9cc4') }), 0, 0, 0, false); flood.rotation.x = -Math.PI / 2;
const splash = [];
for (let i = 0; i < 90; i++) { const m = add(vill, new THREE.IcosahedronGeometry(1, 1), rnd() < 0.7 ? '#f4fbff' : '#bfe6f6', 0, 0, 0, false); m.visible = false; splash.push({ m, a: 0.3 + rnd() * 2.5, v: 10 + rnd() * 16, s: 0.25 + rnd() * 0.6, dx: (rnd() - 0.5) * 22 }); }
// lanterns (aftermath)
const lpts = [];
for (let i = 0; i < 420; i++) { const z = -6 - Math.pow(rnd(), 1.6) * 230, x = (rnd() - 0.5) * (40 + -z * 1.6); lpts.push([x, 0.15, z]); }
for (let i = 0; i < 160; i++) lpts.push([(rnd() - 0.5) * 110, 0.68, -1.5 + rnd() * 6]);
const lanterns = makeLanterns(vill, lpts); lanterns.visible = false;
const sitLamp = new THREE.PointLight(C('#ffb060'), 0, 9, 1.4); vill.add(sitLamp);
const sitLan = add(vill, new THREE.CylinderGeometry(0.12, 0.15, 0.3, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.7, 0.6) }), 0, 0.72, 0, false); sitLan.layers.set(2);

// ---------- characters ----------
const D = makeDika();
const v1 = new Puppet({ top: '#c8553d', pants: '#3a3340', hair: '#2a1e1a' }); const v2 = new Puppet({ top: '#e0b84a', pants: '#5a3a5a', hair: '#1e1612', bun: true });
vill.add(v1.root, v2.root);
// ear-covering pose (hands on the sides of the head)
const EARS = { ...POSES.stand, lHand: 'open', rHand: 'open', spine: [8, 0, 0], head: [6, 0, 0], lSh: [-60, 0, 40], rSh: [-60, 0, -40], lEl: [-120, 0, 0], rEl: [-120, 0, 0], lHip: [0, 0, 5], rHip: [0, 0, -5], lKn: [8, 0, 0], rKn: [8, 0, 0], drop: 0.03 };
const LOOKUP = { ...POSES.stand, head: [-24, 0, 0], neck: [-8, 0, 0], spine: [-6, 0, 0], lSh: [-10, 0, 14], rSh: [-10, 0, -14] };
const POINTUP = { ...LOOKUP, rHand: 'point', rSh: [-158, 0, -12], rEl: [-10, 0, 0] };
const AWE = { ...POSES.stand, lHand: 'open', rHand: 'open', spine: [-4, 0, 0], head: [-10, 0, 0], lSh: [-35, 0, 22], rSh: [-35, 0, -22], lEl: [-40, 0, 0], rEl: [-40, 0, 0] };
const FX_ = { bang: new FX('bang', 0.5), sweat: new FX('sweat', 0.3), tears: new FX('tears', 0.5), puff: new FX('puff', 1.4), q: new FX('question', 0.45) };

// ================= GLOBE =================
const GL = makeEnv([5000, 9000]);
const globe = makeGlobe(GL.scene, 10); makeStars(GL.scene);
const SRC = lonlat(105.4, -6.1).normalize();
function setRings(theta) {
  globe.rings.forEach((m, k) => { const th = (theta - k * 7) * D2R; m.visible = theta > 0 && th > 0.02 && th < Math.PI * 2 - 0.02;
    const R = globe.R * 1.004; m.scale.setScalar(Math.abs(Math.sin(th)) * R); m.position.copy(SRC).multiplyScalar(Math.cos(th) * R);
    m.quaternion.setFromUnitVectors(V([0, 0, 1]), SRC); m.material.opacity = 1 - k * 0.3; });
}

// ================= STREET (red sky) =================
const ST = makeEnv([60, 400]);
makeStreet(ST.scene);
const n1 = new Puppet({ top: '#3a4a7a', pants: '#2c3340', hair: '#3b2a20' }), n2 = new Puppet({ top: '#a0405a', pants: '#3a2c40', hair: '#5a3020', bun: true });
ST.scene.add(n1.root, n2.root);

// ================= SHOTS =================
// t in seconds. Each shot: env, tod, cam keys (absolute times), dof (px at 1080), fog, near
const L = (x, y, z) => vill.localToWorld(V([x, y, z])).toArray();
vill.updateMatrixWorld(true);
const ISP = (x, y, z) => [IS.x + x, IS.y + y, IS.z + z];
const BP = (x, y, z) => [BOAT.x + x, BOAT.y + y, BOAT.z + z];
const GP = (lon, lat, r) => lonlat(lon, lat, r).toArray();
const SHOTS = [
  { id: 'hook_blast', t0: 0, t1: 1.25, env: WO, tod: 'blast', near: 0.5, fog: [800, 9000], inkFar: 2500,
    cam: [{ t: 0, pos: [-150, 16, 650], look: [0, 110, 0], fov: 46 }, { t: 1.25, dur: 1.15, pos: [-175, 20, 700], look: [0, 330, 0], fov: 54, roll: -3 }] },
  { id: 'hook_dika', t0: 1.25, t1: 4.25, env: WO, tod: 'blast', near: 0.05, fog: [1500, 9000], inkFar: 420, dof: 12,
    cam: [{ t: 1.25, pos: ISP(0.5, 1.55, 2.4), look: ISP(0, 1.5, 0.4), fov: 38 }, { t: 2.3, dur: 1.0, pos: ISP(0.42, 1.6, 2.15), look: ISP(0, 1.55, 0.4), fov: 37, roll: 2 },
      { t: 4.2, dur: 1.85, pos: ISP(5, 8, 28), look: [0, 260, 0], fov: 42, roll: 0 }] },
  { id: 'setting', t0: 4.25, t1: 8.0, env: WO, tod: 'day', near: 0.5, fog: [1200, 9000], inkFar: 2200,
    cam: [{ t: 4.25, pos: [-950, 700, 950], look: [0, 30, 0], fov: 44 }, { t: 8.0, dur: 3.75, pos: [-520, 250, 640], look: [0, 60, 0], fov: 42, roll: 3 }] },
  { id: 'krakatau', t0: 8.0, t1: 9.8, env: WO, tod: 'day', near: 0.3, fog: [1200, 9000], inkFar: 1500, dof: 6, focusOn: [0, 60, 0],
    cam: [{ t: 8.0, pos: BP(-7, 3.2, 12), look: [0, 75, 0], fov: 36 }, { t: 9.8, dur: 1.8, pos: BP(-9, 3.8, 6), look: [0, 85, 0], fov: 33, roll: -2 }] },
  { id: 'series', t0: 9.8, t1: 12.3, env: WO, tod: 'day', near: 0.5, fog: [1200, 9000], inkFar: 1500,
    cam: [{ t: 9.8, pos: [-150, 10, 330], look: [0, 110, 0], fov: 50 }, { t: 10.5, dur: 0.5, pos: [-155, 10, 340], look: [0, 170, 0], fov: 52 },
      { t: 11.1, dur: 0.45, pos: [-162, 11, 352], look: [0, 230, 0], fov: 55 }, { t: 11.6, dur: 0.45, pos: [-172, 12, 370], look: [0, 300, 0], fov: 58, roll: 4 }] },
  { id: 'climax', t0: 12.3, t1: 14.0, env: WO, tod: 'blast', near: 0.5, fog: [1500, 9000], inkFar: 2500,
    cam: [{ t: 12.3, pos: [-520, 28, 690], look: [0, 200, 0], fov: 54 }, { t: 14.0, dur: 1.6, pos: [-540, 34, 720], look: [0, 420, 0], fov: 60, roll: -4 }] },
  { id: 'globe_wave', t0: 14.0, t1: 17.55, env: GL, tod: 'space', near: 0.1, fog: [5000, 9000], inkFar: 420,
    cam: [{ t: 14.0, pos: GP(112, 2, 33), look: [0, 0, 0], fov: 42 }, { t: 16.2, dur: 2.2, pos: GP(70, 16, 38), look: [0, 0, 0], fov: 42, roll: 4 },
      { t: 17.55, dur: 1.35, pos: GP(45, 22, 46), look: [0, 0, 0], fov: 42, roll: 0 }] },
  { id: 'recede', t0: 17.55, t1: 19.0, env: WO, tod: 'ash', near: 0.05, fog: [300, 6000], inkFar: 420, dof: 8, shadow: 30,
    cam: [{ t: 17.55, pos: L(0.9, 1.6, 3.2), look: L(-1, -0.5, -18), fov: 44 }, { t: 19.0, dur: 1.4, pos: L(0.8, 1.7, 2.6), look: L(-1, -0.8, -22), fov: 41 }] },
  { id: 'notover', t0: 19.0, t1: 20.75, env: WO, tod: 'ash', near: 0.05, fog: [300, 6000], inkFar: 420, dof: 13, push: 0.006,
    cam: [{ t: 19.0, pos: L(0.35, 1.6, -2.1), look: L(0, 1.55, 0), fov: 36 }] },
  { id: 'wave_far', t0: 20.75, t1: 22.2, env: WO, tod: 'ash', near: 0.05, fog: [300, 6000], inkFar: 420, dof: 5, shadow: 20,
    cam: [{ t: 20.75, pos: L(0.7, 1.9, 3.0), look: L(-1, 6, -120), fov: 40 }, { t: 22.2, dur: 1.3, pos: L(0.6, 1.85, 2.4), look: L(-1, 10, -120), fov: 36 }] },
  { id: 'run', t0: 22.2, t1: 23.9, env: WO, tod: 'ash', near: 0.05, fog: [300, 6000], inkFar: 420, shadow: 30,
    cam: [{ t: 22.2, pos: L(-1.2, 1.1, 16.5), look: L(0.5, 3.2, 0), fov: 56 }, { t: 23.3, dur: 1.0, pos: L(-1.2, 1.15, 17.5), look: L(0, 7, -2), fov: 60, roll: -4 }] },
  { id: 'flooded', t0: 23.9, t1: 25.95, env: WO, tod: 'ash', near: 0.3, fog: [400, 6000], inkFar: 900,
    cam: [{ t: 23.9, pos: L(-30, 45, 95), look: L(0, 0, 20), fov: 46 }, { t: 25.95, dur: 2.0, pos: L(-40, 110, 230), look: L(0, 0, -260), fov: 48, roll: 3 }] },
  { id: 'mourn', t0: 25.95, t1: 31.95, env: WO, tod: 'night', near: 0.05, fog: [200, 3000], inkFar: 420, dof: 12, shadow: 14,
    cam: [{ t: 25.95, pos: L(0.85, 1.55, -2.55), look: L(1.5, 1.0, -0.6), fov: 36 }, { t: 27.0, dur: 1.0, pos: L(0.9, 1.5, -2.35), look: L(1.5, 1.0, -0.6), fov: 35 },
      { t: 28.15, dur: 1.15, pos: L(0.2, 4.2, -5.5), look: L(1.2, 0.8, -0.2), fov: 40, roll: 2 }, { t: 29.25, dur: 1.1, pos: L(-4.5, 7.5, 9), look: L(0, 0, -40), fov: 44, roll: 3 }, { t: 31.95, dur: 2.6, pos: L(-1, 20, 34), look: L(0, 0, -110), fov: 48, roll: 0 }] },
  { id: 'globe_ash', t0: 31.95, t1: 34.75, env: GL, tod: 'space', near: 0.1, fog: [5000, 9000], inkFar: 420,
    cam: [{ t: 31.95, pos: GP(108, -2, 30), look: [0, 0, 0], fov: 42 }, { t: 34.75, dur: 2.7, pos: GP(50, 18, 42), look: [0, 0, 0], fov: 42, roll: -4 }] },
  { id: 'redsky', t0: 34.75, t1: 38.35, env: ST, tod: 'red', near: 0.05, fog: [60, 400], inkFar: 420, dof: 6, shadow: 14,
    cam: [{ t: 34.75, pos: [0.8, 0.7, -13.0], look: [0.2, 1.9, -16], fov: 42 }, { t: 35.9, dur: 1.1, pos: [0.85, 0.7, -12.8], look: [0.2, 2.3, -16], fov: 40 },
      { t: 38.35, dur: 2.2, pos: [-1.5, 3.2, -4], look: [0, 9, -40], fov: 52, roll: -3 }] },
  { id: 'finale', t0: 38.35, t1: 44.4, env: WO, tod: 'golden', near: 0.05, fog: [800, 9000], inkFar: 420, dof: 9, shadow: 12, orbit: true },
];
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];

// ---------- finale camera: orbit around Dika on the boat, then crane back to the full eruption ----------
const DK = () => V(BP(0, 0.42, 0));
function finaleCam(t) {
  const c = DK(); const toV = V([0, 0, 0]).sub(c); toV.y = 0; toV.normalize(); const base = Math.atan2(toV.x, toV.z) * 180 / Math.PI; // angle pointing at the volcano
  const head = V([c.x, c.y + 1.1, c.z]), aim = V([0, 300, 0]).sub(head).normalize();
  if (t < 40.6) { // orbit from in front of Dika round to his side (volcano then shares the frame)
    const k0 = ss((t - 38.5) / 2.1), a = (base + 25 + 140 * k0) * D2R, r = 2.3;
    const pos = [c.x + Math.sin(a) * r, c.y + 1.2, c.z + Math.cos(a) * r];
    const look = head.clone().addScaledVector(aim, 2.0 * ss((k0 - 0.82) / 0.18)).toArray();
    return { pos, look, fov: 40, roll: 0, focus: r };
  }
  const k = ss((t - 40.6) / 3.4), a = (base + 165 + 5 * k) * D2R, r = 2.3 + 7 * k;
  const pos = [c.x + Math.sin(a) * r, c.y + 1.2 + 1.4 * k, c.z + Math.cos(a) * r];
  const look = head.clone().addScaledVector(aim, 2.0 + 16 * k).toArray();
  return { pos, look, fov: 40 + 24 * k, roll: -3 * k, focus: r };
}

// ---------- per-shot character staging ----------
const faceKeys = {
  hook_dika: [{ t: 0, expr: 'neutral' }, { t: 1.3, expr: 'surprised' }, { t: 2.6, expr: 'dazed' }],
  recede: [{ t: 0, expr: 'neutral' }],
  notover: [{ t: 0, expr: 'skeptical' }, { t: 19.55, expr: 'surprised' }],
  wave_far: [{ t: 0, expr: 'surprised' }],
  run: [{ t: 0, expr: 'surprised' }],
  mourn: [{ t: 0, expr: 'sad' }, { t: 28.4, expr: 'cry' }],
  redsky: [{ t: 0, expr: 'surprised' }, { t: 36.1, expr: 'happy' }],
  finale: [{ t: 0, expr: 'determined' }, { t: 41.0, expr: 'surprised' }, { t: 43.0, expr: 'determined' }],
};
function placeD(env, parent) { if (D.root.parent !== parent) parent.add(D.root); }
function hideVillagers() { v1.root.visible = v2.root.visible = false; }
function villState(t) {
  // ocean level, wave, flood, huts, debris, lanterns by story time
  const recede = t >= 17.55 && t < 22.25 ? -1.7 * ss((t - 17.6) / 2.6) : 0;
  ocean.position.y = recede;
  canoe.visible = t >= 17.55 && t < 23.4;
  // wave front z (local) and height
  let wz = -999, wh = 0;
  if (t >= 20.75 && t < 22.2) { const k = (t - 20.75) / 1.45; wz = -200 + 100 * k; wh = 9 + 8 * k; }
  else if (t >= 22.2 && t < 23.95) { const k = (t - 22.2) / 1.1; wz = -80 + 66 * Math.min(k, 1) + Math.max(0, t - 23.3) * 46; wh = 20 + 5 * Math.min(k, 1); }
  else if (t >= 23.95 && t < 25.95) { const k = (t - 23.95) / 2.0; wz = 60 + 120 * k; wh = 6 - 4 * k; }
  wave.visible = wz > -900; if (wave.visible) { wave.position.set(0, recede * (t < 22.2 ? 1 : 0), wz); wave.userData.setH(wh); }
  flood.visible = t >= 23.3 && t < 25.95;
  if (flood.visible) { const zb = -40, ze = Math.max(zb + 1, wz - 6); flood.scale.set(1, ze - zb, 1); flood.position.set(0, 0.55 + Math.min(1.4, (t - 23.3) * 1.2), (zb + ze) / 2); }
  // huts: knocked over once the wave front passes them
  for (const h of huts) {
    const passed = t >= 23.95 || (t >= 22.2 && wz > h.z - 4);
    const k = !passed ? 0 : t >= 23.95 ? 1 : THREE.MathUtils.clamp((t - 23.3) / 0.4, 0, 1);
    h.g.position.set(h.x + k * (h.seed - 0.5) * 6, 0.55 - k * 0.8, h.z + k * (3 + h.seed * 6));
    h.g.rotation.set(k * (0.5 + h.seed * 0.6), h.r + k * h.seed, k * (h.seed - 0.5) * 1.2);
  }
  debris.visible = t >= 23.95;
  lanterns.visible = sitLan.visible = t >= 25.95 && t < 31.95;
  sitLamp.intensity = lanterns.visible ? 2.2 : 0;
  // splash at the hit
  const a = t - 23.3;
  splash.forEach((s) => { s.m.visible = a >= 0 && a < 0.6 && t < 23.95; if (!s.m.visible) return;
    s.m.position.set(-7 + s.dx + Math.cos(s.a) * s.v * a * 0.5, 3 + Math.sin(s.a) * s.v * a * 1.6 - 14 * a * a, 1 + s.v * a * 0.7); s.m.scale.setScalar(s.s * (1 + a * 1.5)); });
  return wz;
}

let lastShot = null;
window.renderFrame = (f) => {
  const t = f / FPS, S = shotAt(t), E = S.env, sc = E.scene;
  const eT = eClock(t);
  // ---------- camera ----------
  let cam = S.orbit ? finaleCam(t) : camTrack(S.cam, t);
  let fov = cam.fov;
  if (S.push) fov *= creep(t, S.push, S.t0);
  else fov *= creep(t, 0.0015, S.t0);
  // impact kicks
  let kk = 0;
  if (E === WO) for (const B of BLASTS) { const bt = B.t < 10 ? B.t : B.t < 100 ? B.t - 50 : B.t - 100; kk += kick(t, bt, 1.4 * B.amp); }
  kk += kick(t, 1.97, 1.3) + kick(t, 13.47, 1.6) + kick(t, 23.3, 1.8);
  applyCam(camera, { ...cam, fov }, kk);
  camera.near = S.near; camera.updateProjectionMatrix();
  // ---------- light / sky / fog ----------
  if (lastShot !== S.id) {
    const k0 = S.orbit ? finaleCam(S.t0) : S.cam[0];
    applyTOD(S.tod, { sky: E.sky, sun: E.sun, hemi: E.hemi, fog: sc.fog }, V(k0.pos), V(k0.look));
    E.sunDir = E.sun.position.clone().sub(E.sun.target.position).normalize();
    sc.fog.near = S.fog[0]; sc.fog.far = S.fog[1];
    const sh = S.shadow || 14; Object.assign(E.sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh, far: sh * 12 }); E.sun.shadow.camera.updateProjectionMatrix();
    lastShot = S.id;
  }
  const look = V(cam.look);
  const tgt = S.shadow ? (S.id === 'redsky' ? V([0, 0, -16]) : S.id === 'finale' ? DK() : D.root.getWorldPosition(V([0, 0, 0]))) : look;
  E.sun.target.position.copy(tgt); E.sun.position.copy(tgt).addScaledVector(E.sunDir, (S.shadow || 14) * 5);
  E.sky.position.copy(camera.position);
  // ---------- world state ----------
  let u = { focus: cam.focus ?? camera.position.distanceTo(look), dof: S.dof || 0, inkFar: S.inkFar, fx: E.fxScene, flash: 0 };
  Object.values(FX_).forEach((x) => x.set(-1));
  D.root.visible = true; hideVillagers();
  if (E === WO) {
    const wz = villState(t);
    const fl = erupt.update(eT, { wind: 5 });
    shock.update(eT, BLASTS, 700);
    const lavaOp = eT < 10 ? ss((eT - 0.3) / 0.6) : eT < 100 ? ss((eT - 60.4) / 1.2) : 1;
    volc.lava.material.opacity = lavaOp; volc.glow.visible = true;
    // volcanic lightning in the finale
    bolts.forEach((b, i) => { const ph = (f + i * 7) % 19; b.visible = S.id === 'finale' && t > 39.2 && (ph < 2 || (t > 42.25 && t < 42.6 && i < 4));
      b.position.set((i - 2) * 60, 430 + (i % 3) * 90 + (t > 42.25 ? 120 : 0), 30 * Math.sin(i * 2.1)); b.rotation.y = i * 1.3; });
    // blast flash (post) only when the volcano is in view
    if (['hook_blast', 'series', 'climax', 'krakatau', 'finale'].includes(S.id)) u.flash = Math.min(0.45, fl * 0.3);
    // boat bob
    boat.position.y = 0.05 * Math.sin(t * 2.2); boat.rotation.z = 0.03 * Math.sin(t * 1.7);
    if (S.id === 'hook_dika') {
      placeD(E, sc); D.root.position.set(IS.x, 0.6, IS.z + 0.4); D.root.rotation.y = 0.15;
      const P = t < 1.3 ? POSES.stand : t < 1.4 ? POSES.shock : t < 1.92 ? blend(POSES.shock, EARS, ss((t - 1.4) / 0.12)) : EARS;
      D.pose(t >= 1.92 && t < 2.1 ? { ...EARS, spine: [16, 0, 0], drop: 0.06 } : P);
      D.face(faceAt(faceKeys.hook_dika, t, 1));
      const hd = D.j.head.getWorldPosition(V([0, 0, 0]));
      FX_.bang.set(t >= 1.33 && t < 2.2 ? Math.min(1, (t - 1.33) / 0.4) : -1, camera, hd.clone().add(V([0.25, 0.42, 0])));
      FX_.sweat.set(t >= 2.3 && t < 3.2 ? (t - 2.3) / 0.9 : -1, camera, hd.clone().add(V([-0.3, 0.1, 0.1])));
      if (t >= 1.92 && t < 2.05) u.flash = 0.35 * (1 - (t - 1.92) / 0.13);
      if (t > 4.12) u.flash = Math.min(1, (t - 4.12) / 0.12);
    } else if (S.id === 'setting' && t < 4.38) u.flash = 1 - (t - 4.25) / 0.13;
    else if (S.id === 'recede' || S.id === 'notover' || S.id === 'wave_far' || S.id === 'run' || S.id === 'mourn') {
      placeD(E, vill);
      if (S.id === 'mourn') {
        D.root.position.set(1.5, 0.55, -0.6); D.root.rotation.y = Math.PI + 0.25; D.pose(DIKA_POSES.sitHugKnees);
        D.face(faceAt(faceKeys.mourn, t, 2));
        sitLan.position.set(0.85, 0.7, -0.75); sitLamp.position.set(0.9, 1.0, -0.9);
        const hd = D.j.head.getWorldPosition(V([0, 0, 0]));
        if (t > 28.4 && t < 29.6) FX_.tears.set(((t - 28.4) * 0.8) % 1, camera, hd.clone().add(V([0, 0.02, 0])));
      } else if (S.id === 'run') {
        const k = Math.max(0, t - 22.35), ph = k * FPS / 8;
        D.root.position.set(0.4 + k * 2.2, 0.55, 6.5 + k * 6.5); D.root.rotation.y = 0.32; D.pose(t < 22.35 ? POSES.shock : walk(ph, 1));
        D.face(faceAt(faceKeys.run, t, 3));
        v1.root.visible = v2.root.visible = true;
        v1.root.position.set(-2.2 - k * 3.0, 0.55, 7.5 + k * 6.2); v1.root.rotation.y = -0.4; v1.pose(walk(ph + 0.5, 1)); v1.face({ expr: 'shock' });
        v2.root.position.set(2.6 + k * 3.4, 0.55, 5.0 + k * 6.8); v2.root.rotation.y = 0.45; v2.pose(walk(ph + 0.2, 1)); v2.face({ expr: 'worried' });
        const hd = D.j.head.getWorldPosition(V([0, 0, 0]));
        FX_.sweat.set(t < 23.2 ? ((t - 22.2) * 1.4) % 1 : -1, camera, hd.clone().add(V([0.28, 0.12, 0.1])));
      } else {
        D.root.position.set(0, 0.55, 0); D.root.rotation.y = Math.PI;
        let P = POSES.stand;
        if (S.id === 'notover') P = t < 19.55 ? DIKA_POSES.think : POSES.shock;
        if (S.id === 'wave_far') P = blend(POSES.shock, { ...POSES.shock, spine: [-14, 0, 0], drop: 0.04 }, ss((t - 21.6) / 0.3));
        if (S.id === 'recede') P = t < 18.4 ? POSES.stand : blend(POSES.stand, DIKA_POSES.think, ss((t - 18.4) / 0.25));
        D.pose(P); D.face(faceAt(faceKeys[S.id], t, 4));
        const hd = D.j.head.getWorldPosition(V([0, 0, 0]));
        if (S.id === 'notover') { FX_.q.set(t < 19.5 ? (t - 19.0) / 0.5 : -1, camera, hd.clone().add(V([0.1, 0.45, 0]))); FX_.bang.set(t >= 19.55 && t < 20.3 ? Math.min(1, (t - 19.55) / 0.4) : -1, camera, hd.clone().add(V([-0.15, 0.45, 0]))); }
        if (S.id === 'wave_far') FX_.sweat.set(((t - 20.75) * 1.2) % 1, camera, hd.clone().add(V([-0.28, 0.1, -0.1])));
      }
    } else if (S.id === 'finale') {
      placeD(E, sc); const c = DK();
      D.root.position.set(c.x, c.y + boat.position.y, c.z); D.root.rotation.y = Math.atan2(-c.x, -c.z);
      const P = t < 41.0 ? POSES.stand : t < 42.25 ? AWE : t < 42.5 ? POSES.shock : t < 43.0 ? blend(POSES.shock, DIKA_POSES.handsOnHips, ss((t - 42.5) / 0.4)) : DIKA_POSES.handsOnHips;
      D.pose(P); D.face(faceAt(faceKeys.finale, t, 5));
      if (t > 40.6) u.dof = S.dof * (1 - ss((t - 40.6) / 1.5));
    } else D.root.visible = false;
    if (S.id === 'krakatau') u.focus = camera.position.distanceTo(V([0, 60, 0]));
  } else if (E === GL) {
    D.root.visible = false;
    globe.earth.rotation.y = 0; globe.clouds.rotation.y = t * 0.01;
    if (S.id === 'globe_wave') { setRings(t < 14.15 ? 0 : 185 * ss((t - 14.15) / 3.3)); globe.ash.material.uniforms.k.value = 0; }
    else { setRings(0); globe.ash.material.uniforms.k.value = ss((t - 32.1) / 2.5); }
    u.dof = 0; if (S.id === 'globe_wave' && t < 14.12) u.flash = 1 - (t - 14.0) / 0.12;
  } else if (E === ST) {
    placeD(E, sc); D.root.position.set(0.2, 0, -16); D.root.rotation.y = 0;
    D.pose(t < 36.1 ? LOOKUP : blend(LOOKUP, { ...AWE, head: [-22, 0, 0] }, ss((t - 36.1) / 0.25))); D.face(faceAt(faceKeys.redsky, t, 6));
    n1.root.position.set(-2.2, 0, -19); n1.root.rotation.y = 0.35; n1.pose(POINTUP); n1.face({ expr: 'shock' });
    n2.root.position.set(2.6, 0, -20.5); n2.root.rotation.y = -0.4; n2.pose(LOOKUP); n2.face({ expr: 'worried' });
    const hd = D.j.head.getWorldPosition(V([0, 0, 0]));
    FX_.bang.set(t < 35.5 ? Math.min(1, (t - 34.8) / 0.4) : -1, camera, hd.clone().add(V([0.2, 0.45, 0])));
  }
  for (const k of Object.keys(FX_)) if (FX_[k].mesh.parent !== E.fxScene) E.fxScene.add(FX_[k].mesh);
  return post.render(sc, camera, u);
};
window.dbg = () => ({ cam: camera.position.toArray(), D: D.root.getWorldPosition(V([0, 0, 0])).toArray(), vis: D.root.visible, dir: camera.getWorldDirection(V([0, 0, 0])).toArray() });
window.ready = true;
