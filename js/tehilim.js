/* ── Tehilim Module ─────────────────────────────────────────
   30-day monthly Tehilim schedule (standard cycle).
   Day index is based on Hebrew day of month (1–30).
──────────────────────────────────────────────────────────── */
const Tehilim = {

  schedule: [
    { day: 1,  label: 'א׳–ט׳',     psalms: '1–9',        ref: 'Psalms.1-9' },
    { day: 2,  label: 'י׳–י״ז',    psalms: '10–17',      ref: 'Psalms.10-17' },
    { day: 3,  label: 'י״ח–כ״ב',   psalms: '18–22',      ref: 'Psalms.18-22' },
    { day: 4,  label: 'כ״ג–כ״ח',   psalms: '23–28',      ref: 'Psalms.23-28' },
    { day: 5,  label: 'כ״ט–ל״ד',   psalms: '29–34',      ref: 'Psalms.29-34' },
    { day: 6,  label: 'ל״ה–ל״ח',   psalms: '35–38',      ref: 'Psalms.35-38' },
    { day: 7,  label: 'ל״ט–מ״ג',   psalms: '39–43',      ref: 'Psalms.39-43' },
    { day: 8,  label: 'מ״ד–מ״ח',   psalms: '44–48',      ref: 'Psalms.44-48' },
    { day: 9,  label: 'מ״ט–נ״ד',   psalms: '49–54',      ref: 'Psalms.49-54' },
    { day: 10, label: 'נ״ה–נ״ט',   psalms: '55–59',      ref: 'Psalms.55-59' },
    { day: 11, label: 'ס׳–ס״ה',    psalms: '60–65',      ref: 'Psalms.60-65' },
    { day: 12, label: 'ס״ו–ס״ח',   psalms: '66–68',      ref: 'Psalms.66-68' },
    { day: 13, label: 'ס״ט–ע״א',   psalms: '69–71',      ref: 'Psalms.69-71' },
    { day: 14, label: 'ע״ב–ע״ו',   psalms: '72–76',      ref: 'Psalms.72-76' },
    { day: 15, label: 'ע״ז–ע״ח',   psalms: '77–78',      ref: 'Psalms.77-78' },
    { day: 16, label: 'ע״ט–פ״ב',   psalms: '79–82',      ref: 'Psalms.79-82' },
    { day: 17, label: 'פ״ג–פ״ז',   psalms: '83–87',      ref: 'Psalms.83-87' },
    { day: 18, label: 'פ״ח–פ״ט',   psalms: '88–89',      ref: 'Psalms.88-89' },
    { day: 19, label: 'צ׳–צ״ו',    psalms: '90–96',      ref: 'Psalms.90-96' },
    { day: 20, label: 'צ״ז–ק״ג',   psalms: '97–103',     ref: 'Psalms.97-103' },
    { day: 21, label: 'ק״ד–ק״ה',   psalms: '104–105',    ref: 'Psalms.104-105' },
    { day: 22, label: 'ק״ו–ק״ז',   psalms: '106–107',    ref: 'Psalms.106-107' },
    { day: 23, label: 'ק״ח–קי״ב',  psalms: '108–112',    ref: 'Psalms.108-112' },
    { day: 24, label: 'קי״ג–קי״ח', psalms: '113–118',    ref: 'Psalms.113-118' },
    { day: 25, label: 'קי״ט א׳–מ׳', psalms: '119:1–48',  ref: 'Psalms.119.1-48' },
    { day: 26, label: 'קי״ט מ״ט–צ״ו', psalms: '119:49–96', ref: 'Psalms.119.49-96' },
    { day: 27, label: 'קי״ט צ״ז–קמ״ד', psalms: '119:97–144', ref: 'Psalms.119.97-144' },
    { day: 28, label: 'קי״ט קמ״ה–קע״ו', psalms: '119:145–176', ref: 'Psalms.119.145-176' },
    { day: 29, label: 'ק״כ–קל״ד',  psalms: '120–134',    ref: 'Psalms.120-134' },
    { day: 30, label: 'קל״ה–ק״נ',  psalms: '135–150',    ref: 'Psalms.135-150' },
  ],

  tikounHaklali: {
    nums: [16, 32, 41, 42, 59, 77, 90, 105, 137, 150],
    hebrew: 'טז · לב · מא · מב · נט · עז · צ · קה · קלז · קנ',
    ref: 'Psalms.16'
  },

  getForHebrewDay(hd) {
    const day = Math.max(1, Math.min(30, hd || 1));
    return this.schedule[day - 1];
  }
};
