# MEMORY: Standbai Web App (`FE-FORGEHACK-2026`)

> ## Language rule (read first)
> **Always use English** in this repository: UI copy, alt text, ARIA labels, code, comments, docs, commit messages, design deliverables and every explanation written by an AI assistant. ForgeHacks is an international hackathon judged in English.
> Allowed exceptions: the optional Indonesian (ID) UI dictionary `src/i18n/id.ts`; stable data slugs from the API (e.g. `hutan_sebangau`); proper nouns (places; agencies such as BMKG, PVMBG, BPBD); official Indonesian terms shown with an English gloss (e.g. "Unhealthy (Tidak Sehat)", "Level III, Siaga (Watch)").

Shared memory for people and coding agents working on the frontend. Keep **Progress** and the **Decision log** current. Tasks live in [`PRD.md`](PRD.md).

---

## 1. Competition essentials
- **ForgeHacks Online 2026**, track **AI + Climate**: "Build an AI-powered solution that helps people understand environmental changes, prepare for climate impacts, use resources wisely, or create resilient systems."
- **Submission locks Sat Oct 10, 12:00 PM ET = 23:00 WIB.** Feature freeze 18:00 WIB.
- **Submit:** description, track, 2–4 min public video, GitHub repo with a clear README, written description, screenshots or a **live link**.
- **Judging:** five criteria, 20% each: impact · technical & AI use · innovation · **execution & completeness** · **presentation**. The frontend carries the live demo and the video.
- **Rules:** build during the event; use AI honestly ("be clear about what you built, what you used, and what actually runs"); judges test what we submit. "A half-working project is okay. Overstating it isn't."

## 2. Product
- **Standbai:** *Know where the smoke is heading before it reaches home.* It watches forest fires and volcanoes across Indonesia, forecasts where smoke and ash will go, and turns that into a household plan. Alerts also go out on **Telegram**.
- **Users:** parents, carers, teachers and health workers in haze- and ash-prone towns. Design for them, not for scientists.
- **Design source of truth:** [`docs/design/reference-prototype.html`](docs/design/reference-prototype.html). It has five views: Home scroll story, Dashboard, Map, Why, Ready. Tokens, copy and behaviour come from it. The illustrated-landing references are `docs/design/reference-landing-{1,2,3}.png`.
- **Honesty in the UI:**
  - one yellow **AI** badge on every model-made value;
  - an "Example data" badge whenever real data isn't connected;
  - the disclaimer "Not an official warning. Follow BMKG, PVMBG and your local BPBD." on results.

## 3. Architecture
```mermaid
flowchart LR
  U[Browser] --> FE[This app · React · Vercel]
  FE -->|VITE_API_BASE_URL| BE[Standbai API · Cloud Run]
  BE --> AI[AI service]
  U -.->|t.me link| TG[Telegram bot via n8n]
```
- The web app calls **only** the backend. Contracts: `PRD.md` §5 (shared with the backend PRD).
- Routes:
  - `/` Home;
  - `/dashboard?city=`;
  - `/map`;
  - `/why?city=`;
  - `/ready?city=`;
  - `/simulate` (the existing Leaflet expert dashboard);
  - `/history` (P1).

## 4. People
| Person | Role |
|---|---|
| **Ziddan Habibie** | Frontend owner (this repo) |
| Hikari Reiziq | Backend API, deploy, Telegram/n8n: ask for the API URL and the bot link |
| Arya Bisma | Backend engine, fires, volcanoes, map frames |
| Arkan Zahir | AI: outlook model, chat |

## 5. Progress (verified on `main` `9e094db`, 2026-10-10)
- **Working:**
  - Leaflet expert dashboard (header, controller dock, map layers, 48 h timeline, five analysis tabs, legend, geolocation);
  - mostly English UI; `lang="en"`; `public/Logo.png`.
- **Known problems** (tickets in `PRD.md`):
  - API base hard-coded to `127.0.0.1:8000` (FE-03);
  - CSS "3D POV" tilt breaks map clicks (FE-10);
  - title says "StandbAI" (FE-03);
  - ~30 Indonesian lines and 3 old-name comments left (FE-03);
  - no router or landing (FE-01, FE-04).
- **Next:** the PRD task board, FE-01 → FE-14 (P0), then FE-15/16 (P1).

**Update 2026-10-10 18:45 WIB** (branch `chore/standbai-rebrand`, on top of `main` 868e1ab):
- **Schools and hospitals removed:** map layers, icons (`public/school.png`, `public/hospital.png`), the Schools and Evacuation tabs, the facilities-at-risk card, legend entries, types and translations. Airports stay. The Health tab stays (mask and PM2.5 advice, not hospitals).
- **Landing intro:** three steps over the 3D scene: hero "Know where the smoke is heading before it reaches home.", `#asap` (forest catches fire, `data-fire=1 data-smoke=1`), `#siap` (air clears, villagers return). Sections accept `data-hour` so the sky keeps moving forward. English is the default; the ID toggle stays. School and hospital wording on the landing and in the mini-sim is now villages and households.
- **National map modes** (`src/components/layout/NationalModes.tsx`): "Wind & smoke" (canvas wind particles from `/layers/wind`, 16-day WIB slider labelled Forecast or Indicative after day 7, 10 m smoke or 850 hPa ash, smoke/ash paths from `/layers/smoke-paths`) and "Fire heatmap" (`/layers/heatmap`). The example smoke sim hides while a mode is on; failures show a "Data unavailable" chip with Retry.
- **FE-03 (part):** `CONFIG.API_BASE` reads `VITE_API_BASE_URL`, falling back to `http://127.0.0.1:8000`.

