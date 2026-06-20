CREATE TYPE "AudioRetentionMode" AS ENUM (
  'delete_after_processing',
  'keep_7_days',
  'keep_30_days',
  'keep_forever'
);

CREATE TYPE "TranscriptRetentionMode" AS ENUM (
  'keep_forever',
  'delete_after_30_days',
  'delete_after_90_days'
);

CREATE TYPE "AiProcessingMode" AS ENUM (
  'cloud',
  'local_only',
  'hybrid'
);

CREATE TYPE "AudioDeletionStatus" AS ENUM (
  'deleted',
  'failed',
  'skipped'
);

CREATE TABLE "UserSettings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "audioRetentionMode" "AudioRetentionMode" NOT NULL DEFAULT 'delete_after_processing',
  "transcriptRetentionMode" "TranscriptRetentionMode" NOT NULL DEFAULT 'keep_forever',
  "aiProcessingMode" "AiProcessingMode" NOT NULL DEFAULT 'cloud',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AudioDeletionLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "recordingId" TEXT,
  "storagePath" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "AudioDeletionStatus" NOT NULL,

  CONSTRAINT "AudioDeletionLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Recording"
  ADD COLUMN "audioDeletionScheduledAt" TIMESTAMP(3),
  ADD COLUMN "audioDeletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
CREATE INDEX "UserSettings_userId_idx" ON "UserSettings"("userId");
CREATE INDEX "Recording_audioDeletionScheduledAt_idx" ON "Recording"("audioDeletionScheduledAt");
CREATE INDEX "AudioDeletionLog_userId_deletedAt_idx" ON "AudioDeletionLog"("userId", "deletedAt");
CREATE INDEX "AudioDeletionLog_recordingId_idx" ON "AudioDeletionLog"("recordingId");
CREATE INDEX "AudioDeletionLog_status_idx" ON "AudioDeletionLog"("status");

ALTER TABLE "UserSettings"
  ADD CONSTRAINT "UserSettings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AudioDeletionLog"
  ADD CONSTRAINT "AudioDeletionLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AudioDeletionLog"
  ADD CONSTRAINT "AudioDeletionLog_recordingId_fkey"
  FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE SET NULL ON UPDATE CASCADE;
