import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useSearchQuery } from '../../lib/api/hooks';
import { EmptyState, ListCard, PanelCard, SearchInput } from '../../app/ui';
import { spacing } from '../../app/theme';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const search = useSearchQuery(query);
  const results = isSearchResult(search.data) ? search.data.results : [];

  return (
    <DataStateScreen title="Search" isLoading={search.isLoading} error={search.error}>
      <PanelCard title="Search your memory">
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Find a memory or recurring thought"
        />
      </PanelCard>
      {query.trim() ? (
        <View style={styles.results}>
          {results.map((result, index) => (
            <ListCard
              key={`${result.type}-${index}`}
              title={result.item.title ?? result.item.summary ?? result.item.body ?? result.item.id}
              subtitle={result.type}
            />
          ))}
          {query.trim() && !results.length && !search.isLoading ? (
            <EmptyState title="No matching memories" description="Try another keyword or browse the timeline." />
          ) : null}
        </View>
      ) : (
        <PanelCard title="Search tips" subtitle="Use broad keywords like meeting, idea, task or voice note for faster results.">
          <Text style={styles.item}>Try keywords like "meeting", "idea", "task" or "voice note" to broaden results.</Text>
        </PanelCard>
      )}
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

const styles = StyleSheet.create({
  results: {
    gap: spacing.sm,
  },
  item: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
  },
});
