import { StyleSheet, View } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { EmptyState, ListCard, PanelCard } from '../../app/ui';
import { useDevicesQuery } from '../../lib/api/hooks';
import { spacing } from '../../app/theme';

type DeviceListItem = {
  id?: unknown;
  hardwareId?: unknown;
  displayName?: unknown;
  firmwareVersion?: unknown;
  status?: unknown;
  lastSeenAt?: unknown;
  supportsOfflineCapture?: unknown;
  storageCapacityBytes?: unknown;
  storageUsedBytes?: unknown;
};

export function DeviceManagementScreen() {
  const devicesQuery = useDevicesQuery();
  const devices = Array.isArray(devicesQuery.data) ? (devicesQuery.data as DeviceListItem[]) : [];

  return (
    <DataStateScreen title="Devices" isLoading={devicesQuery.isLoading} error={devicesQuery.error}>
      <PanelCard title="Connected devices" subtitle="Hardware paired with your Voxa account.">
        {devices.length > 0 ? (
          <View style={styles.list}>
            {devices.map((device) => (
              <ListCard
                key={getString(device.id) ?? getString(device.hardwareId) ?? JSON.stringify(device)}
                title={getDeviceTitle(device)}
                subtitle={getDeviceSubtitle(device)}
                detail={getDeviceDetail(device)}
              />
            ))}
          </View>
        ) : (
          <EmptyState title="No devices" description="Paired hardware will appear here." />
        )}
      </PanelCard>
    </DataStateScreen>
  );
}

function getDeviceTitle(device: DeviceListItem) {
  return getString(device.displayName) ?? getString(device.hardwareId) ?? 'Voxa device';
}

function getDeviceSubtitle(device: DeviceListItem) {
  const status = getString(device.status) ?? 'unknown';
  const firmware = getString(device.firmwareVersion);
  return firmware ? `Status: ${status} · Firmware: ${firmware}` : `Status: ${status}`;
}

function getDeviceDetail(device: DeviceListItem) {
  const parts = [
    formatStorage(device.storageUsedBytes, device.storageCapacityBytes),
    device.supportsOfflineCapture === true ? 'Offline capture supported' : null,
    formatLastSeen(device.lastSeenAt),
  ].filter(Boolean);

  return parts.join(' · ');
}

function formatStorage(usedValue: unknown, totalValue: unknown) {
  const used = typeof usedValue === 'number' ? usedValue : null;
  const total = typeof totalValue === 'number' ? totalValue : null;
  if (used === null || total === null) return null;

  return `${Math.round(used / 1024)}KB / ${Math.round(total / 1024 / 1024)}MB`;
}

function formatLastSeen(value: unknown) {
  const raw = getString(value);
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  return `Last seen ${date.toLocaleString()}`;
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
});
