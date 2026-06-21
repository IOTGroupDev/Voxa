import {
  CompleteCaptureSessionDto,
  CreateCaptureSessionDto,
  CreateRecordingDto,
  CreateReminderDto,
  PrivacySettingsResponse,
  PairDeviceDto,
  StartDeviceCaptureDto,
  RegisterDongleRecordingMetadataDto,
  UpdateDeviceStatusDto,
  UpdateDongleRecordingSyncStatusDto,
  UpdateActionItemDto,
  UpdateInsightDto,
  UpdateMemoryEventDto,
  UpdatePrivacySettingsDto,
  UpdateRecordingStatusDto,
  UpdateReminderDto,
  RecordingResult,
  DailyDigest,
  MemoryHistoryResponse,
  Entity,
  EntityDetail,
  EntityMention,
  EntityRelation,
  AiSuggestion,
  InboxPayload,
  RelatedEntity,
} from '@voxa/shared';
import { apiClient } from './default-client';

export interface AskSource {
  id: string;
  type: 'note' | 'transcript' | 'memory_event' | 'task' | 'reminder';
  title?: string;
  snippet: string;
  createdAt: string;
}

export interface AskResponse {
  answer: string;
  sources: AskSource[];
}

export type ExportFormat = 'text' | 'markdown';

export interface ExportResponse {
  format: ExportFormat;
  content: string;
}

export interface TtsResponse {
  audioBase64: string;
  mimeType: string;
  provider: string;
  language?: string;
}

