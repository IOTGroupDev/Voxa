import { useMemo, useState } from 'react';
import { ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RecordingResult, RecordingResultStatus } from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import {
  useDeleteRecordingMutation,
  useDeleteTimelineItemMutation,
  useRecordingResultQuery,
  useUpdateMemoryEventMutation,
} from '../../lib/api/hooks';
import { voxaApi } from '../../lib/api/voxa-api';
import { ExportActions } from '../../components/ExportActions';
import { MemoryEditorModal } from '../../components/MemoryEditorModal';
import { ActionButton, Badge, EmptyState } from '../../app/ui';
import { useTranslation } from '../../app/i18n';
import { palette, shadow, spacing } from '../../app/theme';
interface RecordingResultScreenProps {
  recordingId: string | null;
  onNavigate: (route: 'Timeline' | 'Search') => void;
}

export function RecordingResultScreen({ recordingId, onNavigate }: RecordingResultScreenProps) {
  const { t } = useTranslation();
  const resultQuery = useRecordingResultQuery(recordingId);
  const updateMemoryEvent = useUpdateMemoryEventMutation();
  const deleteTimelineItem = useDeleteTimelineItemMutation();
  const deleteRecording = useDeleteRecordingMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const result = resultQuery.data;
  const shareText = useMemo(() => buildShareText(result), [result]);
  const resultError = result?.error ?? result?.errorMessage;

  function openEdit() {
    if (!result?.memoryEvent) return;

    setEditText(result.summary ?? result.note?.body ?? result.memoryEvent.summary ?? result.transcript ?? '');
    setIsEditing(true);
  }

  function saveEdit() {
    if (!result?.memoryEvent || updateMemoryEvent.isPending) return;

    updateMemoryEvent.mutate(
      {
        id: result.memoryEvent.id,
        dto: { text: editText.trim() || undefined },
      },
      {
        onSuccess() {
          setIsEditing(false);
          void resultQuery.refetch();
        },
      },
    );
  }

  function loadResultExport(format: 'text' | 'markdown') {
    if (result?.note?.id) {
      return voxaApi.exportNote(result.note.id, format);
    }

    if (result?.memoryEvent?.recording?.transcript?.id) {
      return voxaApi.exportTranscript(result.memoryEvent.recording.transcript.id, format);
    }

    return Promise.resolve({ format, content: shareText });
  }

  function confirmDelete() {
    if (!result) return;

    Alert.alert('Delete recording', 'Remove this result and linked memory data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const onSuccess = () => onNavigate('Timeline');
          if (result.memoryEvent?.id) {
            deleteTimelineItem.mutate(result.memoryEvent.id, { onSuccess });
            return;
          }

          deleteRecording.mutate(result.recordingId, { onSuccess });
        },
      },
    ]);
  }

  if (!recordingId) {
    return (
      <DataStateScreen title={t('savedToMemory')} isLoading={false} error={null}>
        <EmptyState title={t('noRecordingSelected')} description={t('noRecordingSelectedDescription')} />
      </DataStateScreen>
    );
  }

  return (
    <DataStateScreen title={t('savedToMemory')} isLoading={resultQuery.isLoading} error={resultQuery.error}>
      {result ? (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={[styles.hero, shadow.card]}>
            <View style={styles.heroTop}>
              <Badge label={formatStatus(result.status, t)} tone={result.status === 'saved' ? 'success' : result.status === 'failed' ? 'danger' : 'accent'} />
              <Text style={styles.typeLabel}>{formatDetectedType(result.detectedType, t)}</Text>
            </View>
            <Text style={styles.heroTitle}>{result.summary ?? result.memoryEvent?.title ?? t('understandingMemory')}</Text>
            <Text style={styles.heroMeta}>{formatRecordingMeta(result.recording?.durationMs, t)}</Text>
            {resultError ? <Text style={styles.errorText}>{resultError}</Text> : null}
          </View>

          <View style={styles.actionGrid}>
            <ActionButton title={t('save')} onPress={() => onNavigate('Timeline')} />
            <ActionButton title={t('edit')} onPress={openEdit} disabled={!result.memoryEvent} variant="secondary" />
            <ActionButton title={t('askAboutThis')} onPress={() => onNavigate('Search')} variant="secondary" />
            <ExportActions load={loadResultExport} disabled={!shareText.trim()} shareLabel={t('shareText')} />
            <ActionButton
              title={t('delete')}
              onPress={confirmDelete}
              disabled={deleteTimelineItem.isPending || deleteRecording.isPending}
              variant="ghost"
            />
          </View>

          <Section title={t('processing')}>
            <StepList status={result.status} />
          </Section>

          <Section title={t('summary')}>
            <Text style={styles.bodyText}>{result.summary ?? processingCopy(result.status, t('summaryNotReady'), t)}</Text>
          </Section>

          <Section title={t('sourceDetails')}>
            <Text style={styles.bodyText}>{result.transcript ?? processingCopy(result.status, t('sourceDetailsNotReady'), t)}</Text>
          </Section>

          {result.tasks.length ? (
            <Section title={t('tasks')}>
              {result.tasks.map((task) => (
                <ListRow key={task.id} title={task.title} detail={task.dueAt ? formatDateTime(task.dueAt) : undefined} />
              ))}
            </Section>
          ) : null}

          {result.reminders.length ? (
            <Section title={t('reminder')}>
              {result.reminders.map((reminder) => (
                <ListRow key={reminder.id} title={reminder.title} detail={formatDateTime(reminder.remindAt)} />
              ))}
            </Section>
          ) : null}

          {result.relatedTopics.length ? (
            <Section title={t('relatedTopics')}>
              {result.relatedTopics.map((topic) => (
                <ListRow key={topic.id} title={topic.title} detail={`${topic.notesCount} notes`} />
              ))}
            </Section>
          ) : null}
        </ScrollView>
      ) : null}

      <MemoryEditorModal
        visible={isEditing}
        title={t('editResult')}
        value={editText}
        placeholder={t('resultText')}
        isSaving={updateMemoryEvent.isPending}
        onChangeText={setEditText}
        onCancel={() => setIsEditing(false)}
        onSave={saveEdit}
      />
    </DataStateScreen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ListRow({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.listRow}>
      <Text style={styles.listTitle}>{title}</Text>
      {detail ? <Text style={styles.listDetail}>{detail}</Text> : null}
    </View>
  );
}

