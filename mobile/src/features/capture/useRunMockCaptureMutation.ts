import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/api/hooks';
import { RunMockCaptureInput, runMockCapture } from './capture-flow';

export function useRunMockCaptureMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RunMockCaptureInput) => runMockCapture(input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.recordings });
      void queryClient.invalidateQueries({ queryKey: queryKeys.memoryEvents });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.actions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reminders });
    },
  });
}

