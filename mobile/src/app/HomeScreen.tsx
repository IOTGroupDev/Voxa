import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useInsightsQuery, useMemoryThreadsQuery, useTimelineQuery } from '../lib/api/hooks';
import { DataStateScreen } from './DataStateScreen';
import { ListCard, PanelCard, ProgressBar } from './ui';
import { useTranslation } from './i18n';
import { palette, spacing } from './theme';
import { AppRouteName } from '../types';

interface HomeScreenProps {
  onNavigate?: (route: AppRouteName) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { t } = useTranslation();
  const timeline = useTimelineQuery();
  const threads = useMemoryThreadsQuery();
  const insights = useInsightsQuery();
  const latestEvent = Array.isArray(timeline.data) ? timeline.data[0] as { title?: string; summary?: string } | undefined : undefined;
  const latestInsight = Array.isArray(insights.data) ? insights.data[0] as { title?: string; body?: string } | undefined : undefined;
  const captureCount = Array.isArray(timeline.data) ? timeline.data.length : 0;
  const threadCount = Array.isArray(threads.data) ? threads.data.length : 0;
  const insightCount = Array.isArray(insights.data) ? insights.data.length : 0;

  return (
    <DataStateScreen
      title={t('home')}
      isLoading={timeline.isLoading || threads.isLoading || insights.isLoading}
      error={timeline.error || threads.error || insights.error}
    >
      <PanelCard title={t('memorySnapshot')}>
        <View style={styles.metricsRow}>
          <View style={styles.metricChip}>
            <Text style={styles.metricValue}>{captureCount}</Text>
            <Text style={styles.metricLabel}>{t('captures')}</Text>
          </View>
          <View style={styles.metricChip}>
            <Text style={styles.metricValue}>{threadCount}</Text>
            <Text style={styles.metricLabel}>{t('threadsCount')}</Text>
          </View>
          <View style={[styles.metricChip, styles.metricChipAccent]}>
            <Text style={[styles.metricValue, styles.metricValueAccent]}>{insightCount}</Text>
            <Text style={[styles.metricLabel, styles.metricLabelAccent]}>{t('insightsCount')}</Text>
          </View>
        </View>
        <View style={styles.progressSection}>
          <ProgressBar value={0.78} label={t('memoryCoverage')} accentLabel={t('goalCapturesPerDay')} />
          <ProgressBar value={0.64} label={t('captureStreak')} accentLabel={t('daysActive')} />
        </View>
      </PanelCard>

      <PanelCard title={t('quickActions')}>
        <View style={styles.actionsGrid}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onNavigate?.('Capture')}
            style={({ pressed }) => [styles.actionCard, pressed ? styles.actionCardPressed : null]}
          >
            <Text style={styles.actionIcon}>🎤</Text>
            <Text style={styles.actionTitle}>{t('voiceCapture')}</Text>
            <Text style={styles.actionSubtitle}>{t('quickActionVoice')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onNavigate?.('Timeline')}
            style={({ pressed }) => [styles.actionCard, pressed ? styles.actionCardPressed : null]}
          >
            <Text style={styles.actionIcon}>🧵</Text>
            <Text style={styles.actionTitle}>{t('organizeThreads')}</Text>
            <Text style={styles.actionSubtitle}>{t('quickActionOrganize')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onNavigate?.('Search')}
            style={({ pressed }) => [styles.actionCard, pressed ? styles.actionCardPressed : null]}
          >
            <Text style={styles.actionIcon}>⚡</Text>
            <Text style={styles.actionTitle}>{t('autoSummaries')}</Text>
            <Text style={styles.actionSubtitle}>{t('quickActionSummary')}</Text>
          </Pressable>
        </View>
      </PanelCard>

      <Text style={styles.sectionHeading}>{t('recentEvents')}</Text>
      <ListCard
        title={latestEvent?.summary ?? latestEvent?.title ?? t('noRecentCapture')}
        subtitle={t('latestCapture')}
        detail={latestEvent ? t('capturedJustNow') : t('startCapturing')}
      />
      <ListCard
        title={latestInsight?.body ?? latestInsight?.title ?? t('noRecentInsight')}
        subtitle={t('latestInsight')}
        detail={latestInsight ? t('aiSummaryAvailable') : t('insightsAppear')}
      />
    </DataStateScreen>
  );
}

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricChip: {
    flex: 1,
    minWidth: 140,
    borderRadius: 26,
    padding: spacing.md,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  metricChipAccent: {
    backgroundColor: palette.accent,
    borderColor: 'transparent',
  },
  metricValue: {
    color: palette.text,
    fontSize: 26,
    fontWeight: '900',
  },
  metricValueAccent: {
    color: palette.surface,
  },
  metricLabel: {
    marginTop: 8,
    color: palette.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  metricLabelAccent: {
    color: palette.surface,
  },
  progressSection: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionsGrid: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    borderLeftWidth: 4,
    borderLeftColor: palette.accentLight,
    padding: spacing.md,
    gap: spacing.xs,
  },
  actionCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  actionTitle: {
    marginTop: spacing.sm,
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  actionSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeading: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: palette.text,
    fontSize: 17,
    fontWeight: '900',
  },
  cardText: {
    color: palette.text,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
  },
});
