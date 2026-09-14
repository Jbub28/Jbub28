# EAS Build — EnergyGuard JRB (Capacitor iOS)

This project uses [Expo Application Services (EAS)](https://expo.dev/eas) custom workflows to compile the Capacitor iOS shell. The Next.js API and database stay on the HTTPS server. Testers connect from the first screen in the app.

## Build

```bash
eas build --platform ios --profile production
```

The `production` profile signs an App Store IPA (TestFlight-capable). Version is 1.0.1.

## Submit to TestFlight

After a successful production build, submit with your App Store Connect Apple ID of the app:

```bash
eas submit --platform ios --id <BUILD_ID> --profile production
```

App Store Connect Apple ID is `6811939293` (`eas.json` → `submit.production.ios.ascAppId`). Bundle ID is `com.jbub28.energyguardjrb`. Apple Team ID is `L7ZVZDDF3G`.

EAS already has a distribution certificate and an App Store Connect API key, but those were first used for `com.saferoute.nav`. The EnergyGuard bundle needs its own App Store provisioning profile. Cloud builds pass `EXPO_APPLE_TEAM_ID` so EAS can create that profile without an interactive Apple login. Do not submit an IPA signed as `com.saferoute.nav` to app `6811939293`.

If a later iOS build still fails with “Credentials are not set up”, run this once on a machine logged into Expo and Apple:

```bash
npx eas-cli credentials -p ios
```

Choose bundle `com.jbub28.energyguardjrb` and set up all credentials (reuse the existing distribution certificate).

## How it works

1. `npm run build:ios` — write the default HTTPS server URL into `native-web/`
2. `npx cap sync ios` — copy the iOS connect screen into Xcode
3. Fastlane `gym` — archive and sign `ios/App/App.xcodeproj` (scheme **App**, bundle `com.jbub28.energyguardjrb`)

Display name on the iPhone is **EnergyGuard JRB**.
