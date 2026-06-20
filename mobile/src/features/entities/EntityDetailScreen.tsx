import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EntityMention, RelatedEntity } from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useTranslation } from '../../app/i18n';
import { useEntityMemoriesQuery, useEntityQuery, useRelatedEntitiesQuery } from '../../lib/api/hooks';
import { EmptyState } from '../../app/ui';
import { voxaApi } from '../../lib/api/voxa-api';
import { ExportActions } from '../../components/ExportActions';
import { appConfig } from '../../app/config';
import { palette, shadow, spacing } from '../../app/theme';
interface EntityDetailScreenProps {
  entityId: string | null;
  onNavigate: (route: 'Search', question?: string) => void;
  onOpenEntity?: (id: string) => void;
}

export function EntityDetailScreen({ entityId, onNavigate, onOpenEntity }: EntityDetailScreenProps) {
  const { t } = useTranslation();
  const entity = useEntityQuery(entityId);
  const memories = useEntityMemoriesQuery(entityId);
  const related = useRelatedEntitiesQuery(entityId);
  const items = Array.isArray(memories.data) ? memories.data : [];
  const relatedItems = Array.isArray(related.data) ? related.data : [];
  const tasks = items.flatMap((mention) => mention.note?.actionItems ?? mention.memoryEvent?.note?.actionItems ?? mention.recording?.memoryEvent?.note?.actionItems ?? []);
  const reminders = items.flatMap((mention) => mention.note?.reminders ?? mention.memoryEvent?.note?.reminders ?? mention.recording?.memoryEvent?.note?.reminders ?? []);
  const title = entity.data?.name ?? t('objects');

  return (
    <DataStateScreen title={title} isLoading={entity.isLoading || memories.isLoading || related.isLoading} error={entity.error || memories.error || related.error}>
      {entity.data ? (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={[styles.hero, shadow.card]}>
            <View style={styles.heroHeader}>
              <Text style={styles.type}>{entity.data.type}</Text>
              <Text style={styles.count}>{items.length} memories</Text>
            </View>
            <Text style={styles.name}>{entity.data.name}</Text>
            {entity.data.summary ? <Text style={styles.summary}>{entity.data.summary}</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => onNavigate('Search', `What do I know about ${entity.data.name}?`)}
              style={({ pressed }) => [styles.askButton, pressed ? styles.buttonPressed : null]}
            >
              <Text style={styles.askButtonText}>{t('askAboutThis')}</Text>
            </Pressable>
            <ExportActions
              load={(format) => voxaApi.exportEntity(entity.data?.id ?? '', format)}
              disabled={!entity.data?.id}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => onNavigate('Search', `I recorded an update about ${entity.data.name}. What changed?`)}
              style={({ pressed }) => [styles.secondaryButton, pressed ? styles.buttonPressed : null]}
            >
              <Text style={styles.secondaryButtonText}>{t('askAboutUpdates')}</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('relatedObjects')}</Text>
            {relatedItems.map((item) => (
              <RelatedCard key={item.relation.id} item={item} onPress={() => onOpenEntity?.(item.entity.id)} />
            ))}
            {!relatedItems.length && !related.isLoading ? (
              <EmptyState title={t('relatedObjectsEmpty')} description={t('relatedObjectsEmptyDescription')} />
            ) : null}
          </View>

          {(tasks.length || reminders.length) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('tasksAndReminders')}</Text>
              {tasks.map((task) => (
                <View key={`task-${task.id}`} style={styles.mentionCard}>
                  <Text style={styles.mentionType}>{t('task')}</Text>
                  <Text style={styles.mentionTitle}>{task.title}</Text>
                </View>
              ))}
              {reminders.map((reminder) => (
                <View key={`reminder-${reminder.id}`} style={styles.mentionCard}>
                  <Text style={styles.mentionType}>{t('reminder')}</Text>
                  <Text style={styles.mentionTitle}>{reminder.title}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('sourceDetails')}</Text>
            {items.map((mention) => (
              <MentionCard key={mention.id} mention={mention} />
            ))}
            {!items.length && !memories.isLoading ? (
              <EmptyState title={t('objectsNoMemories')} description={t('objectsNoMemoriesDescription')} />
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </DataStateScreen>
  );
}

function RelatedCard({ item, onPress }: { item: RelatedEntity; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.relatedCard, pressed ? styles.buttonPressed : null]}
    >
      <View style={styles.mentionHeader}>
        <Text style={styles.mentionType}>{formatRelationType(item.relation.relationType)}</Text>
        {appConfig.enableDeveloperMode ? (
          <Text style={styles.mentionDate}>{Math.round(item.relation.confidence * 100)}%</Text>
        ) : null}
      </View>
      <Text style={styles.mentionTitle}>{item.entity.name}</Text>
      {item.entity.summary ? <Text style={styles.mentionBody} numberOfLines={2}>{item.entity.summary}</Text> : null}
    </Pressable>
  );
}

function MentionCard({ mention }: { mention: EntityMention }) {
  const title =
    mention.memoryEvent?.title ??
    mention.memoryEvent?.summary ??
    mention.note?.title ??
    mention.note?.summary ??
    mention.recording?.memoryEvent?.title ??
    mention.recording?.memoryEvent?.summary ??
    mention.recording?.transcript?.text ??
    mention.transcript?.text ??
    'Memory';
  const body =
    mention.note?.body ??
    mention.note?.summary ??
    mention.transcript?.text ??
    mention.memoryEvent?.summary ??
    mention.recording?.memoryEvent?.note?.body ??
    mention.recording?.memoryEvent?.note?.summary ??
    mention.recording?.transcript?.text;

  return (
    <View style={styles.mentionCard}>
      <View style={styles.mentionHeader}>
        <Text style={styles.mentionType}>{mention.memoryEvent?.type ?? mention.recording?.status ?? 'memory'}</Text>
        <Text style={styles.mentionDate}>{formatDate(mention.createdAt)}</Text>
      </View>
      <Text style={styles.mentionTitle} numberOfLines={2}>{title}</Text>
      {body ? <Text style={styles.mentionBody} numberOfLines={4}>{body}</Text> : null}
      {mention.note?.actionItems?.length ? (
        <Text style={styles.mentionMeta}>{mention.note.actionItems.length} tasks</Text>
      ) : null}
      {mention.note?.reminders?.length ? (
        <Text style={styles.mentionMeta}>{mention.note.reminders.length} reminders</Text>
      ) : null}
    </View>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatRelationType(value: string) {
  return value.replace(/_/g, ' ');
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
  heroHeader: {
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
  count: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  name: {
    color: palette.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  summary: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  askButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  askButtonText: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  exportActions: {
    gap: spacing.sm,
  },
  buttonPressed: {
    opacity: 0.84,
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
  mentionCard: {
    gap: spacing.xs,
    borderRadius: 8,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.md,
  },
  relatedCard: {
    gap: spacing.xs,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.md,
  },
  mentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  mentionType: {
    color: palette.success,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  mentionDate: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  mentionTitle: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  mentionBody: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  mentionMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});
