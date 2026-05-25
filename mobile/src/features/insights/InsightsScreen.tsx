import { Text } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useInsightsQuery } from '../../lib/api/hooks';

export function InsightsScreen() {
  const insights = useInsightsQuery();
  const items = Array.isArray(insights.data) ? insights.data : [];

  return (
    <DataStateScreen title="Insights" isLoading={insights.isLoading} error={insights.error}>
      {items.map((item: { id: string; title: string; body: string }) => (
        <Text key={item.id}>{item.title} · {item.body}</Text>
      ))}
      {!items.length && !insights.isLoading ? <Text>No insights yet</Text> : null}
    </DataStateScreen>
  );
}