function StepList({ status }: { status: RecordingResultStatus }) {
  const { t } = useTranslation();
  const steps = getResultSteps(t);
  const activeIndex = RESULT_STEPS.findIndex((step) => step.id === status);
  return (
    <View style={styles.steps}>
      {steps.map((step, index) => {
        const isComplete = status === 'saved' || (activeIndex >= 0 && index < activeIndex);
        const isActive = step.id === status;
        const isFailed = status === 'failed' && step.id === 'failed';

        return (
          <View key={step.id} style={styles.stepRow}>
            <View style={[styles.stepDot, isComplete || isActive ? styles.stepDotActive : null, isFailed ? styles.stepDotFailed : null]} />
            <Text style={[styles.stepText, isActive ? styles.stepTextActive : null]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const RESULT_STEPS: Array<{ id: RecordingResultStatus }> = [
  { id: 'uploading' },
  { id: 'transcribing' },
  { id: 'summarizing' },
  { id: 'extracting' },
  { id: 'saved' },
  { id: 'failed' },
];

type Translate = ReturnType<typeof useTranslation>['t'];

function getResultSteps(t: Translate): Array<{ id: RecordingResultStatus; label: string }> {
  return [
    { id: 'uploading', label: t('uploadingAudio') },
    { id: 'transcribing', label: t('transcribing') },
    { id: 'summarizing', label: t('understanding') },
    { id: 'extracting', label: t('findingMemoryObjects') },
    { id: 'saved', label: t('savedToMemory') },
    { id: 'failed', label: t('couldNotProcess') },
  ];
}

function formatStatus(status: RecordingResultStatus, t: Translate) {
  const labels: Record<RecordingResultStatus, string> = {
    uploading: t('uploading'),
    transcribing: t('transcribing'),
    summarizing: t('understanding'),
    extracting: t('findingObjects'),
    saved: t('saved'),
    failed: t('failed'),
  };
  return labels[status];
}

function formatDetectedType(type: string, t: Translate) {
  const labels: Record<string, string> = {
    note: t('note'),
    idea: t('idea'),
    task: t('task'),
    reminder: t('reminder'),
  };
  return labels[type] ?? type;
}

function formatRecordingMeta(durationMs: number | undefined, t: Translate) {
  if (!durationMs) {
    return t('voiceRecording');
  }

  return `${Math.round(durationMs / 1000)} ${t('secVoiceRecording')}`;
}

function processingCopy(status: RecordingResultStatus, fallback: string, t: Translate) {
  return status === 'failed' ? t('processingFieldMissing') : fallback;
}

function formatDateTime(value?: string) {
  if (!value) return undefined;
  return new Date(value).toLocaleString();
}

function buildShareText(result: RecordingResult | undefined) {
  if (!result) return '';

  return [
    result.summary ? `Summary:\n${result.summary}` : null,
    result.transcript ? `Source details:\n${result.transcript}` : null,
    result.tasks.length ? `Tasks:\n${result.tasks.map((task) => `- ${task.title}`).join('\n')}` : null,
    result.reminders.length
      ? `Reminders:\n${result.reminders.map((reminder) => `- ${reminder.title} (${formatDateTime(reminder.remindAt)})`).join('\n')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    gap: spacing.sm,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  typeLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: palette.text,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900',
  },
  heroMeta: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  actionGrid: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  sectionBody: {
    gap: spacing.sm,
    borderRadius: 8,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.md,
  },
  bodyText: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  listRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  listTitle: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  listDetail: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  steps: {
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.border,
  },
  stepDotActive: {
    backgroundColor: palette.success,
  },
  stepDotFailed: {
    backgroundColor: palette.danger,
  },
  stepText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  stepTextActive: {
    color: palette.text,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: palette.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  editDialog: {
    width: '100%',
    maxWidth: 520,
    gap: spacing.md,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  editTitle: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  editInput: {
    minHeight: 180,
    color: palette.text,
    backgroundColor: palette.surfaceSoft,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.md,
    textAlignVertical: 'top',
    fontSize: 15,
    lineHeight: 22,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
