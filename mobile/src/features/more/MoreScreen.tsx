import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PanelCard } from '../../app/ui';
import { spacing, palette } from '../../app/theme';
import { useTranslation } from '../../app/i18n';
import { useAuthStore } from '../../state/auth.store';
import { AppRouteName } from '../../types';

interface MoreScreenProps {
  onNavigate: (route: AppRouteName) => void;
}

export function MoreScreen({ onNavigate }: MoreScreenProps) {
  const { t } = useTranslation();
  const signOut = useAuthStore((state) => state.signOut);

  const secondary: Array<{ name: AppRouteName; labelKey: keyof ReturnType<typeof useTranslation>['t'] | string }> = [
    { name: 'MemoryThreads', labelKey: 'threads' },
    { name: 'Insights', labelKey: 'insights' },
    { name: 'Actions', labelKey: 'actions' },
    { name: 'Search', labelKey: 'search' },
    { name: 'Reminders', labelKey: 'reminders' },
    { name: 'NoteDetails', labelKey: 'notes' },
    { name: 'Settings', labelKey: 'settings' },
  ];

  return (
    <View style={styles.container}>
      <PanelCard title={t('more') ?? 'More'}>
        {secondary.map((s) => (
          <Pressable
            key={s.name}
            onPress={() => onNavigate(s.name)}
            style={styles.item}
          >
            <Text style={styles.itemText}>{t(s.labelKey as any)}</Text>
            <Text style={styles.itemChevron}>›</Text>
          </Pressable>
        ))}
        <Pressable onPress={signOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{t('signOut')}</Text>
        </Pressable>
      </PanelCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    backgroundColor: palette.surfaceLighter,
    marginTop: spacing.xs,
  },
  itemText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  itemChevron: {
    color: palette.muted,
    fontSize: 20,
    fontWeight: '800',
  },
  logoutButton: {
    marginTop: spacing.md,
    borderRadius: 16,
    backgroundColor: palette.surfaceSoft,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  logoutText: {
    color: palette.danger,
    fontSize: 16,
    fontWeight: '700',
  },
});
