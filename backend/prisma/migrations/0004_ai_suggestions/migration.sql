CREATE TYPE "AiSuggestionType" AS ENUM (
  'follow_up',
  'unresolved_task',
  'reminder_candidate',
  'repeated_topic',
  'decision_needed',
  'continue_project',
  'review_memory'
);

CREATE TYPE "AiSuggestionStatus" AS ENUM (
  'pending',
  'accepted',
  'dismissed',
  'done'
);

CREATE TABLE "AiSuggestion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" "AiSuggestionType" NOT NULL,
  "status" "AiSuggestionStatus" NOT NULL DEFAULT 'pending',
  "relatedEntityId" TEXT,
  "relatedNoteId" TEXT,
  "relatedMemoryEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiSuggestion_userId_status_idx" ON "AiSuggestion"("userId", "status");
CREATE INDEX "AiSuggestion_userId_type_idx" ON "AiSuggestion"("userId", "type");
CREATE INDEX "AiSuggestion_relatedEntityId_idx" ON "AiSuggestion"("relatedEntityId");
CREATE INDEX "AiSuggestion_relatedNoteId_idx" ON "AiSuggestion"("relatedNoteId");
CREATE INDEX "AiSuggestion_relatedMemoryEventId_idx" ON "AiSuggestion"("relatedMemoryEventId");

ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_relatedEntityId_fkey"
  FOREIGN KEY ("relatedEntityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_relatedNoteId_fkey"
  FOREIGN KEY ("relatedNoteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_relatedMemoryEventId_fkey"
  FOREIGN KEY ("relatedMemoryEventId") REFERENCES "MemoryEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
