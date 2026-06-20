import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';

@Module({
  imports: [LlmModule],
  controllers: [AskController],
  providers: [AskService],
})
export class AskModule {}
