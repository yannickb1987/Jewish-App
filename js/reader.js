/* ── Reader Sheet ──────────────────────────────────────────
   Full-screen slide-up overlay for reading Sefaria texts (Hebrew only).
   Used for:
     - Tehilim of the day  (single multi-chapter or verse-range ref)
     - Tikoun Haklali       (10 separate psalms fetched in parallel)
     - Daily Halachot       (a single Kitzur Shulchan Aruch chapter)
──────────────────────────────────────────────────────────── */
const Reader = {
  _open:    false,
  _config:  null,
  _content: null,

  init() {
    document.querySelectorAll('[data-reader-close]').forEach(el => {
      el.addEventListener('click', () => this.close());
    });

    document.getElementById('readerFontDown').addEventListener('click', () => this._adjustFont(-2));
    document.getElementById('readerFontUp').addEventListener('click', () =>   this._adjustFont(+2));

    document.getElementById('readerAction').addEventListener('click', () => this._handleAction());

    document.addEventListener('keydown', e => {
      if (this._open && e.key === 'Escape') this.close();
    });

    this._applyFontSize();
  },

  /*
    config = {
      eyebrow:    string         e.g. "Psalms of the Day"
      title:      string         English title
      heTitle:    string         optional Hebrew title
      refs:       string[]       1+ Sefaria refs to fetch sequentially as chapters
      action:     'tehilim' | 'tikounHaklali' | null
      actionLabel: string        CTA button label
    }
  */
  async open(config) {
    this._config = config;
    this._content = null;

    document.getElementById('readerEyebrow').textContent = config.eyebrow || '';
    document.getElementById('readerTitle').textContent   = config.title   || '';
    document.getElementById('readerHeTitle').textContent = config.heTitle || '';

    const actionBtn   = document.getElementById('readerAction');
    const actionLabel = document.getElementById('readerActionLabel');
    if (config.action) {
      actionBtn.classList.remove('hidden');
      actionLabel.textContent = config.actionLabel || 'Mark as Done';
      actionBtn.classList.remove('flash');
    } else {
      actionBtn.classList.add('hidden');
    }

    const sheet = document.getElementById('readerSheet');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('reader-open');
    this._open = true;

    const body = document.getElementById('readerBody');
    body.scrollTop = 0;
    body.innerHTML = `
      <div class="reader-loading">
        <span class="spinner"></span>
        Loading text…
      </div>`;

    try {
      const chapters = await this._fetchChapters(config.refs);
      this._content = chapters;
      this._renderContent();
    } catch {
      body.innerHTML = `
        <div class="reader-error">
          <p>Could not load the text from Sefaria.</p>
          <p style="font-size:.85rem;color:var(--text-3)">Check your internet connection or try again.</p>
        </div>`;
    }
  },

  close() {
    document.getElementById('readerSheet').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('reader-open');
    this._open = false;
  },

  /* ── Fetching & normalization ── */
  async _fetchChapters(refs) {
    const results = await Promise.all(refs.map(ref => Sefaria.fetchText(ref)));
    return results.map((data, i) => this._normalizeChapter(data, refs[i]));
  },

  /* Normalize a Sefaria response → { ref, heTitle, chapters: [{verses[]|paragraphs[]}] } */
  _normalizeChapter(data, ref) {
    if (!data) return { ref, heTitle: '', chapters: [{ ref, heTitle: '', verses: [], paragraphs: [] }] };

    const heArr = data.he || [];
    const sections   = data.sections   || [];
    const isVerseRange = sections.length >= 2;
    const isMulti = Array.isArray(heArr[0]);
    const heTitle = data.heTitle || data.heRef || '';

    /* Multi-chapter range (e.g. Psalms.1-9): nested arrays */
    if (isMulti) {
      const sub = [];
      const startCh = sections[0] || 1;
      for (let i = 0; i < heArr.length; i++) {
        const chHe = heArr[i] || [];
        const verses = chHe.map((v, idx) => ({
          n:  idx + 1,
          he: this._stripHtml(v)
        }));
        sub.push({
          ref:     `${ref}.${startCh + i}`,
          heTitle: `פרק ${this._toHebrewNum(startCh + i)}`,
          verses,
          paragraphs: []
        });
      }
      return { ref, heTitle, chapters: sub };
    }

    /* Verse range within a single chapter (e.g. Psalms.119.1-48) */
    if (isVerseRange) {
      const startVerse = sections[1] || 1;
      const verses = heArr.map((v, idx) => ({
        n:  startVerse + idx,
        he: this._stripHtml(v)
      }));
      return {
        ref, heTitle,
        chapters: [{ ref, heTitle, verses, paragraphs: [] }]
      };
    }

    /* Single chapter — detect verses vs long paragraphs by avg length */
    if (heArr.length) {
      const avgLen = heArr.reduce((sum, s) => sum + (this._stripHtml(s || '').length), 0) / Math.max(heArr.length, 1);
      if (avgLen > 350) {
        const paragraphs = heArr.map(p => ({ he: this._stripHtml(p) }));
        return { ref, heTitle, chapters: [{ ref, heTitle, verses: [], paragraphs }] };
      }
      const verses = heArr.map((v, idx) => ({ n: idx + 1, he: this._stripHtml(v) }));
      return { ref, heTitle, chapters: [{ ref, heTitle, verses, paragraphs: [] }] };
    }

    return { ref, heTitle, chapters: [{ ref, heTitle, verses: [], paragraphs: [] }] };
  },

  _stripHtml(s) {
    if (!s) return '';
    return String(s).replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').trim();
  },

  /* Convert 1–150 to Hebrew gematria letters (alef, bet, ..., קנ) */
  _toHebrewNum(n) {
    if (!Number.isInteger(n) || n < 1) return String(n);
    const ones = ['', 'א','ב','ג','ד','ה','ו','ז','ח','ט'];
    const tens = ['', 'י','כ','ל','מ','נ','ס','ע','פ','צ'];
    const huns = ['', 'ק','ר','ש','ת'];
    let out = '';
    let v = n;
    if (v >= 100) {
      while (v >= 400) { out += 'ת'; v -= 400; }
      if (v >= 100) { out += huns[Math.floor(v / 100)]; v = v % 100; }
    }
    if (v === 15) return out + 'טו';
    if (v === 16) return out + 'טז';
    if (v >= 10) { out += tens[Math.floor(v / 10)]; v = v % 10; }
    if (v > 0)   { out += ones[v]; }
    return out;
  },

  /* ── Rendering ── */
  _renderContent() {
    const body = document.getElementById('readerBody');
    if (!this._content || !this._content.length) {
      body.innerHTML = '<div class="reader-error"><p>No text was returned.</p></div>';
      return;
    }
    const flat = this._content.flatMap(c => c.chapters || []);
    body.innerHTML = `<div class="reader-inner">${flat.map(ch => this._renderChapter(ch)).join('')}</div>`;
  },

  _renderChapter(ch) {
    const head = ch.heTitle ? `
      <div class="reader-chapter-head">
        <div class="reader-chapter-he" dir="rtl">${ch.heTitle}</div>
      </div>` : '';

    if (ch.verses && ch.verses.length) {
      return `
        <section class="reader-chapter">
          ${head}
          ${ch.verses.map(v => this._renderVerse(v)).join('')}
        </section>`;
    }
    if (ch.paragraphs && ch.paragraphs.length) {
      return `
        <section class="reader-chapter">
          ${head}
          ${ch.paragraphs.map(p => this._renderParagraph(p)).join('')}
        </section>`;
    }
    return `<section class="reader-chapter">${head}<div class="reader-error"><p>Text unavailable for this section.</p></div></section>`;
  },

  _renderVerse(v) {
    return `
      <div class="reader-verse">
        <span class="reader-verse-num">${v.n}</span>
        <div class="reader-verse-text" dir="rtl">${v.he || '—'}</div>
      </div>`;
  },

  _renderParagraph(p) {
    return `<div class="reader-paragraph" dir="rtl">${p.he || '—'}</div>`;
  },

  /* ── Font size ── */
  _adjustFont(delta) {
    const root = document.getElementById('readerBody');
    const cur = parseFloat(getComputedStyle(root).getPropertyValue('--reader-scale')) || 1.0;
    const next = Math.max(0.7, Math.min(1.7, cur + (delta / 20)));
    root.style.setProperty('--reader-scale', next);
    localStorage.setItem('reader_font_scale', next);
  },

  _applyFontSize() {
    const root = document.getElementById('readerBody');
    const saved = parseFloat(localStorage.getItem('reader_font_scale'));
    const scale = saved && !Number.isNaN(saved) ? saved : 1;
    root.style.setProperty('--reader-scale', scale);
  },

  /* ── Mark complete CTA ── */
  _handleAction() {
    const config = this._config;
    if (!config?.action) return;

    const date = App.currentDate;
    const data = Storage.getDay(date);
    const key  = config.action;

    if (key === 'tehilim' || key === 'tikounHaklali') {
      data[key] = true;
    }
    Storage.saveDay(date, data);

    const btn   = document.getElementById('readerAction');
    const label = document.getElementById('readerActionLabel');
    btn.classList.add('flash');
    label.textContent = '✓ Done';

    setTimeout(() => {
      this.close();
      btn.classList.remove('flash');
      label.textContent = config.actionLabel || 'Mark as Done';
      if (App.activeTab === 'today' && date === App.currentDate) {
        Tracker.render(App.currentDate);
      }
    }, 1100);
  }
};
