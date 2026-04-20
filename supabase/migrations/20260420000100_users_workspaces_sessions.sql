-- ============================================================
-- Dialer by LaunchCraft — workspaces, users, sessions, push subs
-- ============================================================

create table dialer.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  timezone   text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tr_workspaces_updated_at
  before update on dialer.workspaces
  for each row execute function dialer.tg_set_updated_at();

create table dialer.users (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null unique,
  password_hash text,
  name          text,
  avatar_url    text,
  google_id     text unique,
  role          dialer.user_role not null default 'OWNER',
  workspace_id  uuid not null references dialer.workspaces(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_users_workspace on dialer.users(workspace_id);
create trigger tr_users_updated_at
  before update on dialer.users
  for each row execute function dialer.tg_set_updated_at();

create table dialer.sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references dialer.users(id) on delete cascade,
  refresh_token_hash text not null unique,
  user_agent         text,
  ip                 text,
  expires_at         timestamptz not null,
  revoked_at         timestamptz,
  created_at         timestamptz not null default now()
);
create index idx_sessions_user on dialer.sessions(user_id);
create index idx_sessions_expires on dialer.sessions(expires_at);

create table dialer.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references dialer.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index idx_push_user on dialer.push_subscriptions(user_id);
