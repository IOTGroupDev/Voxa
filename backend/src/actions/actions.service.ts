import { Injectable } from '@nestjs/common';
import { UpdateActionItemDto } from '@voxa/shared';

@Injectable()
export class ActionsService {
  list() {
    return [];
  }

  update(id: string, dto: UpdateActionItemDto) {
    // TODO: Update extracted action item state.
    return { id, ...dto };
  }

  remove(id: string) {
    return { id, deleted: true };
  }
}

