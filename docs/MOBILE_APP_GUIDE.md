# Ekiboozi Mobile Deployment Guide (Android & iOS)

Ekiboozi is architected to run seamlessly on mobile devices as both an installable **Progressive Web App (PWA)** and a **Native Mobile App (Capacitor for Android Studio & Xcode)**.

---

## 1. Instant Mobile Web App (PWA)

Ekiboozi includes automated service workers (`vite-plugin-pwa`), asset precaching, and adaptive Web App Manifests.

### Android / Chrome Experience
- When an Android user visits the site, an **"Install App"** pill appears in the top header.
- Tapping it prompts native installation to the Android launcher with high-resolution adaptive/maskable icons (`pwa-maskable-512x512.png`).
- Launches in standalone mode (no browser URL bar or navigation controls).

### iOS Safari Experience
- iOS WebKit does not trigger automatic install popups.
- Tapping the in-app **"Install App"** button opens a guided modal explaining the Apple workflow:
  1. Tap the Safari **Share** icon (square with arrow).
  2. Tap **"Add to Home Screen"**.
  3. Tap **"Add"**.
- Once added, iOS runs Ekiboozi with `apple-mobile-web-app-capable="yes"` and `apple-mobile-web-app-status-bar-style="black-translucent"`.

---

## 2. Compiling into Native Android (Google Play) & iOS (App Store)

The project includes `capacitor.config.json` configured for `ug.ekiboozi.app`.

### Prerequisites
- Node.js 18+
- Android Studio (for Android builds)
- Xcode on macOS (for iOS builds)

### Step 1: Install Capacitor CLI & Platforms
In your project directory:
```bash
npm install @capacitor/core
npm install -D @capacitor/cli @capacitor/android @capacitor/ios
```

### Step 2: Initialize & Build the Web Assets
```bash
npm run build
npx cap add android
npx cap add ios
```

### Step 3: Synchronize Code & Plugins
```bash
npx cap sync
```

### Step 4: Open in Native IDEs

#### For Android (Play Store APK / AAB)
```bash
npx cap open android
```
- Android Studio will open the project.
- Select **Build > Generate Signed Bundle / APK** to create your release `.aab` for the Google Play Console.

#### For iOS (Apple App Store IPA)
```bash
npx cap open ios
```
- Xcode will open the `.xcworkspace`.
- Configure your Apple Developer Signing Team.
- Select **Product > Archive** to publish to TestFlight or the App Store.

---

## 3. Mobile Features & Optimizations Included

- [x] **Safe Area Insets:** Header, modals, and video player dynamically respect iPhone Dynamic Islands, notches, and Android system navigation bars (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`).
- [x] **Touch & Gesture Optimization:** `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` for zero-lag mobile taps.
- [x] **Offline Connectivity:** `<OfflineIndicator />` toast informs users whenever network connectivity drops.
- [x] **Orientation Lock:** Manifest requests portrait-first orientation with responsive video player auto-rotation in fullscreen mode.
- [x] **Icon Suite:** Maskable 512x512, standard 192x192 & 512x512, and 180x180 Apple touch icons generated in `public/`.
