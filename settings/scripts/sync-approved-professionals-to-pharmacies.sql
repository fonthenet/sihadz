-- Create pharmacies from approved professionals with type 'pharmacy'
INSERT INTO pharmacies (
  id,
  user_id,
  name,
  name_ar,
  email,
  phone,
  address,
  address_ar,
  city,
  wilaya_code,
  license_number,
  is_active,
  is_verified,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  auth_user_id,
  business_name,
  business_name,
  email,
  phone,
  address_line1,
  address_line1,
  '',
  wilaya,
  license_number,
  false,
  false,
  created_at,
  updated_at
FROM professionals
WHERE type = 'pharmacy' AND status = 'approved'
AND email NOT IN (SELECT email FROM pharmacies)
ON CONFLICT DO NOTHING;

COMMIT;
