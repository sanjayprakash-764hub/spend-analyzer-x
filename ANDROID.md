# Building the Spend Manager Android App Bundle (.aab)

App ID: `com.spendmanager.app` · Version 1.0.0 (code 1) · Loads https://spend-analyzer-x.lovable.app

Requirements: Node 20+, Android Studio (latest), JDK 21.

1. Export the project to GitHub (Lovable → GitHub), then `git clone` it and `cd` into it.
2. `npm install`
3. `npx cap sync android`
4. `npx cap open android` (opens Android Studio; let Gradle finish syncing).
5. Test on a phone/emulator: Run ▶.
6. Build → Generate Signed App Bundle → Android App Bundle → create a new keystore
   (store it and its passwords safely — you need the same key for every future update).
7. Choose `release`. The file appears at `android/app/release/app-release.aab`.
8. For each update: raise `versionCode` and `versionName` in `android/app/build.gradle`.

Google sign-in inside the app: add your Play App Signing SHA-1 / SHA-256 (Play Console →
App integrity) to your Google OAuth client if Google login is restricted by app signature.
