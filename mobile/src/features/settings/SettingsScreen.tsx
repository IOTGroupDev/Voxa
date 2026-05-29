import { Pressable, View, StyleSheet, Text } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { PanelCard } from '../../app/ui';
import { useTranslation, supportedLanguages, languageLabels } from '../../app/i18n';
import { useLanguageStore } from '../../state/language.store';
import { spacing, palette } from '../../app/theme';

export function SettingsScreen() {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return (
    <DataStateScreen title={t('settings')} isLoading={false} error={null}>
      <View style={styles.container}>
        <PanelCard title={t('general')} subtitle={t('appBehavior')}>
          <Text style={styles.item}>{t('captureMode')}</Text>
          <Text style={styles.item}>{t('syncPreferences')}</Text>
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
});

