# Security And Privacy

Voxa must treat audio and memory data as private by default.

## Required Architecture Support

- encrypted transport;
- private Supabase Storage buckets;
- Supabase RLS by user ownership;
- optional audio auto-delete after transcription;
- user data export;
- account deletion;
- explicit microphone and Bluetooth permissions;
- user-controlled retention settings;
- no stealth recording;
- no always-on recording in MVP.

## Recording Transparency

The app must clearly show when recording is active. The dongle should expose LED or vibration indication for recording state. Recording without visible indication is out of scope.

The app must not imply guaranteed or hidden capture from a locked, suspended, or powered-off phone. If the phone cannot start or continue recording, the product should show a missed or unavailable capture state instead of creating a fake memory.

## RLS Policy Style

For all user-owned tables, policies should enforce:

```sql
user_id = auth.uid()
```

If the product keeps a local `User` table with `supabase_user_id`, policies should use a stable mapping from `auth.uid()` to owned records.

A draft policy file is available at `backend/prisma/rls-policies.sql`.

## Storage Policy Style

Audio files use the private `audio-private` bucket. Paths should include the user id:

```txt
{user_id}/recordings/{recording_id}.m4a
```

Users should only access their own paths. Backend service-role access should be restricted to signed URL creation and controlled cleanup.

## Sensitive Context

`ContextSnapshot` should collect only data needed for useful memory interpretation. Location and calendar context are optional. Defaults should avoid broad background collection.
