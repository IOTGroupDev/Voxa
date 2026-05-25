import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateReminderDto, UpdateReminderDto } from '@voxa/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { RemindersService } from './reminders.service';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.remindersService.list(user.supabaseUserId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReminderDto) {
    return this.remindersService.create(user.supabaseUserId, user.email, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.remindersService.update(user.supabaseUserId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.remindersService.remove(user.supabaseUserId, id);
  }
}
