import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { ActionsScreen } from '../features/actions/ActionsScreen';
import { AuthScreen } from '../features/auth/AuthScreen';
import { CaptureScreen } from '../features/capture/CaptureScreen';
import { useCaptureToggle } from '../features/capture/useCaptureToggle';
import { DeviceManagementScreen } from '../features/devices/DeviceManagementScreen';
import { InsightsScreen } from '../features/insights/InsightsScreen';
import { MemoryThreadsScreen } from '../features/memory-threads/MemoryThreadsScreen';
import { NoteDetailsScreen } from '../features/notes/NoteDetailsScreen';
import { RemindersScreen } from '../features/reminders/RemindersScreen';
import { SearchScreen } from '../features/search/SearchScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { TimelineScreen } from '../features/timeline/TimelineScreen';
import { AppRouteName } from '../types';
import { HomeScreen } from './HomeScreen';
import { useTranslation } from './i18n';
import { supabase } from '../lib/supabase/client';
import { useAuthStore } from '../state/auth.store';
import { getCaptureSource, useCaptureStore } from '../state/capture.store';
import { getTabForRoute, TABS } from './navigation';
import { palette, shadow, spacing } from './theme';

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
    case 'Reminders':
      return <RemindersScreen />;
    case 'Search':
      return <SearchScreen />;
    case 'Settings':
      return <SettingsScreen />;
    case 'Home':
    default:
      return <HomeScreen onNavigate={navigate} />;
  }
}

export function AppShell() {
  const [route, setRoute] = useState<AppRouteName>('Home');
  const { t } = useTranslation();
  const { session, loading, setSession, setError } = useAuthStore();
  const activeTab = getTabForRoute(route);
  const selectedMode = useCaptureStore((state) => state.selectedMode);
  const setCaptureStatus = useCaptureStore((state) => state.setStatus);
  const { isLoading: isCaptureLoading, isRecording, toggleCapture } = useCaptureToggle();

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

    const { data: listener } = supabase.auth.onAuthStateChange((_, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
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

  async function handleCaptureTabPress() {
    if (isCaptureLoading) return;
    if (selectedMode === 'dongle') {
      setRoute('Capture');
      setCaptureStatus('Use a paired Voxa dongle to start hardware capture');
      return;
    }

    const changed = await toggleCapture(getCaptureSource(selectedMode));
    if (!changed) return;

    setRoute('Capture');
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.utilityBar}>
        <Text style={styles.utilityTitle}>Voxa</Text>
      </View>

      {activeTab.subRoutes && activeTab.subRoutes.length > 0 ? (
        <View style={styles.subBar}>
          {activeTab.subRoutes.map((subRoute) => {
            const isActive = subRoute.name === route;
            return (
              <Pressable
                key={subRoute.name}
                accessibilityRole="button"
                accessibilityLabel={t(subRoute.labelKey)}
                onPress={() => setRoute(subRoute.name)}
                style={[styles.subPill, isActive ? styles.subPillActive : null]}
              >
                <Text style={[styles.subPillText, isActive ? styles.subPillTextActive : null]}>
                  {t(subRoute.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.content}>{renderRoute(route, setRoute)}</View>

      <View style={[styles.tabBar, shadow.soft]}>
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab.id;
          const isCapture = tab.id === 'capture';

          if (isCapture) {
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityLabel={t(tab.labelKey)}
                onPress={handleCaptureTabPress}
                disabled={isCaptureLoading}
                style={[styles.captureTab, isCaptureLoading ? styles.tabDisabled : null]}
                hitSlop={8}
              >
                <View
                  style={[
                    styles.captureButton,
                    isActive ? styles.captureButtonActive : null,
                    isRecording ? styles.captureButtonRecording : null,
                  ]}
                >
                  <Text style={styles.captureIcon}>{tab.icon}</Text>
                </View>
                <Text style={[styles.tabLabel, styles.captureLabel, isActive ? styles.tabLabelActive : null]}>
                  {t(tab.labelKey)}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              accessibilityLabel={t(tab.labelKey)}
              onPress={() => setRoute(tab.defaultRoute)}
              style={styles.tab}
              hitSlop={8}
            >
              {isActive ? <View style={styles.tabIndicator} /> : null}
              <Text style={[styles.tabIcon, isActive ? styles.tabIconActive : null]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

    </SafeAreaView>
  );
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
  utilityBar: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: palette.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  utilityTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '900',
  },
  subBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  subPill: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  subPillActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  subPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.muted,
  },
  subPillTextActive: {
    color: palette.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 88,
    backgroundColor: palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingTop: 4,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    paddingTop: 10,
    paddingBottom: 2,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 3,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  tabIcon: {
    fontSize: 20,
    color: palette.muted,
    lineHeight: 24,
  },
  tabIconActive: {
    color: palette.accent,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    color: palette.muted,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: palette.accent,
    fontWeight: '800',
  },
  tabDisabled: {
    opacity: 0.64,
  },
  captureTab: {
    flex: 1,
    minHeight: 82,
    alignItems: 'center',
    gap: 4,
    marginTop: -30,
    paddingBottom: 2,
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.surface,
    shadowColor: palette.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 10,
  },
  captureButtonActive: {
    backgroundColor: palette.success,
    borderColor: '#a7f3d0',
  },
  captureButtonRecording: {
    backgroundColor: palette.danger,
    borderColor: '#fecaca',
    shadowColor: palette.danger,
  },
  captureIcon: {
    fontSize: 22,
    lineHeight: 25,
    color: palette.text,
  },
  captureLabel: {
    color: palette.success,
  },
});
