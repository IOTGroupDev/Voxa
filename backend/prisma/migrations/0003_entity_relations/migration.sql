CREATE TYPE "EntityRelationType" AS ENUM (
  'related_to',
  'part_of',
  'belongs_to',
  'works_on',
  'owns',
  'uses',
  'discussed_with',
  'affects',
  'located_at',
  'other'
);

CREATE TABLE "EntityRelation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceEntityId" TEXT NOT NULL,
  "targetEntityId" TEXT NOT NULL,
  "relationType" "EntityRelationType" NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EntityRelation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EntityRelation_userId_sourceEntityId_targetEntityId_relationType_key"
  ON "EntityRelation"("userId", "sourceEntityId", "targetEntityId", "relationType");

CREATE INDEX "EntityRelation_userId_idx" ON "EntityRelation"("userId");
CREATE INDEX "EntityRelation_sourceEntityId_idx" ON "EntityRelation"("sourceEntityId");
CREATE INDEX "EntityRelation_targetEntityId_idx" ON "EntityRelation"("targetEntityId");

ALTER TABLE "EntityRelation" ADD CONSTRAINT "EntityRelation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EntityRelation" ADD CONSTRAINT "EntityRelation_sourceEntityId_fkey"
  FOREIGN KEY ("sourceEntityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EntityRelation" ADD CONSTRAINT "EntityRelation_targetEntityId_fkey"
  FOREIGN KEY ("targetEntityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
