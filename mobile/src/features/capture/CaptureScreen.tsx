import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DataStateScreen } from '@/app/DataStateScreen';
import { Badge, PanelCard } from '@/app/ui';
import { palette, shadow, spacing } from '@/app/theme';
import { useCaptureStore } from '@/state/capture.store';

export function CaptureScreen() {
  const status = useCaptureStore((state) => state.status);
  const isLoading = useCaptureStore((state) => state.isLoading);
  const isRecording = useCaptureStore((state) => state.isRecording);
  const activeCapture = useCaptureStore((state) => state.activeCapture);
  const startedAt = activeCapture?.recordingSession.startedAt;
  const elapsedMs = useRecordingElapsedMs(startedAt, isRecording);
  const elapsedLabel = useMemo(() => formatElapsed(elapsedMs), [elapsedMs]);

  return (
    <DataStateScreen title="Capture" isLoading={isLoading} error={null}>
      <View style={[styles.heroPanel, shadow.soft]}>
        <Text style={styles.heroTitle}>Capture the moment before it slips away</Text>
        <Text style={styles.heroSubtitle}>Choose a source and keep the flow of ideas moving with a single tap.</Text>
      </View>

      <PanelCard title="Status">
        <View style={styles.statusRow}>
          <Badge label={isRecording ? 'Recording' : 'Ready'} tone={isRecording ? 'danger' : 'success'} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
        {isRecording ? (
          <View style={styles.timerRow}>
            <Text style={styles.timerLabel}>Recording time</Text>
            <Text style={styles.timerValue}>{elapsedLabel}</Text>
          </View>
        ) : null}
      </PanelCard>

    </DataStateScreen>
  );
}

function useRecordingElapsedMs(startedAt: string | Date | undefined, isRecording: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRecording || !startedAt) {
      setNow(Date.now());
      return undefined;
    }

    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, startedAt]);

  if (!isRecording || !startedAt) {
    return 0;
  }

  const startedAtMs = new Date(startedAt).getTime();
  return Math.max(0, now - startedAtMs);
}

function formatElapsed(elapsedMs: number) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
  timerRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  timerLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timerValue: {
    marginTop: spacing.xs,
    color: palette.danger,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
});
