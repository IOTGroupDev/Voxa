import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { UpdateActionItemDto } from '@voxa/shared';
import { ActionsService } from './actions.service';

@Controller('actions')
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get()
  list() {
    return this.actionsService.list();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActionItemDto) {
    return this.actionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.actionsService.remove(id);
  }
}

