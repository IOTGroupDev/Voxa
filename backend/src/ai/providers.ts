import { MemoryEventType } from '@voxa/shared';

export interface SpeechToTextProvider {
  transcribe(input: { recordingId: string; storagePath: string }): Promise<{ text: string }>;
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

