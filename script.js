/* Ember Spice Co. · scroll-driven jar rotation + reveals */
(function () {
  const FRAME_COUNT = 53;
  const framePath = (i) => `assets/jar/jar_${String(i).padStart(3, '0')}.webp`;

  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('jarCanvas');
  const titles = Array.from(document.querySelectorAll('.hero__title'));
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;

  if (!ctx) {
    document.documentElement.classList.add('no-canvas');
  }

  /* ---- preload frames ---- */
  const frames = [];
  let loaded = 0;
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    img.src = framePath(i);
    img.onload = () => { loaded++; if (i === 0) draw(0); };
    frames.push(img);
  }

  let currentFrame = -1;
  function draw(index) {
    if (!ctx) return;
    const img = frames[index];
    if (!img || !img.complete || !img.naturalWidth) return;
    if (index === currentFrame) return;
    currentFrame = index;
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }

  /* ---- scroll progress ---- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  function update() {
    ticking = false;
    const rect = hero.getBoundingClientRect();
    const runway = hero.offsetHeight - window.innerHeight;
    const progress = Math.min(1, Math.max(0, -rect.top / runway));

    // jar frame (ease slightly so the tumble feels weighted)
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const frame = Math.round(eased * (FRAME_COUNT - 1));
    draw(frame);

    // subtle drift: jar sinks and grows a touch as you scroll
    const drift = Math.sin(progress * Math.PI) ;
    canvas.style.transform = `translateY(${drift * 3}vh) scale(${1 + drift * 0.06})`;

    // headline steps
    const step = progress < 0.33 ? 0 : progress < 0.66 ? 1 : 2;
    titles.forEach((t, i) => t.classList.toggle('is-active', i === step));
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

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
