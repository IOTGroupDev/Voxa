import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';

export interface AuthenticatedUser {
  supabaseUserId: string;
  email?: string;
}

@Injectable()
export class AuthService {
  async verifySupabaseJwt(token?: string): Promise<AuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new UnauthorizedException('Supabase JWT verification is not configured.');
    }

    try {
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(token, secret);

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
