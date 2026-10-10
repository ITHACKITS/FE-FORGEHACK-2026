# PRD: Standbai Web App (`FE-FORGEHACK-2026`)

| | |
|---|---|
| **Owner** | Ziddan Habibie (frontend) |
| **Backend contacts** | Hikari Reiziq (API, deploy, Telegram/n8n) · Arya Bisma (engine, map frames, fires, volcanoes) |
| **AI contact** | Arkan Zahir (outlook model, chat) |
| **Event** | ForgeHacks Online 2026, AI + Climate track |
| **Deadline** | Feature freeze **Sat Oct 10, 18:00 WIB**; submission locks **23:00 WIB** (12:00 PM ET) |
| **Design source of truth** | [`docs/design/reference-prototype.html`](docs/design/reference-prototype.html). Open it in a browser. |
| **Status** | Ready to execute. Read sections 1–5 once, then work the [task board](#9-task-board) top to bottom. |

> **Language rule.** Everything in this repo is English: UI copy, code, comments, commits, docs. See [`MEMORY.md`](MEMORY.md).

---

## 1. Problem Statement

Families in Indonesia's haze and ash zones usually learn about smoke when the sky has already changed colour. Fire hotspots (NASA FIRMS, BMKG, SiPongi), volcano levels (PVMBG/MAGMA) and air quality (ISPU) are published in different places, in technical language, and almost never say *"smoke reaches your town tomorrow at 15:00, prepare masks for 4 people."*

Our current frontend is a powerful but expert-only "command centre" map. It has no landing page and no plain-language view for a household. Its API address is hard-coded to `127.0.0.1:8000`, so it cannot be deployed. Judges will open a live link, so the first screen has to explain the product in seconds and work on a phone.

## 2. Solution

Port the finished single-file prototype (`docs/design/reference-prototype.html`) into the React app as five routes. Replace its example data with the backend's real endpoints, keep the existing Leaflet simulation dashboard as an advanced view, and deploy on Vercel.

| Route | Prototype view | Purpose |
|---|---|---|
| `/` | `#beranda` | Illustrated scroll story (clear → burning → ready), notification card, "Three places to start", comparison table, honest status list |
| `/dashboard?city=` | `#dashboard` | "Around you": right-now card, 3-day cards, PM2.5 chart (−3 to +3 days), AI outlook card |
| `/map` | `#peta` | "Indonesia then, now, and next": canvas map, −7 to +3 days slider, layers, city summary, timeline matrix |
| `/why?city=` | `#predik` | "Why the AI says so": claim, signals read, confidence, limits, how the AI works, sources |
| `/ready?city=` | `#siaga` | Household kit with checklist and emergency numbers |
| `/simulate` | (existing app) | Today's Leaflet dashboard: run plume simulations, tiers, impact tabs |
| `/history`, `/history/:id` | (new, P1) | Past events with replay and news |

The **"Ask Standbai" chat panel** (website) and the **Telegram bot link** are added globally. The chat is optional (P1).

## 3. User Stories

1. As a first-time visitor, I want to understand in under ten seconds what Standbai does, so that I keep reading.
2. As a visitor on a phone, I want the illustrated story to scroll smoothly at 390 px width without horizontal scrolling, so that the landing works where most residents browse.
3. As a visitor who prefers reduced motion, I want the story to appear without animation, so that I am not made uncomfortable.
4. As a resident of Pekanbaru, I want to pick my city and immediately see whether the air is safe right now, in one plain sentence, so that I know what to do today.
5. As a resident, I want to see the next three days as simple cards (category plus advice), so that I can plan school and work.
6. As a resident, I want a PM2.5 chart from three days ago to three days ahead with ISPU colour bands, so that I can see whether things are getting better or worse.
7. As a resident, I want an AI outlook for the next 3 days, 2 weeks and month, plus my nearest volcano, so that I can prepare early.
8. As a resident, I want every AI-made value to carry the same **AI** badge, so that I can tell forecasts from measurements.
9. As a curious user, I want to slide time across Indonesia from seven days ago to three days ahead, so that I can see where smoke came from and where it is going.
10. As a user, I want to toggle smoke, fire hotspots, volcanoes and wind on the map, so that I can focus.
11. As a user, I want to click a city on the map and jump to its dashboard, so that I can go from overview to detail.
12. As a sceptical user or judge, I want a page that shows which signals the AI read and links to every original source, so that I can trust or challenge the forecast.
13. As a parent, I want a checklist that counts masks, water and medicine for my household size and the number of bad-air days, so that I buy the right amounts.
14. As a carer of a child, an elderly person or someone with asthma, I want a "sensitive person at home" switch, so that the advice becomes stricter.
15. As a resident, I want my checklist ticks and city remembered on my device, so that I do not lose progress.
16. As a resident, I want emergency numbers on the kit page, so that I can act if things go wrong.
17. As a resident, I want to subscribe to Telegram alerts for my city, so that the warning reaches me before the smoke does.
18. As an emergency volunteer, I want the detailed simulation dashboard (`/simulate`) with plume probability tiers and facility impacts, so that I can brief my team.
19. As a user, I optionally want to ask "Will smoke reach Jambi this week?" in a chat panel and get a short answer with buttons to the right page.
20. As a judge, I want an honest "Example data" label wherever real data is not connected yet, so that nothing is overstated.
21. As a judge, I want the site to load fast and look polished, so that it reflects a finished product.
22. As a developer, I want the API base URL from `VITE_API_BASE_URL`, so that the same build works locally and on Vercel.
23. As an Indonesian user, I optionally want an ID/EN toggle (English by default), so that I can read in my language.

## 4. Implementation Decisions

### 4.1 Architecture and libraries

- **Keep:** React 19, TypeScript, Vite 8, Tailwind v4, Leaflet 1.9 (only on `/simulate`), lucide-react, oxlint.
- **Add:**
  - `react-router` v7 in library mode (`BrowserRouter`, `Routes`, `lazy()` per route);
  - `vite-plugin-image-optimizer` + `sharp` + `svgo` (image build step, ticket FE-12).
- **Don't add:** GSAP, a state library or a chart library. The prototype already does parallax with one passive scroll handler, draws charts as SVG and the map on `<canvas>`. Port that logic; it's small and has no dependencies.
- **Styling:**
  - Copy the prototype's `:root` tokens (light and dark) into `src/styles/tokens.css`.
  - Copy its component CSS into `src/styles/standbai.css`, scoped by route containers.
  - Use Tailwind utilities for new layout glue only.
  - No ad-hoc hex colours in components.
- **Rendering the illustrated scene:** port `buildScene()` as a `Scene` component that builds the same SVG string once and injects it into an `<svg>` (it's generated by our code, not user input). Converting it to JSX is optional later.
- **State in the URL:** `city`, map time `t`, and layers are query params so links are shareable (the chat and Telegram buttons rely on this).
- **Local persistence:** keep the prototype's keys `standbai-lang`, `standbai-city`, `standbai-checks` in `localStorage`, wrapped in try/catch as in the prototype.
- **Data access:**
  - One module `src/services/standbai.ts` with typed fetchers for the endpoints in §5, plus a hook `useApi(fetcher, deps)` returning `{data, error, loading}`.
  - **Fallback rule:** if an endpoint fails or isn't deployed yet, render the prototype's example data and show the "Example data" badge (`demo` copy key) in the nav. Never show example numbers without that badge.
- **i18n:**
  - Move the prototype's `T.en` and `T.id` dictionaries into `src/i18n/en.ts` and `src/i18n/id.ts`.
  - **English is the default.** The prototype defaults to `id`, so change it.
  - Function-valued strings (e.g. `vSoon(c,a,h,w,v,k)`) stay functions.
- **Branding:**
  - Product name **Standbai**. `index.html` currently says "StandbAI | Atmospheric Dispersion Modeling…"; change it to `Standbai | Know where the smoke is heading`.
  - Use the prototype's logo mark (the circle with three wind lines) as an inline SVG and favicon; keep `public/Logo.png` only if the team prefers it.

### 4.2 Design system (from the prototype)

**Aesthetic:** "illustrated calm". The anchor is a flat-vector village at the foot of a volcano whose sky turns brown as smoke arrives. Everything AI-made gets one yellow **AI** badge.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` / `--surface` | `#EDF3F1` / `#FBFDFC` | `#0C1C1C` / `#132827` | page / cards |
| `--ink` / `--muted` / `--line` | `#10302E` / `#56706D` / `#CDDBD7` | `#E6F0EC` / `#93ABA6` / `#274240` | text / secondary / borders |
| `--accent` / `--accent-soft` | `#0C6F61` / `#D8ECE7` | `#5CC9B4` / `#17403B` | buttons, links |
| `--ember` | `#D4501C` | `#FF8A4C` | fire hotspots |
| `--ai-bg` `--ai-fg` `--ai-badge` | `#10302E` `#EAF4F0` `#F2C14E` | `#1A3B37` `#EAF4F0` `#F2C14E` | AI outlook panel and badge |
| `--c0`…`--c4` (ISPU) | `#4FA873` `#DDB94A` `#E0843A` `#B8392F` `#5A1E3D` | `#5DBD84` `#E8C95C` `#F2964A` `#E5584C` `#D06AA6` | Good · Moderate · Unhealthy · Very Unhealthy · Hazardous |
| map `--sea` `--land` `--land-nb` `--coast` | `#D3E5E5` `#DDEBD6` `#E3E9E3` `#93ADA8` | `#0F2A2D` `#24423A` `#1B3331` `#52706B` | canvas map |
| scene (both themes) | `--sky1 #BDE3E1` `--sky2 #FBEFD6` `--sun #FFD36B` `--vol1 #7FA9A0` `--vol2 #5F8C86` `--volcap #CDB98E` `--hill1 #8CC084` `--forest1 #2F6B50` `--ground #7DB96F` `--wall1..3 #FFF6E6 #F4B7A6 #F6D77A` `--roof1 #C2583A` `--trim #2E8C82` `--smoke #8C8377` `--haze #D2BD9A` `--fire #F2742B` | | illustration |

- **Fonts:** Bricolage Grotesque (display, 500/700) and Plus Jakarta Sans (body, 400–700), loaded from Google Fonts with `display=swap`.
- **ISPU breakpoints (PM2.5 µg/m³):** ≤15.5 Good, ≤55.4 Moderate, ≤150.4 Unhealthy, ≤250.4 Very Unhealthy, above that Hazardous. These are the prototype's `LIM`, identical to the backend's `config/assumptions.yaml`. Show the official Indonesian name next to the English one where space allows: "Unhealthy (Tidak Sehat)".
- **Motion:**
  - the 1.8 s haze splash with the logo;
  - the headline rising from below;
  - per-layer parallax (`data-d` depth factors; front layers move most);
  - cursor drift on mouse pointers only;
  - cloud drift, smoke puffs, clothesline sway, flame flicker.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` removes the splash and the looping animations exactly as the prototype does; captions stay readable.
- **Contrast:**
  - Act 2's headline sits on haze, so verify AA (4.5:1) with the browser's contrast checker. Darken `--scene-ink` captions or add a soft scrim if needed.
  - The reference screenshots show a too-light grey headline in Act 2; don't copy that.

### 4.3 Home `/` (port of `#beranda`)

- **Scene layers, back to front:**
  1. sky gradient, sun with halo, three drifting clouds;
  2. distant teal ridges;
  3. volcano (light left face, shaded right face, bare sandy crater with jagged rim, gully lines, cloud at the summit, thin smoke from the crater);
  4. terraced hills with alternating light green / dark green / ochre stripes and a small hamlet on the right;
  5. forest band of round crowns with a few pointed conifers;
  6. front village: four houses (pink, cream, yellow walls; brick-red roofs; teal doors and frames; the leftmost has a **joglo** roof), two coconut palms, a cream footpath, and a bamboo clothesline with five swaying coloured cloths;
  7. grass blades along the bottom edge.
- **Scroll acts** (the stage is sticky; `story()` maps scroll progress `p` 0→1):
  - **Act 1, clear** (p < ~0.18):
    - `h1` "Know where the smoke is heading before it reaches home." and the lead sentence;
    - CTAs **Check your area** (→ `/dashboard`) and **See the map** (→ `/map`).
  - **Act 2, burning** (~0.24–0.58):
    - flickering orange/yellow flames in the forest gaps between houses, with a glow;
    - grey-brown smoke puffs rising from the fires and the crater;
    - a haze bank sliding in from the left over hills and forest;
    - the scene browns and the sun turns red;
    - caption "A forest fire can send smoke hundreds of kilometers.";
    - the **notification card** on the right (~0.34–0.66): "Smoke expected tomorrow afternoon · Prepare N95 masks for 4 people and close the windows from 15.00." with the AI badge.
  - **Act 3, ready** (> ~0.68):
    - haze remains;
    - white check marks appear above each house;
    - "The warning arrives before the smoke does.";
    - CTAs **Check your area** and **Why the AI says so** (→ `/why`).
- **First load:** a haze-coloured overlay with the Standbai logo, which fades in about 2 s (`.intro`, `clear` keyframes); then `cap1` rises (`rise`, 1 s, 1.4 s delay).
- **Below the story:**
  - "Three places to start": cards to Dashboard, Map and Why.
  - "Made for residents, not for meteorologists": a two-column comparison (`cmp` copy).
  - The honest status list: "Working in this prototype / Not connected yet". Rewrite it from the real status at 17:30 so it doesn't overstate (FE-14).
- **Telegram strip:** "Get alerts on Telegram" linking to `t.me/<bot>`. The bot name comes from Hikari; read it from `VITE_TELEGRAM_BOT_URL`.

### 4.4 Dashboard `/dashboard?city=` (port of `#dashboard`)

- **City select:** cities come from `GET /cities` and are sorted by name. Changing the city updates the URL and `standbai-city`.
- **Right-now card:**
  - a mini illustration whose haze level follows the ISPU index (`mini(k)`);
  - a plain sentence (`nowText[k]`);
  - meta: category dot and name, "PM2.5 N µg/m³", "Wind from the …, about N km/h";
  - source: `GET /area/now`.
- **Three day cards** (Today, Tomorrow, Day after), each with a category and advice (`adv[k]`). Source: `days[]` in `GET /area/series`.
- **Chart:**
  - SVG; recorded line solid, forecast line dashed with the AI badge;
  - ISPU bands at 15% opacity, a "now" line and dot;
  - x labels "3 days ago · Now · +3 days";
  - source: `GET /area/series?city=&from=-72&to=72`.
- **AI outlook panel** (dark `--ai-bg`):
  - four items: "Next 3 days" smoke and dust; "Next 2 weeks" dry season and heat; "Next month" forest and land fires; "Nearest volcano";
  - each has a Low/Medium/High dot, a title, a sentence, and a "Why does the AI say so?" link to `/why?city=`;
  - a **See what to prepare** button to `/ready?city=`;
  - source: `GET /area/outlook?city=`;
  - the FE builds the sentences from the structured fields with the i18n templates (`vGood`, `vMod`, `vNow`, `vSoon`, `dry[]`, `fr()`, `volP()`).

### 4.5 Map `/map` (port of `#peta`)

- **Modes:** History (last 7 days) · Right now · Forecast (next 3 days). Forecast frames carry the AI badge and the clock shows "AI forecast".
- **Canvas map:**
  - the PM2.5 field is drawn through the prototype's colour lookup (`lut()`), over land and sea from the `GEO` outline;
  - fire dots in `--ember`; volcano triangles (erupting ones highlighted); wind arrows;
  - click a city to open a popup with "Open in Dashboard".
- **Time slider:** −168 h to +72 h in 3 h steps, with play/pause (140 ms per step). Stop on manual input.
- **Side summary:**
  - date and time;
  - stacked bar of how many of the 29 cities fall in each category;
  - tiles for active fire hotspots and erupting volcanoes;
  - the six worst-air cities as buttons.
- **Matrix** below the map: the top 10 cities × 81 frames coloured by category, with event markers (fire circle, eruption triangle) and click-to-seek.
- **Data:**
  - `GET /map/frames` (binary, P1) replaces `simulate()`;
  - `GET /fires?hours=168` replaces `FIRES`;
  - `GET /volcanoes` replaces `VOLC`;
  - `GET /events/timeline?days=7` replaces `EVENTS` (P1);
  - city series come from `/area/series` (or are sampled from the frames when those exist).
  - Until `/map/frames` is live, keep the example `simulate()` behind the "Example data" badge.
- **Map outline licence:**
  - The `GEO` constant has no stated source.
  - Option A: Hikari or Arya confirm where it came from (likely Natural Earth, public domain) and the credit is added in the footer.
  - Option B: load `GET /layers/coastline` (the backend's `indonesia_coastline.geojson`) and draw that.
  - Either way, a visible source line is needed.
- **Accessibility:** the canvas has `role="img"` with a text alternative, and the side summary is real text, so screen-reader users get the same information.

### 4.6 Why `/why?city=` (port of `#predik`)

- **The claim being explained:** the same 3-day verdict as the dashboard.
- **"Signals the AI read":** four rows, each with a value, a meaning, a strength bar and a source link:
  1. hotspots within 300 km;
  2. wind direction and whether it carries smoke toward the city;
  3. rain in the last 7 days;
  4. PM2.5 now.
  - Source: `reasons[]` in `GET /area/outlook`.
- **Confidence:**
  - 24 / 48 / 72 h bars from `confidence.by_lead_h`.
  - If `confidence.basis` is `"example"`, show the prototype note ("examples; later they come from backtests"). If it's `"backtest"`, show the model card link (AI repo).
- **Limits:** the three prototype limits, e.g. "The AI cannot guess when a volcano will erupt", plus the line "Not an official warning. Follow BMKG, PVMBG and your local BPBD."
- **How the AI works:** the 4 steps Collect → Combine → Forecast → Explain. Add one line naming the models from the backend `GET /health` (`engine`, `llm`).
- **Sources table:** from `GET /sources`, with the prototype's six rows as fallback.

### 4.7 Ready `/ready?city=` (port of `#siaga`)

- **Inputs:**
  - a stepper for people at home (1–12, default 4);
  - a checkbox "Young children, elderly, pregnant, or someone with asthma at home".
- **Items:** N95/KN95 masks, drinking water, regular medicine, one clean room, go bag.
  - Quantities come from `POST /preparedness {people, sensitive, bad_days}` (bad days from `/area/outlook`).
  - Local fallback is the prototype's formula: 1 mask per person per day, 3 L water per person per day, medicine for bad days + 2.
  - Show the assumption note under the list.
- **Checklist:** tick state is saved in `standbai-checks`.
- **Emergency numbers:** BNPB 117, ambulance 119, emergency 112, with the note that 112 isn't active everywhere.
- **Telegram:** a button "Send me alerts for {city} on Telegram" that opens `t.me/<bot>?start=<city_id>` (deep link; Hikari's bot reads the start parameter).

### 4.8 Advanced simulation `/simulate` (existing app)

- Mount today's `App` at `/simulate`. Pass `?event=&hazard=&hours=&autorun=1` into its initial state so chat and map links can open a ready simulation.
- **Fix before demo:**
  - **API base:** `src/config/constants.ts` must use `import.meta.env.VITE_API_BASE_URL` (fallback `http://127.0.0.1:8000`).
  - **"3D POV":** remove the CSS tilt. `perspective/rotateX` on the Leaflet container breaks click hit-testing. Remove the "Google Earth 3D" wording too.
  - **Attribution:** "© OpenStreetMap contributors" for OSM tiles; "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics" for imagery. Data credits go in a separate small line: "Data: NASA FIRMS · PVMBG · Open-Meteo".
  - **Language:** finish the English pass. About 30 Indonesian lines and 3 "UdaraSiaga" header comments remain in `src/`; `grep -rniw "dan\|yang\|untuk" src` must return nothing user-visible.
  - **Field names:** read `hazard_radius_km` if present, else `radius_bahaya_km` (the backend adds the English field without removing the old one).

### 4.9 Chat panel "Ask Standbai" (P1, optional)

- **Panel:** a floating button bottom-right opens a 360 px panel (full-screen sheet under 600 px).
  - Starter prompts:
    - "Is the air safe in Pekanbaru today?"
    - "Will smoke reach Jambi this week?"
    - "What should I prepare for 5 people?"
    - "What happened when Merapi erupted in 2010?"
  - Opt-in "Use my location" (sends lat/lon once).
  - Session-only storage (`sessionStorage`).
  - `aria-live="polite"` on the message list.
  - The disclaimer line sits under the input.
- **Call:** `POST /chat` (contract in §5).
  - Render `reply` as text.
  - Render `actions[]` as buttons, **only if `href` starts with `/`** (internal links); ignore anything else.
- **States:**
  - loading: typing dots;
  - error: "I can't answer right now. Try the Dashboard." plus a link;
  - `engine:"template"`: no special UI.

### 4.10 History `/history` (P1, after P0 is live)

- **List:** two events, Merapi Oct–Nov 2010 and the 2019 Sumatra/Kalimantan haze.
- **Detail page:**
  - the canvas map with a daily slider showing the FIRMS heatmap (fire) or the approximate ash replay (volcano), with the label "Approximate replay: surface winds only";
  - news list (headline, publisher, date; links open the publisher in a new tab with `rel="noopener"`);
  - AI summary with numbered citations;
  - "What people needed" chips;
  - "If it happened again" → `/ready?city=`.
- **Data:** `GET /history/events`, `/history/events/{id}`, `/history/events/{id}/news`, `/history/events/{id}/hotspots?date=`.
- **Design:** use Claude Design (§4.12), seeded with the prototype's tokens.

### 4.11 Images

- `vite-plugin-image-optimizer` compresses PNG/JPG and emits WebP/AVIF; SVGs are minified with svgo.
- Raster images are rendered with `<picture>` (AVIF → WebP → PNG).
- Every image has explicit `width` and `height`. Below-the-fold images get `loading="lazy" decoding="async"`; the logo gets `fetchpriority="high"`.
- **Budget:** no file over 200 KB in `dist/`, and landing images under 500 KB in total.
- `docs/design/*` is documentation only; never import it in `src/`.

### 4.12 Claude Design (for screens the prototype doesn't have)

**Workflow:**
1. In claude.ai, open **Claude Design** (research preview; Pro, Max or Team plan) and start a project.
2. Upload `docs/design/reference-prototype.html` and the three `reference-landing-*.png`. Ask it to extract the design system.
3. Use the prompts below.
4. Export as HTML, or use the Claude Code hand-off.
5. Port the result into React the same way as the other views.

The Home, Dashboard, Map, Why and Ready views are already designed; don't redesign them.

**Prompt A, design system:**
```
Extract a design system from the attached prototype (reference-prototype.html):
color tokens for light and dark (including the ISPU colors c0-c4 and the AI panel
colors), the two fonts (Bricolage Grotesque, Plus Jakarta Sans), spacing, radii,
the yellow "AI" badge, buttons (filled and ghost), cards, chips, the stepper and
the checklist row. Keep the calm, illustrated, editorial feel. English labels.
```

**Prompt B, History page:**
```
Using the Standbai design system, design a "Past events" page and an event detail
page for a web app about wildfire smoke and volcanic ash in Indonesia.
List: cards for "Mount Merapi eruption, Oct-Nov 2010" and "Sumatra and Kalimantan
haze, Sep-Oct 2019" with a small map thumbnail and dates.
Detail: a map with a daily time slider (fire hotspot heatmap or ash spread,
labeled "Approximate replay: surface winds only"), a news list (headline,
publisher, date, external link icon), an AI summary card with numbered citations
and the yellow AI badge, "What people needed" chips (N95 masks, drinking water,
medicine, evacuation, school closures), and a button "If it happened again:
check your readiness". Desktop 1440 and mobile 390. Accessible contrast.
```

**Prompt C, chat panel:**
```
Using the Standbai design system, design an "Ask Standbai" chat panel: floating
round button bottom-right, a 360px panel on desktop and a full-screen sheet on
mobile. Show starter prompts as chips, user and assistant bubbles, assistant
messages with up to three action buttons (e.g. "Open the forecast map",
"See what to prepare"), a typing indicator, an error state, an opt-in
"Use my location" button, and a one-line disclaimer under the input:
"Not an official warning. Follow BMKG, PVMBG and your local BPBD."
```

**Prompt D, `/simulate` re-skin:**
```
Restyle this expert map dashboard (screenshot attached) with the Standbai design
system: light surface panels instead of the dark tactical look, the same ISPU
and probability colors, clear legend for "almost certain (>=90%) / likely (>=50%)
/ possible (>=5%)" plume tiers, readable at 1440 and usable at 390.
```

## 5. API contract (shared with the backend PRD)

**Common rules:**
- Base URL: `import.meta.env.VITE_API_BASE_URL`.
- Times are UTC ISO 8601 (`2026-10-10T08:00:00Z`); the FE shows local time with a zone label (WIB/WITA/WIT).
- Every response includes `generated_at`, `source` and `is_example` (true while the backend is still serving fallback data).
- **ISPU codes:** `good | moderate | unhealthy | very_unhealthy | hazardous`, with `index` 0–4.
- **Outlook levels:** `low | medium | high`.

| Endpoint | Replaces in prototype | Priority |
|---|---|---|
| `GET /cities` | `CITIES` | P0 |
| `GET /area/now?city=` | right-now card | P0 |
| `GET /area/series?city=&from=-72&to=72` | chart + day cards | P0 |
| `GET /area/outlook?city=` | AI outlook, `/why` signals and confidence | P0 |
| `POST /preparedness` | kit maths | P0 |
| `GET /fires?hours=168` | `FIRES` | P0 |
| `GET /volcanoes` | `VOLC` | P0 |
| `GET /sources` | `SOURCES` | P0 (exists) |
| `GET /health` | model names in `/why` | P0 (exists) |
| `GET /events/timeline?days=7` | `EVENTS` | P1 |
| `GET /map/frames/meta` + `GET /map/frames.bin` | `simulate()` | P1 |
| `POST /chat` | chat panel | P1 |
| `GET /history/...` | history pages | P1 |

**Examples:**

```jsonc
// GET /cities
{ "generated_at": "2026-10-10T08:00:00Z", "source": "Standbai city list", "is_example": false,
  "cities": [ { "id": "pekanbaru", "name": "Pekanbaru", "lat": 0.51, "lon": 101.45, "label": true } ] }

// GET /area/now?city=pekanbaru
{ "city": { "id": "pekanbaru", "name": "Pekanbaru" }, "time_utc": "2026-10-10T08:00:00Z",
  "pm25_ugm3": 72.4, "pm10_ugm3": 95.1, "dust_ugm3": 3.2,
  "ispu": { "code": "unhealthy", "index": 2, "official_name_id": "Tidak Sehat" },
  "advice_code": "wear_n95",            // safe_outside | ease_off | wear_n95 | stay_home | do_not_go_out
  "wind": { "from_deg": 225, "speed_kmh": 14 },
  "source": "CAMS global via Open-Meteo Air Quality API", "generated_at": "...", "is_example": false }

// GET /area/series?city=pekanbaru&from=-72&to=72   (3-hourly, 49 points)
{ "step_h": 3, "points": [ { "t_utc": "...", "pm25": 40.1, "pm10": 55.0, "dust": 2.0, "kind": "recorded" },
                           { "t_utc": "...", "pm25": 88.0, "kind": "forecast" } ],
  "days": [ { "day": 0, "pm25_max": 92.0, "ispu_code": "unhealthy", "advice_code": "wear_n95" },
            { "day": 1, ... }, { "day": 2, ... } ], "source": "...", "generated_at": "...", "is_example": false }

// GET /area/outlook?city=pekanbaru
{ "city": { "id": "pekanbaru", "name": "Pekanbaru" },
  "smoke_3d": { "level": "high", "peak": { "pm25": 130, "at_utc": "...", "ispu_code": "unhealthy" },
                "arrival_utc": "2026-10-11T08:00:00Z", "hours_until": 24 },
  "dry_2w":   { "level": "medium", "dry_index": 1 },
  "fire_1m":  { "level": "high", "hotspots_300km": 23 },
  "volcano":  { "name": "Marapi", "distance_km": 210, "level": 2, "level_name": "Waspada (Advisory)", "ash_toward_deg": 270 } , // or null
  "bad_days": { "normal": 2, "sensitive": 3 },
  "reasons": [ { "kind": "hotspots_300km", "value": 23, "strength": 0.8, "source_url": "https://firms.modaps.eosdis.nasa.gov/" },
               { "kind": "wind", "from_deg": 135, "speed_kmh": 14, "toward_city": true, "strength": 0.7, "source_url": "https://open-meteo.com/" },
               { "kind": "rain_7d_mm", "value": 4, "strength": 0.6, "source_url": "https://open-meteo.com/" },
               { "kind": "pm25_now", "value": 72, "strength": 0.3, "source_url": "https://open-meteo.com/en/docs/air-quality-api" } ],
  "confidence": { "basis": "example", "by_lead_h": [ { "h": 24, "p": 0.82 }, { "h": 48, "p": 0.68 }, { "h": 72, "p": 0.54 } ] },
  "engine": "heuristic_v0", "generated_at": "...", "is_example": false }

// POST /preparedness  {"people": 4, "sensitive": true, "bad_days": 3}
{ "items": [ { "id": "mask", "qty": 12, "unit": "pcs" }, { "id": "water", "qty": 36, "unit": "L" },
             { "id": "med", "qty": 5, "unit": "days" }, { "id": "room", "qty": 1, "unit": "room" }, { "id": "bag", "qty": 1, "unit": "bag" } ],
  "assumptions": [ "1 N95 per person per day", "3 L drinking water per person per day", "medicine for bad days + 2" ] }

// GET /fires?hours=168
{ "count": 412, "hotspots": [ { "lat": -1.85, "lon": 113.75, "frp": 52.3, "confidence": "high", "acq_utc": "...", "satellite": "VIIRS_SNPP" } ], ... }

// GET /map/frames/meta  (binary body at /map/frames.bin: uint8 frames back to back, row-major from the south-west corner)
{ "nx": 235, "ny": 100, "lon0": 94.5, "lat0": -11.5, "dx": 0.2, "dy": 0.2,
  "t0_h": -168, "t1_h": 72, "step_h": 3, "frames": 81, "origin_utc": "2026-10-10T08:00:00Z",
  "scale_ugm3_per_step": 1.5, "source": "CAMS + Standbai engine", "is_example": false }

// POST /chat  {"messages":[{"role":"user","content":"Will smoke reach Jambi this week?"}], "channel":"web", "client_location": null}
{ "reply": "Smoke is likely to reach Jambi tomorrow afternoon ...",
  "actions": [ { "label": "Open Jambi dashboard", "href": "/dashboard?city=jambi" },
               { "label": "See what to prepare", "href": "/ready?city=jambi" } ],
  "intent": "check_area", "engine": "featherless", "disclaimer": "Not an official warning. Follow BMKG, PVMBG and your local BPBD." }
```

## 6. Testing Decisions

- **What a good test checks here:** visible behaviour, not implementation details.
- **Gates before any push:** `npm run build` (includes `tsc -b`) and `npm run lint` pass.
- **Manual check at 1440×900 and 390×844:**
  1. `/` story through all three acts; the notification card appears and disappears; no horizontal scroll.
  2. Reduced motion (DevTools → Rendering → emulate) shows no splash and no looping animation.
  3. `/dashboard?city=jambi` loads the right city; the select and URL stay in sync.
  4. `/map` slider and play work; clicking a city opens a popup → dashboard.
  5. `/why` source links open in a new tab.
  6. `/ready` stepper and checkbox recompute quantities; reload keeps the ticks.
  7. `/simulate` runs a simulation against the local backend; map clicks land on the right feature (CSS tilt gone).
  8. Keyboard only: tab through the nav, CTAs, select, slider and checklist; focus is always visible.
  9. With the backend stopped, every page still renders example data with the "Example data" badge.
- **Lighthouse on `/`:** Performance ≥ 85 and Accessibility ≥ 95 on mobile. "Serve images in modern formats" passes.
- **P1:** Playwright smoke test (`npx playwright test`) for the 6 routes: page loads with no console errors.

## 7. Out of Scope (today)

- User accounts, login, saving data on a server.
- Web push notifications (Telegram covers alerts).
- Native mobile app, offline PWA.
- 3D terrain, wind-particle animation, scrollytelling "story mode" for past events (roadmap).
- Redesigning views that the prototype already defines.

## 8. Further Notes

### 8.1 Current state on `main` (`9e094db`, verified 2026-10-10)

- **Working:**
  - the Leaflet expert dashboard: header, controller dock (hazard, event, auto/experiment, eruption height, wind reversal, rain, fire scale), map with volcano/forest/hotspot/facility layers, 48 h timeline, five analysis tabs, legend, geolocation;
  - `lang="en"` and mostly English UI after Ziddan's "Fixing Features" commit; new `public/Logo.png`.
- **Not yet:**
  - no router and no landing page;
  - API base hard-coded to `http://127.0.0.1:8000` (`src/config/constants.ts`), so `VITE_API_BASE_URL` in `.env.example` is ignored;
  - CSS "3D POV" tilt on the map container breaks clicks;
  - title spelling "StandbAI";
  - ~30 Indonesian lines and 3 "UdaraSiaga" comments in `src/`;
  - unused Vite template assets (`src/assets/react.svg`, `vite.svg`, `hero.png`).
- **The prototype** (`docs/design/reference-prototype.html`) has 5 complete views with example data, a light/dark theme and ID/EN copy.

### 8.2 Delivery plan (WIB, today)

| Time | Ziddan | Depends on |
|---|---|---|
| 08:30–09:30 | FE-01, FE-02, FE-03 (router, tokens, constants) | - |
| 09:30–12:00 | FE-04 Home, FE-05 Dashboard (with example-data fallback) | - |
| 12:00–14:00 | FE-06 Map, FE-07 Why, FE-08 Ready | - |
| 14:00–15:00 | FE-09 wire real APIs as each goes live | BE-05…BE-10 |
| 15:00–16:00 | FE-10 `/simulate` fixes, FE-11 deploy on Vercel | BE-01 (Cloud Run URL) |
| 16:00–17:30 | FE-12 images, FE-13 a11y/perf pass; P1 chat or history if green | - |
| 17:30–18:00 | FE-14 honest status copy, screenshots for Devpost | - |
| 18:00 | **Feature freeze** | |
| 20:00–22:00 | Help record the 2–4 min demo video | |

### 8.3 Risks

- **Backend endpoints late:** every view falls back to example data with the badge. The demo still works; the README says which parts are live.
- **Scroll-story jank on low-end phones:** keep the scroll handler passive and transform-only, as in the prototype. Test on a real phone.
- **Map outline licence unknown:** resolve via FE-06 option A or B before the video.

### 8.4 Open questions

- Telegram bot URL (from Hikari) → `VITE_TELEGRAM_BOT_URL`.
- **ISPU colours.**
  - The official palette in Permen LHK P.14/2020 is green · blue · yellow · red · black (backend `docs/SOURCES.md`, D15, secondary check).
  - The prototype uses a warm ramp: green · gold · orange · red · plum.
  - Either keep the prototype's ramp and always print the category name, or switch `--c0…--c4` to the official colours. Decide by 12:00; the category name must be visible either way.
- Keep `public/Logo.png` or switch to the prototype's mark? Decide by 12:00.

## 9. Task board

Each ticket: owner · depends on · steps · files · acceptance · estimate.

### FE-01 Router and route shells (P0)
- **Owner:** Ziddan · **Depends on:** - · **Est.:** 40 min
- **Steps:**
  1. `npm i react-router`.
  2. Rewrite `src/main.tsx` with `BrowserRouter` and lazy routes `/`, `/dashboard`, `/map`, `/why`, `/ready`, `/simulate` (existing `App`), `*` (404).
  3. Shared `Nav` (logo, links Dashboard · Map · Why · Ready, "Example data" badge, ID/EN toggle) and `Footer` ("Not an official warning…").
  4. Add `vercel.json` with an SPA rewrite: `{"rewrites":[{"source":"/(.*)","destination":"/"}]}`.
- **Files:** `src/main.tsx`, `src/components/Nav.tsx`, `src/components/Footer.tsx`, `src/pages/*`, `vercel.json`.
- **Acceptance:** every route renders a heading; a hard refresh on `/map` works under `npm run preview`; `/` doesn't download Leaflet (check the Network tab).

### FE-02 Tokens, fonts, i18n (P0)
- **Owner:** Ziddan · **Depends on:** FE-01 · **Est.:** 40 min
- **Steps:**
  1. Copy the prototype `:root` blocks (light, dark media query, `[data-theme]`) to `src/styles/tokens.css`.
  2. Copy the component CSS to `src/styles/standbai.css`.
  3. Fonts in `index.html`.
  4. Move `T.en` and `T.id` to `src/i18n/en.ts` and `src/i18n/id.ts`.
  5. `useLang()` hook with default **`en`** and the `standbai-lang` key.
- **Files:** `src/styles/*`, `src/i18n/*`, `index.html`.
- **Acceptance:** toggling ID/EN changes all copy; dark mode follows the system; no hex colours outside `tokens.css`.

### FE-03 Config, branding, cleanup (P0)
- **Owner:** Ziddan · **Depends on:** - · **Est.:** 20 min
- **Steps:**
  1. `CONFIG.API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"`.
  2. Add `VITE_TELEGRAM_BOT_URL` to `.env.example`.
  3. Set the title, `<meta name="description">` and favicon to "Standbai".
  4. Delete unused Vite template assets.
  5. Translate the remaining Indonesian comments and strings.
- **Files:** `src/config/constants.ts`, `.env.example`, `index.html`, `src/**`.
- **Acceptance:** `grep -rniE "udara ?siaga|StandbAI" src index.html` returns nothing; a build with `VITE_API_BASE_URL=https://x` calls `https://x/...`.

### FE-04 Home scroll story (P0)
- **Owner:** Ziddan · **Depends on:** FE-01, FE-02 · **Est.:** 2 h
- **Steps:**
  1. Port `buildScene()` → `src/pages/home/Scene.tsx`.
  2. Port `story()` (scroll and pointer handlers, attached in `useEffect`, removed on unmount, `{passive:true}`).
  3. Port the captions, notification card, intro splash, "Three places to start", comparison and status sections.
  4. CTAs use `<Link>`.
- **Files:** `src/pages/home/*`.
- **Acceptance:** matches the prototype side by side at 1440 and 390; Acts 1–3 and the notification appear at the same scroll positions; reduced motion disables the splash and loops; Act 2 caption contrast ≥ 4.5:1.

### FE-05 Dashboard (P0)
- **Owner:** Ziddan · **Depends on:** FE-02 · **Est.:** 1.5 h
- **Steps:**
  1. Port `renderDash()`, `chart()` and `mini()` into components: `NowCard`, `DayCards`, `Pm25Chart`, `OutlookPanel`.
  2. City from `?city=`.
  3. Data via `useApi` with example fallback.
- **Files:** `src/pages/dashboard/*`, `src/services/standbai.ts`.
- **Acceptance:** with the backend off, example data plus badge; with the backend on, the numbers match `GET /area/now` and `/area/series` for the same city.

### FE-06 Map (P0; real frames P1)
- **Owner:** Ziddan · **Depends on:** FE-02 · **Est.:** 2 h
- **Steps:**
  1. Port the canvas map: `drawMap`, `lut`, `renderSum`, `renderMatrix`, `renderTime`, modes, layers, play.
  2. Example frames come from the ported `simulate()` until `GET /map/frames` exists.
  3. Fires and volcanoes come from the API as soon as BE-08/BE-09 are live.
  4. Resolve the outline licence: option A credit or option B `/layers/coastline`.
- **Files:** `src/pages/map/*`.
- **Acceptance:** the slider covers −7 d → +3 d; play and stop work; a city click opens a popup and links to the dashboard; the source credit is visible.

### FE-07 Why (P0-lite)
- **Owner:** Ziddan · **Depends on:** FE-05 · **Est.:** 45 min
- **Steps:** port `renderPredik()`; the claim, signals, confidence and sources come from `/area/outlook` and `/sources`; add the limits and disclaimer.
- **Files:** `src/pages/why/*`.
- **Acceptance:** each signal row has a working source link; the confidence note reflects `confidence.basis`.

### FE-08 Ready (P0)
- **Owner:** Ziddan · **Depends on:** FE-05 · **Est.:** 45 min
- **Steps:** port `renderKit()`; quantities from `POST /preparedness` with local formula fallback; checklist in `standbai-checks`; Telegram deep-link button.
- **Files:** `src/pages/ready/*`.
- **Acceptance:** 4 people with 3 bad days gives 12 masks and 36 L water, matching the backend; ticks survive a reload.

### FE-09 Wire real APIs (P0)
- **Owner:** Ziddan · **Depends on:** BE-05…BE-10 · **Est.:** 1 h, spread across the day
- **Steps:** for each endpoint in §5 that answers on the deployed backend, switch off the fallback for that view; the nav badge only shows while any view still uses example data.
- **Acceptance:** with everything live, no "Example data" badge is shown.

### FE-10 `/simulate` fixes (P0)
- **Owner:** Ziddan · **Depends on:** FE-01, FE-03 · **Est.:** 45 min
- **Steps:**
  1. Mount the existing `App` at `/simulate`.
  2. Remove the CSS tilt and "Google Earth 3D" controls.
  3. Fix the attribution.
  4. Read query params `event`, `hazard`, `hours`, `autorun`.
  5. Support `hazard_radius_km` with fallback to `radius_bahaya_km`.
- **Files:** `src/App.tsx`, `src/components/layout/MapWorkspace.tsx`, `src/types/geo.ts`.
- **Acceptance:** `/simulate?event=anak_krakatau_2026_09&autorun=1` starts a run; map clicks select the right marker.

### FE-11 Deploy to Vercel (P0)
- **Owner:** Ziddan · **Depends on:** FE-01, FE-03, BE-01 · **Est.:** 30 min
- **Steps:**
  1. Import the repo in Vercel (framework preset Vite).
  2. Set `VITE_API_BASE_URL` (the Cloud Run URL from Hikari) and `VITE_TELEGRAM_BOT_URL`.
  3. Deploy.
  4. Send the Vercel domain to Hikari for CORS.
- **Acceptance:** the live URL loads all routes, including a hard refresh on `/map`; there are no CORS errors in the console.

### FE-12 Image optimization (P0-lite)
- **Owner:** Ziddan · **Depends on:** FE-01 · **Est.:** 30 min
- **Steps:** follow §4.11 (`npm i -D vite-plugin-image-optimizer sharp svgo`, then add it to `vite.config.ts`); add `<picture>`, sizes and lazy loading to the images in use.
- **Acceptance:** `find dist -name '*.png' -size +200k` prints nothing; the Lighthouse image audits pass.

### FE-13 Accessibility and performance pass (P0)
- **Owner:** Ziddan · **Depends on:** FE-04…FE-08 · **Est.:** 45 min
- **Steps:** run the §6 manual checks and Lighthouse; fix focus styles, labels (`aria-label` on the stepper buttons in English: "Fewer people" and "More people"), and contrast.
- **Acceptance:** §6 gates met.

### FE-14 Honest status copy and screenshots (P0)
- **Owner:** Ziddan · **Depends on:** FE-09 · **Est.:** 20 min
- **Steps:**
  1. Update the Home "Working / Not connected yet" lists and the footer to the real state at 17:30.
  2. Take screenshots of each route (1440 and 390) for Devpost and the README.
- **Acceptance:** nothing on the site claims live data that is still an example.

### FE-15 Chat panel (P1, optional)
- **Owner:** Ziddan · **Depends on:** BE-14 (`/chat`) · **Est.:** 1.5 h
- **Steps:** follow §4.9; design with Claude Design prompt C.
- **Acceptance:** the four starter prompts return replies with internal-link buttons; external links are ignored; error state shown when the backend is down.

### FE-16 History pages (P1)
- **Owner:** Ziddan · **Depends on:** BE-15 · **Est.:** 2 h
- **Steps:** follow §4.10; design with Claude Design prompt B.
- **Acceptance:** both events open; news links open the publisher; the replay label is visible.
