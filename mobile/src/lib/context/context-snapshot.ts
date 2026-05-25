import { CaptureSource, ContextSnapshot } from '@voxa/shared';

export function createContextSnapshot(source: CaptureSource): ContextSnapshot {
  return {
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    captureSource: source,
    appState: {
      screen: 'capture',
    },
  };
}

