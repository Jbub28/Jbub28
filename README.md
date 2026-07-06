# Route Risk Predictor

Predict whether a future route is **low, medium, or high risk** using historic crash data from [Signal4 Analytics](https://signal4analytics.com) — Florida's statewide crash mapping platform (UF GeoPlan Center / FDOT).

## Features

- **Signal4 crash import** — upload CSV exports from Event Analysis
- **Historic crash map** — plot crashes by severity on an interactive map
- **High-risk corridors** — identify locations with the most crashes
- **Crash patterns** — severity, time of day, weather, speeding, distraction, alcohol
- **Route predictor** — enter origin, destination, date, and time → risk forecast with plain-English explanation
- **Supabase storage** — persist crashes, corridors, scores, and predictions

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 and click **Load sample Tampa crash data**, or visit `?demo=1`.

## Importing Signal4 data

1. Log in at [signal4analytics.com](https://signal4analytics.com) (account required for downloads)
2. Go to **Event Analysis** → run a query for your area and time period
3. Download **Crash Tables (CSV)**
4. Upload the CSV in the app

The parser recognizes standard S4 fields: `Report Number`, `Crash Date and Time`, `Latitude`, `Longitude`, `S4 Crash Severity`, `On Street Road Highway`, `Light Condition`, `Weather Condition`, and contributing-factor flags.

## Route prediction

Enter a future route (e.g. "Dale Mabry Hwy, Tampa" → "I-275 & Kennedy Blvd") with a date and time. The predictor:

1. Finds historic crashes near the corridor from your Signal4 dataset
2. Weights severity, fatalities, time-of-day match, speeding, distraction, and weather
3. Returns **low / medium / high** risk with a plain-English explanation

## Supabase setup

1. Run migrations in `supabase/migrations/`
2. Copy `.env.example` → `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Architecture

```
src/lib/parsers/signal4-analytics.ts   CSV parser for S4 exports
src/lib/risk/corridors.ts              High-risk corridor clustering
src/lib/risk/scoring.ts                Area risk index from crash history
src/lib/risk/prediction.ts             Route risk forecast engine
src/lib/data/signal4-sample.ts         Sample Tampa crash data
```

Designed to expand with TECO fleet accident data alongside Signal4 records.

## Data citation

> Signal4 Lab, University of Florida. (n.d.). Signal4 Analytics Database. Retrieved [date], from https://signal4analytics.com.

## Tech stack

Next.js 16 · TypeScript · Tailwind CSS · Supabase · Leaflet · Recharts
