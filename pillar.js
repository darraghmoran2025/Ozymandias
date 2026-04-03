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

// ── Canvas + moon element ──────────────────────────────────────────────
const canvas = document.getElementById('pillar-canvas');
const ctx    = canvas.getContext('2d');
const moonEl = document.getElementById('moon-return');
let W = 0, H = 0;

// Moon starts hidden; click navigates home
moonEl.style.opacity = '0';
moonEl.style.pointerEvents = 'none';
moonEl.style.transition = 'opacity 3s ease';
moonEl.addEventListener('click', () => { window.location.href = 'index.html'; });

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();

// ── Pillar dimensions ──────────────────────────────────────────────────
const SHAFT_W   = 170;
const CAP_W     = 218;
const CAP_H     = 36;
const BASE_W    = 238;
const BASE_H    = 50;
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

const AFTERMATH_LINES = [
  'Nothing beside remains. Round the decay',
  'Of that colossal Wreck, boundless and bare',
  'The lone and level sands stretch far away.',
];

// ── Geometry ───────────────────────────────────────────────────────────
let cx, floorY, shaftH, courseH;
let shaftX, shaftTop, capX, capTop, baseX, baseTop;

function computeGeometry() {
  cx      = W / 2;
  floorY  = H * 0.76;
  shaftH  = Math.min(H * 0.50, 360);
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
const activeCourses = new Set();

function buildChunks() {
  chunks = [];
  activeCourses.clear();

  const cSplit = CAP_W * 0.52;
  chunks.push(mkChunk('cap-L', capX,         capTop, cSplit,          CAP_H, -1));
  chunks.push(mkChunk('cap-R', capX + cSplit, capTop, CAP_W - cSplit, CAP_H, -1));

  for (let i = 0; i < N_COURSES; i++) {
    const y     = shaftTop + i * courseH;
    const split = SHAFT_W * (0.44 + Math.random() * 0.12);
    chunks.push(mkChunk(`s${i}a`, shaftX,         y, split,           courseH, i));
    chunks.push(mkChunk(`s${i}b`, shaftX + split, y, SHAFT_W - split, courseH, i));
  }

  const b1 = BASE_W * 0.37, b2 = BASE_W * 0.35;
  chunks.push(mkChunk('base-L', baseX,            baseTop, b1,                BASE_H, -1));
  chunks.push(mkChunk('base-M', baseX + b1,        baseTop, b2,                BASE_H, -1));
  chunks.push(mkChunk('base-R', baseX + b1 + b2,   baseTop, BASE_W - b1 - b2, BASE_H, -1));
}

function mkChunk(id, x, y, w, h, courseIdx) {
  const noise = [];
  const n = Math.floor(w * h / 95);
  for (let i = 0; i < n; i++) {
    noise.push({
      x: Math.random() * w, y: Math.random() * h,
      len: 3 + Math.random() * 8,
      a: Math.random() * Math.PI,
      op: 0.04 + Math.random() * 0.06,
    });
  }
  return { id, x, y, w, h, courseIdx, vx: 0, vy: 0, va: 0, angle: 0, opacity: 1, active: false, settled: false, noise };
}

// ── Cracks ─────────────────────────────────────────────────────────────
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
    delay: i * 320,
  }));
}

// ── Particles ──────────────────────────────────────────────────────────
const dust = [], burst = [], gust = [], rubble = [];
let gustActive = false;

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
      x: cx + (Math.random() - 0.5) * 100,
      y: floorY - 18,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - Math.random() * 1.5,
      r: 1 + Math.random() * 2.5,
      op: 0.35 + Math.random() * 0.5,
      decay: 0.004 + Math.random() * 0.008,
    });
  }
}

function triggerGust() {
  gustActive = true;
  let batch = 0;
  const iv = setInterval(() => {
    for (let i = 0; i < 20; i++) {
      const speed = 5 + Math.random() * 9;
      gust.push({
        x:      -(20 + Math.random() * 140),
        y:      Math.random() * H,
        r:      0.5 + Math.random() * 2.8,
        vx:     speed,
        vy:     (Math.random() - 0.5) * 1.0,
        baseOp: 0.15 + Math.random() * 0.4,
      });
    }
    if (++batch >= 20) clearInterval(iv);
  }, 100);
}