**Update 2026-10-10 20:00 WIB** (branch `fix/map-performance-radius`):
- **Map lag fixed:** the 4,248 national hotspots were DOM `<img>` markers; they are now canvas circle markers. The camera readout and scale bar (`MapReadouts.tsx`) subscribe to the map themselves, so a pan no longer re-renders `MapWorkspace` every frame. The map uses `preferCanvas`; the example smoke animation is capped at ~30 fps.
- **Radius rendering** (`src/simulation/nearbyLayers.ts`): volcanoes, fire-prone forests (new tree markers), hotspots and Level III+ ash paths (72 h, `/layers/smoke-paths`) draw only within a render radius of the map centre: half the viewport diagonal, clamped to 100–500 km, recomputed on `moveend`. Level III–IV volcanoes and the selected event always show. A faint dashed ring and a line in the layer panel show the radius. Clicking a forest selects it as a fire event.
- **Time frames:** the national panel is now Off / History / Now / Forecast. History = fire heatmap, last 7 days (API max). Now = latest detection day heatmap plus current wind. Forecast = 16-day wind with 72 h smoke/ash paths. Smoke and heatmap are layers of one panel, not separate modes.
- **Header and defaults:** airports start unchecked on `/simulate`. The simulator header spans the full width and never wraps; labels hide progressively on narrow screens (no overflow from 360 px up). The landing nav labels never wrap; the nav collapses into the menu below 1280 px.
- **Not done (needs backend + AI):** AI summaries or chat per time frame (Featherless GLM/Qwen via the AI service, exposed by a backend endpoint); the landing-page empty gap.

**Update 2026-10-10 21:00 WIB** (branch `fix/i18n-and-fast-loading`):
- **One language at a time:** EN mode shows no Indonesian and ID mode no English (proper nouns and agency names aside). Landing: rail tooltips, vista captions, references, units and ARIA labels go through `DICT` (`data-i18n`, new `data-i18n-attr`, `data-scene-name`, `data-num` for locale numbers). Simulator: `useTr()` in `src/context/useLanguage.ts` returns `tr(en, id)`; API values (levels, volcano/forest names, regions, provinces, forest types and risk) are mapped in `src/utils/apiLabels.ts`; demo narration and progress messages are built in the frontend in both languages. The simulator now defaults to English like the landing page.
- **Loading page:** no "Skip intro"; the intro plays at 2x for 1.6 s, then fades and opens `/simulator.html` (about 2-3 s in total).

## 6. Conventions
- **Stack:** React 19 function components, TypeScript strict, Vite 8, Tailwind v4 for layout glue, prototype CSS tokens for all colours, `oxlint`.
- **Config:** `VITE_API_BASE_URL`, `VITE_TELEGRAM_BOT_URL`. Never put API keys in the frontend.
- **Time and units:** the backend sends UTC; show local time with a zone label (WIB/WITA/WIT); µg/m³ for concentrations.
- **ISPU:** codes `good … hazardous`, breakpoints 15.5 / 55.4 / 150.4 / 250.4 µg/m³ PM2.5.
- **Accessibility:** WCAG 2.2 AA contrast, visible focus, keyboard-operable controls, `prefers-reduced-motion`, no horizontal scroll at 390 px.
- **Performance:** lazy routes; Leaflet only on `/simulate`; no image over 200 KB after the optimizer.
- **Map attribution must always be visible:** "© OpenStreetMap contributors" for OSM tiles; "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics" for imagery; a credit line for the prototype map outline.
- **Git:** branches `feat/…`, `fix/…`, `docs/…`. Commits follow Conventional Commits in English (`feat(dashboard): …`). Pull before pushing.

## 7. Decision log
| Date | Decision | Why |
|---|---|---|
| 2026-10-09 | Product name **Standbai**; English UI | International judging |
| 2026-10-09 | Deploy on Vercel; backend on Cloud Run | Free and fast; no sponsor hosting before the deadline |
| 2026-10-10 | The prototype `docs/design/reference-prototype.html` wins over older design notes; EN default, ID toggle allowed | Finished design; residents are Indonesian, judges read English |
| 2026-10-10 | Port the prototype's own scroll, SVG and canvas code; no GSAP, chart or state libraries | Small, already works, fewer dependencies |
| 2026-10-10 | Keep the Leaflet dashboard as `/simulate` | Preserve the expert simulation view |
| 2026-10-10 | Image optimizer (`vite-plugin-image-optimizer`, WebP/AVIF) | Large images must ship small |
| 2026-10-10 | Chat is optional (P1); the same `/chat` serves web and Telegram | Focus on the core first |
| 2026-10-10 | Claude Design only for screens the prototype lacks (History, chat, `/simulate` re-skin) | Avoid redesigning finished views |
| 2026-10-10 | Schools and hospitals removed from the product; airports stay | Team decision; focus on households |
| 2026-10-10 | Wind and smoke shown up to 16 days (days 8–16 "indicative"); no multi-year predictions | No forecast skill beyond about two weeks |
| 2026-10-10 | Own canvas heat and wind layers instead of Leaflet plugins | No new dependencies; same overlay pattern as the smoke layer |
| 2026-10-10 | Render map landmarks only within 100–500 km of the map centre (zoom-based); Level III–IV volcanoes always | Thousands of points made the map lag |
| 2026-10-10 | One national panel with History / Now / Forecast; smoke and heatmap combined | Users ask "what happened, what is happening, what is coming", not "which layer" |

## 8. Links
- Backend: https://github.com/ITHACKITS/BE-FORGEHACK-2026 · AI: https://github.com/ITHACKITS/AI-FORGEHACK-2026
- Devpost: https://forgehacks-2026.devpost.com · ForgeHacks: https://forgehacks.dev
- Live URL: *add the Vercel URL after FE-11.* · Telegram bot: *add after BE-11.*
