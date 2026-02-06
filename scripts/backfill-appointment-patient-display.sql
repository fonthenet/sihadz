-- Backfill guest_name, guest_phone, guest_email on appointments from profiles
-- so doctors see patient display data even when RLS blocks profile read.
-- Run once in Supabase SQL Editor.

UPDATE appointments a
SET
  guest_name = COALESCE(a.guest_name, p.full_name),
  guest_phone = COALESCE(a.guest_phone, p.phone),
  guest_email = COALESCE(a.guest_email, p.email)
FROM profiles p
WHERE a.patient_id = p.id
  AND (a.guest_name IS NULL AND a.patient_id IS NOT NULL);
