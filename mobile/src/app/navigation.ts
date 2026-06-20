import { LibraryRoute, MainTabId, SettingsRoute } from '../types';
import { appConfig } from './config';
import { TranslationKey } from './i18n';

export interface SubRoute {
  route: LibraryRoute;
  labelKey: TranslationKey;
}

export interface Tab {
  id: MainTabId;
  labelKey: TranslationKey;
  icon: string;
  kind: 'screen' | 'action';
  subRoutes?: SubRoute[];
}

export const TABS: Tab[] = [
  {
    id: 'today',
    labelKey: 'home',
    icon: '⌂',
    kind: 'screen',
  },
  {
    id: 'memory',
    labelKey: 'memory',
    icon: '▦',
    kind: 'screen',
    subRoutes: appConfig.enableDeveloperMode
      ? [
          { route: { name: 'Entities' }, labelKey: 'objects' },
          { route: { name: 'Timeline' }, labelKey: 'timeline' },
          { route: { name: 'Actions' }, labelKey: 'actions' },
          { route: { name: 'Reminders' }, labelKey: 'reminders' },
          ...(appConfig.enableMemoryGraph ? [{ route: { name: 'MemoryThreads' } as LibraryRoute, labelKey: 'threads' as TranslationKey }] : []),
          ...(appConfig.enableInsights ? [{ route: { name: 'Insights' } as LibraryRoute, labelKey: 'insights' as TranslationKey }] : []),
        ]
      : undefined,
  },
  {
    id: 'capture',
    labelKey: 'capture',
    icon: '●',
    kind: 'action',
  },
  {
    id: 'ask',
    labelKey: 'search',
    icon: '⊙',
    kind: 'screen',
  },
  {
    id: 'settings',
    labelKey: 'settings',
    icon: '⚙',
    kind: 'screen',
  },
];

export const SETTINGS_ROUTES: Array<{ route: SettingsRoute; labelKey: TranslationKey }> = [
  { route: { name: 'AccountSettings' }, labelKey: 'settingsAccount' },
  { route: { name: 'PrivacySettings' }, labelKey: 'settingsPrivacy' },
  { route: { name: 'LanguageSettings' }, labelKey: 'language' },
  { route: { name: 'CaptureSettings' }, labelKey: 'settingsRecording' },
  { route: { name: 'DongleSettings' }, labelKey: 'settingsDongle' },
];

export function getTabById(id: MainTabId): Tab {
  return TABS.find((tab) => tab.id === id) ?? TABS[0];
}
