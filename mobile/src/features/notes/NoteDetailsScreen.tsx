import { Text } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useNotesQuery } from '../../lib/api/hooks';

export function NoteDetailsScreen() {
  const notes = useNotesQuery();
  const items = Array.isArray(notes.data) ? notes.data : [];

  return (
    <DataStateScreen title="Notes" isLoading={notes.isLoading} error={notes.error}>
      {items.map((item: { id: string; title?: string; summary?: string }) => (
        <Text key={item.id}>{item.title ?? item.summary ?? item.id}</Text>
      ))}
      {!items.length && !notes.isLoading ? <Text>No memories have been shaped into notes yet</Text> : null}
    </DataStateScreen>
  );
}
