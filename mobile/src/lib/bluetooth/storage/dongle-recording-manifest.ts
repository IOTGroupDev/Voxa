import { DongleRecordingManifestItem, DongleRecordingSyncStatus } from '@voxa/shared';

const incompleteStatuses = new Set<DongleRecordingSyncStatus>([
  DongleRecordingSyncStatus.STORED_ON_DEVICE,
  DongleRecordingSyncStatus.METADATA_SYNCED,
  DongleRecordingSyncStatus.TRANSFER_IN_PROGRESS,
  DongleRecordingSyncStatus.TRANSFERRED_TO_PHONE,
  DongleRecordingSyncStatus.UPLOADED_TO_BACKEND,
  DongleRecordingSyncStatus.SYNC_FAILED,
]);

export function countUnsyncedDongleRecordings(items: DongleRecordingManifestItem[]): number {
  return items.filter((item) => incompleteStatuses.has(item.syncStatus)).length;
}

export function getLatestDongleRecording(items: DongleRecordingManifestItem[]): DongleRecordingManifestItem | null {
  return [...items].sort((a, b) => b.createdAtDeviceTime.localeCompare(a.createdAtDeviceTime))[0] ?? null;
}
