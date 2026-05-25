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

export class MockAudioRecorder implements AudioRecorder {
  private activeSession: RecordingSession | null = null;

  async start(): Promise<RecordingSession> {
    this.activeSession = {
      id: `mock-recording-${Date.now()}`,
      startedAt: new Date().toISOString(),
    };
    return this.activeSession;
  }

  async stop(sessionId: string): Promise<RecordingSession> {
    if (!this.activeSession || this.activeSession.id !== sessionId) {
      throw new Error('No active recording session found.');
    }

    this.activeSession = {
      ...this.activeSession,
      stoppedAt: new Date().toISOString(),
      localUri: `mock://recordings/${sessionId}.m4a`,
      durationMs: 5000,
    };

    return this.activeSession;
  }
}
