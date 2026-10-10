# SETUP: Standbai Web App

## Prerequisites
- **Node.js 20 or newer** (tested with Node 24) and npm.
- **The Standbai API running locally** on `http://127.0.0.1:8000` (see the backend's `SETUP.md`), or a deployed API URL. Without it, the new pages show labelled example data, and `/simulate` can't run simulations.

## Install and run

```bash
git clone https://github.com/ITHACKITS/FE-FORGEHACK-2026.git
cd FE-FORGEHACK-2026
npm install
cp .env.example .env        # then edit the values below
npm run dev                 # http://localhost:5173
```

## Run the whole stack with Docker

To run the backend, AI service and web app together, clone the three repos side by side and use the Compose file in the backend repo: see [`BE-FORGEHACK-2026/SETUP.md`](https://github.com/ITHACKITS/BE-FORGEHACK-2026/blob/main/SETUP.md#run-the-full-stack-with-docker-compose-be--ai--fe).

## Environment variables

Vite only exposes variables that start with `VITE_`. **Never put secrets here**: everything ends up in the browser bundle.

| Variable | Example | Status | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | Planned (FE-03) | Standbai API base URL. Today the code ignores it and uses the hard-coded value in `src/config/constants.ts`. |
| `VITE_TELEGRAM_BOT_URL` | `https://t.me/<bot>` | Planned (FE-03) | Link for "Get alerts on Telegram" |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check (`tsc -b`), then a production build into `dist/` |
| `npm run preview` | Serve the production build locally (use it to test deep links like `/map`) |
| `npm run lint` | `oxlint` |

## Design references

Open `docs/design/reference-prototype.html` directly in a browser. It's a self-contained prototype of the five main views and the visual source of truth. `docs/design/reference-landing-*.png` show the illustrated landing.

## Deploy to Vercel
1. In Vercel, **Add New → Project** and import `ITHACKITS/FE-FORGEHACK-2026`. The framework preset is **Vite**: build command `npm run build`, output directory `dist`.
2. Under **Environment Variables**, set `VITE_API_BASE_URL` (the Cloud Run URL from the backend team) and `VITE_TELEGRAM_BOT_URL`.
3. Make sure `vercel.json` with the SPA rewrite exists (ticket FE-01), so a hard refresh on `/map` works:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
   ```
4. Deploy, then send the Vercel domain to the backend team so it's added to `CORS_ORIGINS`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Network errors to `127.0.0.1:8000` on the deployed site | `VITE_API_BASE_URL` not set or not read (FE-03); rebuild after setting it |
| CORS error in the console | Ask the backend team to add your origin to `CORS_ORIGINS` |
| 404 on refresh of `/map` on Vercel | Add `vercel.json` (step 3 above) |
| Map clicks select the wrong marker on `/simulate` | Remove the CSS 3D tilt (FE-10) |
| `npm run build` fails on types | Run `npx tsc -b` to see the first error; fix it before pushing |
