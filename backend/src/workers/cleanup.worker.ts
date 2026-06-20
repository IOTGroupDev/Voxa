import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@voxa/shared';
import { Job } from 'bullmq';
import { PrivacyService } from '../privacy/privacy.service';

@Injectable()
@Processor(QUEUE_NAMES.CLEANUP)
export class CleanupWorker extends WorkerHost {
  private readonly logger = new Logger(CleanupWorker.name);

  constructor(private readonly privacyService: PrivacyService) {
    super();
  }

  async process(job: Job<CleanupJobData>) {
    this.logger.log(
      `Cleanup started queueJobId=${job.id} recordingId=${job.data.recordingId ?? 'batch'} reason=${job.data.reason}`,
    );
    const result = await this.privacyService.cleanupExpiredAudio(job.data.recordingId);
    this.logger.log(
      `Cleanup completed queueJobId=${job.id} checked=${result.checked} deleted=${result.deleted} failed=${result.failed}`,
    );
    return result;
  }
}

interface CleanupJobData {
  recordingId?: string;
  reason: string;
}
