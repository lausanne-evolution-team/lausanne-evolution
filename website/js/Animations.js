/* ============================================================
   animations.js
   - Scroll progress bar
   - Intersection Observer → .visible on .chart-card
   - Hero stat counter animation
   - D3 line draw helper (used by lens files)
   ============================================================ */

/* ── Scroll progress bar ────────────────────────────────────── */
const progressBar = document.createElement('div');
progressBar.id = 'progress-bar';
document.body.prepend(progressBar);

window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const total = document.body.scrollHeight - window.innerHeight;
  progressBar.style.width = Math.min(100, (scrolled / total) * 100) + '%';
}, { passive: true });

/* ── Intersection Observer: reveal chart cards ───────────────── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px',
});

/* Observe all existing cards, and any added later */
function observeCards() {
  document.querySelectorAll('.chart-card').forEach(card => {
    revealObserver.observe(card);
  });
}
/* Run after DOM + charts are rendered */
window.addEventListener('load', () => {
  setTimeout(observeCards, 100);
});

/* ── Hero counter animation ─────────────────────────────────── */
function animateCounter(el, target, suffix, duration = 1400) {
  const start = performance.now();
  const isFloat = target % 1 !== 0;

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    /* ease out cubic */
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    el.textContent = (isFloat ? value.toFixed(2) : Math.round(value)) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* Called from main.js after hero stats are inserted */
window.startHeroCounters = function() {
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    animateCounter(el, target, suffix, 1600);
  });
};

/* ── D3 LINE DRAW ANIMATION ─────────────────────────────────── */
/* Usage: after appending a path, call Anim.drawLine(pathNode, duration) */
window.Anim = {
  drawLine(pathNode, duration = 1400, delay = 0) {
    const length = pathNode.getTotalLength();
    d3.select(pathNode)
      .attr('stroke-dasharray', length)
      .attr('stroke-dashoffset', length)
      .transition()
        .delay(delay)
        .duration(duration)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);
  },

  growBars(selection, yScale, h, duration = 900, delay = 60) {
    selection
      .attr('y', h)
      .attr('height', 0)
      .transition()
        .duration(duration)
        .delay((d, i) => i * delay)
        .ease(d3.easeCubicOut)
        .attr('y', d => yScale(d.value !== undefined ? d.value : d))
        .attr('height', d => h - yScale(d.value !== undefined ? d.value : d));
  },

  fadeIn(selection, duration = 800, delay = 0) {
    selection
      .attr('opacity', 0)
      .transition()
        .delay(delay)
        .duration(duration)
        .ease(d3.easeQuadOut)
        .attr('opacity', 1);
  },
};