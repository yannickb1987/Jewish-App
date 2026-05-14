/* ── Auth ──────────────────────────────────────────────────
   Google Sign-In + auth-state listener.
   Triggers data sync via Storage.onAuthChanged(user).
──────────────────────────────────────────────────────────── */
const Auth = {
  user: null,
  _listeners: [],

  isEnabled() { return !!window.fbReady; },

  init() {
    if (!this.isEnabled()) return;
    window.fbAuth.onAuthStateChanged(async (user) => {
      this.user = user;
      this._notify();
      if (Storage.onAuthChanged) {
        try { await Storage.onAuthChanged(user); }
        catch (e) { console.warn('[auth] sync failed', e); }
      }
    });
  },

  async signInWithGoogle() {
    if (!this.isEnabled()) throw new Error('Firebase not configured');
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await window.fbAuth.signInWithPopup(provider);
      return result.user;
    } catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
        // Fall back to redirect (mobile-friendly)
        await window.fbAuth.signInWithRedirect(provider);
      } else {
        throw e;
      }
    }
  },

  async signOut() {
    if (!this.isEnabled()) return;
    await window.fbAuth.signOut();
  },

  onChange(fn) {
    this._listeners.push(fn);
    fn(this.user);
  },

  _notify() {
    this._listeners.forEach(fn => { try { fn(this.user); } catch {} });
  }
};
