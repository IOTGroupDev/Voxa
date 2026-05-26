import { useEffect, useState } from 'react';
import { Button, Text } from 'react-native';
import { ButtonGesture, DeviceStatus } from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import { voxaApi } from '../../lib/api/voxa-api';
import { mockDongleService } from '../../lib/bluetooth/singleton';
import {
  dongleBackendSyncCoordinator,
  dongleBackendSyncQueue,
  mockDongleSyncService,
} from '../../lib/bluetooth/storage/singletons';
import { mockDongleStorageService } from '../../lib/bluetooth/storage';

export function DeviceManagementScreen() {
  const [status, setStatus] = useState('Mock dongle disconnected');
  const [storageStatus, setStorageStatus] = useState('Offline storage not checked');
  const [mockDeviceStatus, setMockDeviceStatus] = useState<DeviceStatus>(DeviceStatus.ACTIVE);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void refreshStorageStatus();
  }, []);

  async function pairMockDongle() {
    setIsLoading(true);
    try {
      const connection = await mockDongleService.connect('mock-dongle-001');
      await voxaApi.pairDevice({
        deviceId: connection.id,
        displayName: connection.name,
        firmwareVersion: connection.firmwareVersion,
        storageCapacityBytes: 32 * 1024 * 1024,
        storageUsedBytes: 96 * 1024,
        supportsOfflineCapture: true,
        firmwareStorageVersion: 'append-log-v0',
      });
      const battery = await mockDongleService.getBatteryStatus();
      setMockDeviceStatus(DeviceStatus.ACTIVE);
      setStatus(`${connection.name} connected · ${battery.levelPercent}% battery`);
      await refreshStorageStatus();
    } catch {
      setStatus('Mock dongle paired locally; backend sync can retry later');
    } finally {
      setIsLoading(false);
    }
  }

  function emitQuickCapture() {
    mockDongleService.emitMockButtonEvent(ButtonGesture.SINGLE_PRESS);
    setStatus('Mock quick capture event sent');
  }

  function emitImportantCapture() {
    mockDongleService.emitMockButtonEvent(ButtonGesture.LONG_PRESS);
    setStatus('Mock important memory event sent');
  }

  async function setChunkFailureMode(mode: 'none' | 'missing_chunk' | 'corrupt_chunk') {
    mockDongleStorageService.setFailureMode(mode);
    setStatus(`Mock dongle storage failure mode: ${mode}`);
    await refreshStorageStatus();
  }

  async function addStoredRecording() {
    const recording = mockDongleStorageService.addMockStoredRecording();
    setStatus(`Mock stored recording added: ${recording.localRecordingId}`);
    await refreshStorageStatus();
  }

  async function resetMockStorage() {
    mockDongleStorageService.reset();
    await dongleBackendSyncQueue.clear();
    setStatus('Mock dongle storage reset');
    await refreshStorageStatus();
  }

  async function refreshStorageStatus() {
    const snapshot = await mockDongleStorageService.getStorageSnapshot('mock-dongle-001');
    const pendingBackendItems = await dongleBackendSyncQueue.list();
    const pendingBackend = pendingBackendItems.length;
    const lastBackendError = pendingBackendItems.find((item) => item.lastError)?.lastError;
    const attempts = pendingBackendItems.reduce((total, item) => total + item.attempts, 0);
    const usedKb = Math.round((snapshot.storageUsedBytes ?? 0) / 1024);
    const totalMb = Math.round((snapshot.storageCapacityBytes ?? 0) / 1024 / 1024);
    const lastSync = snapshot.lastSyncAt ? new Date(snapshot.lastSyncAt).toLocaleTimeString() : 'pending';
    const error = snapshot.syncError ? ` · ${snapshot.syncError}` : '';
    const backendError = lastBackendError ? ` · backend error ${lastBackendError}` : '';
    setStorageStatus(
      `${snapshot.unsyncedRecordingsCount} unsynced · ${pendingBackend} backend pending · ${attempts} attempts · ${usedKb}KB of ${totalMb}MB · failure ${mockDongleStorageService.getFailureMode()} · last sync ${lastSync}${error}${backendError}`,
    );
  }

  async function syncStoredRecordings() {
    if (mockDeviceStatus !== DeviceStatus.ACTIVE) {
      setStatus(`Dongle sync blocked because device is ${mockDeviceStatus}`);
      return;
    }

    const result = await mockDongleSyncService.syncStoredRecordings('mock-dongle-001');
    setStatus(
      `Dongle sync transferred ${result.transferredRecordings}/${result.attemptedRecordings} stored recording${result.attemptedRecordings === 1 ? '' : 's'} · backend ${result.backendSyncedRecordings} · backend retry ${result.backendFailedRecordings}`,
    );
    await refreshStorageStatus();
  }

  async function retryBackendSync() {
    const result = await dongleBackendSyncCoordinator.retryPendingBackendSync();
    setStatus(`Backend retry completed ${result.completed}/${result.attempted} · failed ${result.failed}`);
    await refreshStorageStatus();
  }

  async function markMockDeviceStatus(status: DeviceStatus) {
    try {
      await voxaApi.updateDeviceStatus('mock-dongle-001', { status });
      setMockDeviceStatus(status);
      setStatus(`Mock dongle marked ${status}`);
    } catch {
      setMockDeviceStatus(status);
      setStatus(`Mock dongle status ${status} saved locally only`);
    }
    await refreshStorageStatus();
  }

  return (
    <DataStateScreen title="Device" isLoading={isLoading} error={null}>
      <Text>{status}</Text>
      <Text>Device status: {mockDeviceStatus}</Text>
      <Text>{storageStatus}</Text>
      <Button title="Pair mock dongle" onPress={pairMockDongle} />
      <Button title="Sync stored recordings" onPress={syncStoredRecordings} />
      <Button title="Retry backend sync" onPress={retryBackendSync} />
      <Button title="Mark mock active" onPress={() => void markMockDeviceStatus(DeviceStatus.ACTIVE)} />
      <Button title="Mark mock lost" onPress={() => void markMockDeviceStatus(DeviceStatus.LOST)} />
      <Button title="Add stored recording" onPress={addStoredRecording} />
      <Button title="Mock storage ok" onPress={() => void setChunkFailureMode('none')} />
      <Button title="Mock missing chunk" onPress={() => void setChunkFailureMode('missing_chunk')} />
      <Button title="Mock corrupt chunk" onPress={() => void setChunkFailureMode('corrupt_chunk')} />
      <Button title="Reset mock storage" onPress={resetMockStorage} />
      <Button title="Mock quick capture" onPress={emitQuickCapture} />
      <Button title="Mock important capture" onPress={emitImportantCapture} />
    </DataStateScreen>
  );
}
