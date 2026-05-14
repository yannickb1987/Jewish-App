/* ── Onboarding ────────────────────────────────────────────
   First-launch wizard: welcome → name → practices → sign-in.
   Profile editing sheet (Edit committed practices) reuses the
   same practice picker.
──────────────────────────────────────────────────────────── */
const Onboarding = {

  /* All 10 practices the user can commit to */
  PRACTICES: [
    { key: 'shaharit',      he: 'שַׁחֲרִית',         en: 'Shaharit' },
    { key: 'mincha',        he: 'מִנְחָה',            en: 'Mincha' },
    { key: 'arvit',         he: 'עַרְבִית',           en: 'Arvit' },
    { key: 'mikve',         he: 'מִקְוֶה',            en: 'Mikve' },
    { key: 'tehilim',       he: 'תְּהִלִּים',          en: 'Tehilim' },
    { key: 'tikounHaklali', he: 'תִּקּוּן הַכְּלָלִי',  en: 'Tikoun Haklali' },
    { key: 'torahStudy',    he: 'לִמּוּד תּוֹרָה',     en: 'Torah Study' },
    { key: 'hitbodedout',   he: 'הִתְבּוֹדְדוּת',       en: 'Hitbodedut' },
    { key: 'charity',       he: 'צְדָקָה',            en: 'Tzedaka' },
    { key: 'midot',         he: 'מִדּוֹת',             en: 'Midot' }
  ],

  _step:        1,
  _draftName:   '',
  _draftCommits: null, // Set of practice keys

  init() {
    /* Show onboarding if not done yet */
    const profile = Storage.getProfile();
    if (!profile.onboardingDone) {
      this.start();
    }

    /* Wire up profile-tab actions */
    this._bindNameField();
    this._bindEditPractices();
    this._bindOnboardingControls();
  },

  /* ── First-launch start ── */
  start() {
    const profile = Storage.getProfile();
    this._draftName = profile.name || '';
    this._draftCommits = new Set(
      (profile.committedPractices && profile.committedPractices.length)
        ? profile.committedPractices
        : this.PRACTICES.map(p => p.key) // default = all
    );
    this._step = 1;
    this._renderStep();
    this._renderPracticeList('onboardPractices');
    document.getElementById('onboardSheet').setAttribute('aria-hidden', 'false');
    document.body.classList.add('onboard-open');
  },

  _close() {
    document.getElementById('onboardSheet').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('onboard-open');
  },

  _bindOnboardingControls() {
    const sheet = document.getElementById('onboardSheet');

    sheet.querySelectorAll('[data-onboard-next]').forEach(b => b.addEventListener('click', () => this._advance()));
    sheet.querySelectorAll('[data-onboard-skip]').forEach(b => b.addEventListener('click', () => this._advance(true)));
    sheet.querySelectorAll('[data-onboard-finish]').forEach(b => b.addEventListener('click', () => this._finish()));

    document.getElementById('onboardNameInput').addEventListener('input', e => {
      this._draftName = e.target.value.trim();
    });

    document.getElementById('onboardSignIn').addEventListener('click', async () => {
      if (!Auth.isEnabled()) {
        alert('Sign-in requires Firebase setup. See README for instructions.');
        return;
      }
      try {
        await Auth.signInWithGoogle();
        this._finish();
      } catch (e) {
        console.warn('[onboarding] sign-in failed', e);
        alert('Sign-in failed. You can continue without signing in.');
      }
    });
  },

  _renderStep() {
    const sheet = document.getElementById('onboardSheet');
    sheet.querySelectorAll('.onboard-step').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.step) === this._step);
    });
    sheet.querySelectorAll('.onboard-dot').forEach(d => {
      d.classList.toggle('active', parseInt(d.dataset.step) <= this._step);
    });
    if (this._step === 2) {
      const inp = document.getElementById('onboardNameInput');
      inp.value = this._draftName;
      setTimeout(() => inp.focus(), 120);
    }
    // Hide sign-in step if Firebase isn't configured
    if (this._step === 4 && !Auth.isEnabled()) {
      this._finish();
    }
  },

  _advance(skip = false) {
    if (this._step === 2 && !skip) {
      this._saveName();
    }
    if (this._step === 3) {
      this._saveCommits();
    }
    if (this._step < 4) {
      this._step++;
      this._renderStep();
    } else {
      this._finish();
    }
  },

  _saveName() {
    const profile = Storage.getProfile();
    profile.name = this._draftName;
    Storage.saveProfile(profile);
  },

  _saveCommits() {
    const profile = Storage.getProfile();
    profile.committedPractices = Array.from(this._draftCommits);
    Storage.saveProfile(profile);
  },

  _finish() {
    /* Finalize all drafts */
    const profile = Storage.getProfile();
    profile.name              = this._draftName;
    profile.committedPractices = Array.from(this._draftCommits || []);
    profile.onboardingDone    = true;
    Storage.saveProfile(profile);
    this._close();
    if (typeof App !== 'undefined') {
      App._refreshAfterOnboarding();
    }
  },

  /* ── Practice list rendering ── */
  _renderPracticeList(containerId) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = this.PRACTICES.map(p => `
      <div class="practice-toggle ${this._draftCommits.has(p.key) ? 'on' : ''}" data-pkey="${p.key}">
        <div class="practice-toggle-check">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="practice-toggle-label">
          <div class="practice-toggle-he" dir="rtl">${p.he}</div>
          <div class="practice-toggle-en">${p.en}</div>
        </div>
      </div>`).join('');

    c.querySelectorAll('.practice-toggle').forEach(t => {
      t.addEventListener('click', () => {
        const k = t.dataset.pkey;
        if (this._draftCommits.has(k)) this._draftCommits.delete(k);
        else this._draftCommits.add(k);
        t.classList.toggle('on', this._draftCommits.has(k));
      });
    });
  },

  /* ── Profile: edit name inline ── */
  _bindNameField() {
    const input = document.getElementById('profileNameInput');
    if (!input) return;
    input.value = Storage.getProfile().name || '';
    input.addEventListener('input', e => {
      const p = Storage.getProfile();
      p.name = e.target.value.trim();
      Storage.saveProfile(p);
      if (typeof App !== 'undefined') App._updateGreeting();
    });
  },

  /* ── Profile: edit committed practices sheet ── */
  _bindEditPractices() {
    const sheet = document.getElementById('practicesSheet');
    const open  = () => {
      const profile = Storage.getProfile();
      this._draftCommits = new Set(
        (profile.committedPractices && profile.committedPractices.length)
          ? profile.committedPractices
          : this.PRACTICES.map(p => p.key)
      );
      this._renderPracticeList('practicesEditList');
      sheet.setAttribute('aria-hidden', 'false');
      document.body.classList.add('onboard-open');
    };
    const close = () => {
      sheet.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('onboard-open');
    };

    const editBtn = document.getElementById('editPracticesRow');
    if (editBtn) editBtn.addEventListener('click', open);

    sheet.querySelectorAll('[data-practices-close]').forEach(b => b.addEventListener('click', close));
    document.getElementById('practicesSave').addEventListener('click', () => {
      const p = Storage.getProfile();
      p.committedPractices = Array.from(this._draftCommits);
      Storage.saveProfile(p);
      close();
      if (typeof Tracker !== 'undefined' && App.activeTab === 'today') {
        Tracker.render(App.currentDate);
      }
    });
  }
};