function addRubble(chunk) {
  const n = Math.ceil(chunk.w * chunk.h / 200);
  for (let i = 0; i < n; i++) {
    rubble.push({
      x: chunk.x + Math.random() * chunk.w,
      y: floorY  - Math.random() * 4,
      rw: 2 + Math.random() * 6,
      rh: 1 + Math.random() * 3,
      angle: Math.random() * Math.PI,
    });
  }
}

// ── Tremor ─────────────────────────────────────────────────────────────
let tx = 0, ty = 0;

function updateTremor(t) {
  if (t < 3500 || t > 10500) { tx = ty = 0; return; }
  const m = t < 7500 ? 0.4 : 1.1;
  tx = (Math.random() - 0.5) * m;
  ty = (Math.random() - 0.5) * m * 0.3;
}

// ── Animation state ────────────────────────────────────────────────────
let t0 = null, crumbleGo = false, resetTimer = null, pillarA = 0;
const lineStarts = [0, 0, 0]; // performance.now() when each aftermath line starts

function showMoon() {
  moonEl.style.opacity = '1';
  moonEl.style.pointerEvents = 'auto';
}

// ── Crumble scheduling ─────────────────────────────────────────────────
// All delays relative to when scheduleCrumble() is called (at elapsed = 10 000 ms)
function scheduleCrumble() {
  const caps  = chunks.filter(c => c.id.startsWith('cap'));
  const bases = chunks.filter(c => c.id.startsWith('base'));

  // Capital first
  caps.forEach((c, i) => setTimeout(() => launch(c, 'top'), i * 160));

  // Shaft courses top → bottom, one every 420 ms
  for (let i = 0; i < N_COURSES; i++) {
    setTimeout(() => {
      activeCourses.add(i);
      chunks.filter(c => c.courseIdx === i).forEach(c => launch(c, 'mid'));
    }, 200 + i * 420);
  }

  // Base last
  const baseDelay = 200 + N_COURSES * 420 + 400; // ≈ 5640 ms
  bases.forEach((c, i) => setTimeout(() => launch(c, 'bot'), baseDelay + i * 180));
  setTimeout(triggerBurst, baseDelay + 350);

  // Aftermath poem lines fade in
  setTimeout(() => { lineStarts[0] = performance.now(); }, baseDelay + 3500);
  setTimeout(() => { lineStarts[1] = performance.now(); }, baseDelay + 7500);
  setTimeout(() => { lineStarts[2] = performance.now(); }, baseDelay + 11500);

  // Gust sweeps through after last line is fully visible; moon follows
  setTimeout(triggerGust, baseDelay + 14500);
  setTimeout(showMoon,    baseDelay + 17500);
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
  g.addColorStop(0,   'rgba(165,118,45,0)');
  g.addColorStop(0.2, 'rgba(150,100,32,0.72)');
  g.addColorStop(1,   '#6a3e10');
  ctx.fillStyle = g;
  ctx.fillRect(0, floorY - 35, W, H - floorY + 35);

  ctx.save();
  ctx.strokeStyle = 'rgba(90,58,15,0.11)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const ry = floorY + i * 13;
    ctx.beginPath();
    ctx.moveTo(0, ry + Math.sin(i * 1.1) * 4);
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
  ctx.fillStyle = stoneGrad(h);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.11)';
  ctx.fillRect(w - 3, 0, 3, h);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, h - 2, w, 2);
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
  ctx.font = 'bold 13px Georgia, serif';
  ctx.letterSpacing = '1.5px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  INSCRIPTION.forEach((line, li) => {
    const ci = INSC_OFFSET + li;
    if (activeCourses.has(ci)) return;
    const ly = shaftTop + ci * courseH + courseH / 2;

    // Deep incised shadow
    ctx.fillStyle = 'rgba(14,4,1,0.95)';
    ctx.fillText(line, cx + 1.2, ly + 1.2);
    // Carved stone surface — bright highlight
    ctx.fillStyle = 'rgba(242,218,182,0.9)';
    ctx.fillText(line, cx, ly);
  });
  ctx.restore();
}

