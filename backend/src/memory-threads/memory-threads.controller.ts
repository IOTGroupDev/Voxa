import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { MemoryThreadsService } from './memory-threads.service';

@Controller('memory-threads')
export class MemoryThreadsController {
  constructor(private readonly memoryThreadsService: MemoryThreadsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.memoryThreadsService.list(user.supabaseUserId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.memoryThreadsService.get(user.supabaseUserId, id);
  }
}