export const voxaApi = {
  getMe() {
    return apiClient.request('/users/me');
  },

  getPrivacySettings() {
    return apiClient.request<PrivacySettingsResponse>('/settings/privacy');
  },

  updatePrivacySettings(dto: UpdatePrivacySettingsDto) {
    return apiClient.request<PrivacySettingsResponse>('/settings/privacy', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  pairDevice(dto: PairDeviceDto) {
    return apiClient.request('/devices/pair', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  listDevices() {
    return apiClient.request('/devices');
  },

  updateDeviceStatus(deviceId: string, dto: UpdateDeviceStatusDto) {
    return apiClient.request(`/devices/${deviceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  unpairDevice(deviceId: string) {
    return apiClient.request(`/devices/${deviceId}/unpair`, {
      method: 'POST',
    });
  },

  getDeviceStatus(deviceId: string) {
    return apiClient.request(`/devices/${deviceId}/status`);
  },

  startDeviceCapture(deviceId: string, dto: StartDeviceCaptureDto) {
    return apiClient.request(`/devices/${deviceId}/capture`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  createCaptureSession(dto: CreateCaptureSessionDto) {
    return apiClient.request<{ id: string }>('/capture/session', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  completeCaptureSession(sessionId: string, dto: CompleteCaptureSessionDto) {
    return apiClient.request(`/capture/session/${sessionId}/complete`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  cancelCaptureSession(sessionId: string) {
    return apiClient.request(`/capture/session/${sessionId}/cancel`, {
      method: 'PATCH',
    });
  },

  createRecording(dto: CreateRecordingDto) {
    return apiClient.request<{ id: string }>('/recordings', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  createRecordingUploadUrl(recordingId: string) {
    return apiClient.request<{ bucket: string; path: string; signedUrl: string; token?: string }>(
      `/recordings/${recordingId}/upload-url`,
      { method: 'POST' },
    );
  },

  updateRecordingStatus(recordingId: string, dto: UpdateRecordingStatusDto) {
    return apiClient.request(`/recordings/${recordingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  registerDongleRecordingMetadata(dto: RegisterDongleRecordingMetadataDto) {
    return apiClient.request('/recordings/dongle/metadata', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  updateDongleRecordingSyncStatus(dto: UpdateDongleRecordingSyncStatusDto) {
    return apiClient.request('/recordings/dongle/status', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  listDongleRecordings(deviceId: string) {
    return apiClient.request(`/recordings/dongle/${encodeURIComponent(deviceId)}`);
  },

  listRecordings() {
    return apiClient.request('/recordings');
  },

  getRecordingResult(id: string) {
    return apiClient.request<RecordingResult>(`/recordings/${encodeURIComponent(id)}/result`);
  },

  deleteRecording(id: string) {
    return apiClient.request(`/recordings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  listMemoryEvents() {
    return apiClient.request('/memory-events');
  },

  listMemoryThreads() {
    return apiClient.request('/memory-threads');
  },

  listEntities() {
    return apiClient.request<Entity[]>('/entities');
  },

  getEntity(id: string) {
    return apiClient.request<EntityDetail>(`/entities/${encodeURIComponent(id)}`);
  },

  getEntityMemories(id: string) {
    return apiClient.request<EntityMention[]>(`/entities/${encodeURIComponent(id)}/memories`);
  },

  getEntityRelations(id: string) {
    return apiClient.request<EntityRelation[]>(`/entities/${encodeURIComponent(id)}/relations`);
  },

  getRelatedEntities(id: string) {
    return apiClient.request<RelatedEntity[]>(`/entities/${encodeURIComponent(id)}/related`);
  },

  getInbox() {
    return apiClient.request<InboxPayload>('/inbox');
  },

  generateInboxSuggestions() {
    return apiClient.request<InboxPayload>('/inbox/suggestions/generate', {
      method: 'POST',
    });
  },

  acceptSuggestion(id: string) {
    return apiClient.request<AiSuggestion>(`/inbox/suggestions/${encodeURIComponent(id)}/accept`, {
      method: 'POST',
    });
  },

  dismissSuggestion(id: string) {
    return apiClient.request<AiSuggestion>(`/inbox/suggestions/${encodeURIComponent(id)}/dismiss`, {
      method: 'POST',
    });
  },

  doneSuggestion(id: string) {
    return apiClient.request<AiSuggestion>(`/inbox/suggestions/${encodeURIComponent(id)}/done`, {
      method: 'POST',
    });
  },

  exportNote(id: string, format: ExportFormat) {
    return apiClient.request<ExportResponse>(`/export/note/${encodeURIComponent(id)}?format=${format}`);
  },

  exportTranscript(id: string, format: ExportFormat) {
    return apiClient.request<ExportResponse>(`/export/transcript/${encodeURIComponent(id)}?format=${format}`);
  },

  exportDaily(date: string, format: ExportFormat) {
    return apiClient.request<ExportResponse>(`/export/daily/${encodeURIComponent(date)}?format=${format}`);
  },

  exportEntity(id: string, format: ExportFormat) {
    return apiClient.request<ExportResponse>(`/export/entity/${encodeURIComponent(id)}?format=${format}`);
  },

  getMemoryThread(id: string) {
    return apiClient.request(`/memory-threads/${id}`);
  },

  updateMemoryEvent(id: string, dto: UpdateMemoryEventDto) {
    return apiClient.request(`/memory-events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  deleteMemoryEvent(id: string) {
    return apiClient.request(`/memory-events/${id}`, {
      method: 'DELETE',
    });
  },

  listNotes() {
    return apiClient.request('/notes');
  },

  listActions() {
    return apiClient.request('/actions');
  },

  updateAction(id: string, dto: UpdateActionItemDto) {
    return apiClient.request(`/actions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  listReminders() {
    return apiClient.request('/reminders');
  },

  listInsights() {
    return apiClient.request('/insights');
  },

  updateInsight(id: string, dto: UpdateInsightDto) {
    return apiClient.request(`/insights/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  createReminder(dto: CreateReminderDto) {
    return apiClient.request('/reminders', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  updateReminder(id: string, dto: UpdateReminderDto) {
    return apiClient.request(`/reminders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  getTimeline() {
    return apiClient.request('/timeline');
  },

  getMemoryHistory(params: { from: string; to: string; cursor?: string; limit?: number }) {
    const search = new URLSearchParams({
      from: params.from,
      to: params.to,
    });
    if (params.cursor) {
      search.set('cursor', params.cursor);
    }
    if (params.limit) {
      search.set('limit', String(params.limit));
    }

    return apiClient.request<MemoryHistoryResponse>(`/memory/history?${search.toString()}`);
  },

  getDailySummary(date: string) {
    return apiClient.request(`/daily-summary/${date}`);
  },

  getTodayDigest(date: string) {
    return apiClient.request<DailyDigest>(`/today/digest?date=${encodeURIComponent(date)}`);
  },

  generateTodayDigest(dto: { date: string; regenerate?: boolean }) {
    return apiClient.request<DailyDigest>('/today/digest/generate', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  search(query: string) {
    return apiClient.request(`/search?q=${encodeURIComponent(query)}`);
  },

  ask(question: string) {
    return apiClient.request<AskResponse>('/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  },

  transcribeAskAudio(dto: { audioBase64: string; mimeType?: string; durationMs?: number }) {
    return apiClient.request<{ text: string; language?: string }>('/ask/transcribe', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  synthesizeSpeech(dto: { text: string; language?: string; speaker?: number }) {
    return apiClient.request<TtsResponse>('/tts/synthesize', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  reprocessRecording(recordingId: string) {
    return apiClient.request(`/ai/reprocess/${recordingId}`, {
      method: 'POST',
    });
  },

  reprocessEvent(eventId: string) {
    return apiClient.request(`/ai/reprocess-event/${eventId}`, {
      method: 'POST',
    });
  },
};
