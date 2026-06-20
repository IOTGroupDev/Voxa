import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AiProcessingMode, AudioRetentionMode, TranscriptRetentionMode } from '@voxa/shared';
import { DataStateScreen } from '../../app/DataStateScreen';
import { appConfig } from '../../app/config';
import { supportedLanguages, languageLabels, useTranslation } from '../../app/i18n';
import { SETTINGS_ROUTES } from '../../app/navigation';
import { ActionButton } from '../../app/ui';
import { usePrivacySettingsQuery, useUpdatePrivacySettingsMutation } from '../../lib/api/hooks';
import { useAuthStore } from '../../state/auth.store';
import { captureModes, useCaptureStore } from '../../state/capture.store';
import { useLanguageStore } from '../../state/language.store';
import { useVoiceFeedbackStore } from '../../state/voice-feedback.store';
import { SettingsRoute } from '../../types';
import { palette, spacing } from '../../app/theme';

interface SettingsHomeScreenProps {
  onNavigate: (route: SettingsRoute) => void;
}

export function SettingsHomeScreen({ onNavigate }: SettingsHomeScreenProps) {
  const { t } = useTranslation();
  const routes = SETTINGS_ROUTES.filter((item) => appConfig.enableDongleMode || item.route.name !== 'DongleSettings');

  return (
    <DataStateScreen title={t('settings')} isLoading={false} error={null}>
      <View style={styles.section}>
        {routes.map((item) => (
          <Pressable
            key={item.route.name}
            accessibilityRole="button"
            onPress={() => onNavigate(item.route)}
            style={styles.settingRow}
          >
            <Text style={styles.settingLabel}>{t(item.labelKey)}</Text>
            <Text style={styles.settingValue}>{t('open')}</Text>
          </Pressable>
        ))}
      </View>
    </DataStateScreen>
  );
}

export function AccountSettingsScreen() {
  const { t } = useTranslation();
  const signOut = useAuthStore((state) => state.signOut);
  const session = useAuthStore((state) => state.session);

  return (
    <DataStateScreen title={t('settingsAccount')} isLoading={false} error={null}>
      <View style={styles.section}>
        <View style={styles.infoBox}>
          <Text style={styles.settingLabel}>{session?.user.email ?? 'Signed in'}</Text>
          <Text style={styles.settingHint}>{t('settingsAccountHint')}</Text>
        </View>
        <ActionButton title={t('signOut')} onPress={signOut} variant="ghost" />
      </View>
    </DataStateScreen>
  );
}

export function PrivacySettingsScreen() {
  const { t } = useTranslation();
  const privacySettings = usePrivacySettingsQuery();
  const updatePrivacySettings = useUpdatePrivacySettingsMutation();
  const privacy = privacySettings.data;

  return (
    <DataStateScreen title={t('settingsPrivacy')} isLoading={privacySettings.isLoading} error={privacySettings.error}>
      {privacy ? (
        <View style={styles.section}>
          {privacy.warning ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>{t('audioDeletionWarningTitle')}</Text>
              <Text style={styles.warningText}>{privacy.warning.message}</Text>
            </View>
          ) : null}

          <SettingOptionGroup
            title={t('audioRetention')}
            value={privacy.audioRetentionMode}
            pending={updatePrivacySettings.isPending}
            options={audioRetentionOptions(t)}
            onChange={(audioRetentionMode) => updatePrivacySettings.mutate({ audioRetentionMode })}
          />

          <SettingOptionGroup
            title={t('sourceTextRetention')}
            value={privacy.transcriptRetentionMode}
            pending={updatePrivacySettings.isPending}
            options={transcriptRetentionOptions(t)}
            onChange={(transcriptRetentionMode) => updatePrivacySettings.mutate({ transcriptRetentionMode })}
          />

          <SettingOptionGroup
            title={t('aiProcessingMode')}
            value={privacy.aiProcessingMode}
            pending={updatePrivacySettings.isPending}
            options={aiProcessingOptions(t)}
            onChange={(aiProcessingMode) => updatePrivacySettings.mutate({ aiProcessingMode })}
          />
        </View>
      ) : null}
    </DataStateScreen>
  );
}

