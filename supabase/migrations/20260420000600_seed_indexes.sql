-- ============================================================
-- Dialer by LaunchCraft — search indexes
-- ============================================================
-- Trigram indexes for fuzzy lead search across phone/email/company.
-- GIN on custom_fields to support JSONB filtering.

create extension if not exists "pg_trgm";

create index if not exists idx_leads_phone_trgm
  on dialer.leads using gin (phone gin_trgm_ops);
create index if not exists idx_leads_email_trgm
  on dialer.leads using gin ((email::text) gin_trgm_ops);
create index if not exists idx_leads_company_trgm
  on dialer.leads using gin (company gin_trgm_ops);
create index if not exists idx_leads_custom_fields
  on dialer.leads using gin (custom_fields jsonb_path_ops);
