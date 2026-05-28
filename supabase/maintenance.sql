-- Run this in the Supabase SQL editor

create table if not exists maintenance_records (
  id            uuid primary key default gen_random_uuid(),
  truck_id      text        not null,
  service_type  text        not null,
  performed_at  date        not null,
  next_due_at   date,
  odometer_km   integer,
  cost_ngn      numeric(12, 2),
  technician    text,
  notes         text,
  created_at    timestamptz default now()
);

create index if not exists idx_maintenance_truck_id on maintenance_records(truck_id);
create index if not exists idx_maintenance_performed_at on maintenance_records(performed_at desc);

-- Seed sample records
insert into maintenance_records (truck_id, service_type, performed_at, next_due_at, odometer_km, cost_ngn, technician, notes) values
  ('TRK-001', 'oil_change',   '2025-03-12', '2025-09-12', 140000, 35000,  'Emeka Auto Garage', 'Full synthetic 15W-40 oil'),
  ('TRK-001', 'tire',         '2025-01-08', '2026-01-08', 138500, 120000, 'Emeka Auto Garage', '4 tyres replaced - Bridgestone'),
  ('TRK-001', 'brakes',       '2024-09-21', '2025-03-21', 135000, 48000,  'Emeka Auto Garage', 'Front brake pads replaced'),
  ('TRK-002', 'full_service', '2025-04-01', '2025-10-01', 97000,  95000,  'Lagos Motors Ltd',  '6-month full service'),
  ('TRK-002', 'oil_change',   '2024-10-15', '2025-04-15', 93000,  35000,  'Lagos Motors Ltd',  NULL),
  ('TRK-003', 'oil_change',   '2025-02-20', '2025-08-20', 188000, 35000,  'Kano Diesel Works', 'Oil and air filter changed'),
  ('TRK-003', 'cooling',      '2025-02-20', '2026-02-20', 188000, 28000,  'Kano Diesel Works', 'Coolant flush and radiator check'),
  ('TRK-004', 'full_service', '2024-11-05', '2025-05-05', 211000, 95000,  'Benin Mechanics',   'Full service done before long haul'),
  ('TRK-004', 'brakes',       '2024-08-14', '2025-02-14', 208000, 52000,  'Benin Mechanics',   'Rear drums replaced'),
  ('TRK-005', 'oil_change',   '2025-05-01', '2025-11-01', 76200,  35000,  'Apapa Workshop',    NULL),
  ('TRK-006', 'oil_change',   '2025-05-10', '2025-11-10', 54300,  35000,  'Apapa Workshop',    'First service since purchase');
