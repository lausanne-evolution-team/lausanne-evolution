/* ============================================================
   lens2.js — Lens 2: How do people live and work?
   Charts:
     - Dual line: 1-person HH% vs mean HH size (2012–2025)
     - Connected dot: female headcount% vs FTE% (2011–2023)
   ============================================================ */

const Lens2 = (() => {

  function getW(id) {
    return document.getElementById(id).getBoundingClientRect().width || 500;
  }
  function gridH(g, yScale, ticks, w) {
    g.append('g').attr('class', 'grid')
     .call(d3.axisLeft(yScale).tickSize(-w).tickFormat('').ticks(ticks))
     .call(g => g.select('.domain').remove());
  }

  /* ── 2A. DUAL LINE: 1-person HH rise ────────────────────────────── */
  function drawDualLine(cityHH) {
    const container = document.getElementById('chart-dualline');
    const W = getW('chart-dualline');
    const H = 280;
    const m = { t: 28, r: 60, b: 36, l: 46 };
    const w = W - m.l - m.r, h = H - m.t - m.b;

    container.innerHTML = '';
    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);

    /* deduplicate */
    const seen = new Set();
    const data = cityHH.filter(d => {
      if (seen.has(d.year)) return false;
      seen.add(d.year); return true;
    });

    const x = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([0, w]);

    /* left y: 1-person share */
    const yL = d3.scaleLinear()
      .domain([d3.min(data, d => d.pct_1person) * 0.96,
               d3.max(data, d => d.pct_1person) * 1.02])
      .range([h, 0]);

    /* right y: mean HH size (inverted feel — as it falls, 1-person rises) */
    const meanExt = d3.extent(data, d => +d.hh_mean_size);
    const yR = d3.scaleLinear()
      .domain([meanExt[0] * 0.97, meanExt[1] * 1.01])
      .range([h, 0]);

    gridH(g, yL, 5, w);

    /* axes */
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${h})`)
     .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format('d')));
    g.append('g').attr('class', 'axis')
     .call(d3.axisLeft(yL).ticks(5).tickFormat(d => Math.round(d * 100) + '%'));
    g.append('g').attr('class', 'axis').attr('transform', `translate(${w},0)`)
     .call(d3.axisRight(yR).ticks(4).tickFormat(d => d.toFixed(2)));

    /* right axis label */
    svg.append('text')
      .attr('transform', `translate(${W - 4},${m.t + h / 2}) rotate(90)`)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Sans, sans-serif').attr('font-size', 9)
      .attr('fill', '#94a3b8').text('mean HH size →');

    /* area fill under 1-person line */
    const areaFn = d3.area()
      .x(d => x(d.year)).y0(h).y1(d => yL(d.pct_1person))
      .curve(d3.curveCatmullRom);
    g.append('path').datum(data)
      .attr('fill', '#059669').attr('opacity', 0.08).attr('d', areaFn);

    /* 1-person line (solid green) */
    const line1 = d3.line()
      .x(d => x(d.year)).y(d => yL(d.pct_1person)).curve(d3.curveCatmullRom);
    const path1 = g.append('path').datum(data)
      .attr('fill', 'none').attr('stroke', '#059669')
      .attr('stroke-width', 2.5).attr('d', line1);
    if (window.Anim) Anim.drawLine(path1.node(), 1200);

    /* mean size line (dashed, lighter) */
    const line2 = d3.line()
      .x(d => x(d.year)).y(d => yR(+d.hh_mean_size)).curve(d3.curveCatmullRom);
    const path2 = g.append('path').datum(data)
      .attr('fill', 'none').attr('stroke', '#059669')
      .attr('stroke-width', 1.5).attr('stroke-dasharray', '5,3')
      .attr('opacity', 0.55).attr('d', line2);
    if (window.Anim) Anim.drawLine(path2.node(), 1200, 200);

    /* dots */
    g.selectAll('.dot1').data(data).join('circle')
      .attr('class', 'dot1')
      .attr('cx', d => x(d.year)).attr('cy', d => yL(d.pct_1person))
      .attr('r', 3.5).attr('fill', 'white').attr('stroke', '#059669').attr('stroke-width', 1.8);

    /* end labels */
    const last = data[data.length - 1];
    g.append('text')
      .attr('x', x(last.year) + 4).attr('y', yL(last.pct_1person) + 4)
      .attr('font-size', 9).attr('fill', '#059669')
      .text(`${Math.round(last.pct_1person * 100)}%`);

    /* legend */
    const leg = svg.append('g').attr('transform', `translate(${m.l + 6},${m.t - 16})`);
    [['1-person HH%', '#059669', false], ['Mean HH size', '#059669', true]]
      .forEach(([label, color, dashed], i) => {
        const gx = leg.append('g').attr('transform', `translate(${i * 130},0)`);
        gx.append('line').attr('x1', 0).attr('y1', 5).attr('x2', 18).attr('y2', 5)
          .attr('stroke', color).attr('stroke-width', dashed ? 1.5 : 2.5)
          .attr('stroke-dasharray', dashed ? '4,2' : 'none').attr('opacity', dashed ? 0.6 : 1);
        gx.append('text').attr('x', 22).attr('y', 9)
          .attr('font-family', 'DM Sans, sans-serif').attr('font-size', 10)
          .attr('fill', '#334155').text(label);
      });

    /* hover */
    const bisect = d3.bisector(d => d.year).left;
    const vline = g.append('line').attr('y1', 0).attr('y2', h)
      .attr('stroke', '#94a3b8').attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,2').attr('opacity', 0);

    svg.append('rect').attr('fill', 'none').attr('pointer-events', 'all')
      .attr('x', m.l).attr('y', m.t).attr('width', w).attr('height', h)
      .on('mousemove', function(event) {
        const [mx] = d3.pointer(event, this);
        const xv = x.invert(mx - m.l);
        const i = bisect(data, xv, 1);
        const d0 = data[i - 1], d1 = data[i] || d0;
        const d = Math.abs(xv - d0.year) < Math.abs(xv - d1.year) ? d0 : d1;
        vline.attr('x1', x(d.year)).attr('x2', x(d.year)).attr('opacity', 1);
        TT.show(
          `<strong>${d.year}</strong><br>
           1-person HH: <strong>${Math.round(d.pct_1person * 100)}%</strong><br>
           Mean HH size: <strong>${(+d.hh_mean_size).toFixed(2)} persons</strong><br>
           Total HH: <strong>${d3.format(',')(d.hh_total)}</strong>`,
          event
        );
      })
      .on('mouseleave', () => { vline.attr('opacity', 0); TT.hide(); });
  }

  /* ── 2B. CONNECTED DOT: Female employment gap ────────────────────── */
  function drawEmployment(cityEmp) {
    const container = document.getElementById('chart-employment');
    const W = getW('chart-employment');
    const H = 280;
    const m = { t: 28, r: 20, b: 36, l: 52 };
    const w = W - m.l - m.r, h = H - m.t - m.b;

    container.innerHTML = '';
    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);

    const data = cityEmp;
    const allVals = data.flatMap(d => [d.pct_jobs_women, d.pct_fte_women]);
    const x = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([0, w]);
    const y = d3.scaleLinear()
      .domain([d3.min(allVals) * 0.975, d3.max(allVals) * 1.015])
      .range([h, 0]);

    gridH(g, y, 5, w);
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${h})`)
     .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format('d')));
    g.append('g').attr('class', 'axis')
     .call(d3.axisLeft(y).ticks(5).tickFormat(d => Math.round(d * 100) + '%'));

    /* gap area fill */
    const gapArea = d3.area()
      .x(d => x(d.year))
      .y0(d => y(d.pct_fte_women))
      .y1(d => y(d.pct_jobs_women))
      .curve(d3.curveCatmullRom);
    g.append('path').datum(data)
      .attr('fill', '#059669').attr('opacity', 0.12).attr('d', gapArea);

    /* lines */
    const makeL = key => d3.line().x(d => x(d.year)).y(d => y(d[key])).curve(d3.curveCatmullRom);

    [
      { key: 'pct_jobs_women', dashed: false, opacity: 1 },
      { key: 'pct_fte_women',  dashed: true,  opacity: 0.7 },
    ].forEach(({ key, dashed, opacity }) => {
      g.append('path').datum(data)
        .attr('fill', 'none').attr('stroke', '#059669')
        .attr('stroke-width', dashed ? 1.5 : 2.5)
        .attr('stroke-dasharray', dashed ? '5,3' : 'none')
        .attr('opacity', opacity).attr('d', makeL(key));

      g.selectAll(`.dot-${key}`).data(data).join('circle')
        .attr('class', `dot-${key}`)
        .attr('cx', d => x(d.year)).attr('cy', d => y(d[key]))
        .attr('r', 3.5).attr('fill', 'white')
        .attr('stroke', '#059669').attr('stroke-width', 1.8)
        .attr('opacity', opacity);
    });

    /* gap annotation on last point */
    const last = data[data.length - 1];
    const midY = (y(last.pct_jobs_women) + y(last.pct_fte_women)) / 2;
    g.append('line')
      .attr('x1', x(last.year) + 4).attr('x2', x(last.year) + 4)
      .attr('y1', y(last.pct_jobs_women)).attr('y2', y(last.pct_fte_women))
      .attr('stroke', '#059669').attr('stroke-width', 1);
    g.append('text')
      .attr('x', x(last.year) + 7).attr('y', midY + 3)
      .attr('font-size', 9).attr('fill', '#059669')
      .text(`gap: ${Math.round(last.gender_fte_gap * 100)}pp`);

    /* legend */
    const leg = svg.append('g').attr('transform', `translate(${m.l + 6},${m.t - 16})`);
    [['Headcount %', false], ['FTE %', true]].forEach(([label, dashed], i) => {
      const gx = leg.append('g').attr('transform', `translate(${i * 110},0)`);
      gx.append('line').attr('x1', 0).attr('y1', 5).attr('x2', 18).attr('y2', 5)
        .attr('stroke', '#059669').attr('stroke-width', dashed ? 1.5 : 2.5)
        .attr('stroke-dasharray', dashed ? '4,2' : 'none').attr('opacity', dashed ? 0.7 : 1);
      gx.append('text').attr('x', 22).attr('y', 9)
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', 10)
        .attr('fill', '#334155').text(label);
    });

    /* hover */
    const bisect = d3.bisector(d => d.year).left;
    const vline = g.append('line').attr('y1', 0).attr('y2', h)
      .attr('stroke', '#94a3b8').attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,2').attr('opacity', 0);

    svg.append('rect').attr('fill', 'none').attr('pointer-events', 'all')
      .attr('x', m.l).attr('y', m.t).attr('width', w).attr('height', h)
      .on('mousemove', function(event) {
        const [mx] = d3.pointer(event, this);
        const xv = x.invert(mx - m.l);
        const i = bisect(data, xv, 1);
        const d0 = data[i - 1], d1 = data[i] || d0;
        const d = Math.abs(xv - d0.year) < Math.abs(xv - d1.year) ? d0 : d1;
        vline.attr('x1', x(d.year)).attr('x2', x(d.year)).attr('opacity', 1);
        TT.show(
          `<strong>${d.year}</strong><br>
           Headcount women: <strong>${Math.round(d.pct_jobs_women * 100)}%</strong><br>
           FTE women: <strong>${Math.round(d.pct_fte_women * 100)}%</strong><br>
           Gap: <strong>${Math.round(d.gender_fte_gap * 100)} pp</strong>`,
          event
        );
      })
      .on('mouseleave', () => { vline.attr('opacity', 0); TT.hide(); });
  }

  /* ── PUBLIC INIT ─────────────────────────────────────────────────── */
  function init({ cityHH, cityEmp }) {
    drawDualLine(cityHH);
    drawEmployment(cityEmp);
  }

  return { init };
})();