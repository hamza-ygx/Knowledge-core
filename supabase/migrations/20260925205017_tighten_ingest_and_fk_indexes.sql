revoke execute on function public.ingest_run(uuid, text, jsonb) from authenticated;

drop index if exists public.agents_department_idx;
drop index if exists public.agents_reports_to_idx;
drop index if exists public.agents_owner_idx;
drop index if exists public.process_steps_agent_idx;
drop index if exists public.process_steps_owner_idx;
drop index if exists public.tasks_department_idx;
drop index if exists public.tasks_agent_idx;
drop index if exists public.tasks_owner_idx;

create index departments_owner_idx on public.departments (owner_id);
create index agents_department_owner_idx on public.agents (department_id, owner_id);
create index agents_reports_to_owner_idx on public.agents (reports_to, owner_id);
create index process_steps_agent_owner_idx on public.process_steps (agent_id, owner_id);
create index runs_agent_owner_idx on public.runs (agent_id, owner_id);
create index tasks_agent_owner_idx on public.tasks (agent_id, owner_id);
create index tasks_department_owner_idx on public.tasks (department_id, owner_id);
