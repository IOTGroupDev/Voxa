import { Text, View, StyleSheet } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { PanelCard, EmptyState } from '../../app/ui';
import { spacing, palette } from '../../app/theme';

export function MemoryEventDetailsScreen() {
  const detailsAvailable = false;

  return (
    <DataStateScreen title="Memory Event" isLoading={false} error={null}>
      {detailsAvailable ? (
        <PanelCard title="Memory event details" subtitle="Deep context from your latest capture">
          <Text style={styles.body}>Full event details will be shown here once a memory is selected.</Text>
        </PanelCard>
      ) : (
        <EmptyState title="No event selected" description="Open a memory from the timeline to inspect its details." />
      )}
    </DataStateScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
  },
});

