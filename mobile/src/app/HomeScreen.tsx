import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AiSuggestion, CaptureSource, DailyDigest, Entity, Insight, MemoryThread, TimelineItem } from '@voxa/shared';
import { useCaptureToggle } from '../features/capture/useCaptureToggle';
import {
  useActionsQuery,
  useEntitiesQuery,
  useGenerateTodayDigestMutation,
  useInboxQuery,
  useInsightsQuery,
  useMemoryThreadsQuery,
  useRemindersQuery,
  useTodayDigestQuery,
  useTimelineQuery,
} from '../lib/api/hooks';
import { voxaApi } from '../lib/api/voxa-api';
import { ExportActions } from '../components/ExportActions';
import { speakVoiceFeedback } from '../lib/voice/voice-feedback';
import { getCaptureSource, useCaptureStore } from '../state/capture.store';
import { MainNavigationTarget } from '../types';
import { appConfig } from './config';
import { useTranslation } from './i18n';
import { palette, shadow, spacing } from './theme';

interface HomeScreenProps {
  onNavigate?: (target: MainNavigationTarget) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { t, language } = useTranslation();
  const timeline = useTimelineQuery();
  const threads = useMemoryThreadsQuery();
  const insights = useInsightsQuery();
  const actions = useActionsQuery();
  const reminders = useRemindersQuery();
  const inbox = useInboxQuery();
  const entities = useEntitiesQuery();
  const todayDate = useMemo(() => formatIsoDate(new Date()), []);
  const todayDigest = useTodayDigestQuery(todayDate);
  const generateDigest = useGenerateTodayDigestMutation();
  const selectedMode = useCaptureStore((state) => state.selectedMode);
  const setCaptureStatus = useCaptureStore((state) => state.setStatus);
  const activeCapture = useCaptureStore((state) => state.activeCapture);
  const { isLoading: isCaptureLoading, isRecording, toggleCapture } = useCaptureToggle();
  const elapsedMs = useRecordingElapsedMs(activeCapture?.recordingSession.startedAt, isRecording);

  const timelineItems = useMemo(() => asArray<TimelineItem>(timeline.data), [timeline.data]);
  const threadItems = useMemo(() => asArray<MemoryThread>(threads.data), [threads.data]);
  const insightItems = useMemo(() => asArray<Insight>(insights.data), [insights.data]);
  const memoryObjects = useMemo(() => asArray<Entity>(entities.data).slice(0, 4), [entities.data]);
  const suggestions = (inbox.data?.suggestions ?? []).slice(0, 3);
  const unresolvedTasks = inbox.data?.unresolvedTasks ?? [];
  const failedSyncItems = inbox.data?.failedSyncItems ?? [];
  const needsAttentionCount = suggestions.length + unresolvedTasks.length + failedSyncItems.length;
  const actionCount = asArray(actions.data).length;
  const reminderCount = asArray(reminders.data).length;
  const latestEvent = timelineItems[0];
  const latestInsight = appConfig.enableInsights ? insightItems[0] : undefined;
  const topThread = threadItems[0];
  const eventTitle = latestEvent?.title ?? latestEvent?.summary ?? latestEvent?.note?.summary ?? 'Record your first memory to build your day.';
  const eventSummary = latestEvent?.note?.summary ?? latestEvent?.summary ?? latestEvent?.note?.body ?? 'Record your first memory to build your day.';
  const aiSummary = latestInsight?.body ?? latestEvent?.note?.summary ?? latestEvent?.summary ?? t('homeAiSummaryEmpty');
  const isLoading = timeline.isLoading || threads.isLoading || insights.isLoading;
  const error = timeline.error || threads.error || insights.error;

  async function handlePrimaryCapture() {
    if (isCaptureLoading) return;

    if (selectedMode === 'dongle') {
      onNavigate?.({ tab: 'settings', route: { name: 'DongleSettings' } });
      setCaptureStatus('Open recording to use the Voxa dongle');
      void speakVoiceFeedback('dongleCapture', language);
      return;
    }

    const source = getCaptureSource(selectedMode) ?? CaptureSource.MOBILE_APP;
    const result = await toggleCapture(source);
    if (result.phase === 'stopped' && result.recordingId) {
      onNavigate?.({ tab: 'memory', route: { name: 'RecordingResult', recordingId: result.recordingId } });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.appName}>Voxa</Text>
          <Text style={styles.screenTitle}>{t('home')}</Text>
        </View>
        {isLoading ? <ActivityIndicator color={palette.accentLight} /> : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>
          {typeof error === 'string' ? error : error instanceof Error ? error.message : t('unableToLoadData')}
        </Text>
      ) : null}

