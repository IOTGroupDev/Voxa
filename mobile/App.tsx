import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeScreen } from './src/app/HomeScreen';
import { useMockDongleCapture } from './src/features/devices/useMockDongleCapture';
import { useOfflineSyncOnReconnect } from './src/lib/storage/useOfflineSyncOnReconnect';

const queryClient = new QueryClient();

export default function App() {
  useOfflineSyncOnReconnect();
  useMockDongleCapture();

  return (
    <QueryClientProvider client={queryClient}>
      <HomeScreen />
    </QueryClientProvider>
  );
}
