-- TrackIQ — Vehicle Registrations table
-- Run in: https://supabase.com/dashboard/project/tnniuvvvumfpaadfloyu/sql

create table if not exists vehicle_registrations (
  id               bigserial     primary key,
  make             text          not null,
  model            text          not null,
  year             integer       not null,
  vin              text          not null unique,
  license_plate    text          not null,
  fuel_type        text          not null check (fuel_type in ('petrol','diesel','electric','hybrid','lpg','cng')),
  location_address text          not null,
  location_lat     text          not null default '',
  location_lng     text          not null default '',
  owner_name       text          not null,
  owner_email      text          not null,
  owner_phone      text          not null,
  status           text          not null default 'pending',
  created_at       timestamptz   not null default now()
);

alter table vehicle_registrations disable row level security;
