import { supabase } from '../supabase/client';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
}

export function createApiClient(config: ApiClientConfig) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await config.getAccessToken();
    const response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(
        response.statusText || `API request failed: ${response.status}`,
        response.status
      );
    }

    return response.json() as Promise<T>;
  }

  return { request };
}

