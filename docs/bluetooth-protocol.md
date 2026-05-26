# Bluetooth Protocol

MVP architecture separates audio and control:

- Audio: Bluetooth microphone/audio profile.
- Control: BLE custom service.

Do not design custom BLE audio streaming for MVP.

## Control Service

Service name: `MemoryDongleControlService`.

Characteristics:

- `device_status`
- `battery_level`
- `button_event`
- `recording_state`
- `firmware_version`
- `device_id`

Commands:

- `GET_STATUS`
- `GET_BATTERY`
- `SET_RECORDING_INDICATOR_ON`
- `SET_RECORDING_INDICATOR_OFF`
- `VIBRATE`
- `PING`

## Supported Dongle States

- `disconnected`
- `connecting`
- `connected`
- `recording`
- `low_battery`
- `error`

## Supported Button Events

- `SINGLE_PRESS`
- `DOUBLE_PRESS`
- `LONG_PRESS`
- `PRESS_AND_HOLD_START`
- `PRESS_AND_HOLD_END`

## MVP Behavior

Single press creates a quick memory capture. Double press creates a task/action-oriented capture. Long press marks an important memory. Press-and-hold records while held.

The dongle must visibly indicate active recording through LED or vibration behavior. No stealth recording is supported.

If the phone is unavailable, powered off, disconnected, or unable to start phone-side recording, the MVP dongle does not record audio by itself. It should indicate failure through LED/vibration behavior. See `docs/hardware-capture-constraints.md`.
