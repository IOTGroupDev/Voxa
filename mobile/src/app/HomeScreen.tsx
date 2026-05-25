import { Text } from 'react-native';
import { useInsightsQuery, useMemoryThreadsQuery, useTimelineQuery } from '../lib/api/hooks';
import { DataStateScreen } from './DataStateScreen';

export function HomeScreen() {
  const timeline = useTimelineQuery();
  const threads = useMemoryThreadsQuery();
  const insights = useInsightsQuery();
  const latestEvent = Array.isArray(timeline.data) ? timeline.data[0] as { title?: string; summary?: string } | undefined : undefined;
  const latestThread = Array.isArray(threads.data) ? threads.data[0] as { title?: string } | undefined : undefined;
  const latestInsight = Array.isArray(insights.data) ? insights.data[0] as { title?: string; body?: string } | undefined : undefined;

  return (
    <DataStateScreen
      title="Home"
      isLoading={timeline.isLoading || threads.isLoading || insights.isLoading}
      error={timeline.error || threads.error || insights.error}
    >
      <Text>{latestEvent?.summary ?? latestEvent?.title ?? 'Capture a thought when it appears.'}</Text>
      <Text>{latestThread?.title ? `Returning thread: ${latestThread.title}` : 'Threads will emerge quietly over time.'}</Text>
      <Text>{latestInsight?.body ?? latestInsight?.title ?? 'Insights stay rare and contextual.'}</Text>
    </DataStateScreen>
  );
}
