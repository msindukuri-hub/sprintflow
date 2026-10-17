-- Local verification schema: emulates Supabase's auth schema so the
-- same RLS policies can be exercised against plain PostgreSQL + PostgREST.
-- (The real deployment uses supabase/schema.sql on Supabase.)

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text unique not null
);
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

\i supabase/schema.sql

-- Local-only: create the anon + authenticated roles that PostgREST uses
-- to test RLS (on Supabase these exist natively).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
    create role authenticated nologin;
  end if;
end $$;
grant usage on schema auth to anon, authenticated;
grant select on auth.users to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;