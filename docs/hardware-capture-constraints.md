# Hardware Capture Constraints

Voxa MVP records through the phone. The dongle is a Bluetooth microphone and BLE control device, not an independent recorder.

## MVP Rule

Button press only starts a real recording when the phone app can receive the control event and start or continue phone-side audio capture.

If the phone is powered off, the current phone-recording MVP cannot record audio. The dongle should indicate failure through LED/vibration behavior, and the app may later show a missed capture marker if that signal is available. It must not create a fake MemoryEvent with no audio.

Future autonomous dongle storage mode is documented separately in `docs/dongle-storage.md`. That mode requires onboard flash, append-only recording storage, chunk transfer, encryption, and later sync.

## Locked And Background States

Locked phone is not the same as powered-off phone.

- If recording is already active, the app should continue recording with the required platform audio session, foreground service, permissions, and visible recording indication.
- Starting a new recording from a dongle button while the phone is locked, backgrounded, or the app process is suspended is platform-limited and must be treated as best effort.
- The product must not promise stealth, hidden, or guaranteed background capture.

## Capture Availability States

- `ready`: app is reachable, permissions are valid, and phone-side recording can start.
- `phone_locked_ready`: app is prepared for capture while locked according to platform rules.
- `phone_background_limited`: app may receive the event, but starting recording is not guaranteed.
- `phone_unavailable`: phone is off, disconnected, app process is unavailable, or required permissions are missing.

## Button Behavior

- `ready` or `phone_locked_ready`: start capture.
- `phone_background_limited`: attempt capture, then give clear success/failure feedback.
- `phone_unavailable`: do not create an audio recording; use dongle LED/vibration failure feedback.

## Future Hardware Option

Guaranteed capture while the phone is off requires a different dongle design:

- local flash storage;
- onboard audio recording;
- timestamp source;
- battery-aware write safety;
- recording privacy indicator;
- later encrypted sync to phone;
- conflict and duplicate handling.

That future path is out of the phone-recording MVP. `docs/dongle-storage.md` defines architecture-only preparation for that later hardware mode.
