export type MainTabId = 'today' | 'memory' | 'capture' | 'ask' | 'settings';

export type LibraryRoute =
  | { name: 'Timeline' }
  | { name: 'RecordingResult'; recordingId: string | null }
  | { name: 'NoteDetails' }
  | { name: 'Entities' }
  | { name: 'EntityDetail'; entityId: string | null }
  | { name: 'MemoryThreads' }
  | { name: 'Insights' }
  | { name: 'Actions' }
  | { name: 'Reminders' };

export type SettingsRoute =
  | { name: 'SettingsHome' }
  | { name: 'AccountSettings' }
  | { name: 'PrivacySettings' }
  | { name: 'LanguageSettings' }
  | { name: 'CaptureSettings' }
  | { name: 'DongleSettings' };

export type MainNavigationTarget =
  | { tab: 'today' }
  | { tab: 'ask'; question?: string }
  | { tab: 'memory'; route?: LibraryRoute }
  | { tab: 'settings'; route?: SettingsRoute };
