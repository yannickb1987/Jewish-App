/* ── Firebase Config ────────────────────────────────────────
   PASTE YOUR FIREBASE PROJECT CONFIG BELOW.
   Get it from: Firebase Console → Project Settings → Your Apps → Web app

   Until this is filled in, Gmail sign-in is hidden; the app works
   entirely offline via localStorage.
──────────────────────────────────────────────────────────── */
window.firebaseConfig = {
  apiKey:            "",   // e.g. "AIza...."
  authDomain:        "",   // e.g. "avodat-hashem.firebaseapp.com"
  projectId:         "",   // e.g. "avodat-hashem"
  storageBucket:     "",   // e.g. "avodat-hashem.appspot.com"
  messagingSenderId: "",
  appId:             ""
};

window.firebaseEnabled = function() {
  return !!(window.firebaseConfig?.apiKey && window.firebaseConfig?.projectId);
};
