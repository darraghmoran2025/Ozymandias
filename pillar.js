// pillar.js — Crumbling Ozymandias pillar animation

// ── Stars ──────────────────────────────────────────────────────────────
{
  const container = document.getElementById('stars');
  for (let i = 0; i < 280; i++) {
    const el = document.createElement('div');
    el.className = 'star';
    const sz = Math.random() < 0.7 ? 1 : 2;
    const mn = (0.15 + Math.random() * 0.3).toFixed(2);
    const mx = (0.50 + Math.random() * 0.35).toFixed(2);
    const d  = (3    + Math.random() * 8).toFixed(1);
    el.style.cssText =
      `width:${sz}px;height:${sz}px;` +
      `top:${(Math.random() * 85).toFixed(1)}%;` +
      `left:${(Math.random() * 100).toFixed(1)}%;` +
      `--star-min:${mn};--star-max:${mx};` +
      `animation-duration:${d}s;` +
      `animation-delay:-${(Math.random() * 8).toFixed(1)}s`;
    container.appendChild(el);
  }
}

// ── Canvas ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('pillar-canvas');
const ctx    = canvas.getContext('2d');
let W = 0, H = 0;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();

// ── Pillar dimensions ──────────────────────────────────────────────────
const SHAFT_W   = 130;
const CAP_W     = 182;
const CAP_H     = 33;
const BASE_W    = 196;
const BASE_H    = 45;
const N_COURSES = 12;

const INSCRIPTION = [
  'MY NAME IS',
  'OZYMANDIAS,',
  'KING OF KINGS;',
  'LOOK ON MY WORKS,',
  'YE MIGHTY,',
  'AND DESPAIR!',
];
const INSC_OFFSET = 2; // inscription starts at shaft course index 2

// ── Geometry (recomputed on resize) ───────────────────────────────────
let cx, floorY, shaftH, courseH;
let shaftX, shaftTop, capX, capTop, baseX, baseTop;

function computeGeometry() {
  cx      = W / 2;
  floorY  = H * 0.76;
  shaftH  = Math.min(H * 0.50, 340);
  courseH = shaftH / N_COURSES;

  shaftX   = cx - SHAFT_W / 2;
  shaftTop = floorY - BASE_H - shaftH;
  capX     = cx - CAP_W / 2;
  capTop   = shaftTop - CAP_H;
  baseX    = cx - BASE_W / 2;
  baseTop  = floorY - BASE_H;
}

// ── Chunks ─────────────────────────────────────────────────────────────
let chunks = [];
const activeCourses = new Set(); // course indices that have launched

function buildChunks() {
  chunks = [];
  activeCourses.clear();

  // Capital — 2 pieces
  const cSplit = CAP_W * 0.52;
  chunks.push(mkChunk('cap-L', capX,          capTop, cSplit,          CAP_H,  -1));
  chunks.push(mkChunk('cap-R', capX + cSplit,  capTop, CAP_W - cSplit,  CAP_H,  -1));

  // Shaft — 2 pieces per course (slightly irregular vertical split)
  for (let i = 0; i < N_COURSES; i++) {
    const y = shaftTop + i * courseH;
    const split = SHAFT_W * (0.44 + Math.random() * 0.12);
    chunks.push(mkChunk(`s${i}a`, shaftX,          y, split,           courseH, i));
    chunks.push(mkChunk(`s${i}b`, shaftX + split,  y, SHAFT_W - split, courseH, i));
  }

  // Base — 3 pieces
  const b1 = BASE_W * 0.37, b2 = BASE_W * 0.35;
  chunks.push(mkChunk('base-L', baseX,             baseTop, b1,                  BASE_H, -1));
  chunks.push(mkChunk('base-M', baseX + b1,        baseTop, b2,                  BASE_H, -1));
  chunks.push(mkChunk('base-R', baseX + b1 + b2,   baseTop, BASE_W - b1 - b2,   BASE_H, -1));
}

