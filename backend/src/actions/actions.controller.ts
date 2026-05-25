import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { UpdateActionItemDto } from '@voxa/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { ActionsService } from './actions.service';

@Controller('actions')
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.actionsService.list(user.supabaseUserId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateActionItemDto,
  ) {
    return this.actionsService.update(user.supabaseUserId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.actionsService.remove(user.supabaseUserId, id);
  }
}
