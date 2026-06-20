# Voxa Siri Shortcut

Voxa registers an iOS App Intent for quick capture:

- Russian phrase: `Запиши в Voxa`
- English fallback: `Record in Voxa`
- Deep link: `voxa://capture?autostart=true`

The native intent only opens Voxa with the deep link. Recording remains in React Native and uses the same capture flow as the main record button.

## Requirements

This does not work in Expo Go because iOS App Intents require native iOS code.

Use a custom dev client or EAS build:

```bash
cd mobile
npx expo prebuild --platform ios
npx expo run:ios
```

or create an EAS iOS build.

The Expo config plugin `plugins/withVoxaSiriShortcut.js` generates:

```text
ios/Voxa/StartVoxaCaptureIntent.swift
```

## Test

1. Install an iOS custom dev client or EAS build.
2. Open the Shortcuts app.
3. Search for `Запиши в Voxa`.
4. Run it or say: `Привет, Siri, запиши в Voxa`.
5. Confirm Voxa opens and starts recording automatically.

If microphone permission is missing, iOS will show the permission request from the existing recording flow. If recording cannot start, Voxa shows the capture error state in the app.