function mkChunk(id, x, y, w, h, courseIdx) {
  // Pre-generate stone texture noise lines (relative to chunk local space)
  const noise = [];
  const n = Math.floor(w * h / 95);
  for (let i = 0; i < n; i++) {
    noise.push({
      x: Math.random() * w,
      y: Math.random() * h,
      len: 3 + Math.random() * 8,
      a: Math.random() * Math.PI,
      op: 0.04 + Math.random() * 0.06,
    });
  }
  return {
    id, x, y, w, h, courseIdx,
    vx: 0, vy: 0, va: 0, angle: 0, opacity: 1,
    active: false, settled: false,
    noise,
  };
}

// ── Cracks ─────────────────────────────────────────────────────────────
// Defined as [fracX, fracY] fractions of the shaft face
const CRACK_DEFS = [
  [[0.65, 0.12], [0.35, 0.22], [0.52, 0.42]],
  [[0.05, 0.38], [0.44, 0.44], [0.90, 0.37]],
  [[0.80, 0.58], [0.50, 0.65], [0.18, 0.72]],
  [[0.00, 0.20], [0.32, 0.27]],
  [[1.00, 0.52], [0.62, 0.57], [0.38, 0.63]],
  [[0.28, 0.07], [0.56, 0.17], [0.74, 0.05]],
];
let cracks = [];

function buildCracks() {
  cracks = CRACK_DEFS.map((pts, i) => ({
    pts: pts.map(([fx, fy]) => ({
      x: shaftX + fx * SHAFT_W,
      y: shaftTop + fy * shaftH,
    })),
    delay: i * 260,
  }));
}

// ── Ambient dust + burst ───────────────────────────────────────────────
const dust   = [];
const burst  = [];
const rubble = [];

function initDust() {
  dust.length = 0;
  for (let i = 0; i < 65; i++) {
    dust.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.4 + Math.random() * 1.1,
      speed: 0.08 + Math.random() * 0.32,
      drift: (Math.random() - 0.5) * 0.22,
      op: 0.03 + Math.random() * 0.13,
    });
  }
}

function triggerBurst() {
  for (let i = 0; i < 130; i++) {
    const a = Math.PI + (Math.random() - 0.5) * Math.PI * 0.85;
    const s = 0.8 + Math.random() * 3.5;
    burst.push({
      x:  cx + (Math.random() - 0.5) * 100,
      y:  floorY - 18,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - Math.random() * 1.5,
      r:  1 + Math.random() * 2.5,
      op: 0.35 + Math.random() * 0.5,
      decay: 0.006 + Math.random() * 0.012,
    });
  }
}

function addRubble(chunk) {
  const n = Math.ceil(chunk.w * chunk.h / 200);
  for (let i = 0; i < n; i++) {
    rubble.push({
      x:     chunk.x + Math.random() * chunk.w,
      y:     floorY  - Math.random() * 4,
      rw:    2 + Math.random() * 6,
      rh:    1 + Math.random() * 3,
      angle: Math.random() * Math.PI,
    });
  }
}

// ── Tremor ─────────────────────────────────────────────────────────────
let tx = 0, ty = 0;

function updateTremor(t) {
  if (t < 2100 || t > 6300) { tx = ty = 0; return; }
  const m = t < 4000 ? 0.4 : 1.1;
  tx = (Math.random() - 0.5) * m;
  ty = (Math.random() - 0.5) * m * 0.3;
}

// ── Animation state ────────────────────────────────────────────────────
let t0 = null;
let crumbleGo = false;
let endT      = 0;
let pillarA   = 0;
let resetTimer = null;

// ── Crumble scheduling ─────────────────────────────────────────────────
// Called once at elapsed = 6000ms; all delays are relative from that point.
function scheduleCrumble() {
  const caps  = chunks.filter(c => c.id.startsWith('cap'));
  const bases = chunks.filter(c => c.id.startsWith('base'));

  // Capital launches first
  caps.forEach((c, i) => setTimeout(() => launch(c, 'top'), i * 130));

  // Shaft courses fall top → bottom
  for (let i = 0; i < N_COURSES; i++) {
    setTimeout(() => {
      activeCourses.add(i);
      chunks.filter(c => c.courseIdx === i).forEach(c => launch(c, 'mid'));
    }, 200 + i * 280);
  }

  // Base falls last
  const baseDelay = 200 + N_COURSES * 280 + 380;
  bases.forEach((c, i) => setTimeout(() => launch(c, 'bot'), baseDelay + i * 160));

  // Dust burst at collapse
  setTimeout(triggerBurst, baseDelay + 300);

  // "nothing beside remains." fades in after the dust settles
  setTimeout(() => { endT = performance.now(); }, baseDelay + 3200);
}

