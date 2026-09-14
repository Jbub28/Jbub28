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

Do not submit an IPA signed as `com.saferoute.nav` to app `6811939293`. Expo still has store credentials only for that old bundle. The EnergyGuard identifier needs its own App Store provisioning profile on the Expo project before a GitHub/cloud build can sign.

### One-time signing setup (required)

On a machine logged into Expo **and** Apple Developer, from this repo:

```bash
npx eas-cli credentials -p ios
```

1. Select the `@jbub28s-team/joshua-menninger` project.
2. Choose bundle identifier `com.jbub28.energyguardjrb` (add it if Expo only lists `com.saferoute.nav`).
3. **Set up all** build credentials. Reuse the existing Apple Distribution certificate (team `L7ZVZDDF3G`). Let EAS create or download an App Store provisioning profile for `com.jbub28.energyguardjrb`.

Alternatively, in a browser:

1. [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list) — confirm App ID `com.jbub28.energyguardjrb`.
2. [Apple Developer → Profiles](https://developer.apple.com/account/resources/profiles/list) — create an **App Store** profile for that App ID, using the same distribution certificate already on Expo.
3. Upload that profile under [Expo iOS credentials](https://expo.dev/accounts/jbub28s-team/projects/joshua-menninger/credentials) for identifier `com.jbub28.energyguardjrb`.

After that, `eas build --platform ios --profile production --auto-submit` can run non-interactively.

## How it works

1. `npm run build:ios` — write the default HTTPS server URL into `native-web/`
2. `npx cap sync ios` — copy the iOS connect screen into Xcode
3. Fastlane `gym` — archive and sign `ios/App/App.xcodeproj` (scheme **App**, bundle `com.jbub28.energyguardjrb`)

Display name on the iPhone is **EnergyGuard JRB**.
