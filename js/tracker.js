/* ── Tracker (Row-based) ────────────────────────────────────
   Renders Today tab as expandable rows.
   Status dot · Hebrew name · English label · summary · chevron
   Tap row to expand inline details (time, intensity dots, etc.).
──────────────────────────────────────────────────────────── */
const Tracker = {
  currentDate: null,
  data: null,
  _expanded: new Set(),

  render(dateStr) {
    this.currentDate = dateStr;
    this.data = Storage.getDay(dateStr);
    this._renderPrayers();
    this._renderPractices();
    this._updateScore();
    this._updateCounts();
  },

  _save() {
    Storage.saveDay(this.currentDate, this.data);
    this._updateScore();
    this._updateCounts();
  },

  _updateScore() {
    const score = Storage.computeScore(this.data);
    const max = 10;
    document.getElementById('scoreNum').textContent = score;
    document.getElementById('heroProgressFill').style.width = `${(score / max) * 100}%`;
  },

  _updateCounts() {
    const d = this.data;
    let pdone = 0;
    if (d.shaharit?.done) pdone++;
    if (d.mincha?.done)   pdone++;
    if (d.arvit?.done)    pdone++;
    document.getElementById('prayerCount').textContent = `${pdone} / 3`;

    /* Practice count: respects user's committed practices, fast excluded */
    const profile = Storage.getProfile();
    const commits = profile.committedPractices || [];
    const useFilter = commits.length > 0;
    const allKeys = ['mikve','tehilim','tikounHaklali','torahStudy','hitbodedout','charity','midot'];
    const counted = useFilter ? allKeys.filter(k => commits.includes(k)) : allKeys;
    const isDone = {
      mikve:         d.mikve,
      tehilim:       d.tehilim,
      tikounHaklali: d.tikounHaklali,
      torahStudy:    d.torahStudy?.length > 0,
      hitbodedout:   d.hitbodedout?.done,
      charity:       d.charity?.done,
      midot:         d.midot?.some(m => m.performed)
    };
    const pr = counted.filter(k => isDone[k]).length;
    document.getElementById('practiceCount').textContent = `${pr} / ${counted.length}`;
  },

  /* ════════════════ PRAYERS ════════════════ */
  _renderPrayers() {
    const prayers = [
      { key: 'shaharit', he: 'שַׁחֲרִית', en: 'Shaharit' },
      { key: 'mincha',   he: 'מִנְחָה',    en: 'Mincha' },
      { key: 'arvit',    he: 'עַרְבִית',   en: 'Arvit' }
    ];
    document.getElementById('prayerRows').innerHTML = prayers
      .map(p => this._prayerRow(p)).join('');
    this._bindRowTriggers('prayerRows');
    prayers.forEach(p => this._bindPrayerDetail(p.key));
  },

  _prayerRow({ key, he, en }) {
    const p = this.data[key];
    const expanded = this._expanded.has(key);
    const summary = p.time ? p.time : (p.done ? '✓' : '—');
    return `
      <div class="row" data-key="${key}" data-done="${p.done}" data-expanded="${expanded}">
        <button class="row-trigger" data-toggle-expand="${key}">
          <span class="row-dot" data-toggle-done="${key}"></span>
          <span class="row-label">
            <span class="row-he" dir="rtl">${he}</span>
            <span class="row-en">${en}</span>
          </span>
          <span class="row-summary ${!p.time && !p.done ? 'empty' : ''}">${summary}</span>
          <span class="row-chevron">${_chevron()}</span>
        </button>
        <div class="row-detail">
          <div class="detail-grid">
            <div>
              <label class="field-label">Time</label>
              <input type="time" class="input-time" data-field="${key}.time" value="${p.time || ''}">
            </div>
            <div>
              <label class="field-label">Intensity (1–5)</label>
              ${this._intensityDots(`${key}.intensity`, p.intensity)}
            </div>
          </div>
        </div>
      </div>`;
  },

  _bindPrayerDetail(key) {
    const row = document.querySelector(`.row[data-key="${key}"]`);
    if (!row) return;
    row.querySelector(`input[data-field="${key}.time"]`)?.addEventListener('input', e => {
      this.data[key].time = e.target.value;
      this._save();
      this._refreshRowSummary(key);
    });
    this._bindIntensity(row, `${key}.intensity`);
  },

  _refreshRowSummary(key) {
    const row = document.querySelector(`.row[data-key="${key}"]`);
    if (!row) return;
    const p = this.data[key];
    const summaryEl = row.querySelector('.row-summary');
    if (!p) return;
    if (p.time !== undefined) {
      const txt = p.time ? p.time : (p.done ? '✓' : '—');
      summaryEl.textContent = txt;
      summaryEl.classList.toggle('empty', !p.time && !p.done);
    }
  },

  /* ════════════════ PRACTICES ════════════════ */
  _renderPractices() {
    const profile  = Storage.getProfile();
    const commits  = profile.committedPractices || [];
    const useFilter = commits.length > 0; // empty = legacy mode, show all as committed
    const isCommitted = (key) => !useFilter || commits.includes(key);

    const items = [
      { key: 'mikve',         html: this._simpleRow('mikve',         'מִקְוֶה',           'Mikve') },
      { key: 'tehilim',       html: this._simpleRow('tehilim',       'תְּהִלִּים',          'Tehilim') },
      { key: 'tikounHaklali', html: this._simpleRow('tikounHaklali', 'תִּקּוּן הַכְּלָלִי',  'Tikoun Haklali') },
      { key: 'torahStudy',    html: this._torahRow() },
      { key: 'hitbodedout',   html: this._hitbodedoutRow() },
      { key: 'charity',       html: this._tzedakaRow() },
      { key: 'midot',         html: this._midotRow() },
      { key: 'fast',          html: this._fastRow(), alwaysOther: true }
    ];

    const main  = items.filter(i => !i.alwaysOther && isCommitted(i.key)).map(i => i.html).join('');
    const other = items.filter(i =>  i.alwaysOther || !isCommitted(i.key)).map(i => i.html).join('');

    document.getElementById('practiceRows').innerHTML = main;
    document.getElementById('otherRows').innerHTML    = other;

    /* Hide "Other practices" disclosure if it has no content */
    const otherWrap = document.getElementById('otherPractices');
    if (otherWrap) otherWrap.style.display = other ? '' : 'none';

    /* Bind events across both containers */
    this._bindRowTriggers('practiceRows');
    this._bindRowTriggers('otherRows');
    this._bindTorahDetail();
    this._bindHitbodedoutDetail();
    this._bindTzedakaDetail();
    this._bindFastDetail();
    this._bindMidotDetail();
  },

  /* Simple toggle row (no expand) */
  _simpleRow(key, he, en) {
    const done = this.data[key];
    return `
      <div class="row" data-key="${key}" data-done="${done}" data-simple="true">
        <button class="row-trigger" data-simple-toggle="${key}">
          <span class="row-dot"></span>
          <span class="row-label">
            <span class="row-he" dir="rtl">${he}</span>
            <span class="row-en">${en}</span>
          </span>
          <span class="row-summary ${done ? '' : 'empty'}">${done ? '✓' : '—'}</span>
          <span class="row-chevron" style="visibility:hidden">${_chevron()}</span>
        </button>
      </div>`;
  },

  /* Torah Study row */
  _torahRow() {
    const sessions = this.data.torahStudy || [];
    const done = sessions.length > 0;
    const expanded = this._expanded.has('torahStudy');
    const totalMin = sessions.reduce((sum, s) => sum + (parseInt(s.duration) || 0), 0);
    const summary = done ? (totalMin ? `${totalMin} min` : `${sessions.length} session${sessions.length>1?'s':''}`) : '—';

    const subjects = [
      { val: 'houmash',   he: 'חוּמָשׁ',   en: 'Chumash' },
      { val: 'gemara',    he: 'גְּמָרָא',   en: 'Gemara' },
      { val: 'hassidout', he: 'חֲסִידוּת', en: 'Hassidut' },
      { val: 'halacha',   he: 'הֲלָכָה',   en: 'Halacha' }
    ];

    const sessionHtml = sessions.map((s, i) => `
      <div class="session-row" data-session="${i}">
        <select data-session-field="${i}.subject" class="input-text">
          <option value="">Subject…</option>
          ${subjects.map(sub => `<option value="${sub.val}" ${s.subject === sub.val ? 'selected' : ''}>${sub.he} — ${sub.en}</option>`).join('')}
        </select>
        <input type="time" class="input-time" data-session-field="${i}.startTime" value="${s.startTime || ''}">
        <div class="input-duration">
          <input type="number" min="1" max="480" placeholder="min" data-session-field="${i}.duration" value="${s.duration || ''}">
          <span class="suffix">min</span>
        </div>
        <button class="remove-x" data-remove-session="${i}" aria-label="Remove">✕</button>
      </div>`).join('');

    return `
      <div class="row" data-key="torahStudy" data-done="${done}" data-expanded="${expanded}">
        <button class="row-trigger" data-toggle-expand="torahStudy">
          <span class="row-dot"></span>
          <span class="row-label">
            <span class="row-he" dir="rtl">לִמּוּד תּוֹרָה</span>
            <span class="row-en">Torah Study</span>
          </span>
          <span class="row-summary ${!done ? 'empty' : ''}">${summary}</span>
          <span class="row-chevron">${_chevron()}</span>
        </button>
        <div class="row-detail">
          <div class="session-list">${sessionHtml}</div>
          <button class="add-btn" id="addTorahSession">＋ Add study session</button>
        </div>
      </div>`;
  },

  _bindTorahDetail() {
    document.querySelectorAll('[data-session-field]').forEach(el => {
      const handler = () => {
        const [idx, field] = el.dataset.sessionField.split('.');
        if (!this.data.torahStudy[idx]) return;
        this.data.torahStudy[idx][field] = el.type === 'number' ? (parseInt(el.value) || '') : el.value;
        this._save();
        this._refreshTorahSummary();
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    });
    document.querySelectorAll('[data-remove-session]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const i = parseInt(el.dataset.removeSession);
        this.data.torahStudy.splice(i, 1);
        this._save();
        this._expanded.add('torahStudy');
        this._renderPractices();
      });
    });
    document.getElementById('addTorahSession')?.addEventListener('click', e => {
      e.stopPropagation();
      this.data.torahStudy.push({ subject: '', startTime: '', duration: '' });
      this._save();
      this._expanded.add('torahStudy');
      this._renderPractices();
    });
  },

  _refreshTorahSummary() {
    const row = document.querySelector('.row[data-key="torahStudy"]');
    if (!row) return;
    const sessions = this.data.torahStudy || [];
    const done = sessions.length > 0;
    row.setAttribute('data-done', done);
    const totalMin = sessions.reduce((sum, s) => sum + (parseInt(s.duration) || 0), 0);
    const summary = done ? (totalMin ? `${totalMin} min` : `${sessions.length} session${sessions.length>1?'s':''}`) : '—';
    const sumEl = row.querySelector('.row-summary');
    sumEl.textContent = summary;
    sumEl.classList.toggle('empty', !done);
  },

  /* Hitbodedut */
  _hitbodedoutRow() {
    const h = this.data.hitbodedout || { done: false, duration: '' };
    const expanded = this._expanded.has('hitbodedout');
    const summary = h.done ? (h.duration ? `${h.duration} min` : '✓') : '—';
    return `
      <div class="row" data-key="hitbodedout" data-done="${h.done}" data-expanded="${expanded}">
        <button class="row-trigger" data-toggle-expand="hitbodedout">
          <span class="row-dot" data-toggle-done="hitbodedout"></span>
          <span class="row-label">
            <span class="row-he" dir="rtl">הִתְבּוֹדְדוּת</span>
            <span class="row-en">Hitbodedut · Personal Prayer</span>
          </span>
          <span class="row-summary ${!h.done ? 'empty' : ''}">${summary}</span>
          <span class="row-chevron">${_chevron()}</span>
        </button>
        <div class="row-detail">
          <div class="detail-grid">
            <div>
              <label class="field-label">Duration</label>
              <div class="input-duration">
                <input type="number" min="1" max="240" placeholder="20" data-field="hitbodedout.duration" value="${h.duration || ''}">
                <span class="suffix">minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },
  _bindHitbodedoutDetail() {
    document.querySelector('input[data-field="hitbodedout.duration"]')?.addEventListener('input', e => {
      this.data.hitbodedout.duration = parseInt(e.target.value) || '';
      this._save();
      this._refreshSimpleSummary('hitbodedout', this.data.hitbodedout.duration ? `${this.data.hitbodedout.duration} min` : (this.data.hitbodedout.done ? '✓' : '—'));
    });
  },

  /* Tzedaka */
  _tzedakaRow() {
    const c = this.data.charity || { done: false, amount: '' };
    const expanded = this._expanded.has('charity');
    const settings = Storage.getSettings();
    const summary = c.done
      ? (c.amount ? `${settings.currency}${c.amount}` : '✓')
      : '—';
    return `
      <div class="row" data-key="charity" data-done="${c.done}" data-expanded="${expanded}">
        <button class="row-trigger" data-toggle-expand="charity">
          <span class="row-dot" data-toggle-done="charity"></span>
          <span class="row-label">
            <span class="row-he" dir="rtl">צְדָקָה</span>
            <span class="row-en">Tzedaka · Charity</span>
          </span>
          <span class="row-summary ${!c.done ? 'empty' : ''}">${summary}</span>
          <span class="row-chevron">${_chevron()}</span>
        </button>
        <div class="row-detail">
          <div class="detail-grid">
            <div>
              <label class="field-label">Amount</label>
              <div class="input-money">
                <span class="currency">${settings.currency}</span>
                <input type="number" min="0" step="0.01" placeholder="0.00" data-field="charity.amount" value="${c.amount || ''}">
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },
  _bindTzedakaDetail() {
    document.querySelector('input[data-field="charity.amount"]')?.addEventListener('input', e => {
      this.data.charity.amount = parseFloat(e.target.value) || '';
      this._save();
      const settings = Storage.getSettings();
      const c = this.data.charity;
      const summary = c.done ? (c.amount ? `${settings.currency}${c.amount}` : '✓') : '—';
      this._refreshSimpleSummary('charity', summary);
    });
  },

  /* Fast Day */
  _fastRow() {
    const f = this.data.fast || { isAFastDay: false, performed: false };
    const expanded = this._expanded.has('fast');
    const done = f.isAFastDay && f.performed;
    const summary = !f.isAFastDay ? 'Not a fast day' : (f.performed ? 'Completed' : 'In progress');
    return `
      <div class="row" data-key="fast" data-done="${done}" data-expanded="${expanded}">
        <button class="row-trigger" data-toggle-expand="fast">
          <span class="row-dot"></span>
          <span class="row-label">
            <span class="row-he" dir="rtl">תַּעֲנִית</span>
            <span class="row-en">Ta'anit · Fast Day</span>
          </span>
          <span class="row-summary ${!f.isAFastDay ? 'empty' : ''}">${summary}</span>
          <span class="row-chevron">${_chevron()}</span>
        </button>
        <div class="row-detail">
          <div style="display:flex;flex-direction:column;gap:14px">
            <div style="display:flex;align-items:center;gap:12px">
              <button class="pill-toggle ${f.isAFastDay ? 'on' : ''}" data-toggle-fastday>${f.isAFastDay ? 'Yes, fast day' : 'Mark as fast day'}</button>
              <span style="font-size:.85rem;color:var(--text-3)">Today is a fast day</span>
            </div>
            ${f.isAFastDay ? `
            <div style="display:flex;align-items:center;gap:12px">
              <button class="pill-toggle ${f.performed ? 'on' : ''}" data-toggle-performed>${f.performed ? 'Completed' : 'Mark complete'}</button>
              <span style="font-size:.85rem;color:var(--text-3)">I completed the fast</span>
            </div>` : ''}
          </div>
        </div>
      </div>`;
  },
  _bindFastDetail() {
    document.querySelector('[data-toggle-fastday]')?.addEventListener('click', e => {
      e.stopPropagation();
      this.data.fast.isAFastDay = !this.data.fast.isAFastDay;
      if (!this.data.fast.isAFastDay) this.data.fast.performed = false;
      this._save();
      this._expanded.add('fast');
      this._renderPractices();
    });
    document.querySelector('[data-toggle-performed]')?.addEventListener('click', e => {
      e.stopPropagation();
      this.data.fast.performed = !this.data.fast.performed;
      this._save();
      this._expanded.add('fast');
      this._renderPractices();
    });
  },

  /* Midot */
  _midotRow() {
    const midot = this.data.midot || [];
    const traits = Storage.getKnownTraits();
    const performed = midot.filter(m => m.performed).length;
    const done = performed > 0;
    const expanded = this._expanded.has('midot');
    const summary = done ? `${performed} active` : (midot.length ? `${midot.length} traits` : '—');

    const items = midot.map((m, i) => `
      <div class="midot-card" data-midah="${i}">
        <div class="midot-card-head">
          <input type="text" class="midot-trait-input"
            list="known-traits"
            placeholder="Trait name (e.g., Humility, Patience, Gratitude…)"
            data-midah-field="${i}.trait" value="${m.trait || ''}">
          <button class="midot-toggle ${m.performed ? 'on' : ''}" data-midah-toggle="${i}">${m.performed ? '✓ Worked on' : 'Mark'}</button>
          <button class="remove-x" data-remove-midah="${i}" aria-label="Remove">✕</button>
        </div>
        ${m.performed ? `
        <div>
          <label class="field-label">Work intensity (1–5)</label>
          ${this._intensityDots(`midah-${i}.intensity`, m.intensity, i)}
        </div>` : ''}
      </div>`).join('');

    return `
      <div class="row" data-key="midot" data-done="${done}" data-expanded="${expanded}">
        <button class="row-trigger" data-toggle-expand="midot">
          <span class="row-dot"></span>
          <span class="row-label">
            <span class="row-he" dir="rtl">מִדּוֹת</span>
            <span class="row-en">Midot · Character Traits</span>
          </span>
          <span class="row-summary ${!midot.length ? 'empty' : ''}">${summary}</span>
          <span class="row-chevron">${_chevron()}</span>
        </button>
        <div class="row-detail">
          <datalist id="known-traits">
            ${traits.map(t => `<option value="${t}">`).join('')}
          </datalist>
          <div class="midot-list">${items}</div>
          <button class="add-btn" id="addMidah">＋ Add character trait</button>
        </div>
      </div>`;
  },
  _bindMidotDetail() {
    document.querySelectorAll('input[data-midah-field]').forEach(el => {
      el.addEventListener('input', () => {
        const [idx, field] = el.dataset.midahField.split('.');
        if (!this.data.midot[idx]) return;
        this.data.midot[idx][field] = el.value;
        if (field === 'trait' && el.value.trim()) Storage.addKnownTrait(el.value.trim());
        this._save();
      });
    });
    document.querySelectorAll('[data-midah-toggle]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const i = parseInt(el.dataset.midahToggle);
        if (!this.data.midot[i]) return;
        this.data.midot[i].performed = !this.data.midot[i].performed;
        if (this.data.midot[i].performed && this.data.midot[i].trait) {
          Storage.addKnownTrait(this.data.midot[i].trait);
        }
        this._save();
        this._expanded.add('midot');
        this._renderPractices();
      });
    });
    document.querySelectorAll('[data-remove-midah]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const i = parseInt(el.dataset.removeMidah);
        this.data.midot.splice(i, 1);
        this._save();
        this._expanded.add('midot');
        this._renderPractices();
      });
    });
    document.getElementById('addMidah')?.addEventListener('click', e => {
      e.stopPropagation();
      this.data.midot.push({ trait: '', performed: false, intensity: 0 });
      this._save();
      this._expanded.add('midot');
      this._renderPractices();
    });
    // Intensity dots for each midah
    this.data.midot.forEach((m, i) => {
      const dots = document.querySelectorAll(`[data-intensity-key="midah-${i}.intensity"] .intensity-dot`);
      dots.forEach((dot, di) => {
        dot.addEventListener('click', e => {
          e.stopPropagation();
          const val = (di + 1) * 2; // 1-5 dots map to 2,4,6,8,10
          this.data.midot[i].intensity = val;
          this._save();
          this._renderMidotIntensity(i);
        });
      });
    });
  },
  _renderMidotIntensity(i) {
    const container = document.querySelector(`[data-intensity-key="midah-${i}.intensity"]`);
    if (!container) return;
    const val = this.data.midot[i].intensity || 0;
    const filled = Math.ceil(val / 2);
    container.querySelectorAll('.intensity-dot').forEach((dot, di) => {
      dot.classList.toggle('filled', di < filled);
    });
    const valEl = container.querySelector('.intensity-value');
    if (valEl) valEl.textContent = filled > 0 ? `${filled}/5` : '—';
  },

  /* ════════════════ SHARED ════════════════ */

  /* 5-dot intensity component */
  _intensityDots(fieldPath, value, midahIdx) {
    const filled = Math.ceil((value || 0) / 2);
    const dotKey = midahIdx !== undefined ? `midah-${midahIdx}.intensity` : fieldPath;
    return `
      <div class="intensity-dots" data-intensity-key="${dotKey}">
        ${[1,2,3,4,5].map(n => `
          <button class="intensity-dot ${n <= filled ? 'filled' : ''}" data-intensity="${n}" aria-label="Intensity ${n}"></button>
        `).join('')}
        <span class="intensity-value">${filled > 0 ? `${filled}/5` : '—'}</span>
      </div>`;
  },

  _bindIntensity(row, fieldPath) {
    const container = row.querySelector(`[data-intensity-key="${fieldPath}"]`);
    if (!container) return;
    container.querySelectorAll('.intensity-dot').forEach(dot => {
      dot.addEventListener('click', e => {
        e.stopPropagation();
        const n = parseInt(dot.dataset.intensity);
        const val = n * 2;
        this._setNested(this.data, fieldPath, val);
        this._save();
        // re-render dots
        container.querySelectorAll('.intensity-dot').forEach((d, i) => {
          d.classList.toggle('filled', i < n);
        });
        container.querySelector('.intensity-value').textContent = `${n}/5`;
      });
    });
  },

  /* Row trigger bindings (toggle expand + toggle done) */
  _bindRowTriggers(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    /* Tap the row → toggle expand (unless simple row → toggles done) */
    container.querySelectorAll('.row-trigger').forEach(btn => {
      btn.addEventListener('click', e => {
        // Dot has its own handler with stopPropagation; ignore here
        if (e.target.closest('.row-dot[data-toggle-done]')) return;

        if (btn.dataset.simpleToggle) {
          const key = btn.dataset.simpleToggle;
          this.data[key] = !this.data[key];
          this._save();
          this._refreshSimpleRow(key);
          return;
        }

        const key = btn.dataset.toggleExpand;
        if (!key) return;
        if (this._expanded.has(key)) this._expanded.delete(key);
        else this._expanded.add(key);
        const row = btn.closest('.row');
        row.setAttribute('data-expanded', this._expanded.has(key));
      });
    });

    /* Dot click → toggle done (separately from expand) */
    container.querySelectorAll('.row-dot[data-toggle-done]').forEach(dot => {
      dot.addEventListener('click', e => {
        e.stopPropagation();
        const key = dot.dataset.toggleDone;
        if (!key) return;
        // Determine which structure
        if (this.data[key] === true || this.data[key] === false) {
          // simple boolean
          this.data[key] = !this.data[key];
          this._save();
          this._refreshSimpleRow(key);
        } else if (this.data[key] && 'done' in this.data[key]) {
          this.data[key].done = !this.data[key].done;
          // If prayer was just marked done and no time set, fill now
          if (this.data[key].done && this.data[key].time !== undefined && !this.data[key].time) {
            const now = new Date();
            this.data[key].time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            const timeInput = document.querySelector(`input[data-field="${key}.time"]`);
            if (timeInput) timeInput.value = this.data[key].time;
          }
          this._save();
          this._refreshDoneState(key);
          this._refreshRowSummary(key);
        }
      });
    });
  },

  _refreshSimpleRow(key) {
    const row = document.querySelector(`.row[data-key="${key}"]`);
    if (!row) return;
    const done = this.data[key];
    row.setAttribute('data-done', done);
    const sum = row.querySelector('.row-summary');
    sum.textContent = done ? '✓' : '—';
    sum.classList.toggle('empty', !done);
  },

  _refreshSimpleSummary(key, summary) {
    const row = document.querySelector(`.row[data-key="${key}"]`);
    if (!row) return;
    const sum = row.querySelector('.row-summary');
    sum.textContent = summary;
  },

  _refreshDoneState(key) {
    const row = document.querySelector(`.row[data-key="${key}"]`);
    if (!row) return;
    const obj = this.data[key];
    const done = (obj === true) || (obj && obj.done);
    row.setAttribute('data-done', done);
  },

  _setNested(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
};

function _chevron() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
}
