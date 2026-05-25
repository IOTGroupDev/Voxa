-- Draft Supabase RLS policies for the Voxa MVP.
-- Apply only after the Prisma schema is migrated and table names are confirmed.

-- Required extension for semantic search.
create extension if not exists vector;

-- Storage buckets.
insert into storage.buckets (id, name, public)
values
  ('audio-private', 'audio-private', false),
  ('user-media', 'user-media', false)
on conflict (id) do nothing;

-- Pattern for user-owned tables:
-- alter table "Recording" enable row level security;
-- create policy "recordings_select_own"
--   on "Recording"
--   for select
--   using ("userId" in (select id from "User" where "supabaseUserId" = auth.uid()::text));

-- Repeat the policy style for:
-- "Device", "Recording", "MemoryEvent", "ContextSnapshot", "Transcript",
-- "MemoryThread", "Note", "NoteChunk", "Tag", "NoteTag", "ActionItem",
-- "Reminder", "Insight", "DailySummary", "AiJob", and "SyncItem".

-- Storage path policy style:
-- The object path should start with the Supabase auth user id:
-- {auth.uid()}/recordings/{recording_id}.m4a
--
-- create policy "audio_private_select_own"
--   on storage.objects
--   for select
--   using (
--     bucket_id = 'audio-private'
--     and (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- create policy "audio_private_insert_own"
--   on storage.objects
--   for insert
--   with check (
--     bucket_id = 'audio-private'
--     and (storage.foldername(name))[1] = auth.uid()::text
--   );
