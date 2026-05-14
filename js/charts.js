/* ── Charts ────────────────────────────────────────────────
   Week tab: 4 summary tiles + line chart + contribution grid
   Month tab: 4 KPIs + practice grid (10 rows × N day cells)
──────────────────────────────────────────────────────────── */
const Charts = {
  _weekChart: null,
  _monthOffset: 0,

  /* Practices tracked in the contribution grids (10 total) */
  _practices: [
    { key: 'shaharit',      label: 'Shaharit',     test: d => d.shaharit?.done },
    { key: 'mincha',        label: 'Mincha',       test: d => d.mincha?.done },
    { key: 'arvit',         label: 'Arvit',        test: d => d.arvit?.done },
    { key: 'mikve',         label: 'Mikve',        test: d => d.mikve },
    { key: 'tehilim',       label: 'Tehilim',      test: d => d.tehilim },
    { key: 'tikoun',        label: 'Tikoun',       test: d => d.tikounHaklali },
    { key: 'torah',         label: 'Torah',        test: d => d.torahStudy?.length },
    { key: 'hitbodedut',    label: 'Hitbodedut',   test: d => d.hitbodedout?.done },
    { key: 'tzedaka',       label: 'Tzedaka',      test: d => d.charity?.done },
    { key: 'midot',         label: 'Midot',        test: d => d.midot?.some(m => m.performed) }
  ],

  /* ══════════════════════ WEEK ══════════════════════ */
  renderWeek(anchor) {
    const days = this._weekDates(anchor);
    this._renderWeekSummary(days);
    this._renderWeekChart(days);
    this._renderContributionGrid(days);
  },

  _weekDates(anchor) {
    const [y, m, d] = anchor.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const sun = new Date(dt);
    sun.setDate(dt.getDate() - dt.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(sun);
      x.setDate(sun.getDate() + i);
      return this._dateStr(x);
    });
  },

  _renderWeekSummary(days) {
    const scores = days.map(ds => Storage.computeScore(Storage.getDay(ds)));
    const recorded = scores.filter(s => s > 0);
    const avg     = recorded.length ? (recorded.reduce((a, b) => a + b, 0) / recorded.length).toFixed(1) : '—';
    const best    = scores.length ? Math.max(...scores) : 0;
    const perfect = scores.filter(s => s === 10).length;
    const totalDone = scores.reduce((a, b) => a + b, 0);

    document.getElementById('weekSummary').innerHTML = `
      <div class="summary-tile">
        <div class="summary-tile-val">${avg}</div>
        <div class="summary-tile-label">Avg Score</div>
      </div>
      <div class="summary-tile">
        <div class="summary-tile-val">${best}</div>
        <div class="summary-tile-label">Best Day</div>
      </div>
      <div class="summary-tile">
        <div class="summary-tile-val">${perfect}</div>
        <div class="summary-tile-label">10/10 Days</div>
      </div>
      <div class="summary-tile">
        <div class="summary-tile-val">${totalDone}</div>
        <div class="summary-tile-label">Total Mitzvot</div>
      </div>`;
  },

  _renderWeekChart(days) {
    const scores = days.map(ds => Storage.computeScore(Storage.getDay(ds)));
    const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const style = getComputedStyle(document.documentElement);
    const accent     = style.getPropertyValue('--accent').trim();
    const accent2    = style.getPropertyValue('--accent-2').trim();
    const textMuted  = style.getPropertyValue('--text-3').trim();
    const border     = style.getPropertyValue('--border').trim();

    if (this._weekChart) this._weekChart.destroy();

    const ctx = document.getElementById('weekChart').getContext('2d');
    this._weekChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Score',
          data: scores,
          tension: 0.35,
          borderColor: accent,
          backgroundColor: accent + '20',
          fill: true,
          borderWidth: 2,
          pointBackgroundColor: accent2,
          pointBorderColor: accent2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.parsed.y} of 10` } }
        },
        scales: {
          y: {
            min: 0, max: 10,
            grid: { color: border },
            ticks: { color: textMuted, stepSize: 2, font: { family: 'Inter' } }
          },
          x: {
            grid: { display: false },
            ticks: { color: textMuted, font: { family: 'Inter', size: 12 } }
          }
        }
      }
    });
  },

  _renderContributionGrid(days) {
    const today = this._dateStr(new Date());
    const dayHeaders = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    let html = '<div class="contrib-row-label"></div>';
    days.forEach((ds, i) => {
      const isToday = ds === today;
      html += `<div class="contrib-day-header${isToday ? ' contrib-today-marker' : ''}">${dayHeaders[i]}</div>`;
    });

    this._practices.forEach(practice => {
      html += `<div class="contrib-row-label">${practice.label}</div>`;
      days.forEach(ds => {
        const data = Storage.getDay(ds);
        const done = practice.test(data);
        const isToday = ds === today;
        html += `<div class="contrib-cell${done ? ' done' : ''}${isToday ? ' contrib-today-marker' : ''}" title="${practice.label} · ${ds}: ${done ? 'done' : '—'}"></div>`;
      });
    });

    document.getElementById('contributionGrid').innerHTML = html;
  },

  /* ══════════════════════ MONTH ══════════════════════ */
  renderMonth() {
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth() + this._monthOffset, 1);
    const year   = target.getFullYear();
    const month  = target.getMonth();

    this._renderMonthHeader(year, month);
    this._renderKpis(year, month);
    this._renderPracticeGrid(year, month);
  },

  _renderMonthHeader(year, month) {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('monthTitle').textContent = `${months[month]} ${year}`;
    const prev = document.getElementById('prevMonth');
    const next = document.getElementById('nextMonth');
    prev.onclick = () => { this._monthOffset--; this.renderMonth(); };
    next.onclick = () => { this._monthOffset++; this.renderMonth(); };
  },

  _renderKpis(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    let total = 0, recorded = 0, best = 0, totalCharity = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const data = Storage.getDay(ds);
      const s = Storage.computeScore(data);
      if (s > 0) { recorded++; total += s; if (s > best) best = s; }
      if (data.charity?.amount) totalCharity += parseFloat(data.charity.amount) || 0;
    }
    const avg = recorded ? (total / recorded).toFixed(1) : '—';

    /* Streak (back from today) */
    let streak = 0;
    let cur = new Date(today);
    while (streak < 400) {
      const ds = this._dateStr(cur);
      if (Storage.computeScore(Storage.getDay(ds)) === 0) break;
      streak++;
      cur.setDate(cur.getDate() - 1);
    }

    const currency = Storage.getSettings().currency;
    document.getElementById('kpis').innerHTML = `
      <div class="kpi">
        <div class="kpi-val">${avg}</div>
        <div class="kpi-label">Daily Average</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">${best}</div>
        <div class="kpi-label">Best Day</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">${streak}</div>
        <div class="kpi-label">Streak (days)</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">${currency}${totalCharity.toFixed(0)}</div>
        <div class="kpi-label">Tzedaka Given</div>
      </div>`;
  },

  _renderPracticeGrid(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = this._dateStr(new Date());

    let html = '';
    this._practices.forEach(practice => {
      let cells = '';
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const data = Storage.getDay(ds);
        const done = practice.test(data);
        const isToday = ds === today;
        cells += `<div class="practice-cell${done ? ' done' : ''}${isToday ? ' today-cell' : ''}" title="${practice.label} · day ${d}: ${done ? '✓' : '—'}"></div>`;
      }
      html += `
        <div class="practice-grid-row">
          <div class="practice-row-label">${practice.label}</div>
          <div class="practice-row-cells">${cells}</div>
        </div>`;
    });

    document.getElementById('practiceGrid').innerHTML = html;
  },

  /* ══════════════════════ Util ══════════════════════ */
  _dateStr(dt) {
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }
};
