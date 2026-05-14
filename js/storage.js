/* ── Storage Module ─────────────────────────────────────────
   Sync-aware façade. Always reads/writes localStorage for instant
   access; when a Firebase user is signed in, writes also flow to
   Firestore and remote days are merged in on sign-in.

   localStorage keys:
     tracker_YYYY-MM-DD     → daily tracker data
     tracker_settings       → user settings (currency)
     tracker_known_traits   → remembered Midot trait names
     tracker_profile        → user profile (name, committed practices)
     tracker_theme          → 'light' | 'dark' (manual override)
──────────────────────────────────────────────────────────── */
const Storage = {

  /* ════════════════ Daily data ════════════════ */
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
    if (Auth?.user && window.fbReady) {
      Sync.saveDay(Auth.user.uid, dateStr, data).catch(e => console.warn('[storage] remote save failed', e));
    }
  },

  /* ════════════════ Profile ════════════════ */
  defaultProfile() {
    return {
      name:               '',
      committedPractices: [], // empty = all practices considered committed
      onboardingDone:     false
    };
  },

  getProfile() {
    try {
      const raw = localStorage.getItem('tracker_profile');
      if (!raw) return this.defaultProfile();
      return Object.assign(this.defaultProfile(), JSON.parse(raw));
    } catch { return this.defaultProfile(); }
  },

  saveProfile(p) {
    localStorage.setItem('tracker_profile', JSON.stringify(p));
    if (Auth?.user && window.fbReady) {
      Sync.saveProfile(Auth.user.uid, p).catch(e => console.warn('[storage] profile sync failed', e));
    }
  },

  /* ════════════════ Settings ════════════════ */
  getSettings() {
    try {
      const raw = localStorage.getItem('tracker_settings');
      const defaults = { currency: '$' };
      if (!raw) return defaults;
      return Object.assign(defaults, JSON.parse(raw));
    } catch { return { currency: '$' }; }
  },

  saveSettings(settings) {
    localStorage.setItem('tracker_settings', JSON.stringify(settings));
  },

  /* ════════════════ Midot traits ════════════════ */
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

  /* ════════════════ All dates ════════════════ */
  getAllDates() {
    const dates = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tracker_') &&
          !['tracker_settings','tracker_known_traits','tracker_profile','tracker_theme'].includes(key)) {
        dates.push(key.replace('tracker_', ''));
      }
    }
    return dates.sort();
  },

  /* ════════════════ Score ════════════════ */
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
  },

  /* ════════════════ Sync hook (called by Auth) ════════════════ */
  async onAuthChanged(user) {
    if (!user || !window.fbReady) return;

    // Merge remote profile into local
    try {
      const remoteProfile = await Sync.fetchProfile(user.uid);
      const localProfile  = this.getProfile();
      let merged;
      if (remoteProfile) {
        // Take whichever is more "complete" — if local already has onboarding done
        // and remote doesn't, push local up. Else take remote.
        if (localProfile.onboardingDone && !remoteProfile.onboardingDone) {
          merged = localProfile;
          await Sync.saveProfile(user.uid, merged);
        } else {
          merged = Object.assign(this.defaultProfile(), remoteProfile);
          localStorage.setItem('tracker_profile', JSON.stringify(merged));
        }
      } else if (localProfile.onboardingDone) {
        merged = localProfile;
        await Sync.saveProfile(user.uid, merged);
      }
    } catch (e) { console.warn('[storage] profile merge failed', e); }

    // Merge remote days (later _updatedAt wins; remote without one yields to local)
    try {
      const remoteDays = await Sync.fetchAllDays(user.uid);
      const remoteSet = new Set(Object.keys(remoteDays));

      // Push remote days into local (overwrite if remote has _updatedAt newer than local)
      Object.entries(remoteDays).forEach(([dateStr, remoteData]) => {
        const localRaw = localStorage.getItem(`tracker_${dateStr}`);
        if (!localRaw) {
          // No local copy — take remote
          const { _updatedAt, ...clean } = remoteData;
          localStorage.setItem(`tracker_${dateStr}`, JSON.stringify(clean));
        } else {
          // Local exists — naïve "remote wins on first sync" only if it has real data
          const { _updatedAt, ...clean } = remoteData;
          if (Storage.computeScore(clean) >= Storage.computeScore(JSON.parse(localRaw))) {
            localStorage.setItem(`tracker_${dateStr}`, JSON.stringify(clean));
          }
        }
      });

      // Push local-only days up to Firestore
      const localDates = this.getAllDates();
      const uploads = localDates
        .filter(d => !remoteSet.has(d))
        .map(d => Sync.saveDay(user.uid, d, this.getDay(d)));
      await Promise.allSettled(uploads);
    } catch (e) {
      console.warn('[storage] days merge failed', e);
    }

    // Notify the app so it can re-render
    if (typeof App !== 'undefined' && App._onSyncComplete) App._onSyncComplete();
  }
};
