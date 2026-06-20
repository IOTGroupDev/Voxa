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
    if (!token) {
      throw new ApiError('Please sign in again.', 401);
    }

    const response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(await readErrorMessage(response), response.status);
    }

    return response.json() as Promise<T>;
  }

  return { request };
}

async function readErrorMessage(response: Response) {
  const fallback = response.statusText || `API request failed: ${response.status}`;
  const body = await response.text().catch(() => '');
  if (!body) {
    return fallback;
  }

  try {
    const payload = JSON.parse(body) as { message?: unknown; error?: unknown };
    if (typeof payload.message === 'string') {
      return payload.message;
    }
    if (Array.isArray(payload.message)) {
      return payload.message.filter((item) => typeof item === 'string').join(', ') || fallback;
    }
    if (typeof payload.error === 'string') {
      return payload.error;
    }
  } catch {
    return body.slice(0, 300) || fallback;
  }

  return fallback;
}
