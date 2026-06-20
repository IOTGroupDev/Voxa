import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { DataStateScreen } from '../../app/DataStateScreen';
import { useTranslation } from '../../app/i18n';
import { useAskMutation } from '../../lib/api/hooks';
import { AskSource, voxaApi } from '../../lib/api/voxa-api';
import { ExpoAudioRecorder } from '../../lib/audio/expo-audio-recorder';
import { RecordingSession } from '../../lib/audio/recording-session';
import { SearchInput } from '../../app/ui';
import { palette, spacing } from '../../app/theme';

export function SearchScreen({ initialQuestion }: { initialQuestion?: string }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [voiceCapture, setVoiceCapture] = useState<{
    recorder: ExpoAudioRecorder;
    session: RecordingSession;
  } | null>(null);
  const ask = useAskMutation();
  const isListening = Boolean(voiceCapture);
  const canAsk = query.trim().length > 0 && !ask.isPending && !isVoiceLoading;

  useEffect(() => {
    if (initialQuestion) {
      setQuery(initialQuestion);
    }
  }, [initialQuestion]);

  function submitQuestion(nextQuestion = query) {
    const question = nextQuestion.trim();
    if (!question || ask.isPending) return;

    setQuery(question);
    ask.mutate(question);
  }

  async function handleVoiceAskPress() {
    if (isVoiceLoading) return;
    setVoiceError(null);

    if (!voiceCapture) {
      setIsVoiceLoading(true);
      try {
        const recorder = new ExpoAudioRecorder();
        const session = await recorder.start();
        setVoiceCapture({ recorder, session });
      } catch (error) {
        setVoiceError(error instanceof Error ? error.message : t('askVoiceStartFailed'));
      } finally {
        setIsVoiceLoading(false);
      }
      return;
    }

    setIsVoiceLoading(true);
    try {
      const completedSession = await voiceCapture.recorder.stop(voiceCapture.session.id);
      setVoiceCapture(null);

      if (!completedSession.localUri) {
        throw new Error(t('askVoiceEmpty'));
      }
      if ((completedSession.durationMs ?? 0) > MAX_VOICE_ASK_DURATION_MS) {
        throw new Error(t('askVoiceTooLong'));
      }

      const audioBase64 = await FileSystem.readAsStringAsync(completedSession.localUri, {
        encoding: 'base64' as any,
      });
      if (getBase64SizeBytes(audioBase64) > MAX_VOICE_ASK_BYTES) {
        throw new Error(t('askVoiceTooLong'));
      }
      const result = await voxaApi.transcribeAskAudio({
        audioBase64,
        mimeType: 'audio/mp4',
        durationMs: completedSession.durationMs,
      });
      submitQuestion(result.text);
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : t('askVoiceFailed'));
      setVoiceCapture(null);
    } finally {
      setIsVoiceLoading(false);
    }
  }

  return (
    <DataStateScreen title={t('askTitle')} isLoading={false} error={null}>
      <View style={styles.askSurface}>
        <View style={styles.askInputRow}>
          <View style={styles.askInput}>
            <SearchInput
              value={query}
              onChangeText={setQuery}
              placeholder={isListening ? t('askListening') : t('askPlaceholder')}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('askSubmit')}
            onPress={() => submitQuestion()}
            disabled={!canAsk}
            style={[styles.askButton, !canAsk ? styles.askButtonDisabled : null]}
          >
            <Text style={styles.askButtonText}>{t('askSubmit')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isListening ? t('askStopVoice') : t('askStartVoice')}
            onPress={handleVoiceAskPress}
            disabled={isVoiceLoading}
            style={[
              styles.voiceButton,
              isListening ? styles.voiceButtonListening : null,
              isVoiceLoading ? styles.voiceButtonDisabled : null,
            ]}
          >
            <Text style={styles.voiceButtonText}>{isListening ? '■' : '●'}</Text>
          </Pressable>
        </View>
        {voiceError ? <Text style={styles.errorText}>{voiceError}</Text> : null}
        {ask.error ? (
          <Text style={styles.errorText}>{ask.error instanceof Error ? ask.error.message : t('askFailed')}</Text>
        ) : null}
        {!query.trim() ? (
          <View style={styles.promptList}>
            <Text style={styles.emptyPrompt}>{t('askEmptyPrompt')}</Text>
            <PromptButton label={t('askExampleOne')} onPress={() => submitQuestion(t('askExampleOne'))} />
            <PromptButton label={t('askExampleTwo')} onPress={() => submitQuestion(t('askExampleTwo'))} />
            <PromptButton label={t('askExampleThree')} onPress={() => submitQuestion(t('askExampleThree'))} />
          </View>
        ) : null}
      </View>
      {ask.isPending ? (
        <View style={styles.answerCard}>
          <Text style={styles.answerLabel}>{t('askAnswer')}</Text>
          <Text style={styles.answerText}>{t('askThinking')}</Text>
        </View>
      ) : null}
      {ask.data ? (
        <View style={styles.results}>
          <View style={styles.answerCard}>
            <Text style={styles.answerLabel}>{t('askAnswer')}</Text>
            <Text style={styles.answerText}>{ask.data.answer}</Text>
          </View>
          {ask.data.sources.length ? (
            <View style={styles.sourcesBlock}>
              <Text style={styles.sectionTitle}>{t('askSources')}</Text>
              {ask.data.sources.map((source) => (
                <SourceCard key={`${source.type}-${source.id}`} source={source} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyResult}>
              <Text style={styles.emptyResultTitle}>{t('askNoResults')}</Text>
              <Text style={styles.emptyResultText}>{t('askNoResultsDescription')}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptySpace} />
      )}
    </DataStateScreen>
  );
}

const MAX_VOICE_ASK_DURATION_MS = 30_000;
const MAX_VOICE_ASK_BYTES = 8 * 1024 * 1024;

function getBase64SizeBytes(value: string) {
  return Math.ceil(value.trim().length * 0.75);
}

function PromptButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.prompt}>
      <Text style={styles.promptText}>{label}</Text>
    </Pressable>
  );
}

