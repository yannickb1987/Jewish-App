# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Avodat Hashem — a single-page web app for tracking daily Jewish religious practices (prayers, mitzvot, Torah study, character traits, fast days, etc.). Pure static HTML/CSS/vanilla JS — no build step, no dependencies installed locally.

## Development

There is no build, lint, or test command. To work on the app:

```bash
# Open directly in a browser:
open index.html

# Or serve over HTTP (needed when iterating with browser caching):
python3 -m http.server 7777   # then visit http://localhost:7777
```

When changes need verification in a browser, refresh the page — there is no hot reload.

## External Dependencies (loaded via CDN/API at runtime)

- **Chart.js 4.4.0** — loaded from jsDelivr in `index.html` for the Week line chart
- **Google Fonts** — Inter (UI), Fraunces (display serif), Frank Ruhl Libre (Hebrew); loaded in `<head>`
- **HebCal REST API** (`hebcal.com`) — Hebrew date conversion + weekly Parasha (no auth)
- **Sefaria REST API** (`sefaria.org/api`) — Kitzur Shulchan Aruch for daily Halachot (no auth)

All API calls happen client-side. CORS is supported by both providers.

## Architecture

The app is a tabbed SPA loaded as a single HTML file with 7 vanilla JS modules wired together via globals. Each module exposes a single object (`App`, `Tracker`, `Charts`, `Storage`, etc.); scripts are loaded in dependency order in `index.html`. Four tabs: Today, Week, Month, Daily Content.

### Module map

| File | Responsibility |
|------|----------------|
| `js/app.js` | Entry point. Tab routing, date navigation, hero header (Hebrew date + parasha + score + intention), theme toggle, Daily Content tab rendering. |
| `js/tracker.js` | "Today" tab. Renders the row-based form (status dot · Hebrew · English · summary · chevron), expandable detail panels, 5-dot intensity widgets, auto-save on every change. |
| `js/charts.js` | "Week" + "Month" tabs. 4 summary tiles, Chart.js line chart, contribution grid (10 practices × 7 days), monthly KPI cards, practice grid (10 × N days). Theme-aware colors. |
| `js/storage.js` | localStorage CRUD. Single source of truth for the data model. Keys: `tracker_YYYY-MM-DD` (daily data), `tracker_settings` (currency), `tracker_known_traits`, `tracker_theme`. |
| `js/hebrew-cal.js` | HebCal API client (Hebrew date + parasha) + Gregorian date formatter. |
| `js/sefaria.js` | Sefaria API client for daily Halachot. Picks 2 Kitzur Shulchan Aruch chapters per day cycling through day-of-year. |
| `js/tehilim.js` | Static 30-day Tehilim schedule keyed by Hebrew day-of-month + Tikoun Haklali psalm list. |

### Data Model (localStorage)

```js
// key: "tracker_2026-05-13"
{
  shaharit:      { done, time, intensity },   // intensity stored 0–10, displayed as 5 dots
  mincha:        { done, time, intensity },
  arvit:         { done, time, intensity },
  mikve:         boolean,
  charity:       { done, amount },
  tehilim:       boolean,
  tikounHaklali: boolean,
  torahStudy:    [{ subject, startTime, duration }, ...],
  hitbodedout:   { done, duration },
  fast:          { isAFastDay, performed },
  midot:         [{ trait, performed, intensity }, ...]
}
```

`Storage.computeScore(data)` derives the 0–10 daily score used everywhere (hero ring, week chart, month KPIs). Score logic lives only in `storage.js` — modify here, never duplicate.

### Visual Design System

Defined entirely in `css/style.css` via CSS custom properties:
- **Light (default):** parchment cream background, deep wine accent (`#7C2D3A`), olive done-state (`#6B7950`), refined amber for Hebrew/gold
- **Dark (candlelight):** near-black background, warm amber accent (`#D4A574`), sage green
- **Auto-switching** via `@media (prefers-color-scheme: dark)` + manual override via `[data-theme="light"|"dark"]` attribute set on `<html>` by `app.js`

When adding theme-aware behavior, use CSS variables exclusively — do not hardcode colors. For elements that need different `color` values when on dark accent backgrounds (e.g. white text on accent → dark text on amber), duplicate the rule under both `[data-theme="dark"]` and the `prefers-color-scheme: dark` media query selector to handle the no-manual-override case.

### Tab Routing

`App._showTab(name)` updates `body[data-active-tab="..."]` and toggles `.panel.active`. Each tab's render function (`Tracker.render`, `Charts.renderWeek`, `Charts.renderMonth`, `App._renderDailyContent`) is called on tab entry. There is no virtual DOM — re-renders rebuild `innerHTML` for the relevant container and re-bind events.

### Row Interaction Pattern (Today tab)

Each tracked item is a `.row` with two interactive zones:
1. **Status dot** (`.row-dot[data-toggle-done]`) — toggles `done` state, calls `e.stopPropagation()` so it doesn't also expand
2. **Trigger button** — toggles expanded state (the inline detail panel)

"Simple" rows (Mikve / Tehilim / Tikoun Haklali) use `data-simple-toggle` on the trigger to toggle done with a tap anywhere on the row; the dot is decorative.

The `_expanded` Set on `Tracker` persists the expand state across re-renders.
