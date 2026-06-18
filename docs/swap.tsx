import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { ActionsScreen } from '../features/actions/ActionsScreen';
import { AuthScreen } from '../features/auth/AuthScreen';
import { CaptureScreen } from '../features/capture/CaptureScreen';
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
import { useAuthStore } from '../state/auth.store';
import { supabase } from '../lib/supabase/client';
import { palette, spacing, shadow } from './theme';

type TabId = 'home' | 'memory' | 'capture' | 'inbox' | 'explore';

interface SubRoute {
  name: AppRouteName;
  label: string;
}

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  defaultRoute: AppRouteName;
  subRoutes?: SubRoute[];
}

const TABS: Tab[] = [
  {
    id: 'home',
    label: 'Home',
    icon: '⌂',
    defaultRoute: 'Home',
  },
  {
    id: 'memory',
    label: 'Memory',
    icon: '◎',
    defaultRoute: 'Timeline',
    subRoutes: [
      { name: 'Timeline', label: 'Timeline' },
      { name: 'MemoryThreads', label: 'Threads' },
      { name: 'NoteDetails', label: 'Notes' },
    ],
  },
  {
    id: 'capture',
    label: 'Capture',
    icon: '●',
    defaultRoute: 'Capture',
  },
  {
    id: 'inbox',
    label: 'Inbox',
    icon: '◇',
    defaultRoute: 'Actions',
    subRoutes: [
      { name: 'Actions', label: 'Actions' },
      { name: 'Reminders', label: 'Reminders' },
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: '⊙',
    defaultRoute: 'Search',
    subRoutes: [
      { name: 'Search', label: 'Search' },
      { name: 'Insights', label: 'Insights' },
      { name: 'DeviceManagement', label: 'Devices' },
      { name: 'Settings', label: 'Settings' },
    ],
  },
];

function getTabForRoute(route: AppRouteName): Tab {
  return (
    TABS.find(
      (t) =>
        t.defaultRoute === route ||
        t.subRoutes?.some((s) => s.name === route),
    ) ?? TABS[0]
  );
}

function renderRoute(route: AppRouteName) {
  switch (route) {
    case 'Capture':           return <CaptureScreen />;
    case 'Timeline':          return <TimelineScreen />;
    case 'MemoryThreads':     return <MemoryThreadsScreen />;
    case 'NoteDetails':       return <NoteDetailsScreen />;
    case 'Actions':           return <ActionsScreen />;
    case 'Reminders':         return <RemindersScreen />;
    case 'Search':            return <SearchScreen />;
    case 'Insights':          return <InsightsScreen />;
    case 'DeviceManagement':  return <DeviceManagementScreen />;
    case 'Settings':          return <SettingsScreen />;
    case 'Home':
    default:                  return <HomeScreen />;
  }
}

export function AppShell() {
  const [route, setRoute] = useState<AppRouteName>('Home');
  const { t } = useTranslation();
  const { session, loading, setSession, setError } = useAuthStore();

  const activeTab = getTabForRoute(route);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session ?? null);
    }).catch((error) => {
      if (mounted) setError(error?.message ?? 'Unable to load session');
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
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
        <View style={styles.center}>
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) return <AuthScreen />;

  function handleTabPress(tab: Tab) {
    // If already on this tab, go to its default route
    if (tab.id === activeTab.id) {
      setRoute(tab.defaultRoute);
      return;
    }
    setRoute(tab.defaultRoute);
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Sub-route pill bar */}
      {activeTab.subRoutes && activeTab.subRoutes.length > 0 && (
        <View style={styles.subBar}>
          {activeTab.subRoutes.map((sub) => {
            const isActive = sub.name === route;
            return (
              <Pressable
                key={sub.name}
                onPress={() => setRoute(sub.name)}
                style={[styles.subPill, isActive && styles.subPillActive]}
              >
                <Text style={[styles.subPillText, isActive && styles.subPillTextActive]}>
                  {sub.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Screen content */}
      <View style={styles.content}>
        {renderRoute(route)}
      </View>

      {/* Bottom tab bar */}
      <View style={[styles.tabBar, shadow.soft]}>
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab.id;
          const isCapture = tab.id === 'capture';

          if (isCapture) {
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityLabel="Capture"
                onPress={() => handleTabPress(tab)}
                style={styles.tabCapture}
              >
                <View style={[styles.captureButton, isActive && styles.captureButtonActive]}>
                  <Text style={styles.captureIcon}>●</Text>
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              onPress={() => handleTabPress(tab)}
              style={styles.tab}
            >
              {isActive && <View style={styles.tabIndicator} />}
              <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                {tab.icon}
              </Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },

  // Sub-route pill row
  subBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: palette.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  subPill: {
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
    fontWeight: '600',
    color: palette.muted,
  },
  subPillTextActive: {
    color: palette.text,
    fontWeight: '700',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },

  // Bottom tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingBottom: 12,
    paddingTop: 4,
  },

  // Regular tab
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
    gap: 4,
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
    fontWeight: '500',
    color: palette.muted,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: palette.accent,
    fontWeight: '700',
  },

  // Capture FAB tab
  tabCapture: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 2,
    gap: 4,
    marginTop: -18,
  },
  captureButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.surfaceLighter,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  captureButtonActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  captureIcon: {
    fontSize: 18,
    color: palette.text,
    lineHeight: 22,
  },
});