-- Development seed — safe to re-run. Idempotent-ish: only inserts when the
-- demo workspace has no leads yet.

do $$
declare ws_id uuid;
begin
  -- Demo workspace (create or fetch).
  select id into ws_id from dialer.workspaces where slug = 'demo-workspace';
  if ws_id is null then
    insert into dialer.workspaces (name, slug)
    values ('Demo Agency', 'demo-workspace')
    returning id into ws_id;
  end if;

  if not exists (select 1 from dialer.leads where workspace_id = ws_id) then
    insert into dialer.leads
      (workspace_id, first_name, last_name, company, website, niche, email, phone, phone_normalized, status, source)
    values
      (ws_id, 'Ava',    'Jordan',   'Brightline Dental',     'brightline.dental',   'Dentistry',       'ava@brightline.dental',     '+14155551001', '14155551001', 'NEW',        'CSV'),
      (ws_id, 'Marcus', 'Okafor',   'North Peak Fitness',    'northpeakfit.com',    'Fitness',         'marcus@northpeakfit.com',   '+14155551002', '14155551002', 'ATTEMPTED',  'CSV'),
      (ws_id, 'Lina',   'Schneider','Vela Interiors',        'velainteriors.co',    'Home services',   'lina@velainteriors.co',     '+14155551003', '14155551003', 'CONNECTED',  'Referral'),
      (ws_id, 'Dev',    'Raghav',   'Lantern Legal',         'lanternlegal.com',    'Legal',           'dev@lanternlegal.com',      '+14155551004', '14155551004', 'INTERESTED', 'Cold list'),
      (ws_id, 'Priya',  'Mehta',    'Sun & Sea Hospitality', 'sunandsea.hotels',    'Hospitality',     'priya@sunandsea.hotels',    '+14155551005', '14155551005', 'MEETING_BOOKED', 'Event'),
      (ws_id, 'Tomás',  'Vega',     'Ember & Oak Roasters',  'emberoak.coffee',     'Food & drink',    'tomas@emberoak.coffee',     '+14155551006', '14155551006', 'NEW',        'Form fill'),
      (ws_id, 'Hana',   'Park',     'Harborfield Orthodontics','harborfieldortho.com','Dentistry',     'hana@harborfieldortho.com', '+14155551007', '14155551007', 'CLOSED_WON', 'Referral'),
      (ws_id, 'Jason',  'Wu',       'BluePine HVAC',         'bluepinehvac.com',    'Home services',   'jason@bluepinehvac.com',    '+14155551008', '14155551008', 'CLOSED_LOST','Cold list');
  end if;
end $$;
