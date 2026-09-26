import type { CapacitorConfig } from "@capacitor/cli";

// The Android app loads the live, HTTPS-hosted Spend Manager (same app, same login, same data).
const config: CapacitorConfig = {
  appId: "com.spendmanager.app",
  appName: "Spend Manager",
  webDir: "capacitor-www",
  server: {
    url: "https://spend-analyzer-x.lovable.app/auth",
    androidScheme: "https",
    cleartext: false,
    allowNavigation: ["spend-analyzer-x.lovable.app", "*.lovable.app", "accounts.google.com", "oauth.lovable.app"],
  },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, backgroundColor: "#FAF8F4", showSpinner: false },
    StatusBar: { style: "LIGHT", backgroundColor: "#FAF8F4" },
  },
};

export default config;
