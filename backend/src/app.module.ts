import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActionsModule } from './actions/actions.module';
import { AskModule } from './ask/ask.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { CaptureModule } from './capture/capture.module';
import { DevicesModule } from './devices/devices.module';
import { EntitiesModule } from './entities/entities.module';
import { ExportModule } from './export/export.module';
import { MemoryEventsModule } from './memory-events/memory-events.module';
import { MemoryThreadsModule } from './memory-threads/memory-threads.module';
import { NotesModule } from './notes/notes.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrivacyModule } from './privacy/privacy.module';
import { InsightsModule } from './insights/insights.module';
import { InboxModule } from './inbox/inbox.module';
import { QueueModule } from './queue/queue.module';
import { RecordingsModule } from './recordings/recordings.module';
import { RemindersModule } from './reminders/reminders.module';
import { SearchModule } from './search/search.module';
import { StorageModule } from './storage/storage.module';
import { TimelineModule } from './timeline/timeline.module';
import { TodayModule } from './today/today.module';
import { TranscriptsModule } from './transcripts/transcripts.module';
import { TtsModule } from './tts/tts.module';
import { UsersModule } from './users/users.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    DevicesModule,
    EntitiesModule,
    ExportModule,
    CaptureModule,
    RecordingsModule,
    MemoryEventsModule,
    MemoryThreadsModule,
    TranscriptsModule,
    NotesModule,
    ActionsModule,
    RemindersModule,
    TimelineModule,
    TodayModule,
    TtsModule,
    SearchModule,
    AskModule,
    AiModule,
    InsightsModule,
    InboxModule,
    PrismaModule,
    StorageModule,
    QueueModule,
    WorkersModule,
    PrivacyModule,
  ],
})
export class AppModule {}
