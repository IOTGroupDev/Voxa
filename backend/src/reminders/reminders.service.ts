import { Injectable } from '@nestjs/common';
import { CreateReminderDto, UpdateReminderDto } from '@voxa/shared';

@Injectable()
export class RemindersService {
  list() {
    return [];
  }

  create(dto: CreateReminderDto) {
    // TODO: Persist accepted reminder suggestions and user-created reminders.
    return { id: 'todo-reminder-id', ...dto };
  }

  update(id: string, dto: UpdateReminderDto) {
    return { id, ...dto };
  }

  remove(id: string) {
    return { id, deleted: true };
  }
}

