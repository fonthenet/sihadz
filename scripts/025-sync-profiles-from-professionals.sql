-- Sync profiles.full_name and user_type from professionals for existing professional accounts.
-- Fixes wrong name (e.g. email prefix "jijelbackup1") when profile was created by auth trigger
-- before we started syncing on signup.
-- user_type must be in (patient|doctor|pharmacy|laboratory|clinic|ambulance|admin|super_admin).
UPDATE profiles p
SET
  full_name = pro.business_name,
  user_type = CASE
    WHEN pro.type IN ('doctor', 'pharmacy', 'laboratory', 'clinic', 'ambulance') THEN pro.type
    ELSE 'doctor'
  END
FROM professionals pro
WHERE pro.auth_user_id = p.id;
