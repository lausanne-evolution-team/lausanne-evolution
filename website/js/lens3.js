/* ============================================================
   lens3.js — Lens 3: What does housing offer?
   Charts:
     - Gap area (CORE): 1-person HH% vs small-dwelling% 2012-2024
     - Grouped bar: room distribution vs HH size distribution 2024
     - Surface stacked area: dwelling size evolution 2010-2024
   ============================================================ */

const Lens3 = (() => {

  function getW(id) {
    return document.getElementById(id).getBoundingClientRect().width || 500;
  }
  function gridH(g, yScale, ticks, w) {
    g.append('g').attr('class', 'grid')
     .call(d3.axisLeft(yScale).tickSize(-w).tickFormat('').ticks(ticks))
     .call(g => g.select('.domain').remove());
  }

  /* ── 3A. GAP AREA: THE CORE CHART ───────────────────────────────── */
  function drawGapArea(gapData) {
    const container = document.getElementById('chart-gap');
    const W = getW('chart-gap');
    const H = 300;
    const m = { t: 36, r: 140, b: 40, l: 52 };
    const w = W - m.l - m.r, h = H - m.t - m.b;

    container.innerHTML = '';
    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);

    const allVals = gapData.flatMap(d => [d.pct_1person, d.pct_small_dw]);
    const x = d3.scaleLinear().domain(d3.extent(gapData, d => d.year)).range([0, w]);
    const y = d3.scaleLinear()
      .domain([d3.min(allVals) * 0.96, d3.max(allVals) * 1.02])
      .range([h, 0]);

    gridH(g, y, 5, w);
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${h})`)
     .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format('d')));
    g.append('g').attr('class', 'axis')
     .call(d3.axisLeft(y).ticks(5).tickFormat(d => Math.round(d * 100) + '%'));

    /* gap fill: demand > supply → red */
    const gapAreaFn = d3.area()
      .x(d => x(d.year))
      .y0(d => y(d.pct_small_dw))
      .y1(d => y(d.pct_1person))
      .curve(d3.curveCatmullRom);
    g.append('path').datum(gapData)
      .attr('fill', '#dc2626').attr('opacity', 0.15).attr('d', gapAreaFn);

    /* demand line (1-person HH%) — solid red */
    const demandLine = d3.line()
      .x(d => x(d.year)).y(d => y(d.pct_1person)).curve(d3.curveCatmullRom);
    g.append('path').datum(gapData)
      .attr('fill', 'none').attr('stroke', '#dc2626')
      .attr('stroke-width', 2.8).attr('d', demandLine);

    /* supply line (small dw%) — dashed red */
    const supplyLine = d3.line()
      .x(d => x(d.year)).y(d => y(d.pct_small_dw)).curve(d3.curveCatmullRom);
    g.append('path').datum(gapData)
      .attr('fill', 'none').attr('stroke', '#dc2626')
      .attr('stroke-width', 2).attr('stroke-dasharray', '6,3')
      .attr('opacity', 0.7).attr('d', supplyLine);

    /* dots on demand line */
    g.selectAll('.dot-demand').data(gapData).join('circle')
      .attr('class', 'dot-demand')
      .attr('cx', d => x(d.year)).attr('cy', d => y(d.pct_1person))
      .attr('r', 3.5).attr('fill', 'white')
      .attr('stroke', '#dc2626').attr('stroke-width', 2);

    /* gap annotation arrow */
    const midIdx = Math.floor(gapData.length * 0.65);
    const md = gapData[midIdx];
    if (md) {
      const mx = x(md.year);
      const y1a = y(md.pct_1person), y2a = y(md.pct_small_dw);
      /* bracket */
      g.append('line')
        .attr('x1', mx + 8).attr('x2', mx + 8)
        .attr('y1', y1a).attr('y2', y2a)
        .attr('stroke', '#ea580c').attr('stroke-width', 1.5);
      g.append('text')
        .attr('x', mx + 12).attr('y', (y1a + y2a) / 2 + 4)
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', 10)
        .attr('font-weight', '700').attr('fill', '#ea580c')
        .text(`+${Math.round(md.gap * 100)}pp gap`);
    }

    /* end labels */
    const last = gapData[gapData.length - 1];
    const labelX = x(last.year) + 8;
    g.append('text').attr('x', labelX).attr('y', y(last.pct_1person) + 4)
      .attr('font-size', 10).attr('fill', '#dc2626').attr('font-weight', '600')
      .text(`1-person HH: ${Math.round(last.pct_1person * 100)}%`);
    g.append('text').attr('x', labelX).attr('y', y(last.pct_small_dw) + 4)
      .attr('font-size', 10).attr('fill', '#dc2626').attr('opacity', 0.75)
      .text(`1–2 room apts: ${Math.round(last.pct_small_dw * 100)}%`);

    /* legend */
    const leg = svg.append('g').attr('transform', `translate(${m.l + 6},${m.t - 24})`);
    [
      ['1-person household share (demand)', false],
      ['1–2 room dwelling share (supply)',   true],
    ].forEach(([label, dashed], i) => {
      const gx = leg.append('g').attr('transform', `translate(${i * 230},0)`);
      gx.append('line').attr('x1', 0).attr('y1', 5).attr('x2', 20).attr('y2', 5)
        .attr('stroke', '#dc2626').attr('stroke-width', dashed ? 2 : 2.8)
        .attr('stroke-dasharray', dashed ? '5,2' : 'none').attr('opacity', dashed ? 0.7 : 1);
      gx.append('text').attr('x', 24).attr('y', 9)
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
        const i = bisect(gapData, xv, 1);
        const d0 = gapData[i - 1], d1 = gapData[i] || d0;
        const d = Math.abs(xv - d0.year) < Math.abs(xv - d1.year) ? d0 : d1;
        vline.attr('x1', x(d.year)).attr('x2', x(d.year)).attr('opacity', 1);
        TT.show(
          `<strong>${d.year}</strong><br>
           1-person HH share: <strong>${Math.round(d.pct_1person * 100)}%</strong><br>
           1–2 room dwelling share: <strong>${Math.round(d.pct_small_dw * 100)}%</strong><br>
           Gap: <strong>+${Math.round(d.gap * 100)} pp</strong>`,
          event
        );
      })
      .on('mouseleave', () => { vline.attr('opacity', 0); TT.hide(); });
  }

  /* ── 3B. GROUPED BAR: supply vs demand by room count ─────────────── */
  function drawGroupedBar(cityRooms, cityHH) {
    const container = document.getElementById('chart-groupedbar');
    const W = getW('chart-groupedbar');
    const H = 280;
    const m = { t: 28, r: 20, b: 50, l: 46 };
    const w = W - m.l - m.r, h = H - m.t - m.b;

    container.innerHTML = '';

    /* latest year where both datasets overlap */
    const latestRooms = d3.max(cityRooms, d => d.year);
    const latestHH    = d3.max(cityHH, d => d.year);
    const yr = Math.min(latestRooms, latestHH);

    const rRow = cityRooms.find(d => d.year === yr);
    const hRow = cityHH.find(d => d.year === latestHH);

    if (!rRow || !hRow) return;

    const rTotal = rRow.dw_total;
    const hTotal = hRow.hh_total;

    const cats = [
      { label: '1',   supply: rRow.dw_1room   / rTotal, demand: hRow.hh_1person  / hTotal },
      { label: '2',   supply: rRow.dw_2rooms  / rTotal, demand: 0 },
      { label: '3',   supply: rRow.dw_3rooms  / rTotal, demand: hRow.hh_2persons / hTotal },
      { label: '4',   supply: rRow.dw_4rooms  / rTotal, demand: hRow.hh_3persons / hTotal + hRow.hh_4persons / hTotal },
      { label: '5',   supply: rRow.dw_5rooms  / rTotal, demand: hRow.hh_5persons / hTotal },
      { label: '6+',  supply: rRow.dw_6plus   / rTotal, demand: hRow.hh_6plus    / hTotal },
    ];

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);

    const x0 = d3.scaleBand().domain(cats.map(d => d.label)).range([0, w]).padding(0.25);
    const x1 = d3.scaleBand().domain(['supply', 'demand']).range([0, x0.bandwidth()]).padding(0.08);
    const y  = d3.scaleLinear().domain([0, d3.max(cats, d => Math.max(d.supply, d.demand)) * 1.1]).range([h, 0]);

    gridH(g, y, 4, w);
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${h})`)
     .call(d3.axisBottom(x0));
    g.append('g').attr('class', 'axis')
     .call(d3.axisLeft(y).ticks(4).tickFormat(d => Math.round(d * 100) + '%'));

    const colors = { supply: '#dc2626', demand: '#fca5a5' };

    cats.forEach(cat => {
      ['supply', 'demand'].forEach(key => {
        if (cat[key] === 0) return;
        g.append('rect')
          .attr('x', x0(cat.label) + x1(key))
          .attr('y', y(cat[key]))
          .attr('width', x1.bandwidth())
          .attr('height', h - y(cat[key]))
          .attr('fill', colors[key]).attr('rx', 2)
          .on('mouseenter', e => TT.show(
            `<strong>${cat.label} room${cat.label !== '1' ? 's' : ''}</strong><br>
             ${key === 'supply' ? 'Dwellings' : 'Households'}: <strong>${Math.round(cat[key] * 100)}%</strong>`,
            e
          ))
          .on('mousemove', e => TT.move(e))
          .on('mouseleave', () => TT.hide());
      });
    });

    /* x axis label */
    g.append('text').attr('x', w / 2).attr('y', h + 38)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Sans, sans-serif').attr('font-size', 10)
      .attr('fill', '#64748b').text(`Number of rooms  ·  Supply = dwellings ${yr}, Demand = households ${latestHH}`);

    /* legend */
    const leg = svg.append('g').attr('transform', `translate(${m.l + 6},${m.t - 18})`);
    [['Supply (dwellings)', '#dc2626'], ['Demand (households)', '#fca5a5']].forEach(([label, col], i) => {
      const gx = leg.append('g').attr('transform', `translate(${i * 160},0)`);
      gx.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', col);
      gx.append('text').attr('x', 16).attr('y', 10)
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', 10)
        .attr('fill', '#334155').text(label);
    });
  }

  /* ── 3C. SURFACE STACKED AREA ────────────────────────────────────── */
  function drawSurface(citySurf) {
    const container = document.getElementById('chart-surface');
    const W = getW('chart-surface');
    const H = 280;
    const m = { t: 28, r: 20, b: 36, l: 46 };
    const w = W - m.l - m.r, h = H - m.t - m.b;

    container.innerHTML = '';
    if (!citySurf.length) return;

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);

    const keys = ['dw_lt40','dw_40_59','dw_60_79','dw_80_99','dw_100_119','dw_120_159','dw_160plus'];
    const labels = ['<40m²','40–59','60–79','80–99','100–119','120–159','160+'];

    /* normalise to shares */
    const data = citySurf.map(d => {
      const row = { year: d.year };
      keys.forEach(k => row[k] = (d[k] || 0) / d.dw_total);
      return row;
    });

    const x = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([0, w]);
    const y = d3.scaleLinear().domain([0, 1]).range([h, 0]);

    gridH(g, y, 4, w);
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${h})`)
     .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format('d')));
    g.append('g').attr('class', 'axis')
     .call(d3.axisLeft(y).ticks(4).tickFormat(d => Math.round(d * 100) + '%'));

    const stack = d3.stack().keys(keys);
    const series = stack(data);
    const color = d3.scaleSequential(d3.interpolateReds).domain([-1, keys.length]);

    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveCatmullRom);

    g.selectAll('.surf-area').data(series).join('path')
      .attr('class', 'surf-area')
      .attr('fill', (_, i) => color(i))
      .attr('opacity', 0.85)
      .attr('d', area)
      .on('mouseenter', (e, d) => {
        const last = d[d.length - 1];
        TT.show(
          `<strong>${labels[keys.indexOf(d.key)]}</strong><br>
           Share (${data[data.length-1].year}): <strong>${Math.round((last[1]-last[0])*100)}%</strong>`,
          e
        );
      })
      .on('mousemove', e => TT.move(e))
      .on('mouseleave', () => TT.hide());

    /* compact legend */
    const leg = svg.append('g').attr('transform', `translate(${m.l},${H - 4})`);
    labels.forEach((lbl, i) => {
      leg.append('rect').attr('x', i * 52).attr('y', -10).attr('width', 10).attr('height', 10)
        .attr('rx', 2).attr('fill', color(i));
      leg.append('text').attr('x', i * 52 + 13).attr('y', -1)
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', 9)
        .attr('fill', '#64748b').text(lbl);
    });
  }

  /* ── PUBLIC INIT ─────────────────────────────────────────────────── */
  function init({ gapData, cityRooms, cityHH, citySurf }) {
    drawGapArea(gapData);
    drawGroupedBar(cityRooms, cityHH);
    drawSurface(citySurf);
  }

  return { init };
})();