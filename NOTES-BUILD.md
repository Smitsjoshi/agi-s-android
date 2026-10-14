# Why the build is configured the way it is

Each failed build costs fifteen minutes of waiting, so the settings here are
chosen to make the FIRST one succeed rather than to be ideal.

## `newArchEnabled: false`

React Native's New Architecture is the future and is not the safest choice for
a first build. Every native dependency has to support it, and the ones that do
not fail during the Gradle build with errors that point at generated C++ rather
than at the library causing them.

Nothing in this app needs it: there is no native module of our own, no heavy
animation work, no native view we wrote. Turning it on later is one line, at a
moment when a failed build is an inconvenience rather than a blocker.

## No `cache: npm` in the workflow

`actions/setup-node` with `cache: npm` **requires** a lockfile and fails the job
outright without one. The first run died in eight seconds for exactly this
reason, before a single dependency was downloaded.

There is no committed lockfile because resolving the React Native dependency
tree is slow and was unreliable to generate here. The install step handles its
absence (`npm ci || npm install --legacy-peer-deps`), so the only cost is about
a minute of download per build.

If you want the cache back: run `npm install` in `mobile/`, commit the
`package-lock.json` it writes, and restore `cache: npm`.

## `--legacy-peer-deps` on the fallback install

Expo pins a set of versions it has tested together. Individual packages
sometimes declare peer ranges that those pins do not satisfy, and npm treats
that as fatal. Expo's own tooling ignores it, so matching that behaviour is
correct rather than a workaround.

## `assembleRelease`, signed with the debug key

This started as `assembleDebug`, to avoid managing a keystore. That was wrong,
and the way it was wrong is worth recording: **a debug build does not contain
the JavaScript.** It expects to download it from a Metro dev server on the
developer's machine, so the APK installed fine, opened, and showed a red screen
reading "Could not connect to development server … localhost:8081". The build
had succeeded; the output was simply not a usable app.

`assembleRelease` runs the bundler and embeds the JS, so the APK is
self-contained.

The keystore question has a better answer than avoiding release builds: the
React Native template already points the release build type at
`signingConfigs.debug`. The debug key is universal and fixed, so every build
signs identically and installs over the last — which is what Android requires
for an update. No secret to create, store or lose.

Google Play will not accept a debug-signed APK. That is correct: a Play release
should be signed with a key only you hold. It is a decision for the day a Play
listing exists, not a reason to ship a build that cannot run.

The workflow now verifies both properties before publishing — that the APK is
signed, and that `assets/index.android.bundle` is inside it. Both failures are
silent at build time and obvious only after somebody has downloaded it.

## Kotlin pinned to 1.9.25

`expo-modules-core` 2.2.3 bundles Compose Compiler 1.5.15, which refuses to run
against anything except Kotlin 1.9.25. The Expo SDK 52 template pins 1.9.24.
One patch version apart, and the build dies four minutes in at
`:expo-modules-core:compileDebugKotlin` with a message about Kotlin that says
nothing about where the version came from.

Set two ways on purpose:

  - `expo-build-properties` in app.json, which is the supported mechanism and
    applies during prebuild. Anything written into `android/` by hand is erased
    by the next prebuild, so this is the only edit that survives.

  - a Gradle property in the workflow, as a check that the first one worked.
    The template reads `findProperty('android.kotlinVersion')`, so setting the
    property is the template's own escape hatch rather than a patch to it.

If a future Expo version fixes the mismatch, both can go. Until then, removing
either leaves a build that fails after four minutes for a reason that is not
obvious from the error.
