const Lens3 = (() => {
  function getW(id){ return document.getElementById(id).getBoundingClientRect().width||500; }
  function gridH(g,yScale,ticks,w){
    g.append('g').attr('class','grid').call(d3.axisLeft(yScale).tickSize(-w).tickFormat('').ticks(ticks)).call(g=>g.select('.domain').remove());
  }
  function drawLine(node,dur=1400,delay=0){
    const len=node.getTotalLength();
    d3.select(node).attr('stroke-dasharray',len).attr('stroke-dashoffset',len)
      .transition().delay(delay).duration(dur).ease(d3.easeQuadOut).attr('stroke-dashoffset',0);
  }

  function drawGapArea(gapData){
    const el=document.getElementById('chart-gap');
    const W=getW('chart-gap'),H=300,m={t:36,r:148,b:40,l:52};
    const w=W-m.l-m.r,h=H-m.t-m.b;
    el.innerHTML='';
    const svg=d3.select(el).append('svg').attr('viewBox',`0 0 ${W} ${H}`);
    const g=svg.append('g').attr('transform',`translate(${m.l},${m.t})`);
    const all=gapData.flatMap(d=>[d.pct_1person,d.pct_small_dw]);
    const x=d3.scaleLinear().domain(d3.extent(gapData,d=>d.year)).range([0,w]);
    const y=d3.scaleLinear().domain([d3.min(all)*.96,d3.max(all)*1.02]).range([h,0]);
    gridH(g,y,5,w);
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).ticks(7).tickFormat(d3.format('d')));
    g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(5).tickFormat(d=>Math.round(d*100)+'%'));
    // gap fill (animated)
    g.append('path').datum(gapData)
      .attr('fill','#b91c1c').attr('opacity',0)
      .attr('d',d3.area().x(d=>x(d.year)).y0(d=>y(d.pct_small_dw)).y1(d=>y(d.pct_1person)).curve(d3.curveCatmullRom))
      .transition().delay(700).duration(900).attr('opacity',.15);
    // demand line (solid)
    const demL=d3.line().x(d=>x(d.year)).y(d=>y(d.pct_1person)).curve(d3.curveCatmullRom);
    const p1=g.append('path').datum(gapData).attr('fill','none').attr('stroke','#b91c1c').attr('stroke-width',2.8).attr('d',demL);
    drawLine(p1.node(),1400,0);
    // supply line (dashed)
    const supL=d3.line().x(d=>x(d.year)).y(d=>y(d.pct_small_dw)).curve(d3.curveCatmullRom);
    const p2=g.append('path').datum(gapData).attr('fill','none').attr('stroke','#b91c1c').attr('stroke-width',2).attr('stroke-dasharray','6,3').attr('opacity',.7).attr('d',supL);
    drawLine(p2.node(),1400,300);
    // dots
    g.selectAll('.dd').data(gapData).join('circle').attr('class','dd').attr('cx',d=>x(d.year)).attr('cy',d=>y(d.pct_1person)).attr('r',3.5).attr('fill','white').attr('stroke','#b91c1c').attr('stroke-width',2);
    // gap annotation
    const mid=gapData[Math.floor(gapData.length*.62)];
    if(mid){
      const mx=x(mid.year),y1a=y(mid.pct_1person),y2a=y(mid.pct_small_dw);
      g.append('line').attr('x1',mx+8).attr('x2',mx+8).attr('y1',y1a).attr('y2',y2a).attr('stroke','#c2410c').attr('stroke-width',1.5);
      g.append('text').attr('x',mx+12).attr('y',(y1a+y2a)/2+4).attr('font-size',10).attr('font-weight','700').attr('fill','#c2410c').text(`+${Math.round(mid.gap*100)}pp gap`);
    }
    // end labels
    const last=gapData[gapData.length-1];
    g.append('text').attr('x',x(last.year)+8).attr('y',y(last.pct_1person)+4).attr('font-size',10).attr('fill','#b91c1c').attr('font-weight','600').text(`1-person HH: ${Math.round(last.pct_1person*100)}%`);
    g.append('text').attr('x',x(last.year)+8).attr('y',y(last.pct_small_dw)+4).attr('font-size',10).attr('fill','#b91c1c').attr('opacity',.75).text(`1–2 room apts: ${Math.round(last.pct_small_dw*100)}%`);
    // legend
    const leg=svg.append('g').attr('transform',`translate(${m.l+6},${m.t-22})`);
    [['1-person household share (demand)',false],['1–2 room dwelling share (supply)',true]].forEach(([lbl,dash],i)=>{
      const gx=leg.append('g').attr('transform',`translate(${i*218},0)`);
      gx.append('line').attr('x1',0).attr('y1',5).attr('x2',20).attr('y2',5).attr('stroke','#b91c1c').attr('stroke-width',dash?2:2.8).attr('stroke-dasharray',dash?'5,2':'none').attr('opacity',dash?.7:1);
      gx.append('text').attr('x',24).attr('y',9).attr('font-size',10).attr('fill','#374151').text(lbl);
    });
    // hover
    const bisect=d3.bisector(d=>d.year).left;
    const vl=g.append('line').attr('y1',0).attr('y2',h).attr('stroke','#d1d5db').attr('stroke-width',1).attr('stroke-dasharray','3,2').attr('opacity',0);
    svg.append('rect').attr('fill','none').attr('pointer-events','all').attr('x',m.l).attr('y',m.t).attr('width',w).attr('height',h)
      .on('mousemove',function(event){
        const [mx]=d3.pointer(event,this),xv=x.invert(mx-m.l),i=bisect(gapData,xv,1),d0=gapData[i-1],d1=gapData[i]||d0;
        const d=Math.abs(xv-d0.year)<Math.abs(xv-d1.year)?d0:d1;
        vl.attr('x1',x(d.year)).attr('x2',x(d.year)).attr('opacity',1);
        TT.show(`<strong>${d.year}</strong><br>1-person HH: <strong>${Math.round(d.pct_1person*100)}%</strong><br>1–2 room apts: <strong>${Math.round(d.pct_small_dw*100)}%</strong><br>Gap: <strong>+${Math.round(d.gap*100)}pp</strong>`,event);
      }).on('mouseleave',()=>{vl.attr('opacity',0);TT.hide();});
  }

  function drawGroupedBar(cityRooms,cityHH){
    const el=document.getElementById('chart-groupedbar');
    const W=getW('chart-groupedbar'),H=280,m={t:28,r:20,b:52,l:46};
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
    const W=getW('chart-surface'),H=280,m={t:28,r:20,b:36,l:46};
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
    // legend
    const leg=svg.append('g').attr('transform',`translate(${m.l},${H-4})`);
    labels.forEach((lbl,i)=>{
      leg.append('rect').attr('x',i*50).attr('y',-10).attr('width',10).attr('height',10).attr('rx',2).attr('fill',color(i));
      leg.append('text').attr('x',i*50+13).attr('y',-1).attr('font-size',9).attr('fill','#6b7280').text(lbl);
    });
  }

  function init({gapData,cityRooms,cityHH,citySurf}){
    drawGapArea(gapData);
    drawGroupedBar(cityRooms,cityHH);
    drawSurface(citySurf);
  }
  return {init};
})();