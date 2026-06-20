import {
  ButtonGesture,
  CaptureSource,
  CreateCaptureSessionDto,
  RecordingStatus,
} from '@voxa/shared';
import { ExpoAudioRecorder } from '@/lib/audio/expo-audio-recorder';
import { AudioRecorder, RecordingSession } from '@/lib/audio/recording-session';
import { createContextSnapshot } from '@/lib/context/context-snapshot';
import { voxaApi } from '@/lib/api/voxa-api';
import { uploadAudioFileToSignedUrl } from '@/lib/storage/audio-file-upload';
import { localUploadQueue, sqliteMemoryStore } from '@/lib/storage/singletons';

export interface RunCaptureInput {
  source: CaptureSource;
  buttonGesture?: ButtonGesture;
  deviceId?: string;
}

export interface ActiveCapture {
  audioRecorder: AudioRecorder;
  captureSessionDto: CreateCaptureSessionDto;
  recordingSession: RecordingSession;
}

export function createPreferredAudioRecorder(): AudioRecorder {
  return new ExpoAudioRecorder();
}

export async function startRealAudioCapture(input: RunCaptureInput) {
  return startLocalCapture(input, createPreferredAudioRecorder());
}

export async function completeLocalCapture(activeCapture: ActiveCapture, input: RunCaptureInput) {
  const completedRecordingSession = await stopLocalRecording(activeCapture);
  return syncCompletedCapture(activeCapture, completedRecordingSession, input);
}

export async function stopLocalRecording(activeCapture: ActiveCapture) {
  const completedRecordingSession = await activeCapture.audioRecorder.stop(activeCapture.recordingSession.id);
  await sqliteMemoryStore.saveDraft({
    id: completedRecordingSession.id,
    createdAt: completedRecordingSession.startedAt,
    title: 'Voice note',
    localRecordingUri: completedRecordingSession.localUri,
    capturePayload: JSON.stringify(activeCapture.captureSessionDto),
  });
  if (completedRecordingSession.localUri) {
    await localUploadQueue.enqueue({
      id: `upload-${completedRecordingSession.id}`,
      recordingSessionId: completedRecordingSession.id,
      localUri: completedRecordingSession.localUri,
    });
  }

  return completedRecordingSession;
}

export async function syncCompletedCapture(
  activeCapture: ActiveCapture,
  completedRecordingSession: RecordingSession,
  input: RunCaptureInput,
) {
  try {
    const captureSession = await voxaApi.createCaptureSession(activeCapture.captureSessionDto);
    const recording = await voxaApi.createRecording({
      source: input.source,
      deviceId: input.deviceId,
      mimeType: 'audio/mp4',
      durationMs: completedRecordingSession.durationMs,
    });
    const upload = await voxaApi.createRecordingUploadUrl(recording.id);
    if (completedRecordingSession.localUri) {
      await uploadAudioFileToSignedUrl(completedRecordingSession.localUri, upload);
    }

    await voxaApi.updateRecordingStatus(recording.id, { status: RecordingStatus.UPLOADED });

    const completedCapture = await voxaApi.completeCaptureSession(captureSession.id, {
      recordingId: recording.id,
      durationMs: completedRecordingSession.durationMs,
    });
    await sqliteMemoryStore.markSynced(completedRecordingSession.id);
    await localUploadQueue.remove(`upload-${completedRecordingSession.id}`);

    return {
      synced: true,
      captureSession,
      recordingSession: completedRecordingSession,
      recording,
      upload,
      completedCapture,
    };
  } catch {
    return {
      synced: false,
      recordingSession: completedRecordingSession,
    };
  }
}

async function startLocalCapture(input: RunCaptureInput, audioRecorder: AudioRecorder): Promise<ActiveCapture> {
  const contextSnapshot = createContextSnapshot(input.source);
  const captureSessionDto: CreateCaptureSessionDto = {
    source: input.source,
    buttonGesture: input.buttonGesture,
    deviceId: input.deviceId,
    contextSnapshot: {
      ...contextSnapshot,
      buttonGesture: input.buttonGesture,
      nearbyDeviceId: input.deviceId,
    },
  };

  const recordingSession = await audioRecorder.start();
  await sqliteMemoryStore.saveDraft({
    id: recordingSession.id,
    createdAt: recordingSession.startedAt,
    title: 'Voice note',
    capturePayload: JSON.stringify(captureSessionDto),
  });

  return {
    audioRecorder,
    captureSessionDto,
    recordingSession,
  };
}
