import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { CaptureSource } from '@voxa/shared';
import { ActionsScreen } from '../features/actions/ActionsScreen';
import { AuthScreen } from '../features/auth/AuthScreen';
import { useCaptureToggle } from '../features/capture/useCaptureToggle';
import { DeviceManagementScreen } from '../features/devices/DeviceManagementScreen';
import { EntitiesScreen } from '../features/entities/EntitiesScreen';
import { EntityDetailScreen } from '../features/entities/EntityDetailScreen';
import { InboxScreen } from '../features/inbox/InboxScreen';
import { InsightsScreen } from '../features/insights/InsightsScreen';
import { MemoryThreadsScreen } from '../features/memory-threads/MemoryThreadsScreen';
import { NoteDetailsScreen } from '../features/notes/NoteDetailsScreen';
import { OnboardingStack } from '../features/onboarding/OnboardingStack';
import { RecordingResultScreen } from '../features/recording-result/RecordingResultScreen';
import { RemindersScreen } from '../features/reminders/RemindersScreen';
import { SearchScreen } from '../features/search/SearchScreen';
import {
  AccountSettingsScreen,
  CaptureSettingsScreen,
  LanguageSettingsScreen,
  PrivacySettingsScreen,
  SettingsHomeScreen,
} from '../features/settings/SettingsScreen';
import { TimelineScreen } from '../features/timeline/TimelineScreen';
import { MainNavigationTarget, MainTabId, LibraryRoute, SettingsRoute } from '../types';
import { HomeScreen } from './HomeScreen';
import { appConfig } from './config';
import { useTranslation } from './i18n';
import { SETTINGS_ROUTES, TABS, getTabById } from './navigation';
import { speakVoiceFeedback } from '../lib/voice/voice-feedback';
import { supabase } from '../lib/supabase/client';
import { useAuthStore } from '../state/auth.store';
import { getCaptureSource, useCaptureStore } from '../state/capture.store';
import { useOnboardingStore } from '../state/onboarding.store';
import { palette, shadow, spacing } from './theme';

