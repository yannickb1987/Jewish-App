/* ── App Controller ─────────────────────────────────────────
   Hero rendering, intention line, theme toggle, tab routing.
──────────────────────────────────────────────────────────── */
const App = {
  currentDate: _todayStr(),
  activeTab:   'today',
  _hebrewDay:  null,

  async init() {
    this._initTheme();
    this._bindTabNav();
    this._bindDateNav();
    this._bindThemeToggle();
    document.body.setAttribute('data-active-tab', 'today');
    await this._updateHero();
    this._showTab('today');
  },

  /* ── Theme ── */
  _initTheme() {
    const saved = localStorage.getItem('tracker_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  },
  _bindThemeToggle() {
    document.getElementById('themeToggle').addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      let next;
      if (!cur) next = sysDark ? 'light' : 'dark';
      else      next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('tracker_theme', next);
      // Re-render charts if visible (color-dependent)
      if (this.activeTab === 'week')  Charts.renderWeek(this.currentDate);
      if (this.activeTab === 'month') Charts.renderMonth(this.currentDate);
    });
  },

  /* ── Date Navigation ── */
  _bindDateNav() {
    document.getElementById('prevDay').addEventListener('click', () => {
      this.currentDate = _offsetDate(this.currentDate, -1);
      this._onDateChange();
    });
    document.getElementById('nextDay').addEventListener('click', () => {
      const next = _offsetDate(this.currentDate, 1);
      if (next <= _todayStr()) {
        this.currentDate = next;
        this._onDateChange();
      }
    });
    document.getElementById('goToday').addEventListener('click', () => {
      this.currentDate = _todayStr();
      this._onDateChange();
    });
  },
  async _onDateChange() {
    await this._updateHero();
    const tab = this.activeTab;
    if (tab === 'today')   Tracker.render(this.currentDate);
    if (tab === 'week')    Charts.renderWeek(this.currentDate);
    if (tab === 'content') this._renderDailyContent();
  },

  /* ── Tabs ── */
  _bindTabNav() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => this._showTab(btn.dataset.tab));
    });
  },
  _showTab(tabName) {
    this.activeTab = tabName;
    document.body.setAttribute('data-active-tab', tabName);

    document.querySelectorAll('.panel').forEach(p =>
      p.classList.toggle('active', p.dataset.tab === tabName)
    );
    document.querySelectorAll('.tab').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tabName)
    );

    switch (tabName) {
      case 'today':   Tracker.render(this.currentDate);     break;
      case 'week':    Charts.renderWeek(this.currentDate);  break;
      case 'month':   Charts.renderMonth(this.currentDate); break;
      case 'content': this._renderDailyContent();           break;
      case 'siddur':  Siddur.render();                      break;
    }
  },

  /* ── Hero ── */
  async _updateHero() {
    document.getElementById('gregDateDisplay').textContent =
      HebrewCal.formatGregorianDate(this.currentDate);

    document.getElementById('hebrewDateDisplay').textContent = '…';
    document.getElementById('parashaDisplay').textContent = '';

    const { hebrewDate, parasha } = await HebrewCal.init(this.currentDate);

    const heEl = document.getElementById('hebrewDateDisplay');
    if (hebrewDate?.hebrew) {
      heEl.textContent = hebrewDate.hebrew;
      this._hebrewDay = hebrewDate.hd;
    } else {
      heEl.textContent = '—';
    }

    const pEl = document.getElementById('parashaDisplay');
    if (parasha) {
      const txt = parasha.startsWith('פרשת') ? parasha : `פרשת ${parasha}`;
      pEl.textContent = txt;
    } else {
      pEl.textContent = '';
    }

    document.getElementById('heroIntention').textContent = this._getIntention();
  },

  /* ── Intention rotation ── */
  _getIntention() {
    const [y, m, d] = this.currentDate.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    const intentions = [
      'Begin the week with renewed purpose.',           // Sunday
      'Every act of service builds the world.',          // Monday
      'Speak words that elevate today.',                 // Tuesday
      'Find the holy in the ordinary.',                  // Wednesday
      'Open your heart to gratitude.',                   // Thursday
      'Prepare your soul for Shabbat.',                  // Friday
      'Rest in the light of the day.'                    // Saturday
    ];
    return intentions[dow];
  },

  /* ── Daily Content ── */
  _renderDailyContent() {
    this._renderTehilim();
    this._renderHalachot();
  },

  _renderTehilim() {
    const hd    = this._hebrewDay || 1;
    const entry = Tehilim.getForHebrewDay(hd);
    const url   = `https://www.sefaria.org/${entry.ref}?lang=he`;

    document.getElementById('tehilimDay').textContent   = `Day ${hd}`;
    document.getElementById('tehilimRange').textContent = `Psalms ${entry.psalms}`;
    document.getElementById('tehilimHe').textContent    = entry.label;
    document.getElementById('tehilimLink').href         = url;
  },

  async _renderHalachot() {
    const body = document.getElementById('halachotBody');
    body.innerHTML = '<div class="loading"><span class="spinner"></span> Loading halachot…</div>';

    try {
      const halachot = await Sefaria.fetchDailyHalachot(this.currentDate);
      if (!halachot || !halachot.length) {
        body.innerHTML = '<div class="empty-state">Could not load halachot right now.</div>';
        return;
      }
      body.innerHTML = halachot.map(h => `
        <div class="halacha-item">
          <div class="halacha-chapter">Chapter ${h.chapter}</div>
          ${h.heTitle ? `<div class="halacha-title" dir="rtl">${h.heTitle}</div>` : ''}
          ${h.text ? `<div class="halacha-text">${_truncate(h.text, 360)}</div>` : ''}
          <a class="content-cta" href="${h.url}" target="_blank">
            Read more in Sefaria <span class="cta-arrow">↗</span>
          </a>
        </div>`).join('');
    } catch {
      body.innerHTML = '<div class="empty-state">Error loading halachot.</div>';
    }
  }
};

/* ── Helpers ── */
function _todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
function _offsetDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
function _truncate(s, n) { return s.length > n ? s.substring(0, n) + '…' : s; }

/* Expose helpers globally */
window._todayStr   = _todayStr;
window._offsetDate = _offsetDate;

document.addEventListener('DOMContentLoaded', () => App.init());
