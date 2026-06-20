import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ButtonGesture, CaptureSource, DeviceStatus, DeviceType } from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import { ActionButton, Badge, EmptyState, ListCard } from '../../app/ui';
import { appConfig } from '../../app/config';
import {
  queryKeys,
  useDevicesQuery,
  usePairDeviceMutation,
  useUnpairDeviceMutation,
} from '../../lib/api/hooks';
import { voxaApi } from '../../lib/api/voxa-api';
import { useCaptureToggle } from '../capture/useCaptureToggle';
import { palette, spacing } from '../../app/theme';
import { useQueryClient } from '@tanstack/react-query';

type DeviceListItem = {
  id?: unknown;
  hardwareId?: unknown;
  displayName?: unknown;
  type?: unknown;
  firmwareVersion?: unknown;
  batteryLevel?: unknown;
  status?: unknown;
  lastSeenAt?: unknown;
  supportsOfflineCapture?: unknown;
};

type OnboardingStep = 'intro' | 'pair' | 'test' | 'success';

interface DeviceManagementScreenProps {
  onOpenResult?: (recordingId: string) => void;
}

export function DeviceManagementScreen({ onOpenResult }: DeviceManagementScreenProps) {
  const queryClient = useQueryClient();
  const devicesQuery = useDevicesQuery();
  const pairDevice = usePairDeviceMutation();
  const unpairDevice = useUnpairDeviceMutation();
  const { isRecording, isLoading, startCapture, stopCapture } = useCaptureToggle();
  const [step, setStep] = useState<OnboardingStep>('intro');
  const [deviceId, setDeviceId] = useState('voxa-dongle-dev');
  const [displayName, setDisplayName] = useState('Voxa dongle');
  const [testError, setTestError] = useState<string | null>(null);
  const [pairedFallback, setPairedFallback] = useState<DeviceListItem | null>(null);
  const devices = Array.isArray(devicesQuery.data) ? (devicesQuery.data as DeviceListItem[]) : [];
  const pairedDevice = useMemo(
    () => devices.find((device) => getString(device.status) !== DeviceStatus.DISCONNECTED) ?? pairedFallback,
    [devices, pairedFallback],
  );

  if (!appConfig.enableDongleMode) {
    return (
      <DataStateScreen title="Hardware capture" isLoading={false} error={null}>
        <EmptyState title="Dongle mode is off" />
      </DataStateScreen>
    );
  }

  async function handlePair() {
    const trimmedDeviceId = deviceId.trim();
    if (!trimmedDeviceId) return;

    const paired = await pairDevice.mutateAsync({
      deviceId: trimmedDeviceId,
      displayName: displayName.trim() || 'Voxa dongle',
      type: DeviceType.DONGLE,
      supportsOfflineCapture: true,
      batteryLevel: 100,
    });
    setPairedFallback(paired as DeviceListItem);
    setStep('test');
  }

  async function handleTestRecording() {
    const id = getString(pairedDevice?.id);
    if (!id || isLoading) return;

    setTestError(null);
    try {
      if (isRecording) {
        const result = await stopCapture(CaptureSource.DONGLE, {
          deviceId: id,
          buttonGesture: ButtonGesture.SINGLE_PRESS,
        });
        await voxaApi.updateDeviceStatus(id, { status: DeviceStatus.PAIRED });
        await queryClient.invalidateQueries({ queryKey: queryKeys.devices });
        if (result.recordingId) {
          onOpenResult?.(result.recordingId);
        }
        setStep('success');
        return;
      }

      await voxaApi.startDeviceCapture(id, { buttonGesture: ButtonGesture.SINGLE_PRESS });
      await startCapture(CaptureSource.DONGLE, {
        deviceId: id,
        buttonGesture: ButtonGesture.SINGLE_PRESS,
      });
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Test recording failed.');
      if (id) {
        await voxaApi.updateDeviceStatus(id, { status: DeviceStatus.ERROR }).catch(() => undefined);
      }
    }
  }

  async function handleUnpair() {
    const id = getString(pairedDevice?.id);
    if (!id) return;
    await unpairDevice.mutateAsync(id);
    setPairedFallback(null);
    setStep('intro');
  }

  return (
    <DataStateScreen title="Voxa dongle" isLoading={devicesQuery.isLoading} error={devicesQuery.error}>
      {pairedDevice ? (
        <View style={styles.section}>
          <DeviceStatusPanel device={pairedDevice} />
          <View style={styles.buttonRow}>
            <ActionButton
              title={isRecording ? 'Stop test recording' : 'Test recording'}
              onPress={handleTestRecording}
              disabled={isLoading}
            />
            <ActionButton
              title="Unpair"
              variant="secondary"
              onPress={handleUnpair}
              disabled={unpairDevice.isPending || isRecording}
            />
          </View>
          {testError ? <Text style={styles.errorText}>{testError}</Text> : null}
          <GestureMap />
          {step === 'success' ? (
            <View style={styles.successPanel}>
              <Text style={styles.successTitle}>Dongle is ready</Text>
              <Text style={styles.successText}>Button recordings will sync into Library and open as normal Voxa results.</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.section}>
          {step === 'intro' ? (
            <View style={styles.hero}>
              <Badge label="Remote capture" tone="accent" />
              <Text style={styles.heroTitle}>Use the hardware button to capture memory without opening Voxa.</Text>
              <Text style={styles.heroText}>The dongle records into the same notes, tasks, reminders, Library, and Result screen as phone recordings.</Text>
              <ActionButton title="Pair dongle" onPress={() => setStep('pair')} />
            </View>
          ) : null}

          {step === 'pair' ? (
            <View style={styles.form}>
              <Text style={styles.sectionTitle}>Pair device</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Device name"
                placeholderTextColor={palette.muted}
                style={styles.input}
              />
              <TextInput
                value={deviceId}
                onChangeText={setDeviceId}
                placeholder="Hardware id"
                placeholderTextColor={palette.muted}
                autoCapitalize="none"
                style={styles.input}
              />
              <ActionButton
                title={pairDevice.isPending ? 'Pairing...' : 'Pair'}
                onPress={handlePair}
                disabled={pairDevice.isPending || deviceId.trim().length === 0}
              />
            </View>
          ) : null}
        </View>
      )}
    </DataStateScreen>
  );
}

function DeviceStatusPanel({ device }: { device: DeviceListItem }) {
  return (
    <View style={styles.statusPanel}>
      <View style={styles.statusHeader}>
        <View>
          <Text style={styles.deviceName}>{getString(device.displayName) ?? 'Voxa dongle'}</Text>
          <Text style={styles.deviceMeta}>{getString(device.hardwareId) ?? 'paired device'}</Text>
        </View>
        <Badge label={formatStatus(device.status)} tone={getStatusTone(device.status)} />
      </View>
      <View style={styles.metrics}>
        <Metric label="Battery" value={formatBattery(device.batteryLevel)} />
        <Metric label="Firmware" value={getString(device.firmwareVersion) ?? 'unknown'} />
        <Metric label="Last sync" value={formatLastSeen(device.lastSeenAt)} />
      </View>
    </View>
  );
}

function GestureMap() {
  const gestures = [
    ['Single press', 'Record note'],
    ['Double press', 'Record idea'],
    ['Triple press', 'Record task'],
    ['Long press', 'Record reminder'],
    ['Hold and speak', 'Ask Voxa'],
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Button actions</Text>
      {gestures.map(([title, detail]) => (
        <ListCard key={title} title={title} detail={detail} />
      ))}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function getStatusTone(value: unknown): 'neutral' | 'accent' | 'success' | 'danger' {
  const status = getString(value);
  if (status === DeviceStatus.PAIRED) return 'success';
  if (status === DeviceStatus.SYNCING) return 'accent';
  if (status === DeviceStatus.ERROR) return 'danger';
  return 'neutral';
}

function formatStatus(value: unknown) {
  const status = getString(value);
  if (status === DeviceStatus.PAIRED) return 'paired';
  if (status === DeviceStatus.SYNCING) return 'syncing';
  if (status === DeviceStatus.ERROR) return 'error';
  return 'disconnected';
}

function formatBattery(value: unknown) {
  return typeof value === 'number' ? `${value}%` : 'unknown';
}

function formatLastSeen(value: unknown) {
  const raw = getString(value);
  if (!raw) return 'never';

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return 'unknown';

  return date.toLocaleString();
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  hero: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  heroTitle: {
    color: palette.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
  },
  heroText: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  form: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    color: palette.text,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    fontSize: 15,
    fontWeight: '700',
  },
  statusPanel: {
    gap: spacing.md,
    borderRadius: 18,
    padding: spacing.md,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  deviceName: {
    color: palette.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  deviceMeta: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metric: {
    minWidth: '30%',
    flexGrow: 1,
    gap: 4,
    borderRadius: 14,
    padding: spacing.sm,
    backgroundColor: palette.surface,
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  metricValue: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  buttonRow: {
    gap: spacing.sm,
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  successPanel: {
    gap: spacing.xs,
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.success,
  },
  successTitle: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  successText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