function launch(c, zone) {
  c.active = true;
  c.vx = (Math.random() - 0.5) * 2.8;
  c.vy = zone === 'top' ? -0.8 - Math.random() * 1.8 : 0.5 + Math.random() * 0.8;
  c.va = (Math.random() - 0.5) * 0.06;
}

// ── Draw helpers ───────────────────────────────────────────────────────

function drawSand() {
  const g = ctx.createLinearGradient(0, floorY - 35, 0, H);
  g.addColorStop(0,    'rgba(165,118,45,0)');
  g.addColorStop(0.2,  'rgba(150,100,32,0.72)');
  g.addColorStop(1,    '#6a3e10');
  ctx.fillStyle = g;
  ctx.fillRect(0, floorY - 35, W, H - floorY + 35);

  ctx.save();
  ctx.strokeStyle = 'rgba(90,58,15,0.11)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const ry = floorY + i * 13;
    ctx.beginPath();
    ctx.moveTo(0,      ry + Math.sin(i * 1.1) * 4);
    ctx.bezierCurveTo(W * 0.25, ry - 5, W * 0.65, ry + 7, W, ry + 2);
    ctx.stroke();
  }
  ctx.restore();
}

function stoneGrad(h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0,    '#a68f7b');
  g.addColorStop(0.45, '#8d7b69');
  g.addColorStop(1,    '#6e5c4c');
  return g;
}

function drawChunkShape(chunk) {
  const { w, h, noise } = chunk;

  // Stone body
  ctx.fillStyle = stoneGrad(h);
  ctx.fillRect(0, 0, w, h);

  // Right-edge shadow (faux 3-D)
  ctx.fillStyle = 'rgba(0,0,0,0.11)';
  ctx.fillRect(w - 3, 0, 3, h);

  // Bottom edge shadow
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, h - 2, w, 2);

  // Procedural stone texture
  noise.forEach(nl => {
    ctx.save();
    ctx.globalAlpha = nl.op;
    ctx.strokeStyle = 'rgba(28,14,6,1)';
    ctx.lineWidth = 0.7;
    ctx.translate(nl.x, nl.y);
    ctx.rotate(nl.a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(nl.len, 0);
    ctx.stroke();
    ctx.restore();
  });
}

function drawChunk(c) {
  ctx.save();
  ctx.globalAlpha = c.opacity;
  ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
  ctx.rotate(c.angle);
  ctx.translate(-c.w / 2, -c.h / 2);
  drawChunkShape(c);
  ctx.restore();
}

function drawInscription() {
  ctx.save();
  ctx.font = 'bold 10px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  INSCRIPTION.forEach((line, li) => {
    const ci = INSC_OFFSET + li;
    if (activeCourses.has(ci)) return; // this course is falling — hide its text
    const ly = shaftTop + ci * courseH + courseH / 2;

    // Chiseled: dark incised shadow, then lighter carved surface
    ctx.fillStyle = 'rgba(25,10,3,0.88)';
    ctx.fillText(line, cx + 0.8, ly + 0.8);
    ctx.fillStyle = 'rgba(220,200,170,0.68)';
    ctx.fillText(line, cx, ly);
  });
  ctx.restore();
}

