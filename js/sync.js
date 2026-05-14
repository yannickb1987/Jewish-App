/* ── Sync ──────────────────────────────────────────────────
   Firestore CRUD helpers for the signed-in user.
   Schema:
     users/{uid}/days/{YYYY-MM-DD}     ← daily tracker data
     users/{uid}/profile/main          ← name, committedPractices, theme
──────────────────────────────────────────────────────────── */
const Sync = {

  _userDoc(uid) {
    return window.fbDb.collection('users').doc(uid);
  },
  _daysCol(uid) {
    return this._userDoc(uid).collection('days');
  },
  _profileDoc(uid) {
    return this._userDoc(uid).collection('profile').doc('main');
  },

  /* ── Days ── */
  async fetchAllDays(uid) {
    const snap = await this._daysCol(uid).get();
    const out = {};
    snap.forEach(doc => { out[doc.id] = doc.data(); });
    return out;
  },

  async saveDay(uid, dateStr, data) {
    const payload = { ...data, _updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    await this._daysCol(uid).doc(dateStr).set(payload, { merge: true });
  },

  /* ── Profile ── */
  async fetchProfile(uid) {
    const snap = await this._profileDoc(uid).get();
    return snap.exists ? snap.data() : null;
  },

  async saveProfile(uid, profile) {
    const payload = { ...profile, _updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    await this._profileDoc(uid).set(payload, { merge: true });
  }
};
