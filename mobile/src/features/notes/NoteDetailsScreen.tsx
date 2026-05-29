import { View, StyleSheet } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useNotesQuery } from '../../lib/api/hooks';
import { EmptyState, ListCard } from '../../app/ui';
import { spacing } from '../../app/theme';

export function NoteDetailsScreen() {
  const notes = useNotesQuery();
  const items = Array.isArray(notes.data) ? notes.data : [];

  return (
    <DataStateScreen title="Notes" isLoading={notes.isLoading} error={notes.error}>
      <View style={styles.list}>
        {items.map((item: { id: string; title?: string; summary?: string }) => (
          <ListCard
            key={item.id}
            title={item.title ?? item.summary ?? item.id}
            detail={item.summary ?? undefined}
          />
        ))}
        {!items.length && !notes.isLoading ? (
          <EmptyState title="No notes yet" description="Capture more thoughts and Voxa will organize them into notes." />
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
