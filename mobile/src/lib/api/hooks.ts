import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateReminderDto,
  UpdateActionItemDto,
  UpdateInsightDto,
  UpdateMemoryEventDto,
  UpdatePrivacySettingsDto,
  UpdateReminderDto,
} from '@voxa/shared';
import { voxaApi } from './voxa-api';

export const queryKeys = {
  me: ['me'] as const,
  privacySettings: ['settings', 'privacy'] as const,
  devices: ['devices'] as const,
  recordings: ['recordings'] as const,
  memoryEvents: ['memory-events'] as const,
  memoryThreads: ['memory-threads'] as const,
  entities: ['entities'] as const,
  entity: (id: string) => ['entity', id] as const,
  entityMemories: (id: string) => ['entity-memories', id] as const,
  entityRelations: (id: string) => ['entity-relations', id] as const,
  relatedEntities: (id: string) => ['related-entities', id] as const,
  inbox: ['inbox'] as const,
  notes: ['notes'] as const,
  actions: ['actions'] as const,
  reminders: ['reminders'] as const,
  insights: ['insights'] as const,
  timeline: ['timeline'] as const,
  memoryHistory: (from: string, to: string) => ['memory-history', from, to] as const,
  recordingResult: (id: string) => ['recording-result', id] as const,
  todayDigest: (date: string) => ['today-digest', date] as const,
  dailySummary: (date: string) => ['daily-summary', date] as const,
  search: (query: string) => ['search', query] as const,
};

export function useMeQuery() {
  return useQuery({ queryKey: queryKeys.me, queryFn: () => voxaApi.getMe() });
}

export function usePrivacySettingsQuery() {
  return useQuery({
    queryKey: queryKeys.privacySettings,
    queryFn: () => voxaApi.getPrivacySettings(),
  });
}

export function useUpdatePrivacySettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdatePrivacySettingsDto) => voxaApi.updatePrivacySettings(dto),
    onSuccess(data) {
      void queryClient.setQueryData(queryKeys.privacySettings, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.privacySettings });
    },
  });
}

export function useDevicesQuery() {
  return useQuery({ queryKey: queryKeys.devices, queryFn: () => voxaApi.listDevices() });
}

export function usePairDeviceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voxaApi.pairDevice,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices });
    },
  });
}

export function useUnpairDeviceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => voxaApi.unpairDevice(deviceId),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices });
    },
  });
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

export function useMemoryHistoryQuery(params: { from: string; to: string; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.memoryHistory(params.from, params.to),
    queryFn: () => voxaApi.getMemoryHistory(params),
  });
}

export function useRecordingResultQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.recordingResult(id ?? ''),
    queryFn: () => voxaApi.getRecordingResult(id ?? ''),
    enabled: Boolean(id),
    refetchInterval(query) {
      const status = getStringValueFromUnknown(query.state.data, 'status');
      return status && status !== 'saved' && status !== 'failed' ? 2500 : false;
    },
  });
}

export function useTodayDigestQuery(date: string) {
  return useQuery({
    queryKey: queryKeys.todayDigest(date),
    queryFn: () => voxaApi.getTodayDigest(date),
  });
}

export function useGenerateTodayDigestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { date: string; regenerate?: boolean }) => voxaApi.generateTodayDigest(dto),
    onSuccess(data, variables) {
      void queryClient.setQueryData(queryKeys.todayDigest(variables.date), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.todayDigest(variables.date) });
    },
  });
}

export function useNotesQuery() {
  return useQuery({ queryKey: queryKeys.notes, queryFn: () => voxaApi.listNotes() });
}

export function useMemoryThreadsQuery() {
  return useQuery({ queryKey: queryKeys.memoryThreads, queryFn: () => voxaApi.listMemoryThreads() });
}

export function useEntitiesQuery() {
  return useQuery({ queryKey: queryKeys.entities, queryFn: () => voxaApi.listEntities() });
}

export function useEntityQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.entity(id ?? ''),
    queryFn: () => voxaApi.getEntity(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useEntityMemoriesQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.entityMemories(id ?? ''),
    queryFn: () => voxaApi.getEntityMemories(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useEntityRelationsQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.entityRelations(id ?? ''),
    queryFn: () => voxaApi.getEntityRelations(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useRelatedEntitiesQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.relatedEntities(id ?? ''),
    queryFn: () => voxaApi.getRelatedEntities(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useInboxQuery() {
  return useQuery({ queryKey: queryKeys.inbox, queryFn: () => voxaApi.getInbox() });
}

export function useGenerateInboxSuggestionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => voxaApi.generateInboxSuggestions(),
    onSuccess(data) {
      void queryClient.setQueryData(queryKeys.inbox, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
    },
  });
}

export function useSuggestionActionMutation(action: 'accept' | 'dismiss' | 'done') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (action === 'accept') return voxaApi.acceptSuggestion(id);
      if (action === 'dismiss') return voxaApi.dismissSuggestion(id);
      return voxaApi.doneSuggestion(id);
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
    },
  });
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

export function useAskMutation() {
  return useMutation({
    mutationFn: (question: string) => voxaApi.ask(question),
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
      void queryClient.invalidateQueries({ queryKey: ['memory-history'] });
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
      void queryClient.invalidateQueries({ queryKey: ['memory-history'] });
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
      void queryClient.invalidateQueries({ queryKey: ['memory-history'] });
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
      void queryClient.invalidateQueries({ queryKey: ['memory-history'] });
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
      void queryClient.invalidateQueries({ queryKey: ['memory-history'] });
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
      void queryClient.invalidateQueries({ queryKey: ['memory-history'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.memoryEvents });
      void queryClient.invalidateQueries({ queryKey: queryKeys.memoryThreads });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recordings });
    },
  });
}

export function useDeleteRecordingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordingId: string) => voxaApi.deleteRecording(recordingId),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline });
      void queryClient.invalidateQueries({ queryKey: ['memory-history'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recordings });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes });
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
      void queryClient.invalidateQueries({ queryKey: ['memory-history'] });
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

function getStringValueFromUnknown(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return getStringValue(value, key);
}
