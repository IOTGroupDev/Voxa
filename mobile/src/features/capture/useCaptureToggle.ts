import { useQueryClient } from '@tanstack/react-query';
import { ButtonGesture, CaptureSource } from '@voxa/shared';
import { queryKeys } from '@/lib/api/hooks';
import { speakVoiceFeedback } from '@/lib/voice/voice-feedback';
import { useCaptureStore } from '@/state/capture.store';
import { useLanguageStore } from '@/state/language.store';
import { startRealAudioCapture, stopLocalRecording, syncCompletedCapture } from './capture-flow';

interface CaptureToggleOptions {
  buttonGesture?: ButtonGesture;
  deviceId?: string;
}

export interface CaptureToggleResult {
  changed: boolean;
  phase?: 'started' | 'stopped';
  recordingId?: string;
  captureSessionId?: string;
}

export function useCaptureToggle() {
  const queryClient = useQueryClient();
  const activeCapture = useCaptureStore((state) => state.activeCapture);
  const isLoading = useCaptureStore((state) => state.isLoading);
  const isRecording = useCaptureStore((state) => state.isRecording);
  const setActiveCapture = useCaptureStore((state) => state.setActiveCapture);
  const setIsLoading = useCaptureStore((state) => state.setIsLoading);
  const setIsRecording = useCaptureStore((state) => state.setIsRecording);
  const setStatus = useCaptureStore((state) => state.setStatus);
  const language = useLanguageStore((state) => state.language);

  async function startCapture(
    source = CaptureSource.MOBILE_APP,
    options: CaptureToggleOptions = {},
  ): Promise<CaptureToggleResult> {
    if (isLoading || isRecording) return { changed: false };

    setIsLoading(true);
    try {
      const nextActiveCapture = await startRealAudioCapture({
        source,
        buttonGesture: options.buttonGesture,
        deviceId: options.deviceId,
      });
      setActiveCapture(nextActiveCapture);
      setIsRecording(true);
      setStatus(source === CaptureSource.AIRPODS_SHORTCUT ? 'Recording from AirPods shortcut' : 'Recording');
      void speakVoiceFeedback('recordingStarted', language);
      return { changed: true, phase: 'started' };
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not start recording');
      void speakVoiceFeedback('recordingStartFailed', language);
      return { changed: false };
    } finally {
      setIsLoading(false);
    }
  }

  async function stopCapture(
    source = CaptureSource.MOBILE_APP,
    options: CaptureToggleOptions = {},
  ): Promise<CaptureToggleResult> {
    if (isLoading) return { changed: false };

    if (!activeCapture) {
      setStatus('No recording is active');
      setIsRecording(false);
      return { changed: false };
    }

    setIsLoading(true);
    try {
      const completedRecordingSession = await stopLocalRecording(activeCapture);
      setActiveCapture(null);
      setIsRecording(false);
      setStatus('Recording stopped. Saving...');
      void speakVoiceFeedback('recordingStopped', language);

      const result = await syncCompletedCapture(activeCapture, completedRecordingSession, {
        source,
        buttonGesture: options.buttonGesture ?? activeCapture.captureSessionDto.buttonGesture,
        deviceId: options.deviceId ?? activeCapture.captureSessionDto.deviceId,
      });
      setStatus(result.synced ? 'Saved and sent for processing' : 'Saved on this phone. Sync will retry');
      void speakVoiceFeedback(result.synced ? 'recordingSynced' : 'recordingSavedLocally', language);
      await refreshMemoryLists(queryClient);
      const syncedResult = result as {
        recording?: { id: string };
        captureSession?: { id: string };
      };
      const recordingId = result.synced ? syncedResult.recording?.id : undefined;
      const captureSessionId = result.synced ? syncedResult.captureSession?.id : undefined;
      return {
        changed: true,
        phase: 'stopped',
        recordingId,
        captureSessionId,
      };
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not stop recording');
      void speakVoiceFeedback('recordingStopFailed', language);
      return { changed: false };
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleCapture(
    source = CaptureSource.MOBILE_APP,
    options: CaptureToggleOptions = {},
  ): Promise<CaptureToggleResult> {
    return isRecording ? stopCapture(source, options) : startCapture(source, options);
  }

  return {
    isLoading,
    isRecording,
    startCapture,
    stopCapture,
    toggleCapture,
  };
}

async function refreshMemoryLists(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.timeline }),
    queryClient.invalidateQueries({ queryKey: ['memory-history'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.recordings }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notes }),
  ]);
}
