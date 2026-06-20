import { View, StyleSheet } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useTranslation } from '../../app/i18n';
import { useNotesQuery } from '../../lib/api/hooks';
import { EmptyState, ListCard } from '../../app/ui';
import { voxaApi } from '../../lib/api/voxa-api';
import { ExportActions } from '../../components/ExportActions';
import { spacing } from '../../app/theme';

export function NoteDetailsScreen() {
  const { t } = useTranslation();
  const notes = useNotesQuery();
  const items = Array.isArray(notes.data) ? notes.data : [];

  return (
    <DataStateScreen title={t('notes')} isLoading={notes.isLoading} error={notes.error}>
      <View style={styles.list}>
        {items.map((item: { id: string; title?: string; summary?: string }) => (
          <View key={item.id} style={styles.noteBlock}>
            <ListCard
              title={item.title ?? item.summary ?? item.id}
              detail={item.summary ?? undefined}
            />
            <ExportActions load={(format) => voxaApi.exportNote(item.id, format)} />
          </View>
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
  noteBlock: {
    gap: spacing.sm,
  },
});
