/* ── App Controller ─────────────────────────────────────────
   Tab routing (top + bottom), greeting, time-aware intentions,
   theme toggle, auth state, install prompt.
──────────────────────────────────────────────────────────── */
const App = {
  currentDate: _todayStr(),
  activeTab:   'today',
  _hebrewDay:  null,
  _installEvent: null,

  async init() {
    this._initTheme();
    this._bindTabNav();
    this._bindDateNav();
    this._bindThemeToggle();
    this._bindReaderTriggers();
    this._bindProfileChip();
    this._bindAuthRows();
    this._bindLocationRows();
    this._bindInstallPrompt();
    this._bindKanbanSegmented();
    Reader.init();

    /* Auth — sets up Firestore sync triggers */
    if (typeof Auth !== 'undefined') {
      Auth.init();
      Auth.onChange((user) => this._onAuthChange(user));
    }

    /* Onboarding (after Auth is wired so sign-in step works) */
    if (typeof Onboarding !== 'undefined') Onboarding.init();

    document.body.setAttribute('data-active-tab', 'today');
    await this._updateHero();
    this._showTab('today');
    this._refreshProfileViews();
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
      const next = !cur ? (sysDark ? 'light' : 'dark') : (cur === 'dark' ? 'light' : 'dark');
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('tracker_theme', next);
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
      if (next <= _todayStr()) { this.currentDate = next; this._onDateChange(); }
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

  /* ── Tabs (top + bottom) ── */
  _bindTabNav() {
    document.querySelectorAll('.tab, .tab-bar-btn').forEach(btn => {
      btn.addEventListener('click', () => this._showTab(btn.dataset.tab));
    });
  },
  _showTab(tabName) {
    this.activeTab = tabName;
    document.body.setAttribute('data-active-tab', tabName);

    document.querySelectorAll('.panel').forEach(p =>
      p.classList.toggle('active', p.dataset.tab === tabName)
    );
    document.querySelectorAll('.tab, .tab-bar-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tabName)
    );

    switch (tabName) {
      case 'today':   Tracker.render(this.currentDate);     break;
      case 'week':    Charts.renderWeek(this.currentDate);  break;
      case 'month':   Charts.renderMonth(this.currentDate); break;
      case 'content': this._renderDailyContent();           break;
      case 'profile': this._refreshProfileViews();          break;
    }
  },

  /* ── Hero greeting + dates ── */
  async _updateHero() {
    this._updateGreeting();
    document.getElementById('gregDateDisplay').textContent =
      HebrewCal.formatGregorianDate(this.currentDate);

    document.getElementById('hebrewDateDisplay').textContent = '…';
    document.getElementById('parashaDisplay').textContent = '';
    this._renderShabbatBanner(null);

    const { hebrewDate, parasha, shabbat } = await HebrewCal.init(this.currentDate);
    const heEl = document.getElementById('hebrewDateDisplay');
    if (hebrewDate?.hebrew) {
      heEl.textContent = hebrewDate.hebrew;
      this._hebrewDay = hebrewDate.hd;
    } else {
      heEl.textContent = '—';
    }

    const pEl = document.getElementById('parashaDisplay');
    if (parasha) {
      pEl.textContent = parasha.startsWith('פרשת') ? parasha : `פרשת ${parasha}`;
    } else {
      pEl.textContent = '';
    }

    this._renderShabbatBanner(shabbat);
    document.getElementById('heroIntention').textContent = this._getIntention();
  },

  /* ── Shabbat / Yom Tov banner ── */
  _renderShabbatBanner(shabbat) {
    const banner = document.getElementById('heroShabbat');
    if (!banner) return;

    /* Determine if today is "relevant": Friday, Saturday, or any day
       with candles/havdalah from HebCal (covers Yom Tov eves + holiday days) */
    const [y, m, d] = this.currentDate.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay(); // 5 = Fri, 6 = Sat
    const isShabbatish = dow === 5 || dow === 6;
    const hasEvents = shabbat && (shabbat.candles || shabbat.havdalah);
    const shouldShow = isShabbatish || hasEvents;

    if (!shouldShow) {
      banner.innerHTML = '';
      banner.style.display = 'none';
      return;
    }

    const loc = HebrewCal.getLocation();

    /* No location set — show CTA */
    if (!loc) {
      banner.innerHTML = `
        <button class="shabbat-cta" id="shabbatEnableLoc">
          <span class="shabbat-icon">🕯️</span>
          <span class="shabbat-cta-text">Enable Shabbat times — share location</span>
        </button>`;
      banner.style.display = '';
      banner.querySelector('#shabbatEnableLoc')?.addEventListener('click', () => this._requestLocationFromUser());
      return;
    }

    /* Location set, but API returned no candle/havdalah info for this date */
    if (!shabbat || (!shabbat.candles && !shabbat.havdalah)) {
      banner.innerHTML = '';
      banner.style.display = 'none';
      return;
    }

    const parts = [];
    if (shabbat.candles) {
      parts.push(`
        <div class="shabbat-row">
          <span class="shabbat-icon">🕯️</span>
          <span class="shabbat-label">Candle lighting</span>
          <span class="shabbat-time">${shabbat.candles}</span>
        </div>`);
    }
    if (shabbat.havdalah) {
      parts.push(`
        <div class="shabbat-row">
          <span class="shabbat-icon">✨</span>
          <span class="shabbat-label">Havdalah</span>
          <span class="shabbat-time">${shabbat.havdalah}</span>
        </div>`);
    }
    const locLine = loc.label
      ? `<div class="shabbat-loc">${loc.label}${shabbat.holidayName ? ' · ' + shabbat.holidayName : ''}</div>`
      : (shabbat.holidayName ? `<div class="shabbat-loc">${shabbat.holidayName}</div>` : '');
    banner.innerHTML = `${parts.join('')}${locLine}`;
    banner.style.display = '';
  },

  async _requestLocationFromUser() {
    try {
      await HebrewCal.requestLocation();
      await this._updateHero();
      this._refreshProfileViews();
    } catch (e) {
      const msg = e?.code === 1
        ? 'Location permission denied. Enable location in your browser settings to use Shabbat times.'
        : 'Could not get your location. Try again or set it manually in Profile.';
      alert(msg);
    }
  },

  _updateGreeting() {
    const el = document.getElementById('heroGreeting');
    if (!el) return;
    const profile = Storage.getProfile();
    const name = (profile.name || '').trim();
    if (!name) { el.textContent = ''; return; }
    const h = new Date().getHours();
    const period =
      h < 12 ? 'Good morning' :
      h < 18 ? 'Good afternoon' :
      h < 22 ? 'Good evening' :
               'Shalom';
    el.textContent = `${period}, ${name}`;
  },

  /* ── Time-aware intentions ── */
  _getIntention() {
    const [y, m, d] = this.currentDate.split('-').map(Number);
    const dt  = new Date(y, m - 1, d);
    const dow = dt.getDay();
    const isToday = this.currentDate === _todayStr();
    const hr  = isToday ? new Date().getHours() : 9;
    const period = hr < 12 ? 'morning' : hr < 18 ? 'afternoon' : 'evening';

    const lib = {
      0: { morning: 'Begin the week with renewed purpose.',
           afternoon: 'Find the holy in the ordinary.',
           evening: 'Let gratitude carry you into rest.' },
      1: { morning: 'Every act of service builds the world.',
           afternoon: 'Strength comes from small, faithful acts.',
           evening: 'Tomorrow is a new chance.' },
      2: { morning: 'Speak words that elevate today.',
           afternoon: 'Patience is its own prayer.',
           evening: 'Reflect quietly on what is true.' },
      3: { morning: 'Find the holy in the ordinary.',
           afternoon: 'Mercy is the soul of justice.',
           evening: 'The midweek is a turning of the wheel.' },
      4: { morning: 'Open your heart to gratitude.',
           afternoon: 'Generosity multiplies what is given.',
           evening: 'Make space for tomorrow\'s preparations.' },
      5: { morning: 'Prepare your soul for Shabbat.',
           afternoon: 'The day prepares for the holiness of Shabbat.',
           evening: 'Welcome the queen of days.' },
      6: { morning: 'Rest in the light of the day.',
           afternoon: 'Shabbat shalom — taste the eternal.',
           evening: 'Carry Shabbat\'s light into the week.' }
    };
    return lib[dow][period];
  },

  /* ── Reader triggers ── */
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
    body.innerHTML = `<div class="skeleton-stack">
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton skeleton--line"></div>
      <div class="skeleton skeleton--line"></div>
      <div class="skeleton skeleton--line short"></div>
    </div>`;
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
          ${h.heText ? `<div class="halacha-text halacha-text--he" dir="rtl">${_truncate(h.heText, 280)}</div>` : ''}
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
  },

  /* ── Profile chip + view ── */
  _bindProfileChip() {
    const chip = document.getElementById('profileChip');
    if (chip) chip.addEventListener('click', () => this._showTab('profile'));
  },
  _bindLocationRows() {
    const set   = document.getElementById('locationRow');
    const clear = document.getElementById('locationClear');
    if (set) set.addEventListener('click', () => this._requestLocationFromUser());
    if (clear) clear.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Remove saved location? Shabbat times will be hidden until you set a new one.')) {
        HebrewCal.clearLocation();
        this._refreshProfileViews();
        if (this.activeTab === 'today') this._updateHero();
      }
    });
  },

  _bindAuthRows() {
    const row = document.getElementById('signInRow');
    if (row) row.addEventListener('click', async () => {
      if (Auth.user) {
        // Sign out
        if (confirm('Sign out? Your data stays on this device.')) {
          await Auth.signOut();
        }
      } else {
        if (!Auth.isEnabled()) {
          alert('Sign-in requires Firebase setup. See README.');
          return;
        }
        try { await Auth.signInWithGoogle(); }
        catch { alert('Sign-in failed. Please try again.'); }
      }
    });
  },

  _refreshProfileViews() {
    const user    = Auth?.user;
    const profile = Storage.getProfile();
    const name    = (profile.name || (user?.displayName) || '').trim();

    /* Location row */
    const locLabel = document.getElementById('locationLabel');
    const locClear = document.getElementById('locationClear');
    if (locLabel) {
      const loc = HebrewCal.getLocation();
      if (loc) {
        locLabel.textContent = loc.label || `${loc.lat}, ${loc.lon}`;
        if (locClear) locClear.style.display = '';
      } else {
        locLabel.textContent = 'Tap to set — required for Shabbat times';
        if (locClear) locClear.style.display = 'none';
      }
    }

    /* Top avatar */
    const topAvatar = document.getElementById('topAvatar');
    if (topAvatar) {
      if (user?.photoURL) {
        topAvatar.style.backgroundImage = `url(${user.photoURL})`;
        topAvatar.textContent = '';
      } else {
        topAvatar.style.backgroundImage = '';
        topAvatar.textContent = name ? name[0] : '·';
      }
    }

    /* Profile tab */
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
      if (user?.photoURL) {
        profileAvatar.style.backgroundImage = `url(${user.photoURL})`;
        profileAvatar.textContent = '';
      } else {
        profileAvatar.style.backgroundImage = '';
        profileAvatar.textContent = name ? name[0] : '·';
      }
    }
    const nameEl  = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    if (nameEl)  nameEl.textContent  = name || 'Add your name';
    if (emailEl) emailEl.textContent = user?.email || 'Not signed in';

    const signInLabel = document.getElementById('signInLabel');
    if (signInLabel) signInLabel.textContent = user ? 'Sign out' : 'Sign in with Google';

    const fbHint = document.getElementById('firebaseHint');
    if (fbHint) fbHint.style.display = Auth?.isEnabled() ? 'none' : 'block';

    const nameInput = document.getElementById('profileNameInput');
    if (nameInput) nameInput.value = profile.name || '';
  },

  _onAuthChange(user) {
    this._refreshProfileViews();
  },

  _onSyncComplete() {
    /* Called after remote profile/days merged into local */
    if (this.activeTab === 'today') Tracker.render(this.currentDate);
    if (this.activeTab === 'week')  Charts.renderWeek(this.currentDate);
    if (this.activeTab === 'month') Charts.renderMonth(this.currentDate);
    this._refreshProfileViews();
    this._updateGreeting();
  },

  _refreshAfterOnboarding() {
    this._refreshProfileViews();
    this._updateGreeting();
    if (this.activeTab === 'today') Tracker.render(this.currentDate);
  },

  /* ── Kanban mobile segmented control ── */
  _bindKanbanSegmented() {
    const seg   = document.getElementById('kanbanSegmented');
    const board = document.getElementById('kanbanBoard');
    if (!seg || !board) return;
    seg.querySelectorAll('.kanban-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        seg.setAttribute('data-view', view);
        board.setAttribute('data-view', view);
        seg.querySelectorAll('.kanban-seg-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
      });
    });

    /* Swipe to switch between To Do / Done on mobile */
    let touchStartX = null;
    board.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    board.addEventListener('touchend', e => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) < 60) return;
      const current = board.getAttribute('data-view');
      const next = dx < 0 ? 'done' : 'todo';
      if (next !== current && window.innerWidth <= 699) {
        seg.querySelector(`[data-view="${next}"]`)?.click();
      }
    }, { passive: true });
  },

  /* ── PWA install prompt (Android / Edge) ── */
  _bindInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this._installEvent = e;
      const row = document.getElementById('installRow');
      if (row) row.style.display = '';
    });
    const row = document.getElementById('installRow');
    if (row) row.addEventListener('click', async () => {
      if (!this._installEvent) return;
      this._installEvent.prompt();
      const choice = await this._installEvent.userChoice;
      if (choice.outcome === 'accepted') row.style.display = 'none';
      this._installEvent = null;
    });
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

window._todayStr   = _todayStr;
window._offsetDate = _offsetDate;

document.addEventListener('DOMContentLoaded', () => App.init());
