import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.saferoute.nav",
  appName: "SafeRoute Nav",
  webDir: "out",
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#020617",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#020617",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#020617",
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
    },
  },
};

export default config;
