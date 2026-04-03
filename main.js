import { prepareWithSegments, layoutWithLines, clearCache } from './vendor/pretext/layout.js';

const POEM = `I met a traveller from an antique land,
Who said—"Two vast and trunkless legs of stone
Stand in the desert. . . . Near them, on the sand,
Half sunk a shattered visage lies, whose frown,
And wrinkled lip, and sneer of cold command,
Tell that its sculptor well those passions read
Which yet survive, stamped on these lifeless things,
The hand that mocked them, and the heart that fed;
And on the pedestal, these words appear:
My name is Ozymandias, King of Kings;
Look on my Works, ye Mighty, and despair!
Nothing beside remains. Round the decay
Of that colossal Wreck, boundless and bare
The lone and level sands stretch far away."`;

const BOAST_TEXT = new Set([
  'And on the pedestal, these words appear:',
  'My name is Ozymandias, King of Kings;',
  'Look on my Works, ye Mighty, and despair!',
]);

const AFTERMATH_TEXT = new Set([
  'Nothing beside remains. Round the decay',
  'Of that colossal Wreck, boundless and bare',
  'The lone and level sands stretch far away."',
]);

const FONT = '20px Georgia, serif';
const LINE_HEIGHT = 38;
const STAGGER_MS = 620;
const BOAST_EXTRA_DELAY_MS = 1400;
const INITIAL_DELAY_MS = 1400;

const REPEL_RADIUS = 200;
const REPEL_STRENGTH = 55;


let mouseX = 0;
let mouseY = 0;
let rafPending = false;
const lockedWrappers = new Set();

function generateStars() {
  const container = document.getElementById('stars');
  const count = 320;
  for (let i = 0; i < count; i++) {
    const x    = (Math.random() * 100).toFixed(2);
    const y    = (Math.random() * 100).toFixed(2);
    const size = Math.random() < 0.8 ? 1 : 2;
    const minOp = (0.08 + Math.random() * 0.18).toFixed(2);
    const maxOp = Math.min(1, parseFloat(minOp) + 0.3 + Math.random() * 0.55).toFixed(2);
    const dur   = (2 + Math.random() * 5).toFixed(2);
    const delay = -(Math.random() * 12).toFixed(2);

    const star = document.createElement('div');
    star.className = 'star';
    star.style.cssText = `left:${x}%;top:${y}%;width:${size}px;height:${size}px;--star-min:${minOp};--star-max:${maxOp};animation-duration:${dur}s;animation-delay:${delay}s;`;
    container.appendChild(star);
  }
}

function classifyLine(text) {
  const trimmed = text.trim();
  if (BOAST_TEXT.has(trimmed)) return 'boast';
  if (AFTERMATH_TEXT.has(trimmed)) return 'aftermath';
  return null;
}

function buildPoem() {
  const container = document.getElementById('poem-container');
  const width = container.getBoundingClientRect().width;

  const prepared = prepareWithSegments(POEM, FONT, { whiteSpace: 'pre-wrap' });
  const result = layoutWithLines(prepared, width, LINE_HEIGHT);

  container.style.height = result.height + 'px';

  result.lines.forEach((line, i) => {
    // Outer div: handles position + mouse repel transform (no animation)
    const wrapper = document.createElement('div');
    wrapper.className = 'poem-line-wrapper';
    wrapper.style.top = (i * LINE_HEIGHT) + 'px';

    // Inner span: handles only the reveal animation
    const el = document.createElement('span');
    el.className = 'poem-line';
    const cls = classifyLine(line.text);
    if (cls) el.classList.add(cls);

    // Wrap each word in a span for letter-scatter on click
    line.text.split(/(\s+)/).forEach(token => {
      if (/\s+/.test(token)) {
        el.appendChild(document.createTextNode(token));
      } else if (token.length > 0) {
        const word = document.createElement('span');
        word.className = 'word';
        word.textContent = token;
        el.appendChild(word);
      }
    });

    wrapper.appendChild(el);
    container.appendChild(wrapper);
  });

  animateLines(container);
}

function animateLines(container) {
  const lines = container.querySelectorAll('.poem-line');
  let delay = INITIAL_DELAY_MS;

  lines.forEach((el) => {
    setTimeout(() => el.classList.add('reveal'), delay);
    delay += STAGGER_MS;
    if (el.classList.contains('boast')) delay += BOAST_EXTRA_DELAY_MS;
  });
}

