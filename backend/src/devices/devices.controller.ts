import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PairDeviceDto } from '@voxa/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('pair')
  pair(@CurrentUser() user: AuthenticatedUser, @Body() dto: PairDeviceDto) {
    return this.devicesService.pair(user.supabaseUserId, user.email, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.list(user.supabaseUserId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.devicesService.get(user.supabaseUserId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: Partial<PairDeviceDto>,
  ) {
    return this.devicesService.update(user.supabaseUserId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.devicesService.remove(user.supabaseUserId, id);
  }
}
