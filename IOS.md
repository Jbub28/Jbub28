# EnergyGuard JRB — iOS app (Capacitor)

The iPhone app is a Capacitor shell around the live EnergyGuard JRB server. It is not a static export of Next.js.

## Requirements

- macOS with Xcode 15+ for local archives, or EAS for cloud builds
- Apple Developer account for TestFlight
- A reachable HTTPS server (tunnel or hosted)

## Local

```bash
npm install
CAPACITOR_SERVER_URL=https://your-https-host npm run build:ios
npx cap sync ios
npx cap open ios
```

On first launch, paste the HTTPS server address and tap Connect. If a tunnel DNS name changes, open the app and paste the new URL.

## TestFlight

See **[EAS.md](./EAS.md)**. Typed briefing, acknowledgments, Direct Controls, and optional GPS work on iPhone. Talk-to-text may be unavailable in the iOS WebView; type the job instead.

Demo EIC: `eic@energyguard.local` / `ChangeMe!LocalOnly`
