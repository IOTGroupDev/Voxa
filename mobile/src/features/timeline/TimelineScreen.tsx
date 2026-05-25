import { Text } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useTimelineQuery } from '../../lib/api/hooks';

export function TimelineScreen() {
  const timeline = useTimelineQuery();
  const items = Array.isArray(timeline.data) ? timeline.data : [];

  return (
    <DataStateScreen title="Timeline" isLoading={timeline.isLoading} error={timeline.error}>
      {items.map((item: { id: string; title?: string; summary?: string; occurredAt?: string }) => (
        <Text key={item.id}>{item.title ?? item.summary ?? item.occurredAt ?? item.id}</Text>
      ))}
      {!items.length && !timeline.isLoading ? <Text>Your memory timeline will form quietly as you capture thoughts</Text> : null}
    </DataStateScreen>
  );
}
