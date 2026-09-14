import type { CapacitorConfig } from "@capacitor/cli";

const extraHosts = (process.env.CAPACITOR_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const config: CapacitorConfig = {
  appId: "com.jbub28.energyguardjrb",
  appName: "EnergyGuard JRB",
  webDir: "native-web",
  ios: {
    contentInset: "automatic",
    backgroundColor: "#0a3161",
    preferredContentMode: "mobile",
  },
  server: {
    androidScheme: "https",
    allowNavigation: ["*.trycloudflare.com", "localhost", "127.0.0.1", ...extraHosts],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0a3161",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a3161",
    },
  },
};

export default config;
