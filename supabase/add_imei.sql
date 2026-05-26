-- TrackIQ — add IMEI column to trucks so GPS tracker data maps to the right truck
-- Run in: https://supabase.com/dashboard/project/tnniuvvvumfpaadfloyu/sql

alter table trucks
  add column if not exists imei text unique;

-- After running this, set each truck's IMEI in the Supabase table editor
-- (or via: UPDATE trucks SET imei = '123456789012345' WHERE id = 'TRK-001')
