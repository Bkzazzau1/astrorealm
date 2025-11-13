/* AstroGate • stars.js (ultra-light)
   - Adaptive density (area + deviceMemory)
   - FPS cap (24) + desynchronized canvas
   - Pauses on hidden tab
   - Respects prefers-reduced-motion
   - Optional user toggle: localStorage('astro_anim') === 'off' to disable
*/
(() => {
  // ----------- FLAGS / PREFS -----------
  const userOff = localStorage.getItem('astro_anim') === 'off';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (userOff || reduceMotion) {
    // Draw a small static sprinkle and stop.
    window.addEventListener('DOMContentLoaded', () => {
      const c = document.getElementById('starfield');
      if (!c) return;
      const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
      const ctx = c.getContext('2d', { alpha: true });
      const w = (c.width = Math.floor(innerWidth * DPR));
      const h = (c.height = Math.floor(innerHeight * DPR));
      c.style.width = innerWidth + 'px';
      c.style.height = innerHeight + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const count = Math.min(500, Math.max(220, Math.floor((innerWidth * innerHeight) / 3500)));
      for (let i = 0; i < count; i++) {
        ctx.globalAlpha = 0.35 + Math.random() * 0.4;
        ctx.fillStyle = '#fff';
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;
    });
    return;
  }

  // ----------- STATE -----------
  let canvas,
    ctx,
    W,
    H,
    DPR,
    running = true,
    rafId = 0;
  let stars = [];
  let lastTs = 0;
  const FPS = 24; // hard cap
  const FRAME_MS = 1000 / FPS;
  const mem = navigator.deviceMemory || 4; // 1/2/4/8+(GB)
  const area = Math.max(1, innerWidth * innerHeight);
  // Base density scaled by area; then tapered by memory tier
  const baseCount = Math.floor(area / 600); // ~ screen-area dependent
  const memScale = mem <= 2 ? 0.35 : mem <= 4 ? 0.6 : mem <= 8 ? 0.85 : 1;
  const MAX_STARS = Math.min(900, Math.max(120, Math.floor(baseCount * memScale)));

  // ----------- UTIL -----------
  const throttle = (fn, ms = 200) => {
    let t = 0;
    return () => {
      const n = Date.now();
      if (n - t > ms) {
        t = n;
        fn();
      }
    };
  };
  const rand = (a, b) => Math.random() * (b - a) + a;

  // ----------- SPRITE (pre-render for cheap draw) -----------
  function makeStarSprite(size = 16) {
    const spr = document.createElement('canvas');
    spr.width = spr.height = size;
    const sctx = spr.getContext('2d');
    const g = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = g;
    sctx.beginPath();
    sctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    sctx.fill();
    return spr;
  }
  const STAR_SPRITE = makeStarSprite(20);

  // ----------- INIT / RESIZE -----------
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.75); // cap DPR a bit
    W = Math.floor(innerWidth * DPR);
    H = Math.floor(innerHeight * DPR);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    // Use device pixels directly; we’ll scale size when drawing
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function resetStars() {
    stars = [];
    // slower speeds, mild drift; parallax via z
    for (let i = 0; i < MAX_STARS; i++) {
      const z = rand(0.3, 1.1);
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z,
        r: rand(0.6, 1.9) * DPR, // radius scale
        s: rand(0.02, 0.08), // speed (very slow to keep smooth)
        t: rand(0, Math.PI * 2), // twinkle phase
      });
    }
  }

  // ----------- DRAW -----------
  function draw(ts) {
    rafId = requestAnimationFrame(draw);
    if (!lastTs) lastTs = ts;
    const delta = ts - lastTs;
    if (delta < FRAME_MS) return; // FPS cap
    lastTs = ts;

    ctx.clearRect(0, 0, W, H);

    // mild additive glow for gold hint, but lower than "lighter" to avoid overdraw cost
    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < stars.length; i++) {
      const st = stars[i];

      // Drift with light parallax (dt scaled by fps cap so ~constant)
      st.x += st.s * st.z * 0.9 * (delta / FRAME_MS);
      st.y += st.s * st.z * 0.5 * (delta / FRAME_MS);

      // Wrap
      if (st.x >= W) st.x -= W;
      if (st.y >= H) st.y -= H;

      // Twinkle
      st.t += 0.02 * (delta / FRAME_MS);
      const tw = 0.6 + Math.sin(st.t) * 0.4; // 0.2..1.0
      const size = st.r * (0.8 + st.z * 0.6) * tw; // scale by depth + twinkle

      // Alpha scales with depth a bit
      ctx.globalAlpha = 0.35 + st.z * 0.35;

      // Cheap sprite blit instead of arc each star
      const half = size; // sprite drawn from center by translate
      // Draw sprite centered at (x,y) with size*2
      ctx.drawImage(STAR_SPRITE, st.x - half, st.y - half, size * 2, size * 2);
    }

    ctx.globalAlpha = 1;
  }

  // ----------- LIFECYCLE -----------
  function start() {
    canvas = document.getElementById('starfield');
    if (!canvas) return;
    ctx = canvas.getContext('2d', { alpha: true, desynchronized: true, willReadFrequently: false });
    resize();
    resetStars();
    running = true;
    lastTs = 0;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(draw);
  }

  const onResize = throttle(() => {
    if (!canvas) return;
    cancelAnimationFrame(rafId);
    resize();
    resetStars();
    lastTs = 0;
    rafId = requestAnimationFrame(draw);
  }, 200);

  document.addEventListener('visibilitychange', () => {
    const visible = document.visibilityState === 'visible';
    if (!visible) {
      running = false;
      cancelAnimationFrame(rafId);
      lastTs = 0;
    } else {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(draw);
      }
    }
  });

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('DOMContentLoaded', start);

  // ----------- PUBLIC TOGGLE (optional) -----------
  // Add a simple toggle button elsewhere that flips astro_anim on/off and reloads.
  window.AstroAnim = {
    off() {
      localStorage.setItem('astro_anim', 'off');
      location.reload();
    },
    on() {
      localStorage.setItem('astro_anim', 'on');
      location.reload();
    },
    status() {
      return localStorage.getItem('astro_anim') === 'off' ? 'off' : 'on';
    },
  };
})();
