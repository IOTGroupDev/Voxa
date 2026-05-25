import { Injectable } from '@nestjs/common';

@Injectable()
export class NotesService {
  list() {
    return [];
  }

  get(id: string) {
    return { id };
  }

  update(id: string, dto: Record<string, unknown>) {
    // TODO: Update editable note fields while preserving AI provenance metadata.
    return { id, ...dto };
  }

  remove(id: string) {
    return { id, deleted: true };
  }
}