      <View style={[styles.captureHero, isRecording ? styles.captureHeroRecording : null, shadow.card]}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.eyebrow}>{isRecording ? t('recordingNow') : t('homeReady')}</Text>
            <Text style={styles.heroTitle}>{t('homeHeroTitle')}</Text>
          </View>
          <Text style={[styles.heroTimer, isRecording ? styles.heroTimerRecording : null]}>
            {isRecording ? formatElapsed(elapsedMs) : formatTodayTime()}
          </Text>
        </View>

        <View style={styles.waveform} pointerEvents="none">
          {WAVEFORM_BARS.map((height, index) => (
            <View
              key={`${height}-${index}`}
              style={[
                styles.waveBar,
                { height },
                isRecording && index % 2 === 0 ? styles.waveBarRecording : null,
              ]}
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handlePrimaryCapture}
          disabled={isCaptureLoading}
          style={({ pressed }) => [
            styles.primaryCapture,
            isRecording ? styles.primaryCaptureRecording : null,
            isCaptureLoading ? styles.primaryCaptureDisabled : null,
            pressed && !isCaptureLoading ? styles.primaryCapturePressed : null,
          ]}
        >
          <Text style={styles.primaryCaptureIcon}>{isRecording ? '■' : '●'}</Text>
          <Text style={styles.primaryCaptureText}>
            {isRecording ? t('stopRecording') : t('startVoiceCapture')}
          </Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => onNavigate?.({ tab: 'ask' })}
        style={({ pressed }) => [styles.askBar, pressed ? styles.pressablePressed : null]}
      >
        <Text style={styles.askBarText}>{t('askMemoryPlaceholder')}</Text>
        <Text style={styles.askBarIcon}>●</Text>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('needsAttention')}</Text>
        <Text style={styles.sectionLink}>{needsAttentionCount ? `${needsAttentionCount}` : t('clear')}</Text>
      </View>

      <View style={[styles.attentionCard, shadow.soft]}>
        {suggestions.map((suggestion) => (
          <AttentionRow
            key={suggestion.id}
            title={suggestion.title}
            detail={suggestion.body}
            onPress={() => onNavigate?.({ tab: 'ask', question: buildSuggestionQuestion(suggestion) })}
          />
        ))}
        {unresolvedTasks.slice(0, 3).map((task) => (
          <AttentionRow
            key={task.id}
            title={task.title}
            detail={task.dueAt ? `${t('due')} ${formatOccurredAt(task.dueAt)}` : t('openTask')}
            onPress={() => onNavigate?.({ tab: 'memory', route: { name: 'Entities' } })}
          />
        ))}
        {failedSyncItems.length ? (
          <AttentionRow
            title={t('couldNotSync')}
            detail={`${failedSyncItems.length} ${t('itemsNeedAttention')}`}
            onPress={() => onNavigate?.({ tab: 'settings', route: { name: 'SettingsHome' } })}
          />
        ) : null}
        {!needsAttentionCount && !inbox.isLoading ? (
          <Text style={styles.attentionEmpty}>{t('needsAttentionEmpty')}</Text>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('todayDigest')}</Text>
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

      <View style={[styles.digestCard, shadow.soft]}>
        {todayDigest.isLoading ? (
          <Text style={styles.digestText}>{t('loading')}</Text>
        ) : todayDigest.error ? (
          <Text style={styles.errorText}>
            {todayDigest.error instanceof Error ? todayDigest.error.message : t('unableToLoadData')}
          </Text>
        ) : generateDigest.isPending ? (
          <Text style={styles.digestText}>{t('digestGenerating')}</Text>
        ) : todayDigest.data?.hasDigest ? (
          <DailyDigestCard
            digest={todayDigest.data}
            onRegenerate={() => generateDigest.mutate({ date: todayDate, regenerate: true })}
            isRegenerating={generateDigest.isPending}
            todayDate={todayDate}
          />
        ) : (
          <View style={styles.digestEmpty}>
            <Text style={styles.digestText}>{t('digestEmptyToday')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => generateDigest.mutate({ date: todayDate })}
              disabled={generateDigest.isPending}
              style={({ pressed }) => [styles.digestButton, pressed ? styles.pressablePressed : null]}
            >
              <Text style={styles.digestButtonText}>{t('generateDigest')}</Text>
            </Pressable>
          </View>
        )}
        {generateDigest.error ? (
          <Text style={styles.errorText}>
            {generateDigest.error instanceof Error ? generateDigest.error.message : t('unableToLoadData')}
          </Text>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('recentMemoryObjects')}</Text>
        <Pressable accessibilityRole="button" onPress={() => onNavigate?.({ tab: 'memory', route: { name: 'Entities' } })} hitSlop={8}>
          <Text style={styles.sectionLink}>{t('open')}</Text>
        </Pressable>
      </View>

      <View style={styles.memoryObjectGrid}>
        {memoryObjects.map((entity) => (
          <Pressable
            key={entity.id}
            accessibilityRole="button"
            onPress={() => onNavigate?.({ tab: 'memory', route: { name: 'EntityDetail', entityId: entity.id } })}
            style={({ pressed }) => [styles.memoryObjectCard, pressed ? styles.pressablePressed : null]}
          >
            <Text style={styles.memoryObjectName}>{entity.name}</Text>
            <Text style={styles.memoryObjectType}>{formatObjectType(entity.type)}</Text>
            {entity.summary ? <Text style={styles.memoryObjectSummary} numberOfLines={2}>{entity.summary}</Text> : null}
          </Pressable>
        ))}
        {!memoryObjects.length && !entities.isLoading ? (
          <Text style={styles.attentionEmpty}>{t('memoryObjectsEmptyToday')}</Text>
        ) : null}
      </View>

      {appConfig.enableDeveloperMode && appConfig.enableInsights ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('homeAiBrief')}</Text>
            <Pressable accessibilityRole="button" onPress={() => onNavigate?.({ tab: 'memory', route: { name: 'Insights' } })} hitSlop={8}>
              <Text style={styles.sectionLink}>{t('insights')}</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => onNavigate?.({ tab: 'memory', route: { name: latestInsight ? 'Insights' : 'Timeline' } })}
            style={({ pressed }) => [styles.aiBrief, pressed ? styles.pressablePressed : null]}
          >
            <Text style={styles.aiBriefLabel}>{latestInsight?.title ?? t('autoSummary')}</Text>
            <Text style={styles.aiBriefText} numberOfLines={5}>{aiSummary}</Text>
            <View style={styles.aiBriefFooter}>
              <Text style={styles.aiBriefMeta}>{latestEvent ? formatOccurredAt(latestEvent.occurredAt) : t('noRecentCapture')}</Text>
              <Text style={styles.aiBriefCta}>{t('open')}</Text>
            </View>
          </Pressable>
        </>
      ) : null}

      {appConfig.enableDeveloperMode ? <View style={styles.metricsStrip}>
        <Metric value={timelineItems.length} label={t('captures')} />
        <Metric value={threadItems.length} label={t('threadsCount')} />
        {appConfig.enableInsights ? <Metric value={insightItems.length} label={t('insightsCount')} /> : null}
      </View> : null}

      {appConfig.enableDeveloperMode ? <View style={styles.commandGrid}>
        <CommandExample label={t('homeCommandNote')} />
        <CommandExample label={t('homeCommandIdea')} />
        <CommandExample label={t('homeCommandTask')} />
        <CommandExample label={t('homeCommandReminder')} />
      </View> : null}

      {appConfig.enableDeveloperMode ? <View style={styles.quickActions}>
        <QuickAction
          title={t('timeline')}
          subtitle={eventTitle}
          meta={formatOccurredAt(latestEvent?.occurredAt)}
          onPress={() => onNavigate?.({ tab: 'memory', route: { name: 'Timeline' } })}
        />
        {appConfig.enableMemoryGraph ? (
          <QuickAction
            title={t('threads')}
            subtitle={topThread?.title ?? t('homeNoThreads')}
            meta={topThread ? `${topThread.notesCount} ${t('notes')}` : t('organizeThreads')}
            onPress={() => onNavigate?.({ tab: 'memory', route: { name: 'MemoryThreads' } })}
          />
        ) : null}
        <QuickAction
          title={t('actions')}
          subtitle={t('homeActionsSubtitle')}
          meta={`${actionCount} ${t('actions')}`}
          onPress={() => onNavigate?.({ tab: 'memory', route: { name: 'Actions' } })}
        />
        <QuickAction
          title={t('reminders')}
          subtitle={t('homeRemindersSubtitle')}
          meta={`${reminderCount} ${t('reminders')}`}
          onPress={() => onNavigate?.({ tab: 'memory', route: { name: 'Reminders' } })}
        />
        <QuickAction
          title={t('search')}
          subtitle={t('homeSearchSubtitle')}
          meta={t('homeSearchMeta')}
          onPress={() => onNavigate?.({ tab: 'ask' })}
        />
      </View> : null}

      {appConfig.enableDeveloperMode ? <View style={styles.recentBlock}>
        <Text style={styles.sectionTitle}>{t('recentEvents')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => onNavigate?.({ tab: 'memory', route: { name: 'Timeline' } })}
          style={({ pressed }) => [styles.recentItem, pressed ? styles.pressablePressed : null]}
        >
          <View style={styles.recentDot} />
          <View style={styles.recentContent}>
            <Text style={styles.recentTitle} numberOfLines={2}>{eventTitle}</Text>
            <Text style={styles.recentSummary} numberOfLines={3}>{eventSummary}</Text>
          </View>
        </Pressable>
      </View> : null}
    </ScrollView>
  );
}

