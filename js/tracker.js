/* ── Tracker (Kanban) ───────────────────────────────────────
   Today tab as a 2-column Kanban board: To Do / Done.
   - Single unified card list (all 10 practices)
   - Tap status icon to toggle done (card flies across columns)
   - Tap card body to expand inline detail panel
   - FLIP animation for smooth card movement
   - Mobile: segmented control switches columns
──────────────────────────────────────────────────────────── */
const Tracker = {
  currentDate: null,
  data: null,
  _expanded: new Set(),

  /* All practices (excluding the 3 prayers, which we add to this list) */
  PRACTICE_DEFS: [
    { key: 'shaharit',      he: 'שַׁחֲרִית',         en: 'Shaharit',          cat: 'prayer'  },
    { key: 'mincha',        he: 'מִנְחָה',            en: 'Mincha',            cat: 'prayer'  },
    { key: 'arvit',         he: 'עַרְבִית',           en: 'Arvit',             cat: 'prayer'  },
    { key: 'mikve',         he: 'מִקְוֶה',            en: 'Mikve',             cat: 'mitzvah' },
    { key: 'tehilim',       he: 'תְּהִלִּים',          en: 'Tehilim',           cat: 'mitzvah' },
    { key: 'tikounHaklali', he: 'תִּקּוּן הַכְּלָלִי',  en: 'Tikoun Haklali',    cat: 'mitzvah' },
    { key: 'torahStudy',    he: 'לִמּוּד תּוֹרָה',     en: 'Torah Study',       cat: 'study'   },
    { key: 'hitbodedout',   he: 'הִתְבּוֹדְדוּת',       en: 'Hitbodedut',        cat: 'inner'   },
    { key: 'charity',       he: 'צְדָקָה',            en: 'Tzedaka',           cat: 'mitzvah' },
    { key: 'midot',         he: 'מִדּוֹת',             en: 'Midot',             cat: 'inner'   },
    { key: 'fast',          he: 'תַּעֲנִית',           en: 'Fast (Ta\'anit)',    cat: 'special' }
  ],

  /* ════════════════ Render ════════════════ */
  render(dateStr) {
    this.currentDate = dateStr;
    this.data = Storage.getDay(dateStr);
    this._renderBoard();
    this._updateScore();
  },

  _save() {
    Storage.saveDay(this.currentDate, this.data);
    this._updateScore();
  },

  _updateScore() {
    const score = Storage.computeScore(this.data);
    document.getElementById('scoreNum').textContent = score;
    document.getElementById('heroProgressFill').style.width = `${(score / 10) * 100}%`;
  },

  /* ── Build & route practice cards into To Do / Done / Other ── */
  _renderBoard() {
    const profile = Storage.getProfile();
    const commits = profile.committedPractices || [];
    const useFilter = commits.length > 0;

    /* Build a card descriptor for each practice */
    const cards = this.PRACTICE_DEFS.map(def => this._buildCard(def));

    /* Split into committed (board) and other (collapsible) */
    const isCommitted = (key, alwaysOther) => {
      if (alwaysOther) return false;
      return !useFilter || commits.includes(key);
    };

    /* Fast is always shown only if today is marked as a fast day */
    const showFast = this.data.fast?.isAFastDay;

    const boardCards = cards.filter(c => {
      if (c.key === 'fast') return showFast;
      return isCommitted(c.key, false);
    });
    const otherCards = cards.filter(c => {
      if (c.key === 'fast') return !showFast;
      return !isCommitted(c.key, false);
    });

    const todo = boardCards.filter(c => !c.isDone);
    const done = boardCards.filter(c =>  c.isDone);

    /* Empty states */
    const emptyTodo = `
      <div class="kanban-empty">
        <div class="kanban-empty-icon">✨</div>
        <div class="kanban-empty-text">Day complete — beautiful work.</div>
      </div>`;
    const emptyDone = `
      <div class="kanban-empty">
        <div class="kanban-empty-text">Tap a card to begin.</div>
      </div>`;

    document.getElementById('todoCards').innerHTML =
      todo.length ? todo.map(c => c.html).join('') : emptyTodo;
    document.getElementById('doneCards').innerHTML =
      done.length ? done.map(c => c.html).join('') : emptyDone;
    document.getElementById('otherCards').innerHTML =
      otherCards.map(c => c.html).join('');

    /* Counts */
    document.getElementById('todoCount').textContent  = todo.length;
    document.getElementById('doneCount').textContent  = done.length;
    document.getElementById('segCountTodo').textContent = todo.length;
    document.getElementById('segCountDone').textContent = done.length;

    /* Show "Other" wrapper only if non-empty */
    const otherWrap = document.getElementById('otherPractices');
    if (otherWrap) otherWrap.style.display = otherCards.length ? '' : 'none';

    /* Bind events */
    this._bindCardEvents();
    /* Per-practice detail bindings (these query inside .kanban-detail) */
    this._bindPrayerInputs();
    this._bindTorahDetail();
    this._bindHitbodedoutDetail();
    this._bindTzedakaDetail();
    this._bindFastDetail();
    this._bindMidotDetail();
  },

  /* ── Card descriptor builder ── */
  _buildCard(def) {
    const isDone     = this._isDone(def.key);
    const summary    = this._buildSummary(def.key);
    const detailHtml = this._buildDetail(def);
    const expanded   = this._expanded.has(def.key);
    const expandable = detailHtml.length > 0;

    const summaryHtml = isDone && summary
      ? `<div class="kanban-summary">${summary}</div>`
      : (!isDone ? '<div class="kanban-summary-hint">tap to mark complete</div>' : '');

    const html = `
      <div class="kanban-card"
           data-key="${def.key}"
           data-done="${isDone}"
           data-expandable="${expandable}"
           data-expanded="${expanded}">
        <span class="kanban-category" data-cat="${def.cat}"></span>
        <button class="kanban-status" data-toggle-status="${def.key}" aria-label="${isDone ? 'Mark not done' : 'Mark done'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <div class="kanban-card-body" data-toggle-expand="${def.key}">
          <div class="kanban-name">
            <span class="kanban-name-he" dir="rtl">${def.he}</span>
            <span class="kanban-name-en">${def.en}</span>
          </div>
          ${summaryHtml}
          ${detailHtml ? `<div class="kanban-detail">${detailHtml}</div>` : ''}
        </div>
      </div>`;

    return { ...def, isDone, html };
  },

  /* ── Is this practice done? ── */
  _isDone(key) {
    const d = this.data;
    switch (key) {
      case 'shaharit':       return !!d.shaharit?.done;
      case 'mincha':         return !!d.mincha?.done;
      case 'arvit':          return !!d.arvit?.done;
      case 'mikve':          return !!d.mikve;
      case 'tehilim':        return !!d.tehilim;
      case 'tikounHaklali':  return !!d.tikounHaklali;
      case 'torahStudy':     return (d.torahStudy || []).length > 0;
      case 'hitbodedout':    return !!d.hitbodedout?.done;
      case 'charity':        return !!d.charity?.done;
      case 'midot':          return (d.midot || []).some(m => m.performed);
      case 'fast':           return !!d.fast?.performed;
    }
    return false;
  },

  /* ── Build a compact "done" summary chip row for a card ── */
  _buildSummary(key) {
    const d = this.data;
    const intensityDots = (val) => {
      const filled = Math.ceil((val || 0) / 2);
      return '●'.repeat(filled) + '○'.repeat(5 - filled);
    };
    switch (key) {
      case 'shaharit':
      case 'mincha':
      case 'arvit': {
        const p = d[key];
        const chips = [];
        if (p.time)      chips.push(`<span class="chip">${p.time}</span>`);
        if (p.intensity) chips.push(`<span class="chip">${intensityDots(p.intensity)}</span>`);
        return chips.join(' ');
      }
      case 'mikve':
      case 'tehilim':
      case 'tikounHaklali':
        return ''; // no extra data
      case 'torahStudy': {
        const sessions = d.torahStudy || [];
        const totalMin = sessions.reduce((s, x) => s + (parseInt(x.duration) || 0), 0);
        if (totalMin)        return `<span class="chip">${totalMin} min</span>`;
        if (sessions.length) return `<span class="chip">${sessions.length} session${sessions.length>1?'s':''}</span>`;
        return '';
      }
      case 'hitbodedout': {
        const h = d.hitbodedout;
        return h.duration ? `<span class="chip">${h.duration} min</span>` : '';
      }
      case 'charity': {
        const c = d.charity;
        const settings = Storage.getSettings();
        return c.amount ? `<span class="chip">${settings.currency}${c.amount}</span>` : '';
      }
      case 'midot': {
        const active = (d.midot || []).filter(m => m.performed);
        if (!active.length) return '';
        const traits = active.map(m => m.trait).filter(Boolean).slice(0, 2).join(', ');
        return traits
          ? `<span class="chip">${active.length} active · ${traits}</span>`
          : `<span class="chip">${active.length} active</span>`;
      }
      case 'fast':
        return d.fast?.performed ? '<span class="chip">Completed</span>' : '';
    }
    return '';
  },

  /* ── Build the expandable detail HTML for a card ── */
  _buildDetail(def) {
    const d = this.data;
    switch (def.key) {
      case 'shaharit':
      case 'mincha':
      case 'arvit': {
        const p = d[def.key];
        return `
          <div class="detail-grid">
            <div>
              <label class="field-label">Time</label>
              <input type="time" class="input-time" data-field="${def.key}.time" value="${p.time || ''}">
            </div>
            <div>
              <label class="field-label">Intensity (1–5)</label>
              ${this._intensityDots(`${def.key}.intensity`, p.intensity)}
            </div>
          </div>`;
      }
      case 'torahStudy':       return this._torahDetail();
      case 'hitbodedout':      return this._hitbodedoutDetail();
      case 'charity':          return this._tzedakaDetail();
      case 'fast':             return this._fastDetail();
      case 'midot':            return this._midotDetail();
      default:                 return ''; // simple toggles, no detail
    }
  },

  /* ════════════════ Detail builders ════════════════ */
  _torahDetail() {
    const sessions = this.data.torahStudy || [];
    const subjects = [
      { val: 'houmash',   he: 'חוּמָשׁ',   en: 'Chumash' },
      { val: 'gemara',    he: 'גְּמָרָא',   en: 'Gemara' },
      { val: 'hassidout', he: 'חֲסִידוּת', en: 'Hassidut' },
      { val: 'halacha',   he: 'הֲלָכָה',   en: 'Halacha' }
    ];
    const items = sessions.map((s, i) => `
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
      <div class="session-list">${items}</div>
      <button class="add-btn" id="addTorahSession">＋ Add study session</button>`;
  },

  _hitbodedoutDetail() {
    const h = this.data.hitbodedout || { done: false, duration: '' };
    return `
      <div class="detail-grid">
        <div>
          <label class="field-label">Duration</label>
          <div class="input-duration">
            <input type="number" min="1" max="240" placeholder="20" data-field="hitbodedout.duration" value="${h.duration || ''}">
            <span class="suffix">minutes</span>
          </div>
        </div>
      </div>`;
  },

  _tzedakaDetail() {
    const c = this.data.charity || { done: false, amount: '' };
    const settings = Storage.getSettings();
    return `
      <div class="detail-grid">
        <div>
          <label class="field-label">Amount</label>
          <div class="input-money">
            <span class="currency">${settings.currency}</span>
            <input type="number" min="0" step="0.01" placeholder="0.00" data-field="charity.amount" value="${c.amount || ''}">
          </div>
        </div>
      </div>`;
  },

  _fastDetail() {
    const f = this.data.fast || { isAFastDay: false, performed: false };
    return `
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
      </div>`;
  },

  _midotDetail() {
    const midot = this.data.midot || [];
    const traits = Storage.getKnownTraits();
    const items = midot.map((m, i) => `
      <div class="midot-card" data-midah="${i}">
        <div class="midot-card-head">
          <input type="text" class="midot-trait-input"
            list="known-traits"
            placeholder="Trait name (e.g., Humility, Patience…)"
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
      <datalist id="known-traits">
        ${traits.map(t => `<option value="${t}">`).join('')}
      </datalist>
      <div class="midot-list">${items}</div>
      <button class="add-btn" id="addMidah">＋ Add character trait</button>`;
  },

  /* ════════════════ Bindings ════════════════ */

  /* Card-level events: status toggle, body tap (expand or toggle) */
  _bindCardEvents() {
    /* Status icon = toggle done with FLIP animation */
    document.querySelectorAll('.kanban-status[data-toggle-status]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.toggleStatus;
        this._toggleDone(key);
      });
    });

    /* Card body = expand details (or toggle if no details) */
    document.querySelectorAll('.kanban-card-body[data-toggle-expand]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('input, button, select, textarea, label, a, .midot-card, .session-row, .pill-toggle, .midot-toggle, .add-btn, .remove-x, .intensity-dot, .midot-trait-input')) return;
        const key = el.dataset.toggleExpand;
        const card = el.closest('.kanban-card');
        const expandable = card.dataset.expandable === 'true';
        if (!expandable) {
          this._toggleDone(key);
          return;
        }
        if (this._expanded.has(key)) this._expanded.delete(key);
        else this._expanded.add(key);
        card.setAttribute('data-expanded', this._expanded.has(key));
      });
    });
  },

  /* ── Toggle done with FLIP animation ── */
  _toggleDone(key) {
    /* Capture positions of all current cards */
    const oldRects = {};
    document.querySelectorAll('.kanban-card[data-key]').forEach(el => {
      oldRects[el.dataset.key] = el.getBoundingClientRect();
    });

    /* Flip state */
    this._setDone(key, !this._isDone(key));
    this._save();

    /* Auto-collapse the toggled card (UX choice) */
    this._expanded.delete(key);

    /* Re-render */
    this._renderBoard();

    /* FLIP animate */
    this._playFlip(oldRects, key);
  },

  _setDone(key, val) {
    const d = this.data;
    switch (key) {
      case 'shaharit': case 'mincha': case 'arvit':
        d[key].done = val;
        if (val && !d[key].time) {
          const now = new Date();
          d[key].time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        }
        break;
      case 'mikve': case 'tehilim': case 'tikounHaklali':
        d[key] = val;
        break;
      case 'torahStudy':
        if (val && (!d.torahStudy || !d.torahStudy.length)) {
          d.torahStudy = [{ subject: '', startTime: '', duration: '' }];
        } else if (!val) {
          d.torahStudy = [];
        }
        break;
      case 'hitbodedout':
        if (!d.hitbodedout) d.hitbodedout = { done: false, duration: '' };
        d.hitbodedout.done = val;
        break;
      case 'charity':
        if (!d.charity) d.charity = { done: false, amount: '' };
        d.charity.done = val;
        break;
      case 'midot':
        if (val && (!d.midot || !d.midot.length)) {
          d.midot = [{ trait: '', performed: true, intensity: 0 }];
        } else if (!val) {
          (d.midot || []).forEach(m => m.performed = false);
        }
        break;
      case 'fast':
        if (!d.fast) d.fast = { isAFastDay: true, performed: false };
        d.fast.isAFastDay = true;
        d.fast.performed = val;
        break;
    }
  },

  _playFlip(oldRects, justCompletedKey) {
    const cards = document.querySelectorAll('.kanban-card[data-key]');
    cards.forEach(card => {
      const key = card.dataset.key;
      const old = oldRects[key];
      if (!old) return;
      const now = card.getBoundingClientRect();
      /* Skip if either rect is in a hidden column (display:none) */
      if (now.width === 0 || old.width === 0) return;
      const dx = old.left - now.left;
      const dy = old.top  - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      card.classList.add('flipping');
      card.style.transform = `translate(${dx}px, ${dy}px)`;
      /* Force layout */
      void card.offsetWidth;
      requestAnimationFrame(() => {
        card.style.transform = '';
      });
      card.addEventListener('transitionend', () => {
        card.classList.remove('flipping');
        card.style.transform = '';
      }, { once: true });
    });

    /* Celebration on the card that was just completed */
    if (justCompletedKey) {
      const c = document.querySelector(`.kanban-card[data-key="${justCompletedKey}"][data-done="true"]`);
      if (c) {
        c.classList.add('just-completed');
        setTimeout(() => c.classList.remove('just-completed'), 700);
      }
    }
  },

  /* ════════════════ Per-practice detail bindings ════════════════ */
  _bindPrayerInputs() {
    ['shaharit','mincha','arvit'].forEach(key => {
      const card = document.querySelector(`.kanban-card[data-key="${key}"]`);
      if (!card) return;
      card.querySelector(`input[data-field="${key}.time"]`)?.addEventListener('input', e => {
        this.data[key].time = e.target.value;
        this._save();
        this._refreshCardSummary(key);
      });
      this._bindIntensity(card, `${key}.intensity`);
    });
  },

  _bindTorahDetail() {
    document.querySelectorAll('[data-session-field]').forEach(el => {
      const handler = () => {
        const [idx, field] = el.dataset.sessionField.split('.');
        if (!this.data.torahStudy[idx]) return;
        this.data.torahStudy[idx][field] = el.type === 'number' ? (parseInt(el.value) || '') : el.value;
        this._save();
        this._refreshCardSummary('torahStudy');
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
        this._renderBoard();
      });
    });
    document.getElementById('addTorahSession')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this.data.torahStudy) this.data.torahStudy = [];
      this.data.torahStudy.push({ subject: '', startTime: '', duration: '' });
      this._save();
      this._expanded.add('torahStudy');
      this._renderBoard();
    });
  },

  _bindHitbodedoutDetail() {
    document.querySelector('input[data-field="hitbodedout.duration"]')?.addEventListener('input', e => {
      this.data.hitbodedout.duration = parseInt(e.target.value) || '';
      this._save();
      this._refreshCardSummary('hitbodedout');
    });
  },

  _bindTzedakaDetail() {
    document.querySelector('input[data-field="charity.amount"]')?.addEventListener('input', e => {
      this.data.charity.amount = parseFloat(e.target.value) || '';
      this._save();
      this._refreshCardSummary('charity');
    });
  },

  _bindFastDetail() {
    document.querySelector('[data-toggle-fastday]')?.addEventListener('click', e => {
      e.stopPropagation();
      this.data.fast.isAFastDay = !this.data.fast.isAFastDay;
      if (!this.data.fast.isAFastDay) this.data.fast.performed = false;
      this._save();
      this._expanded.add('fast');
      this._renderBoard();
    });
    document.querySelector('[data-toggle-performed]')?.addEventListener('click', e => {
      e.stopPropagation();
      this.data.fast.performed = !this.data.fast.performed;
      this._save();
      this._expanded.add('fast');
      this._renderBoard();
    });
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
        this._renderBoard();
      });
    });
    document.querySelectorAll('[data-remove-midah]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const i = parseInt(el.dataset.removeMidah);
        this.data.midot.splice(i, 1);
        this._save();
        this._expanded.add('midot');
        this._renderBoard();
      });
    });
    document.getElementById('addMidah')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this.data.midot) this.data.midot = [];
      this.data.midot.push({ trait: '', performed: false, intensity: 0 });
      this._save();
      this._expanded.add('midot');
      this._renderBoard();
    });
    /* Midot intensity dots */
    (this.data.midot || []).forEach((m, i) => {
      const container = document.querySelector(`[data-intensity-key="midah-${i}.intensity"]`);
      if (!container) return;
      container.querySelectorAll('.intensity-dot').forEach((dot, di) => {
        dot.addEventListener('click', e => {
          e.stopPropagation();
          const val = (di + 1) * 2;
          this.data.midot[i].intensity = val;
          this._save();
          container.querySelectorAll('.intensity-dot').forEach((d, j) => {
            d.classList.toggle('filled', j <= di);
          });
          container.querySelector('.intensity-value').textContent = `${di + 1}/5`;
        });
      });
    });
  },

  /* ── Shared helpers ── */

  _refreshCardSummary(key) {
    const card = document.querySelector(`.kanban-card[data-key="${key}"]`);
    if (!card) return;
    const isDone = this._isDone(key);
    const summary = this._buildSummary(key);
    const oldSummary = card.querySelector('.kanban-summary');
    const oldHint    = card.querySelector('.kanban-summary-hint');
    if (oldSummary) oldSummary.remove();
    if (oldHint)    oldHint.remove();

    let newEl;
    if (isDone && summary) {
      newEl = document.createElement('div');
      newEl.className = 'kanban-summary';
      newEl.innerHTML = summary;
    } else if (!isDone) {
      newEl = document.createElement('div');
      newEl.className = 'kanban-summary-hint';
      newEl.textContent = 'tap to mark complete';
    }
    if (newEl) {
      const body = card.querySelector('.kanban-card-body');
      const detail = body.querySelector('.kanban-detail');
      if (detail) body.insertBefore(newEl, detail);
      else body.appendChild(newEl);
    }
  },

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

  _bindIntensity(card, fieldPath) {
    const container = card.querySelector(`[data-intensity-key="${fieldPath}"]`);
    if (!container) return;
    container.querySelectorAll('.intensity-dot').forEach(dot => {
      dot.addEventListener('click', e => {
        e.stopPropagation();
        const n = parseInt(dot.dataset.intensity);
        const val = n * 2;
        this._setNested(this.data, fieldPath, val);
        this._save();
        container.querySelectorAll('.intensity-dot').forEach((d, i) => {
          d.classList.toggle('filled', i < n);
        });
        container.querySelector('.intensity-value').textContent = `${n}/5`;
        this._refreshCardSummary(fieldPath.split('.')[0]);
      });
    });
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
