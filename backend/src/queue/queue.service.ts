import { Injectable } from '@nestjs/common';
import { QUEUE_NAMES } from '@voxa/shared';

@Injectable()
export class QueueService {
  enqueueRecordingUploaded(recordingId: string) {
    // TODO: Add BullMQ job to QUEUE_NAMES.RECORDING_UPLOADED.
    return { queue: QUEUE_NAMES.RECORDING_UPLOADED, recordingId };
  }
}

