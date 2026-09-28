/* Ember Spice Co. · scroll-driven jar hero + reveals
   ---------------------------------------------------------
   HOW THE HERO WORKS
   - .hero is 600vh tall. The background and the jar are position: sticky,
     so they stay on screen while the headlines scroll past like normal
     page content (that's the "page going down" feel).
   - Three headline stations sit at 0, 200vh and 400vh in the runway.
   - Scroll -> smoothed scroll value -> a frame of the jar image sequence.
   - The jar stays centered and only tumbles; LIFT_Y / LIFT_S / STATION_X
     are available if you ever want it to move between stations.
*/
(function () {
  /* ---- config ---- */
  const FRAME_COUNT = 168;          // files in assets/jar/
  const SEQUENCE = 'loop';          // 'loop' = seamless 360 clip, 'pingpong' = clip that doesn't loop
  const FRAMES_PER_100VH = 33.6;    // 168 frames over the 500vh runway = exactly one full turn
  const SMOOTHING = 0.08;           // lerp factor (lower = floatier)
  const STATION_GAP = 200;          // vh between headline stations
  const RUNWAY = 500;               // vh of scroll inside the hero (600vh - 100vh)
  const FRAMES_VERSION = 3;         // bump when frames are regenerated (busts browser cache)
  const framePath = (i) => `assets/jar/jar_${String(i).padStart(3, '0')}.webp?v=${FRAMES_VERSION}`;

  // horizontal placement per station (vw). Headline 0 is left, so jar goes right, etc.
  const STATION_X = [0, 0, 0];      // jar stays centered (set e.g. [12, 0, -14] to drift)
  const LIFT_Y = 0;                 // vh the jar lifts between stations (0 = stays put)
  const LIFT_S = 1;                 // scale at the top of the lift (1 = no scaling)

  const hero = document.querySelector('.hero');
  const bg = document.querySelector('.hero__bg');
  const canvas = document.getElementById('jarCanvas');
  const jarWrap = document.getElementById('jarWrap');
  const steps = Array.from(document.querySelectorAll('.hero__step'));
  const dots = Array.from(document.querySelectorAll('.hero__dots span'));
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth < 640;

  if (!ctx) document.documentElement.classList.add('no-canvas');

  /* ---- split headline words for the rise animation ---- */
  document.querySelectorAll('.hero__title').forEach((title) => {
    let i = 0;
    title.innerHTML = title.innerHTML.trim().split(/<br\s*\/?>/i).map((line) =>
      line.trim().split(/\s+/).map((word) => `<span class="w"><span style="--i:${i++}">${word}</span></span>`).join(' ')
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
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }

  /* ---- scroll (in vh) -> frame ---- */
  function frameFor(vh) {
    const k = vh / 100 * FRAMES_PER_100VH;
    if (SEQUENCE === 'loop') return Math.floor(k) % FRAME_COUNT;
    const span = FRAME_COUNT - 1;                 // pingpong 0..N-1..0
    const m = k % (2 * span);
    return Math.round(m <= span ? m : 2 * span - m);
  }

  /* ---- easing helpers ---- */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const easeIn = (t) => t * t * t;
  const easeOutBack = (t) => 1 - Math.pow(1 - t, 3);
  const smooth = (t) => t * t * (3 - 2 * t);

  /* jar pose for a scroll position (vh):
     hold at center around each station, lift away then drop back in between */
  function pose(vh) {
    const v = Math.min(vh, (STATION_X.length - 1) * STATION_GAP);   // after the last station: hold
    const station = Math.floor(v / STATION_GAP);
    const d = v - station * STATION_GAP;                             // 0..200 within the gap
    let y = 0, s = 1, mix = 0;                                       // mix: 0 = this station, 1 = next
    if (d > 60 && d <= 100) {                                        // lift away
      const t = easeIn((d - 60) / 40);
      y = LIFT_Y * t; s = lerp(1, LIFT_S, t); mix = smooth(t * 0.5);
    } else if (d > 100 && d < 140) {                                 // drop back in
      const t = clamp01((d - 100) / 40);
      y = LIFT_Y * (1 - easeOutBack(t)); s = lerp(LIFT_S, 1, smooth(t)); mix = smooth(0.5 + t * 0.5);
    } else if (d >= 140) { mix = 1; }
    const xs = isMobile() ? [0, 0, 0] : STATION_X;
    const x = lerp(xs[station], xs[Math.min(station + 1, xs.length - 1)], mix);
    return { x, y, s, station: Math.round(v / STATION_GAP) };
  }

  /* ---- scroll -> target, lerp -> current ---- */
  let target = 0, current = 0, running = false, lastStation = -1;

  function readScroll() {
    const top = -hero.getBoundingClientRect().top;
    target = Math.min(RUNWAY, Math.max(0, top / window.innerHeight * 100));
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function tick() {
    current = reduceMotion ? target : lerp(current, target, SMOOTHING);
    if (Math.abs(target - current) < 0.02) current = target;

    draw(frameFor(current));

    const p = pose(current);
    jarWrap.style.transform = `translate(${p.x}vw, ${p.y}vh) scale(${p.s})`;
    if (bg) bg.style.transform = `translateY(${current * 0.04}vh)`;   // slow parallax

    if (p.station !== lastStation) {
      dots.forEach((el, i) => el.classList.toggle('on', i === p.station));
      lastStation = p.station;
    }
    if (current !== target) requestAnimationFrame(tick); else running = false;
  }

  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', readScroll);
  readScroll();

  /* ---- headline stations: words rise when the station enters the viewport ---- */
  const stepIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.3 });
  steps.forEach((el) => stepIO.observe(el));

  /* ---- reveal on scroll ---- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
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
