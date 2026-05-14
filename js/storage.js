/* ── Storage Module ─────────────────────────────────────────
   All localStorage operations. Keys:
     tracker_YYYY-MM-DD  → daily data
     tracker_settings    → user preferences
     tracker_known_traits → remembered Midot trait names
──────────────────────────────────────────────────────────── */
const Storage = {

  defaultDay() {
    return {
      shaharit:      { done: false, time: '', intensity: 0 },
      mincha:        { done: false, time: '', intensity: 0 },
      arvit:         { done: false, time: '', intensity: 0 },
      mikve:         false,
      charity:       { done: false, amount: '' },
      tehilim:       false,
      tikounHaklali: false,
      torahStudy:    [],
      hitbodedout:   { done: false, duration: '' },
      fast:          { isAFastDay: false, performed: false },
      midot:         []
    };
  },

  getDay(dateStr) {
    try {
      const raw = localStorage.getItem(`tracker_${dateStr}`);
      if (!raw) return this.defaultDay();
      return Object.assign(this.defaultDay(), JSON.parse(raw));
    } catch { return this.defaultDay(); }
  },

  saveDay(dateStr, data) {
    localStorage.setItem(`tracker_${dateStr}`, JSON.stringify(data));
  },

  getSettings() {
    try {
      const raw = localStorage.getItem('tracker_settings');
      const defaults = { nusach: 'ashkenaz', currency: '$', fontSize: 1.25 };
      if (!raw) return defaults;
      return Object.assign(defaults, JSON.parse(raw));
    } catch { return { nusach: 'ashkenaz', currency: '$', fontSize: 1.25 }; }
  },

  saveSettings(settings) {
    localStorage.setItem('tracker_settings', JSON.stringify(settings));
  },

  getKnownTraits() {
    try {
      const raw = localStorage.getItem('tracker_known_traits');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  addKnownTrait(trait) {
    const traits = this.getKnownTraits();
    const trimmed = trait.trim();
    if (trimmed && !traits.includes(trimmed)) {
      traits.push(trimmed);
      localStorage.setItem('tracker_known_traits', JSON.stringify(traits));
    }
  },

  getAllDates() {
    const dates = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tracker_') &&
          key !== 'tracker_settings' &&
          key !== 'tracker_known_traits') {
        dates.push(key.replace('tracker_', ''));
      }
    }
    return dates.sort();
  },

  computeScore(data) {
    let score = 0;
    if (data.shaharit?.done)      score++;
    if (data.mincha?.done)        score++;
    if (data.arvit?.done)         score++;
    if (data.mikve)               score++;
    if (data.charity?.done)       score++;
    if (data.tehilim)             score++;
    if (data.tikounHaklali)       score++;
    if (data.torahStudy?.length)  score++;
    if (data.hitbodedout?.done)   score++;
    if (data.midot?.some(m => m.performed)) score++;
    return score;
  }
};
