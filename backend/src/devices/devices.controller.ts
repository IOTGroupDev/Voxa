import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PairDeviceDto } from '@voxa/shared';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('pair')
  pair(@Body() dto: PairDeviceDto) {
    return this.devicesService.pair(dto);
  }

  @Get()
  list() {
    return this.devicesService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.devicesService.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<PairDeviceDto>) {
    return this.devicesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }
}

