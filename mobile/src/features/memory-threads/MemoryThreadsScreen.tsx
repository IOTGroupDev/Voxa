import { View, StyleSheet } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useTranslation } from '../../app/i18n';
import { useMemoryThreadsQuery } from '../../lib/api/hooks';
import { EmptyState, ListCard } from '../../app/ui';
import { spacing } from '../../app/theme';

export function MemoryThreadsScreen() {
  const { t } = useTranslation();
  const threads = useMemoryThreadsQuery();
  const items = Array.isArray(threads.data) ? threads.data : [];

  return (
    <DataStateScreen title={t('threads')} isLoading={threads.isLoading} error={threads.error}>
      <View style={styles.list}>
        {items.map((item: { id: string; title: string; description?: string }) => (
          <ListCard
            key={item.id}
            title={item.title}
            detail={item.description ?? 'No description available'}
          />
        ))}
        {!items.length && !threads.isLoading ? (
          <EmptyState title="No memory threads" description="Threads appear as Voxa learns from your captures." />
        ) : null}
      </View>
    </DataStateScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
});
