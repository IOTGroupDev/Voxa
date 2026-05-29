import { View, Text, StyleSheet } from 'react-native';
import { palette, spacing } from './theme';

interface PlaceholderScreenProps {
  title: string;
}

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>This screen is under development. Content will arrive soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: palette.background,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  title: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});

