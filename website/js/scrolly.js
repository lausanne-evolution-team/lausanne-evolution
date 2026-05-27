/* ============================================================
   scrolly.js — Scrollytelling for the gap chart
   ============================================================ */

const Scrolly = (() => {

  const STEPS = [
    {
      heading: 'A city of singles',
      body: 'By 2012, nearly half of all Lausanne households already consist of a single person — a structural shift driven by younger residents, international mobility, and changing lifestyles.',
      highlight: 2012,
      note: null,
    },
    {
      heading: 'Supply barely responds',
      body: 'Between 2012 and 2018, the share of small apartments (1–2 rooms) grows only marginally — from 42% to 43%. The housing stock is adding units, but not the right kind.',
      highlight: null,
      range: [2012, 2018],
      note: 'Supply nearly flat',
    },
    {
      heading: '2020: the gap widens',
      body: 'From 2020, demand accelerates sharply as single-person households surge past 48%. The gap between what people need and what the market offers visibly widens.',
      highlight: 2020,
      note: 'gap starts widening →',
    },
    {
      heading: 'A 6-point persistent shortage',
      body: 'By 2024, 49% of households are one-person — but only 43% of apartments are small enough to serve them. The 6-point gap has persisted for over a decade with no sign of closing.',
      highlight: 2024,
      note: '+6pp gap',
    },
    {
      heading: 'The structural mismatch',
      body: "Lausanne's housing stock grew 12% since 2010 but its shape barely changed. It was built for families — not for the city it has become.",
      highlight: null,
      range: [2012, 2024],
      note: null,
      showFull: true,
    },
  ];

  let svg, g, x, y, gapData, W, H, m;
  let currentStep = -1;

  function drawStickyGap(data) {
    gapData = data;
    const el = document.getElementById('scrolly-chart');
    if (!el) return;  

    el.innerHTML = '';
    W = el.getBoundingClientRect().width || 520;
    if (W < 10) W = 520;  
    H = 380;
    m = { t: 40, r: 120, b: 44, l: 52 };
    const w = W - m.l - m.r;
    const h = H - m.t - m.b;

    svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    g   = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);

    const all = data.flatMap(d => [d.pct_1person, d.pct_small_dw]);
    x = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([0, w]);
    y = d3.scaleLinear().domain([d3.min(all) * 0.95, d3.max(all) * 1.03]).range([h, 0]);

    g.append('g').attr('class', 'grid')
     .call(d3.axisLeft(y).tickSize(-w).tickFormat('').ticks(5))
     .call(g => g.select('.domain').remove());

    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${h})`)
     .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format('d')));
    g.append('g').attr('class', 'axis')
     .call(d3.axisLeft(y).ticks(5).tickFormat(d => Math.round(d * 100) + '%'));

    g.append('path').attr('class', 'gap-fill').datum(data)
      .attr('fill', '#b91c1c').attr('opacity', 0.08)
      .attr('d', d3.area()
        .x(d => x(d.year))
        .y0(d => y(d.pct_small_dw))
        .y1(d => y(d.pct_1person))
        .curve(d3.curveCatmullRom));

    g.append('rect').attr('class', 'range-highlight')
      .attr('y', 0).attr('height', h)
      .attr('fill', '#b91c1c').attr('opacity', 0).attr('rx', 3);

    const supplyLine = d3.line().x(d => x(d.year)).y(d => y(d.pct_small_dw)).curve(d3.curveCatmullRom);
    const demandLine = d3.line().x(d => x(d.year)).y(d => y(d.pct_1person)).curve(d3.curveCatmullRom);

    const supplyPath = g.append('path').datum(data)
      .attr('fill', 'none').attr('stroke', '#b91c1c')
      .attr('stroke-width', 2).attr('stroke-dasharray', '6,3')
      .attr('opacity', 0.6).attr('d', supplyLine);

    const demandPath = g.append('path').datum(data)
      .attr('fill', 'none').attr('stroke', '#b91c1c')
      .attr('stroke-width', 3).attr('d', demandLine);

    [supplyPath, demandPath].forEach(p => {
      const len = p.node().getTotalLength();
      p.attr('stroke-dasharray', len + ' ' + len)
       .attr('stroke-dashoffset', len)
       .transition().duration(1400).ease(d3.easeQuadOut)
       .attr('stroke-dashoffset', 0);
    });
    setTimeout(() => supplyPath.attr('stroke-dasharray', '6,3'), 1500);

    g.append('g').attr('class', 'demand-dots')
     .selectAll('circle').data(data).join('circle')
     .attr('cx', d => x(d.year)).attr('cy', d => y(d.pct_1person))
     .attr('r', 3.5).attr('fill', 'white')
     .attr('stroke', '#b91c1c').attr('stroke-width', 2);

    g.append('circle').attr('class', 'highlight-circle')
      .attr('r', 0).attr('fill', 'none')
      .attr('stroke', '#c2410c').attr('stroke-width', 2.5);

    g.append('g').attr('class', 'annotation-group');

    const last = data[data.length - 1];
    g.append('text').attr('x', x(last.year) + 8).attr('y', y(last.pct_1person) + 4)
     .attr('font-size', 10).attr('fill', '#b91c1c').attr('font-weight', '600')
     .text(`1-person HH: ${Math.round(last.pct_1person * 100)}%`);
    g.append('text').attr('x', x(last.year) + 8).attr('y', y(last.pct_small_dw) + 4)
     .attr('font-size', 10).attr('fill', '#b91c1c').attr('opacity', 0.75)
     .text(`1–2 room apts: ${Math.round(last.pct_small_dw * 100)}%`);

    const leg = svg.append('g').attr('transform', `translate(${m.l + 6},${m.t - 26})`);
    [['1-person household share (demand)', false], ['1–2 room dwelling share (supply)', true]]
      .forEach(([lbl, dash], i) => {
        const gx = leg.append('g').attr('transform', `translate(${i * 220},0)`);
        gx.append('line').attr('x1', 0).attr('y1', 5).attr('x2', 20).attr('y2', 5)
          .attr('stroke', '#b91c1c').attr('stroke-width', dash ? 2 : 2.8)
          .attr('stroke-dasharray', dash ? '5,2' : 'none').attr('opacity', dash ? 0.7 : 1);
        gx.append('text').attr('x', 24).attr('y', 9).attr('font-size', 10)
          .attr('fill', '#374151').text(lbl);
      });

    const bisect = d3.bisector(d => d.year).left;
    const vl = g.append('line').attr('y1', 0).attr('y2', h)
      .attr('stroke', '#d1d5db').attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,2').attr('opacity', 0);

    svg.append('rect').attr('fill', 'none').attr('pointer-events', 'all')
      .attr('x', m.l).attr('y', m.t).attr('width', w).attr('height', h)
      .on('mousemove', function(event) {
        const [mx] = d3.pointer(event, this);
        const xv = x.invert(mx - m.l);
        const i = bisect(data, xv, 1);
        const d0 = data[i - 1], d1 = data[i] || d0;
        const d = Math.abs(xv - d0.year) < Math.abs(xv - d1.year) ? d0 : d1;
        vl.attr('x1', x(d.year)).attr('x2', x(d.year)).attr('opacity', 1);
        TT.show(`<strong>${d.year}</strong><br>
          1-person HH: <strong>${Math.round(d.pct_1person * 100)}%</strong><br>
          1–2 room apts: <strong>${Math.round(d.pct_small_dw * 100)}%</strong><br>
          Gap: <strong>+${Math.round(d.gap * 100)}pp</strong>`, event);
      })
      .on('mouseleave', () => { vl.attr('opacity', 0); TT.hide(); });
  }

  function updateChart(stepIndex) {
    if (stepIndex === currentStep || !g) return;
    currentStep = stepIndex;
    if (stepIndex < 0 || stepIndex >= STEPS.length) return;

    const step = STEPS[stepIndex];
    const h = H - m.t - m.b;

    g.select('.gap-fill').transition().duration(500)
      .attr('opacity', step.showFull ? 0.18 : 0.08);

    if (step.range) {
      const [y1, y2] = step.range;
      g.select('.range-highlight').transition().duration(400)
        .attr('x', x(y1)).attr('width', x(y2) - x(y1)).attr('opacity', 0.06);
    } else {
      g.select('.range-highlight').transition().duration(300).attr('opacity', 0);
    }

    if (step.highlight) {
      const d = gapData.find(d => d.year === step.highlight);
      if (d) {
        g.select('.highlight-circle')
          .attr('cx', x(d.year)).attr('cy', y(d.pct_1person))
          .transition().duration(400).attr('r', 10).attr('opacity', 1);
      }
    } else {
      g.select('.highlight-circle').transition().duration(300).attr('r', 0);
    }

    const ann = g.select('.annotation-group');
    ann.selectAll('*').remove();
    if (step.note && step.highlight) {
      const d = gapData.find(d => d.year === step.highlight);
      if (d) {
        const ax = x(d.year), ay = y(d.pct_1person) - 20;
        ann.append('rect').attr('x', ax - 60).attr('y', ay - 18)
          .attr('width', 120).attr('height', 20).attr('rx', 4)
          .attr('fill', '#c2410c').attr('opacity', 0.9);
        ann.append('text').attr('x', ax).attr('y', ay - 3)
          .attr('text-anchor', 'middle').attr('font-size', 10)
          .attr('font-weight', '700').attr('fill', 'white').text(step.note);
      }
    }
  }

  function initObserver() {
    const stepEls = document.querySelectorAll('.scrolly-step');
    if (!stepEls.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = +entry.target.dataset.step;
          stepEls.forEach(el => el.classList.remove('is-active'));
          entry.target.classList.add('is-active');
          updateChart(idx);
        }
      });
    }, { threshold: 0.55, rootMargin: '0px 0px -20% 0px' });

    stepEls.forEach(el => observer.observe(el));
  }

  function init({ gapData }) {
    const el = document.getElementById('scrolly-chart');
    if (!el) return;  
    drawStickyGap(gapData);
    initObserver();
  }

  return { init };
})();