export interface RecordingSession {
  id: string;
  startedAt: string;
  stoppedAt?: string;
  localUri?: string;
  durationMs?: number;
}

export interface AudioRecorder {
  start(): Promise<RecordingSession>;
  stop(sessionId: string): Promise<RecordingSession>;
}
