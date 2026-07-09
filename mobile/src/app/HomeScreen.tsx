import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DailyDigest, Entity, TimelineItem } from '@voxa/shared';
import {
  useEntitiesQuery,
  useGenerateTodayDigestMutation,
  useInboxQuery,
  useTodayDigestQuery,
  useTimelineQuery,
} from '../lib/api/hooks';
import { voxaApi } from '../lib/api/voxa-api';
import { ExportActions } from '../components/ExportActions';
import { MainNavigationTarget } from '../types';
import { useTranslation } from './i18n';
import { palette, shadow, spacing } from './theme';

interface HomeScreenProps {
  onNavigate?: (target: MainNavigationTarget) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { t, language } = useTranslation();
  const timeline = useTimelineQuery();
  const inbox = useInboxQuery();
  const entities = useEntitiesQuery();
  const todayDate = useMemo(() => formatIsoDate(new Date()), []);
  const todayDigest = useTodayDigestQuery(todayDate);
  const generateDigest = useGenerateTodayDigestMutation();

  const timelineItems = useMemo(() => asArray<TimelineItem>(timeline.data), [timeline.data]);
  const recentMemories = timelineItems.slice(0, 4);
  const entityItems = useMemo(() => asArray<Entity>(entities.data), [entities.data]);
  const people = entityItems.filter((entity) => entity.type === 'person').slice(0, 4);
  const topics = entityItems.filter((entity) => entity.type !== 'person').slice(0, 6);
  const unresolvedTasks = inbox.data?.unresolvedTasks ?? [];
  const suggestions = inbox.data?.suggestions ?? [];
  const reminderCandidates = inbox.data?.reminderCandidates ?? [];
  const needsAttentionCount =
    suggestions.length + unresolvedTasks.length + reminderCandidates.length + (inbox.data?.failedSyncItems ?? []).length;
  const ideaCount = countMemoriesByType(timelineItems, 'idea');
  const decisionCount = countMemoriesByType(timelineItems, 'decision');
  const conversationCount = countMemoriesByType(timelineItems, 'conversation') || recentMemories.length;
  const quietSummary = createQuietSummary({
    language,
    conversationCount,
    ideaCount,
    decisionCount,
    taskCount: unresolvedTasks.length,
  });
  const isLoading = timeline.isLoading || entities.isLoading || inbox.isLoading;
  const error = timeline.error || entities.error || inbox.error;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.screenHeader}>
        <View style={styles.headerCopy}>
          <Text style={styles.greeting}>{getGreeting(t)}</Text>
          <Text style={styles.screenTitle}>{t('memory')}</Text>
        </View>
        {isLoading ? <ActivityIndicator color={palette.accentLight} /> : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>
          {typeof error === 'string' ? error : error instanceof Error ? error.message : t('unableToLoadData')}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => onNavigate?.({ tab: 'ask' })}
        style={({ pressed }) => [styles.askBar, pressed ? styles.pressablePressed : null]}
      >
        <View style={styles.askCopy}>
          <Text style={styles.askLabel}>{t('askVoxa')}</Text>
          <Text style={styles.askText}>{t('askMemoryPlaceholder')}</Text>
        </View>
        <Text style={styles.askIcon}>?</Text>
      </Pressable>

      <View style={[styles.intelligenceBlock, shadow.soft]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('today')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => generateDigest.mutate({ date: todayDate, regenerate: Boolean(todayDigest.data?.hasDigest) })}
            disabled={generateDigest.isPending}
            hitSlop={8}
          >
            <Text style={[styles.sectionLink, generateDigest.isPending ? styles.disabledText : null]}>
              {todayDigest.data?.hasDigest ? t('regenerateDigest') : t('generateDigest')}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.quietSummary}>{quietSummary}</Text>

        <DailyDigestPreview
          digest={todayDigest.data}
          todayDate={todayDate}
          isLoading={todayDigest.isLoading || generateDigest.isPending}
          error={todayDigest.error || generateDigest.error}
        />
      </View>

      <SectionHeader title={t('needsAttention')} action={needsAttentionCount ? `${needsAttentionCount}` : t('clear')} />
      <Pressable
        accessibilityRole="button"
        onPress={() => onNavigate?.({ tab: 'attention' })}
        style={({ pressed }) => [styles.attentionPanel, pressed ? styles.pressablePressed : null]}
      >
        {needsAttentionCount ? (
          <>
            <Text style={styles.panelTitle}>{t('attentionNeedsYou')}</Text>
            <Text style={styles.panelText}>{t('attentionNeedsYouDescription')}</Text>
          </>
        ) : (
          <Text style={styles.panelText}>{t('needsAttentionEmpty')}</Text>
        )}
      </Pressable>

      <SectionHeader title={t('recentMemories')} />
      <View style={styles.memoryList}>
        {recentMemories.map((item) => (
          <MemoryCard
            key={item.id}
            item={item}
            onPress={() =>
              item.recording?.id
                ? onNavigate?.({ tab: 'memory', route: { name: 'RecordingResult', recordingId: item.recording.id } })
                : onNavigate?.({ tab: 'memory', route: { name: 'Timeline' } })
            }
          />
        ))}
        {!recentMemories.length && !timeline.isLoading ? (
          <Text style={styles.emptyText}>{t('noRecentMemories')}</Text>
        ) : null}
      </View>

      <SectionHeader title={t('people')} action={people.length ? t('open') : undefined} />
      <View style={styles.horizontalList}>
        {people.map((person) => (
          <EntityPill
            key={person.id}
            entity={person}
            onPress={() => onNavigate?.({ tab: 'memory', route: { name: 'EntityDetail', entityId: person.id } })}
          />
        ))}
        {!people.length && !entities.isLoading ? <Text style={styles.emptyText}>{t('peopleEmpty')}</Text> : null}
      </View>

      <SectionHeader title={t('topics')} action={topics.length ? t('open') : undefined} />
      <View style={styles.topicGrid}>
        {topics.map((topic) => (
          <EntityPill
            key={topic.id}
            entity={topic}
            onPress={() => onNavigate?.({ tab: 'memory', route: { name: 'EntityDetail', entityId: topic.id } })}
          />
        ))}
        {!topics.length && !entities.isLoading ? <Text style={styles.emptyText}>{t('topicsEmpty')}</Text> : null}
      </View>

      <SectionHeader title={t('calendar')} />
      <Pressable
        accessibilityRole="button"
        onPress={() => onNavigate?.({ tab: 'memory', route: { name: 'Entities' } })}
        style={({ pressed }) => [styles.calendarPreview, pressed ? styles.pressablePressed : null]}
      >
        <Text style={styles.panelTitle}>{t('browseMemoryByDate')}</Text>
        <Text style={styles.panelText}>{t('browseMemoryByDateDescription')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionLink}>{action}</Text> : null}
    </View>
  );
}

