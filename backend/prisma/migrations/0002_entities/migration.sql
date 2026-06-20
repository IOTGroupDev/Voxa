CREATE TYPE "EntityType" AS ENUM (
  'person',
  'project',
  'vehicle',
  'pet',
  'health',
  'place',
  'device',
  'home',
  'idea',
  'other'
);

CREATE TABLE "Entity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "EntityType" NOT NULL,
  "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EntityMention" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "noteId" TEXT,
  "transcriptId" TEXT,
  "memoryEventId" TEXT,
  "confidence" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EntityMention_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Entity_userId_name_key" ON "Entity"("userId", "name");
CREATE INDEX "Entity_userId_type_idx" ON "Entity"("userId", "type");
CREATE INDEX "Entity_updatedAt_idx" ON "Entity"("updatedAt");
CREATE INDEX "EntityMention_userId_idx" ON "EntityMention"("userId");
CREATE INDEX "EntityMention_entityId_createdAt_idx" ON "EntityMention"("entityId", "createdAt");
CREATE INDEX "EntityMention_noteId_idx" ON "EntityMention"("noteId");
CREATE INDEX "EntityMention_transcriptId_idx" ON "EntityMention"("transcriptId");
CREATE INDEX "EntityMention_memoryEventId_idx" ON "EntityMention"("memoryEventId");

ALTER TABLE "Entity" ADD CONSTRAINT "Entity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EntityMention" ADD CONSTRAINT "EntityMention_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EntityMention" ADD CONSTRAINT "EntityMention_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EntityMention" ADD CONSTRAINT "EntityMention_noteId_fkey"
  FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EntityMention" ADD CONSTRAINT "EntityMention_transcriptId_fkey"
  FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EntityMention" ADD CONSTRAINT "EntityMention_memoryEventId_fkey"
  FOREIGN KEY ("memoryEventId") REFERENCES "MemoryEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
