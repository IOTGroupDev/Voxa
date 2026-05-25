import { Text } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useRemindersQuery } from '../../lib/api/hooks';

export function RemindersScreen() {
  const reminders = useRemindersQuery();
  const items = Array.isArray(reminders.data) ? reminders.data : [];

  return (
    <DataStateScreen title="Gentle Resurfacing" isLoading={reminders.isLoading} error={reminders.error}>
      {items.map((item: { id: string; title: string; remindAt: string }) => (
        <Text key={item.id}>{item.title} · {new Date(item.remindAt).toLocaleString()}</Text>
      ))}
      {!items.length && !reminders.isLoading ? <Text>Nothing needs to resurface right now</Text> : null}
    </DataStateScreen>
  );
}
