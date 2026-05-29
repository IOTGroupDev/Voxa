import { View, StyleSheet } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useRemindersQuery } from '../../lib/api/hooks';
import { EmptyState, ListCard } from '../../app/ui';
import { spacing } from '../../app/theme';

export function RemindersScreen() {
  const reminders = useRemindersQuery();
  const items = Array.isArray(reminders.data) ? reminders.data : [];

  return (
    <DataStateScreen title="Reminders" isLoading={reminders.isLoading} error={reminders.error}>
      <View style={styles.list}>
        {items.map((item: { id: string; title: string; remindAt: string }) => (
          <ListCard
            key={item.id}
            title={item.title}
            subtitle={new Date(item.remindAt).toLocaleString()}
            detail="Voxa will surface this reminder when it matters"
          />
        ))}
        {!items.length && !reminders.isLoading ? (
          <EmptyState title="No reminders" description="Capture more memories and useful reminders will appear here." />
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
