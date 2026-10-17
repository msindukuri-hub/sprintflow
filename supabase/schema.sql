-- ============================================================
-- SprintFlow — database schema
-- Apply this to a Supabase project (SQL editor) or any
-- PostgreSQL 14+ instance. For Supabase, the auth schema and
-- auth.uid() function already exist; the local-verification
-- version of this file (supabase/schema_local.sql) emulates them.
-- ============================================================

-- gen_random_uuid() is a core function since PostgreSQL 13; no extension needed.

-- ---------- Tables ----------

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  owner_id    uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'member')),
  joined_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.sprints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null,
  goal        text not null default '',
  start_date  date not null,
  end_date    date not null,
  status      text not null default 'planned' check (status in ('planned', 'active', 'completed')),
  created_at  timestamptz not null default now(),
  constraint sprint_dates_valid check (end_date >= start_date)
);

create table if not exists public.user_stories (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references public.projects (id) on delete cascade,
  sprint_id             uuid references public.sprints (id) on delete set null,
  title                 text not null,
  description           text not null default '',
  acceptance_criteria   text not null default '',
  story_points          integer check (story_points is null or story_points >= 0),
  status                text not null default 'backlog' check (status in ('backlog', 'todo', 'in_progress', 'review', 'done')),
  assignee_id           uuid references auth.users (id) on delete set null,
  reporter_id           uuid references auth.users (id) on delete set null,
  position              integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  story_id     uuid not null references public.user_stories (id) on delete cascade,
  title        text not null,
  description  text not null default '',
  status       text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  assignee_id  uuid references auth.users (id) on delete set null,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_project_members_user on public.project_members (user_id);
create index if not exists idx_sprints_project on public.sprints (project_id);
create index if not exists idx_stories_project on public.user_stories (project_id);
create index if not exists idx_stories_sprint on public.user_stories (sprint_id);
create index if not exists idx_tasks_story on public.tasks (story_id);

-- Limited public view of users (for member lists / invites).
-- The auth schema is not exposed to the API directly, so we
-- surface just id + email — and only for users who share a
-- project with the caller (or the caller themselves).
create or replace function public.is_member_of_any_project_of(p_user_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1
    from public.project_members a
    join public.project_members b on a.project_id = b.project_id
    where a.user_id = p_user_id
      and b.user_id = auth.uid()
  );
$$;

create or replace view public.auth_users_view
as select u.id, u.email
   from auth.users u
   where u.id = auth.uid()
      or public.is_member_of_any_project_of(u.id);

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_stories_touch on public.user_stories;
create trigger trg_stories_touch before update on public.user_stories
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_tasks_touch on public.tasks;
create trigger trg_tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------

alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.sprints         enable row level security;
alter table public.user_stories    enable row level security;
alter table public.tasks           enable row level security;

-- Helper: is the current user a member of this project?
-- security definer is required here: the function runs as the table
-- owner, which bypasses RLS when it reads project_members. This both
-- avoids infinite RLS recursion (policy -> helper -> RLS table -> ...)
-- and is the standard Supabase multi-tenant pattern.
create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  );
$$;

create or replace function public.is_project_owner(p_project_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role = 'owner'
  );
$$;

-- projects
create policy "projects_select" on public.projects for select
  using (public.is_project_member(id));
create policy "projects_insert" on public.projects for insert
  with check (auth.uid() = owner_id);
create policy "projects_update" on public.projects for update
  using (public.is_project_member(id));
create policy "projects_delete" on public.projects for delete
  using (public.is_project_owner(id));

-- project_members
create policy "members_select" on public.project_members for select
  using (public.is_project_member(project_id));
create policy "members_insert" on public.project_members for insert
  with check (public.is_project_member(project_id));
create policy "members_update" on public.project_members for update
  using (public.is_project_owner(project_id));
create policy "members_delete" on public.project_members for delete
  using (public.is_project_owner(project_id) or public.is_project_member(project_id) and auth.uid() = user_id);

-- sprints
create policy "sprints_select" on public.sprints for select
  using (public.is_project_member(project_id));
create policy "sprints_insert" on public.sprints for insert
  with check (public.is_project_member(project_id));
create policy "sprints_update" on public.sprints for update
  using (public.is_project_member(project_id));
create policy "sprints_delete" on public.sprints for delete
  using (public.is_project_member(project_id));

-- user_stories
create policy "stories_select" on public.user_stories for select
  using (public.is_project_member(project_id));
create policy "stories_insert" on public.user_stories for insert
  with check (public.is_project_member(project_id));
create policy "stories_update" on public.user_stories for update
  using (public.is_project_member(project_id));
create policy "stories_delete" on public.user_stories for delete
  using (public.is_project_member(project_id));

-- tasks
create policy "tasks_select" on public.tasks for select
  using (exists (
    select 1 from public.user_stories s where s.id = story_id and public.is_project_member(s.project_id)
  ));
create policy "tasks_insert" on public.tasks for insert
  with check (exists (
    select 1 from public.user_stories s where s.id = story_id and public.is_project_member(s.project_id)
  ));
create policy "tasks_update" on public.tasks for update
  using (exists (
    select 1 from public.user_stories s where s.id = story_id and public.is_project_member(s.project_id)
  ));
create policy "tasks_delete" on public.tasks for delete
  using (exists (
    select 1 from public.user_stories s where s.id = story_id and public.is_project_member(s.project_id)
  ));

-- ---------- Grants for API roles ----------
-- On Supabase these roles (anon, authenticated) already exist.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on
      public.projects, public.project_members, public.sprints,
      public.user_stories, public.tasks to anon, authenticated;
    grant select on public.auth_users_view to anon, authenticated;
    grant execute on function public.is_member_of_any_project_of(uuid) to anon, authenticated;
    grant execute on function public.is_project_member(uuid) to anon, authenticated;
    grant execute on function public.is_project_owner(uuid) to anon, authenticated;
  end if;
end $$;