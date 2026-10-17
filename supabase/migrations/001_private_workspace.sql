-- Apply in a new Supabase project. Browser uses anon/publishable key + user JWT.
-- Never put service_role in VITE_ variables.
create extension if not exists pgcrypto;

create table if not exists public.user_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null,
 updated_at timestamptz not null default now(),
 constraint workspace_version check (payload->>'version' = '1'),
 constraint workspace_size check (octet_length(payload::text) <= 1048576),
 constraint workspace_shape check (
   jsonb_typeof(payload->'profile')='object' and
   jsonb_typeof(payload->'subjects')='array' and
   jsonb_typeof(payload->'sessions')='array' and
   jsonb_typeof(payload->'usage')='array' and
   jsonb_typeof(payload->'preferences')='object' and
   payload ?& array['version','revision','profile','subjects','sessions','active','tasks','blocks','usage','missions','routines','events','groups','preferences']
 )
);
alter table public.user_workspaces enable row level security;
drop policy if exists workspace_self on public.user_workspaces;
create policy workspace_self on public.user_workspaces for all to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
revoke all on public.user_workspaces from anon;
grant select,insert,update,delete on public.user_workspaces to authenticated;

-- Normalized schema for subsequent multi-device API work. The current web
-- snapshot adapter does not write these tables. Private-only until group RPCs
-- and multi-account permission tests are implemented.
create table if not exists public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check(length(nickname) between 1 and 16),
 timezone text not null default 'Asia/Seoul',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.subjects (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 20),color text not null check(color ~ '^#[0-9A-Fa-f]{6}$'),
 archived_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,user_id)
);
create table if not exists public.study_sessions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 subject_id uuid not null,started_at timestamptz not null,ended_at timestamptz not null,
 duration_sec integer not null check(duration_sec>=0),mode text not null check(mode in ('stopwatch','pomodoro')),
 kind text not null default 'study' check(kind in ('study','rest')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,user_id),
 foreign key(subject_id,user_id) references public.subjects(id,user_id),
 check(ended_at>=started_at and duration_sec<=extract(epoch from ended_at-started_at)+1)
);
create table if not exists public.session_segments (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null,started_at timestamptz not null,ended_at timestamptz not null,
 kind text not null check(kind in ('study','pause','rest')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(session_id,user_id) references public.study_sessions(id,user_id) on delete cascade,check(ended_at>=started_at)
);
create table if not exists public.planner_blocks (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 subject_id uuid not null,title text not null check(length(title) between 1 and 80),start_at timestamptz not null,end_at timestamptz not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(subject_id,user_id) references public.subjects(id,user_id),
 check(end_at>start_at and end_at<=start_at+interval '24 hours'),
 check(mod(extract(epoch from end_at-start_at)::numeric,600)=0)
);
create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 subject_id uuid not null,title text not null check(length(title) between 1 and 80),due_at date not null,
 completed_at timestamptz,priority text not null default '보통' check(priority in ('높음','보통','낮음')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(subject_id,user_id) references public.subjects(id,user_id)
);
create table if not exists public.events (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,event_date date not null,kind text not null default 'exam',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.usage_entries (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 occurred_at timestamptz not null,duration_sec integer not null check(duration_sec between 60 and 43200),
 activity_name text not null check(length(activity_name) between 1 and 30),reason text,
 source text not null check(source in ('manual','android','demo')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.daily_routines (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,sleep_goal_met boolean,rest_count integer check(rest_count>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,day)
);
create table if not exists public.missions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,reason text not null,status text not null check(status in ('suggested','accepted','done','dismissed')),
 completed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.wellbeing_reports (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 range_start date not null,range_end date not null,metrics_json jsonb not null,score integer check(score between 0 and 100),
 algorithm_version text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(range_end>=range_start)
);
create table if not exists public.privacy_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 usage_collection_opt_in boolean not null default false,group_visibility boolean not null default false,analytics_opt_in boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.audit_events (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 event_type text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

do $$ declare t text; begin
 foreach t in array array['profiles','subjects','study_sessions','session_segments','planner_blocks','tasks','events','usage_entries','daily_routines','missions','wellbeing_reports','privacy_preferences','audit_events'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('drop policy if exists self_only on public.%I',t);
   execute format('create policy self_only on public.%I for all to authenticated using (user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t);
   execute format('create index if not exists %I on public.%I(user_id)',t||'_owner_idx',t);
   execute format('revoke all on public.%I from anon',t);
 end loop;
end $$;

-- No group API is exposed yet. RLS enabled with no browser policies: deny all.
create table if not exists public.study_groups (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null,join_code_hash text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.group_members (
 group_id uuid not null references public.study_groups(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','member')),share_study_status boolean not null default false,
 join_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(group_id,user_id)
);
create table if not exists public.group_goals (
 id uuid primary key default gen_random_uuid(),group_id uuid not null references public.study_groups(id) on delete cascade,
 title text not null,start_at date not null,end_at date not null,target_minutes integer not null check(target_minutes>0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(end_at>=start_at)
);
create table if not exists public.group_challenges (
 id uuid primary key default gen_random_uuid(),group_id uuid not null references public.study_groups(id) on delete cascade,
 title text not null,start_at date not null,end_at date not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(end_at>=start_at)
);
alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_goals enable row level security;
alter table public.group_challenges enable row level security;
revoke all on public.study_groups,public.group_members,public.group_goals,public.group_challenges from anon,authenticated;
