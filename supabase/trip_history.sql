-- TrackIQ — Trip history tables
-- Run in: https://supabase.com/dashboard/project/tnniuvvvumfpaadfloyu/sql

create table if not exists truck_positions (
  id          bigserial     primary key,
  truck_id    text          not null references trucks(id) on delete cascade,
  lat         numeric(10,6) not null,
  lng         numeric(10,6) not null,
  speed       numeric(5,1)  not null default 0,
  fuel        numeric(5,1)  not null default 0,
  recorded_at timestamptz   not null default now()
);

create index if not exists idx_positions_truck_time
  on truck_positions(truck_id, recorded_at desc);

create table if not exists trips (
  id           bigserial     primary key,
  truck_id     text          not null references trucks(id) on delete cascade,
  started_at   timestamptz   not null default now(),
  ended_at     timestamptz,
  start_lat    numeric(10,6) not null,
  start_lng    numeric(10,6) not null,
  end_lat      numeric(10,6),
  end_lng      numeric(10,6),
  distance_km  numeric(8,2)  not null default 0,
  fuel_start   numeric(5,1)  not null,
  fuel_end     numeric(5,1),
  status       text          not null default 'active'
               check (status in ('active','completed'))
);

create index if not exists idx_trips_truck
  on trips(truck_id, started_at desc);

alter table truck_positions disable row level security;
alter table trips           disable row level security;
