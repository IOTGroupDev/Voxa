import { useState } from 'react';
import { Button, Text } from 'react-native';
import { ButtonGesture } from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import { voxaApi } from '../../lib/api/voxa-api';
import { mockDongleService } from '../../lib/bluetooth/singleton';

export function DeviceManagementScreen() {
  const [status, setStatus] = useState('Mock dongle disconnected');
  const [isLoading, setIsLoading] = useState(false);

  async function pairMockDongle() {
    setIsLoading(true);
    try {
      const connection = await mockDongleService.connect('mock-dongle-001');
      await voxaApi.pairDevice({
        deviceId: connection.id,
        displayName: connection.name,
        firmwareVersion: connection.firmwareVersion,
      });
      const battery = await mockDongleService.getBatteryStatus();
      setStatus(`${connection.name} connected · ${battery.levelPercent}% battery`);
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

  return (
    <DataStateScreen title="Device" isLoading={isLoading} error={null}>
      <Text>{status}</Text>
      <Button title="Pair mock dongle" onPress={pairMockDongle} />
      <Button title="Mock quick capture" onPress={emitQuickCapture} />
      <Button title="Mock important capture" onPress={emitImportantCapture} />
    </DataStateScreen>
  );
}
