import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AiJob,
  AiJobStatus,
  AiJobType,
  CaptureSource,
  DongleRecordingSyncStatus,
  RecordingStatus,
  TimelineItem,
} from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useReprocessEventMutation, useTimelineQuery } from '../../lib/api/hooks';
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const items = Array.isArray(timeline.data) ? (timeline.data as TimelineItem[]) : [];

  return (
    <DataStateScreen title="Timeline" isLoading={timeline.isLoading} error={timeline.error}>
      <View style={styles.list}>
        {items.map((item) => {
          const status = describeTimelineStatus(item);
          const isExpanded = expandedId === item.id;

          return (
            <View key={item.id} style={[styles.item, shadow.card]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpandedId(isExpanded ? null : item.id)}
                style={styles.itemHeader}
              >
                <View style={styles.itemMeta}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title ?? item.summary ?? formatOccurredAt(item.occurredAt) ?? item.id}
                  </Text>
                  <Text style={styles.subtitle}>{describeSource(item)}</Text>
                </View>
                <View style={styles.statusWrap}>
                  <Badge label={status.label} tone={status.tone === 'ready' ? 'success' : status.tone === 'failed' ? 'danger' : 'accent'} />
                  <Text style={styles.expandText}>{isExpanded ? 'Hide' : 'Details'}</Text>
                </View>
              </Pressable>
              <Text style={styles.detail}>{status.detail}</Text>
              {isExpanded ? <TimelineDetails item={item} /> : null}
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
      <AiJobStages jobs={item.aiJobs ?? []} />
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

function AiJobStages({ jobs }: { jobs: AiJob[] }) {
  if (!jobs.length) {
    return <DetailRow label="AI jobs" value="No AI jobs have been created yet" />;
  }

  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>AI jobs</Text>
      <View style={styles.stageList}>
        {pipelineStages.map((stage) => {
          const job = findLatestJob(jobs, stage.type);
          return (
            <View key={stage.type} style={styles.stageRow}>
              <View style={[styles.stageDot, stageDotStyle(job?.status)]} />
              <View style={styles.stageBody}>
                <Text style={styles.stageTitle}>{stage.label}</Text>
                <Text style={styles.stageMeta}>{describeAiJob(job)}</Text>
                {job?.lastError ? <Text style={styles.stageError}>{job.lastError}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
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

const pipelineStages: Array<{ type: AiJobType; label: string }> = [
  { type: AiJobType.TRANSCRIPTION, label: 'Transcription' },
  { type: AiJobType.CLASSIFICATION, label: 'Classification' },
  { type: AiJobType.SUMMARY, label: 'Summary' },
  { type: AiJobType.ACTION_EXTRACTION, label: 'Actions' },
  { type: AiJobType.REMINDER_SUGGESTION, label: 'Reminders' },
  { type: AiJobType.EMBEDDING, label: 'Embedding' },
  { type: AiJobType.TIMELINE_UPDATE, label: 'Timeline' },
  { type: AiJobType.INSIGHT, label: 'Insight' },
];

function findLatestJob(jobs: AiJob[], type: AiJobType): AiJob | undefined {
  return jobs.filter((job) => job.type === type).sort((a, b) => compareDateDesc(a.createdAt, b.createdAt))[0];
}

function compareDateDesc(a: string, b: string) {
  return new Date(b).getTime() - new Date(a).getTime();
}

function describeAiJob(job?: AiJob): string {
  if (!job) {
    return 'Waiting';
  }

  const attempts = job.attempts ? ` · ${job.attempts} attempt${job.attempts === 1 ? '' : 's'}` : '';
  const time = job.completedAt ?? job.startedAt ?? job.createdAt;

  return `${job.status}${attempts} · ${formatShortTime(time)}`;
}

function formatShortTime(value?: string): string {
  if (!value) {
    return 'no time';
  }

  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

function stageDotStyle(status?: AiJobStatus) {
  switch (status) {
    case AiJobStatus.COMPLETED:
      return styles.stageDotCompleted;
    case AiJobStatus.PROCESSING:
    case AiJobStatus.RETRYING:
    case AiJobStatus.PENDING:
      return styles.stageDotWorking;
    case AiJobStatus.FAILED:
    case AiJobStatus.CANCELLED:
      return styles.stageDotFailed;
    default:
      return styles.stageDotWaiting;
  }
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  item: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.md,
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
  expandText: {
    color: palette.accentStrong,
    fontWeight: '700',
    fontSize: 12,
  },
  detail: {
    color: palette.muted,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  details: {
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  detailBlock: {
    gap: 4,
  },
  detailLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 20,
  },
  stageList: {
    gap: spacing.sm,
  },
  stageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stageDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 4,
  },
  stageDotWaiting: {
    backgroundColor: palette.border,
  },
  stageDotWorking: {
    backgroundColor: palette.accentStrong,
  },
  stageDotCompleted: {
    backgroundColor: palette.success,
  },
  stageDotFailed: {
    backgroundColor: palette.danger,
  },
  stageBody: {
    flex: 1,
    gap: 2,
  },
  itemFooter: {
    marginTop: spacing.md,
    alignItems: 'flex-end',
  },
  stageTitle: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  stageMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  stageError: {
    color: palette.danger,
    fontSize: 12,
    lineHeight: 16,
  },
});
