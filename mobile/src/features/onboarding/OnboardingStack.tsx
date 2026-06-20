import { ReactNode, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AiProcessingMode, AudioRetentionMode, TranscriptRetentionMode } from '@voxa/shared';
import { appConfig } from '../../app/config';
import { supportedLanguages, languageLabels, useTranslation } from '../../app/i18n';
import { ActionButton } from '../../app/ui';
import { palette, spacing } from '../../app/theme';
import { usePrivacySettingsQuery, useUpdatePrivacySettingsMutation } from '../../lib/api/hooks';
import { useLanguageStore } from '../../state/language.store';

type OnboardingStep =
  | 'welcome'
  | 'how'
  | 'permissions'
  | 'language'
  | 'privacy'
  | 'first_capture'
  | 'dongle';

interface OnboardingStackProps {
  onComplete: () => void;
}

export function OnboardingStack({ onComplete }: OnboardingStackProps) {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const privacy = usePrivacySettingsQuery();
  const updatePrivacy = useUpdatePrivacySettingsMutation();
  const steps = useMemo<OnboardingStep[]>(
    () => [
      'welcome',
      'how',
      'permissions',
      'language',
      'privacy',
      'first_capture',
      ...(appConfig.enableDongleMode ? (['dongle'] as const) : []),
    ],
    [],
  );
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  function goNext() {
    if (isLast) {
      onComplete();
      return;
    }

    setIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function skip() {
    onComplete();
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>Voxa</Text>
        <Text style={styles.progress}>{index + 1} / {steps.length}</Text>
      </View>

      <View style={styles.content}>
        {step === 'welcome' ? (
          <OnboardingPanel title={t('onboardingWelcomeTitle')} />
        ) : null}

        {step === 'how' ? (
          <OnboardingPanel
            title={t('onboardingHowTitle')}
            body={t('onboardingHowBody')}
          />
        ) : null}

        {step === 'permissions' ? (
          <OnboardingPanel title={t('onboardingPermissionsTitle')}>
            <Bullet title={t('microphone')} body={t('microphonePermissionBody')} />
            <Bullet title={t('notifications')} body={t('notificationsPermissionBody')} />
            <Bullet title={t('offlineSync')} body={t('offlineSyncPermissionBody')} />
          </OnboardingPanel>
        ) : null}

        {step === 'language' ? (
          <OnboardingPanel
            title={t('onboardingLanguageTitle')}
            body={t('onboardingLanguageBody')}
          >
            <View style={styles.segmentGroup}>
              {supportedLanguages.map((item) => {
                const selected = item === language;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setLanguage(item)}
                    style={[styles.segment, selected ? styles.segmentSelected : null]}
                  >
                    <Text style={[styles.segmentText, selected ? styles.segmentTextSelected : null]}>
                      {languageLabels[item]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </OnboardingPanel>
        ) : null}

        {step === 'privacy' ? (
          <OnboardingPanel title={t('privacyDefaults')}>
            <PrivacyChoice
              title={t('audio')}
              value={privacy.data?.audioRetentionMode ?? AudioRetentionMode.DELETE_AFTER_PROCESSING}
              options={[
                [AudioRetentionMode.DELETE_AFTER_PROCESSING, t('audioDeleteAfterProcessing')],
                [AudioRetentionMode.KEEP_7_DAYS, t('audioKeep7Days')],
                [AudioRetentionMode.KEEP_30_DAYS, t('audioKeep30Days')],
                [AudioRetentionMode.KEEP_FOREVER, t('audioKeepForever')],
              ]}
              onChange={(audioRetentionMode) => updatePrivacy.mutate({ audioRetentionMode })}
            />
            <PrivacyChoice
              title={t('sourceText')}
              value={privacy.data?.transcriptRetentionMode ?? TranscriptRetentionMode.KEEP_FOREVER}
              options={[
                [TranscriptRetentionMode.KEEP_FOREVER, t('sourceTextKeepForever')],
                [TranscriptRetentionMode.DELETE_AFTER_30_DAYS, t('deleteAfter30Days')],
                [TranscriptRetentionMode.DELETE_AFTER_90_DAYS, t('deleteAfter90Days')],
              ]}
              onChange={(transcriptRetentionMode) => updatePrivacy.mutate({ transcriptRetentionMode })}
            />
            <PrivacyChoice
              title={t('aiProcessingMode')}
              value={privacy.data?.aiProcessingMode ?? AiProcessingMode.CLOUD}
              options={[
                [AiProcessingMode.CLOUD, t('aiCloud')],
                [AiProcessingMode.LOCAL_ONLY, t('aiLocalOnly')],
                [AiProcessingMode.HYBRID, t('aiHybrid')],
              ]}
              onChange={(aiProcessingMode) => updatePrivacy.mutate({ aiProcessingMode })}
            />
          </OnboardingPanel>
        ) : null}

        {step === 'first_capture' ? (
          <OnboardingPanel
            title={t('onboardingFirstCaptureTitle')}
            body={t('onboardingFirstCaptureBody')}
          />
        ) : null}

        {step === 'dongle' ? (
          <OnboardingPanel
            title={t('onboardingDongleTitle')}
            body={t('onboardingDongleBody')}
          />
        ) : null}
      </View>

      <View style={styles.footer}>
        <ActionButton title={isLast ? t('finish') : t('continue')} onPress={goNext} />
        {step !== 'welcome' ? (
          <Pressable accessibilityRole="button" onPress={skip} style={styles.skipButton}>
            <Text style={styles.skipText}>{t('skipSetup')}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function OnboardingPanel({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

function Bullet({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletTitle}>{title}</Text>
      <Text style={styles.bulletBody}>{body}</Text>
    </View>
  );
}

function PrivacyChoice<Value extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: Value;
  options: Array<[Value, string]>;
  onChange: (value: Value) => void;
}) {
  return (
    <View style={styles.privacyGroup}>
      <Text style={styles.optionTitle}>{title}</Text>
      {options.map(([optionValue, label]) => {
        const selected = optionValue === value;
        return (
          <Pressable
            key={optionValue}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(optionValue)}
            style={[styles.optionRow, selected ? styles.optionRowSelected : null]}
          >
            <Text style={styles.optionLabel}>{label}</Text>
            <Text style={[styles.optionState, selected ? styles.optionStateSelected : null]}>
              {selected ? 'Selected' : 'Choose'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  brand: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  progress: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  panel: {
    gap: spacing.md,
  },
  title: {
    color: palette.text,
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '900',
  },
  body: {
    color: palette.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
  },
  children: {
    gap: spacing.md,
  },
  bullet: {
    gap: 4,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  bulletTitle: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  bulletBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  segmentGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segment: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  segmentSelected: {
    backgroundColor: palette.accentLight,
    borderColor: palette.accentLight,
  },
  segmentText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  segmentTextSelected: {
    color: palette.accentStrong,
  },
  privacyGroup: {
    gap: spacing.xs,
  },
  optionTitle: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  optionRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  optionRowSelected: {
    borderColor: palette.success,
  },
  optionLabel: {
    flex: 1,
    color: palette.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  optionState: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  optionStateSelected: {
    color: palette.success,
  },
  footer: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  skipButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
});
