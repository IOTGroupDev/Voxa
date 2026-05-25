import { Injectable } from '@nestjs/common';
import { PairDeviceDto } from '@voxa/shared';

@Injectable()
export class DevicesService {
  pair(dto: PairDeviceDto) {
    // TODO: Persist paired dongle metadata for the authenticated user.
    return { id: dto.deviceId, ...dto };
  }

  list() {
    // TODO: Return devices owned by the authenticated user.
    return [];
  }

  get(id: string) {
    return { id };
  }

  update(id: string, dto: Partial<PairDeviceDto>) {
    return { id, ...dto };
  }

  remove(id: string) {
    return { id, deleted: true };
  }
}

