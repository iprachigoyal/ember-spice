/* Ember Spice Co. · scroll-driven jar rotation + reveals
   ---------------------------------------------------------
   HOW THE HERO WORKS
   - The hero section is tall (600vh). Its inner box is position: sticky,
     so the screen "holds" while you scroll through the runway.
   - Scroll position -> progress 0..1 -> a frame of the jar image sequence.
   - Progress is lerped every animation frame, so fast scrolls stay smooth
     and the jar never jumps.
   - Headlines are split into words; each word slides up from below when its
     step becomes active, and up-and-out when the step is past.
*/
(function () {
  /* ---- config ---- */
  const FRAME_COUNT = 106;          // files in assets/jar/
  const SEQUENCE = 'pingpong';      // 'loop' for a seamless 360 clip, 'pingpong' for a clip that doesn't loop
  const TURNS = 2;                  // how many times the sequence plays across the hero runway
  const SMOOTHING = 0.085;          // lerp factor (lower = floatier, higher = snappier)
  const framePath = (i) => `assets/jar/jar_${String(i).padStart(3, '0')}.webp`;

  // per-step jar placement: x/y in vw/vh offsets, s = scale, r = extra tilt in deg
  const JAR_POSE = [
    { x: 12,  y: 2,  s: 1.00, r: 0 },
    { x: 0,   y: 4,  s: 1.06, r: 0 },
    { x: -14, y: 0,  s: 0.98, r: 0 },
  ];
  const MOBILE_POSE = [
    { x: 0, y: 0, s: 1, r: 0 },
    { x: 0, y: 0, s: 1, r: 0 },
    { x: 0, y: 0, s: 1, r: 0 },
  ];

  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('jarCanvas');
  const jarWrap = document.getElementById('jarWrap');
  const steps = Array.from(document.querySelectorAll('.hero__step'));
  const dots = Array.from(document.querySelectorAll('.hero__dots span'));
  const scrollHint = document.querySelector('.hero__scroll');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!ctx) document.documentElement.classList.add('no-canvas');

  /* ---- split headline words for the rise animation ---- */
  document.querySelectorAll('.hero__title').forEach((title) => {
    const html = title.innerHTML.trim().split(/<br\s*\/?>/i);
    let i = 0;
    title.innerHTML = html.map((line) =>
      line.trim().split(/\s+/).map((word) =>
        `<span class="w"><span style="--i:${i++}">${word}</span></span>`
      ).join(' ')
    ).join('<br>');
  });

  /* ---- preload frames ---- */
  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    img.src = framePath(i);
    if (i === 0) img.onload = () => draw(0);
    frames.push(img);
  }

  let drawn = -1;
  function draw(index) {
    if (!ctx) return;
    const img = frames[index];
    if (!img || !img.complete || !img.naturalWidth || index === drawn) return;
    drawn = index;
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }

  /* ---- map progress -> frame ---- */
  function frameFor(p) {
    const t = (p * TURNS) % 1;                    // position inside the current turn
    if (SEQUENCE === 'loop') return Math.floor(t * FRAME_COUNT) % FRAME_COUNT;
    // pingpong: 0..N-1..0
    const span = FRAME_COUNT - 1;
    const k = t * 2 * span;
    return Math.round(k <= span ? k : 2 * span - k);
  }

  /* ---- scroll -> target, lerp -> current ---- */
  let target = 0, current = 0, lastStep = -1, running = false;

  function readScroll() {
    const runway = hero.offsetHeight - window.innerHeight;
    target = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / runway));
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    current = reduceMotion ? target : lerp(current, target, SMOOTHING);
    if (Math.abs(target - current) < 0.0004) current = target;

    draw(frameFor(current));

    // headline step: 3 steps across the runway, last 8% of runway is "settle"
    const step = Math.min(2, Math.floor(current * 3.2));
    if (step !== lastStep) {
      steps.forEach((el, i) => {
        el.classList.toggle('is-active', i === step);
        el.classList.toggle('is-past', i < step);
      });
      dots.forEach((d, i) => d.classList.toggle('on', i === step));
      if (scrollHint) scrollHint.classList.toggle('hide', step > 0);
      lastStep = step;
    }

    // jar drift: blend between poses so the jar glides, not jumps
    const poses = window.innerWidth < 640 ? MOBILE_POSE : JAR_POSE;
    const f = Math.min(2, current * 3.2);           // fractional step
    const a = poses[Math.floor(f)], b = poses[Math.min(2, Math.ceil(f))];
    const u = f - Math.floor(f);
    const e = u * u * (3 - 2 * u);                  // smoothstep
    const x = lerp(a.x, b.x, e), y = lerp(a.y, b.y, e), s = lerp(a.s, b.s, e);
    jarWrap.style.transform = `translate(${x}vw, ${y}vh) scale(${s})`;

    if (current !== target) requestAnimationFrame(tick); else running = false;
  }

  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', readScroll);
  readScroll();
  // make sure step 0 text animates in on load
  requestAnimationFrame(() => { lastStep = -1; running = false; readScroll(); });

  /* ---- reveal on scroll ---- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* ---- mobile nav ---- */
  const burger = document.getElementById('burger');
  const links = document.querySelector('.nav__links');
  if (burger && links) {
    burger.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => links.classList.remove('open')));
  }
})();
