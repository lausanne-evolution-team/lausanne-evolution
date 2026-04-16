const Lens2 = (() => {
  function getW(id){ return document.getElementById(id).getBoundingClientRect().width||500; }
  function gridH(g,yScale,ticks,w){
    g.append('g').attr('class','grid').call(d3.axisLeft(yScale).tickSize(-w).tickFormat('').ticks(ticks)).call(g=>g.select('.domain').remove());
  }
  function drawLine(node,dur=1200,delay=0){
    const len=node.getTotalLength();
    d3.select(node).attr('stroke-dasharray',len).attr('stroke-dashoffset',len)
      .transition().delay(delay).duration(dur).ease(d3.easeQuadOut).attr('stroke-dashoffset',0);
  }

  function drawDualLine(cityHH){
    const el=document.getElementById('chart-dualline');
    const W=getW('chart-dualline'),H=280,m={t:28,r:64,b:36,l:46};
    const w=W-m.l-m.r,h=H-m.t-m.b;
    el.innerHTML='';
    const svg=d3.select(el).append('svg').attr('viewBox',`0 0 ${W} ${H}`);
    const g=svg.append('g').attr('transform',`translate(${m.l},${m.t})`);
    const seen=new Set();
    const data=cityHH.filter(d=>{if(seen.has(d.year))return false;seen.add(d.year);return true;});
    const x=d3.scaleLinear().domain(d3.extent(data,d=>d.year)).range([0,w]);
    const yL=d3.scaleLinear().domain([d3.min(data,d=>d.pct_1person)*.96,d3.max(data,d=>d.pct_1person)*1.02]).range([h,0]);
    const meanExt=d3.extent(data,d=>+d.hh_mean_size);
    const yR=d3.scaleLinear().domain([meanExt[0]*.97,meanExt[1]*1.01]).range([h,0]);
    gridH(g,yL,5,w);
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).ticks(7).tickFormat(d3.format('d')));
    g.append('g').attr('class','axis').call(d3.axisLeft(yL).ticks(5).tickFormat(d=>Math.round(d*100)+'%'));
    g.append('g').attr('class','axis').attr('transform',`translate(${w},0)`).call(d3.axisRight(yR).ticks(4).tickFormat(d=>d.toFixed(2)));
    // area fill
    g.append('path').datum(data)
      .attr('fill','#047857').attr('opacity',0)
      .attr('d',d3.area().x(d=>x(d.year)).y0(h).y1(d=>yL(d.pct_1person)).curve(d3.curveCatmullRom))
      .transition().delay(400).duration(800).attr('opacity',.08);
    // 1-person line
    const l1fn=d3.line().x(d=>x(d.year)).y(d=>yL(d.pct_1person)).curve(d3.curveCatmullRom);
    const p1=g.append('path').datum(data).attr('fill','none').attr('stroke','#047857').attr('stroke-width',2.5).attr('d',l1fn);
    drawLine(p1.node(),1200,0);
    // mean size line
    const l2fn=d3.line().x(d=>x(d.year)).y(d=>yR(+d.hh_mean_size)).curve(d3.curveCatmullRom);
    const p2=g.append('path').datum(data).attr('fill','none').attr('stroke','#047857').attr('stroke-width',1.5).attr('stroke-dasharray','5,3').attr('opacity',.55).attr('d',l2fn);
    drawLine(p2.node(),1200,200);
    // dots
    g.selectAll('.d1').data(data).join('circle').attr('class','d1').attr('cx',d=>x(d.year)).attr('cy',d=>yL(d.pct_1person)).attr('r',3.5).attr('fill','white').attr('stroke','#047857').attr('stroke-width',1.8);
    // legend
    const leg=svg.append('g').attr('transform',`translate(${m.l+6},${m.t-16})`);
    [['1-person HH%','#047857',false],['Mean HH size','#047857',true]].forEach(([lbl,col,dash],i)=>{
      const gx=leg.append('g').attr('transform',`translate(${i*130},0)`);
      gx.append('line').attr('x1',0).attr('y1',5).attr('x2',18).attr('y2',5).attr('stroke',col).attr('stroke-width',dash?1.5:2.5).attr('stroke-dasharray',dash?'4,2':'none').attr('opacity',dash?.6:1);
      gx.append('text').attr('x',22).attr('y',9).attr('font-size',10).attr('fill','#374151').text(lbl);
    });
    // hover
    const bisect=d3.bisector(d=>d.year).left;
    const vl=g.append('line').attr('y1',0).attr('y2',h).attr('stroke','#d1d5db').attr('stroke-width',1).attr('stroke-dasharray','3,2').attr('opacity',0);
    svg.append('rect').attr('fill','none').attr('pointer-events','all').attr('x',m.l).attr('y',m.t).attr('width',w).attr('height',h)
      .on('mousemove',function(event){
        const [mx]=d3.pointer(event,this),xv=x.invert(mx-m.l),i=bisect(data,xv,1),d0=data[i-1],d1=data[i]||d0;
        const d=Math.abs(xv-d0.year)<Math.abs(xv-d1.year)?d0:d1;
        vl.attr('x1',x(d.year)).attr('x2',x(d.year)).attr('opacity',1);
        TT.show(`<strong>${d.year}</strong><br>1-person HH: <strong>${Math.round(d.pct_1person*100)}%</strong><br>Mean size: <strong>${(+d.hh_mean_size).toFixed(2)} persons</strong>`,event);
      }).on('mouseleave',()=>{vl.attr('opacity',0);TT.hide();});
  }

  function drawEmployment(cityEmp){
    const el=document.getElementById('chart-employment');
    const W=getW('chart-employment'),H=280,m={t:28,r:20,b:36,l:52};
    const w=W-m.l-m.r,h=H-m.t-m.b;
    el.innerHTML='';
    const svg=d3.select(el).append('svg').attr('viewBox',`0 0 ${W} ${H}`);
    const g=svg.append('g').attr('transform',`translate(${m.l},${m.t})`);
    const data=cityEmp;
    const all=data.flatMap(d=>[d.pct_jobs_women,d.pct_fte_women]);
    const x=d3.scaleLinear().domain(d3.extent(data,d=>d.year)).range([0,w]);
    const y=d3.scaleLinear().domain([d3.min(all)*.975,d3.max(all)*1.015]).range([h,0]);
    gridH(g,y,5,w);
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.format('d')));
    g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(5).tickFormat(d=>Math.round(d*100)+'%'));
    // gap fill
    g.append('path').datum(data)
      .attr('fill','#047857').attr('opacity',0)
      .attr('d',d3.area().x(d=>x(d.year)).y0(d=>y(d.pct_fte_women)).y1(d=>y(d.pct_jobs_women)).curve(d3.curveCatmullRom))
      .transition().delay(500).duration(800).attr('opacity',.12);
    // lines
    [{key:'pct_jobs_women',dash:false,op:1},{key:'pct_fte_women',dash:true,op:.7}].forEach(({key,dash,op},idx)=>{
      const lf=d3.line().x(d=>x(d.year)).y(d=>y(d[key])).curve(d3.curveCatmullRom);
      const p=g.append('path').datum(data).attr('fill','none').attr('stroke','#047857').attr('stroke-width',dash?1.5:2.5).attr('stroke-dasharray',dash?'5,3':'none').attr('opacity',op).attr('d',lf);
      drawLine(p.node(),1200,idx*200);
      g.selectAll(`.dot-${idx}`).data(data).join('circle').attr('class',`dot-${idx}`).attr('cx',d=>x(d.year)).attr('cy',d=>y(d[key])).attr('r',3.5).attr('fill','white').attr('stroke','#047857').attr('stroke-width',1.8).attr('opacity',op);
    });
    // gap annotation
    const last=data[data.length-1];
    const midY=(y(last.pct_jobs_women)+y(last.pct_fte_women))/2;
    g.append('line').attr('x1',x(last.year)+4).attr('x2',x(last.year)+4).attr('y1',y(last.pct_jobs_women)).attr('y2',y(last.pct_fte_women)).attr('stroke','#047857').attr('stroke-width',1);
    g.append('text').attr('x',x(last.year)+8).attr('y',midY+3).attr('font-size',9).attr('fill','#047857').text(`gap: ${Math.round(last.gender_fte_gap*100)}pp`);
    // legend
    const leg=svg.append('g').attr('transform',`translate(${m.l+6},${m.t-16})`);
    [['Headcount %',false],['FTE %',true]].forEach(([lbl,dash],i)=>{
      const gx=leg.append('g').attr('transform',`translate(${i*110},0)`);
      gx.append('line').attr('x1',0).attr('y1',5).attr('x2',18).attr('y2',5).attr('stroke','#047857').attr('stroke-width',dash?1.5:2.5).attr('stroke-dasharray',dash?'4,2':'none').attr('opacity',dash?.7:1);
      gx.append('text').attr('x',22).attr('y',9).attr('font-size',10).attr('fill','#374151').text(lbl);
    });
    // hover
    const bisect=d3.bisector(d=>d.year).left;
    const vl=g.append('line').attr('y1',0).attr('y2',h).attr('stroke','#d1d5db').attr('stroke-width',1).attr('stroke-dasharray','3,2').attr('opacity',0);
    svg.append('rect').attr('fill','none').attr('pointer-events','all').attr('x',m.l).attr('y',m.t).attr('width',w).attr('height',h)
      .on('mousemove',function(event){
        const [mx]=d3.pointer(event,this),xv=x.invert(mx-m.l),i=bisect(data,xv,1),d0=data[i-1],d1=data[i]||d0;
        const d=Math.abs(xv-d0.year)<Math.abs(xv-d1.year)?d0:d1;
        vl.attr('x1',x(d.year)).attr('x2',x(d.year)).attr('opacity',1);
        TT.show(`<strong>${d.year}</strong><br>Headcount: <strong>${Math.round(d.pct_jobs_women*100)}%</strong><br>FTE: <strong>${Math.round(d.pct_fte_women*100)}%</strong><br>Gap: <strong>${Math.round(d.gender_fte_gap*100)}pp</strong>`,event);
      }).on('mouseleave',()=>{vl.attr('opacity',0);TT.hide();});
  }

  function init({cityHH,cityEmp}){
    drawDualLine(cityHH);
    drawEmployment(cityEmp);
  }
  return {init};
})();