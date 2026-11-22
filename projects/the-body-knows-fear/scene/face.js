// Moviegoer face set (own design): almond eyes with iris/pupil/catchlight, tapered brows, small nose, mouth shapes.
// Drawn on the puppet's face decal canvas (resized to 2048 so the eye close-up stays sharp).
const K = '#1b1311';
export const EXPR = {
  //        open  browIn browOut raise  mouth      pupil
  calm:     { open: 0.82, bi: 0, bo: 0, r: 0, m: 'flat', p: 1 },
  watch:    { open: 0.78, bi: -8, bo: 4, r: 0, m: 'flat', p: 1.05 },   // tense, brows knit (worried)
  tense:    { open: 0.9, bi: -14, bo: 8, r: 6, m: 'tight', p: 1.1 },
  shock:    { open: 1.45, bi: -26, bo: -14, r: 26, m: 'gasp', p: 0.8 },
  stunned:  { open: 1.22, bi: -18, bo: -8, r: 16, m: 'o', p: 0.9 },
  dazed:    { open: 0.62, bi: -6, bo: 2, r: 6, m: 'o', p: 1 },          // exhale, recovering
  deadpan:  { open: 0.5, bi: 2, bo: 2, r: -2, m: 'flatTilt', p: 1 },
  uneasy:   { open: 0.9, bi: -12, bo: 6, r: 4, m: 'frown', p: 1 },
  confused: { open: 0.92, bi: -14, bo: 4, r: 4, m: 'wavy', p: 1, asym: 1 },
  smirk:    { open: 0.72, bi: 0, bo: -2, r: 0, m: 'smirk', p: 1 },
  linger:   { open: 0.95, bi: -10, bo: 6, r: 6, m: 'flat', p: 1.08 },  // knows it's fake, body still tense
  settle:   { open: 0.7, bi: -4, bo: 2, r: 2, m: 'soft', p: 1 },
};
export function drawFace(g, o) {
  const S = g.canvas.width / 600, E = EXPR[o.expr] || EXPR.calm;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  const F = 1.28; g.setTransform(S * F, 0, 0, S * F, S * 300 * (1 - F), S * 322 * (1 - F)); g.lineCap = g.lineJoin = 'round';
  const cx = 300, ey = 292, ex = 66, lx = (o.look?.[0] ?? 0), ly = (o.look?.[1] ?? 0);
  const open = o.blink ? 0 : E.open * (o.blinkHalf ? 0.35 : 1);
  for (const s of [-1, 1]) {
    const x = cx + s * ex, w = 27, h = 15 * open, up = s === 1 && E.asym ? 1.08 : 1;
    if (open > 0.05) {
      // white
      g.save(); g.beginPath(); g.moveTo(x - w, ey); g.bezierCurveTo(x - w * 0.5, ey - h * 1.25 * up, x + w * 0.5, ey - h * 1.3 * up, x + w, ey - 1);
      g.bezierCurveTo(x + w * 0.5, ey + h * 0.95, x - w * 0.5, ey + h * 0.95, x - w, ey); g.closePath();
      g.fillStyle = '#f3ede4'; g.fill(); g.clip();
      // iris + pupil (look = gaze), reflection of the screen
      const ix = x + lx * 12, iy = ey + ly * 7 - 1, ir = 13.5;
      g.fillStyle = '#4a2d1c'; g.beginPath(); g.arc(ix, iy, ir, 0, 7); g.fill();
      g.fillStyle = '#2c1910'; g.beginPath(); g.arc(ix, iy, ir, 0, 7); g.lineWidth = 2.5; g.strokeStyle = '#1e110b'; g.stroke();
      g.fillStyle = '#0b0605'; g.beginPath(); g.arc(ix, iy, 6.2 * E.p * (o.dilate ?? 1), 0, 7); g.fill();
      if (o.reflect) { // tiny curved screen with a pale face + black hair inside it
        const rx = ix + 1, ry = iy - 2, rw = 17 * o.reflect, rh = 8 * o.reflect;
        g.fillStyle = 'rgba(205,225,255,0.92)'; g.beginPath(); g.roundRect(rx - rw / 2, ry - rh / 2, rw, rh, 1.4); g.fill();
        g.fillStyle = 'rgba(20,22,30,0.9)'; g.beginPath(); g.ellipse(rx + 0.5, ry + 0.4, rw * 0.2, rh * 0.42, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(235,238,240,0.95)'; g.beginPath(); g.ellipse(rx + 0.5, ry + 0.5, rw * 0.09, rh * 0.25, 0, 0, 7); g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(ix - 5, iy - 6, 3.2, 0, 7); g.fill();
      g.beginPath(); g.arc(ix + 4.5, iy + 4, 1.4, 0, 7); g.fill();
      // upper-lid shadow on the white
      g.fillStyle = 'rgba(120,80,70,0.25)'; g.beginPath(); g.ellipse(x, ey - h * 1.05, w * 1.1, h * 0.45, 0, 0, 7); g.fill();
      g.restore();
      // upper lid (thick) + lash flick, lower lid (thin)
      g.strokeStyle = K; g.lineWidth = 7.5; g.beginPath(); g.moveTo(x - w - 2, ey + 1); g.bezierCurveTo(x - w * 0.5, ey - h * 1.25 * up - 1, x + w * 0.5, ey - h * 1.3 * up - 1, x + w + 3, ey - 2); g.stroke();
      g.lineWidth = 2.6; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(x - w * 0.7, ey + h * 0.55); g.quadraticCurveTo(x, ey + h * 1.05, x + w * 0.75, ey + h * 0.5); g.stroke(); g.globalAlpha = 1;
    } else { g.strokeStyle = K; g.lineWidth = 7; g.beginPath(); g.moveTo(x - w, ey + 1); g.quadraticCurveTo(x, ey + 7, x + w, ey + 1); g.stroke(); }
    // brow (tapered: thick inner -> thin outer)
    const by = ey - 34 - E.r - (s === 1 && E.asym ? 8 : 0), bi = E.bi * (s === 1 && E.asym ? -0.4 : 1);
    const x0 = cx + s * 30, x1 = cx + s * 100, y0 = by - bi * 0.5 + 2, y1 = by + E.bo;
    g.fillStyle = K; g.beginPath(); g.moveTo(x0, y0 - 5.5); g.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 9, x1, y1 - 1);
    g.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 2, x0, y0 + 5.5); g.closePath(); g.fill();
  }
  // soft modelling: cheeks + nose shadow
  for (const s of [-1, 1]) { const gr = g.createRadialGradient(cx + s * 92, 352, 2, cx + s * 92, 352, 46); gr.addColorStop(0, 'rgba(200,90,80,0.16)'); gr.addColorStop(1, 'rgba(200,90,80,0)'); g.fillStyle = gr; g.fillRect(cx + s * 92 - 50, 300, 100, 110); }
  // nose
  g.strokeStyle = 'rgba(90,50,38,0.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + 6, 322); g.quadraticCurveTo(cx + 14, 350, cx + 2, 356); g.stroke();
  // mouth
  const my = 398; g.strokeStyle = K; g.lineWidth = 6;
  const line = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  switch (E.m) {
    case 'gasp': g.beginPath(); g.ellipse(cx, my + 8, 21, 27, 0, 0, 7); g.fillStyle = '#3a1418'; g.fill(); g.lineWidth = 5; g.stroke();
      g.save(); g.clip(); g.fillStyle = '#f1ebe2'; g.fillRect(cx - 22, my - 20, 44, 11); g.fillStyle = '#b8505c'; g.beginPath(); g.ellipse(cx, my + 33, 14, 9, 0, 0, 7); g.fill(); g.restore(); break;
    case 'o': g.beginPath(); g.ellipse(cx, my + 4, 9, 11, 0, 0, 7); g.fillStyle = '#3a1418'; g.fill(); g.lineWidth = 4.5; g.stroke(); break;
    case 'tight': line([[cx - 24, my + 2], [cx, my - 1], [cx + 24, my + 2]]); break;
    case 'frown': g.beginPath(); g.moveTo(cx - 24, my + 5); g.quadraticCurveTo(cx, my - 5, cx + 24, my + 5); g.stroke(); break;
    case 'wavy': g.beginPath(); g.moveTo(cx - 24, my + 2); g.bezierCurveTo(cx - 10, my - 6, cx + 6, my + 8, cx + 24, my - 3); g.stroke(); break;
    case 'flatTilt': line([[cx - 22, my + 3], [cx + 24, my - 2]]); break;
    case 'smirk': g.beginPath(); g.moveTo(cx - 22, my + 1); g.quadraticCurveTo(cx + 4, my + 7, cx + 26, my - 6); g.stroke(); break;
    case 'soft': g.beginPath(); g.moveTo(cx - 22, my); g.quadraticCurveTo(cx, my + 5, cx + 22, my); g.stroke(); break;
    default: line([[cx - 22, my + 1], [cx + 22, my + 1]]);
  }
  if (o.sweat) { // a single bead on the temple
    const x = cx + 118, y = 230 + o.sweat * 40; g.globalAlpha = Math.min(1, (1 - o.sweat) * 4);
    g.fillStyle = 'rgba(190,225,255,0.9)'; g.beginPath(); g.moveTo(x, y - 22); g.quadraticCurveTo(x - 11, y + 4, x, y + 8); g.quadraticCurveTo(x + 11, y + 4, x, y - 22); g.fill();
    g.strokeStyle = 'rgba(30,40,60,0.8)'; g.lineWidth = 2.5; g.stroke(); g.globalAlpha = 1;
  }
}