function DailyDigestPreview({
  digest,
  todayDate,
  isLoading,
  error,
}: {
  digest: DailyDigest | undefined;
  todayDate: string;
  isLoading: boolean;
  error: unknown;
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return <Text style={styles.digestText}>{t('digestGenerating')}</Text>;
  }

  if (error) {
    return <Text style={styles.errorInline}>{error instanceof Error ? error.message : t('unableToLoadData')}</Text>;
  }

  if (!digest?.hasDigest) {
    return <Text style={styles.digestText}>{t('digestEmptyToday')}</Text>;
  }

  return (
    <View style={styles.digestPreview}>
      <Text style={styles.digestText}>{digest.summary}</Text>
      <ExportActions load={(format) => voxaApi.exportDaily(todayDate, format)} />
    </View>
  );
}

function MemoryCard({ item, onPress }: { item: TimelineItem; onPress: () => void }) {
  const title = item.title ?? item.note?.title ?? item.note?.summary ?? item.summary ?? 'Memory';
  const summary = item.summary ?? item.note?.summary ?? item.note?.body ?? '';

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.memoryCard, pressed ? styles.pressablePressed : null]}>
      <Text style={styles.memoryTitle}>{title}</Text>
      {summary ? <Text style={styles.memorySummary} numberOfLines={3}>{summary}</Text> : null}
      <Text style={styles.memoryMeta}>{formatMemoryDate(item.occurredAt)}</Text>
    </Pressable>
  );
}

function EntityPill({ entity, onPress }: { entity: Entity; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.entityPill, pressed ? styles.pressablePressed : null]}>
      <Text style={styles.entityName} numberOfLines={1}>{entity.name}</Text>
      <Text style={styles.entityType}>{formatObjectType(entity.type)}</Text>
    </Pressable>
  );
}

function getGreeting(t: (key: 'memoryGreetingMorning' | 'memoryGreetingAfternoon' | 'memoryGreetingEvening') => string) {
  const hour = new Date().getHours();
  if (hour < 12) return t('memoryGreetingMorning');
  if (hour < 18) return t('memoryGreetingAfternoon');
  return t('memoryGreetingEvening');
}

