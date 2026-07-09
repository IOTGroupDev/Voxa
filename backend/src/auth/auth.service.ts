import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthenticatedUser {
  supabaseUserId: string;
  email?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async verifySupabaseJwt(token?: string): Promise<AuthenticatedUser> {
    if (!token) {
      this.logger.warn('Rejected request without bearer token');
      throw new UnauthorizedException('Missing bearer token.');
    }

    try {
      const supabaseUrl = this.getSupabaseUrl();
      const { payload } = await jwtVerify(token, this.getJwks(), {
        issuer: `${supabaseUrl}/auth/v1`,
        audience: 'authenticated',
      });

      if (!payload.sub) {
        this.logger.warn('Rejected JWT without subject');
        throw new UnauthorizedException('JWT subject is missing.');
      }

      return {
        supabaseUserId: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.warn(`Rejected invalid bearer token: ${error instanceof Error ? error.message : 'unknown error'}`);
      throw new UnauthorizedException('Invalid bearer token.');
    }
  }

  private getJwks() {
    if (!this.jwks) {
      const supabaseUrl = this.getSupabaseUrl();
      this.jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
    }

    return this.jwks;
  }

  private getSupabaseUrl() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL')?.replace(/\/$/, '');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required for JWT verification.');
    }

    return supabaseUrl;
  }
}
