import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef } from 'react';
import { dongleBackendSyncCoordinator } from '../bluetooth/storage/singletons';
import { offlineSyncCoordinator } from './singletons';

export function useOfflineSyncOnReconnect() {
  const wasOffline = useRef(false);
  const syncInFlight = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);

      if (!isOnline) {
        wasOffline.current = true;
        return;
      }

      if (!wasOffline.current || syncInFlight.current) {
        return;
      }

      syncInFlight.current = true;
      void Promise.all([
        offlineSyncCoordinator.retryPendingUploads(),
        dongleBackendSyncCoordinator.retryPendingBackendSync(),
      ]).finally(() => {
        wasOffline.current = false;
        syncInFlight.current = false;
      });
    });

    return unsubscribe;
  }, []);
}
