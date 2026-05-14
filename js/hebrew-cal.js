/* ── Hebrew Calendar Module ─────────────────────────────────
   Fetches Hebrew date and weekly Parasha from HebCal API.
──────────────────────────────────────────────────────────── */
const HebrewCal = {
  _cache: {},

  async fetchHebrewDate(dateStr) {
    if (this._cache[dateStr]) return this._cache[dateStr];
    const [y, m, d] = dateStr.split('-');
    try {
      const res = await fetch(
        `https://www.hebcal.com/converter?cfg=json&gy=${y}&gm=${parseInt(m)}&gd=${parseInt(d)}&g2h=1`
      );
      const data = await res.json();
      this._cache[dateStr] = data;
      return data;
    } catch {
      return null;
    }
  },

  async fetchParasha() {
    try {
      const res = await fetch('https://www.hebcal.com/shabbat?cfg=json&geo=none&m=50');
      const data = await res.json();
      const item = data.items?.find(i =>
        i.category === 'parashat' || i.category === 'holiday'
      );
      return item ? (item.hebrew || item.title) : null;
    } catch {
      return null;
    }
  },

  async init(dateStr) {
    const [hebrewData, parasha] = await Promise.all([
      this.fetchHebrewDate(dateStr),
      this.fetchParasha()
    ]);
    return { hebrewDate: hebrewData, parasha };
  },

  formatGregorianDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    return `${days[dt.getDay()]}, ${months[m-1]} ${d}, ${y}`;
  }
};
