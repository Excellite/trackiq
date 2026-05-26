-- TrackIQ — run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/tnniuvvvumfpaadfloyu/sql)

create table if not exists trucks (
  id           text primary key,
  name         text          not null,
  driver       text          not null,
  plate        text          not null,
  model        text          not null default '',
  year         integer       not null,
  status       text          not null check (status in ('moving','idle','alert','offline')),
  fuel         numeric(5,1)  not null check (fuel  >= 0 and fuel  <= 100),
  speed        numeric(5,1)  not null check (speed >= 0),
  odometer     numeric       not null check (odometer >= 0),
  lat          numeric       not null,
  lng          numeric       not null,
  route        text          not null default '',
  "lastService" date         not null,
  "nextService" date         not null,
  created_at   timestamptz   not null default now()
);

-- Disable RLS for the demo — enable + add policies before going to production
alter table trucks disable row level security;

-- Seed data (idempotent)
insert into trucks (id, name, driver, plate, model, year, status, fuel, speed, odometer, lat, lng, route, "lastService", "nextService")
values
  ('TRK-001','Lagos Hauler 1',  'Adeyemi Tunde',    'LND-874-KJA','MAN TGS 26.440',  2019,'moving', 78, 64,142300,6.465,3.406,'Apapa → Sagamu',    '2025-03-12','2025-09-12'),
  ('TRK-002','Abuja Runner',    'Chukwuemeka Eze',  'LND-211-ABJ','Sinotruk HOWO',    2021,'moving', 45, 82, 98450,6.601,3.351,'Ojota → Ibadan',    '2025-04-01','2025-10-01'),
  ('TRK-003','North Express',   'Kabiru Bello',     'LND-519-ENU','DAF XF 480',       2020,'moving', 62, 95,231100,7.380,3.900,'Tin Can → Kano',    '2025-02-20','2025-08-20'),
  ('TRK-004','Benin Cargo',     'Tope Adeyemi',     'LND-302-KJA','Volvo FH16',       2018,'alert',  12,  0,305800,6.340,5.630,'Mushin → Benin City','2024-11-05','2025-05-05'),
  ('TRK-005','Lagos Local',     'Seun Olatunji',    'LND-109-EKO','Iveco Stralis',    2022,'idle',   91,  0, 41200,6.452,3.396,'Warehouse — Idle',  '2025-05-01','2025-11-01'),
  ('TRK-006','Port Runner',     'Emeka Nwosu',      'LND-633-APT','Mercedes Actros',  2023,'moving', 55, 57, 22900,6.430,3.510,'Apapa Port → Ikeja','2025-05-10','2025-11-10')
on conflict (id) do nothing;
