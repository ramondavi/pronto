-- Fundação do banco, equivalente aos modelos em src/db/schema.ts.

create type public.user_role as enum ('student', 'cataloger', 'administrator');
create type public.account_status as enum ('active', 'blocked', 'inactive');
create type public.academic_level as enum ('undergraduate', 'specialization', 'master', 'doctorate');
create type public.work_type as enum ('undergraduate_thesis', 'specialization_thesis', 'dissertation', 'thesis');
create type public.announcement_type as enum ('normal', 'recess', 'strike', 'other');

create table public.profiles (
  id uuid primary key,
  full_name text not null,
  email text not null unique,
  role public.user_role not null default 'student',
  status public.account_status not null default 'active',
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  cpf text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  professional_name text not null,
  crb text not null,
  available_for_assignment boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_programs (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, short_name text not null,
  level public.academic_level not null, work_type public.work_type not null, active boolean not null default true,
  service_level_business_days integer not null default 3, repository_deposit_enabled boolean not null default true,
  coordination_magic_link_enabled boolean not null default false, coordination_issue_emails_enabled boolean not null default false,
  repository_collection_label text, repository_document_type_label text, repository_academic_degree_label text,
  repository_institution_label text not null default 'Universidade Federal da Bahia',
  repository_institution_acronym text not null default 'UFBA', repository_unit_label text not null default 'Faculdade de Arquitetura',
  repository_program_label text, repository_country_label text not null default 'Brasil',
  repository_default_language_label text not null default 'Português', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.coordination_contacts (
  id uuid primary key default gen_random_uuid(), academic_program_id uuid not null references public.academic_programs(id) on delete cascade,
  name text not null, email text not null, active boolean not null default true, receives_opening_emails boolean not null default true,
  receives_issue_emails boolean not null default false, receives_completion_emails boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.library_announcements (
  id uuid primary key default gen_random_uuid(), type public.announcement_type not null default 'normal', title text not null,
  message text not null, starts_at timestamptz not null, ends_at timestamptz, active boolean not null default true,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.sla_settings (
  id uuid primary key default gen_random_uuid(), academic_program_id uuid references public.academic_programs(id) on delete cascade,
  business_days integer not null default 3, active boolean not null default true, effective_from timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id), action text not null,
  entity_type text not null, entity_id text, metadata jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now()
);
