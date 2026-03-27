# Mobile QA Checklist (Android + iOS)

## Install + launch
- Fresh install opens to lobby without blank screen.
- Cold start + background/foreground keeps UI responsive.

## Connectivity
- Join/create game on Wi‑Fi.
- Join/create game on mobile hotspot / cellular.
- Toggle airplane mode briefly: app shows an error and recovers after reconnect.

## Gameplay (core)
- Create game, join from second device, start game.
- Real-time updates (bids / actions) update quickly for both devices.
- Leaving a game returns cleanly to lobby.

## UI + touch
- Buttons are tappable (no “dead zones”) near screen edges/notch.
- Landscape + portrait both usable (no clipped panels).
- Text remains readable on small screens.

## Audio/settings
- Mute toggle persists and behaves correctly.
- Settings open/close works without blocking taps underneath.
