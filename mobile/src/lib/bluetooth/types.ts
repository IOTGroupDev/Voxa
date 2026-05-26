import { ButtonGesture, CaptureAvailabilityState, DongleConnectionState } from '@voxa/shared';

export type DongleButtonEventType =
  | ButtonGesture.SINGLE_PRESS
  | ButtonGesture.DOUBLE_PRESS
  | ButtonGesture.LONG_PRESS
  | 'press_and_hold_start'
  | 'press_and_hold_end';

export interface DongleConnection {
  id: string;
  name: string;
  state: DongleConnectionState;
  firmwareVersion?: string;
}

export interface DongleButtonEvent {
  type: DongleButtonEventType;
  deviceId: string;
  occurredAt: string;
}

export interface DongleBatteryStatus {
  levelPercent: number;
  isLow: boolean;
  updatedAt: string;
}

export interface DongleRecordingState {
  isRecording: boolean;
  indicatorActive: boolean;
  updatedAt: string;
}

export interface BluetoothAudioInput {
  getPreferredInputDevice(): Promise<string | null>;
  isBluetoothMicrophoneAvailable(): Promise<boolean>;
}

export interface DongleControlService {
  connect(deviceId: string): Promise<DongleConnection>;
  disconnect(): Promise<void>;
  getConnection(): DongleConnection | null;
  getCaptureAvailability(): Promise<CaptureAvailabilityState>;
  getBatteryStatus(): Promise<DongleBatteryStatus>;
  setRecordingIndicator(active: boolean): Promise<void>;
  vibrate(): Promise<void>;
  onButtonEvent(handler: (event: DongleButtonEvent) => void): () => void;
}
