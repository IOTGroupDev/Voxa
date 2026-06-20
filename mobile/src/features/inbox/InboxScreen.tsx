import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AiSuggestion, ActionItem, TimelineItem } from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useTranslation } from '../../app/i18n';
import {
  useGenerateInboxSuggestionsMutation,
  useInboxQuery,
  useSuggestionActionMutation,
} from '../../lib/api/hooks';
import { EmptyState } from '../../app/ui';
import { palette, shadow, spacing } from '../../app/theme';
import { MainNavigationTarget } from '../../types';

interface InboxScreenProps {
  onNavigate: (target: MainNavigationTarget) => void;
}

export function InboxScreen({ onNavigate }: InboxScreenProps) {
  const { t } = useTranslation();
  const inbox = useInboxQuery();
  const generate = useGenerateInboxSuggestionsMutation();
  const accept = useSuggestionActionMutation('accept');
  const dismiss = useSuggestionActionMutation('dismiss');
  const done = useSuggestionActionMutation('done');
  const data = inbox.data;
  const suggestions = (data?.suggestions ?? []).filter((suggestion) => suggestion.type !== 'reminder_candidate');
  const reminderCandidates = data?.reminderCandidates ?? [];
  const unresolvedTasks = data?.unresolvedTasks ?? [];
  const reviewMemories = data?.reviewMemories ?? [];
  const failedSyncItems = data?.failedSyncItems ?? [];

  return (
    <DataStateScreen title={t('inbox')} isLoading={inbox.isLoading} error={inbox.error}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>{t('inboxSubtitle')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => generate.mutate()}
            disabled={generate.isPending}
            style={({ pressed }) => [styles.generateButton, pressed ? styles.pressed : null, generate.isPending ? styles.disabled : null]}
          >
            <Text style={styles.generateButtonText}>{generate.isPending ? t('inboxGenerating') : t('inboxGenerate')}</Text>
          </Pressable>
        </View>

        {generate.error ? (
          <Text style={styles.errorText}>{generate.error instanceof Error ? generate.error.message : t('unableToLoadData')}</Text>
        ) : null}

        <Section title={t('aiSuggestions')}>
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onAccept={() => accept.mutate(suggestion.id)}
              onDismiss={() => dismiss.mutate(suggestion.id)}
              onDone={() => done.mutate(suggestion.id)}
              onAsk={() => onNavigate({ tab: 'ask', question: buildSuggestionQuestion(suggestion) })}
              onOpenSource={() => openSuggestionSource(suggestion, onNavigate)}
            />
          ))}
          {!suggestions.length && !inbox.isLoading ? <EmptyState title="Nothing needs your attention right now." /> : null}
        </Section>

        {unresolvedTasks.length ? (
          <Section title={t('unresolvedTasks')}>
            {unresolvedTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </Section>
        ) : null}

        {reminderCandidates.length ? (
          <Section title="Reminder candidates">
            {reminderCandidates.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={() => accept.mutate(suggestion.id)}
                onDismiss={() => dismiss.mutate(suggestion.id)}
                onDone={() => done.mutate(suggestion.id)}
                onAsk={() => onNavigate({ tab: 'ask', question: buildSuggestionQuestion(suggestion) })}
                onOpenSource={() => openSuggestionSource(suggestion, onNavigate)}
              />
            ))}
          </Section>
        ) : null}

        {reviewMemories.length ? (
          <Section title={t('reviewMemories')}>
            {reviewMemories.map((item) => (
              <MemoryRow
                key={item.id}
                item={item}
                onOpen={() =>
                  onNavigate({
                    tab: 'memory',
                    route: item.recording?.id
                      ? { name: 'RecordingResult', recordingId: item.recording.id }
                      : { name: 'Timeline' },
                  })
                }
              />
            ))}
          </Section>
        ) : null}

        {failedSyncItems.length ? (
          <Section title={t('failedSyncItems')}>
            {failedSyncItems.map((item, index) => (
              <View key={index} style={styles.rowCard}>
                <Text style={styles.rowTitle}>Sync issue</Text>
                <Text style={styles.rowText}>{JSON.stringify(item).slice(0, 220)}</Text>
              </View>
            ))}
          </Section>
        ) : null}
      </ScrollView>
    </DataStateScreen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  onDone,
  onAsk,
  onOpenSource,
}: {
  suggestion: AiSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
  onDone: () => void;
  onAsk: () => void;
  onOpenSource: () => void;
}) {
  return (
    <View style={[styles.suggestionCard, shadow.soft]}>
      <View style={styles.cardHeader}>
        <Text style={styles.type}>{formatType(suggestion.type)}</Text>
        <Text style={styles.date}>{formatDate(suggestion.createdAt)}</Text>
      </View>
      <Text style={styles.cardTitle}>{suggestion.title}</Text>
      <Text style={styles.cardBody}>{suggestion.body}</Text>
      <View style={styles.actionRow}>
        <SmallButton label="Accept" onPress={onAccept} />
        <SmallButton label="Done" onPress={onDone} />
        <SmallButton label="Dismiss" onPress={onDismiss} danger />
      </View>
      <View style={styles.actionRow}>
        <SmallButton label="Open source" onPress={onOpenSource} secondary />
        <SmallButton label="Ask about this" onPress={onAsk} secondary />
      </View>
    </View>
  );
}

