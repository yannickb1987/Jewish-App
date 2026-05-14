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
    this._bindReaderTriggers();
    Reader.init();
    document.body.setAttribute('data-active-tab', 'today');
    await this._updateHero();
    this._showTab('today');
  },

  /* ── Reader triggers (Tehilim, Tikoun, Halacha) ── */
  _bindReaderTriggers() {
    document.getElementById('tehilimRead').addEventListener('click', () => this._openTehilimReader());
    document.getElementById('tikounRead').addEventListener('click',   () => this._openTikounReader());
  },

  _openTehilimReader() {
    const hd    = this._hebrewDay || 1;
    const entry = Tehilim.getForHebrewDay(hd);
    Reader.open({
      eyebrow:     `Psalms of the Day · Day ${hd}`,
      title:       `Psalms ${entry.psalms}`,
      heTitle:     `תהילים ${entry.label}`,
      refs:        [entry.ref],
      action:      'tehilim',
      actionLabel: 'Mark Tehilim complete'
    });
  },

  _openTikounReader() {
    const refs = Tehilim.tikounHaklali.nums.map(n => `Psalms.${n}`);
    Reader.open({
      eyebrow:     'Tikoun Haklali',
      title:       'The Ten Psalms of General Rectification',
      heTitle:     'תִּקּוּן הַכְּלָלִי',
      refs,
      action:      'tikounHaklali',
      actionLabel: 'Mark Tikoun complete'
    });
  },

  _openHalachaReader(halacha) {
    Reader.open({
      eyebrow:     'Daily Halacha · Kitzur Shulchan Aruch',
      title:       `Chapter ${halacha.chapter}`,
      heTitle:     halacha.heTitle || '',
      refs:        [halacha.ref],
      action:      null
    });
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
      body.innerHTML = halachot.map((h, i) => `
        <div class="halacha-item">
          <div class="halacha-chapter">Chapter ${h.chapter}</div>
          ${h.heTitle ? `<div class="halacha-title" dir="rtl">${h.heTitle}</div>` : ''}
          ${h.text ? `<div class="halacha-text">${_truncate(h.text, 360)}</div>` : ''}
          <div class="content-actions" style="margin-top:8px">
            <button class="content-cta content-cta--primary" data-halacha-read="${i}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              Read Full Chapter
            </button>
            <a class="content-cta content-cta--secondary" href="${h.url}" target="_blank">Sefaria <span class="cta-arrow">↗</span></a>
          </div>
        </div>`).join('');

      body.querySelectorAll('[data-halacha-read]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.halachaRead);
          this._openHalachaReader(halachot[i]);
        });
      });
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
