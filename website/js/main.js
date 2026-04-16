/* ============================================================
   main.js — Load all data, populate hero, init all lenses
   ============================================================ */

const DATA_PATH = '../data/processed/';

/* shared tooltip helper */
const tooltip = {
  el: document.getElementById('tooltip'),
  show(html, event) {
    this.el.innerHTML = html;
    this.el.classList.add('visible');
    this.move(event);
  },
  move(event) {
    const x = event.clientX, y = event.clientY;
    const w = this.el.offsetWidth, h = this.el.offsetHeight;
    const vw = window.innerWidth,  vh = window.innerHeight;
    this.el.style.left = (x + 14 + w > vw ? x - w - 14 : x + 14) + 'px';
    this.el.style.top  = (y + 14 + h > vh ? y - h - 14 : y + 14) + 'px';
  },
  hide() { this.el.classList.remove('visible'); },
};

window.TT = tooltip;   /* make accessible to lens files */

/* ── Load all CSVs in parallel ───────────────────────────────────── */
Promise.all([
  d3.csv(DATA_PATH + 'pop_origin.csv',        d3.autoType),
  d3.csv(DATA_PATH + 'pop_age.csv',           d3.autoType),
  d3.csv(DATA_PATH + 'households.csv',        d3.autoType),
  d3.csv(DATA_PATH + 'employment.csv',        d3.autoType),
  d3.csv(DATA_PATH + 'dwellings_rooms.csv',   d3.autoType),
  d3.csv(DATA_PATH + 'dwellings_surface.csv', d3.autoType),
]).then(([popOrigin, popAge, households, employment, dwRooms, dwSurface]) => {

  const CITY = 'Ville de Lausanne';
  const byCity  = d => d.district === CITY;
  const byYear  = (a, b) => a.year - b.year;

  /* city-level time series */
  const cityPop    = popOrigin.filter(byCity).sort(byYear);
  const cityAge    = popAge.filter(byCity).sort(byYear);
  const cityHH     = households.filter(byCity).sort(byYear);
  const cityEmp    = employment.filter(byCity).sort(byYear);
  const cityRooms  = dwRooms.filter(byCity).sort(byYear);
  const citySurf   = dwSurface.filter(byCity).sort(byYear);

  /* district-level for choropleth — latest year only */
  const latestPopYear = d3.max(popOrigin, d => d.year);
  const districts = popOrigin
    .filter(d => d.year === latestPopYear && d.district !== CITY)
    .filter(d => /^\d{1,2}\s*[-–]/.test(d.district))   /* top-level quartiers only */
    .filter(d => !d.district.startsWith('99'))           /* remove Adresses inconnues */
    .sort((a, b) => d3.ascending(a.district, b.district));

  /* gap data: join households + rooms by year */
  const roomsByYear = Object.fromEntries(cityRooms.map(d => [d.year, d]));
  const gapData = cityHH
    .filter(d => roomsByYear[d.year])
    .map(d => ({
      year:        d.year,
      pct_1person: d.pct_1person,
      pct_small_dw:roomsByYear[d.year].pct_small_dw,
      gap:         +(d.pct_1person - roomsByYear[d.year].pct_small_dw).toFixed(4),
    }));

  /* bundle everything */
  const data = {
    cityPop, cityAge, cityHH, cityEmp, cityRooms, citySurf,
    districts, gapData,
  };

  /* ── populate hero stats ──────────────────────────────────────── */
  const latest = cityPop[cityPop.length - 1];
  const latestHH = cityHH[cityHH.length - 1];
  const latestRooms = cityRooms[cityRooms.length - 1];
  const gap2024 = gapData[gapData.length - 1];

  const fmt = d3.format('.0%');
  const statItems = [
    { num: fmt(latest.pct_foreign),       label: 'of residents are foreign-born (' + latest.year + ')' },
    { num: fmt(latestHH.pct_1person),     label: 'of households are 1-person (' + latestHH.year + ')' },
    { num: latestHH.hh_mean_size.toFixed(2), label: 'average household size (persons)' },
    { num: '+' + fmt(gap2024.gap),        label: 'gap: 1-person HH% minus small apt% (' + gap2024.year + ')' },
  ];

  document.getElementById('hero-stats').innerHTML = statItems
    .map(s => `<div class="stat">
      <div class="stat-num">${s.num}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');

  /* ── init all lenses ─────────────────────────────────────────── */
  Lens1.init(data);
  Lens2.init(data);
  Lens3.init(data);

}).catch(err => {
  console.error('Data loading error:', err);
  document.body.innerHTML = `
    <div style="padding:60px; font-family:sans-serif; color:#dc2626;">
      <h2>Could not load data</h2>
      <p>Make sure you are running a local server from the repo root.<br>
      Try: <code>python -m http.server 8000</code> then open
      <a href="http://localhost:8000/website/">http://localhost:8000/website/</a></p>
      <pre style="margin-top:16px; font-size:12px;">${err}</pre>
    </div>`;
});