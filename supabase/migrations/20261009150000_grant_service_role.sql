-- Newer Supabase projects no longer auto-grant table privileges to the API
-- roles for tables created through SQL migrations. The serverless API uses the
-- service_role key (it bypasses RLS but still needs plain GRANTs), so without
-- these every request fails with 42501 "permission denied for table ...".
-- RLS stays enabled with no policies, so anon/authenticated still get nothing.

grant usage on schema public to service_role;

grant select, insert, update, delete on public.admin_emails       to service_role;
grant select, insert, update, delete on public.page_views         to service_role;
grant select, insert, update, delete on public.visitor_heartbeats to service_role;
grant select, insert, update, delete on public.ai_chat_events     to service_role;
grant select, insert, update, delete on public.contact_clicks     to service_role;

-- Sequences (e.g. bigserial ids) used by inserts.
grant usage, select on all sequences in schema public to service_role;

-- Future tables created by migrations get the same grant automatically.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
