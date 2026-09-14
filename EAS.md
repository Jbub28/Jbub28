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

App Store Connect Apple ID is `6811939293` (`eas.json` → `submit.production.ios.ascAppId`).

## How it works

1. `npm run build:ios` — write the default HTTPS server URL into `native-web/`
2. `npx cap sync ios` — copy the iOS connect screen into Xcode
3. Fastlane `gym` — archive and sign `ios/App/App.xcodeproj` (scheme **App**, bundle `com.jbub28.energyguardjrb`)

Display name on the iPhone is **EnergyGuard JRB**.
