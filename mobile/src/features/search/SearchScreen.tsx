import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useSearchQuery } from '../../lib/api/hooks';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const search = useSearchQuery(query);
  const results = isSearchResult(search.data) ? search.data.results : [];

  return (
    <DataStateScreen title="Search Memory" isLoading={search.isLoading} error={search.error}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Find a memory or recurring thought"
        style={styles.input}
        autoCorrect
      />
      <View style={styles.results}>
        {results.map((result, index) => (
          <Text key={`${result.type}-${index}`}>{describeResult(result)}</Text>
        ))}
        {query.trim() && !results.length && !search.isLoading ? <Text>No matching memories yet</Text> : null}
      </View>
    </DataStateScreen>
  );
}

type SearchResult = {
  type: string;
  item: {
    title?: string | null;
    summary?: string | null;
    body?: string | null;
    id: string;
  };
};

function isSearchResult(value: unknown): value is { results: SearchResult[] } {
  return Boolean(value && typeof value === 'object' && 'results' in value);
}

function describeResult(result: SearchResult): string {
  return result.item.title ?? result.item.summary ?? result.item.body ?? result.item.id;
}

const styles = StyleSheet.create({
  input: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#9ca3af',
    borderRadius: 6,
    paddingHorizontal: 12,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  results: {
    gap: 10,
  },
});
