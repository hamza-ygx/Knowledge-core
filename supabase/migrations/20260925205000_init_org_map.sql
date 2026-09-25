create extension if not exists pgcrypto with schema extensions;

-- Departments ---------------------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  subtitle text not null default '' check (char_length(subtitle) <= 120),
  color text not null default '#ff6a1f' check (color ~ '^#[0-9a-fA-F]{6}$'),
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

-- Agents --------------------------------------------------------------
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  department_id uuid not null,
  reports_to uuid,
  name text not null check (char_length(name) between 1 and 80),
  role text not null default '' check (char_length(role) <= 120),
  kind text not null default 'ai_agent' check (kind in ('ai_agent', 'automation', 'human')),
  status text not null default 'idle' check (status in ('idle', 'working', 'blocked')),
  tools text[] not null default '{}' check (cardinality(tools) <= 20),
  description text not null default '' check (char_length(description) <= 2000),
  webhook_token_hash bytea,
  last_run_at timestamptz,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  check (reports_to is null or reports_to <> id),
  foreign key (department_id, owner_id) references public.departments(id, owner_id) on delete cascade,
  foreign key (reports_to, owner_id) references public.agents(id, owner_id) on delete set null (reports_to)
);
create index agents_department_idx on public.agents (department_id);
create index agents_reports_to_idx on public.agents (reports_to);
create index agents_owner_idx on public.agents (owner_id);

-- Process steps -------------------------------------------------------
create table public.process_steps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id uuid not null,
  position double precision not null default 0,
  text text not null check (char_length(text) between 1 and 300),
  automated boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (agent_id, owner_id) references public.agents(id, owner_id) on delete cascade
);
create index process_steps_agent_idx on public.process_steps (agent_id);
create index process_steps_owner_idx on public.process_steps (owner_id);

-- Tasks ---------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  department_id uuid,
  agent_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  notes text not null default '' check (char_length(notes) <= 5000),
  stage text not null default 'backlog' check (stage in ('backlog', 'todo', 'in_progress', 'review', 'done')),
  position double precision not null default 0,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (department_id, owner_id) references public.departments(id, owner_id) on delete set null (department_id),
  foreign key (agent_id, owner_id) references public.agents(id, owner_id) on delete set null (agent_id)
);
create index tasks_department_idx on public.tasks (department_id);
create index tasks_agent_idx on public.tasks (agent_id);
create index tasks_owner_idx on public.tasks (owner_id);

-- Runs ----------------------------------------------------------------
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id uuid not null,
  external_id text not null default gen_random_uuid()::text check (char_length(external_id) <= 200),
  status text not null check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  summary text check (char_length(summary) <= 2000),
  output jsonb,
  error text check (char_length(error) <= 5000),
  created_at timestamptz not null default now(),
  unique (agent_id, external_id),
  foreign key (agent_id, owner_id) references public.agents(id, owner_id) on delete cascade
);
create index runs_owner_started_idx on public.runs (owner_id, started_at desc);

-- Row level security: every row belongs to its owner ------------------
do $$
declare t text;
begin
  foreach t in array array['departments', 'agents', 'process_steps', 'tasks', 'runs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s_select_own" on public.%I for select to authenticated using ((select auth.uid()) = owner_id)', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert to authenticated with check ((select auth.uid()) = owner_id)', t, t);
    execute format('create policy "%s_update_own" on public.%I for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete to authenticated using ((select auth.uid()) = owner_id)', t, t);
  end loop;
end $$;

-- Live updates in the app ---------------------------------------------
alter publication supabase_realtime add table public.departments, public.agents, public.process_steps, public.tasks, public.runs;

-- Webhook ingestion ---------------------------------------------------
-- Called by /api/hooks/[agentId] with the agent's secret token. Only a
-- sha256 of the token is stored; a wrong token never touches any data.
create or replace function public.ingest_run(p_agent_id uuid, p_token text, p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agent public.agents%rowtype;
  v_status text;
  v_ext text := left(coalesce(nullif(p_event ->> 'run_id', ''), gen_random_uuid()::text), 200);
  v_ts timestamptz := coalesce((p_event ->> 'timestamp')::timestamptz, now());
  v_run public.runs%rowtype;
begin
  if p_token is null or char_length(p_token) < 20 then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  select * into v_agent from public.agents where id = p_agent_id;
  if not found
     or v_agent.webhook_token_hash is null
     or v_agent.webhook_token_hash <> extensions.digest(p_token, 'sha256') then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  v_status := case p_event ->> 'event'
    when 'started' then 'running'
    when 'succeeded' then 'succeeded'
    when 'failed' then 'failed'
  end;
  if v_status is null then
    raise exception 'invalid event' using errcode = '22023';
  end if;

  insert into public.runs as r (owner_id, agent_id, external_id, status, started_at, finished_at, duration_ms, summary, output, error)
  values (
    v_agent.owner_id, v_agent.id, v_ext, v_status, v_ts,
    case when v_status <> 'running' then v_ts end,
    case when v_status <> 'running' then 0 end,
    left(p_event ->> 'summary', 2000), p_event -> 'output', left(p_event ->> 'error', 5000)
  )
  on conflict (agent_id, external_id) do update set
    status = excluded.status,
    finished_at = case when excluded.status <> 'running' then excluded.finished_at else r.finished_at end,
    duration_ms = case when excluded.status <> 'running'
      then greatest(0, (extract(epoch from (excluded.finished_at - r.started_at)) * 1000)::integer)
      else r.duration_ms end,
    summary = coalesce(excluded.summary, r.summary),
    output = coalesce(excluded.output, r.output),
    error = coalesce(excluded.error, r.error)
  returning * into v_run;

  update public.agents
     set status = case v_status when 'running' then 'working' when 'failed' then 'blocked' else 'idle' end,
         last_run_at = v_ts
   where id = v_agent.id;

  return jsonb_build_object('run_id', v_run.external_id, 'status', v_run.status);
end;
$$;

revoke all on function public.ingest_run(uuid, text, jsonb) from public;
grant execute on function public.ingest_run(uuid, text, jsonb) to anon, authenticated;
