import {
  AudioModule,
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { AudioRecorder, RecordingSession } from './recording-session';

type NativeRecorder = InstanceType<typeof AudioModule.AudioRecorder>;

export class ExpoAudioRecorder implements AudioRecorder {
  private activeSession: RecordingSession | null = null;
  private activeRecorder: NativeRecorder | null = null;
  private startedAtMs = 0;

  async start(): Promise<RecordingSession> {
    await this.ensurePermission();
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await recorder.prepareToRecordAsync();
    recorder.record();

    this.startedAtMs = Date.now();
    this.activeRecorder = recorder;
    this.activeSession = {
      id: `audio-recording-${this.startedAtMs}`,
      startedAt: new Date(this.startedAtMs).toISOString(),
    };

    return this.activeSession;
  }

  async stop(sessionId: string): Promise<RecordingSession> {
    if (!this.activeSession || this.activeSession.id !== sessionId || !this.activeRecorder) {
      throw new Error('No active recording session found.');
    }

    const stoppedAtMs = Date.now();
    await this.activeRecorder.stop();
    await setAudioModeAsync({ allowsRecording: false });

    const completedSession: RecordingSession = {
      ...this.activeSession,
      stoppedAt: new Date(stoppedAtMs).toISOString(),
      localUri: this.activeRecorder.uri ?? undefined,
      durationMs: Math.max(0, Math.round((this.activeRecorder.currentTime || (stoppedAtMs - this.startedAtMs) / 1000) * 1000)),
    };

    this.activeSession = null;
    this.activeRecorder = null;
    this.startedAtMs = 0;

    return completedSession;
  }

  private async ensurePermission() {
    const existingPermission = await getRecordingPermissionsAsync();
    if (existingPermission.granted) {
      return;
    }

    const requestedPermission = await requestRecordingPermissionsAsync();
    if (!requestedPermission.granted) {
      throw new Error('Microphone permission is required to capture audio.');
    }
  }
}
