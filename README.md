# AGI-S mobile

iOS and Android, one codebase, Expo + React Native.

## Scope

Chat, memory, plugins, history, settings. **Not** CodeX, Workflows, Crucible or
Catalyst — a file tree, a canvas and a code editor are desktop interactions, and
a bad version of them on a phone is worse than an honest "open this on desktop".

## Running it

Double-click **START-MOBILE.bat** in the folder above this one. It installs on
first run and then serves the app to your phone over a tunnel, so the phone does
not need to be on the same wifi.

By hand, from THIS directory — not the folder above it:

    npm install
    npx expo start --tunnel

The app talks to the deployed server by default (`app.json` → `extra.apiUrl`).
Point it at a local backend by changing that value.

## Expo Go is for development, not for using the app

The QR code points at a dev server on your computer. Close the terminal and the
app stops working. That is what it is for.

A real installed app comes from EAS, which compiles on Expo's machines — which
is how an iOS build is possible from Windows at all:

    npx eas build --platform android --profile preview

That produces an **APK** you download once and install by tapping it. It works
with the computer off, forever, and costs nothing.

**iOS cannot be installed without an Apple Developer account** ($99/year).
Apple does not permit it — no configuration here changes that. Until then,
Expo Go and the QR code are the only way onto an iPhone.

## Tests

    npm test           # the SSE parser, 13 cases

Only the pure logic is tested here. Anything importing `react-native` needs a
simulator, so it is tested by running the app.

## The thing that made this non-trivial

React Native's `fetch` has no streaming response body — no
`response.body.getReader()`. The web app's entire streaming path depends on it.
`src/lib/sse.ts` uses `XMLHttpRequest` instead, which fires repeatedly while the
body arrives, and parses the SSE wire format by hand. That file is the reason
answers appear word by word instead of all at once after a long silence.

## Before the stores

- **Sign-in** needs a SHA-1 fingerprint on Android and a URL scheme on iOS, plus
  the bundle IDs added to Firebase → Authentication → Authorized domains.
- **Subscriptions sold in-app must use Apple's and Google's billing**, which
  takes 30%. Linking out to the web checkout breaks Apple's rules. Decide this
  before building a paywall: in-app purchase, or sign-up on the web only.
- **AI apps get reviewed for user-generated content.** An in-app report action,
  a block path and a visible content policy are the usual conditions. This is
  the most common reason a first submission is rejected.
