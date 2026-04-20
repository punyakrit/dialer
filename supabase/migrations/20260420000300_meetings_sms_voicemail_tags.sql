-- ============================================================
-- Dialer by LaunchCraft — meetings, sms templates, voicemail drops, tags
-- ============================================================

create table dialer.meetings (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references dialer.workspaces(id) on delete cascade,
  lead_id      uuid not null references dialer.leads(id) on delete cascade,
  organizer_id uuid not null references dialer.users(id),
  title        text not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  email        citext,                                  -- captured during the call
  status       dialer.meeting_status not null default 'SCHEDULED',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_meetings_workspace_starts on dialer.meetings(workspace_id, starts_at);
create index idx_meetings_lead on dialer.meetings(lead_id);
create trigger tr_meetings_updated_at
  before update on dialer.meetings
  for each row execute function dialer.tg_set_updated_at();

create table dialer.sms_templates (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references dialer.workspaces(id) on delete cascade,
  name         text not null,
  body         text not null,
  variables    text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, name)
);
create trigger tr_sms_templates_updated_at
  before update on dialer.sms_templates
  for each row execute function dialer.tg_set_updated_at();

create table dialer.voicemail_drops (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references dialer.workspaces(id) on delete cascade,
  name         text not null,
  storage_path text not null,
  duration_sec int,
  created_at   timestamptz not null default now(),
  unique (workspace_id, name)
);

-- Back-reference from calls to the voicemail drop that was played, if any.
alter table dialer.calls
  add constraint calls_voicemail_dropped_fk
  foreign key (voicemail_dropped_id)
  references dialer.voicemail_drops(id)
  on delete set null;

create table dialer.tags (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references dialer.workspaces(id) on delete cascade,
  name         text not null,
  color        text not null default '#999999',
  unique (workspace_id, name)
);

create table dialer.lead_tags (
  lead_id uuid not null references dialer.leads(id) on delete cascade,
  tag_id  uuid not null references dialer.tags(id)  on delete cascade,
  primary key (lead_id, tag_id)
);
create index idx_lead_tags_tag on dialer.lead_tags(tag_id);