export function AppShell() {
  const { t } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const authStatus = useAuthStore((state) => state.status);
  const initializeSession = useAuthStore((state) => state.initializeSession);
  const handleSessionChange = useAuthStore((state) => state.handleSessionChange);
  const onboardingHydrated = useOnboardingStore((state) => state.hydrated);
  const hydrateOnboarding = useOnboardingStore((state) => state.hydrate);
  const isOnboarded = useOnboardingStore((state) => state.isCompleted(session?.user.id));
  const completeOnboarding = useOnboardingStore((state) => state.complete);
  const requestAutostartCapture = useCaptureStore((state) => state.requestAutostartCapture);
  const handledInitialUrlRef = useRef(false);
  const lastAutostartUrlRef = useRef<{ url: string; handledAt: number } | null>(null);

  useEffect(() => {
    void initializeSession();
    void hydrateOnboarding();

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const expired = event === 'TOKEN_REFRESHED' && !nextSession;
      handleSessionChange(nextSession ?? null, expired ? 'expired' : nextSession ? undefined : 'signed_out');
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, [handleSessionChange, hydrateOnboarding, initializeSession]);

  useEffect(() => {
    function handleDeepLink(url: string | null) {
      if (!url || !isCaptureAutostartUrl(url)) return;
      // Ignore Siri-initiated links to avoid double-triggering system Siri
      try {
        const lower = url.toLowerCase();
        if (lower.includes('siri') || new URL(url).searchParams.get('source') === 'siri') {
          return;
        }
      } catch {
        // fallthrough
      }
      const now = Date.now();
      const last = lastAutostartUrlRef.current;
      if (last?.url === url && now - last.handledAt < 1500) return;

      lastAutostartUrlRef.current = { url, handledAt: now };
      requestAutostartCapture();
    }

    if (!handledInitialUrlRef.current) {
      handledInitialUrlRef.current = true;
      void Linking.getInitialURL().then(handleDeepLink);
    }

    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [requestAutostartCapture]);

  if (authStatus === 'checking_session' || !onboardingHydrated) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return <AuthStack />;
  }

  if (!isOnboarded) {
    return (
      <OnboardingStack
        onComplete={() => {
          void completeOnboarding(session.user.id);
        }}
      />
    );
  }

  return <MainTabs />;
}

function AuthStack() {
  return <AuthScreen />;
}

function MainTabs() {
  const [activeTab, setActiveTab] = useState<MainTabId>('memory');
  const [libraryRoute, setLibraryRoute] = useState<LibraryRoute>({ name: 'MemoryHome' });
  const [settingsRoute, setSettingsRoute] = useState<SettingsRoute>({ name: 'SettingsHome' });
  const [askQuestion, setAskQuestion] = useState<string | undefined>();
  const { t, language } = useTranslation();
  const selectedMode = useCaptureStore((state) => state.selectedMode);
  const setCaptureStatus = useCaptureStore((state) => state.setStatus);
  const { isLoading: isCaptureLoading, isRecording, startCapture, toggleCapture } = useCaptureToggle();
  const pendingAutostartCapture = useCaptureStore((state) => state.pendingAutostartCapture);
  const consumeAutostartCapture = useCaptureStore((state) => state.consumeAutostartCapture);
  const activeTabConfig = getTabById(activeTab);

  useEffect(() => {
    if (!pendingAutostartCapture) return;
    setActiveTab('memory');
    if (isCaptureLoading) return;
    consumeAutostartCapture();
    if (isRecording) return;

    void startCapture(CaptureSource.AIRPODS_SHORTCUT);
  }, [consumeAutostartCapture, isCaptureLoading, isRecording, pendingAutostartCapture, startCapture]);

  function navigate(target: MainNavigationTarget) {
    if (target.tab === 'ask') {
      setActiveTab('ask');
      setAskQuestion(target.question);
      return;
    }
    if (target.tab === 'memory' && target.route) {
      setLibraryRoute(target.route);
    }
    if (target.tab === 'memory' && !target.route) {
      setLibraryRoute({ name: 'MemoryHome' });
    }
    if (target.tab === 'settings' && target.route) {
      setSettingsRoute(target.route);
    }
    setActiveTab(target.tab);
  }

  async function handleCaptureAction() {
    if (isCaptureLoading) return;

    if (selectedMode === 'dongle') {
      setCaptureStatus('Open Settings -> Dongle to remember with hardware.');
      navigate({ tab: 'settings', route: { name: 'DongleSettings' } });
      void speakVoiceFeedback('dongleCapture', language);
      return;
    }

    const result = await toggleCapture(getCaptureSource(selectedMode));
    if (result.phase === 'stopped' && result.recordingId) {
      // Auto-save: skip the intermediate RecordingResult screen and go back to Memory home
      navigate({ tab: 'memory', route: { name: 'MemoryHome' } });
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.utilityBar}>
        <Text style={styles.utilityTitle}>Voxa</Text>
      </View>

      {activeTab === 'memory' && activeTabConfig.subRoutes?.length ? (
        <View style={styles.subBar}>
          {activeTabConfig.subRoutes.map((subRoute) => {
            const isActive = subRoute.route.name === libraryRoute.name;
            return (
              <Pressable
                key={subRoute.route.name}
                accessibilityRole="button"
                accessibilityLabel={t(subRoute.labelKey)}
                onPress={() => setLibraryRoute(subRoute.route)}
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

      {activeTab === 'settings' ? (
        <View style={styles.subBar}>
          {SETTINGS_ROUTES.filter((item) => appConfig.enableDongleMode || item.route.name !== 'DongleSettings').map((item) => {
            const isActive = item.route.name === settingsRoute.name;
            return (
              <Pressable
                key={item.route.name}
                accessibilityRole="button"
                accessibilityLabel={t(item.labelKey)}
                onPress={() => setSettingsRoute(item.route)}
                style={[styles.subPill, isActive ? styles.subPillActive : null]}
              >
                <Text style={[styles.subPillText, isActive ? styles.subPillTextActive : null]}>
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.content}>
        {activeTab === 'memory' ? (
          <LibraryStack route={libraryRoute} onRouteChange={setLibraryRoute} onNavigate={navigate} />
        ) : null}
        {activeTab === 'notes' ? <NoteDetailsScreen /> : null}
        {activeTab === 'attention' ? <InboxScreen onNavigate={navigate} /> : null}
        {activeTab === 'ask' ? <SearchScreen initialQuestion={askQuestion} /> : null}
        {activeTab === 'settings' ? (
          <SettingsStack route={settingsRoute} onRouteChange={setSettingsRoute} onOpenResult={(recordingId) => navigate({ tab: 'memory', route: { name: 'RecordingResult', recordingId } })} />
        ) : null}
      </View>

      <View style={[styles.tabBar, shadow.soft]}>
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const isCapture = tab.id === 'capture';

          if (isCapture) {
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityLabel={t(tab.labelKey)}
                onPress={handleCaptureAction}
                disabled={isCaptureLoading}
                style={[styles.captureTab, isCaptureLoading ? styles.tabDisabled : null]}
                hitSlop={8}
              >
                <View style={[styles.captureButton, isRecording ? styles.captureButtonRecording : null]}>
                  <Text style={styles.captureIcon}>{isRecording ? '■' : tab.icon}</Text>
                </View>
                <Text style={[styles.tabLabel, styles.captureLabel]}>{t(tab.labelKey)}</Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              accessibilityLabel={t(tab.labelKey)}
              onPress={() => {
                if (tab.id === 'memory') {
                  setLibraryRoute({ name: 'MemoryHome' });
                }
                setActiveTab(tab.id);
              }}
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

function isCaptureAutostartUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'voxa:' && parsed.hostname === 'capture' && parsed.searchParams.get('autostart') === 'true';
  } catch {
    return false;
  }
}

function LibraryStack({
  route,
  onRouteChange,
  onNavigate,
}: {
  route: LibraryRoute;
  onRouteChange: (route: LibraryRoute) => void;
  onNavigate: (target: MainNavigationTarget) => void;
}) {
  switch (route.name) {
    case 'MemoryHome':
      return <HomeScreen onNavigate={onNavigate} />;
    case 'RecordingResult':
      return (
        <RecordingResultScreen
          recordingId={route.recordingId}
          onNavigate={(target) => {
            if (target === 'Timeline') onRouteChange({ name: 'Timeline' });
            if (target === 'Search') onNavigate({ tab: 'ask' });
          }}
        />
      );
    case 'NoteDetails':
      return <NoteDetailsScreen />;
    case 'Entities':
      return (
        <EntitiesScreen
          onOpenEntity={(entityId) => onRouteChange({ name: 'EntityDetail', entityId })}
          onOpenRecording={(recordingId) => onRouteChange({ name: 'RecordingResult', recordingId })}
        />
      );
    case 'EntityDetail':
      return (
        <EntityDetailScreen
          entityId={route.entityId}
          onNavigate={(target, question) => {
            if (target === 'Search') onNavigate({ tab: 'ask', question });
          }}
          onOpenEntity={(entityId) => onRouteChange({ name: 'EntityDetail', entityId })}
        />
      );
    case 'MemoryThreads':
      return <MemoryThreadsScreen />;
    case 'Insights':
      return <InsightsScreen />;
    case 'Actions':
      return <ActionsScreen />;
    case 'Reminders':
      return <RemindersScreen />;
    case 'Timeline':
    default:
      return (
        <TimelineScreen
          onOpenResult={(recordingId) => onRouteChange({ name: 'RecordingResult', recordingId })}
        />
      );
  }
}

function SettingsStack({
  route,
  onRouteChange,
  onOpenResult,
}: {
  route: SettingsRoute;
  onRouteChange: (route: SettingsRoute) => void;
  onOpenResult: (recordingId: string) => void;
}) {
  switch (route.name) {
    case 'AccountSettings':
      return <AccountSettingsScreen />;
    case 'PrivacySettings':
      return <PrivacySettingsScreen />;
    case 'LanguageSettings':
      return <LanguageSettingsScreen />;
    case 'CaptureSettings':
      return <CaptureSettingsScreen />;
    case 'DongleSettings':
      return appConfig.enableDongleMode ? (
        <DeviceManagementScreen onOpenResult={onOpenResult} />
      ) : (
        <SettingsHomeScreen onNavigate={onRouteChange} />
      );
    case 'SettingsHome':
    default:
      return <SettingsHomeScreen onNavigate={onRouteChange} />;
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
