'use strict';
const cv = document.getElementById('cv');
const strokes = [];
let raf = 0;
function draw() {
  raf = 0;
  const w = innerWidth, h = innerHeight, r = devicePixelRatio || 1;
  if (cv.width !== w * r) { cv.width = w * r; cv.height = h * r; }
  const g = cv.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, w, h);
  const now = Date.now();
  while (strokes.length && now - strokes[0].at > 6000) strokes.shift();
  for (const s of strokes) {
    const a = Math.max(0, 1 - (now - s.at) / 6000);
    g.strokeStyle = `rgba(255,212,59,${a})`; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    s.pts.forEach(([x, y], i) => (i ? g.lineTo(x * w, y * h) : g.moveTo(x * w, y * h))); g.stroke();
  }
  if (strokes.length) raf = requestAnimationFrame(draw);
}
window.rdLocal.on('rd:o:draw', (pts) => { strokes.push({ pts, at: Date.now() }); if (strokes.length > 50) strokes.shift(); if (!raf) raf = requestAnimationFrame(draw); });
