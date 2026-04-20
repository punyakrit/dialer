-- ============================================================
-- Dialer by LaunchCraft — performance RPCs + extra indexes
-- ============================================================
-- Auth stays on custom JWT (see `lib/auth/*`). This migration only adds
-- perf-oriented indexes and three RPCs that collapse hot-path reads into
-- a single round-trip.

-- ------------------------------------------------------------
-- Extra performance indexes
-- ------------------------------------------------------------

-- BRIN on created_at for large range scans (tiny index, fast).
create index if not exists idx_calls_created_brin
  on dialer.calls using brin (created_at);

-- Leads filtered by status with a secondary order on last_contacted_at.
create index if not exists idx_leads_ws_status_contacted
  on dialer.leads(workspace_id, status, last_contacted_at desc nulls last);

-- SMS template list.
create index if not exists idx_sms_templates_ws_name
  on dialer.sms_templates(workspace_id, name);

-- Activity log lookups by target.
create index if not exists idx_activity_target_created
  on dialer.activity_logs(target_type, target_id, created_at desc);

-- ------------------------------------------------------------
-- RPC: dialer.get_me(p_user_id uuid)
-- Returns one row with the current user, workspace, and whether Twilio is
-- configured. Saves 3 round-trips on `/api/auth/me`.
-- ------------------------------------------------------------

create or replace function dialer.get_me(p_user_id uuid)
returns table (
  user_id           uuid,
  email             text,
  name              text,
  avatar_url        text,
  role              dialer.user_role,
  workspace_id      uuid,
  workspace_name    text,
  workspace_slug    text,
  timezone          text,
  twilio_connected  boolean,
  twilio_from       text,
  twilio_edge       text,
  last_test_status  text
)
language sql
stable
as $$
  select
    u.id                 as user_id,
    u.email::text        as email,
    u.name               as name,
    u.avatar_url         as avatar_url,
    u.role               as role,
    w.id                 as workspace_id,
    w.name               as workspace_name,
    w.slug               as workspace_slug,
    w.timezone           as timezone,
    (tc.id is not null)  as twilio_connected,
    tc.from_number       as twilio_from,
    tc.edge              as twilio_edge,
    tc.last_test_status  as last_test_status
  from dialer.users u
  join dialer.workspaces w on w.id = u.workspace_id
  left join dialer.twilio_configs tc on tc.workspace_id = u.workspace_id
  where u.id = p_user_id
  limit 1;
$$;

grant execute on function dialer.get_me(uuid) to service_role;

-- ------------------------------------------------------------
-- RPC: dialer.kpis(p_workspace_id, p_since)
-- Single round-trip KPI calculation.
-- ------------------------------------------------------------

create or replace function dialer.kpis(
  p_workspace_id uuid,
  p_since        timestamptz
)
returns table (
  calls_total         int,
  calls_connected     int,
  talk_time_sec       bigint,
  meetings_booked     int,
  leads_contacted     int
)
language sql
stable
as $$
  with
    call_stats as (
      select
        count(*)::int                                                           as calls_total,
        count(*) filter (where status in ('COMPLETED','IN_PROGRESS'))::int      as calls_connected,
        coalesce(sum(duration_sec) filter (where status = 'COMPLETED'), 0)::bigint
                                                                                as talk_time_sec,
        count(distinct lead_id) filter (where lead_id is not null)::int         as leads_contacted
      from dialer.calls
      where workspace_id = p_workspace_id
        and created_at >= p_since
    ),
    meeting_stats as (
      select count(*)::int as meetings_booked
      from dialer.meetings
      where workspace_id = p_workspace_id
        and created_at >= p_since
    )
  select
    cs.calls_total,
    cs.calls_connected,
    cs.talk_time_sec,
    ms.meetings_booked,
    cs.leads_contacted
  from call_stats cs, meeting_stats ms;
$$;

grant execute on function dialer.kpis(uuid, timestamptz) to service_role;

-- ------------------------------------------------------------
-- RPC: dialer.call_series(p_workspace_id, p_days)
-- Day-bucketed time series for the analytics chart.
-- ------------------------------------------------------------

create or replace function dialer.call_series(
  p_workspace_id uuid,
  p_days         int
)
returns table (
  day        date,
  calls      int,
  connected  int,
  talk_sec   bigint
)
language sql
stable
as $$
  with days as (
    select generate_series(
      (current_date - make_interval(days => p_days - 1))::date,
      current_date,
      '1 day'::interval
    )::date as day
  )
  select
    d.day,
    coalesce(count(c.id) filter (where c.id is not null), 0)::int                                as calls,
    coalesce(count(c.id) filter (where c.status in ('COMPLETED','IN_PROGRESS')), 0)::int         as connected,
    coalesce(sum(c.duration_sec) filter (where c.status = 'COMPLETED'), 0)::bigint               as talk_sec
  from days d
  left join dialer.calls c
    on c.workspace_id = p_workspace_id
   and c.created_at >= d.day
   and c.created_at <  d.day + interval '1 day'
  group by d.day
  order by d.day;
$$;

grant execute on function dialer.call_series(uuid, int) to service_role;
