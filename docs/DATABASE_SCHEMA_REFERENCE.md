# Database Schema Reference

> **CRITICAL**: Always verify columns exist before using them in queries.
> This file is a reference - the actual database is the source of truth.
> Run `SELECT column_name FROM information_schema.columns WHERE table_name = 'TABLE_NAME';` to verify.

## Key Tables

### appointments
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| patient_id | uuid | NO |
| doctor_id | uuid | YES |
| appointment_date | date | NO |
| appointment_time | time | NO |
| visit_type | text | NO |
| status | text | NO |
| symptoms | text | YES |
| notes | text | YES |
| consultation_fee | integer | YES |
| payment_status | text | YES |
| payment_method | text | YES |
| created_at | timestamp | YES |
| updated_at | timestamp | YES |
| is_guest_booking | boolean | YES |
| guest_email | text | YES |
| guest_phone | text | YES |
| guest_name | text | YES |
| guest_token | uuid | YES |
| doctor_display_name | text | YES |
| doctor_specialty | text | YES |
| doctor_note_for_patient | text | YES |

**NOTE**: `professional_id` does NOT exist in this table. Use `doctor_id`.

---

### prescriptions
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| appointment_id | uuid | YES |
| doctor_id | uuid | NO |
| patient_id | uuid | NO |
| pharmacy_id | uuid | YES |
| medications | jsonb | NO |
| diagnosis | text | YES |
| diagnosis_ar | text | YES |
| notes | text | YES |
| status | text | YES |
| is_chifa_eligible | boolean | YES |
| qr_code | text | YES |
| valid_until | date | YES |
| created_at | timestamp | YES |
| updated_at | timestamp | YES |
| payment_status | text | YES |
| payment_method | text | YES |
| payment_id | uuid | YES |
| sent_to_pharmacy_at | timestamp | YES |
| sent_by_user_id | uuid | YES |
| fulfilled_at | timestamp | YES |
| collected_at | timestamp | YES |
| **total_amount** | numeric | YES |
| received_at | timestamp | YES |
| ready_at | timestamp | YES |
| picked_up_at | timestamp | YES |
| delivered_at | timestamp | YES |
| pharmacy_fulfillment | jsonb | YES |

**NOTE**: Use `total_amount`, NOT `total_price`. Column `estimated_ready_at` does NOT exist.

---

### professionals
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| auth_user_id | uuid | YES |
| email | text | NO |
| type | enum | NO |
| business_name | text | NO |
| license_number | text | NO |
| phone | text | NO |
| wilaya | text | NO |
| commune | text | YES |
| status | enum | YES |
| is_verified | boolean | YES |
| is_active | boolean | YES |
| rating | numeric | YES |
| specialty | text | YES |
| consultation_fee | integer | YES |
| working_hours | jsonb | YES |
| created_at | timestamp | YES |

---

### lab_test_requests
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| request_number | varchar | YES |
| patient_id | uuid | YES |
| doctor_id | uuid | YES |
| laboratory_id | uuid | YES |
| appointment_id | uuid | YES |
| status | varchar | YES |
| priority | varchar | YES |
| clinical_notes | text | YES |
| diagnosis | text | YES |
| created_at | timestamp | YES |
| total_amount | numeric | YES |
| result_pdf_url | text | YES |
| result_notes | text | YES |

---

### profiles
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| email | text | YES |
| full_name | text | YES |
| phone | text | YES |
| user_type | text | NO |
| wilaya_code | text | YES |
| date_of_birth | date | YES |
| gender | text | YES |
| chifa_number | text | YES |
| created_at | timestamp | YES |

---

## Common Mistakes to Avoid

1. **`professional_id` vs `doctor_id`**: Appointments use `doctor_id`, not `professional_id`
2. **`total_price` vs `total_amount`**: Prescriptions use `total_amount`
3. **`estimated_ready_at`**: Does NOT exist in prescriptions table
4. **Missing columns**: Always verify before using in `.select()`

## How to Verify Schema

```sql
-- Check all columns in a table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'TABLE_NAME'
ORDER BY ordinal_position;

-- Check if a specific column exists
SELECT COUNT(*) > 0 as exists 
FROM information_schema.columns 
WHERE table_name = 'prescriptions' AND column_name = 'total_price';
```

## Last Updated
2026-01-30 - Generated from production database
