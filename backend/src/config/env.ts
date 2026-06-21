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
  openAiCompatibleBaseUrl?: string;
  openAiCompatibleApiKey?: string;
  sttProvider?: string;
  sttHttpEndpoint?: string;
  ttsProvider?: string;
  ttsHttpEndpoint?: string;
  ttsTimeoutMs?: string;
  enableDongleMode?: string;
}
