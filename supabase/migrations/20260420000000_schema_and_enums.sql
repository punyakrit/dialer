-- ============================================================
-- Dialer by LaunchCraft — schema bootstrap + enums + helpers
-- ============================================================

create schema if not exists dialer;

create extension if not exists "pgcrypto";     -- gen_random_uuid()
create extension if not exists "citext";

-- Enums ----------------------------------------------------------
do $$ begin
  create type dialer.user_role as enum ('OWNER','ADMIN','AGENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dialer.lead_status as enum (
    'NEW','ATTEMPTED','CONNECTED','INTERESTED',
    'MEETING_BOOKED','CLOSED_WON','CLOSED_LOST'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type dialer.call_direction as enum ('OUTBOUND','INBOUND');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dialer.call_status as enum (
    'QUEUED','INITIATED','RINGING','IN_PROGRESS','COMPLETED',
    'BUSY','FAILED','NO_ANSWER','CANCELED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type dialer.disposition as enum (
    'CONNECTED','VOICEMAIL','NO_ANSWER','BUSY','WRONG_NUMBER',
    'NOT_INTERESTED','CALLBACK_REQUESTED','MEETING_BOOKED','DO_NOT_CALL'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type dialer.meeting_status as enum (
    'SCHEDULED','COMPLETED','CANCELED','NO_SHOW'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type dialer.activity_type as enum (
    'CALL','SMS','NOTE','STATUS_CHANGE','MEETING','IMPORT'
  );
exception when duplicate_object then null; end $$;

-- Shared updated_at trigger -------------------------------------
create or replace function dialer.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
