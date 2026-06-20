import { View, StyleSheet } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useTranslation } from '../../app/i18n';
import { useInsightsQuery } from '../../lib/api/hooks';
import { EmptyState, ListCard } from '../../app/ui';
import { spacing } from '../../app/theme';

export function InsightsScreen() {
  const { t } = useTranslation();
  const insights = useInsightsQuery();
  const items = Array.isArray(insights.data) ? insights.data : [];

  return (
    <DataStateScreen title={t('insights')} isLoading={insights.isLoading} error={insights.error}>
      <View style={styles.list}>
        {items.map((item: { id: string; title: string; body: string }) => (
          <ListCard key={item.id} title={item.title} detail={item.body} />
        ))}
        {!items.length && !insights.isLoading ? (
          <EmptyState title="No insights yet" description="Capture more moments and insights will appear here." />
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
