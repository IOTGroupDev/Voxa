import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionsScreen } from '../features/actions/ActionsScreen';
import { AuthScreen } from '../features/auth/AuthScreen';
import { CaptureScreen } from '../features/capture/CaptureScreen';
import { DeviceManagementScreen } from '../features/devices/DeviceManagementScreen';
import { InsightsScreen } from '../features/insights/InsightsScreen';
import { MemoryThreadsScreen } from '../features/memory-threads/MemoryThreadsScreen';
import { NoteDetailsScreen } from '../features/notes/NoteDetailsScreen';
import { SearchScreen } from '../features/search/SearchScreen';
import { TimelineScreen } from '../features/timeline/TimelineScreen';
import { AppRouteName } from '../types';
import { HomeScreen } from './HomeScreen';
import { MoreScreen } from '../features/more/MoreScreen';
import { useTranslation, type TranslationKey } from './i18n';
import { useAuthStore } from '../state/auth.store';
import { supabase } from '../lib/supabase/client';
import { palette, spacing, shadow } from './theme';

// Condensed primary navigation — keep top-level tabs to 5 items.
const routes: Array<{ name: AppRouteName; labelKey: TranslationKey }> = [
  { name: 'Home', labelKey: 'home' },
  { name: 'Capture', labelKey: 'capture' },
  { name: 'Timeline', labelKey: 'timeline' },
  { name: 'DeviceManagement', labelKey: 'devices' },
  { name: 'More', labelKey: 'more' },
];

export function AppShell() {
  const [route, setRoute] = useState<AppRouteName>('Home');
  const { t } = useTranslation();
  const { session, loading, setSession, setError } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
      }
    }).catch((error) => {
      if (mounted) {
        setError(error?.message ?? 'Unable to load session');
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setSession(session ?? null);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, [setSession, setError]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <SafeAreaView style={styles.root}>
      {route === 'Home' ? (
        <View style={styles.header}>
          <View style={styles.heroBackground}>
            <View style={styles.heroBubbleLarge} />
            <View style={styles.heroBubbleSmall} />
          </View>
          <View style={[styles.brandCard, shadow.soft]}>
            <Text style={styles.brand}>Voxa</Text>
            <Text style={styles.tagline}>{t('brandTagline')}</Text>
            <Text style={styles.heroDescription}>{t('brandDescription')}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statText}>{t('smartThreads')}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statText}>{t('voiceCaptureChip')}</Text>
              </View>
              <View style={[styles.statChip, styles.statChipAccent]}>
                <Text style={[styles.statText, styles.statTextAccent]}>{t('autoSummary')}</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
      <View style={styles.content}>{renderRoute(route, setRoute)}</View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.navWrapper}
        contentContainerStyle={styles.nav}
      >
        {routes.map((item) => {
          const isActive = item.name === route;
          return (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              onPress={() => setRoute(item.name)}
              style={[styles.navItem, isActive ? styles.navItemActive : null]}
            >
              <Text style={[styles.navText, isActive ? styles.navTextActive : null]}>{t(item.labelKey)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function renderRoute(route: AppRouteName, navigate: (route: AppRouteName) => void) {
  switch (route) {
    case 'Capture':
      return <CaptureScreen />;
    case 'DeviceManagement':
      return <DeviceManagementScreen />;
    case 'Timeline':
      return <TimelineScreen />;
    case 'MemoryThreads':
      return <MemoryThreadsScreen />;
    case 'Insights':
      return <InsightsScreen />;
    case 'NoteDetails':
      return <NoteDetailsScreen />;
    case 'Actions':
      return <ActionsScreen />;
    case 'Search':
      return <SearchScreen />;
    case 'More':
      return <MoreScreen onNavigate={navigate} />;
    case 'Home':
    default:
      return <HomeScreen />;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
  },
  header: {
    position: 'relative',
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: palette.background,
  },
  heroAccent: {
    position: 'absolute',
    right: -60,
    top: 10,
    width: 180,
    height: 180,
    borderRadius: 120,
    backgroundColor: palette.accentLight,
    opacity: 0.28,
  },
  brandCard: {
    borderRadius: 28,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderLight,
    padding: spacing.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  brand: {
    fontSize: 34,
    fontWeight: '900',
    color: palette.text,
  },
  tagline: {
    marginTop: spacing.sm,
    color: palette.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: palette.accentLight,
  },
  heroBadgeSecondary: {
    backgroundColor: palette.surfaceLighter,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.accentLight,
  },
  heroBadgeText: {
    color: palette.surface,
    fontSize: 12,
    fontWeight: '800',
  },
  heroBadgeTextSecondary: {
    color: palette.accentStrong,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  navWrapper: {
    height: 90,
    minHeight: 90,
    maxHeight: 90,
    backgroundColor: palette.surface,
    borderTopWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  nav: {
    flexDirection: 'row',
    height: '100%',
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
    gap: spacing.sm,
    alignItems: 'center',
  },
  navItem: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    backgroundColor: palette.surfaceSoft,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  navItemActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  navText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  navTextActive: {
    color: palette.surface,
  },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  heroBubbleLarge: {
    position: 'absolute',
    right: -80,
    top: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: palette.accentLight,
    opacity: 0.24,
  },
  heroBubbleSmall: {
    position: 'absolute',
    left: -30,
    top: 40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: palette.highlight,
    opacity: 0.16,
  },
  heroDescription: {
    marginTop: spacing.sm,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statChip: {
    borderRadius: 999,
    backgroundColor: palette.surfaceSoft,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
  },
  statChipAccent: {
    backgroundColor: palette.accent,
    borderColor: 'transparent',
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.accentStrong,
  },
  statTextAccent: {
    color: palette.surface,
  },
});

