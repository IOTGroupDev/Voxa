import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton } from '../app/ui';
import { palette, spacing } from '../app/theme';

interface MemoryEditorModalProps {
  visible: boolean;
  title: string;
  value: string;
  placeholder: string;
  isSaving?: boolean;
  onChangeText: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function MemoryEditorModal({
  visible,
  title,
  value,
  placeholder,
  isSaving,
  onChangeText,
  onCancel,
  onSave,
}: MemoryEditorModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={palette.muted}
            multiline
            style={styles.input}
          />
          <View style={styles.actions}>
            <ActionButton title="Cancel" onPress={onCancel} variant="secondary" />
            <ActionButton title="Save" onPress={onSave} disabled={isSaving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: palette.overlay,
  },
  dialog: {
    width: '100%',
    gap: spacing.md,
    borderRadius: 18,
    padding: spacing.lg,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  title: {
    color: palette.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  input: {
    minHeight: 140,
    borderRadius: 16,
    padding: spacing.md,
    color: palette.text,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    textAlignVertical: 'top',
    fontSize: 15,
    lineHeight: 21,
  },
  actions: {
    gap: spacing.sm,
  },
});
