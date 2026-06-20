import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';

@Module({
  imports: [LlmModule],
  controllers: [InboxController],
  providers: [InboxService],
})
export class InboxModule {}
