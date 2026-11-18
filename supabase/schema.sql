-- SoloWorks: quote requests from the website.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  status            text not null default 'new'
                    check (status in ('new', 'scoping', 'quoted', 'active', 'qc', 'delivered', 'closed')),

  -- from the inquiry form
  contact_name      text not null,
  company_name      text,
  email             text not null,
  phone             text,
  service           text not null,
  timeline          text,
  contact_language  text,
  details           text not null,
  consent           boolean not null default false,

  -- filled in by the team
  notes             text,
  meta              jsonb not null default '{}'::jsonb
);

-- If you created this table from an earlier version, add the new columns:
alter table public.projects add column if not exists phone text;
alter table public.projects add column if not exists consent boolean not null default false;
-- Company is optional since the short form (Nov 2026):
alter table public.projects alter column company_name drop not null;

create index if not exists projects_created_at_idx on public.projects (created_at desc);
create index if not exists projects_status_idx on public.projects (status);

-- Row Level Security on, with no public policies: only the server (service-role key) can read or write.
alter table public.projects enable row level security;
