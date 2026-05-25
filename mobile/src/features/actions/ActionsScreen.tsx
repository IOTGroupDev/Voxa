import { Text } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useActionsQuery } from '../../lib/api/hooks';

export function ActionsScreen() {
  const actions = useActionsQuery();
  const items = Array.isArray(actions.data) ? actions.data : [];

  return (
    <DataStateScreen title="Open Loops" isLoading={actions.isLoading} error={actions.error}>
      {items.map((item: { id: string; title: string; completedAt?: string }) => (
        <Text key={item.id}>{item.completedAt ? 'Settled: ' : ''}{item.title}</Text>
      ))}
      {!items.length && !actions.isLoading ? <Text>No open loops surfaced yet</Text> : null}
    </DataStateScreen>
  );
}