function drawCracks(elapsed) {
  if (elapsed < 4000) return;
  const local = elapsed - 4000;

  // Fade out once crumbling starts
  const fade = elapsed > 6000 ? Math.max(0, 1 - (elapsed - 6000) / 800) : 1;
  if (fade <= 0) return;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.strokeStyle = 'rgba(16,6,2,0.84)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';

  cracks.forEach(cr => {
    if (local < cr.delay) return;
    const prog = Math.min(
      cr.pts.length - 1,
      ((local - cr.delay) / 380) * (cr.pts.length - 1)
    );
    ctx.beginPath();
    ctx.moveTo(cr.pts[0].x, cr.pts[0].y);
    for (let i = 1; i < cr.pts.length; i++) {
      const s = Math.min(1, prog - (i - 1));
      if (s <= 0) break;
      const p = cr.pts[i - 1], q = cr.pts[i];
      ctx.lineTo(p.x + (q.x - p.x) * s, p.y + (q.y - p.y) * s);
    }
    ctx.stroke();
  });
  ctx.restore();
}

function drawDust() {
  dust.forEach(p => {
    p.x += p.drift + 0.18;
    p.y -= p.speed;
    if (p.x > W) p.x = 0;
    if (p.y < 0) { p.y = floorY; p.x = Math.random() * W; }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,158,72,${p.op})`;
    ctx.fill();
  });

  for (let i = burst.length - 1; i >= 0; i--) {
    const p = burst[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.04;
    p.op -= p.decay;
    if (p.op <= 0) { burst.splice(i, 1); continue; }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,158,72,${p.op.toFixed(3)})`;
    ctx.fill();
  }
}

function drawRubble() {
  ctx.fillStyle = '#7a6858';
  rubble.forEach(r => {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);
    ctx.fillRect(-r.rw / 2, -r.rh / 2, r.rw, r.rh);
    ctx.restore();
  });
}

function drawEndText(now) {
  if (!endT) return;
  const a = Math.min(0.72, (now - endT) / 2500);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = '#b89860';
  ctx.font = 'italic 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('nothing beside remains.', cx, floorY + 55);
  ctx.restore();
}

// ── Physics update ─────────────────────────────────────────────────────
function updatePhysics() {
  chunks.forEach(c => {
    if (!c.active || c.settled) return;

    c.vy     += 0.32;       // gravity
    c.x      += c.vx;
    c.y      += c.vy;
    c.angle  += c.va;

    // Floor collision
    if (c.y + c.h >= floorY) {
      c.y   = floorY - c.h;
      c.vy *= -0.10;
      c.vx *= 0.78;
      c.va *= 0.50;
      if (Math.abs(c.vy) < 0.6) {
        addRubble(c);
        c.settled = true;
      }
    }

    // Off-screen fallback
    if (c.y > H + 80) c.settled = true;
  });
}

// ── Main loop ──────────────────────────────────────────────────────────
function loop(now) {
  if (!t0) t0 = now;
  const elapsed = now - t0;

  ctx.clearRect(0, 0, W, H);

  // Pillar fades in over 1.5 s
  pillarA = Math.min(1, elapsed / 1500);

  // Kick off crumbling at t = 6 s
  if (elapsed >= 6000 && !crumbleGo) {
    crumbleGo = true;
    scheduleCrumble();
  }

  drawSand();
  drawDust();

  // Intact pillar + cracks (tremor applied)
  updateTremor(elapsed);
  ctx.save();
  ctx.translate(tx, ty);
  ctx.globalAlpha = pillarA;
  chunks.forEach(c => { if (!c.active && !c.settled) drawChunk(c); });
  drawInscription();
  ctx.globalAlpha = 1;
  drawCracks(elapsed);
  ctx.restore();

  // Falling + settled chunks (no tremor — they've left the pillar)
  updatePhysics();
  chunks.forEach(c => {
    if (c.active && !c.settled) drawChunk(c);
  });
  chunks.forEach(c => {
    if (c.settled && c.y < H + 10) drawChunk(c);
  });

  drawRubble();
  drawEndText(now);

  requestAnimationFrame(loop);
}

// ── Resize: debounced full reset ───────────────────────────────────────
window.addEventListener('resize', () => {
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    resize();
    t0         = null;
    crumbleGo  = false;
    endT       = 0;
    pillarA    = 0;
    burst.length  = 0;
    rubble.length = 0;
    computeGeometry();
    buildChunks();
    buildCracks();
    initDust();
  }, 200);
});

// ── Init ───────────────────────────────────────────────────────────────
computeGeometry();
buildChunks();
buildCracks();
initDust();
requestAnimationFrame(loop);
