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
