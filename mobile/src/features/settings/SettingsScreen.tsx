import { Pressable, View, StyleSheet, Text } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { PanelCard } from '../../app/ui';
import { useTranslation, supportedLanguages, languageLabels } from '../../app/i18n';
import { captureModes, useCaptureStore } from '../../state/capture.store';
import { useLanguageStore } from '../../state/language.store';
import { spacing, palette } from '../../app/theme';

export function SettingsScreen() {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const selectedMode = useCaptureStore((state) => state.selectedMode);
  const setSelectedMode = useCaptureStore((state) => state.setSelectedMode);

  return (
    <DataStateScreen title={t('settings')} isLoading={false} error={null}>
      <View style={styles.container}>
        <PanelCard title={t('general')} subtitle={t('appBehavior')}>
          <Text style={styles.item}>{t('syncPreferences')}</Text>
        </PanelCard>
        <PanelCard title={t('captureMode')} subtitle={t('captureModePrompt')}>
          {captureModes.map((item) => {
            const isSelected = selectedMode === item.mode;
            return (
              <Pressable
                key={item.mode}
                accessibilityRole="button"
                onPress={() => setSelectedMode(item.mode)}
                style={[styles.optionItem, isSelected ? styles.optionItemSelected : null]}
              >
                <View style={styles.optionTextGroup}>
                  <Text style={[styles.optionTitle, isSelected ? styles.optionTitleSelected : null]}>
                    {item.title}
                  </Text>
                  <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                </View>
                {isSelected ? <Text style={styles.optionCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
        </PanelCard>
        <PanelCard title={t('notifications')} subtitle={t('notificationPreferences')}>
          <Text style={styles.item}>{t('reminderAlerts')}</Text>
          <Text style={styles.item}>{t('captureStatus')}</Text>
        </PanelCard>
        <PanelCard title={t('language')} subtitle={t('languagePrompt')}>
          {supportedLanguages.map((lang) => {
            const isSelected = lang === language;
            return (
              <Pressable
                key={lang}
                onPress={() => setLanguage(lang)}
                style={[styles.languageItem, isSelected ? styles.languageItemSelected : null]}
              >
                <Text style={[styles.languageText, isSelected ? styles.languageTextSelected : null]}>
                  {languageLabels[lang]}
                </Text>
                {isSelected ? <Text style={styles.languageCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
        </PanelCard>
      </View>
    </DataStateScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  item: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: palette.surfaceSoft,
  },
  languageItemSelected: {
    backgroundColor: palette.accentLight,
  },
  languageText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  languageTextSelected: {
    color: palette.accentStrong,
  },
  languageCheck: {
    color: palette.accentStrong,
    fontSize: 16,
    fontWeight: '800',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  optionItemSelected: {
    backgroundColor: palette.accentLight,
    borderColor: palette.accentStrong,
  },
  optionTextGroup: {
    flex: 1,
  },
  optionTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  optionTitleSelected: {
    color: palette.accentStrong,
  },
  optionSubtitle: {
    marginTop: 3,
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  optionCheck: {
    color: palette.accentStrong,
    fontSize: 16,
    fontWeight: '800',
  },
});
