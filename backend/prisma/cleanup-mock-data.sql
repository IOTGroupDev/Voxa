BEGIN;

DELETE FROM "ActionItem"
WHERE "source" = 'mock'
   OR "title" = 'Review captured memory';

DELETE FROM "Reminder"
WHERE "source" = 'mock'
   OR "title" = 'Follow up on captured memory';

DELETE FROM "DailySummary"
WHERE "summary" ILIKE 'TODO:%'
   OR "summary" ILIKE '%provider output%';

DELETE FROM "Note"
WHERE "title" = 'Mock memory summary'
   OR "summary" ILIKE '%TODO:%'
   OR "summary" ILIKE '%mock%'
   OR "body" ILIKE '%placeholder%'
   OR "body" ILIKE '%mock%';

DELETE FROM "Transcript"
WHERE "provider" = 'mock'
   OR "text" ILIKE 'Mock transcript%'
   OR "text" ILIKE '%mock transcript%'
   OR "text" ILIKE '%TODO:%';

DELETE FROM "MemoryThread"
WHERE "description" ILIKE '%mock thread assignment%';

DELETE FROM "Recording"
WHERE "deviceLocalRecordingId" ILIKE 'mock-%'
   OR "originalDeviceId" ILIKE 'mock-%'
   OR "deviceChecksum" ILIKE 'mock-%'
   OR "deviceAudioCodec" ILIKE 'mock-%'
   OR "storagePath" ILIKE '%mock-%';

DELETE FROM "Device"
WHERE "hardwareId" ILIKE 'mock-%'
   OR "displayName" ILIKE '%mock%'
   OR "firmwareVersion" ILIKE 'mock-%';

COMMIT;
