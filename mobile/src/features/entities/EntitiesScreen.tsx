import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Entity, EntityType, MemoryHistoryItem } from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useTranslation } from '../../app/i18n';
import { useEntitiesQuery, useMemoryHistoryQuery } from '../../lib/api/hooks';
import { EmptyState, SearchInput } from '../../app/ui';
import { palette, shadow, spacing } from '../../app/theme';
import { MemoryCalendar } from './MemoryCalendar';

interface EntitiesScreenProps {
  onOpenEntity: (id: string) => void;
  onOpenRecording?: (id: string) => void;
}

export function EntitiesScreen({ onOpenEntity, onOpenRecording }: EntitiesScreenProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MemoryFilter>('all');
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const entities = useEntitiesQuery();
  const selectedMonth = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const monthFrom = formatIsoDate(selectedMonth);
  const monthTo = formatIsoDate(addMonths(selectedMonth, 1));
  const history = useMemoryHistoryQuery({ from: monthFrom, to: monthTo, limit: 500 });
  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (Array.isArray(entities.data) ? entities.data : []).filter((entity) => {
      const matchesFilter = filter === 'all' || normalizeEntityType(entity.type) === filter;
      const matchesQuery =
        !normalizedQuery ||
        entity.name.toLowerCase().includes(normalizedQuery) ||
        (entity.summary ?? '').toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [entities.data, filter, query]);
  const historyDays = history.data?.days ?? [];
  const savedMemories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const day = historyDays.find((item) => item.date === formatIsoDate(selectedDate));
    const memories = day?.memories ?? [];
    const filtered = normalizedQuery
      ? memories.filter((item) => {
          const searchable = [
            item.title,
            item.summary,
            item.type,
          ].filter(Boolean).join(' ').toLowerCase();

          return searchable.includes(normalizedQuery);
        })
      : memories;

    return [...filtered].sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime());
  }, [historyDays, query, selectedDate]);
  const canGoNextMonth = startOfMonth(new Date()) > selectedMonth;
  const hasAnyMemory = Boolean(history.data?.hasAnyMemory);
  const showGlobalEmptyState = filter === 'all' && !items.length && !hasAnyMemory && !entities.isLoading && !history.isLoading;
  const dayTitle = formatDayTitle(selectedDate);

  return (
    <DataStateScreen title={t('memory')} isLoading={entities.isLoading || history.isLoading} error={entities.error || history.error}>
      <View style={styles.list}>
        <SearchInput value={query} onChangeText={setQuery} placeholder={t('searchMemoryObjects')} />
        <View style={styles.filters}>
          {MEMORY_FILTERS.map((item) => (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              onPress={() => setFilter(item.value)}
              style={[styles.filterPill, filter === item.value ? styles.filterPillActive : null]}
            >
              <Text style={[styles.filterText, filter === item.value ? styles.filterTextActive : null]}>{t(item.labelKey)}</Text>
            </Pressable>
          ))}
        </View>
        {items.map((entity) => (
          <EntityCard key={entity.id} entity={entity} onPress={() => onOpenEntity(entity.id)} />
        ))}
        {!items.length && filter !== 'all' && !entities.isLoading ? (
          <EmptyState title={t('objectsEmpty')} description={t('objectsEmptyDescription')} />
        ) : null}

        {filter === 'all' && !showGlobalEmptyState ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('savedMemories')}</Text>
              <MemoryCalendar
                month={selectedMonth}
                selectedDate={selectedDate}
                days={historyDays}
                canGoNextMonth={canGoNextMonth}
                labels={{
                  today: t('today'),
                  previousMonth: t('previousMonth'),
                  nextMonth: t('nextMonth'),
                  currentMonth: t('currentMonth'),
                }}
                onSelectDate={setSelectedDate}
                onPreviousMonth={() => setSelectedDate((current) => shiftSelectedMonth(current, -1))}
                onNextMonth={() => setSelectedDate((current) => shiftSelectedMonth(current, 1))}
                onToday={() => setSelectedDate(startOfDay(new Date()))}
              />
            </View>
            <Text style={styles.dayTitle}>{dayTitle}</Text>
            {savedMemories.length ? (
              savedMemories.map((item) => (
                <SavedMemoryCard
                  key={item.id}
                  item={item}
                  onPress={item.recordingId ? () => onOpenRecording?.(item.recordingId ?? '') : undefined}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>{t('noMemoriesCapturedOnDay')}</Text>
            )}
          </View>
        ) : null}

        {showGlobalEmptyState ? (
          <EmptyState title={t('memoryEmpty')} description={t('memoryEmptyDescription')} />
        ) : null}
      </View>
    </DataStateScreen>
  );
}

