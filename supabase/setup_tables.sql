-- TrackIQ — run this in the Supabase SQL Editor
-- https://supabase.com/dashboard/project/tnniuvvvumfpaadfloyu/sql

create table if not exists vehicles (
  id            text primary key,
  name          text          not null,
  plate         text          not null,
  model         text          not null default '',
  year          text          not null default '',
  route         text          not null default '',
  fuel_capacity integer       not null default 400,
  status        text          not null default 'idle'
                              check (status in ('moving','idle','alert','offline')),
  created_at    timestamptz   not null default now()
);

create table if not exists drivers (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null,
  phone             text        not null,
  license_no        text        not null default '',
  assigned_truck_id text        not null references vehicles(id) on delete cascade,
  created_at        timestamptz not null default now()
);

alter table vehicles disable row level security;
alter table drivers  disable row level security;
