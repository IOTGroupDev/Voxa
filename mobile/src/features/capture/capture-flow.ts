import {
  ButtonGesture,
  CaptureSource,
  CreateCaptureSessionDto,
  RecordingStatus,
} from '@voxa/shared';
import { MockAudioRecorder } from '../../lib/audio/recording-session';
import { createContextSnapshot } from '../../lib/context/context-snapshot';
import { voxaApi } from '../../lib/api/voxa-api';
import { localUploadQueue, sqliteMemoryStore } from '../../lib/storage/singletons';

export interface RunMockCaptureInput {
  source: CaptureSource;
  buttonGesture?: ButtonGesture;
  deviceId?: string;
}

export async function runMockCapture(input: RunMockCaptureInput) {
  const audioRecorder = new MockAudioRecorder();
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

  const captureSession = await voxaApi.createCaptureSession(captureSessionDto);
  const recordingSession = await audioRecorder.start();
  await sqliteMemoryStore.saveDraft({
    id: recordingSession.id,
    createdAt: recordingSession.startedAt,
    title: 'Unsynced memory capture',
  });
  const completedRecordingSession = await audioRecorder.stop(recordingSession.id);
  await sqliteMemoryStore.saveDraft({
    id: completedRecordingSession.id,
    createdAt: completedRecordingSession.startedAt,
    title: 'Memory capture',
    localRecordingUri: completedRecordingSession.localUri,
  });
  if (completedRecordingSession.localUri) {
    await localUploadQueue.enqueue({
      id: `upload-${completedRecordingSession.id}`,
      recordingSessionId: completedRecordingSession.id,
      localUri: completedRecordingSession.localUri,
    });
  }
  const recording = await voxaApi.createRecording({
    source: input.source,
    deviceId: input.deviceId,
    mimeType: 'audio/mp4',
    durationMs: completedRecordingSession.durationMs,
  });
  const upload = await voxaApi.createRecordingUploadUrl(recording.id);

  // TODO: Upload completedRecordingSession.localUri to upload.signedUrl when real audio is wired.
  await voxaApi.updateRecordingStatus(recording.id, { status: RecordingStatus.UPLOADED });

  const completedCapture = await voxaApi.completeCaptureSession(captureSession.id, {
    recordingId: recording.id,
    durationMs: completedRecordingSession.durationMs,
  });
  await sqliteMemoryStore.markSynced(recordingSession.id);
  await localUploadQueue.remove(`upload-${completedRecordingSession.id}`);

  return {
    captureSession,
    recordingSession: completedRecordingSession,
    recording,
    upload,
    completedCapture,
  };
}
