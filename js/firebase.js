/* ── Firebase Init ──────────────────────────────────────────
   Initializes the Firebase compat SDK using the config in
   firebase-config.js. Exposes window.fbApp / fbAuth / fbDb.
   No-ops if config is missing — app then runs in offline mode.
──────────────────────────────────────────────────────────── */
(function () {
  if (!window.firebaseEnabled || !window.firebaseEnabled()) {
    window.fbReady = false;
    return;
  }
  if (typeof firebase === 'undefined') {
    console.warn('[firebase] SDK not loaded yet — sign-in disabled');
    window.fbReady = false;
    return;
  }

  try {
    window.fbApp  = firebase.initializeApp(window.firebaseConfig);
    window.fbAuth = firebase.auth();
    window.fbDb   = firebase.firestore();

    // Offline persistence (so data is available without network)
    window.fbDb.enablePersistence({ synchronizeTabs: true }).catch(() => {
      /* multi-tab can fail silently — Firestore still works */
    });

    window.fbReady = true;
  } catch (e) {
    console.error('[firebase] init failed', e);
    window.fbReady = false;
  }
})();
