import { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { palette, shadow, spacing } from './theme';

interface DataStateScreenProps {
  title: string;
  isLoading: boolean;
  error: unknown;
  children: ReactNode;
}

export function DataStateScreen({ title, isLoading, error, children }: DataStateScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.card, shadow.card]}>
        <View style={styles.cardAccent} />
        <Text style={styles.title}>{title}</Text>
        {isLoading ? <ActivityIndicator color={palette.accentStrong} style={styles.indicator} /> : null}
        {error ? (
          <Text style={styles.error}>
            {typeof error === 'string'
              ? error
              : error instanceof Error
              ? error.message
              : 'Unable to load data'}
          </Text>
        ) : null}
        <View style={styles.content}>{children}</View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: 0,
    alignItems: 'stretch',
    backgroundColor: palette.backgroundSoft,
  },
  card: {
    width: '100%',
    borderRadius: 32,
    padding: spacing.lg,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 8,
  },
  cardAccent: {
    height: 6,
    marginBottom: spacing.sm,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: palette.accentLight,
  },
  title: {
    marginBottom: spacing.md,
    color: palette.text,
    fontSize: 30,
    fontWeight: '900',
  },
  indicator: {
    marginVertical: spacing.sm,
  },
  error: {
    marginBottom: spacing.sm,
    color: palette.danger,
    fontSize: 14,
  },
  content: {
    gap: spacing.md,
  },
});

