import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthenticatedUser {
  supabaseUserId: string;
  email?: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL; // https://ntzdzhzltyzmavfmxjvy.supabase.co

const JWKS = createRemoteJWKSet(
    new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async verifySupabaseJwt(token?: string): Promise<AuthenticatedUser> {
    if (!token) {
      this.logger.warn('Rejected request without bearer token');
      throw new UnauthorizedException('Missing bearer token.');
    }

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `${SUPABASE_URL}/auth/v1`,
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
}
