export interface EnvConfig {
  databaseUrl: string;
  supabaseUrl: string;
  supabaseJwtSecret: string;
  supabaseServiceRoleKey: string;
  redisUrl: string;
  aiProvider?: string;
}

