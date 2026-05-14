/* ── Sefaria Module ─────────────────────────────────────────
   Fetches Kitzur Shulchan Aruch passages for daily Halachot.
   227 chapters → 2 per day cycling by day-of-year.
──────────────────────────────────────────────────────────── */
const Sefaria = {
  _cache: {},

  async fetchText(ref) {
    if (this._cache[ref]) return this._cache[ref];
    try {
      const res = await fetch(
        `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?lang=en&context=0`
      );
      const data = await res.json();
      this._cache[ref] = data;
      return data;
    } catch {
      return null;
    }
  },

  getDailyChapters(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const start = new Date(y, 0, 1);
    const now   = new Date(y, m - 1, d);
    const doy   = Math.floor((now - start) / 86400000) + 1;
    const unitCount = 113;
    const unit  = ((doy - 1) % unitCount);
    const ch1   = unit * 2 + 1;
    const ch2   = Math.min(ch1 + 1, 227);
    return [ch1, ch2];
  },

  async fetchDailyHalachot(dateStr) {
    const [ch1, ch2] = this.getDailyChapters(dateStr);
    const refs = [
      `Kitzur_Shulchan_Aruch.${ch1}`,
      ch2 !== ch1 ? `Kitzur_Shulchan_Aruch.${ch2}` : null
    ].filter(Boolean);

    const results = await Promise.all(refs.map(r => this.fetchText(r)));
    return results.map((data, i) => ({
      chapter: i === 0 ? ch1 : ch2,
      ref:     refs[i],
      title:   data?.title  || `Chapter ${i === 0 ? ch1 : ch2}`,
      heTitle: data?.heTitle || '',
      text:    this._extractText(data?.text),
      heText:  this._extractText(data?.he),
      url:     `https://www.sefaria.org/${refs[i]}?lang=en`
    }));
  },

  _extractText(raw) {
    if (!raw) return '';
    const flatten = arr =>
      Array.isArray(arr) ? arr.flatMap(flatten) : [arr];
    return flatten(raw)
      .filter(Boolean)
      .slice(0, 3)
      .map(s => s.replace(/<[^>]+>/g, '').trim())
      .filter(s => s.length > 0)
      .join(' ');
  }
};