function applyRepel() {
  rafPending = false;
  const wrappers = document.querySelectorAll('.poem-line-wrapper');
  wrappers.forEach(wrapper => {
    if (lockedWrappers.has(wrapper)) return;

    const rect = wrapper.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = mouseX - cx;
    const dy = mouseY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < REPEL_RADIUS && dist > 0) {
      const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
      const tx = -(dx / dist) * force;
      const ty = -(dy / dist) * force;
      wrapper.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`;
    } else {
      wrapper.style.transform = 'translate(0, 0)';
    }
  });
}


function handleResize() {
  clearCache();
  const container = document.getElementById('poem-container');
  const width = container.getBoundingClientRect().width;

  const prepared = prepareWithSegments(POEM, FONT, { whiteSpace: 'pre-wrap' });
  const result = layoutWithLines(prepared, width, LINE_HEIGHT);

  container.style.height = result.height + 'px';

  const wrappers = container.querySelectorAll('.poem-line-wrapper');
  result.lines.forEach((line, i) => {
    if (wrappers[i]) {
      wrappers[i].style.top = (i * LINE_HEIGHT) + 'px';
    }
  });
}

function impactFlash(x, y) {
  const isDay = document.body.classList.contains('day');
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    left: ${x}px; top: ${y}px;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: ${isDay ? 'rgba(200,120,30,0.9)' : 'rgba(220,230,255,0.9)'};
    transform: translate(-50%,-50%) scale(0);
    pointer-events: none;
    z-index: 101;
  `;
  document.body.appendChild(flash);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    flash.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
    flash.style.transform = 'translate(-50%,-50%) scale(18)';
    flash.style.opacity = '0';
  }));
  setTimeout(() => flash.remove(), 320);
}

function scatterWord(wordEl, e) {
  if (wordEl.dataset.scattering) return;
  wordEl.dataset.scattering = '1';

  const text = wordEl.textContent;
  const wordRect = wordEl.getBoundingClientRect();
  const lineEl = wordEl.closest('.poem-line');
  const color = getComputedStyle(lineEl).color;
  const fontSize = getComputedStyle(lineEl).fontSize;
  const fontFamily = getComputedStyle(lineEl).fontFamily;

  impactFlash(e.clientX, e.clientY);
  wordEl.style.visibility = 'hidden';

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:100;';
  document.body.appendChild(container);

  const letterWidth = wordRect.width / text.length;
  const originX = e.clientX;
  const originY = e.clientY;

  text.split('').forEach((char, i) => {
    const letter = document.createElement('span');
    letter.textContent = char;
    letter.style.cssText = `
      position: fixed;
      left: ${(wordRect.left + i * letterWidth).toFixed(1)}px;
      top: ${wordRect.top.toFixed(1)}px;
      font-family: ${fontFamily};
      font-size: ${fontSize};
      color: ${color};
      line-height: 1;
      transform-origin: center center;
    `;
    container.appendChild(letter);

    const lx = wordRect.left + (i + 0.5) * letterWidth;
    const ly = wordRect.top + wordRect.height / 2;
    const dx = lx - originX;
    const dy = ly - originY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 130 + Math.random() * 200;
    const tx = (dx / dist) * speed + (Math.random() - 0.5) * 90;
    const ty = (dy / dist) * speed + Math.random() * 80; // gravity bias downward
    const rot = (Math.random() - 0.5) * 720;
    const scale = Math.random() * 0.15;

    setTimeout(() => {
      letter.style.transition =
        'transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.6s ease-in, filter 0.6s ease';
      letter.style.transform =
        `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${scale})`;
      letter.style.opacity = '0';
      letter.style.filter = 'blur(4px)';
    }, i * 18);
  });

  setTimeout(() => container.remove(), 1400);

  // After delay, word reforms — but decayed, not fully restored
  setTimeout(() => {
    wordEl.style.visibility = '';
    wordEl.classList.add('decayed');
    delete wordEl.dataset.scattering;
  }, 5000);
}

let blowawayInProgress = false;

function resetAndReveal() {
  const container = document.getElementById('poem-container');
  const lines = container.querySelectorAll('.poem-line');
  lines.forEach(el => el.classList.remove('reveal'));
  void container.offsetHeight;
  animateLines(container);
}

