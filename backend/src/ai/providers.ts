import { MemoryEventType } from '@voxa/shared';

export interface SpeechToTextProviderInput {
  recordingId: string;
  storagePath: string;
  signedUrl?: string;
  mimeType?: string | null;
  durationMs?: number | null;
}

export interface SpeechToTextProvider {
  transcribe(input: SpeechToTextProviderInput): Promise<{ text: string; provider: string; language?: string }>;
}

export interface SummaryProvider {
  summarize(input: { transcript: string }): Promise<{ title: string; summary: string; tags: string[] }>;
}

export interface EmbeddingProvider {
  embed(input: { text: string }): Promise<{ vector: number[] }>;
}

export interface ActionExtractionProvider {
  extractActions(input: { text: string }): Promise<Array<{ title: string; dueAt?: string }>>;
}

export interface ReminderSuggestionProvider {
  suggestReminders(input: { text: string }): Promise<Array<{ title: string; remindAt: string }>>;
}

export interface EventClassificationProvider {
  classify(input: { text: string }): Promise<{ type: MemoryEventType; confidence: number }>;
}

export interface InsightGenerationProvider {
  generateInsight(input: {
    memoryThreadId: string;
    recentNoteSummaries: string[];
  }): Promise<{ title: string; body: string; importanceScore: number } | null>;
}
