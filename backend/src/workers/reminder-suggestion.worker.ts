import { Injectable } from '@nestjs/common';

@Injectable()
export class ReminderSuggestionWorker {
  async process(noteId: string) {
    // TODO: Suggest reminders without scheduling them until the user accepts.
    return { noteId, status: 'reminders_suggested' };
  }
}

