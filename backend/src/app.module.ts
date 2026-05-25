import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActionsModule } from './actions/actions.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { CaptureModule } from './capture/capture.module';
import { DevicesModule } from './devices/devices.module';
import { MemoryEventsModule } from './memory-events/memory-events.module';
import { NotesModule } from './notes/notes.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrivacyModule } from './privacy/privacy.module';
import { QueueModule } from './queue/queue.module';
import { RecordingsModule } from './recordings/recordings.module';
import { RemindersModule } from './reminders/reminders.module';
import { SearchModule } from './search/search.module';
import { StorageModule } from './storage/storage.module';
import { TimelineModule } from './timeline/timeline.module';
import { TranscriptsModule } from './transcripts/transcripts.module';
import { UsersModule } from './users/users.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    DevicesModule,
    CaptureModule,
    RecordingsModule,
    MemoryEventsModule,
    TranscriptsModule,
    NotesModule,
    ActionsModule,
    RemindersModule,
    TimelineModule,
    SearchModule,
    AiModule,
    PrismaModule,
    StorageModule,
    QueueModule,
    WorkersModule,
    PrivacyModule,
  ],
})
export class AppModule {}
