import { StyleSheet, View } from 'react-native';
import { ExportFormat, ExportResponse } from '../lib/api/voxa-api';
import { copyExport, shareExport } from '../lib/export/share-export';
import { ActionButton } from '../app/ui';
import { spacing } from '../app/theme';

interface ExportActionsProps {
  load: (format: ExportFormat) => Promise<ExportResponse>;
  disabled?: boolean;
  shareLabel?: string;
}

export function ExportActions({ load, disabled, shareLabel = 'Share' }: ExportActionsProps) {
  return (
    <View style={styles.actions}>
      <ActionButton title={shareLabel} onPress={() => shareExport(load)} disabled={disabled} variant="secondary" />
      <ActionButton title="Copy text" onPress={() => copyExport(load, 'text')} disabled={disabled} variant="secondary" />
      <ActionButton title="Copy markdown" onPress={() => copyExport(load, 'markdown')} disabled={disabled} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
});
