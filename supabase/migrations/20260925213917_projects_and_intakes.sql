-- Organiser: raw material thrown at it (intakes) and the sorted register (projects).

create table public.intakes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null default '' check (char_length(text) <= 200000),
  links text not null default '' check (char_length(links) <= 20000),
  files jsonb not null default '[]',
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  summary text check (char_length(summary) <= 4000),
  error text check (char_length(error) <= 4000),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (id, owner_id)
);
create index intakes_owner_created_idx on public.intakes (owner_id, created_at desc);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'upcoming' check (status in ('live', 'active', 'upcoming', 'idea', 'paused', 'done')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  summary text not null default '' check (char_length(summary) <= 2000),
  current_work text not null default '' check (char_length(current_work) <= 2000),
  next_steps text[] not null default '{}' check (cardinality(next_steps) <= 30),
  location text not null default '' check (char_length(location) <= 500),
  links text[] not null default '{}' check (cardinality(links) <= 30),
  target text not null default '' check (char_length(target) <= 120),
  notes text not null default '' check (char_length(notes) <= 5000),
  position double precision not null default 0,
  last_intake_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (last_intake_id, owner_id) references public.intakes(id, owner_id) on delete set null (last_intake_id)
);
create index projects_owner_idx on public.projects (owner_id);
create index projects_last_intake_owner_idx on public.projects (last_intake_id, owner_id);

do $$
declare t text;
begin
  foreach t in array array['intakes', 'projects'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s_select_own" on public.%I for select to authenticated using ((select auth.uid()) = owner_id)', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert to authenticated with check ((select auth.uid()) = owner_id)', t, t);
    execute format('create policy "%s_update_own" on public.%I for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete to authenticated using ((select auth.uid()) = owner_id)', t, t);
  end loop;
end $$;

alter publication supabase_realtime add table public.intakes, public.projects;
