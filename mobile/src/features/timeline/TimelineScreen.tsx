import { useState } from 'react';
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';
import { CaptureSource, DongleRecordingSyncStatus, RecordingStatus, TimelineItem } from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useReprocessEventMutation, useTimelineQuery } from '../../lib/api/hooks';

type TimelineStatusTone = 'neutral' | 'working' | 'ready' | 'failed';

interface TimelineStatus {
  label: string;
  detail: string;
  tone: TimelineStatusTone;
}

export function TimelineScreen() {
  const timeline = useTimelineQuery();
  const reprocessEvent = useReprocessEventMutation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const items = Array.isArray(timeline.data) ? (timeline.data as TimelineItem[]) : [];

  return (
    <DataStateScreen title="Timeline" isLoading={timeline.isLoading} error={timeline.error}>
      {items.map((item) => {
        const status = describeTimelineStatus(item);
        const isExpanded = expandedId === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => setExpandedId(isExpanded ? null : item.id)}
            style={styles.item}
          >
            <View style={styles.itemTopRow}>
              <View style={styles.itemMain}>
                <View style={styles.itemHeader}>
                  <Text style={styles.title}>
                    {item.title ?? item.summary ?? formatOccurredAt(item.occurredAt) ?? item.id}
                  </Text>
                  <View style={[styles.statusPill, statusToneStyle(status.tone)]}>
                    <Text style={[styles.statusText, statusTextToneStyle(status.tone)]}>{status.label}</Text>
                  </View>
                </View>
                <Text style={styles.detail}>{status.detail}</Text>
                <Text style={styles.meta}>{describeSource(item)}</Text>
              </View>
              <Text style={styles.expandIcon}>{isExpanded ? 'Hide' : 'Open'}</Text>
            </View>
            {isExpanded ? <TimelineDetails item={item} /> : null}
            {status.tone === 'failed' ? (
              <Button
                title="Retry processing"
                onPress={() => reprocessEvent.mutate(item.id)}
                disabled={reprocessEvent.isPending}
              />
            ) : null}
          </Pressable>
        );
      })}
      {!items.length && !timeline.isLoading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptyText}>Capture from the phone button, AirPods shortcut, or Voxa dongle.</Text>
        </View>
      ) : null}
    </DataStateScreen>
  );
}

function TimelineDetails({ item }: { item: TimelineItem }) {
  const transcript = item.recording?.transcript;
  const note = item.note;
  const tags = note?.noteTags?.map((noteTag) => noteTag.tag?.name).filter(Boolean) ?? [];
  const actionItems = note?.actionItems ?? [];

  return (
    <View style={styles.details}>
      <DetailRow label="Pipeline" value={describePipeline(item)} />
      <DetailRow label="Transcript" value={transcript?.text ?? 'Waiting for transcription'} />
      <DetailRow label="Summary" value={note?.summary ?? note?.body ?? 'Waiting for summary'} />
      <DetailRow label="Thread" value={item.memoryThread?.title ?? 'Not attached yet'} />
      {tags.length ? <DetailRow label="Tags" value={tags.join(', ')} /> : null}
      {actionItems.length ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Actions</Text>
          {actionItems.map((action) => (
            <Text key={action.id} style={styles.detailValue}>
              {action.completedAt ? 'Done: ' : 'Open: '}
              {action.title}
            </Text>
          ))}
        </View>
      ) : null}
      <DetailRow
        label="Audio"
        value={[item.recording?.mimeType, item.recording?.transcript?.provider, item.recording?.transcript?.language]
          .filter(Boolean)
          .join(' · ') || 'No audio metadata yet'}
      />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
      detail: 'Memory is available in the timeline and linked context.',
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
  const labels: Record<string, string> = {
    [CaptureSource.MOBILE_APP]: 'Phone button',
    [CaptureSource.AIRPODS_SHORTCUT]: 'AirPods shortcut',
    [CaptureSource.DONGLE]: 'Voxa dongle',
  };
  const sourceLabel = source ? labels[source] ?? source : 'Unknown source';

  return [sourceLabel, duration].filter(Boolean).join(' · ');
}

function describePipeline(item: TimelineItem): string {
  const steps = [
    `recording: ${item.recording?.status ?? 'none'}`,
    `event: ${item.processingStatus ?? 'created'}`,
  ];

  if (item.recording?.dongleSyncStatus) {
    steps.push(`dongle: ${item.recording.dongleSyncStatus}`);
  }

  return steps.join(' · ');
}

function formatOccurredAt(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value).toLocaleString();
}

function statusToneStyle(tone: TimelineStatusTone) {
  switch (tone) {
    case 'ready':
      return styles.statusReady;
    case 'working':
      return styles.statusWorking;
    case 'failed':
      return styles.statusFailed;
    case 'neutral':
    default:
      return styles.statusNeutral;
  }
}

function statusTextToneStyle(tone: TimelineStatusTone) {
  return tone === 'failed' ? styles.statusTextFailed : styles.statusTextDefault;
}

const styles = StyleSheet.create({
  item: {
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  itemTopRow: {
    flexDirection: 'row',
    gap: 10,
  },
  itemMain: {
    flex: 1,
    gap: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  expandIcon: {
    minWidth: 36,
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  title: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  statusPill: {
    minHeight: 28,
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  statusNeutral: {
    backgroundColor: '#f3f4f6',
  },
  statusWorking: {
    backgroundColor: '#e0f2fe',
  },
  statusReady: {
    backgroundColor: '#dcfce7',
  },
  statusFailed: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextDefault: {
    color: '#111827',
  },
  statusTextFailed: {
    color: '#991b1b',
  },
  detail: {
    color: '#374151',
    fontSize: 13,
  },
  meta: {
    color: '#6b7280',
    fontSize: 12,
  },
  details: {
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  detailBlock: {
    gap: 2,
  },
  detailLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#111827',
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#4b5563',
    fontSize: 13,
  },
});
