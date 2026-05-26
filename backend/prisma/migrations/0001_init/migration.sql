-- EnableExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "MemoryEventType" AS ENUM ('quick_note', 'task', 'idea', 'important', 'reflection', 'meeting', 'manual');

-- CreateEnum
CREATE TYPE "CaptureSource" AS ENUM ('dongle', 'mobile_app', 'airpods_shortcut');

-- CreateEnum
CREATE TYPE "ButtonGesture" AS ENUM ('single_press', 'double_press', 'long_press', 'press_and_hold');

-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('created', 'recording', 'uploading', 'uploaded', 'processing', 'completed', 'failed', 'deleted');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'retrying', 'cancelled');

-- CreateEnum
CREATE TYPE "AiJobType" AS ENUM ('transcription', 'classification', 'summary', 'action_extraction', 'reminder_suggestion', 'embedding', 'timeline_update', 'insight', 'cleanup');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('recurring_theme', 'unresolved_question', 'similar_past_note', 'project_direction', 'emotional_pattern', 'forgotten_task', 'decision_needed');

-- CreateEnum
CREATE TYPE "CaptureSessionStatus" AS ENUM ('active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('active', 'inactive', 'lost', 'revoked');

-- CreateEnum
CREATE TYPE "DongleRecordingSyncStatus" AS ENUM ('stored_on_device', 'metadata_synced', 'transfer_in_progress', 'transferred_to_phone', 'uploaded_to_backend', 'confirmed_by_backend', 'safe_to_delete_from_device', 'sync_failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseUserId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "displayName" TEXT,
    "firmwareVersion" TEXT,
    "storageCapacityBytes" INTEGER,
    "storageUsedBytes" INTEGER,
    "supportsOfflineCapture" BOOLEAN NOT NULL DEFAULT false,
    "firmwareStorageVersion" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'active',
    "pairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "status" "RecordingStatus" NOT NULL DEFAULT 'created',
    "captureSource" "CaptureSource" NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "durationMs" INTEGER,
    "sizeBytes" INTEGER,
    "uploadedAt" TIMESTAMP(3),
    "deviceLocalRecordingId" TEXT,
    "originalDeviceId" TEXT,
    "capturedOffline" BOOLEAN NOT NULL DEFAULT false,
    "dongleSyncStatus" "DongleRecordingSyncStatus",
    "deviceCreatedAt" TIMESTAMP(3),
    "deviceDurationMs" INTEGER,
    "deviceAudioCodec" TEXT,
    "deviceChecksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "recordingId" TEXT,
    "contextSnapshotId" TEXT,
    "source" "CaptureSource" NOT NULL,
    "buttonGesture" "ButtonGesture",
    "status" "CaptureSessionStatus" NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaptureSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordingId" TEXT,
    "transcriptId" TEXT,
    "noteId" TEXT,
    "contextSnapshotId" TEXT,
    "memoryThreadId" TEXT,
    "deviceId" TEXT,
    "type" "MemoryEventType" NOT NULL DEFAULT 'quick_note',
    "captureSource" "CaptureSource" NOT NULL,
    "buttonGesture" "ButtonGesture",
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "confidence" DOUBLE PRECISION,
    "importanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emotionalScore" DOUBLE PRECISION,
    "semanticHash" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'created',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "notesCount" INTEGER NOT NULL DEFAULT 0,
    "importanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unresolvedCount" INTEGER NOT NULL DEFAULT 0,
    "emotionalTrend" TEXT,
    "semanticClusterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "relatedThreadId" TEXT,
    "relatedNoteIds" TEXT[],
    "importanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "location" JSONB,
    "calendarContext" JSONB,
    "deviceState" JSONB,
    "appState" JSONB,
    "captureSource" "CaptureSource" NOT NULL,
    "buttonGesture" "ButtonGesture",
    "nearbyDeviceId" TEXT,
    "userSelectedProject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "language" TEXT,
    "text" TEXT NOT NULL,
    "segments" JSONB,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memoryEventId" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteChunk" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "embedding" vector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "noteId" TEXT,
    "title" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "dismissedAt" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AiJobType" NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'pending',
    "recordingId" TEXT,
    "memoryEventId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "payload" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordingId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");

-- CreateIndex
CREATE INDEX "User_supabaseUserId_idx" ON "User"("supabaseUserId");

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_hardwareId_key" ON "Device"("userId", "hardwareId");

-- CreateIndex
CREATE INDEX "Recording_userId_status_idx" ON "Recording"("userId", "status");

-- CreateIndex
CREATE INDEX "Recording_deviceId_idx" ON "Recording"("deviceId");

-- CreateIndex
CREATE INDEX "Recording_dongleSyncStatus_idx" ON "Recording"("dongleSyncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Recording_deviceId_deviceLocalRecordingId_key" ON "Recording"("deviceId", "deviceLocalRecordingId");

-- CreateIndex
CREATE INDEX "Recording_createdAt_idx" ON "Recording"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaptureSession_recordingId_key" ON "CaptureSession"("recordingId");

-- CreateIndex
CREATE UNIQUE INDEX "CaptureSession_contextSnapshotId_key" ON "CaptureSession"("contextSnapshotId");

-- CreateIndex
CREATE INDEX "CaptureSession_userId_status_idx" ON "CaptureSession"("userId", "status");

-- CreateIndex
CREATE INDEX "CaptureSession_deviceId_idx" ON "CaptureSession"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryEvent_recordingId_key" ON "MemoryEvent"("recordingId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryEvent_transcriptId_key" ON "MemoryEvent"("transcriptId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryEvent_noteId_key" ON "MemoryEvent"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryEvent_contextSnapshotId_key" ON "MemoryEvent"("contextSnapshotId");

-- CreateIndex
CREATE INDEX "MemoryEvent_userId_occurredAt_idx" ON "MemoryEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "MemoryEvent_userId_type_idx" ON "MemoryEvent"("userId", "type");

-- CreateIndex
CREATE INDEX "MemoryEvent_memoryThreadId_idx" ON "MemoryEvent"("memoryThreadId");

-- CreateIndex
CREATE INDEX "MemoryEvent_processingStatus_idx" ON "MemoryEvent"("processingStatus");

-- CreateIndex
CREATE INDEX "MemoryEvent_transcriptId_idx" ON "MemoryEvent"("transcriptId");

-- CreateIndex
CREATE INDEX "MemoryEvent_noteId_idx" ON "MemoryEvent"("noteId");

-- CreateIndex
CREATE INDEX "MemoryEvent_recordingId_idx" ON "MemoryEvent"("recordingId");

-- CreateIndex
CREATE INDEX "MemoryThread_userId_lastSeenAt_idx" ON "MemoryThread"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "MemoryThread_userId_importanceScore_idx" ON "MemoryThread"("userId", "importanceScore");

-- CreateIndex
CREATE INDEX "MemoryThread_semanticClusterId_idx" ON "MemoryThread"("semanticClusterId");

-- CreateIndex
CREATE INDEX "Insight_userId_isRead_idx" ON "Insight"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Insight_userId_importanceScore_idx" ON "Insight"("userId", "importanceScore");

-- CreateIndex
CREATE INDEX "Insight_relatedThreadId_idx" ON "Insight"("relatedThreadId");

-- CreateIndex
CREATE INDEX "ContextSnapshot_userId_timestamp_idx" ON "ContextSnapshot"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "ContextSnapshot_nearbyDeviceId_idx" ON "ContextSnapshot"("nearbyDeviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_recordingId_key" ON "Transcript"("recordingId");

-- CreateIndex
CREATE INDEX "Transcript_userId_idx" ON "Transcript"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Note_memoryEventId_key" ON "Note"("memoryEventId");

-- CreateIndex
CREATE INDEX "Note_userId_createdAt_idx" ON "Note"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NoteChunk_userId_idx" ON "NoteChunk"("userId");

-- CreateIndex
CREATE INDEX "NoteChunk_noteId_ordinal_idx" ON "NoteChunk"("noteId", "ordinal");

-- CreateIndex
CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

-- CreateIndex
CREATE INDEX "NoteTag_userId_idx" ON "NoteTag"("userId");

-- CreateIndex
CREATE INDEX "NoteTag_tagId_idx" ON "NoteTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteTag_noteId_tagId_key" ON "NoteTag"("noteId", "tagId");

-- CreateIndex
CREATE INDEX "ActionItem_userId_completedAt_idx" ON "ActionItem"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "ActionItem_noteId_idx" ON "ActionItem"("noteId");

-- CreateIndex
CREATE INDEX "Reminder_userId_remindAt_idx" ON "Reminder"("userId", "remindAt");

-- CreateIndex
CREATE INDEX "Reminder_noteId_idx" ON "Reminder"("noteId");

-- CreateIndex
CREATE INDEX "DailySummary_userId_idx" ON "DailySummary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailySummary_userId_date_key" ON "DailySummary"("userId", "date");

-- CreateIndex
CREATE INDEX "AiJob_userId_status_idx" ON "AiJob"("userId", "status");

-- CreateIndex
CREATE INDEX "AiJob_type_status_idx" ON "AiJob"("type", "status");

-- CreateIndex
CREATE INDEX "AiJob_recordingId_idx" ON "AiJob"("recordingId");

-- CreateIndex
CREATE INDEX "AiJob_memoryEventId_idx" ON "AiJob"("memoryEventId");

-- CreateIndex
CREATE INDEX "SyncItem_userId_status_idx" ON "SyncItem"("userId", "status");

-- CreateIndex
CREATE INDEX "SyncItem_entityType_entityId_idx" ON "SyncItem"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureSession" ADD CONSTRAINT "CaptureSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureSession" ADD CONSTRAINT "CaptureSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureSession" ADD CONSTRAINT "CaptureSession_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureSession" ADD CONSTRAINT "CaptureSession_contextSnapshotId_fkey" FOREIGN KEY ("contextSnapshotId") REFERENCES "ContextSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryEvent" ADD CONSTRAINT "MemoryEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryEvent" ADD CONSTRAINT "MemoryEvent_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryEvent" ADD CONSTRAINT "MemoryEvent_contextSnapshotId_fkey" FOREIGN KEY ("contextSnapshotId") REFERENCES "ContextSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryEvent" ADD CONSTRAINT "MemoryEvent_memoryThreadId_fkey" FOREIGN KEY ("memoryThreadId") REFERENCES "MemoryThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryEvent" ADD CONSTRAINT "MemoryEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryThread" ADD CONSTRAINT "MemoryThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_relatedThreadId_fkey" FOREIGN KEY ("relatedThreadId") REFERENCES "MemoryThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextSnapshot" ADD CONSTRAINT "ContextSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextSnapshot" ADD CONSTRAINT "ContextSnapshot_nearbyDeviceId_fkey" FOREIGN KEY ("nearbyDeviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_memoryEventId_fkey" FOREIGN KEY ("memoryEventId") REFERENCES "MemoryEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteChunk" ADD CONSTRAINT "NoteChunk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteChunk" ADD CONSTRAINT "NoteChunk_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteTag" ADD CONSTRAINT "NoteTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteTag" ADD CONSTRAINT "NoteTag_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteTag" ADD CONSTRAINT "NoteTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_memoryEventId_fkey" FOREIGN KEY ("memoryEventId") REFERENCES "MemoryEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncItem" ADD CONSTRAINT "SyncItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncItem" ADD CONSTRAINT "SyncItem_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE SET NULL ON UPDATE CASCADE;
