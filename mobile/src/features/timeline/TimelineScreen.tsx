import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CaptureSource,
  DongleRecordingSyncStatus,
  RecordingStatus,
  TimelineItem,
} from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import {
  useDeleteTimelineItemMutation,
  useReprocessEventMutation,
  useTimelineQuery,
  useUpdateMemoryEventMutation,
} from '../../lib/api/hooks';
import { ActionButton, Badge, EmptyState } from '../../app/ui';
import { palette, shadow, spacing } from '../../app/theme';

type TimelineStatusTone = 'neutral' | 'working' | 'ready' | 'failed';

interface TimelineStatus {
  label: string;
  detail: string;
  tone: TimelineStatusTone;
}

export function TimelineScreen() {
  const timeline = useTimelineQuery();
  const reprocessEvent = useReprocessEventMutation();
  const deleteTimelineItem = useDeleteTimelineItemMutation();
  const updateMemoryEvent = useUpdateMemoryEventMutation();
  const [menuItem, setMenuItem] = useState<TimelineItem | null>(null);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [editText, setEditText] = useState('');
  const items = Array.isArray(timeline.data) ? (timeline.data as TimelineItem[]) : [];

  function openEdit(item: TimelineItem) {
    setMenuItem(null);
    setEditingItem(item);
    setEditText(item.summary ?? item.note?.summary ?? item.note?.body ?? item.title ?? '');
  }

  function saveEdit() {
    if (!editingItem || updateMemoryEvent.isPending) return;

    updateMemoryEvent.mutate(
      {
        id: editingItem.id,
        dto: {
          text: editText.trim() || undefined,
        },
      },
      {
        onSuccess() {
          setEditingItem(null);
        },
      },
    );
  }

  function confirmDelete(item: TimelineItem) {
    setMenuItem(null);
    Alert.alert(
      'Delete memory',
      'Remove this timeline item, note, transcript, and linked recording data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTimelineItem.mutate(item.id),
        },
      ],
    );
  }

  return (
    <DataStateScreen title="Timeline" isLoading={timeline.isLoading} error={timeline.error}>
      <View style={styles.list}>
        {items.map((item) => {
          const status = describeTimelineStatus(item);

          return (
            <View
              key={item.id}
              style={[
                styles.item,
                shadow.card,
                menuItem?.id === item.id ? styles.itemMenuOpen : null,
              ]}
            >
              <View style={styles.itemHeader}>
                <View style={styles.itemMeta}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title ?? item.summary ?? formatOccurredAt(item.occurredAt) ?? item.id}
                  </Text>
                  <Text style={styles.subtitle}>{describeSource(item)}</Text>
                </View>
                <View style={styles.statusWrap}>
                  <Badge label={status.label} tone={status.tone === 'ready' ? 'success' : status.tone === 'failed' ? 'danger' : 'accent'} />
                  <View style={styles.headerActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Timeline item actions"
                      onPress={() => setMenuItem(menuItem?.id === item.id ? null : item)}
                      style={styles.moreButton}
                      hitSlop={8}
                    >
                      <Text style={styles.moreButtonText}>⋮</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
              {menuItem?.id === item.id ? (
                <View style={styles.actionMenu}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openEdit(item)}
                    style={styles.menuAction}
                  >
                    <Text style={styles.menuActionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => confirmDelete(item)}
                    disabled={deleteTimelineItem.isPending}
                    style={styles.menuAction}
                  >
                    <Text style={[styles.menuActionText, styles.menuActionDanger]}>Delete record</Text>
                  </Pressable>
                </View>
              ) : null}
              {status.tone === 'failed' ? (
                <View style={styles.itemFooter}>
                  <ActionButton
                    title="Retry processing"
                    onPress={() => reprocessEvent.mutate(item.id)}
                    disabled={reprocessEvent.isPending}
                    variant="secondary"
                  />
                </View>
              ) : null}
            </View>
          );
        })}
        {!items.length && !timeline.isLoading ? (
          <EmptyState title="No memories yet" description="Capture thoughts and they will appear here as the timeline builds." />
        ) : null}
      </View>

      <Modal transparent visible={Boolean(editingItem)} animationType="fade" onRequestClose={() => setEditingItem(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editDialog}>
            <Text style={styles.editTitle}>Edit memory</Text>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              placeholder="Memory text"
              placeholderTextColor={palette.muted}
              multiline
              style={[styles.editInput, styles.editTextArea]}
            />
            <View style={styles.editActions}>
              <ActionButton title="Cancel" onPress={() => setEditingItem(null)} variant="secondary" />
              <ActionButton title="Save" onPress={saveEdit} disabled={updateMemoryEvent.isPending} />
            </View>
          </View>
        </View>
      </Modal>
    </DataStateScreen>
  );
}

