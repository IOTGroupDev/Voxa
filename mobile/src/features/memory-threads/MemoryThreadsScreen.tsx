import { Text } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useMemoryThreadsQuery } from '../../lib/api/hooks';

export function MemoryThreadsScreen() {
  const threads = useMemoryThreadsQuery();
  const items = Array.isArray(threads.data) ? threads.data : [];

  return (
    <DataStateScreen title="Memory Threads" isLoading={threads.isLoading} error={threads.error}>
      {items.map((item: { id: string; title: string; description?: string }) => (
        <Text key={item.id}>{item.title}{item.description ? ` · ${item.description}` : ''}</Text>
      ))}
      {!items.length && !threads.isLoading ? <Text>No memory threads yet</Text> : null}
    </DataStateScreen>
  );
}