function blowawayAndToggle() {
  if (blowawayInProgress) return;
  blowawayInProgress = true;

  const wrappers = [...document.querySelectorAll('.poem-line-wrapper')];
  const lineData = wrappers.map(w => {
    const lineEl = w.querySelector('.poem-line');
    return { rect: w.getBoundingClientRect(), color: getComputedStyle(lineEl).color };
  }).filter(d => d.rect.width > 0);

  const cvs = document.createElement('canvas');
  cvs.width  = window.innerWidth;
  cvs.height = window.innerHeight;
  cvs.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;';
  document.body.appendChild(cvs);
  const ctx2 = cvs.getContext('2d');

  // Stagger-fade each line so they dissolve top-to-bottom like wind
  const lineEls = [...document.querySelectorAll('.poem-line')];
  lineEls.forEach((el, i) => {
    el.style.transition = `opacity ${0.9 + i * 0.04}s ease ${i * 0.12}s`;
    el.style.opacity = '0';
  });

  if (!window.Matter) {
    // Fallback if CDN failed
    cvs.remove();
    lineEls.forEach(el => { el.style.opacity = ''; el.style.transition = ''; });
    document.body.classList.toggle('day');
    resetAndReveal();
    blowawayInProgress = false;
    return;
  }

  const { Engine, Runner, Bodies, Body, Events, World } = Matter;
  const engine = Engine.create({ gravity: { y: 0.18 } });
  const runner = Runner.create();

  const bodies = [];
  lineData.forEach(({ rect, color }, lineIdx) => {
    const count = 32 + Math.floor(Math.random() * 12);
    const spawnDelay = lineIdx * 120; // lines spawn particles in sequence
    for (let i = 0; i < count; i++) {
      const bw = 2 + Math.random() * 4;
      const bh = 1.5 + Math.random() * 2.5;
      const b  = Bodies.rectangle(
        rect.left + Math.random() * rect.width,
        rect.top  + Math.random() * rect.height,
        bw, bh, { frictionAir: 0.025, isStatic: true }
      );
      b._color = color;
      b._bw = bw;
      b._bh = bh;
      b._spawnDelay = spawnDelay + Math.random() * 80;
      b._active = false;
      bodies.push(b);
      World.add(engine.world, b);
    }
  });

  Runner.run(runner, engine);

  Events.on(engine, 'beforeUpdate', () => {
    const elapsed = performance.now() - startTime;
    bodies.forEach(b => {
      if (!b._active && elapsed >= b._spawnDelay) {
        b._active = true;
        Body.setStatic(b, false);
        Body.setVelocity(b, { x: (Math.random() - 0.35) * 1.5, y: -(Math.random() * 1.2) });
      }
      if (b._active) {
        Body.applyForce(b, b.position, {
          x: (0.002 + Math.random() * 0.002) * b.mass,
          y: (-0.0005 + (Math.random() - 0.5) * 0.0008) * b.mass,
        });
      }
    });
  });

  const DURATION = 3800;
  const FADE_START = 0.55; // hold full opacity until this fraction of duration
  const startTime = performance.now();

  function render(now) {
    const elapsed = now - startTime;
    ctx2.clearRect(0, 0, cvs.width, cvs.height);
    const t = elapsed / DURATION;
    const alpha = t < FADE_START ? 1 : Math.max(0, 1 - (t - FADE_START) / (1 - FADE_START));
    bodies.forEach(b => {
      if (!b._active) return;
      ctx2.save();
      ctx2.translate(b.position.x, b.position.y);
      ctx2.rotate(b.angle);
      ctx2.globalAlpha = alpha;
      ctx2.fillStyle = b._color;
      ctx2.fillRect(-b._bw / 2, -b._bh / 2, b._bw, b._bh);
      ctx2.restore();
    });
    if (elapsed < DURATION) requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  setTimeout(() => {
    Runner.stop(runner);
    Engine.clear(engine);
    cvs.remove();
    lineEls.forEach(el => { el.style.opacity = ''; el.style.transition = ''; });
    document.body.classList.toggle('day');
    resetAndReveal();
    blowawayInProgress = false;
  }, DURATION);
}

document.getElementById('moon').addEventListener('click', () => {
  blowawayAndToggle();
});

document.addEventListener('click', (e) => {
  if (e.target.closest('#moon')) return;
  const word = e.target.closest('.word');
  if (word) scatterWord(word, e);
});

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(applyRepel);
  }
});

function initDust() {
  let canvas = document.getElementById('dust-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'dust-canvas';
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 0.4 + Math.random() * 1.2,
    speedX: 0.15 + Math.random() * 0.35,
    speedY: 0.05 + Math.random() * 0.15,
    opacity: 0.06 + Math.random() * 0.22,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      const isDay = document.body.classList.contains('day');
      ctx.fillStyle = isDay
        ? `rgba(210, 175, 100, ${p.opacity})`
        : `rgba(190, 205, 230, ${p.opacity})`;
      ctx.fill();
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.x > canvas.width)  { p.x = 0; p.y = Math.random() * canvas.height; }
      if (p.y > canvas.height) { p.y = 0; p.x = Math.random() * canvas.width; }
    });
    requestAnimationFrame(draw);
  }

  draw();
}

