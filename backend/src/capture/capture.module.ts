import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { CaptureController } from './capture.controller';
import { CaptureService } from './capture.service';

@Module({
  imports: [QueueModule],
  controllers: [CaptureController],
  providers: [CaptureService],
})
export class CaptureModule {}
