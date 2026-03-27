# Mobile release (Iteration 5)

## Android (Linux/macOS/Windows)

### 1) Set version
- Edit `frontend/android/app/build.gradle`
  - `versionCode`: increment every release
  - `versionName`: human version (e.g. `1.0.1`)

### 2) Create a signing key (one-time)
From `frontend/android/`:

```bash
keytool -genkeypair -v -keystore release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias release
```

### 3) Add signing config (local file, don’t commit)
- Copy `frontend/android/keystore.properties.example` → `frontend/android/keystore.properties`
- Fill in the passwords + alias + `storeFile=release.keystore`

### 4) Build release bundle (Play Store)
From `frontend/android/`:

```bash
./gradlew :app:bundleRelease
```

Output: `frontend/android/app/build/outputs/bundle/release/app-release.aab`

### 5) Quick installable release APK (optional)

```bash
./gradlew :app:assembleRelease
```

Output: `frontend/android/app/build/outputs/apk/release/app-release.apk`

## iOS (macOS only)

### Requirements
- Xcode + Command Line Tools
- CocoaPods (`brew install cocoapods`)

### Build steps
From `frontend/`:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Then in Xcode:
- Set **Team** + **Signing**
- Set the version + build number
- Archive and upload to TestFlight/App Store

