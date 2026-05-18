/* ── Hebrew Calendar Module ─────────────────────────────────
   - Hebrew date for any Gregorian date (HebCal /converter)
   - Weekly Parasha — date-aware (HebCal /hebcal with start=end=Sat)
   - Shabbat / Yom Tov candle-lighting + havdalah times based on
     user geolocation (HebCal /hebcal with lat/lon)
   - Geolocation cached in localStorage (tracker_location)
──────────────────────────────────────────────────────────── */
const HebrewCal = {
  _cache: {},

  /* ── Hebrew date converter ── */
  async fetchHebrewDate(dateStr) {
    if (this._cache[`heb_${dateStr}`]) return this._cache[`heb_${dateStr}`];
    const [y, m, d] = dateStr.split('-');
    try {
      const res = await fetch(
        `https://www.hebcal.com/converter?cfg=json&gy=${y}&gm=${parseInt(m)}&gd=${parseInt(d)}&g2h=1`
      );
      const data = await res.json();
      this._cache[`heb_${dateStr}`] = data;
      return data;
    } catch {
      return null;
    }
  },

  /* ── Parasha — date-aware ──────────────────────────────────
     For any date, returns the Parasha of that week's Shabbat
     (the upcoming Saturday, or today if Saturday).             */
  async fetchParasha(dateStr) {
    const sat = this._getShabbatDate(dateStr);
    const cacheKey = `parasha_${sat}`;
    if (cacheKey in this._cache) return this._cache[cacheKey];
    try {
      const res = await fetch(
        `https://www.hebcal.com/hebcal?cfg=json&start=${sat}&end=${sat}&s=on&i=off`
      );
      const data = await res.json();
      const item = (data.items || []).find(i => i.category === 'parashat');
      const result = item ? (item.hebrew || item.title) : null;
      this._cache[cacheKey] = result;
      return result;
    } catch {
      return null;
    }
  },

  /* ── Shabbat / Yom Tov times ───────────────────────────────
     Returns candle-lighting / havdalah events that fall on
     the given date (or null if location unknown / no event).  */
  async fetchShabbatTimes(dateStr) {
    const loc = this.getLocation();
    if (!loc?.lat || !loc?.lon) return null;

    /* Window: day before through day after, so we catch candle
       (Friday evening) AND havdalah (Saturday evening). */
    const start = this._offsetDate(dateStr, -1);
    const end   = this._offsetDate(dateStr, 1);
    const cacheKey = `shab_${dateStr}_${loc.lat}_${loc.lon}`;
    if (cacheKey in this._cache) return this._cache[cacheKey];

    try {
      const url = `https://www.hebcal.com/hebcal?cfg=json` +
        `&start=${start}&end=${end}` +
        `&latitude=${loc.lat}&longitude=${loc.lon}` +
        `&tzid=${encodeURIComponent(loc.tzid)}` +
        `&c=on&b=18&M=on&geo=pos&s=on&i=off&maj=on&min=on&mod=on`;
      const res = await fetch(url);
      const data = await res.json();
      const events = (data.items || []).filter(i => {
        const d = (i.date || '').slice(0, 10);
        return d === dateStr;
      });
      const candles  = events.find(e => e.category === 'candles');
      const havdalah = events.find(e => e.category === 'havdalah');
      const holiday  = events.find(e => e.category === 'holiday' && e.yomtov);
      const parashat = events.find(e => e.category === 'parashat');

      const result = (candles || havdalah || holiday) ? {
        candles:  candles  ? this._extractTime(candles.date)  : null,
        havdalah: havdalah ? this._extractTime(havdalah.date) : null,
        holidayName:
          holiday?.hebrew || holiday?.title ||
          candles?.title?.replace(/^Candle lighting:\s*/i, '').match(/\((.*?)\)/)?.[1] ||
          null,
        location: loc.label || null
      } : null;

      this._cache[cacheKey] = result;
      return result;
    } catch {
      return null;
    }
  },

  /* ── Geolocation ── */
  getLocation() {
    try {
      const raw = localStorage.getItem('tracker_location');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  setLocation(loc) {
    localStorage.setItem('tracker_location', JSON.stringify(loc));
    /* Invalidate Shabbat caches since location changed */
    Object.keys(this._cache).forEach(k => {
      if (k.startsWith('shab_')) delete this._cache[k];
    });
  },

  clearLocation() {
    localStorage.removeItem('tracker_location');
    Object.keys(this._cache).forEach(k => {
      if (k.startsWith('shab_')) delete this._cache[k];
    });
  },

  /* Request geolocation from the browser, then reverse-geocode for a label */
  requestLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by this browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = +pos.coords.latitude.toFixed(4);
          const lon = +pos.coords.longitude.toFixed(4);
          const tzid = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          let label = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
          try {
            const r = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
            );
            const data = await r.json();
            label = data.city || data.locality || data.principalSubdivision || label;
            if (data.countryCode && label && !label.includes(',')) {
              label = `${label}, ${data.countryCode}`;
            }
          } catch { /* leave coords as label */ }
          const loc = { lat, lon, tzid, label };
          this.setLocation(loc);
          resolve(loc);
        },
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 }
      );
    });
  },

  /* ── Public: orchestrated fetch ── */
  async init(dateStr) {
    const [hebrewData, parasha, shabbat] = await Promise.all([
      this.fetchHebrewDate(dateStr),
      this.fetchParasha(dateStr),
      this.fetchShabbatTimes(dateStr)
    ]);
    return { hebrewDate: hebrewData, parasha, shabbat };
  },

  /* ── Formatters ── */
  formatGregorianDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    return `${days[dt.getDay()]}, ${months[m-1]} ${d}, ${y}`;
  },

  /* ── Internal helpers ── */
  _getShabbatDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const daysUntilSat = (6 - dt.getDay() + 7) % 7;
    dt.setDate(dt.getDate() + daysUntilSat);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  },

  _offsetDate(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  },

  _extractTime(isoDate) {
    /* "2026-05-15T19:48:00-04:00" → "7:48 PM" */
    if (!isoDate) return null;
    try {
      const t = isoDate.slice(11, 16); // "19:48"
      const [hh, mm] = t.split(':').map(Number);
      const period = hh >= 12 ? 'PM' : 'AM';
      const h12 = ((hh + 11) % 12) + 1;
      return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
    } catch { return null; }
  }
};