function SmallButton({ label, onPress, secondary, danger }: { label: string; onPress: () => void; secondary?: boolean; danger?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallButton,
        secondary ? styles.smallButtonSecondary : null,
        danger ? styles.smallButtonDanger : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.smallButtonText}>{label}</Text>
    </Pressable>
  );
}

function TaskRow({ task }: { task: ActionItem }) {
  return (
    <View style={styles.rowCard}>
      <Text style={styles.rowTitle}>{task.title}</Text>
      <Text style={styles.rowText}>{task.dueAt ? `Due ${formatDate(task.dueAt)}` : 'Open task'}</Text>
    </View>
  );
}

function MemoryRow({ item, onOpen }: { item: TimelineItem; onOpen: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [styles.rowCard, pressed ? styles.pressed : null]}>
      <Text style={styles.rowTitle}>{item.title ?? item.summary ?? item.note?.summary ?? 'Memory'}</Text>
      <Text style={styles.rowText}>{item.processingStatus ?? formatDate(item.occurredAt)}</Text>
    </Pressable>
  );
}

function openSuggestionSource(suggestion: AiSuggestion, onNavigate: (target: MainNavigationTarget) => void) {
  if (suggestion.relatedEntity?.id) {
    onNavigate({ tab: 'memory', route: { name: 'EntityDetail', entityId: suggestion.relatedEntity.id } });
    return;
  }

  const recordingId = suggestion.relatedMemoryEvent?.recording?.id;
  if (recordingId) {
    onNavigate({ tab: 'memory', route: { name: 'RecordingResult', recordingId } });
    return;
  }

  onNavigate({ tab: 'memory', route: { name: 'Timeline' } });
}

function buildSuggestionQuestion(suggestion: AiSuggestion) {
  return `What should I do about this: ${suggestion.title}? ${suggestion.body}`;
}

function formatType(type: string) {
  return type.replace(/_/g, ' ');
}

function formatDate(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    gap: spacing.sm,
  },
  headerText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  generateButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  generateButtonText: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.84,
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  suggestionCard: {
    gap: spacing.sm,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  type: {
    color: palette.success,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  date: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  cardTitle: {
    color: palette.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },
  cardBody: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  smallButton: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  smallButtonSecondary: {
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  smallButtonDanger: {
    backgroundColor: palette.danger,
  },
  smallButtonText: {
    color: palette.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  rowCard: {
    gap: spacing.xs,
    borderRadius: 8,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.md,
  },
  rowTitle: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  rowText: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
