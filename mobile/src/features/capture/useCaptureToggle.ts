import { useQueryClient } from '@tanstack/react-query';
import { CaptureSource } from '@voxa/shared';
import { queryKeys } from '@/lib/api/hooks';
import { useCaptureStore } from '@/state/capture.store';
import { startRealAudioCapture, stopLocalRecording, syncCompletedCapture } from './capture-flow';

export function useCaptureToggle() {
  const queryClient = useQueryClient();
  const activeCapture = useCaptureStore((state) => state.activeCapture);
  const isLoading = useCaptureStore((state) => state.isLoading);
  const isRecording = useCaptureStore((state) => state.isRecording);
  const setActiveCapture = useCaptureStore((state) => state.setActiveCapture);
  const setIsLoading = useCaptureStore((state) => state.setIsLoading);
  const setIsRecording = useCaptureStore((state) => state.setIsRecording);
  const setStatus = useCaptureStore((state) => state.setStatus);

  async function startCapture(source = CaptureSource.MOBILE_APP) {
    if (isLoading || isRecording) return false;

    setIsLoading(true);
    try {
      const nextActiveCapture = await startRealAudioCapture({ source });
      setActiveCapture(nextActiveCapture);
      setIsRecording(true);
      setStatus(source === CaptureSource.AIRPODS_SHORTCUT ? 'Recording via Siri shortcut' : 'Recording');
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not start recording');
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function stopCapture(source = CaptureSource.MOBILE_APP) {
    if (isLoading) return false;

    if (!activeCapture) {
      setStatus('No active recording');
      setIsRecording(false);
      return false;
    }

    setIsLoading(true);
    try {
      const completedRecordingSession = await stopLocalRecording(activeCapture);
      setActiveCapture(null);
      setIsRecording(false);
      setStatus('Recording stopped; syncing');

      const result = await syncCompletedCapture(activeCapture, completedRecordingSession, { source });
      setStatus(result.synced ? 'Recorded and synced' : 'Recorded locally; sync will retry');
      await refreshMemoryLists(queryClient);
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not stop recording');
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleCapture(source = CaptureSource.MOBILE_APP) {
    return isRecording ? stopCapture(source) : startCapture(source);
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
    queryClient.invalidateQueries({ queryKey: queryKeys.recordings }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notes }),
  ]);
}
