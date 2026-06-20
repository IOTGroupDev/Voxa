export interface EnvConfig {
  databaseUrl: string;
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
  sttProvider?: string;
  sttHttpEndpoint?: string;
  enableDongleMode?: string;
}