function countMemoriesByType(items: TimelineItem[], type: string) {
  return items.filter((item) => {
    const haystack = `${item.type ?? ''} ${item.title ?? ''} ${item.summary ?? ''}`.toLowerCase();
    return haystack.includes(type);
  }).length;
}

function createQuietSummary(input: {
  language: 'en' | 'ru' | 'es';
  conversationCount: number;
  ideaCount: number;
  decisionCount: number;
  taskCount: number;
}) {
  const fragments: string[] = [];
  const copy = quietSummaryCopy[input.language] ?? quietSummaryCopy.en;

  if (input.conversationCount > 0) {
    fragments.push(copy.conversations(input.conversationCount));
  }
  if (input.ideaCount > 0) {
    fragments.push(copy.ideas(input.ideaCount));
  }
  if (input.decisionCount > 0) {
    fragments.push(copy.decisions(input.decisionCount));
  }
  if (input.taskCount > 0) {
    fragments.push(copy.followUps(input.taskCount));
  }

  if (fragments.length === 0) {
    return copy.empty;
  }

  return `${copy.prefix}: ${fragments.join(', ')}.`;
}

const quietSummaryCopy = {
  en: {
    prefix: 'Recent context',
    empty: 'Recent context will appear here as Voxa understands your memories.',
    conversations: (count: number) => `${count} remembered conversation${count === 1 ? '' : 's'}`,
    ideas: (count: number) => `${count} idea${count === 1 ? '' : 's'}`,
    decisions: (count: number) => `${count} decision${count === 1 ? '' : 's'}`,
    followUps: (count: number) => `${count} follow-up${count === 1 ? '' : 's'}`,
  },
  ru: {
    prefix: 'Недавний контекст',
    empty: 'Недавний контекст появится здесь, когда Voxa поймет ваши воспоминания.',
    conversations: (count: number) => `${count} ${pluralRu(count, 'разговор', 'разговора', 'разговоров')}`,
    ideas: (count: number) => `${count} ${pluralRu(count, 'идея', 'идеи', 'идей')}`,
    decisions: (count: number) => `${count} ${pluralRu(count, 'решение', 'решения', 'решений')}`,
    followUps: (count: number) => `${count} ${pluralRu(count, 'продолжение', 'продолжения', 'продолжений')}`,
  },
  es: {
    prefix: 'Contexto reciente',
    empty: 'El contexto reciente aparecerá aquí cuando Voxa entienda tus recuerdos.',
    conversations: (count: number) => `${count} conversación${count === 1 ? '' : 'es'} recordada${count === 1 ? '' : 's'}`,
    ideas: (count: number) => `${count} idea${count === 1 ? '' : 's'}`,
    decisions: (count: number) => `${count} decisión${count === 1 ? '' : 'es'}`,
    followUps: (count: number) => `${count} seguimiento${count === 1 ? '' : 's'}`,
  },
};

function pluralRu(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMemoryDate(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function formatObjectType(type: string) {
  return type.replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  screenTitle: {
    color: palette.text,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
  },
  errorText: {
    borderRadius: 16,
    padding: spacing.md,
    color: palette.danger,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(248, 113, 113, 0.34)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  askBar: {
    minHeight: 68,
    borderRadius: 24,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  askCopy: {
    flex: 1,
    gap: 2,
  },
  askLabel: {
    color: palette.accentLight,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  askText: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  askIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    color: palette.text,
    backgroundColor: palette.success,
    fontSize: 20,
    lineHeight: 34,
    fontWeight: '900',
  },
  intelligenceBlock: {
    gap: spacing.md,
    borderRadius: 28,
    padding: spacing.lg,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  sectionHeader: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  sectionLink: {
    color: palette.accentLight,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  disabledText: {
    opacity: 0.55,
  },
  quietSummary: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  digestPreview: {
    gap: spacing.sm,
  },
  digestText: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  errorInline: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  attentionPanel: {
    gap: spacing.xs,
    borderRadius: 22,
    padding: spacing.md,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  panelTitle: {
    color: palette.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },
  panelText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  memoryList: {
    gap: spacing.sm,
  },
  memoryCard: {
    gap: spacing.xs,
    borderRadius: 24,
    padding: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  memoryTitle: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  memorySummary: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  memoryMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  horizontalList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  entityPill: {
    maxWidth: '48%',
    minWidth: '31%',
    gap: 2,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  entityName: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  entityType: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  calendarPreview: {
    gap: spacing.xs,
    borderRadius: 24,
    padding: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  emptyText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  pressablePressed: {
    opacity: 0.84,
    transform: [{ scale: 0.995 }],
  },
});
