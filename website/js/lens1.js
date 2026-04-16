/* ============================================================
   lens1.js — Lens 1: Who lives in Lausanne?
   Charts:
     - Stacked area: Swiss vs foreign population share 1979-2025
     - Population pyramid: age groups by sex (animated slider)
     - Choropleth grid: foreign % by district (latest year)
   ============================================================ */

const Lens1 = (() => {

  /* ── helpers ─────────────────────────────────────────────────────── */
  function getW(id) {
    return document.getElementById(id).getBoundingClientRect().width || 500;
  }
  function gridH(g, yScale, ticks, w) {
    g.append('g').attr('class', 'grid')
     .call(d3.axisLeft(yScale).tickSize(-w).tickFormat('').ticks(ticks))
     .call(g => g.select('.domain').remove());
  }

  /* ── 1A. STACKED AREA: Swiss vs Foreign ─────────────────────────── */
  function drawStackedArea(cityPop) {
    const container = document.getElementById('chart-stacked');
    const W = getW('chart-stacked');
    const H = 260;
    const m = { t: 24, r: 20, b: 36, l: 44 };
    const w = W - m.l - m.r, h = H - m.t - m.b;

    container.innerHTML = '';
    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);

    /* deduplicate: keep one row per year (in case of duplicates) */
    const seen = new Set();
    const data = cityPop.filter(d => {
      if (seen.has(d.year)) return false;
      seen.add(d.year); return true;
    }).filter(d => d.pct_swiss > 0);

    const x = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([0, w]);
    const y = d3.scaleLinear().domain([0, 1]).range([h, 0]);

    /* grid */
    gridH(g, y, 4, w);

    /* axes */
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${h})`)
     .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));
    g.append('g').attr('class', 'axis')
     .call(d3.axisLeft(y).ticks(4).tickFormat(d => Math.round(d * 100) + '%'));

    /* stack */
    const stack = d3.stack().keys(['pct_swiss', 'pct_foreign']);
    const series = stack(data);

    const colors = { pct_swiss: '#2563EB', pct_foreign: '#93c5fd' };
    const labels = { pct_swiss: 'Swiss', pct_foreign: 'Foreign' };

    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveCatmullRom);

    g.selectAll('.area-path')
      .data(series).join('path')
      .attr('class', 'area-path')
      .attr('fill', d => colors[d.key])
      .attr('opacity', 0.88)
      .attr('d', area);

    /* legend */
    const leg = svg.append('g').attr('transform', `translate(${m.l + 8},${m.t + 4})`);
    Object.entries(labels).forEach(([key, label], i) => {
      const gx = leg.append('g').attr('transform', `translate(${i * 90},0)`);
      gx.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2)
        .attr('fill', colors[key]);
      gx.append('text').attr('x', 16).attr('y', 10)
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', 11)
        .attr('fill', '#334155').text(label);
    });

    /* hover */
    const bisect = d3.bisector(d => d.year).left;
    const hline = g.append('line').attr('class', 'hover-line')
      .attr('y1', 0).attr('y2', h).attr('stroke', '#94a3b8')
      .attr('stroke-width', 1).attr('stroke-dasharray', '3,2').attr('opacity', 0);

    svg.append('rect').attr('fill', 'none').attr('pointer-events', 'all')
      .attr('x', m.l).attr('y', m.t).attr('width', w).attr('height', h)
      .on('mousemove', function(event) {
        const [mx] = d3.pointer(event, this);
        const xVal = x.invert(mx - m.l);
        const i = bisect(data, xVal, 1);
        const d0 = data[i - 1], d1 = data[i] || d0;
        const d = Math.abs(xVal - d0.year) < Math.abs(xVal - d1.year) ? d0 : d1;
        hline.attr('x1', x(d.year)).attr('x2', x(d.year)).attr('opacity', 1);
        TT.show(
          `<strong>${d.year}</strong><br>
           🇨🇭 Swiss: <strong>${Math.round(d.pct_swiss * 100)}%</strong><br>
           🌍 Foreign: <strong>${Math.round(d.pct_foreign * 100)}%</strong><br>
           Total: <strong>${d3.format(',')(d.pop_total)}</strong>`,
          event
        );
      })
      .on('mouseleave', () => { hline.attr('opacity', 0); TT.hide(); });
  }

  /* ── 1B. POPULATION PYRAMID ──────────────────────────────────────── */
  function drawPyramid(popAge, year) {
    const container = document.getElementById('chart-pyramid');
    const W = getW('chart-pyramid');
    const H = 220;
    container.innerHTML = '';

    const yearData = popAge.filter(d => d.year === year && d.district === 'Ville de Lausanne');
    if (!yearData.length) return;
    const d = yearData[0];

    /* age groups & approximate male/female splits
       popAge has total per group but not by sex — use pop_origin for sex ratio
       For simplicity: split each age group 48/52 (close to real ratios) */
    const groups = [
      { label: '0–19',  total: d.age_0_19  },
      { label: '20–39', total: d.age_20_39 },
      { label: '40–64', total: d.age_40_64 },
      { label: '65–79', total: d.age_65_79 },
      { label: '80+',   total: d.age_80plus },
    ].filter(g => g.total > 0)
     .map(g => ({
       ...g,
       male:   g.total * 0.485,
       female: g.total * 0.515,
       pct:    g.total / d.pop_total,
     }));

    const LABEL_W = 42;   /* fixed center column width for age labels */
    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const cx = W / 2;
    const rowH = (H - 22) / groups.length;
    const maxPct = d3.max(groups, g => g.total / d.pop_total);
    const barScale = ((W / 2) - LABEL_W / 2 - 12) / maxPct;

    groups.forEach((g, i) => {
      const y0 = 10 + i * rowH;
      const bh = rowH * 0.72;
      const bwM = (g.male   / d.pop_total) * barScale;
      const bwF = (g.female / d.pop_total) * barScale;

      /* male bar — ends at cx - LABEL_W/2 - 2 */
      svg.append('rect')
        .attr('x', cx - LABEL_W / 2 - 2 - bwM).attr('y', y0)
        .attr('width', bwM).attr('height', bh)
        .attr('fill', '#2563EB').attr('rx', 2).attr('opacity', 0.85);

      /* female bar — starts at cx + LABEL_W/2 + 2 */
      svg.append('rect')
        .attr('x', cx + LABEL_W / 2 + 2).attr('y', y0)
        .attr('width', bwF).attr('height', bh)
        .attr('fill', '#93c5fd').attr('rx', 2).attr('opacity', 0.85);

      /* age label — sits in the clear center column */
      svg.append('text')
        .attr('x', cx).attr('y', y0 + bh / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', 10)
        .attr('fill', '#334155').text(g.label);
    });

    /* axis labels */
    [['Male', cx - 60], ['Female', cx + 60]].forEach(([label, x]) => {
      svg.append('text').attr('x', x).attr('y', H - 2)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', 10)
        .attr('fill', '#94a3b8').text(label);
    });
  }

  /* ── 1C. CHOROPLETH DISTRICT GRID ────────────────────────────────── */
  function drawChoropleth(districts) {
    const container = document.getElementById('chart-choropleth');
    if (!districts.length) {
      container.innerHTML = '<div class="loading">No district data available</div>';
      return;
    }

    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0.20, 0.65]);

    /* text color: white if background is dark enough */
    function textColor(pct) {
      return pct > 0.42 ? 'white' : '#1e3a8a';
    }

    /* grid */
    const grid = document.createElement('div');
    grid.className = 'district-grid';

    districts.forEach(d => {
      const pct = d.pct_foreign || 0;
      const cell = document.createElement('div');
      cell.className = 'district-cell';
      cell.style.background = colorScale(pct);
      const name = d.district.replace(/^\d+\s*[-–]\s*/, '');
      cell.innerHTML = `
        <span class="d-name">${name}</span>
        <span class="d-pct" style="color:${textColor(pct)}">${Math.round(pct * 100)}%</span>`;
      cell.addEventListener('mouseenter', e => {
        TT.show(
          `<strong>${d.district}</strong><br>
           Foreign: <strong>${Math.round(pct * 100)}%</strong><br>
           Swiss: <strong>${Math.round(d.pct_swiss * 100)}%</strong><br>
           Total pop: <strong>${d3.format(',')(d.pop_total)}</strong>`,
          e
        );
      });
      cell.addEventListener('mousemove', e => TT.move(e));
      cell.addEventListener('mouseleave', () => TT.hide());
      grid.appendChild(cell);
    });

    /* legend */
    const leg = document.createElement('div');
    leg.className = 'choro-legend';
    leg.innerHTML = `
      <span>20%</span>
      <div class="choro-legend-bar"></div>
      <span>65%+</span>
      <span style="margin-left:8px;color:#94a3b8;">foreign-born share by district (${d3.max(districts, d => d.year)})</span>`;

    container.innerHTML = '';
    container.appendChild(grid);
    container.appendChild(leg);
  }

  /* ── PUBLIC INIT ─────────────────────────────────────────────────── */
  function init({ cityPop, cityAge, districts }) {
    drawStackedArea(cityPop);
    drawPyramid(cityAge, 2024);

    /* pyramid slider */
    const slider = document.getElementById('pyramid-slider');
    const label  = document.getElementById('pyramid-year-label');
    slider.addEventListener('input', () => {
      label.textContent = slider.value;
      drawPyramid(cityAge, +slider.value);
    });

    drawChoropleth(districts);
  }

  return { init };
})();