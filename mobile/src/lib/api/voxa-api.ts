import {
  CompleteCaptureSessionDto,
  CreateCaptureSessionDto,
  CreateRecordingDto,
  CreateReminderDto,
  PairDeviceDto,
  RegisterDongleRecordingMetadataDto,
  UpdateDeviceStatusDto,
  UpdateDongleRecordingSyncStatusDto,
  UpdateActionItemDto,
  UpdateInsightDto,
  UpdateMemoryEventDto,
  UpdateRecordingStatusDto,
  UpdateReminderDto,
} from '@voxa/shared';
import { apiClient } from './default-client';

export const voxaApi = {
  getMe() {
    return apiClient.request('/users/me');
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

  listMemoryEvents() {
    return apiClient.request('/memory-events');
  },

  listMemoryThreads() {
    return apiClient.request('/memory-threads');
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

  getDailySummary(date: string) {
    return apiClient.request(`/daily-summary/${date}`);
  },

  search(query: string) {
    return apiClient.request(`/search?q=${encodeURIComponent(query)}`);
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
