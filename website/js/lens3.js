const Lens3 = (() => {
  function getW(id){ return document.getElementById(id).getBoundingClientRect().width||500; }
  function gridH(g,yScale,ticks,w){
    g.append('g').attr('class','grid').call(d3.axisLeft(yScale).tickSize(-w).tickFormat('').ticks(ticks)).call(g=>g.select('.domain').remove());
  }

  function drawGroupedBar(cityRooms,cityHH){
    const el=document.getElementById('chart-groupedbar');
    if(!el) return;
    const W=getW('chart-groupedbar'),H=340,m={t:28,r:20,b:52,l:46};
    const w=W-m.l-m.r,h=H-m.t-m.b;
    el.innerHTML='';
    const yr=d3.min([d3.max(cityRooms,d=>d.year),d3.max(cityHH,d=>d.year)]);
    const rRow=cityRooms.find(d=>d.year===yr)||cityRooms[cityRooms.length-1];
    const hRow=cityHH.find(d=>d.year===d3.max(cityHH,d=>d.year))||cityHH[cityHH.length-1];
    if(!rRow||!hRow) return;
    const rT=rRow.dw_total,hT=hRow.hh_total;
    const cats=[
      {label:'1',  supply:rRow.dw_1room/rT,  demand:hRow.hh_1person/hT},
      {label:'2',  supply:rRow.dw_2rooms/rT,  demand:0},
      {label:'3',  supply:rRow.dw_3rooms/rT,  demand:hRow.hh_2persons/hT},
      {label:'4',  supply:rRow.dw_4rooms/rT,  demand:(hRow.hh_3persons+hRow.hh_4persons)/hT},
      {label:'5',  supply:rRow.dw_5rooms/rT,  demand:hRow.hh_5persons/hT},
      {label:'6+', supply:rRow.dw_6plus/rT,   demand:hRow.hh_6plus/hT},
    ];
    const svg=d3.select(el).append('svg').attr('viewBox',`0 0 ${W} ${H}`);
    const g=svg.append('g').attr('transform',`translate(${m.l},${m.t})`);
    const x0=d3.scaleBand().domain(cats.map(d=>d.label)).range([0,w]).padding(.25);
    const x1=d3.scaleBand().domain(['supply','demand']).range([0,x0.bandwidth()]).padding(.08);
    const y=d3.scaleLinear().domain([0,d3.max(cats,d=>Math.max(d.supply,d.demand))*1.1]).range([h,0]);
    gridH(g,y,4,w);
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x0));
    g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(4).tickFormat(d=>Math.round(d*100)+'%'));
    const cols={supply:'#b91c1c',demand:'#fca5a5'};
    cats.forEach((cat,ci)=>{
      ['supply','demand'].forEach(key=>{
        if(!cat[key]) return;
        g.append('rect')
          .attr('x',x0(cat.label)+x1(key)).attr('width',x1.bandwidth())
          .attr('y',h).attr('height',0).attr('fill',cols[key]).attr('rx',2)
          .transition().delay(ci*80+200).duration(750).ease(d3.easeCubicOut)
          .attr('y',y(cat[key])).attr('height',h-y(cat[key]));
      });
    });
    g.append('text').attr('x',w/2).attr('y',h+40).attr('text-anchor','middle').attr('font-size',10).attr('fill','#9ca3af')
      .text(`Number of rooms  ·  Supply = dwellings ${rRow.year}, Demand = households ${hRow.year}`);
    const leg=svg.append('g').attr('transform',`translate(${m.l+6},${m.t-18})`);
    [['Supply (dwellings)','#b91c1c'],['Demand (households)','#fca5a5']].forEach(([lbl,col],i)=>{
      const gx=leg.append('g').attr('transform',`translate(${i*155},0)`);
      gx.append('rect').attr('width',12).attr('height',12).attr('rx',2).attr('fill',col);
      gx.append('text').attr('x',16).attr('y',10).attr('font-size',10).attr('fill','#374151').text(lbl);
    });
  }

  function drawSurface(citySurf){
    const el=document.getElementById('chart-surface');
    if(!el) return;
    const W=getW('chart-surface'),H=340,m={t:28,r:20,b:36,l:46};
    const w=W-m.l-m.r,h=H-m.t-m.b;
    el.innerHTML='';
    if(!citySurf.length) return;
    const svg=d3.select(el).append('svg').attr('viewBox',`0 0 ${W} ${H}`);
    const g=svg.append('g').attr('transform',`translate(${m.l},${m.t})`);
    const keys=['dw_lt40','dw_40_59','dw_60_79','dw_80_99','dw_100_119','dw_120_159','dw_160plus'];
    const labels=['<40m²','40–59','60–79','80–99','100–119','120–159','160+'];
    const data=citySurf.map(d=>{const r={year:d.year};keys.forEach(k=>r[k]=(d[k]||0)/d.dw_total);return r;});
    const x=d3.scaleLinear().domain(d3.extent(data,d=>d.year)).range([0,w]);
    const y=d3.scaleLinear().domain([0,1]).range([h,0]);
    gridH(g,y,4,w);
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).ticks(7).tickFormat(d3.format('d')));
    g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(4).tickFormat(d=>Math.round(d*100)+'%'));
    const series=d3.stack().keys(keys)(data);
    const color=d3.scaleSequential(d3.interpolateReds).domain([-1,keys.length]);
    const area=d3.area().x(d=>x(d.data.year)).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveCatmullRom);
    g.selectAll('.sa').data(series).join('path').attr('class','sa')
      .attr('fill',(_,i)=>color(i)).attr('opacity',0).attr('d',area)
      .transition().delay((_,i)=>i*80).duration(800).ease(d3.easeQuadOut).attr('opacity',.88);
    const leg=svg.append('g').attr('transform',`translate(${m.l},${H-4})`);
    labels.forEach((lbl,i)=>{
      leg.append('rect').attr('x',i*50).attr('y',-10).attr('width',10).attr('height',10).attr('rx',2).attr('fill',color(i));
      leg.append('text').attr('x',i*50+13).attr('y',-1).attr('font-size',9).attr('fill','#6b7280').text(lbl);
    });
  }

  function init({cityRooms,cityHH,citySurf}){
    drawGroupedBar(cityRooms,cityHH);
    drawSurface(citySurf);
  }
  return {init};
})();