export function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return (
    <DataStateScreen title={t('language')} isLoading={false} error={null}>
      <View style={styles.segmentGroup}>
        {supportedLanguages.map((lang) => {
          const isSelected = lang === language;
          return (
            <Pressable
              key={lang}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setLanguage(lang)}
              style={[styles.segment, isSelected ? styles.segmentSelected : null]}
            >
              <Text style={[styles.segmentText, isSelected ? styles.segmentTextSelected : null]}>
                {languageLabels[lang]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </DataStateScreen>
  );
}

export function CaptureSettingsScreen() {
  const { t } = useTranslation();
  const selectedMode = useCaptureStore((state) => state.selectedMode);
  const setSelectedMode = useCaptureStore((state) => state.setSelectedMode);
  const voiceFeedbackEnabled = useVoiceFeedbackStore((state) => state.enabled);
  const setVoiceFeedbackEnabled = useVoiceFeedbackStore((state) => state.setEnabled);

  return (
    <DataStateScreen title={t('settingsRecording')} isLoading={false} error={null}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('captureMode')}</Text>
        <View style={styles.segmentGroup}>
          {captureModes.map((item) => {
            const isSelected = selectedMode === item.mode;
            return (
              <Pressable
                key={item.mode}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedMode(item.mode)}
                style={[styles.segment, isSelected ? styles.segmentSelected : null]}
              >
                <Text style={[styles.segmentText, isSelected ? styles.segmentTextSelected : null]}>
                  {item.title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: voiceFeedbackEnabled }}
          onPress={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
          style={styles.settingRow}
        >
          <Text style={styles.settingLabel}>{t('voiceFeedback')}</Text>
          <Text style={[styles.settingValue, voiceFeedbackEnabled ? styles.settingValueActive : null]}>
            {voiceFeedbackEnabled ? t('on') : t('off')}
          </Text>
        </Pressable>
      </View>
    </DataStateScreen>
  );
}

type Option<Value extends string> = {
  value: Value;
  label: string;
  description: string;
};

function SettingOptionGroup<Value extends string>({
  title,
  value,
  options,
  pending,
  onChange,
}: {
  title: string;
  value: Value;
  options: Array<Option<Value>>;
  pending: boolean;
  onChange: (value: Value) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.optionGroup}>
      <Text style={styles.optionTitle}>{title}</Text>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: pending }}
            disabled={pending}
            onPress={() => onChange(option.value)}
            style={[styles.optionRow, isSelected ? styles.optionRowSelected : null]}
          >
            <View style={styles.settingCopy}>
              <Text style={[styles.settingLabel, isSelected ? styles.optionLabelSelected : null]}>
                {option.label}
              </Text>
              <Text style={styles.settingHint}>{option.description}</Text>
            </View>
            <Text style={[styles.settingValue, isSelected ? styles.settingValueActive : null]}>
              {isSelected ? t('selected') : t('choose')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type Translate = ReturnType<typeof useTranslation>['t'];

const audioRetentionOptions = (t: Translate): Array<Option<AudioRetentionMode>> => [
  {
    value: AudioRetentionMode.DELETE_AFTER_PROCESSING,
    label: t('audioDeleteAfterProcessing'),
    description: t('audioDeleteAfterProcessingDescription'),
  },
  {
    value: AudioRetentionMode.KEEP_7_DAYS,
    label: t('audioKeep7Days'),
    description: t('audioKeep7DaysDescription'),
  },
  {
    value: AudioRetentionMode.KEEP_30_DAYS,
    label: t('audioKeep30Days'),
    description: t('audioKeep30DaysDescription'),
  },
  {
    value: AudioRetentionMode.KEEP_FOREVER,
    label: t('audioKeepForever'),
    description: t('audioKeepForeverDescription'),
  },
];

const transcriptRetentionOptions = (t: Translate): Array<Option<TranscriptRetentionMode>> => [
  {
    value: TranscriptRetentionMode.KEEP_FOREVER,
    label: t('sourceTextKeepForever'),
    description: t('sourceTextKeepForeverDescription'),
  },
  {
    value: TranscriptRetentionMode.DELETE_AFTER_30_DAYS,
    label: t('sourceTextDeleteAfter30Days'),
    description: t('sourceTextDeleteAfter30DaysDescription'),
  },
  {
    value: TranscriptRetentionMode.DELETE_AFTER_90_DAYS,
    label: t('sourceTextDeleteAfter90Days'),
    description: t('sourceTextDeleteAfter90DaysDescription'),
  },
];

const aiProcessingOptions = (t: Translate): Array<Option<AiProcessingMode>> => [
  {
    value: AiProcessingMode.CLOUD,
    label: t('aiCloud'),
    description: t('aiCloudDescription'),
  },
  {
    value: AiProcessingMode.LOCAL_ONLY,
    label: t('aiLocalOnly'),
    description: t('aiLocalOnlyDescription'),
  },
  {
    value: AiProcessingMode.HYBRID,
    label: t('aiHybrid'),
    description: t('aiHybridDescription'),
  },
];

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  segmentGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segment: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: spacing.sm,
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
    lineHeight: 18,
    fontWeight: '800',
  },
  segmentTextSelected: {
    color: palette.accentStrong,
  },
  settingRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  settingLabel: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  settingCopy: {
    flex: 1,
    gap: 4,
  },
  settingHint: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  settingValue: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  settingValueActive: {
    color: palette.success,
  },
  optionGroup: {
    gap: spacing.sm,
  },
  optionTitle: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  optionRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  optionRowSelected: {
    borderColor: palette.success,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  optionLabelSelected: {
    color: palette.text,
  },
  warningBox: {
    gap: 4,
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: 'rgba(248, 113, 113, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.danger,
  },
  warningTitle: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  warningText: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  infoBox: {
    gap: spacing.xs,
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
});
