-- ============================================================
-- Dialer by LaunchCraft — twilio_configs, leads, calls
-- ============================================================

create table dialer.twilio_configs (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null unique references dialer.workspaces(id) on delete cascade,
  account_sid_cipher    text not null,
  api_key_sid_cipher    text not null,
  api_key_secret_cipher text not null,
  twiml_app_sid_cipher  text not null,
  auth_token_cipher     text,
  from_number           text not null,
  edge                  text not null default 'singapore',
  record_calls          boolean not null default true,
  amd_enabled           boolean not null default true,
  last_tested_at        timestamptz,
  last_test_status      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger tr_twilio_configs_updated_at
  before update on dialer.twilio_configs
  for each row execute function dialer.tg_set_updated_at();

create table dialer.leads (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references dialer.workspaces(id) on delete cascade,
  first_name        text,
  last_name         text,
  company           text,
  title             text,
  website           text,
  niche             text,
  email             citext,
  phone             text not null,              -- stored as E.164 +1...
  phone_normalized  text,                       -- dedupe key (digits-only, normalized)
  timezone          text,
  source            text,
  status            dialer.lead_status not null default 'NEW',
  score             int not null default 0,
  assigned_to_id    uuid references dialer.users(id) on delete set null,
  last_contacted_at timestamptz,
  notes             text,
  custom_fields     jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint leads_workspace_phone_unique unique (workspace_id, phone_normalized)
);
create index idx_leads_workspace_status on dialer.leads(workspace_id, status);
create index idx_leads_workspace_assigned on dialer.leads(workspace_id, assigned_to_id);
create index idx_leads_workspace_last_contacted on dialer.leads(workspace_id, last_contacted_at);
create index idx_leads_workspace_company on dialer.leads(workspace_id, company);
create index idx_leads_email on dialer.leads(workspace_id, email);
create trigger tr_leads_updated_at
  before update on dialer.leads
  for each row execute function dialer.tg_set_updated_at();

create table dialer.calls (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid not null references dialer.workspaces(id) on delete cascade,
  user_id                uuid not null references dialer.users(id),
  lead_id                uuid references dialer.leads(id) on delete set null,
  twilio_call_sid        text unique,
  parent_call_sid        text,
  direction              dialer.call_direction not null default 'OUTBOUND',
  "from"                 text not null,
  "to"                   text not null,
  status                 dialer.call_status not null default 'QUEUED',
  disposition            dialer.disposition,
  started_at             timestamptz,
  answered_at            timestamptz,
  ended_at               timestamptz,
  duration_sec           int,
  price_usd              numeric(10, 4),
  recording_url          text,
  recording_sid          text,
  recording_duration_sec int,
  amd_result             text,
  voicemail_dropped_id   uuid,                  -- FK added in the next migration
  notes                  text,
  error_code             text,
  error_message          text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index idx_calls_workspace_created on dialer.calls(workspace_id, created_at desc);
create index idx_calls_workspace_user_created on dialer.calls(workspace_id, user_id, created_at desc);
create index idx_calls_lead on dialer.calls(lead_id);
create index idx_calls_status on dialer.calls(status);
create index idx_calls_disposition on dialer.calls(workspace_id, disposition);
create trigger tr_calls_updated_at
  before update on dialer.calls
  for each row execute function dialer.tg_set_updated_at();