function DailyDigestCard({
  digest,
  onRegenerate,
  isRegenerating,
  todayDate,
}: {
  digest: DailyDigest;
  onRegenerate: () => void;
  isRegenerating: boolean;
  todayDate: string;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.digestContent}>
      <Text style={styles.digestText}>{digest.summary}</Text>
      <DigestSection title={t('important')} items={digest.importantEvents} />
      <DigestSection title={t('ideas')} items={digest.ideas} />
      <DigestSection title={t('tasks')} items={digest.tasks} />
      <DigestSection title={t('reminders')} items={digest.reminders} />
      <DigestSection title={t('tomorrow')} items={digest.suggestedTomorrowFocus} />
      <DigestSection title={t('openQuestions')} items={digest.openQuestions} />

      {digest.sources.length ? (
        <View style={styles.digestSources}>
          <Text style={styles.digestSectionTitle}>{t('sources')}</Text>
          {digest.sources.slice(0, 4).map((source) => (
            <View key={`${source.type}-${source.id}`} style={styles.digestSource}>
              <Text style={styles.digestSourceType}>{formatDigestSourceType(source.type)}</Text>
              <Text style={styles.digestSourceText} numberOfLines={2}>
                {source.title ? `${source.title}: ${source.snippet}` : source.snippet}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.digestActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onRegenerate}
          disabled={isRegenerating}
          style={({ pressed }) => [styles.digestSmallButton, pressed ? styles.pressablePressed : null]}
        >
          <Text style={styles.digestSmallButtonText}>{t('regenerateDigest')}</Text>
        </Pressable>
        <ExportActions load={(format) => voxaApi.exportDaily(todayDate, format)} />
      </View>
    </View>
  );
}

function DigestSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.digestSection}>
      <Text style={styles.digestSectionTitle}>{title}</Text>
      {items.map((item, index) => (
        <Text key={`${title}-${index}`} style={styles.digestListItem}>
          {item}
        </Text>
      ))}
    </View>
  );
}

