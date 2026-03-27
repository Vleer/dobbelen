# Mobile App Iterations (Android + iOS)

## Iteration 1 - Wrap the current web app
- Add Capacitor to the `frontend` app.
- Generate Android and iOS native projects.
- Run the app on emulator/device with current web features.

## Iteration 2 - Stable backend connectivity
- Remove production reliance on `localhost`.
- Add environment-based API and WebSocket URLs.
- Confirm API + realtime game updates work on phone networks.

## Iteration 3 - Mobile production hardening
- Enforce HTTPS/WSS endpoints in production.
- Add reconnect handling and user-friendly network errors.
- Verify session persistence across app restarts.

## Iteration 4 - Native app polish
- Add app icon, splash screen, and app metadata.
- Tune mobile layout and touch interactions.
- Add device-specific QA checklist for Android/iOS.

## Iteration 5 - Store readiness
- Configure signing, bundle IDs, and release builds.
- Run final device/regression tests for core gameplay.
- Prepare Play Store and App Store submission assets.

## Iteration 6 - Full functional release
- Publish both platforms.
- Monitor crashes/network issues and patch quickly.
- Plan next native enhancements (push, deep links, haptics).
