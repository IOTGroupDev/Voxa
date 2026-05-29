import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CaptureSource } from '@voxa/shared';
import { DataStateScreen } from '@/app/DataStateScreen';
import { queryKeys } from '@/lib/api/hooks';
import { ActiveCapture, completeLocalCapture, startRealAudioCapture } from './capture-flow';
import { ActionButton, Badge, PanelCard } from '@/app/ui';
import { palette, shadow, spacing } from '@/app/theme';

type CaptureStartMode = 'phone' | 'airpods_shortcut' | 'dongle';

const captureModes: Array<{
  mode: CaptureStartMode;
  title: string;
  subtitle: string;
}> = [
  {
    mode: 'phone',
    title: 'Phone button',
    subtitle: 'Tap to capture sound thoughts instantly.',
  },
  {
    mode: 'airpods_shortcut',
    title: 'AirPods + Siri',
    subtitle: 'Use voice shortcut to create notes hands-free.',
  },
  {
    mode: 'dongle',
    title: 'Voxa dongle',
    subtitle: 'Hardware button and Bluetooth mic path.',
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

  async function startRecording() {
    if (selectedMode === 'dongle') {
      setStatus('Use the Voxa dongle button or Device screen mock controls');
      return;
    }

    setIsLoading(true);
    try {
      activeCaptureRef.current = await startRealAudioCapture({ source: selectedSource });
      setIsRecording(true);
      setStatus(selectedMode === 'airpods_shortcut' ? 'Recording via Siri shortcut' : 'Recording');
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
      <View style={[styles.heroPanel, shadow.soft]}>
        <Text style={styles.heroTitle}>Capture the moment before it slips away</Text>
        <Text style={styles.heroSubtitle}>Choose a source and keep the flow of ideas moving with a single tap.</Text>
      </View>

      <PanelCard title="Capture mode">
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
      </PanelCard>

      <PanelCard title="Status">
        <View style={styles.statusRow}>
          <Badge label={isRecording ? 'Recording' : 'Ready'} tone={isRecording ? 'danger' : 'success'} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </PanelCard>

      <ActionButton
          title={isRecording ? 'Stop recording' : 'Start capture'}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isLoading}
          variant={isRecording ? 'secondary' : 'primary'}
      />

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
  heroPanel: {
    borderRadius: 28,
    backgroundColor: palette.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  modeList: {
    gap: spacing.sm,
  },
  modeItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    borderRadius: 22,
    padding: spacing.md,
    backgroundColor: palette.surfaceSoft,
  },
  modeItemSelected: {
    borderColor: palette.accentStrong,
    backgroundColor: palette.surface,
    shadowColor: palette.accentLight,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  modeTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  modeTitleSelected: {
    color: palette.accentStrong,
  },
  modeSubtitle: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  modeSubtitleSelected: {
    color: palette.muted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statusText: {
    color: palette.text,
    fontSize: 15,
    flex: 1,
  },
});