type MemoryFilter = 'all' | EntityType;

const MEMORY_FILTERS: Array<{ value: MemoryFilter; labelKey: 'filterAll' | 'filterProjects' | 'filterPeople' | 'filterPlaces' | 'filterHealth' | 'filterDevices' | 'filterHome' | 'filterVehicles' | 'filterPets' | 'filterIdeas' | 'filterOrganizations' | 'filterOther' }> = [
  { value: 'all', labelKey: 'filterAll' },
  { value: 'project', labelKey: 'filterProjects' },
  { value: 'person', labelKey: 'filterPeople' },
  { value: 'place', labelKey: 'filterPlaces' },
  { value: 'health', labelKey: 'filterHealth' },
  { value: 'device', labelKey: 'filterDevices' },
  { value: 'home', labelKey: 'filterHome' },
  { value: 'vehicle', labelKey: 'filterVehicles' },
  { value: 'pet', labelKey: 'filterPets' },
  { value: 'idea', labelKey: 'filterIdeas' },
  { value: 'organization', labelKey: 'filterOrganizations' },
  { value: 'other', labelKey: 'filterOther' },
];

function EntityCard({ entity, onPress }: { entity: Entity; onPress: () => void }) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadow.soft, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{entity.name}</Text>
        <Text style={styles.type}>{formatEntityType(entity.type)}</Text>
      </View>
      {entity.summary ? <Text style={styles.summary} numberOfLines={3}>{entity.summary}</Text> : null}
      <View style={styles.footer}>
        <Text style={styles.meta}>{entity.mentionsCount ?? 0} {t('memoriesLabel')}</Text>
        <Text style={styles.meta}>{entity.latestActivity ? formatDate(entity.latestActivity) : ''}</Text>
      </View>
    </Pressable>
  );
}

function SavedMemoryCard({ item, onPress }: { item: MemoryHistoryItem; onPress?: () => void }) {
  const { t } = useTranslation();
  const title = item.title ?? item.summary ?? t('memoryFallback');
  const summary = item.summary;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadow.soft, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2}>{title}</Text>
        <Text style={styles.type}>{formatDate(item.occurredAt)}</Text>
      </View>
      <Text style={styles.meta}>{formatTime(item.occurredAt)}</Text>
      {summary ? <Text style={styles.summary} numberOfLines={3}>{summary}</Text> : null}
    </Pressable>
  );
}

function formatEntityType(type: string) {
  return type.replace(/_/g, ' ');
}

function normalizeEntityType(type: string): EntityType {
  const normalized = type.trim().toLowerCase();
  if (isEntityType(normalized)) {
    return normalized;
  }

  return 'other';
}

function isEntityType(value: string): value is EntityType {
  return [
    'person',
    'project',
    'vehicle',
    'pet',
    'health',
    'place',
    'device',
    'home',
    'idea',
    'organization',
    'other',
  ].includes(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfMonth(date: Date) {
  const next = new Date(date);
  next.setDate(1);
  return startOfDay(next);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months, 1);
  return startOfDay(next);
}

function shiftSelectedMonth(date: Date, months: number) {
  const targetMonth = addMonths(startOfMonth(date), months);
  const maxDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(date.getDate(), maxDay));
}

function formatDayTitle(date: Date) {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sectionHeader: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  dayTitle: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  todayButton: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  todayButtonActive: {
    backgroundColor: palette.success,
    borderColor: palette.success,
  },
  todayButtonText: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  todayButtonTextActive: {
    color: palette.text,
  },
  emptyText: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterPill: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingHorizontal: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: palette.success,
    borderColor: palette.success,
  },
  filterText: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  filterTextActive: {
    color: palette.text,
  },
  card: {
    gap: spacing.sm,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.md,
  },
  cardPressed: {
    opacity: 0.86,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    color: palette.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  type: {
    color: palette.success,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summary: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  meta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});
