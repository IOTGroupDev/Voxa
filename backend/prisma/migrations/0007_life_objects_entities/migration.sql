ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'organization';

ALTER TABLE "Entity"
  ADD COLUMN "normalizedName" TEXT;

UPDATE "Entity"
SET "normalizedName" = lower(regexp_replace(trim("name"), '[[:space:]]+', ' ', 'g'))
WHERE "normalizedName" IS NULL;

ALTER TABLE "Entity"
  ALTER COLUMN "normalizedName" SET NOT NULL;

DROP INDEX IF EXISTS "Entity_userId_name_key";

CREATE UNIQUE INDEX "Entity_userId_normalizedName_key" ON "Entity"("userId", "normalizedName");
CREATE INDEX "Entity_userId_name_idx" ON "Entity"("userId", "name");

ALTER TABLE "EntityMention"
  ADD COLUMN "recordingId" TEXT;

CREATE INDEX "EntityMention_recordingId_idx" ON "EntityMention"("recordingId");

ALTER TABLE "EntityMention" ADD CONSTRAINT "EntityMention_recordingId_fkey"
  FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE CASCADE ON UPDATE CASCADE;
