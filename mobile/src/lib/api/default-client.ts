import { Platform } from 'react-native';
import { supabase } from '../supabase/client';
import { createApiClient } from './client';

function getDefaultApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  }

  return 'http://localhost:3000/api';
}

export const apiClient = createApiClient({
  baseUrl: getDefaultApiBaseUrl(),
  async getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
});

