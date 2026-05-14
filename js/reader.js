/* ── Reader Sheet ──────────────────────────────────────────
   Full-screen slide-up overlay for reading Sefaria texts
   directly in the app. Used for:
     - Tehilim of the day  (single multi-chapter or verse-range ref)
     - Tikoun Haklali       (10 separate psalms fetched in parallel)
     - Daily Halachot       (a single Kitzur Shulchan Aruch chapter)
──────────────────────────────────────────────────────────── */
const Reader = {
  _open:    false,
  _lang:    'he',
  _fontPx:  null,   // overrides default text size via CSS var
  _config:  null,   // current open()'s config
  _content: null,   // normalized fetched content

  init() {
    this._lang = localStorage.getItem('reader_lang') || 'he';
    this._fontPx = parseFloat(localStorage.getItem('reader_font_size_px')) || null;

    document.querySelectorAll('[data-reader-close]').forEach(el => {
      el.addEventListener('click', () => this.close());
    });

    document.getElementById('readerLangToggle')
      .querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => this._setLang(btn.dataset.lang));
      });

    document.getElementById('readerFontDown').addEventListener('click', () => this._adjustFont(-2));
    document.getElementById('readerFontUp').addEventListener('click', () =>   this._adjustFont(+2));

    document.getElementById('readerAction').addEventListener('click', () => this._handleAction());

    document.addEventListener('keydown', e => {
      if (this._open && e.key === 'Escape') this.close();
    });

    this._applyLangClass();
    this._applyFontSize();
  },

  /* ── Public API ── */
  /*
    config = {
      eyebrow:    string         // e.g. "Psalms of the Day"
      title:      string         // English title
      heTitle:    string         // optional Hebrew title
      refs:       string[]       // 1+ Sefaria refs to fetch sequentially as chapters
      action:     'tehilim' | 'tikounHaklali' | null
      actionLabel: string        // CTA button label
    }
  */
  async open(config) {
    this._config = config;
    this._content = null;

    document.getElementById('readerEyebrow').textContent = config.eyebrow || '';
    document.getElementById('readerTitle').textContent   = config.title   || '';
    document.getElementById('readerHeTitle').textContent = config.heTitle || '';

    const actionBtn = document.getElementById('readerAction');
    const actionLabel = document.getElementById('readerActionLabel');
    if (config.action) {
      actionBtn.classList.remove('hidden');
      actionLabel.textContent = config.actionLabel || 'Mark as Done';
      actionBtn.classList.remove('flash');
    } else {
      actionBtn.classList.add('hidden');
    }

    // Open the sheet
    const sheet = document.getElementById('readerSheet');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('reader-open');
    this._open = true;

    // Reset scroll & show loader
    const body = document.getElementById('readerBody');
    body.scrollTop = 0;
    body.innerHTML = `
      <div class="reader-loading">
        <span class="spinner"></span>
        Loading text…
      </div>`;

    // Fetch content
    try {
      const chapters = await this._fetchChapters(config.refs);
      this._content = chapters;
      this._renderContent();
    } catch (err) {
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

  /* ── Fetching ── */
  async _fetchChapters(refs) {
    const results = await Promise.all(refs.map(ref => Sefaria.fetchText(ref)));
    return results.map((data, i) => this._normalizeChapter(data, refs[i]));
  },

  /* Normalize a Sefaria response → { ref, heTitle, enTitle, chapters: [{verses[]|paragraphs[]}] } */
  _normalizeChapter(data, ref) {
    if (!data) return { ref, heTitle: '', enTitle: ref, chapters: [{ ref, heTitle: '', enTitle: ref, verses: [], paragraphs: [] }] };

    const heArr = data.he   || [];
    const enArr = data.text || [];
    const sections   = data.sections   || [];
    const toSections = data.toSections || [];
    const isVerseRange = sections.length >= 2;
    const isMulti = Array.isArray(heArr[0]);

    // Title resolution
    const heTitle = data.heTitle || data.heRef || '';
    const enTitle = data.title   || data.ref   || ref;

    // Multi-chapter range (e.g. Psalms.1-9): nested arrays
    if (isMulti) {
      const sub = [];
      const startCh = sections[0] || 1;
      for (let i = 0; i < heArr.length; i++) {
        const chHe = heArr[i] || [];
        const chEn = enArr[i] || [];
        const verses = chHe.map((v, idx) => ({
          n:  idx + 1,
          he: this._stripHtml(v),
          en: this._stripHtml(chEn[idx] || '')
        }));
        sub.push({
          ref:      `${ref}.${startCh + i}`,
          heTitle:  `${this._hebChapterPrefix()} ${this._toHebrewNum(startCh + i)}`,
          enTitle:  this._chapterEnTitle(data.book || data.indexTitle || enTitle, startCh + i),
          verses,
          paragraphs: []
        });
      }
      return { ref, heTitle, enTitle, chapters: sub };
    }

    // Verse range within a single chapter (e.g. Psalms.119.1-48)
    if (isVerseRange) {
      const startVerse = sections[1] || 1;
      const verses = heArr.map((v, idx) => ({
        n:  startVerse + idx,
        he: this._stripHtml(v),
        en: this._stripHtml(enArr[idx] || '')
      }));
      return {
        ref,
        heTitle,
        enTitle,
        chapters: [{
          ref,
          heTitle,
          enTitle,
          verses,
          paragraphs: []
        }]
      };
    }

    // Single chapter (e.g. Psalms.16) — array of verses
    if (heArr.length && enArr.length) {
      // Try to detect "verse-like" vs "long-text-like":
      // verses are usually short (< 400 chars). Halacha paragraphs are longer.
      const avgLen = heArr.reduce((sum, s) => sum + (this._stripHtml(s || '').length), 0) / Math.max(heArr.length, 1);
      if (avgLen > 350) {
        // Treat as paragraphs (Halacha)
        const paragraphs = heArr.map((p, idx) => ({
          he: this._stripHtml(p),
          en: this._stripHtml(enArr[idx] || '')
        }));
        return {
          ref,
          heTitle,
          enTitle,
          chapters: [{
            ref,
            heTitle,
            enTitle,
            verses: [],
            paragraphs
          }]
        };
      }
      const verses = heArr.map((v, idx) => ({
        n:  idx + 1,
        he: this._stripHtml(v),
        en: this._stripHtml(enArr[idx] || '')
      }));
      return {
        ref,
        heTitle,
        enTitle,
        chapters: [{
          ref,
          heTitle,
          enTitle,
          verses,
          paragraphs: []
        }]
      };
    }

    // Fallback: paragraphs from English
    const paragraphs = (enArr.length ? enArr : heArr).map((p, idx) => ({
      he: this._stripHtml(heArr[idx] || ''),
      en: this._stripHtml(enArr[idx] || '')
    }));
    return {
      ref, heTitle, enTitle,
      chapters: [{ ref, heTitle, enTitle, verses: [], paragraphs }]
    };
  },

  _stripHtml(s) {
    if (!s) return '';
    return String(s).replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').trim();
  },

  _hebChapterPrefix() { return 'פרק'; },
  _chapterEnTitle(book, num) {
    return `${book || 'Chapter'} ${num}`;
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
    const head = (ch.heTitle || ch.enTitle) ? `
      <div class="reader-chapter-head">
        ${ch.heTitle ? `<div class="reader-chapter-he" dir="rtl">${ch.heTitle}</div>` : ''}
        ${ch.enTitle ? `<div class="reader-chapter-en">${ch.enTitle}</div>` : ''}
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
    // Single-language modes use a unified .reader-verse-text;
    // 'both' mode splits into he + en blocks.
    if (this._lang === 'both') {
      return `
        <div class="reader-verse">
          <span class="reader-verse-num">${v.n}</span>
          <div class="reader-verse-he" dir="rtl">${v.he || '—'}</div>
          ${v.en ? `<div class="reader-verse-en">${v.en}</div>` : ''}
        </div>`;
    }
    const text = this._lang === 'he' ? v.he : v.en;
    return `
      <div class="reader-verse">
        <span class="reader-verse-num">${v.n}</span>
        <div class="reader-verse-text">${text || '—'}</div>
      </div>`;
  },

  _renderParagraph(p) {
    if (this._lang === 'both') {
      return `
        <div class="reader-paragraph">
          <div class="reader-paragraph-he" dir="rtl">${p.he || '—'}</div>
          ${p.en ? `<div class="reader-paragraph-en">${p.en}</div>` : ''}
        </div>`;
    }
    const text = this._lang === 'he' ? p.he : p.en;
    return `<div class="reader-paragraph">${text || '—'}</div>`;
  },

  /* ── Language toggle ── */
  _setLang(lang) {
    this._lang = lang;
    localStorage.setItem('reader_lang', lang);
    document.querySelectorAll('#readerLangToggle .lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    this._applyLangClass();
    if (this._content) this._renderContent();
  },

  _applyLangClass() {
    const body = document.getElementById('readerBody');
    body.classList.remove('lang-he', 'lang-en', 'lang-both');
    body.classList.add(`lang-${this._lang}`);
  },

  /* ── Font size ── */
  _adjustFont(delta) {
    // Adjusts a CSS var on the body that scales reader text
    const root = document.getElementById('readerBody');
    const cur = parseFloat(getComputedStyle(root).getPropertyValue('--reader-scale')) || 1.0;
    const next = Math.max(0.7, Math.min(1.7, cur + (delta / 20)));
    root.style.setProperty('--reader-scale', next);
    localStorage.setItem('reader_font_scale', next);
    this._applyFontSize();
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

    // If today's data, refresh Today tab in background (if it's the active tab when reader closes)
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
