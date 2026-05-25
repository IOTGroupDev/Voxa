import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateReminderDto, UpdateReminderDto } from '@voxa/shared';
import { RemindersService } from './reminders.service';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  list() {
    return this.remindersService.list();
  }

  @Post()
  create(@Body() dto: CreateReminderDto) {
    return this.remindersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReminderDto) {
    return this.remindersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.remindersService.remove(id);
  }
}

