UPDATE "Recording"
SET "status" = 'deleted',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'created'
  AND "createdAt" < CURRENT_TIMESTAMP - INTERVAL '24 hours'
  AND NOT EXISTS (
    SELECT 1
    FROM "MemoryEvent"
    WHERE "MemoryEvent"."recordingId" = "Recording"."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "CaptureSession"
    WHERE "CaptureSession"."recordingId" = "Recording"."id"
  );
