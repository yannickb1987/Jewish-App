# Avodat Hashem

A personal daily tracker for Jewish religious practices — prayers, Torah study, character traits, charity, and more — with built-in Hebrew calendar, daily psalms, and a Sefaria-powered reader.

Static site. No build step. Installable as a PWA. Optional Gmail sign-in syncs your data across devices via Firebase.

## Features

- **Today** — track Shaharit, Mincha, Arvit (time + intensity), Mikve, Tehilim, Tikoun Haklali, Torah Study (multi-session), Hitbodedut, Tzedaka, Fast Days, and Character Traits (Midot)
- **Week / Month** — line charts, KPI cards, contribution grids, streak tracking
- **Daily Content** — daily Tehilim (30-day cycle), Tikoun Haklali, 2 daily Halachot from Kitzur Shulchan Aruch
- **In-app Reader** — read the day's psalms and halachot inside the app (Hebrew, Frank Ruhl Libre), no redirects to Sefaria
- **Hebrew calendar** — Hebrew date + weekly Parasha from HebCal
- **Profile** — pick which practices you commit to; the rest stay tucked under "Other practices"
- **Light + dark themes** (auto-switches with system preference)
- **Installable PWA** — add to Home Screen for a fullscreen, native-feeling app
- **Optional Gmail sync** — sign in with Google to keep your tracking data synced across phone, tablet, and desktop

## Running locally

Just open `index.html` in a browser — no install. To test the PWA service worker properly, serve over HTTP:

```bash
python3 -m http.server 7777
# then visit http://localhost:7777
```

## Optional: Gmail login + cross-device sync (Firebase setup)

The app works fully offline without this — data lives in localStorage on each device. To enable Gmail sign-in and sync across devices, set up a free Firebase project (5 minutes):

### 1. Create a Firebase project
- Go to https://console.firebase.google.com and create a new project (e.g. "avodat-hashem"). Disable Google Analytics if asked.

### 2. Enable Google Authentication
- Authentication → Get started → Sign-in method → **Google** → Enable → set a public-facing name (e.g. "Avodat Hashem") → Save.

### 3. Create the Firestore database
- Firestore Database → Create database → start in **production mode** → choose a region (e.g. `nam5` or `eur3`) → Enable.

### 4. Paste these security rules
Firestore → **Rules** tab → replace contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
Click **Publish**.

### 5. Register a web app
- Project Settings (gear icon) → **Your apps** → Web `</>` → register an app with any nickname → copy the `firebaseConfig` object that appears.

### 6. Paste the config
Open `js/firebase-config.js` and fill in your six values:

```js
window.firebaseConfig = {
  apiKey:            "AIza....",
  authDomain:        "avodat-hashem.firebaseapp.com",
  projectId:         "avodat-hashem",
  storageBucket:     "avodat-hashem.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc"
};
```

### 7. Authorize your domains
- Authentication → Settings → Authorized domains → add `localhost` (for testing) and `jewish-app.vercel.app` (or your custom domain).

Commit and push — your live site now supports Gmail sign-in. Sign in once on your phone, sign in on your laptop with the same Google account, and your tracking data syncs.

## Tech

Pure HTML / CSS / vanilla JavaScript. External services used at runtime:
- [HebCal](https://www.hebcal.com/home/developer-apis) — Hebrew dates and Parasha
- [Sefaria](https://www.sefaria.org/developers) — daily Halachot + Psalm text
- [Chart.js](https://www.chartjs.org/) — via CDN
- [Firebase Auth + Firestore](https://firebase.google.com) — optional, for sign-in and sync
- Google Fonts (Inter, Fraunces, Frank Ruhl Libre)

## License

MIT
