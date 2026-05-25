import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateMemoryEventDto, UpdateMemoryEventDto } from '@voxa/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { MemoryEventsService } from './memory-events.service';

@Controller('memory-events')
export class MemoryEventsController {
  constructor(private readonly memoryEventsService: MemoryEventsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMemoryEventDto) {
    return this.memoryEventsService.create(user.supabaseUserId, user.email, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.memoryEventsService.list(user.supabaseUserId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.memoryEventsService.get(user.supabaseUserId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMemoryEventDto,
  ) {
    return this.memoryEventsService.update(user.supabaseUserId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.memoryEventsService.remove(user.supabaseUserId, id);
  }
}
