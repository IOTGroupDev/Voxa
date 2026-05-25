import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';

@Module({
  imports: [StorageModule],
  controllers: [RecordingsController],
  providers: [RecordingsService],
})
export class RecordingsModule {}
