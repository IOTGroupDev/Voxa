import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateReminderDto,
  UpdateActionItemDto,
  UpdateInsightDto,
  UpdateMemoryEventDto,
  UpdateReminderDto,
} from '@voxa/shared';
import { voxaApi } from './voxa-api';

export const queryKeys = {
  me: ['me'] as const,
  devices: ['devices'] as const,
  recordings: ['recordings'] as const,
  memoryEvents: ['memory-events'] as const,
  memoryThreads: ['memory-threads'] as const,
  notes: ['notes'] as const,
  actions: ['actions'] as const,
  reminders: ['reminders'] as const,
  insights: ['insights'] as const,
  timeline: ['timeline'] as const,
  dailySummary: (date: string) => ['daily-summary', date] as const,
  search: (query: string) => ['search', query] as const,
};

export function useMeQuery() {
  return useQuery({ queryKey: queryKeys.me, queryFn: () => voxaApi.getMe() });
}

export function useDevicesQuery() {
  return useQuery({ queryKey: queryKeys.devices, queryFn: () => voxaApi.listDevices() });
}

export function useTimelineQuery() {
  return useQuery({
    queryKey: queryKeys.timeline,
    queryFn: () => voxaApi.getTimeline(),
    refetchInterval(query) {
      return hasActiveTimelineProcessing(query.state.data) ? 5000 : false;
    },
  });
}

export function useNotesQuery() {
  return useQuery({ queryKey: queryKeys.notes, queryFn: () => voxaApi.listNotes() });
}

export function useMemoryThreadsQuery() {
  return useQuery({ queryKey: queryKeys.memoryThreads, queryFn: () => voxaApi.listMemoryThreads() });
}

export function useActionsQuery() {
  return useQuery({ queryKey: queryKeys.actions, queryFn: () => voxaApi.listActions() });
}

export function useRemindersQuery() {
  return useQuery({ queryKey: queryKeys.reminders, queryFn: () => voxaApi.listReminders() });
}

export function useInsightsQuery() {
  return useQuery({ queryKey: queryKeys.insights, queryFn: () => voxaApi.listInsights() });
}

export function useSearchQuery(query: string) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => voxaApi.search(query),
    enabled: query.trim().length > 0,
  });
}

export function useUpdateMemoryEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMemoryEventDto }) =>
      voxaApi.updateMemoryEvent(id, dto),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memoryEvents });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline });
    },
  });
}

export function useUpdateActionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateActionItemDto }) => voxaApi.updateAction(id, dto),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.actions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline });
    },
  });
}

export function useCreateReminderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateReminderDto) => voxaApi.createReminder(dto),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reminders });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline });
    },
  });
}

export function useUpdateReminderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateReminderDto }) =>
      voxaApi.updateReminder(id, dto),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reminders });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline });
    },
  });
}

export function useUpdateInsightMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateInsightDto }) => voxaApi.updateInsight(id, dto),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.insights });
      void queryClient.invalidateQueries({ queryKey: queryKeys.memoryThreads });
    },
  });
}

export function useReprocessEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => voxaApi.reprocessEvent(eventId),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline });
      void queryClient.invalidateQueries({ queryKey: queryKeys.memoryThreads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.insights });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes });
    },
  });
}

export function useDeleteTimelineItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => voxaApi.deleteMemoryEvent(eventId),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline });
      void queryClient.invalidateQueries({ queryKey: queryKeys.memoryEvents });
      void queryClient.invalidateQueries({ queryKey: queryKeys.memoryThreads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recordings });
    },
  });
}

export function useReprocessRecordingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordingId: string) => voxaApi.reprocessRecording(recordingId),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.recordings });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline });
      void queryClient.invalidateQueries({ queryKey: queryKeys.memoryThreads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.insights });
    },
  });
}

function hasActiveTimelineProcessing(data: unknown) {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.some((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const processingStatus = getStringValue(item, 'processingStatus');
    const recording = getObjectValue(item, 'recording');
    const aiJobs = getArrayValue(item, 'aiJobs');
    const recordingStatus = recording ? getStringValue(recording, 'status') : undefined;
    const dongleSyncStatus = recording ? getStringValue(recording, 'dongleSyncStatus') : undefined;
    const hasRunningAiJob = aiJobs.some((job) => {
      if (!job || typeof job !== 'object') {
        return false;
      }

      const status = getStringValue(job, 'status');
      return status === 'pending' || status === 'processing' || status === 'retrying';
    });

    return (
      hasRunningAiJob ||
      processingStatus === 'created' ||
      processingStatus === 'transcription_retrying' ||
      processingStatus === 'transcript_created' ||
      processingStatus === 'summary_created' ||
      recordingStatus === 'uploading' ||
      recordingStatus === 'uploaded' ||
      recordingStatus === 'processing' ||
      dongleSyncStatus === 'metadata_synced' ||
      dongleSyncStatus === 'transfer_in_progress' ||
      dongleSyncStatus === 'transferred_to_phone' ||
      dongleSyncStatus === 'uploaded_to_backend'
    );
  });
}

function getArrayValue(value: object, key: string): unknown[] {
  const result = (value as Record<string, unknown>)[key];
  return Array.isArray(result) ? result : [];
}

function getObjectValue(value: object, key: string): Record<string, unknown> | undefined {
  const result = (value as Record<string, unknown>)[key];
  return result && typeof result === 'object' ? (result as Record<string, unknown>) : undefined;
}

function getStringValue(value: object, key: string): string | undefined {
  const result = (value as Record<string, unknown>)[key];
  return typeof result === 'string' ? result : undefined;
}
