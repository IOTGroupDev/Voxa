-- Supabase RLS policies for Voxa user-owned data.
-- Apply after Prisma migrations. Backend service-role access still bypasses RLS;
-- direct authenticated clients are restricted to rows owned by auth.uid().

create extension if not exists vector;

insert into storage.buckets (id, name, public)
values
  ('audio-private', 'audio-private', false),
  ('user-media', 'user-media', false)
on conflict (id) do nothing;

alter table "User" enable row level security;

drop policy if exists "users_select_self" on "User";
create policy "users_select_self"
  on "User"
  for select
  using ("supabaseUserId" = auth.uid()::text);

drop policy if exists "users_insert_self" on "User";
create policy "users_insert_self"
  on "User"
  for insert
  with check ("supabaseUserId" = auth.uid()::text);

drop policy if exists "users_update_self" on "User";
create policy "users_update_self"
  on "User"
  for update
  using ("supabaseUserId" = auth.uid()::text)
  with check ("supabaseUserId" = auth.uid()::text);

drop policy if exists "users_delete_self" on "User";
create policy "users_delete_self"
  on "User"
  for delete
  using ("supabaseUserId" = auth.uid()::text);

alter table "UserSettings" enable row level security;
alter table "Device" enable row level security;
alter table "Recording" enable row level security;
alter table "AudioDeletionLog" enable row level security;
alter table "CaptureSession" enable row level security;
alter table "MemoryEvent" enable row level security;
alter table "MemoryThread" enable row level security;
alter table "Insight" enable row level security;
alter table "ContextSnapshot" enable row level security;
alter table "Transcript" enable row level security;
alter table "Note" enable row level security;
alter table "Entity" enable row level security;
alter table "EntityRelation" enable row level security;
alter table "AiSuggestion" enable row level security;
alter table "EntityMention" enable row level security;
alter table "NoteChunk" enable row level security;
alter table "Tag" enable row level security;
alter table "NoteTag" enable row level security;
alter table "ActionItem" enable row level security;
alter table "Reminder" enable row level security;
alter table "DailySummary" enable row level security;
alter table "AiJob" enable row level security;
alter table "SyncItem" enable row level security;

drop policy if exists "user_settings_own_rows" on "UserSettings";
create policy "user_settings_own_rows" on "UserSettings"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "devices_own_rows" on "Device";
create policy "devices_own_rows" on "Device"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "recordings_own_rows" on "Recording";
create policy "recordings_own_rows" on "Recording"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "audio_deletion_logs_own_rows" on "AudioDeletionLog";
create policy "audio_deletion_logs_own_rows" on "AudioDeletionLog"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "capture_sessions_own_rows" on "CaptureSession";
create policy "capture_sessions_own_rows" on "CaptureSession"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "memory_events_own_rows" on "MemoryEvent";
create policy "memory_events_own_rows" on "MemoryEvent"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "memory_threads_own_rows" on "MemoryThread";
create policy "memory_threads_own_rows" on "MemoryThread"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "insights_own_rows" on "Insight";
create policy "insights_own_rows" on "Insight"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "context_snapshots_own_rows" on "ContextSnapshot";
create policy "context_snapshots_own_rows" on "ContextSnapshot"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "transcripts_own_rows" on "Transcript";
create policy "transcripts_own_rows" on "Transcript"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "notes_own_rows" on "Note";
create policy "notes_own_rows" on "Note"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "entities_own_rows" on "Entity";
create policy "entities_own_rows" on "Entity"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "entity_relations_own_rows" on "EntityRelation";
create policy "entity_relations_own_rows" on "EntityRelation"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "ai_suggestions_own_rows" on "AiSuggestion";
create policy "ai_suggestions_own_rows" on "AiSuggestion"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "entity_mentions_own_rows" on "EntityMention";
create policy "entity_mentions_own_rows" on "EntityMention"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "note_chunks_own_rows" on "NoteChunk";
create policy "note_chunks_own_rows" on "NoteChunk"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "tags_own_rows" on "Tag";
create policy "tags_own_rows" on "Tag"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "note_tags_own_rows" on "NoteTag";
create policy "note_tags_own_rows" on "NoteTag"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "action_items_own_rows" on "ActionItem";
create policy "action_items_own_rows" on "ActionItem"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "reminders_own_rows" on "Reminder";
create policy "reminders_own_rows" on "Reminder"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "daily_summaries_own_rows" on "DailySummary";
create policy "daily_summaries_own_rows" on "DailySummary"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "ai_jobs_own_rows" on "AiJob";
create policy "ai_jobs_own_rows" on "AiJob"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "sync_items_own_rows" on "SyncItem";
create policy "sync_items_own_rows" on "SyncItem"
  for all
  using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text))
  with check ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

drop policy if exists "audio_private_select_own" on storage.objects;
create policy "audio_private_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'audio-private'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "audio_private_insert_own" on storage.objects;
create policy "audio_private_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'audio-private'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "audio_private_update_own" on storage.objects;
create policy "audio_private_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'audio-private'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'audio-private'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "audio_private_delete_own" on storage.objects;
create policy "audio_private_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'audio-private'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
