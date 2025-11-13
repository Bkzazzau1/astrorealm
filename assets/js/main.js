// AstroGate minimal helpers (optional)
(() => {
  // Smooth scroll for in-page anchors
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Compliance reminder on any .unlock-btn (non-blocking)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.unlock-btn');
    if (!btn) return;
    // Non-intrusive hint in console (keeps UX clean)
    console.log('Note: Complete one task to unlock your reading.');
  });
})();
