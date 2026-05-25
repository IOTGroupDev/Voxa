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

export function useTimelineQuery() {
  return useQuery({ queryKey: queryKeys.timeline, queryFn: () => voxaApi.getTimeline() });
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
