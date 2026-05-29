import { Text, View, StyleSheet } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { EmptyState, ListCard } from '../../app/ui';
import { spacing } from '../../app/theme';

export function RecordingListScreen() {
  const recordings: Array<{ id: string; title: string; duration: string }> = [];

  return (
    <DataStateScreen title="Recordings" isLoading={false} error={null}>
      <View style={styles.list}>
        {recordings.length ? (
          recordings.map((recording) => (
            <ListCard
              key={recording.id}
              title={recording.title}
              subtitle={recording.duration}
              detail="Captured audio item"
            />
          ))
        ) : (
          <EmptyState title="No recordings yet" description="Record an audio capture to build your memory library." />
        )}
      </View>
    </DataStateScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
});

