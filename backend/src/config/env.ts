export interface EnvConfig {
  databaseUrl: string;
  directUrl?: string;
  supabaseUrl: string;
  supabaseJwtSecret: string;
  supabaseServiceRoleKey: string;
  redisUrl: string;
  aiProvider?: string;
  geminiApiKey?: string;
  llmProvider?: string;
  llmModel?: string;
  llmTimeoutMs?: string;
  llmRetryAttempts?: string;
  openAiCompatibleBaseUrl?: string;
  openAiCompatibleApiKey?: string;
  // Provider-specific configuration
  geminiModel?: string;
  deepseekApiKey?: string;
  deepseekBaseUrl?: string;
  deepseekModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  llmProviderOrder?: string;
  sttProvider?: string;
  sttHttpEndpoint?: string;
  ttsProvider?: string;
  ttsHttpEndpoint?: string;
  ttsTimeoutMs?: string;
  enableDongleMode?: string;
}

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_JWT_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'REDIS_URL',
] as const;

export function validateEnvConfig(config: Record<string, unknown>) {
  assertRequiredEnv(config);
  assertValidPort(config.PORT);
  assertValidUrl(config.SUPABASE_URL, 'SUPABASE_URL');
  assertValidUrl(config.REDIS_URL, 'REDIS_URL');

  return config;
}

export function validateEnv(env: NodeJS.ProcessEnv, logger?: { error(message: string): void }) {
  try {
    assertRequiredEnv(env);
    assertValidPort(env.PORT);
    assertValidUrl(env.SUPABASE_URL, 'SUPABASE_URL');
    assertValidUrl(env.REDIS_URL, 'REDIS_URL');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid environment configuration.';
    logger?.error(message);
    throw error;
  }
}

function assertRequiredEnv(config: Record<string, unknown>) {
  const missing = REQUIRED_ENV_VARS.filter((key) => !readNonEmptyString(config[key]));

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function assertValidPort(value: unknown) {
  if (value !== undefined && value !== '') {
    const port = Number(value);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error('PORT must be an integer between 1 and 65535.');
    }
  }
}

function readNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertValidUrl(value: unknown, key: string) {
  if (!readNonEmptyString(value)) {
    return;
  }

  try {
    new URL(String(value));
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }
}
