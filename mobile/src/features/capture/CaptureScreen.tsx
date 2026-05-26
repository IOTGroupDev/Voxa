import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';
import { CaptureSource } from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import { queryKeys } from '../../lib/api/hooks';
import { ActiveCapture, completeLocalCapture, runMockCapture, startRealAudioCapture } from './capture-flow';

type CaptureStartMode = 'phone' | 'airpods_shortcut' | 'dongle';

const captureModes: Array<{
  mode: CaptureStartMode;
  title: string;
  subtitle: string;
}> = [
  {
    mode: 'phone',
    title: 'Phone button',
    subtitle: 'Large in-app button for leaving a note now',
  },
  {
    mode: 'airpods_shortcut',
    title: 'AirPods + Siri Shortcut',
    subtitle: 'Say: Hey Siri, leave a note in Voxa',
  },
  {
    mode: 'dongle',
    title: 'Voxa dongle',
    subtitle: 'Physical branded button and Bluetooth mic path',
  },
];

export function CaptureScreen() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('Ready for a quiet capture');
  const [selectedMode, setSelectedMode] = useState<CaptureStartMode>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const activeCaptureRef = useRef<ActiveCapture | null>(null);

  const selectedSource = getCaptureSource(selectedMode);

  async function captureManualThought() {
    setIsLoading(true);
    try {
      const result = await runMockCapture({ source: selectedSource });
      setStatus(result.synced ? 'Captured and synced' : 'Captured locally; sync will retry');
      await refreshMemoryLists(queryClient);
    } finally {
      setIsLoading(false);
    }
  }

  async function startRecording() {
    if (selectedMode === 'dongle') {
      setStatus('Use the Voxa dongle button or Device screen mock controls');
      return;
    }

    setIsLoading(true);
    try {
      activeCaptureRef.current = await startRealAudioCapture({ source: selectedSource });
      setIsRecording(true);
      setStatus(selectedMode === 'airpods_shortcut' ? 'Recording from shortcut path' : 'Recording');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not start recording');
    } finally {
      setIsLoading(false);
    }
  }

  async function stopRecording() {
    const activeCapture = activeCaptureRef.current;
    if (!activeCapture) {
      setStatus('No active recording');
      return;
    }

    setIsLoading(true);
    try {
      const result = await completeLocalCapture(activeCapture, { source: selectedSource });
      setStatus(result.synced ? 'Recorded and synced' : 'Recorded locally; sync will retry');
      await refreshMemoryLists(queryClient);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not stop recording');
    } finally {
      activeCaptureRef.current = null;
      setIsRecording(false);
      setIsLoading(false);
    }
  }

  return (
    <DataStateScreen title="Capture" isLoading={isLoading} error={null}>
      <View style={styles.modeList}>
        {captureModes.map((item) => {
          const isSelected = selectedMode === item.mode;
          return (
            <Pressable
              key={item.mode}
              accessibilityRole="button"
              onPress={() => setSelectedMode(item.mode)}
              style={[styles.modeItem, isSelected ? styles.modeItemSelected : null]}
            >
              <Text style={[styles.modeTitle, isSelected ? styles.modeTitleSelected : null]}>{item.title}</Text>
              <Text style={[styles.modeSubtitle, isSelected ? styles.modeSubtitleSelected : null]}>{item.subtitle}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text>{status}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={isRecording || isLoading}
        onPress={startRecording}
        style={[styles.primaryCaptureButton, isRecording ? styles.primaryCaptureButtonActive : null]}
      >
        <Text style={styles.primaryCaptureText}>
          {selectedMode === 'airpods_shortcut' ? 'Leave Note via Shortcut' : 'Leave Note'}
        </Text>
      </Pressable>
      <Button title="Stop recording" onPress={stopRecording} disabled={!isRecording} />
      <Button title="Mock voice capture" onPress={captureManualThought} />
    </DataStateScreen>
  );
}

async function refreshMemoryLists(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.timeline }),
    queryClient.invalidateQueries({ queryKey: queryKeys.recordings }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notes }),
  ]);
}

function getCaptureSource(mode: CaptureStartMode): CaptureSource {
  switch (mode) {
    case 'airpods_shortcut':
      return CaptureSource.AIRPODS_SHORTCUT;
    case 'dongle':
      return CaptureSource.DONGLE;
    case 'phone':
    default:
      return CaptureSource.MOBILE_APP;
  }
}

const styles = StyleSheet.create({
  modeList: {
    gap: 8,
  },
  modeItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  modeItemSelected: {
    borderColor: '#111827',
    backgroundColor: '#f9fafb',
  },
  modeTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  modeTitleSelected: {
    color: '#000000',
  },
  modeSubtitle: {
    marginTop: 4,
    color: '#4b5563',
    fontSize: 13,
  },
  modeSubtitleSelected: {
    color: '#374151',
  },
  primaryCaptureButton: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 16,
  },
  primaryCaptureButtonActive: {
    backgroundColor: '#7f1d1d',
  },
  primaryCaptureText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
});
