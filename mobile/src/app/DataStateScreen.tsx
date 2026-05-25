import { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

interface DataStateScreenProps {
  title: string;
  isLoading: boolean;
  error: unknown;
  children: ReactNode;
}

export function DataStateScreen({ title, isLoading, error, children }: DataStateScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {isLoading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>Unable to load data</Text> : null}
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    marginBottom: 16,
    color: '#111827',
    fontSize: 24,
    fontWeight: '600',
  },
  error: {
    marginBottom: 12,
    color: '#b91c1c',
    fontSize: 14,
  },
  content: {
    gap: 12,
  },
});

