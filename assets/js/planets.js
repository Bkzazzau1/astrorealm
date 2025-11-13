(() => {
  function place(el, dur, x1, y1, x2, y2) {
    el.style.setProperty('--xStart', x1 + 'vw');
    el.style.setProperty('--yStart', y1 + 'vh');
    el.style.setProperty('--xEnd', x2 + 'vw');
    el.style.setProperty('--yEnd', y2 + 'vh');
    el.style.animationDuration = dur + 's';
  }

  window.addEventListener('DOMContentLoaded', () => {
    const wrap = document.querySelector('.planets');
    if (!wrap) return;

    const p1 = document.createElement('div');
    p1.className = 'planet';
    const p2 = document.createElement('div');
    p2.className = 'planet gold';
    const p3 = document.createElement('div');
    p3.className = 'planet';

    place(p1, 120, -10, 70, 110, 10);
    place(p2, 160, 20, 110, 80, -10);
    place(p3, 220, -15, 20, 115, 85);

    wrap.appendChild(p1);
    wrap.appendChild(p2);
    wrap.appendChild(p3);
  });
})();
