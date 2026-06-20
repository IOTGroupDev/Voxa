import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { TodayController } from './today.controller';
import { TodayDigestService } from './today-digest.service';

@Module({
  imports: [LlmModule],
  controllers: [TodayController],
  providers: [TodayDigestService],
})
export class TodayModule {}
