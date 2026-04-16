const Lens1 = (() => {
  function getW(id) {
    return document.getElementById(id).getBoundingClientRect().width || 500;
  }
  function gridH(g, yScale, ticks, w) {
    g.append('g').attr('class','grid')
     .call(d3.axisLeft(yScale).tickSize(-w).tickFormat('').ticks(ticks))
     .call(g => g.select('.domain').remove());
  }

  function drawStackedArea(cityPop) {
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
    g.selectAll('.ap').data(series).join('path').attr('class','ap')
      .attr('fill',d=>colors[d.key]).attr('opacity',0).attr('d',area)
      .transition().delay((_,i)=>i*180).duration(900).ease(d3.easeQuadOut).attr('opacity',0.88);
    const leg = svg.append('g').attr('transform',`translate(${m.l+8},${m.t+4})`);
    Object.entries(labels).forEach(([k,lbl],i) => {
      const gx = leg.append('g').attr('transform',`translate(${i*90},0)`);
      gx.append('rect').attr('width',12).attr('height',12).attr('rx',2).attr('fill',colors[k]);
      gx.append('text').attr('x',16).attr('y',10).attr('font-size',11).attr('fill','#374151').text(lbl);
    });
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
  }

  function drawPyramid(popAge, year) {
    const el = document.getElementById('chart-pyramid');
    const W = getW('chart-pyramid'), H = 220;
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

  function drawChoropleth(districts) {
    const el = document.getElementById('chart-choropleth');
    if(!districts.length){el.innerHTML='<div style="padding:20px;color:#9ca3af">No district data</div>';return;}
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0.20,0.65]);
    const grid = document.createElement('div'); grid.className='district-grid';
    districts.forEach(d=>{
      const pct=d.pct_foreign||0;
      const cell=document.createElement('div'); cell.className='district-cell';
      cell.style.background=colorScale(pct);
      const name=d.district.replace(/^\d+\s*[-–]\s*/,'');
      cell.innerHTML=`<span class="d-name">${name}</span><span class="d-pct">${Math.round(pct*100)}%</span>`;
      cell.addEventListener('mouseenter',e=>TT.show(`<strong>${d.district}</strong><br>Foreign: <strong>${Math.round(pct*100)}%</strong><br>Swiss: <strong>${Math.round(d.pct_swiss*100)}%</strong><br>Total: <strong>${d3.format(',')(d.pop_total)}</strong>`,e));
      cell.addEventListener('mousemove',e=>TT.move(e));
      cell.addEventListener('mouseleave',()=>TT.hide());
      grid.appendChild(cell);
    });
    const leg=document.createElement('div'); leg.className='choro-legend';
    leg.innerHTML=`<span>20%</span><div class="choro-legend-bar"></div><span>65%+</span><span style="margin-left:8px;color:#9ca3af">foreign-born share by district (${d3.max(districts,d=>d.year)})</span>`;
    el.innerHTML=''; el.appendChild(grid); el.appendChild(leg);
  }

  function init({cityPop,cityAge,districts}){
    drawStackedArea(cityPop);
    drawPyramid(cityAge,2024);
    const slider=document.getElementById('pyramid-slider');
    const label=document.getElementById('pyramid-year-label');
    slider.addEventListener('input',()=>{label.textContent=slider.value;drawPyramid(cityAge,+slider.value);});
    drawChoropleth(districts);
  }
  return {init};
})();
