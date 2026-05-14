/* ── Siddur (Pill selector + centered reader) ──────────────
   Three pill rows: Nusach · Prayer · Section
   Centered single-column reader, large Hebrew type.
   Floating "Mark as Done" pill bottom-right (CSS-controlled).
──────────────────────────────────────────────────────────── */
const Siddur = {
  currentPrayer:  'shaharit',
  currentSection: null,
  fontSize:       1.55,

  render() {
    const settings = Storage.getSettings();
    this.fontSize  = settings.fontSize || 1.55;
    this._applyFontSize();

    this._bindNusachPills(settings.nusach);
    this._bindPrayerPills();
    this._bindFontControls();
    this._bindMarkDone();
    this._selectPrayer(this.currentPrayer);
  },

  _bindNusachPills(savedNusach) {
    document.querySelectorAll('#nusachSelector .pill-btn').forEach(btn => {
      const n = btn.dataset.nusach;
      btn.classList.toggle('active', n === savedNusach);
      btn.onclick = () => {
        document.querySelectorAll('#nusachSelector .pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const s = Storage.getSettings();
        s.nusach = n;
        Storage.saveSettings(s);
        if (this.currentSection) this._loadSection(this.currentSection);
      };
    });
  },

  _bindPrayerPills() {
    document.querySelectorAll('#prayerSelector .pill-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#prayerSelector .pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._selectPrayer(btn.dataset.prayer);
      };
    });
  },

  _bindFontControls() {
    document.getElementById('fontDecrease').onclick = () => {
      this.fontSize = Math.max(1.05, this.fontSize - 0.15);
      this._applyFontSize();
      const s = Storage.getSettings(); s.fontSize = this.fontSize; Storage.saveSettings(s);
    };
    document.getElementById('fontIncrease').onclick = () => {
      this.fontSize = Math.min(2.6, this.fontSize + 0.15);
      this._applyFontSize();
      const s = Storage.getSettings(); s.fontSize = this.fontSize; Storage.saveSettings(s);
    };
  },

  _applyFontSize() {
    const el = document.getElementById('siddurText');
    if (el) el.style.fontSize = `${this.fontSize}rem`;
  },

  _bindMarkDone() {
    const btn = document.getElementById('markPrayerDone');
    btn.onclick = () => {
      const date   = App.currentDate;
      const data   = Storage.getDay(date);
      const prayer = this.currentPrayer;
      if (data[prayer]) {
        data[prayer].done = true;
        if (!data[prayer].time) {
          const now = new Date();
          data[prayer].time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        }
        Storage.saveDay(date, data);
        const orig = btn.innerHTML;
        btn.classList.add('flash');
        btn.innerHTML = '✓ Saved';
        setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('flash'); }, 1600);
      }
    };
  },

  _selectPrayer(prayer) {
    this.currentPrayer  = prayer;
    this.currentSection = null;
    const sections = SiddurRefs.getSections(prayer);

    const cont = document.getElementById('siddurSections');
    cont.innerHTML = sections.map(s => `
      <button class="pill-btn" data-section="${s.key}">${s.labelEn}</button>
    `).join('');

    cont.querySelectorAll('.pill-btn').forEach(btn => {
      btn.onclick = () => {
        cont.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._loadSection(btn.dataset.section);
      };
    });

    if (sections.length) {
      cont.querySelector('.pill-btn').classList.add('active');
      this._loadSection(sections[0].key);
    }
  },

  async _loadSection(sectionKey) {
    this.currentSection = sectionKey;
    const settings = Storage.getSettings();
    const nusach   = settings.nusach || 'ashkenaz';
    const ref      = SiddurRefs.get(this.currentPrayer, sectionKey, nusach);
    const textEl   = document.getElementById('siddurText');

    if (!ref) {
      textEl.innerHTML = '<div class="empty-state">This section is not available for the selected nusach. Try another.</div>';
      return;
    }

    const cacheKey = `siddur_${ref}`;
    const cached   = sessionStorage.getItem(cacheKey);
    if (cached) { this._renderText(JSON.parse(cached), textEl, ref); return; }

    textEl.innerHTML = '<div class="loading"><span class="spinner"></span> Loading prayer…</div>';

    try {
      const res = await fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?lang=he&context=0&commentary=0`);
      const data = await res.json();
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      this._renderText(data, textEl, ref);
    } catch {
      textEl.innerHTML = `
        <div class="empty-state">
          <p>Could not load this prayer.</p>
          <p style="font-size:.8rem;margin-top:8px">Check your internet connection.</p>
          <a class="content-cta" style="margin-top:12px" href="https://www.sefaria.org/${encodeURIComponent(ref)}" target="_blank">
            Open in Sefaria <span class="cta-arrow">↗</span>
          </a>
        </div>`;
    }
  },

  _renderText(data, textEl, ref) {
    const sections = SiddurRefs.getSections(this.currentPrayer);
    const sec = sections.find(s => s.key === this.currentSection);

    const renderArr = arr => {
      if (!arr) return '';
      const flat = a => Array.isArray(a) ? a.flatMap(flat) : [a];
      return flat(arr)
        .filter(Boolean)
        .map(s => `<p>${s}</p>`)
        .join('');
    };

    const heHTML = typeof data.he === 'string' ? `<p>${data.he}</p>` : renderArr(data.he);
    const enHTML = typeof data.text === 'string' ? `<p>${data.text}</p>` : renderArr(data.text);

    // restart fade animation
    textEl.style.animation = 'none';
    void textEl.offsetWidth;
    textEl.style.animation = '';

    textEl.innerHTML = `
      ${sec ? `<div class="siddur-heading" dir="rtl">${sec.label}</div>
               <div class="siddur-heading-en">${sec.labelEn}</div>` : ''}
      <div class="siddur-hebrew-text" dir="rtl">${heHTML || '<p style="color:var(--text-3);text-align:center">Hebrew text not available inline.</p>'}</div>
      ${enHTML && heHTML ? '<hr class="siddur-section-divider">' : ''}
      ${enHTML ? `<div class="siddur-en-text">${enHTML}</div>` : ''}
      <div style="margin-top:32px;text-align:center">
        <a class="content-cta" href="https://www.sefaria.org/${encodeURIComponent(ref)}" target="_blank">
          Open full text in Sefaria <span class="cta-arrow">↗</span>
        </a>
      </div>`;
    this._applyFontSize();
  }
};
