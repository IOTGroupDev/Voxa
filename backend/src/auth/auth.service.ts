import { Injectable, UnauthorizedException } from '@nestjs/common';
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
  async verifySupabaseJwt(token?: string): Promise<AuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `${SUPABASE_URL}/auth/v1`,
        audience: 'authenticated',
      });

      if (!payload.sub) {
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

      throw new UnauthorizedException('Invalid bearer token.');
    }
  }
}