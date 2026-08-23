# EAS Build — SafeRoute Nav (Capacitor iOS)

This project uses [Expo Application Services (EAS)](https://expo.dev/eas) with **custom build workflows** to compile the Capacitor iOS app in the cloud. You do not need a local Mac for cloud builds.

## One-time setup

Run these on your machine (or anywhere you can log in to Expo):

```bash
# 1. Install EAS CLI (global, or use npx eas from this repo)
npm install --global eas-cli

# 2. Log in to your Expo account
eas login

# 3. Link this repo to an EAS project (creates/updates eas.json + app.json projectId)
eas build:configure
```

When `eas build:configure` runs, it will:
- Create or link an Expo project
- Write the real `projectId` into `app.json`
- Confirm build profiles in `eas.json`

## Required secrets

Mapbox and Supabase tokens are baked in at **build time** for the static export. Set them as EAS secrets before your first production build:

```bash
eas secret:create --scope project --name NEXT_PUBLIC_MAPBOX_TOKEN --value "pk.your_token"
eas secret:create --scope project --name NEXT_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas secret:create --scope project --name NEXT_PUBLIC_SUPABASE_ANON_KEY --value "your_anon_key"
```

## Build commands

```bash
# Production IPA (App Store / TestFlight)
eas build --platform ios --profile production

# Internal preview build (signed device build)
eas build --platform ios --profile preview

# Simulator build (no Apple credentials needed)
eas build --platform ios --profile development
```

Or use npm scripts (uses the local `eas-cli` dev dependency):

```bash
npm run eas:build:ios
```

## Submit to TestFlight

After a successful production build:

```bash
eas submit --platform ios --profile production
```

Or combine build + submit:

```bash
eas build --platform ios --profile production --auto-submit
```

Update `eas.json` → `submit.production.ios` with your Apple ID, App Store Connect app ID, and team ID before submitting.

## How it works

This is a **Next.js + Capacitor** app, not a standard Expo/React Native app. EAS uses custom YAML workflows in `.eas/build/`:

1. `npm run build:ios` — static Next.js export (`CAPACITOR_BUILD=1`)
2. `npx cap sync ios` — copy web bundle into the Xcode project
3. Fastlane `gym` — archive and sign `ios/App/App.xcodeproj` (scheme: **App**)

## Apple credentials

On your first signed build, EAS will prompt you to set up:
- Apple Developer Program membership
- Distribution certificate
- Provisioning profile for `com.saferoute.nav`

Or manage them manually:

```bash
eas credentials
```

## CI / non-interactive login

For GitHub Actions or other CI, create an Expo access token and set:

```bash
export EXPO_TOKEN=your_expo_access_token
eas build --platform ios --profile production --non-interactive
```

Create tokens at: https://expo.dev/accounts/[account]/settings/access-tokens

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Not logged in` | Run `eas login` |
| `projectId` missing | Run `eas build:configure` |
| Blank map in app | Set `NEXT_PUBLIC_MAPBOX_TOKEN` as EAS secret before build |
| Build can't find Xcode project | Confirm `ios/App/App.xcodeproj` exists (`npm run cap:sync` locally first) |
| Global install permission error | Use `npx eas` or `npm run eas:*` scripts instead |

## Local alternative (Mac + Xcode)

If you prefer building locally, see [IOS.md](./IOS.md).
