import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionsScreen } from '../features/actions/ActionsScreen';
import { CaptureScreen } from '../features/capture/CaptureScreen';
import { DeviceManagementScreen } from '../features/devices/DeviceManagementScreen';
import { InsightsScreen } from '../features/insights/InsightsScreen';
import { MemoryThreadsScreen } from '../features/memory-threads/MemoryThreadsScreen';
import { NoteDetailsScreen } from '../features/notes/NoteDetailsScreen';
import { SearchScreen } from '../features/search/SearchScreen';
import { TimelineScreen } from '../features/timeline/TimelineScreen';
import { AppRouteName } from '../types';
import { HomeScreen } from './HomeScreen';

const routes: Array<{ name: AppRouteName; label: string }> = [
  { name: 'Home', label: 'Home' },
  { name: 'Capture', label: 'Capture' },
  { name: 'DeviceManagement', label: 'Device' },
  { name: 'Timeline', label: 'Timeline' },
  { name: 'MemoryThreads', label: 'Threads' },
  { name: 'Insights', label: 'Insights' },
  { name: 'NoteDetails', label: 'Notes' },
  { name: 'Actions', label: 'Open Loops' },
  { name: 'Search', label: 'Search' },
];

export function AppShell() {
  const [route, setRoute] = useState<AppRouteName>('Home');

  return (
    <View style={styles.root}>
      <View style={styles.content}>{renderRoute(route)}</View>
      <View style={styles.nav}>
        {routes.map((item) => {
          const isActive = item.name === route;
          return (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              onPress={() => setRoute(item.name)}
              style={[styles.navItem, isActive ? styles.navItemActive : null]}
            >
              <Text style={[styles.navText, isActive ? styles.navTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function renderRoute(route: AppRouteName) {
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
    case 'Home':
    default:
      return <HomeScreen />;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  nav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d1d5db',
    padding: 8,
    backgroundColor: '#ffffff',
  },
  navItem: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f3f4f6',
  },
  navItemActive: {
    backgroundColor: '#111827',
  },
  navText: {
    color: '#374151',
    fontSize: 13,
  },
  navTextActive: {
    color: '#ffffff',
  },
});

