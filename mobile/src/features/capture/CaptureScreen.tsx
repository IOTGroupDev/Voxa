import { useState } from 'react';
import { Button, Text } from 'react-native';
import { CaptureSource } from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import { runMockCapture } from './capture-flow';

export function CaptureScreen() {
  const [status, setStatus] = useState('Ready for a quiet capture');
  const [isLoading, setIsLoading] = useState(false);

  async function captureManualThought() {
    setIsLoading(true);
    try {
      const result = await runMockCapture({ source: CaptureSource.MOBILE_APP });
      setStatus(result.synced ? 'Captured and synced' : 'Captured locally; sync will retry');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DataStateScreen title="Capture" isLoading={isLoading} error={null}>
      <Text>{status}</Text>
      <Button title="Mock voice capture" onPress={captureManualThought} />
    </DataStateScreen>
  );
}