function AttentionRow({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.attentionRow, pressed ? styles.pressablePressed : null]}>
      <View style={styles.attentionDot} />
      <View style={styles.attentionBody}>
        <Text style={styles.attentionTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.attentionDetail} numberOfLines={2}>{detail}</Text>
      </View>
    </Pressable>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({
  title,
  subtitle,
  meta,
  onPress,
}: {
  title: string;
  subtitle: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed ? styles.pressablePressed : null]}
    >
      <View style={styles.quickActionBody}>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSubtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
      <Text style={styles.quickActionMeta}>{meta}</Text>
    </Pressable>
  );
}

function CommandExample({ label }: { label: string }) {
  return (
    <View style={styles.commandPill}>
      <Text style={styles.commandText}>{label}</Text>
    </View>
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

  return Math.max(0, now - new Date(startedAt).getTime());
}

function formatElapsed(elapsedMs: number) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatTodayTime() {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatOccurredAt(value?: string) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function buildSuggestionQuestion(suggestion: AiSuggestion) {
  return `What should I do about this: ${suggestion.title}? ${suggestion.body}`;
}

function formatObjectType(type: string) {
  return type.replace(/_/g, ' ');
}

function formatDigestSourceType(type: string) {
  const labels: Record<string, string> = {
    note: 'Memory source',
    transcript: 'Memory source',
    memory_event: 'Memory',
    task: 'Task',
    reminder: 'Reminder',
    recording: 'Memory source',
  };
  return labels[type] ?? type;
}

const WAVEFORM_BARS = [18, 34, 24, 52, 30, 64, 40, 72, 36, 58, 28, 44, 22, 38];

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  appName: {
    color: palette.accentLight,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  screenTitle: {
    marginTop: 2,
    color: palette.text,
    fontSize: 32,
    lineHeight: 38,
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
  captureHero: {
    overflow: 'hidden',
    borderRadius: 30,
    padding: spacing.lg,
    backgroundColor: '#13251f',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(16, 185, 129, 0.42)',
  },
  captureHeroRecording: {
    backgroundColor: '#2a1216',
    borderColor: 'rgba(248, 113, 113, 0.56)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  eyebrow: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  heroTitle: {
    maxWidth: 230,
    marginTop: spacing.xs,
    color: palette.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '900',
  },
  heroTimer: {
    color: '#bbf7d0',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  heroTimerRecording: {
    color: '#fecaca',
  },
  waveform: {
    height: 92,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waveBar: {
    width: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(167, 243, 208, 0.42)',
  },
  waveBarRecording: {
    backgroundColor: 'rgba(254, 202, 202, 0.76)',
  },
  primaryCapture: {
    minHeight: 70,
    borderRadius: 24,
    backgroundColor: palette.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryCaptureRecording: {
    backgroundColor: palette.danger,
  },
  primaryCaptureDisabled: {
    opacity: 0.64,
  },
  primaryCapturePressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  primaryCaptureIcon: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  primaryCaptureText: {
    color: palette.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  sectionHeader: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
  },
  sectionLink: {
    color: palette.accentLight,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  disabledText: {
    opacity: 0.55,
  },
  askBar: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  askBarText: {
    color: palette.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  askBarIcon: {
    color: palette.success,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  attentionCard: {
    gap: spacing.sm,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  attentionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  attentionDot: {
    width: 9,
    height: 9,
    marginTop: 7,
    borderRadius: 999,
    backgroundColor: palette.success,
  },
  attentionBody: {
    flex: 1,
    gap: 2,
  },
  attentionTitle: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  attentionDetail: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  attentionEmpty: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  digestCard: {
    gap: spacing.sm,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  memoryObjectGrid: {
    gap: spacing.sm,
  },
  memoryObjectCard: {
    gap: spacing.xs,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.md,
  },
  memoryObjectName: {
    color: palette.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },
  memoryObjectType: {
    color: palette.success,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  memoryObjectSummary: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  digestText: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  digestContent: {
    gap: spacing.md,
  },
  digestSection: {
    gap: spacing.xs,
  },
  digestSectionTitle: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  digestListItem: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  digestSources: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  digestSource: {
    gap: 2,
  },
  digestSourceType: {
    color: palette.accentLight,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  digestSourceText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  digestEmpty: {
    gap: spacing.md,
  },
  digestButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  digestButtonText: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  digestActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  digestSmallButton: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  digestSmallButtonText: {
    color: palette.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  aiBrief: {
    borderRadius: 22,
    padding: spacing.lg,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderLight,
  },
  aiBriefLabel: {
    color: palette.accentLight,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  aiBriefText: {
    marginTop: spacing.sm,
    color: palette.text,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '700',
  },
  aiBriefFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  aiBriefMeta: {
    flex: 1,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  aiBriefCta: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  metricsStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    minHeight: 86,
    justifyContent: 'center',
    borderRadius: 18,
    padding: spacing.md,
    backgroundColor: palette.backgroundSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  metricValue: {
    color: palette.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  commandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  commandPill: {
    minHeight: 46,
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.backgroundSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    flexGrow: 1,
    flexBasis: '47%',
  },
  commandText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  quickActions: {
    gap: spacing.sm,
  },
  quickAction: {
    minHeight: 82,
    borderRadius: 20,
    padding: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  quickActionBody: {
    flex: 1,
    gap: 4,
  },
  quickActionTitle: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  quickActionSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  quickActionMeta: {
    maxWidth: 96,
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  recentBlock: {
    gap: spacing.sm,
  },
  recentItem: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  recentDot: {
    width: 10,
    height: 10,
    marginTop: 7,
    borderRadius: 999,
    backgroundColor: palette.accentLight,
  },
  recentContent: {
    flex: 1,
  },
  recentTitle: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  recentSummary: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  pressablePressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
