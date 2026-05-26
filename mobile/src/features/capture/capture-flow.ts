import {
  ButtonGesture,
  CaptureSource,
  CreateCaptureSessionDto,
  RecordingStatus,
} from '@voxa/shared';
import { ExpoAudioRecorder } from '../../lib/audio/expo-audio-recorder';
import { AudioRecorder, MockAudioRecorder, RecordingSession } from '../../lib/audio/recording-session';
import { createContextSnapshot } from '../../lib/context/context-snapshot';
import { voxaApi } from '../../lib/api/voxa-api';
import { uploadAudioFileToSignedUrl } from '../../lib/storage/audio-file-upload';
import { localUploadQueue, sqliteMemoryStore } from '../../lib/storage/singletons';

export interface RunMockCaptureInput {
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

export async function runMockCapture(input: RunMockCaptureInput) {
  const audioRecorder = new MockAudioRecorder();
  const activeCapture = await startLocalCapture(input, audioRecorder);
  return completeLocalCapture(activeCapture, input);
}

export async function startRealAudioCapture(input: RunMockCaptureInput) {
  return startLocalCapture(input, createPreferredAudioRecorder());
}

export async function completeLocalCapture(activeCapture: ActiveCapture, input: RunMockCaptureInput) {
  const completedRecordingSession = await activeCapture.audioRecorder.stop(activeCapture.recordingSession.id);
  await sqliteMemoryStore.saveDraft({
    id: completedRecordingSession.id,
    createdAt: completedRecordingSession.startedAt,
    title: 'Memory capture',
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

async function startLocalCapture(input: RunMockCaptureInput, audioRecorder: AudioRecorder): Promise<ActiveCapture> {
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
    title: 'Unsynced memory capture',
    capturePayload: JSON.stringify(captureSessionDto),
  });

  return {
    audioRecorder,
    captureSessionDto,
    recordingSession,
  };
}