function describeTimelineStatus(item: TimelineItem): TimelineStatus {
  const recordingStatus = item.recording?.status;
  const processingStatus = item.processingStatus;
  const dongleSyncStatus = item.recording?.dongleSyncStatus;

  if (recordingStatus === RecordingStatus.FAILED || processingStatus === 'transcription_failed') {
    return {
      label: 'Failed',
      detail: 'Transcription did not complete. Retry processing when storage and STT are available.',
      tone: 'failed',
    };
  }

  if (processingStatus === 'transcription_retrying') {
    return {
      label: 'Retrying',
      detail: 'STT failed once and BullMQ will retry automatically.',
      tone: 'working',
    };
  }

  if (recordingStatus === RecordingStatus.UPLOADING) {
    return {
      label: 'Uploading',
      detail: 'Audio is being uploaded from the phone to private storage.',
      tone: 'working',
    };
  }

  if (recordingStatus === RecordingStatus.UPLOADED) {
    return {
      label: 'Queued',
      detail: 'Audio reached storage and is waiting for transcription.',
      tone: 'working',
    };
  }

  if (recordingStatus === RecordingStatus.PROCESSING || processingStatus === 'transcript_created') {
    return {
      label: 'Processing',
      detail: 'Transcript exists and Voxa is building memory context.',
      tone: 'working',
    };
  }

  if (processingStatus === 'summary_created') {
    return {
      label: 'Summarizing',
      detail: 'Summary is ready; follow-up extraction and timeline updates may still run.',
      tone: 'working',
    };
  }

  if (dongleSyncStatus && dongleSyncStatus !== DongleRecordingSyncStatus.SAFE_TO_DELETE_FROM_DEVICE) {
    return describeDongleSyncStatus(dongleSyncStatus);
  }

  if (processingStatus === 'thread_attached' || recordingStatus === RecordingStatus.COMPLETED) {
    return {
      label: 'Ready',
      detail: '',
      tone: 'ready',
    };
  }

  return {
    label: 'Captured',
    detail: 'Voxa has the event and is waiting for the next processing step.',
    tone: 'neutral',
  };
}

function describeDongleSyncStatus(status: DongleRecordingSyncStatus): TimelineStatus {
  switch (status) {
    case DongleRecordingSyncStatus.METADATA_SYNCED:
      return {
        label: 'On dongle',
        detail: 'Metadata is known; audio still needs transfer from the dongle.',
        tone: 'working',
      };
    case DongleRecordingSyncStatus.TRANSFER_IN_PROGRESS:
      return {
        label: 'Transferring',
        detail: 'Audio is moving from the dongle to the phone.',
        tone: 'working',
      };
    case DongleRecordingSyncStatus.TRANSFERRED_TO_PHONE:
      return {
        label: 'On phone',
        detail: 'Audio reached the phone and is waiting for backend upload.',
        tone: 'working',
      };
    case DongleRecordingSyncStatus.UPLOADED_TO_BACKEND:
    case DongleRecordingSyncStatus.CONFIRMED_BY_BACKEND:
      return {
        label: 'Uploaded',
        detail: 'Dongle recording reached backend processing.',
        tone: 'working',
      };
    case DongleRecordingSyncStatus.SYNC_FAILED:
      return {
        label: 'Sync failed',
        detail: 'Dongle sync stopped before the audio became a ready memory.',
        tone: 'failed',
      };
    case DongleRecordingSyncStatus.STORED_ON_DEVICE:
    default:
      return {
        label: 'Stored',
        detail: 'Recording is still stored on the dongle.',
        tone: 'working',
      };
  }
}

function describeSource(item: TimelineItem): string {
  const source = item.captureSource;
  const duration = item.recording?.durationMs ? `${Math.round(item.recording.durationMs / 1000)}s` : null;
  const occurredAt = formatOccurredAtTime(item.occurredAt);
  const labels: Record<string, string> = {
    [CaptureSource.MOBILE_APP]: 'Phone button',
    [CaptureSource.AIRPODS_SHORTCUT]: 'AirPods shortcut',
    [CaptureSource.DONGLE]: 'Voxa dongle',
  };
  const sourceLabel = source ? labels[source] ?? source : 'Unknown source';

  return [sourceLabel, occurredAt, duration].filter(Boolean).join(' · ');
}

function formatOccurredAt(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value).toLocaleString();
}

function formatOccurredAtTime(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  item: {
    position: 'relative',
    zIndex: 1,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.md,
  },
  itemMenuOpen: {
    zIndex: 50,
    elevation: 24,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  itemMeta: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 13,
  },
  statusWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  moreButton: {
    width: 30,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  moreButtonText: {
    color: palette.text,
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '900',
  },
  itemFooter: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: palette.overlay,
  },
  actionMenu: {
    position: 'absolute',
    top: 76,
    right: spacing.md,
    zIndex: 20,
    minWidth: 190,
    borderRadius: 18,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingVertical: spacing.xs,
  },
  menuAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  menuActionText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  menuActionDanger: {
    color: palette.danger,
  },
  editDialog: {
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  editTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '900',
  },
  editInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surfaceSoft,
    color: palette.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  editTextArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