function drawCracks(elapsed) {
  if (elapsed < 6000) return;
  const local = elapsed - 6000;
  const fade  = elapsed > 10000 ? Math.max(0, 1 - (elapsed - 10000) / 900) : 1;
  if (fade <= 0) return;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.strokeStyle = 'rgba(14,5,1,0.88)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  cracks.forEach(cr => {
    if (local < cr.delay) return;
    const prog = Math.min(
      cr.pts.length - 1,
      ((local - cr.delay) / 450) * (cr.pts.length - 1)
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
  // Ambient floating dust
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

  // Collapse burst
  for (let i = burst.length - 1; i >= 0; i--) {
    const p = burst[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.op -= p.decay;
    if (p.op <= 0) { burst.splice(i, 1); continue; }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,158,72,${p.op.toFixed(3)})`;
    ctx.fill();
  }

  // Horizontal gust sweep
  if (gustActive) {
    for (let i = gust.length - 1; i >= 0; i--) {
      const p = gust[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x > W + 100) { gust.splice(i, 1); continue; }
      const fadeIn  = Math.min(1, (p.x + 140) / 180);
      const fadeOut = Math.min(1, (W + 80 - p.x) / 220);
      const a = p.baseOp * fadeIn * fadeOut;
      if (a <= 0) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,158,72,${a.toFixed(3)})`;
      ctx.fill();
    }
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

function drawAftermathLines(now) {
  if (!lineStarts[0]) return;

  ctx.save();
  ctx.font = 'italic 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Centre the 3 lines where the inscription was
  const inscCenter = shaftTop + (INSC_OFFSET + 2.5) * courseH;
  const spacing    = 36;

  AFTERMATH_LINES.forEach((line, i) => {
    if (!lineStarts[i]) return;
    const elapsed = now - lineStarts[i];
    const a = Math.min(0.8, elapsed / 3500);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#c8aa72';
    ctx.fillText(line, cx, inscCenter + (i - 1) * spacing);
  });

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Physics ────────────────────────────────────────────────────────────
function updatePhysics() {
  chunks.forEach(c => {
    if (!c.active || c.settled) return;
    c.vy += 0.30;
    c.x += c.vx; c.y += c.vy; c.angle += c.va;

    if (c.y + c.h >= floorY) {
      c.y = floorY - c.h;
      c.vy *= -0.10;
      c.vx *= 0.78;
      c.va *= 0.50;
      if (Math.abs(c.vy) < 0.6) { addRubble(c); c.settled = true; }
    }
    if (c.y > H + 80) c.settled = true;
  });
}

// ── Main loop ──────────────────────────────────────────────────────────
function loop(now) {
  if (!t0) t0 = now;
  const elapsed = now - t0;

  ctx.clearRect(0, 0, W, H);

  // Pillar fades in over 2.5 s
  pillarA = Math.min(1, elapsed / 2500);

  // Crumbling starts at 10 s
  if (elapsed >= 10000 && !crumbleGo) {
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

  // Falling and settled chunks (outside tremor — they've left the pillar)
  updatePhysics();
  chunks.forEach(c => { if (c.active  && !c.settled) drawChunk(c); });
  chunks.forEach(c => { if (c.settled && c.y < H + 10) drawChunk(c); });

  drawRubble();
  drawAftermathLines(now);

  requestAnimationFrame(loop);
}

// ── Resize: debounced full reset ───────────────────────────────────────
window.addEventListener('resize', () => {
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    resize();
    t0        = null;
    crumbleGo = false;
    pillarA   = 0;
    gustActive = false;
    lineStarts[0] = lineStarts[1] = lineStarts[2] = 0;
    burst.length = rubble.length = gust.length = 0;
    moonEl.style.opacity = '0';
    moonEl.style.pointerEvents = 'none';
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
