import { AppRouteName } from '../types';
import { TranslationKey } from './i18n';

export type TabId = 'home' | 'timeline' | 'capture' | 'search' | 'settings';

export interface SubRoute {
  name: AppRouteName;
  labelKey: TranslationKey;
}

export interface Tab {
  id: TabId;
  labelKey: TranslationKey;
  icon: string;
  defaultRoute: AppRouteName;
  subRoutes?: SubRoute[];
}

export const TABS: Tab[] = [
  {
    id: 'home',
    labelKey: 'home',
    icon: '⌂',
    defaultRoute: 'Home',
  },
  {
    id: 'timeline',
    labelKey: 'timeline',
    icon: '◎',
    defaultRoute: 'Timeline',
  },
  {
    id: 'capture',
    labelKey: 'capture',
    icon: '●',
    defaultRoute: 'Capture',
  },
  {
    id: 'search',
    labelKey: 'search',
    icon: '⊙',
    defaultRoute: 'Search',
  },
  {
    id: 'settings',
    labelKey: 'settings',
    icon: '⚙',
    defaultRoute: 'Settings',
  },
];

export function getTabForRoute(route: AppRouteName): Tab {
  return (
    TABS.find(
      (tab) =>
        tab.defaultRoute === route ||
        tab.subRoutes?.some((subRoute) => subRoute.name === route),
    ) ?? TABS[0]
  );
}
