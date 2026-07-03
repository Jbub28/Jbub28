# Personal Route Risk Predictor

A Next.js dashboard for analyzing **your personal driving history** and predicting risk for future routes. Built to expand later with TECO fleet accident data.

## Features

- **Import driving history**
  - Google Maps Timeline / [Google Takeout](https://takeout.google.com) (`Timeline.json`, Semantic Location History, `Records.json`)
  - GEICO DriveEasy via CSV export, screenshot text paste, or manual trip entry
- **Trip map** — visualize recent drives on an interactive OpenStreetMap
- **Common routes** — cluster trips by origin/destination
- **Risk patterns** — time of day, speed, braking, phone use, weather, road type
- **Safety score** — personal 1–100 score with plain-English explanation
- **Route predictor** — enter a future origin, destination, date, and time → low / medium / high risk forecast
- **Supabase storage** — trips, routes, scores, and predictions persist in Supabase (local storage fallback for demo)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Load sample Tampa-area data** to explore without imports.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial_schema.sql` in the SQL editor
3. Copy `.env.example` to `.env.local` and add your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Without these variables the app runs in **local storage demo mode**.

## Google Takeout import

1. Go to [takeout.google.com](https://takeout.google.com)
2. Deselect all, then select **Location History**
3. Choose JSON format and create export
4. Upload `Timeline.json` or files from the Semantic Location History folder

## GEICO DriveEasy import

- **CSV** — upload if your export includes date, distance, speed, braking, phone use columns
- **Screenshot** — paste copied text; the parser looks for dates, miles, max speed, harsh braking, phone use
- **Manual** — enter one trip at a time with driving behavior metrics

## Architecture

```
src/
  lib/
    parsers/       # Google Takeout + GEICO parsers
    risk/          # Scoring, route clustering, prediction
    supabase/      # Client + storage abstraction
    types/         # Shared types (personal + fleet-ready)
  components/
    dashboard/     # Map, import, patterns, predictor
```

The schema uses a `data_source` field (`personal` | `fleet`) on all trip-related tables. Placeholder `fleet_vehicles` and `fleet_accidents` tables are included for future TECO integration.

## Scripts

| Command        | Description          |
|----------------|----------------------|
| `npm run dev`  | Start dev server     |
| `npm run build`| Production build     |
| `npm run start`| Start production     |
| `npm run lint` | ESLint               |

## Tech stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Supabase
- Leaflet / react-leaflet
- Recharts
