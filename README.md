# Avodat Hashem

A personal daily tracker for Jewish religious practices — prayers, Torah study, character traits, charity, and more — with built-in Hebrew calendar, daily psalms, and a multi-nusach Siddur reader.

Static site. No build step. Open `index.html` in any modern browser.

## Features

- **Today** — track Shaharit, Mincha, Arvit (time + intensity), Mikve, Tehilim, Tikoun Haklali, Torah Study (multi-session), Hitbodedut, Tzedaka, Fast Days, and Character Traits (Midot)
- **Week / Month** — line charts, KPI cards, contribution grids, streak tracking
- **Daily Content** — daily Tehilim (30-day cycle), Tikoun Haklali, 2 daily Halachot from Kitzur Shulchan Aruch
- **Siddur** — full prayer book reader in Ashkenaz / Sefard / Sephardic / Nusach Ha'Ari, fetched live from Sefaria
- **Hebrew calendar** — Hebrew date + weekly Parasha from HebCal
- Light parchment theme + dark candlelight theme (auto-switches with system preference)
- All data stays local in your browser (localStorage). No account. No tracking.

## Tech

Pure HTML / CSS / vanilla JavaScript. External services used at runtime:
- [HebCal](https://www.hebcal.com/home/developer-apis) for Hebrew dates and Parasha
- [Sefaria](https://www.sefaria.org/developers) for Halachot and Siddur texts
- [Chart.js](https://www.chartjs.org/) via CDN
- Google Fonts (Inter, Fraunces, Frank Ruhl Libre)

## License

MIT
