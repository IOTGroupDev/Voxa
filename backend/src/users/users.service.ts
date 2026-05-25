import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.service';

@Injectable()
export class UsersService {
  getMe(user: AuthenticatedUser) {
    // TODO: Load or create the local product user profile by Supabase user id.
    return {
      supabaseUserId: user.supabaseUserId,
      email: user.email,
    };
  }
}