function SourceCard({ source }: { source: AskSource }) {
  const { t } = useTranslation();

  return (
    <View style={styles.sourceCard}>
      <View style={styles.sourceHeader}>
        <Text style={styles.sourceType}>{formatSourceType(source.type, t)}</Text>
        <Text style={styles.sourceDate}>{formatSourceDate(source.createdAt)}</Text>
      </View>
      {source.title ? <Text style={styles.sourceTitle}>{source.title}</Text> : null}
      <Text style={styles.sourceSnippet}>{source.snippet}</Text>
    </View>
  );
}

type Translate = ReturnType<typeof useTranslation>['t'];

function formatSourceType(type: string, t: Translate) {
  switch (type) {
    case 'note':
    case 'transcript':
    case 'memory_event':
      return t('memorySource');
    case 'task':
      return t('task');
    case 'reminder':
      return t('reminder');
    default:
      return type;
  }
}

function formatSourceDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

const styles = StyleSheet.create({
  results: {
    gap: spacing.sm,
  },
  askSurface: {
    gap: spacing.sm,
  },
  askInputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  askInput: {
    flex: 1,
  },
  askButton: {
    minWidth: 62,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.text,
    paddingHorizontal: spacing.md,
  },
  askButtonDisabled: {
    opacity: 0.4,
  },
  askButtonText: {
    color: palette.background,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  emptySpace: {
    minHeight: 1,
  },
  voiceButton: {
    width: 56,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.success,
  },
  voiceButtonListening: {
    backgroundColor: palette.danger,
  },
  voiceButtonDisabled: {
    opacity: 0.62,
  },
  voiceButtonText: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  errorText: {
    marginTop: spacing.sm,
    color: palette.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  promptList: {
    gap: spacing.sm,
  },
  emptyPrompt: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  prompt: {
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: palette.surfaceSoft,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  promptText: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  answerCard: {
    gap: spacing.sm,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
  },
  answerLabel: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  answerText: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  sourcesBlock: {
    gap: spacing.sm,
  },
  emptyResult: {
    gap: spacing.xs,
    borderRadius: 8,
    backgroundColor: palette.surfaceSoft,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
  },
  emptyResultTitle: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  emptyResultText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  sourceCard: {
    gap: spacing.xs,
    borderRadius: 8,
    backgroundColor: palette.surfaceSoft,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sourceType: {
    color: palette.success,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sourceDate: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  sourceTitle: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  sourceSnippet: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
