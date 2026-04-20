-- ============================================================
-- Dialer by LaunchCraft — Supabase Storage buckets
-- ============================================================
-- Buckets live in the built-in `storage` schema, not dialer.
-- All access goes through the service role on the server. The app
-- generates short-lived signed URLs when surfacing recordings to users.

insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('voicemail-drops', 'voicemail-drops', false)
on conflict (id) do nothing;
