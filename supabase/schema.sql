-- CaseLens AI schema for Supabase Postgres.
-- Paste into Supabase Dashboard > SQL Editor > New query and run once.
create extension if not exists pgcrypto;

create sequence if not exists public.case_reference_seq start 1001;

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  reference text not null unique default ('CL-' || nextval('public.case_reference_seq')),
  title text not null check (char_length(title) between 2 and 180),
  case_type text not null default 'General',
  status text not null default 'Open' check (status in ('Open','Active','In review','Closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  filename text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes integer not null default 0 check (size_bytes >= 0),
  status text not null default 'Processed',
  status_note text not null default '',
  page_count integer,
  analysis_status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (case_id, filename, size_bytes)
);
create index if not exists documents_case_idx on public.documents(case_id, created_at desc);

create table if not exists public.passages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  page integer,
  position integer not null default 0,
  content text not null check (char_length(content) <= 12000)
);
create index if not exists passages_case_idx on public.passages(case_id);
create index if not exists passages_document_idx on public.passages(document_id, position);

create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  kind text not null check (kind in ('conflict','missing')),
  key text not null,
  title text not null,
  description text not null,
  severity text not null default 'Medium',
  status text not null default 'Pending',
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(case_id, key)
);
create index if not exists findings_case_idx on public.findings(case_id, kind, status);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  finding_id uuid not null references public.findings(id) on delete cascade,
  decision text not null check (decision in ('APPROVED','REJECTED','NEEDS_REVIEW')),
  reviewer_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  reviewer_name text not null default '',
  notes text not null default '',
  request_id uuid unique,
  created_at timestamptz not null default now()
);
create index if not exists reviews_case_idx on public.reviews(case_id, created_at desc);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_time_idx on public.ai_usage(user_id, created_at desc);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  action text not null,
  subject text not null default '',
  actor_id uuid references auth.users(id) on delete set null default auth.uid(),
  actor text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists audit_case_idx on public.audit_log(case_id, created_at desc);

-- Enable row-level security on all case data. Clients and APIs use the signed-in
-- user's publishable key; no service-role key is needed or exposed.
alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.passages enable row level security;
alter table public.findings enable row level security;
alter table public.reviews enable row level security;
alter table public.audit_log enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists "case owner access" on public.cases;
create policy "case owner access" on public.cases for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "document owner access" on public.documents;
create policy "document owner access" on public.documents for all to authenticated
  using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = (select auth.uid())));

drop policy if exists "passage owner access" on public.passages;
create policy "passage owner access" on public.passages for all to authenticated
  using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = (select auth.uid())));

drop policy if exists "finding owner access" on public.findings;
create policy "finding owner access" on public.findings for all to authenticated
  using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = (select auth.uid())));

drop policy if exists "review owner access" on public.reviews;
create policy "review owner access" on public.reviews for all to authenticated
  using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = (select auth.uid())))
  with check ((select auth.uid()) = reviewer_id and exists (select 1 from public.cases c where c.id = case_id and c.owner_id = (select auth.uid())));

drop policy if exists "audit owner access" on public.audit_log;
create policy "audit owner access" on public.audit_log for all to authenticated
  using (case_id is not null and exists (select 1 from public.cases c where c.id = case_id and c.owner_id = (select auth.uid())))
  with check ((select auth.uid()) = actor_id and (case_id is null or exists (select 1 from public.cases c where c.id = case_id and c.owner_id = (select auth.uid()))));

drop policy if exists "AI usage owner access" on public.ai_usage;
create policy "AI usage owner access" on public.ai_usage for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.cases, public.documents, public.passages,
  public.findings, public.reviews, public.audit_log, public.ai_usage to authenticated;
grant usage, select on sequence public.case_reference_seq to authenticated;