function initRuins() {
  const canvas = document.createElement('canvas');
  canvas.id = 'ruins-canvas';
  canvas.style.cssText = `
    position: fixed; bottom: 0; left: 0;
    width: 100%; height: 500px;
    pointer-events: none; z-index: 0;
    opacity: 0; transition: opacity 4s ease;
  `;
  document.body.appendChild(canvas);

  let W = 0, H = 500;

  // ── Dust particles ───────────────────────────────────
  // Spawned across the desert floor; drift right with varying height bands
  function makeDust() {
    const band = Math.random(); // 0=ground, 1=high
    const groundY = 308;       // in 500px canvas space
    return {
      x:     Math.random() * 2000,
      y:     groundY - band * 90 + (Math.random() - 0.5) * 18,
      vx:    0.4 + Math.random() * 1.4 + (1 - band) * 0.6,
      vy:    (Math.random() - 0.5) * 0.18,
      r:     0.6 + Math.random() * (band < 0.3 ? 3.2 : 1.6),
      alpha: 0.12 + Math.random() * (band < 0.3 ? 0.35 : 0.22),
      band,
    };
  }

  const DUST_COUNT = 220;
  const dust = Array.from({ length: DUST_COUNT }, () => {
    const p = makeDust();
    p.x = Math.random() * 3000; // scatter on load
    return p;
  });

  // Occasional dust-devil swirlers (tight clusters that spiral up)
  function makeSwirler() {
    const baseX = Math.random() * 1.5; // fractional, multiplied by W each frame
    return { fx: baseX, x: 0, y: 308, r: 0, angle: 0, life: 0, maxLife: 180 + Math.random() * 240 };
  }
  const swirlers = [makeSwirler(), makeSwirler(), makeSwirler()];

  function drawScene(ctx) {
    const sx = W / 1440;
    const sy = H / 500;

    ctx.clearRect(0, 0, W, H);

    // ── Flat desert floor ────────────────────────────
    const ground = ctx.createLinearGradient(0, 300 * sy, 0, H);
    ground.addColorStop(0, '#d4a840');
    ground.addColorStop(1, '#8a5c14');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 300 * sy, W, H - 300 * sy);

    // ── Horizon haze ─────────────────────────────────
    const haze = ctx.createLinearGradient(0, 240 * sy, 0, 320 * sy);
    haze.addColorStop(0, 'rgba(235,175,55,0)');
    haze.addColorStop(0.5, 'rgba(235,175,55,0.22)');
    haze.addColorStop(1, 'rgba(235,175,55,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 240 * sy, W, 80 * sy);

    // ── Pyramid ──────────────────────────────────────
    const pPeakX = 980 * sx, pPeakY = 55 * sy;
    const pBaseY = 308 * sy;
    const pHalfBase = 310 * sx;

    ctx.beginPath();
    ctx.moveTo(pPeakX, pPeakY);
    ctx.lineTo(pPeakX + pHalfBase, pBaseY);
    ctx.lineTo(pPeakX, pBaseY);
    ctx.closePath();
    ctx.fillStyle = '#9a7235';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pPeakX, pPeakY);
    ctx.lineTo(pPeakX, pBaseY);
    ctx.lineTo(pPeakX - pHalfBase, pBaseY);
    ctx.closePath();
    ctx.fillStyle = '#c8943e';
    ctx.fill();

    for (let y = pPeakY + 14 * sy; y < pBaseY; y += 10 * sy) {
      const progress = (y - pPeakY) / (pBaseY - pPeakY);
      const halfW = pHalfBase * progress;
      ctx.beginPath();
      ctx.moveTo(pPeakX - halfW, y);
      ctx.lineTo(pPeakX + halfW, y);
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const pFade = ctx.createLinearGradient(0, pPeakY, 0, pBaseY);
    pFade.addColorStop(0, 'rgba(140,196,213,0.5)');
    pFade.addColorStop(1, 'rgba(140,196,213,0)');
    ctx.fillStyle = pFade;
    ctx.beginPath();
    ctx.moveTo(pPeakX, pPeakY);
    ctx.lineTo(pPeakX - pHalfBase, pBaseY);
    ctx.lineTo(pPeakX + pHalfBase, pBaseY);
    ctx.closePath();
    ctx.fill();

    // ── Dust particles ────────────────────────────────
    dust.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      if (p.x > W + 40) {
        // Reset to left, re-randomise
        Object.assign(p, makeDust());
        p.x = -p.r * 2;
      }

      const screenY = p.y * sy;
      // Fade out particles that drift too high
      const heightFade = Math.max(0, 1 - Math.max(0, (308 - p.y) / 90));
      ctx.beginPath();
      ctx.arc(p.x, screenY, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,162,72,${p.alpha * heightFade})`;
      ctx.fill();
    });

    // ── Dust-devil swirlers ────────────────────────────
    swirlers.forEach(s => {
      s.life++;
      if (s.life > s.maxLife) { Object.assign(s, makeSwirler()); return; }
      const t   = s.life / s.maxLife;
      const age = Math.sin(t * Math.PI);   // rises then falls
      s.x     = s.fx * W;
      s.y     = 308 - age * 55;
      s.angle += 0.16;
      s.r      = age * 22;

      for (let i = 0; i < 5; i++) {
        const a  = s.angle + i * (Math.PI * 2 / 5);
        const px = s.x + Math.cos(a) * s.r;
        const py = (s.y + Math.sin(a) * s.r * 0.4) * sy;
        const a2 = 0.28 * age * (1 - i / 6);
        ctx.beginPath();
        ctx.arc(px, py, 1.2 + i * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(195,148,55,${a2})`;
        ctx.fill();
      }
    });

    // ── Ground fade at bottom ────────────────────────
    const fade = ctx.createLinearGradient(0, 420 * sy, 0, H);
    fade.addColorStop(0, 'rgba(80,40,5,0)');
    fade.addColorStop(1, 'rgba(50,22,2,0.7)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 420 * sy, W, H - 420 * sy);
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    canvas.height = H = 500;
  }

  window.addEventListener('resize', resize);
  resize();

  const ctx = canvas.getContext('2d');
  function frame() {
    if (document.body.classList.contains('day')) drawScene(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  new MutationObserver(() => {
    canvas.style.opacity = document.body.classList.contains('day') ? '1' : '0';
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

function initTumbleweed() {
  const canvas = document.createElement('canvas');
  canvas.id = 'tumbleweed-canvas';
  canvas.style.cssText = `
    position: fixed; inset: 0;
    pointer-events: none; z-index: 10;
    opacity: 0; transition: opacity 2s ease;
  `;
  document.body.appendChild(canvas);

  let W = 0, H = 0;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Ground y: ruins canvas is 500px at bottom, ground drawn at 308px
  // from top of ruins canvas → 192px from viewport bottom
  const getGY = () => H - 192;

  // ── Weed state ───────────────────────────────────
  let wx = 0, wy = 0, wr = 36, wSpeed = 0, wAngle = 0;
  function launch() {
    wr     = 28 + Math.random() * 22;
    wx     = -wr - 20;
    wy     = getGY() - wr;
    wSpeed = 2.5 + Math.random() * 2;
    wAngle = 0;
  }
  launch();

  // ── Dust particles ────────────────────────────────
  const trail = [];

  function spawnDust(x, y) {
    for (let i = 0; i < 3; i++) {
      trail.push({
        x: x + (Math.random() - 0.5) * wr * 1.2,
        y: y + Math.random() * 8,
        vx: (Math.random() - 0.6) * 0.8,
        vy: -(0.5 + Math.random() * 0.8),
        r: 5 + Math.random() * 12,
        life: 1,
      });
    }
  }

  // ── Ambient wisps ─────────────────────────────────
  const wisps = Array.from({ length: 50 }, () => ({
    x: Math.random() * 4000, y: 0,
    vx: 0.3 + Math.random() * 0.7,
    vy: -(0.06 + Math.random() * 0.16),
    r: 8 + Math.random() * 22,
    life: Math.random(),
    maxLife: 0.25 + Math.random() * 0.3,
  }));

  // ── Draw tumbleweed ───────────────────────────────
  function drawWeed(ctx) {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(wAngle);
    const r = wr;

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(128,90,22,0.85)';
    for (let i = 0; i < 10; i++) {
      const a1 = (i / 10) * Math.PI * 2;
      const a2 = a1 + Math.PI + Math.sin(i * 2.1) * 0.35;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r);
      ctx.bezierCurveTo(
        Math.cos(a1 + 0.55) * r * 0.65, Math.sin(a1 + 0.55) * r * 0.65,
        Math.cos(a2 - 0.55) * r * 0.65, Math.sin(a2 - 0.55) * r * 0.65,
        Math.cos(a2) * r, Math.sin(a2) * r
      );
      ctx.stroke();
    }
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = 'rgba(105,72,16,0.6)';
    for (let i = 0; i < 9; i++) {
      const a1 = (i / 9) * Math.PI * 2 + 0.35;
      const a2 = a1 + Math.PI * 0.75;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a1) * r * 0.72, Math.sin(a1) * r * 0.72);
      ctx.quadraticCurveTo(
        Math.cos(a1 + 0.65) * r * 0.38, Math.sin(a1 + 0.65) * r * 0.38,
        Math.cos(a2) * r * 0.68, Math.sin(a2) * r * 0.68
      );
      ctx.stroke();
    }
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(128,90,22,0.28)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Animation loop ────────────────────────────────
  function frame(now) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const isDay = document.body.classList.contains('day');

    if (isDay) {
      const gy = getGY();

      // Ambient wisps
      wisps.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life += 0.013;
        if (p.life >= p.maxLife || p.x > W + 50) {
          p.x = Math.random() * W * 0.4;
          p.y = gy + 4 + Math.random() * 18;
          p.life = 0;
          p.vx = 0.3 + Math.random() * 0.7;
          p.vy = -(0.06 + Math.random() * 0.16);
          p.r  = 8 + Math.random() * 22;
          p.maxLife = 0.24 + Math.random() * 0.3;
        }
        const t = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,168,85,${Math.sin(t * Math.PI) * 0.17})`;
        ctx.fill();
      });

      // Move weed (one pass only — stops when off right edge)
      if (wx <= W + wr + 20) {
        // Mouse repel
        const mdx = wx - mouseX;
        const mdy = wy - mouseY;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        let repelX = 0, repelY = 0;
        if (mdist < 140 && mdist > 0) {
          const force = (1 - mdist / 140) * 90;
          repelX = (mdx / mdist) * force * 0.1;
          repelY = (mdy / mdist) * force * 0.55;
        }

        const bounce = Math.abs(Math.sin(wx * 0.045)) * 10;
        const baseY = gy - wr - bounce;
        // Repel pushes up; clamp so it never sinks below ground
        wy = Math.min(baseY - Math.max(0, -repelY), gy - wr);
        wx += wSpeed + repelX;
        wAngle += (wSpeed + repelX) / wr;

        if (bounce < 2 && Math.random() < 0.4) spawnDust(wx, gy);

        drawWeed(ctx);
      }

      // Trail dust
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.022;
        if (p.life <= 0.01) { trail.splice(i, 1); continue; }
        const rad = p.r * p.life;
        if (rad <= 0) { trail.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,168,85,${p.life * 0.32})`;
        ctx.fill();
      }
    }

    requestAnimationFrame(frame);
  }

  new MutationObserver(() => {
    const day = document.body.classList.contains('day');
    canvas.style.opacity = day ? '1' : '0';
    if (day) launch();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  requestAnimationFrame(frame);
}

function initPharaoh() {
  const canvas = document.createElement('canvas');
  canvas.id = 'pharaoh-canvas';
  canvas.style.cssText = `
    position: fixed; inset: 0;
    pointer-events: none; z-index: 0;
    opacity: 0.6; transition: opacity 4s ease;
  `;
  document.body.appendChild(canvas);

  let W = 0, H = 0;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  // Eye state machine
  const eyes = [
    { open: 1, state: 'open', t: 0, wincing: false, winceStart: 0 },
    { open: 1, state: 'open', t: 0, wincing: false, winceStart: 0 },
  ];
  let nextBlink    = performance.now() + 8000 + Math.random() * 8000;
  let nextWink     = performance.now() + 12000 + Math.random() * 13000;
  let winkPhase    = 0;   // 0=idle, 1=first eye triggered, 2=waiting for reset
  let winkFirstEye = -1;
  let winkSecondAt = 0;
  let eyeRects     = [];

  function winceEye(idx) {
    const e = eyes[idx];
    e.wincing    = true;
    e.winceStart = performance.now();
    e.state      = 'wince';
  }

  function updateEyes(now) {
    // Regular blink — both eyes together
    if (now >= nextBlink && eyes[0].state === 'open' && eyes[1].state === 'open') {
      eyes.forEach(e => { e.state = 'closing'; e.t = now; });
      nextBlink = now + 8000 + Math.random() * 8000;
    }

    // Wink — one eye then the other, staggered
    if (winkPhase === 0 && now >= nextWink &&
        eyes[0].state === 'open' && eyes[1].state === 'open') {
      winkFirstEye = Math.random() < 0.5 ? 0 : 1;
      eyes[winkFirstEye].state = 'closing';
      eyes[winkFirstEye].t    = now;
      winkSecondAt = now + 500 + Math.random() * 600;
      winkPhase    = 1;
      nextWink     = now + 15000 + Math.random() * 15000;
    }
    if (winkPhase === 1 && now >= winkSecondAt) {
      const second = 1 - winkFirstEye;
      if (eyes[second].state === 'open') { eyes[second].state = 'closing'; eyes[second].t = now; }
      winkPhase = 2;
    }
    if (winkPhase === 2 && eyes[0].state === 'open' && eyes[1].state === 'open') {
      winkPhase = 0;
    }

    eyes.forEach(e => {
      if (e.state === 'wince') {
        const el = now - e.winceStart;
        if      (el < 200)  e.open = Math.max(0, 1 - el / 200);
        else if (el < 1100) e.open = 0;
        else if (el < 1800) e.open = (el - 1100) / 700;
        else { e.open = 1; e.state = 'open'; e.wincing = false; }
      } else if (e.state === 'closing') {
        e.open = Math.max(0, 1 - (now - e.t) / 450);
        if (now - e.t >= 450) { e.open = 0; e.state = 'closed'; e.t = now; }
      } else if (e.state === 'closed') {
        if (now - e.t >= 220) { e.state = 'opening'; e.t = now; }
      } else if (e.state === 'opening') {
        e.open = Math.min(1, (now - e.t) / 650);
        if (now - e.t >= 650) { e.open = 1; e.state = 'open'; }
      }
    });
  }

  function frame(now) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    if (!document.body.classList.contains('day')) {
      updateEyes(now);

      const cx = W * 0.82, cy = H * 0.38;
      const sc = Math.min(W, H) * 0.21;
      const C = {
        nemes: '#0e2040', nemesD: '#091528',
        face:  '#102238', faceD:  '#0a1828',
        brow:  '#152c50', beard:  '#091520',
        outline: '#2255a0', stripe: '#1a3a70', crack: '#1a3060',
      };
      const nW = sc * 1.55, fW = sc * 0.72;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.lineJoin = 'miter';

      // Nemes top band
      ctx.fillStyle = C.nemes; ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-nW,-sc*.88); ctx.lineTo(nW,-sc*.88); ctx.lineTo(nW,-sc*.58); ctx.lineTo(-nW,-sc*.58);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Left lappet
      ctx.fillStyle = C.nemes; ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-fW*.62,-sc*.58); ctx.lineTo(-nW,-sc*.58); ctx.lineTo(-nW*.82,sc*.62); ctx.lineTo(-fW*.52,sc*.88);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.nemesD;
      ctx.beginPath();
      ctx.moveTo(-fW*.62,-sc*.58); ctx.lineTo(-fW*.52,sc*.88); ctx.lineTo(-nW*.82,sc*.62);
      ctx.closePath(); ctx.fill();

      // Right lappet
      ctx.fillStyle = C.nemes; ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fW*.62,-sc*.58); ctx.lineTo(nW,-sc*.58); ctx.lineTo(nW*.82,sc*.62); ctx.lineTo(fW*.52,sc*.88);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.nemesD;
      ctx.beginPath();
      ctx.moveTo(fW*.62,-sc*.58); ctx.lineTo(fW*.52,sc*.88); ctx.lineTo(nW*.82,sc*.62);
      ctx.closePath(); ctx.fill();

      // Nemes stripes
      ctx.strokeStyle = C.stripe; ctx.lineWidth = 1.5;
      for (let s = 0; s < 6; s++) {
        const sy = -sc*.52 + s*sc*.22;
        ctx.beginPath(); ctx.moveTo(-nW+2,sy); ctx.lineTo(-fW*.58,sy+sc*.06); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( nW-2,sy); ctx.lineTo( fW*.58,sy+sc*.06); ctx.stroke();
      }

      // Face lit half
      ctx.fillStyle = C.face; ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-fW*.6,-sc*.58); ctx.lineTo(0,-sc*.58); ctx.lineTo(0,sc*.72);
      ctx.lineTo(-fW*.44,sc*.82); ctx.lineTo(-fW*.62,sc*.12);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Face shadow half
      ctx.fillStyle = C.faceD;
      ctx.beginPath();
      ctx.moveTo(0,-sc*.58); ctx.lineTo(fW*.6,-sc*.58); ctx.lineTo(fW*.62,sc*.12);
      ctx.lineTo(fW*.44,sc*.82); ctx.lineTo(0,sc*.72);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Brow band
      ctx.fillStyle = C.brow; ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-fW*.6,-sc*.58); ctx.lineTo(fW*.6,-sc*.58); ctx.lineTo(fW*.58,-sc*.44); ctx.lineTo(-fW*.58,-sc*.44);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Square eyes with animated blink
      const eyeY = -sc * 0.2;
      const eyeW = sc * 0.36;
      const eyeH = sc * 0.2;
      const skW  = eyeW * 1.4;
      const skH  = eyeH * 1.75;

      eyeRects = [];
      [[-sc*.3, 0], [sc*.3, 1]].forEach(([ex, idx]) => {
        const eye  = eyes[idx];
        const side = idx === 0 ? -1 : 1;

        // Dark socket square
        ctx.fillStyle = '#040a14'; ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5;
        ctx.fillRect(ex - skW/2, eyeY - skH/2, skW, skH);
        ctx.strokeRect(ex - skW/2, eyeY - skH/2, skW, skH);

        // Store viewport coords for click detection
        eyeRects.push({ x: cx+ex-skW/2, y: cy+eyeY-skH/2, w: skW, h: skH, idx });

        // Glow bloom
        const glow = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, sc*.26);
        glow.addColorStop(0, `rgba(255,255,255,${0.22 * eye.open})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(ex, eyeY, sc*.26, 0, Math.PI*2); ctx.fill();

        // White square — eyelid descends from top
        const openH = eyeH * eye.open;
        if (openH > 0.5) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ex - eyeW/2, eyeY + eyeH/2 - openH, eyeW, openH);
        }

        // Hieroglyph — only visible during wince, fades in as eye closes
        if (eye.state === 'wince') {
          ctx.save();
          ctx.globalAlpha = (1 - eye.open) * 0.92;
          ctx.fillStyle = C.outline;
          ctx.font = `${Math.round(eyeH * 1.0)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const glyphY = idx === 1 ? eyeY - eyeH * 0.2 : eyeY;
          ctx.fillText(idx === 0 ? '𓂀' : '𓁹', ex, glyphY);
          ctx.restore();
        }

        // Wince stress lines
        if (eye.state === 'wince' && eye.open < 0.25) {
          ctx.strokeStyle = 'rgba(180,210,255,0.45)'; ctx.lineWidth = 1;
          for (let l = 0; l < 3; l++) {
            const ly = eyeY - skH*.28 + l*skH*.2;
            ctx.beginPath(); ctx.moveTo(ex-skW*.55, ly); ctx.lineTo(ex+skW*.55, ly); ctx.stroke();
          }
        }

        // Kohl tail
        ctx.strokeStyle = C.stripe; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex + side*skW/2, eyeY + skH*.05);
        ctx.lineTo(ex + side*sc*.55, eyeY + sc*.07);
        ctx.stroke();
      });

      // Nose
      ctx.fillStyle = C.faceD; ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-sc*.07,sc*.0); ctx.lineTo(-sc*.14,sc*.3); ctx.lineTo(-sc*.2,sc*.36);
      ctx.lineTo(sc*.2,sc*.36); ctx.lineTo(sc*.14,sc*.3); ctx.lineTo(sc*.07,sc*.0);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Mouth
      ctx.strokeStyle = C.outline; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-sc*.24,sc*.5); ctx.lineTo(sc*.24,sc*.5); ctx.stroke();

      // False beard
      ctx.fillStyle = C.beard; ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-sc*.15,sc*.72); ctx.lineTo(sc*.15,sc*.72); ctx.lineTo(sc*.11,sc*1.15); ctx.lineTo(-sc*.11,sc*1.15);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.stripe; ctx.lineWidth = 1.5;
      for (let b = 1; b <= 4; b++) {
        const by = sc*.72+b*sc*.1, sh = b*.008;
        ctx.beginPath(); ctx.moveTo(-sc*(.15-sh),by); ctx.lineTo(sc*(.15-sh),by); ctx.stroke();
      }

      // Uraeus cobra
      ctx.strokeStyle = C.stripe; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0,-sc*.44);
      ctx.bezierCurveTo(sc*.06,-sc*.62, sc*.1,-sc*.8, 0,-sc*.86);
      ctx.bezierCurveTo(-sc*.08,-sc*.92, -sc*.05,-sc*.8, 0,-sc*.74);
      ctx.stroke();
      ctx.fillStyle = C.brow; ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(sc*.04,-sc*.86,sc*.07,sc*.04,0.6,0,Math.PI*2); ctx.fill(); ctx.stroke();

      // Crack
      ctx.strokeStyle = C.crack; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sc*.05,-sc*.42); ctx.lineTo(0,sc*.05); ctx.lineTo(sc*.08,sc*.45); ctx.stroke();

      // Fade to darkness
      const fade = ctx.createLinearGradient(0,sc*.55,0,sc*1.2);
      fade.addColorStop(0,'rgba(5,10,20,0)'); fade.addColorStop(1,'rgba(5,10,20,1)');
      ctx.fillStyle = fade;
      ctx.fillRect(-nW-4, sc*.55, (nW+4)*2, sc*.7);

      ctx.restore();
    }

    requestAnimationFrame(frame);
  }

  // Click detection via document listener (canvas keeps pointer-events:none)
  document.addEventListener('click', e => {
    if (document.body.classList.contains('day')) return;
    eyeRects.forEach(r => {
      if (e.clientX >= r.x && e.clientX <= r.x + r.w &&
          e.clientY >= r.y && e.clientY <= r.y + r.h) {
        winceEye(r.idx);
      }
    });
  });

  new MutationObserver(() => {
    canvas.style.opacity = document.body.classList.contains('day') ? '0' : '0.6';
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  requestAnimationFrame(frame);
}

generateStars();
initDust();
initPharaoh();
initRuins();
initTumbleweed();
buildPoem();
window.addEventListener('resize', handleResize);
