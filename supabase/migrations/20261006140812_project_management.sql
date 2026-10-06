-- Supabase Auth owns passwords, email uniqueness, and sessions.
create table public.projects (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 120),
 description text not null default '' check(length(description)<=4000),
 status text not null default 'Not Started' check(status in ('Not Started','In Progress','Completed')),
 start_date date not null, end_date date not null check(end_date>=start_date),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 120),
 description text not null default '' check(length(description)<=4000),
 status text not null default 'Pending' check(status in ('Pending','In Progress','Completed')),
 priority text not null default 'Medium' check(priority in ('Low','Medium','High')),
 due_date date not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index projects_owner_status_idx on public.projects(owner_id,status);
create index tasks_project_status_priority_idx on public.tasks(project_id,status,priority);
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
create policy projects_select on public.projects for select to authenticated using(owner_id=(select auth.uid()));
create policy projects_insert on public.projects for insert to authenticated with check(owner_id=(select auth.uid()));
create policy projects_update on public.projects for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy projects_delete on public.projects for delete to authenticated using(owner_id=(select auth.uid()));
create policy tasks_select on public.tasks for select to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy tasks_insert on public.tasks for insert to authenticated with check(exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy tasks_update on public.tasks for update to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid()))) with check(exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy tasks_delete on public.tasks for delete to authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
revoke all on public.projects, public.tasks from anon, authenticated;
grant select,delete on public.projects,public.tasks to authenticated;
grant insert(owner_id,name,description,status,start_date,end_date),update(name,description,status,start_date,end_date) on public.projects to authenticated;
grant insert(project_id,name,description,status,priority,due_date),update(name,description,status,priority,due_date) on public.tasks to authenticated;
create function public.touch_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$begin new.updated_at=now(); return new; end;$$;
revoke all on function public.touch_updated_at() from public,anon,authenticated;
create trigger projects_updated before update on public.projects for each row execute function public.touch_updated_at();
create trigger tasks_updated before update on public.tasks for each row execute function public.touch_updated_at();
create function public.dashboard_stats() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'totalProjects',(select count(*) from public.projects),
 'totalTasks',(select count(*) from public.tasks),
 'completedTasks',(select count(*) from public.tasks where status='Completed'),
 'pendingTasks',(select count(*) from public.tasks where status='Pending'),
 'projectsInProgress',(select count(*) from public.projects where status='In Progress'));
$$;
revoke all on function public.dashboard_stats() from public,anon;
grant execute on function public.dashboard_stats() to authenticated;
