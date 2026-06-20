import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { EntitiesService } from './entities.service';

@Controller('entities')
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.entitiesService.list(user.supabaseUserId);
  }

  @Get(':id/relations')
  relations(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.entitiesService.getRelations(user.supabaseUserId, id);
  }

  @Get(':id/related')
  related(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.entitiesService.getRelated(user.supabaseUserId, id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.entitiesService.get(user.supabaseUserId, id);
  }

  @Get(':id/memories')
  memories(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.entitiesService.getMemories(user.supabaseUserId, id);
  }
}
