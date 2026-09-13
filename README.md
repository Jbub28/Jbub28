# EnergyGuard JRB

Mobile-first Job Risk Briefing for Electric Delivery crews (Distribution, Transmission, Substation). This is a crew discussion tool. It is not an observation, scoring, or coaching application.

A completed software check does not mean the work is safe. Workers keep stop-work authority. AI suggestions are labeled **Suggested for Crew Review**.

## Quick start

```bash
cp .env.example .env
# DATABASE_URL and AUTH_SESSION_SECRET are required
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open http://localhost:3000 and sign in as `eic@energyguard.local` / `ChangeMe!LocalOnly`.

PostgreSQL can be local or `docker compose up -d db`.

## What is in this repo

- Field wizard for the full JRB path, including voice/typed work, EEI task confirmation, High Energy, Direct Controls, Alternative Controls, crew briefing, Ready for Work gating, Stop Work, and rebrief versioning
- Controlled-content import from `/reference` (EEI, Direct Control inventory, Job Briefing Form, Alternative Control resource)
- Append-only audit events
- Offline draft storage (IndexedDB) and PWA shell
- Mock auth / speech / AI / storage adapters plus Azure-ready interfaces

## Documentation

See `/docs` for product requirements, architecture, data model, workflow, accessibility, security, governance, import, AI/speech, offline sync, testing, deployment, source inventory, and exceptions.

## Tests

```bash
npm test
npx playwright test
npm run typecheck
npm run lint
```

## Controlled content

Do not invent EEI tasks, High Energy icons, Direct Controls, or OSHA/PPE requirements. Unresolved source issues are listed in `/docs/assumptions-and-exceptions.md` and the admin Exceptions list.
