const Lens1 = (() => {
  function getW(id) {
    const el = document.getElementById(id);
    return el ? el.getBoundingClientRect().width || 500 : 500;
  }
  function gridH(g, yScale, ticks, w) {
    g.append('g').attr('class','grid')
     .call(d3.axisLeft(yScale).tickSize(-w).tickFormat('').ticks(ticks))
     .call(g => g.select('.domain').remove());
  }

  // ── 1A. STACKED AREA ──────────────────────────────────────────────
  function drawStackedArea(cityPop, allPop) {
    const el = document.getElementById('chart-stacked');
    const W = getW('chart-stacked'), H = 340;
    const m = {t:24,r:20,b:36,l:44};
    const w = W-m.l-m.r, h = H-m.t-m.b;
    el.innerHTML = '';
    const svg = d3.select(el).append('svg').attr('viewBox',`0 0 ${W} ${H}`);
    const g = svg.append('g').attr('transform',`translate(${m.l},${m.t})`);

    const seen = new Set();
    const data = cityPop.filter(d => { if(seen.has(d.year)) return false; seen.add(d.year); return true; }).filter(d => d.pct_swiss > 0);
    const x = d3.scaleLinear().domain(d3.extent(data,d=>d.year)).range([0,w]);
    const y = d3.scaleLinear().domain([0,1]).range([h,0]);
    gridH(g, y, 4, w);
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));
    g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(4).tickFormat(d=>Math.round(d*100)+'%'));

    const stack = d3.stack().keys(['pct_swiss','pct_foreign']);
    const series = stack(data);
    const colors = {pct_swiss:'#1d4ed8', pct_foreign:'#93c5fd'};
    const labels = {pct_swiss:'Swiss', pct_foreign:'Foreign'};
    const area = d3.area().x(d=>x(d.data.year)).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveCatmullRom);

    const areas = g.selectAll('.ap').data(series).join('path').attr('class','ap')
      .attr('fill',d=>colors[d.key]).attr('opacity',0).attr('d',area)
      .transition().delay((_,i)=>i*180).duration(900).ease(d3.easeQuadOut).attr('opacity',0.88);

    // District overlay line
    const distLine = g.append('path').attr('class','dist-overlay')
      .attr('fill','none').attr('stroke','#fbbf24').attr('stroke-width',2.5)
      .attr('stroke-dasharray','5,3').attr('opacity',0);

    const leg = svg.append('g').attr('transform',`translate(${m.l+8},${m.t+4})`);
    Object.entries(labels).forEach(([k,lbl],i) => {
      const gx = leg.append('g').attr('transform',`translate(${i*90},0)`);
      gx.append('rect').attr('width',12).attr('height',12).attr('rx',2).attr('fill',colors[k]);
      gx.append('text').attr('x',16).attr('y',10).attr('font-size',11).attr('fill','#374151').text(lbl);
    });
    // District legend item (hidden initially)
    const distLeg = leg.append('g').attr('transform','translate(190,0)').attr('opacity',0).attr('class','dist-leg');
    distLeg.append('line').attr('x1',0).attr('y1',6).attr('x2',14).attr('y2',6).attr('stroke','#fbbf24').attr('stroke-width',2.5).attr('stroke-dasharray','4,2');
    distLeg.append('text').attr('x',18).attr('y',10).attr('font-size',11).attr('fill','#374151').text('Selected district');

    const bisect = d3.bisector(d=>d.year).left;
    const vl = g.append('line').attr('y1',0).attr('y2',h).attr('stroke','#9ca3af').attr('stroke-width',1).attr('stroke-dasharray','3,2').attr('opacity',0);
    svg.append('rect').attr('fill','none').attr('pointer-events','all').attr('x',m.l).attr('y',m.t).attr('width',w).attr('height',h)
      .on('mousemove',function(event){
        const [mx]=d3.pointer(event,this); const xv=x.invert(mx-m.l);
        const i=bisect(data,xv,1); const d0=data[i-1],d1=data[i]||d0;
        const d=Math.abs(xv-d0.year)<Math.abs(xv-d1.year)?d0:d1;
        vl.attr('x1',x(d.year)).attr('x2',x(d.year)).attr('opacity',1);
        TT.show(`<strong>${d.year}</strong><br>🇨🇭 Swiss: <strong>${Math.round(d.pct_swiss*100)}%</strong><br>🌍 Foreign: <strong>${Math.round(d.pct_foreign*100)}%</strong><br>Total: <strong>${d3.format(',')(d.pop_total)}</strong>`,event);
      }).on('mouseleave',()=>{vl.attr('opacity',0);TT.hide();});

    // Listen for district filter changes
    window.DistrictFilter.onChange(districtName => {
      if (!districtName) {
        distLine.attr('opacity', 0);
        distLeg.attr('opacity', 0);
        return;
      }
      // Normalize: match both "11 - Chailly" (new) and "11-Chailly" (old) formats
      const norm = s => s.replace(/\s*[-–]\s*/,'-').trim().toLowerCase();
      const distData = allPop
        .filter(d => d.pct_swiss > 0 && norm(d.district) === norm(districtName))
        .sort((a,b) => a.year - b.year);
      if (!distData.length) return;

      const lineFn = d3.line().x(d=>x(d.year)).y(d=>y(d.pct_foreign)).curve(d3.curveCatmullRom);
      distLine.datum(distData).attr('d', lineFn).attr('opacity', 1);
      distLeg.attr('opacity', 1);
    });
  }

  // ── 1B. POPULATION PYRAMID ────────────────────────────────────────
  function drawPyramid(popAge, year) {
    const el = document.getElementById('chart-pyramid');
    const W = getW('chart-pyramid'), H = 300;
    el.innerHTML = '';
    const yd = popAge.find(d=>d.year===year && d.district==='Ville de Lausanne');
    if(!yd) return;
    const LABEL_W = 44;
    const groups = [
      {label:'0–19', total:yd.age_0_19},
      {label:'20–39',total:yd.age_20_39},
      {label:'40–64',total:yd.age_40_64},
      {label:'65–79',total:yd.age_65_79},
      {label:'80+',  total:yd.age_80plus},
    ].filter(g=>g.total>0).map(g=>({...g,male:g.total*.485,female:g.total*.515}));
    const svg = d3.select(el).append('svg').attr('viewBox',`0 0 ${W} ${H}`);
    const cx = W/2, rowH = (H-22)/groups.length;
    const maxPct = d3.max(groups,g=>g.total/yd.pop_total);
    const barScale = ((W/2)-LABEL_W/2-14)/maxPct;
    groups.forEach((g,i)=>{
      const y0=10+i*rowH, bh=rowH*.72;
      const bwM=(g.male/yd.pop_total)*barScale, bwF=(g.female/yd.pop_total)*barScale;
      svg.append('rect').attr('x',cx-LABEL_W/2-2-bwM).attr('y',y0).attr('width',bwM).attr('height',bh).attr('fill','#1d4ed8').attr('rx',2).attr('opacity',.85);
      svg.append('rect').attr('x',cx+LABEL_W/2+2).attr('y',y0).attr('width',bwF).attr('height',bh).attr('fill','#93c5fd').attr('rx',2).attr('opacity',.85);
      svg.append('text').attr('x',cx).attr('y',y0+bh/2+4).attr('text-anchor','middle').attr('font-size',10).attr('fill','#374151').text(g.label);
    });
    [['Male',cx-65],['Female',cx+65]].forEach(([lbl,x])=>{
      svg.append('text').attr('x',x).attr('y',H-2).attr('text-anchor','middle').attr('font-size',10).attr('fill','#9ca3af').text(lbl);
    });
  }

  // ── 1C. GEOJSON CHOROPLETH MAP ────────────────────────────────────
  function drawChoropleth(districts, geoData) {
    const el = document.getElementById('chart-choropleth');
    el.innerHTML = '';
    if (!geoData) { drawChoroplethGrid(districts, el); return; }

    const W = getW('chart-choropleth'), H = 420;
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0.20, 0.65]);
    const selectedColor = '#f59e0b';
    const latestYear = d3.max(districts, d => d.year);

    const dataByName = {};
    districts.forEach(d => {
      const key = d.district.replace(/^\d+\s*[-–]\s*/, '').trim().toLowerCase();
      dataByName[key] = d;
    });

    const getName = f => {
      const p = f.properties;
      return (p.NOMQUARTIE || p.name || p.NAME || p.nom || p.NOM || p.quartier || '').trim();
    };

    const findMatch = rawName => {
      const key = rawName.toLowerCase();
      return dataByName[key] || districts.find(d => {
        const dname = d.district.replace(/^\d+\s*[-–]\s*/, '').trim().toLowerCase();
        return key.includes(dname) || dname.includes(key);
      });
    };

    const svg = d3.select(el).append('svg').attr('viewBox',`0 0 ${W} ${H}`).style('width','100%');
    const g = svg.append('g');

    const projection = d3.geoIdentity().reflectY(true).fitSize([W, H-30], geoData);
    const path = d3.geoPath().projection(projection);

    // Reset button (hidden initially)
    const resetBtn = d3.select(el.parentNode).select('.district-reset');
    if (resetBtn.empty()) {
      d3.select(el.parentNode).append('div')
        .attr('class','district-reset')
        .style('display','none')
        .text('✕ Clear district filter')
        .on('click', () => {
          window.DistrictFilter.clear();
        });
    }

    const paths = g.selectAll('path.district')
      .data(geoData.features)
      .join('path')
      .attr('class','district')
      .attr('d', path)
      .attr('fill', f => {
        const match = findMatch(getName(f));
        return match ? colorScale(match.pct_foreign || 0) : '#e2e8f0';
      })
      .attr('stroke','white').attr('stroke-width',1)
      .attr('opacity',0)
      .style('cursor','pointer')
      .on('mouseenter', function(event, f) {
        const match = findMatch(getName(f));
        d3.select(this).attr('stroke-width', 2);
        if (match) {
          TT.show(`<strong>${match.district}</strong><br>
            Foreign: <strong>${Math.round(match.pct_foreign*100)}%</strong><br>
            Swiss: <strong>${Math.round(match.pct_swiss*100)}%</strong><br>
            Total: <strong>${d3.format(',')(match.pop_total)}</strong><br>
            <em style="color:#9ca3af;font-size:10px">Click to filter all charts</em>`, event);
        }
      })
      .on('mousemove', e => TT.move(e))
      .on('mouseleave', function() {
        d3.select(this).attr('stroke-width', 0.8);
        TT.hide();
      })
      .on('click', function(event, f) {
        const match = findMatch(getName(f));
        if (!match) return;
        const isSelected = window.DistrictFilter.active === match.district;
        if (isSelected) {
          window.DistrictFilter.clear();
        } else {
          window.DistrictFilter.set(match.district);
        }
      })
      .transition().duration(600).delay((_,i) => i*30)
      .attr('opacity', 0.88);

    // District labels
    g.selectAll('text.district-label')
      .data(geoData.features)
      .join('text')
      .attr('class','district-label')
      .attr('transform', f => `translate(${path.centroid(f)})`)
      .attr('text-anchor','middle').attr('font-size',10)
      .attr('fill', f => {
        const match = findMatch(getName(f));
        return match && match.pct_foreign > 0.45 ? 'white' : '#1e3a8a';
      })
      .attr('pointer-events','none')
      .text(f => getName(f).split('/')[0].trim().substring(0,12));

    // Colour legend
    const legW = Math.min(300, W-40);
    const legG = svg.append('g').attr('transform',`translate(${(W-legW)/2}, ${H-22})`);
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id','choro-grad');
    grad.append('stop').attr('offset','0%').attr('stop-color',colorScale(0.20));
    grad.append('stop').attr('offset','100%').attr('stop-color',colorScale(0.65));
    legG.append('rect').attr('width',legW).attr('height',8).attr('rx',4).attr('fill','url(#choro-grad)');
    legG.append('text').attr('x',0).attr('y',18).attr('font-size',9).attr('fill','#9ca3af').text('20% foreign');
    legG.append('text').attr('x',legW).attr('y',18).attr('text-anchor','end').attr('font-size',9).attr('fill','#9ca3af').text(`65%+ · data: ${latestYear}`);

    // React to filter changes — highlight selected district
    window.DistrictFilter.onChange(districtName => {
      const resetEl = el.parentNode.querySelector('.district-reset');
      if (resetEl) resetEl.style.display = districtName ? 'block' : 'none';

      g.selectAll('path.district')
        .attr('fill', f => {
          const match = findMatch(getName(f));
          if (!match) return '#e2e8f0';
          if (districtName && match.district === districtName) return selectedColor;
          return colorScale(match.pct_foreign || 0);
        })
        .attr('opacity', f => {
          if (!districtName) return 0.88;
          const match = findMatch(getName(f));
          return match && match.district === districtName ? 1 : 0.35;
        })
        .attr('stroke-width', f => {
          const match = findMatch(getName(f));
          return match && match.district === districtName ? 2.5 : 0.8;
        });
    });
  }

  function drawChoroplethGrid(districts, el) {
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0.20,0.65]);
    const grid = document.createElement('div'); grid.className='district-grid';
    districts.forEach(d=>{
      const pct=d.pct_foreign||0;
      const cell=document.createElement('div'); cell.className='district-cell';
      cell.style.background=colorScale(pct);
      const name=d.district.replace(/^\d+\s*[-–]\s*/,'');
      cell.innerHTML=`<span class="d-name">${name}</span><span class="d-pct">${Math.round(pct*100)}%</span>`;
      cell.addEventListener('click',()=> window.DistrictFilter.set(d.district));
      cell.addEventListener('mouseenter',e=>TT.show(`<strong>${d.district}</strong><br>Foreign: <strong>${Math.round(pct*100)}%</strong>`,e));
      cell.addEventListener('mousemove',e=>TT.move(e));
      cell.addEventListener('mouseleave',()=>TT.hide());
      grid.appendChild(cell);
    });
    const leg=document.createElement('div'); leg.className='choro-legend';
    leg.innerHTML=`<span>20%</span><div class="choro-legend-bar"></div><span>65%+</span>`;
    el.appendChild(grid); el.appendChild(leg);
  }

  function init({ cityPop, cityAge, districts, geoData, allPop }) {
    drawStackedArea(cityPop, allPop);
    drawPyramid(cityAge, 2024);
    const slider = document.getElementById('pyramid-slider');
    const label  = document.getElementById('pyramid-year-label');
    slider.addEventListener('input', () => {
      label.textContent = slider.value;
      drawPyramid(cityAge, +slider.value);
    });
    drawChoropleth(districts, geoData);
  }

  return { init };
})();