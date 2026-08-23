# SafeRoute Nav — iOS App (Capacitor)

This app ships as a native iOS app via [Capacitor](https://capacitorjs.com/), wrapping the same Next.js UI used on the web.

## Requirements

- **macOS** with **Xcode 15+**
- **Apple Developer account** ($99/year) for App Store or TestFlight
- **Node.js 20+**
- Mapbox token in `.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

## Build on your Mac

```bash
# 1. Install dependencies
npm install

# 2. Build static web bundle + sync into Xcode project
npm run cap:sync

# 3. Open in Xcode
npm run cap:open
```

In Xcode:

1. Select your **Team** under Signing & Capabilities
2. Set bundle ID if needed (`com.saferoute.nav`)
3. Choose a simulator or connect your iPhone
4. Press **Run** (▶)

## App Store / TestFlight

### Option A — EAS Build (cloud, no Mac required)

See **[EAS.md](./EAS.md)** for full setup. Quick start:

```bash
npm install --global eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
```

### Option B — Xcode on your Mac

1. In Xcode: **Product → Archive**
2. **Distribute App → App Store Connect**
3. Upload and submit for TestFlight or review

## What changed for iOS

| Feature | Web PWA | iOS app |
|---------|---------|---------|
| GPS | Browser geolocation | Native `@capacitor/geolocation` |
| PDF import | Client-side (pdf.js) | Same — works offline |
| CSV import | File picker | Same |
| Install prompt | Shown in Safari | Hidden in native shell |
| Service worker | Registered | Skipped in native shell |

## Updating the app after code changes

```bash
npm run cap:sync    # rebuild + copy to ios/
# Then run again from Xcode
```

## Mapbox token for production

In Mapbox dashboard, allow your app bundle ID (`com.saferoute.nav`) or use an unrestricted public token for development.

## Background location

`Info.plist` includes location permission strings and background location mode for active navigation. Apple may ask you to justify background location during App Review — explain it is used only during active turn-by-turn navigation.

## Troubleshooting

- **Blank screen**: Run `npm run cap:sync` again after any web code change
- **No GPS**: Check Settings → SafeRoute → Location → While Using
- **Mapbox errors**: Verify `NEXT_PUBLIC_MAPBOX_TOKEN` was set before `npm run build:ios` (env vars are baked in at build time)
