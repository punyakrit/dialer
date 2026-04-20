-- ============================================================
-- Dialer by LaunchCraft — activity log + deny-all RLS belt
-- ============================================================

create table dialer.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references dialer.workspaces(id) on delete cascade,
  user_id      uuid references dialer.users(id) on delete set null,
  type         dialer.activity_type not null,
  target_type  text,
  target_id    uuid,
  payload      jsonb,
  created_at   timestamptz not null default now()
);
create index idx_activity_workspace_created on dialer.activity_logs(workspace_id, created_at desc);
create index idx_activity_target on dialer.activity_logs(target_type, target_id);

-- Defense-in-depth: enable RLS + deny-all on every table. Service role
-- bypasses RLS, so the app keeps working; any accidental use of anon/public
-- keys from the browser leaks nothing.
do $$
declare t text;
begin
  for t in
    select table_name from information_schema.tables
     where table_schema = 'dialer' and table_type = 'BASE TABLE'
  loop
    execute format('alter table dialer.%I enable row level security', t);
    execute format('revoke all on dialer.%I from anon, authenticated', t);
  end loop;
end $$;

-- Make service_role access explicit (it already has bypassrls, but intent).
grant usage on schema dialer to service_role;
grant all on all tables in schema dialer to service_role;
grant all on all sequences in schema dialer to service_role;
alter default privileges in schema dialer grant all on tables to service_role;
alter default privileges in schema dialer grant all on sequences to service_role;
