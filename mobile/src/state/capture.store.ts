import { create } from 'zustand';
import { CaptureSource } from '@voxa/shared';
import type { ActiveCapture } from '../features/capture/capture-flow';
import { appConfig } from '../app/config';

export type CaptureStartMode = 'phone' | 'airpods_shortcut' | 'dongle';

type CaptureModeOption = {
  mode: CaptureStartMode;
  title: string;
  subtitle: string;
};

const allCaptureModes: CaptureModeOption[] = [
  {
    mode: 'phone',
    title: 'Phone button',
    subtitle: 'Tap the main capture button to record from this device.',
  },
  {
    mode: 'airpods_shortcut',
    title: 'AirPods + Siri',
    subtitle: 'Use the voice shortcut source for hands-free capture.',
  },
  {
    mode: 'dongle',
    title: 'Voxa dongle',
    subtitle: 'Use the hardware button and Bluetooth microphone path.',
  },
];

export const captureModes = allCaptureModes.filter((item) => appConfig.enableDongleMode || item.mode !== 'dongle');

interface CaptureState {
  activeSessionId: string | null;
  activeCapture: ActiveCapture | null;
  selectedMode: CaptureStartMode;
  status: string;
  isLoading: boolean;
  isRecording: boolean;
  pendingAutostartCapture: boolean;
  setActiveSessionId: (sessionId: string | null) => void;
  setActiveCapture: (activeCapture: ActiveCapture | null) => void;
  setSelectedMode: (mode: CaptureStartMode) => void;
  setStatus: (status: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsRecording: (isRecording: boolean) => void;
  requestAutostartCapture: () => void;
  consumeAutostartCapture: () => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  activeSessionId: null,
  activeCapture: null,
  selectedMode: 'phone',
  status: 'Ready for a quiet capture',
  isLoading: false,
  isRecording: false,
  pendingAutostartCapture: false,
  setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),
  setActiveCapture: (activeCapture) => set({ activeCapture }),
  setSelectedMode: (selectedMode) => set({ selectedMode }),
  setStatus: (status) => set({ status }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsRecording: (isRecording) => set({ isRecording }),
  requestAutostartCapture: () => set({ pendingAutostartCapture: true }),
  consumeAutostartCapture: () => set({ pendingAutostartCapture: false }),
}));

export function getCaptureSource(mode: CaptureStartMode): CaptureSource {
  switch (mode) {
    case 'airpods_shortcut':
      return CaptureSource.AIRPODS_SHORTCUT;
    case 'dongle':
      return CaptureSource.DONGLE;
    case 'phone':
    default:
      return CaptureSource.MOBILE_APP;
  }
}
