# Deployment

## Local

```bash
cp .env.example .env
# Set DATABASE_URL to local PostgreSQL
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open http://localhost:3000. Sign in with a seeded mock user (see README).

PostgreSQL via Docker:

```bash
docker compose up -d db
```

Or a local cluster (`docs` assume database `energyguard`).

## Azure-oriented production

1. Azure Database for PostgreSQL — Flexible Server; set `DATABASE_URL`
2. Azure Container Apps or App Service — Node 22, `npm run build && npm start`
3. Entra ID app registration — `AUTH_PROVIDER=entra` plus client ID/secret/tenant (Key Vault)
4. Azure Blob Storage — `STORAGE_PROVIDER=azure` plus account/container
5. Azure AI Speech — `SPEECH_PROVIDER=azure`
6. Azure OpenAI — `AI_PROVIDER=azure-openai` (must still only rank approved records)
7. Custom domain + TLS
8. Application Insights for operational logs (no secrets, no unnecessary PII)

## Release checklist

- `prisma migrate deploy`
- Seed or import controlled content
- Administrator **Publish** of staged libraries
- Confirm demo mock auth is disabled (`AUTH_PROVIDER=entra`)
- Confirm `AUDIO_RETENTION_ENABLED` matches policy
- Run `npm test` and Playwright smoke
- Verify `/manifest.webmanifest` and HTTPS for PWA install

## iPhone / TestFlight

EnergyGuard JRB is a Next.js server app wrapped in a Capacitor iOS shell (`com.saferoute.nav`, display name **EnergyGuard JRB**). The iPhone app does not bundle the database. Testers connect to the live HTTPS server from the first screen.

```bash
npm install
CAPACITOR_SERVER_URL=https://your-https-host npm run build:ios
npx cap sync ios
```

Then archive from Xcode or run the EAS `production` iOS profile. Build number is `CURRENT_PROJECT_VERSION` in `ios/App/App.xcodeproj`. If a tunnel DNS name changes, testers paste the new URL on the connect screen. Typed briefing works on iPhone even when talk-to-text is unavailable.

Demo EIC: `eic@energyguard.local` / `ChangeMe!LocalOnly`

## Health

`GET /api/health` returns database connectivity without leaking internals.
