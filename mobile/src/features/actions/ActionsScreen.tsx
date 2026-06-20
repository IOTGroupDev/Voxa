import { View, StyleSheet } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useTranslation } from '../../app/i18n';
import { useActionsQuery } from '../../lib/api/hooks';
import { EmptyState, ListCard } from '../../app/ui';
import { spacing } from '../../app/theme';

export function ActionsScreen() {
  const { t } = useTranslation();
  const actions = useActionsQuery();
  const items = Array.isArray(actions.data) ? actions.data : [];

  return (
    <DataStateScreen title={t('actions')} isLoading={actions.isLoading} error={actions.error}>
      <View style={styles.list}>
        {items.map((item: { id: string; title: string; completedAt?: string }) => (
          <ListCard
            key={item.id}
            title={item.title}
            subtitle={item.completedAt ? 'Settled' : 'Open'}
            detail={item.completedAt ? `Completed at ${new Date(item.completedAt).toLocaleString()}` : 'Waiting to be resolved'}
          />
        ))}
        {!items.length && !actions.isLoading ? (
          <EmptyState title="No open loops" description="You can capture events and Voxa will surface actions here." />
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
