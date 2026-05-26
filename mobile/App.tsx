import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './src/app/AppShell';
import { useMockDongleCapture } from './src/features/devices/useMockDongleCapture';
import { useOfflineSyncOnReconnect } from './src/lib/storage/useOfflineSyncOnReconnect';

const queryClient = new QueryClient();

export default function App() {
  useOfflineSyncOnReconnect();
  useMockDongleCapture();

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
