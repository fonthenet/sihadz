# Unified Provider Architecture

## Overview

This document describes the unified provider architecture for the Multi-Service Health Platform. The system uses a **single source of truth** approach where all healthcare providers (doctors, pharmacies, clinics, laboratories, ambulances) are stored in the `professionals` table.

## Architecture Principles

### Single Source of Truth
- **All provider data lives in `professionals` table**
- Legacy tables (`doctors`, `pharmacies`, `clinics`, `laboratories`) are deprecated
- All writes go to `professionals` table only
- All reads come from `professionals` table (or views that read from professionals)

### Industry Standard Pattern
This follows the **Single Table Inheritance** pattern with a type discriminator:
- One unified table (`professionals`) with a `type` column
- Type values: `'doctor'`, `'pharmacy'`, `'clinic'`, `'laboratory'`, `'ambulance'`
- Type-specific fields stored in the same table (e.g., `specialty` for doctors, `test_types` for labs)

## Database Schema

### Core Table: `professionals`

```sql
CREATE TABLE professionals (
  id UUID PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id),
  type TEXT CHECK (type IN ('doctor', 'pharmacy', 'laboratory', 'clinic', 'ambulance')),
  business_name TEXT NOT NULL,
  -- Common fields
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  wilaya TEXT,
  commune TEXT,
  license_number TEXT,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  working_hours JSONB DEFAULT '{}',
  unavailable_dates JSONB DEFAULT '[]',
  -- Type-specific fields
  specialty TEXT,              -- doctors
  specialties TEXT[],          -- clinics
  test_types TEXT[],          -- laboratories
  consultation_fee INTEGER,   -- doctors
  e_visit_fee INTEGER,         -- doctors
  supports_e_visit BOOLEAN,   -- doctors
  supports_in_person BOOLEAN,  -- doctors
  supports_home_visit BOOLEAN, -- doctors
  has_delivery BOOLEAN,       -- pharmacies
  is_24h BOOLEAN,             -- pharmacies, clinics, labs
  -- ... other fields
);
```

### Foreign Keys

**All foreign keys reference `professionals.id`:**
- `appointments.doctor_id` → `professionals(id)`
- Any other tables referencing providers → `professionals(id)`

## Migration Strategy

### Step 1: Run Migration Script
Run `scripts/UNIFIED-PROVIDER-ARCHITECTURE.sql` to:
1. Add missing columns to `professionals` table
2. Migrate existing data from legacy tables to `professionals`
3. Fix foreign key constraints to point to `professionals.id`
4. Create read-only views for backward compatibility (optional)

### Step 2: Update Application Code
All code has been updated to:
- **Onboarding**: Only writes to `professionals` (no legacy table inserts)
- **Settings**: Updates `professionals` table only
- **Queries**: Read from `professionals` table only
- **Booking**: Uses `professionals.id` for `appointments.doctor_id`

### Step 3: Legacy Tables (Deprecated)
- Legacy tables (`doctors`, `pharmacies`, `clinics`, `laboratories`) are no longer written to
- Views exist for backward compatibility if needed: `doctors_view`, `pharmacies_view`, etc.
- Eventually, legacy tables can be dropped (after ensuring all data is migrated)

## Code Patterns

### Creating a Provider
```typescript
// ✅ CORRECT: Write to professionals only
const { error } = await supabase
  .from('professionals')
  .insert({
    auth_user_id: user.id,
    type: 'doctor',
    business_name: 'Dr. Smith Clinic',
    specialty: 'Cardiology',
    consultation_fee: 3000,
    is_active: true,
  })

// ❌ WRONG: Don't write to legacy tables
// await supabase.from('doctors').insert({ ... })
```

### Querying Providers
```typescript
// ✅ CORRECT: Query professionals table
const { data } = await supabase
  .from('professionals')
  .select('*')
  .eq('type', 'doctor')
  .eq('is_active', true)

// ❌ WRONG: Don't query legacy tables
// await supabase.from('doctors').select('*')
```

### Booking Appointments
```typescript
// ✅ CORRECT: Use professionals.id
const { error } = await supabase
  .from('appointments')
  .insert({
    patient_id: patientId,
    doctor_id: professional.id, // professionals.id
    appointment_date: date,
    appointment_time: time,
  })
```

## Benefits

1. **No Data Conflicts**: Single source eliminates sync issues
2. **Simplified Queries**: One table to query for all provider types
3. **Consistent Foreign Keys**: All references point to `professionals.id`
4. **Easier Maintenance**: One table to maintain instead of multiple
5. **Better Performance**: Fewer joins, simpler queries
6. **Type Safety**: Type discriminator ensures data integrity

## Backward Compatibility

### Views (Optional)
If legacy code still queries old tables, views can provide compatibility:
```sql
CREATE VIEW doctors_view AS
SELECT id, auth_user_id as user_id, business_name as clinic_name, ...
FROM professionals
WHERE type = 'doctor';
```

### Migration Helper Function
```sql
CREATE FUNCTION get_professional_for_booking(provider_id UUID)
RETURNS TABLE (...)
-- Resolves provider_id to professionals.id, handling legacy IDs if needed
```

## Checklist for New Features

When adding provider-related features:
- [ ] Use `professionals` table for all reads/writes
- [ ] Use `professionals.id` for foreign keys
- [ ] Filter by `type` column for provider-specific logic
- [ ] Never write to legacy tables (`doctors`, `pharmacies`, etc.)
- [ ] Test with multiple provider types

## Troubleshooting

### "Foreign key constraint violation"
- Ensure `appointments.doctor_id` references `professionals.id` (not legacy tables)
- Run `scripts/UNIFIED-PROVIDER-ARCHITECTURE.sql` to fix FK constraints

### "Provider not found for booking"
- Check that provider exists in `professionals` table with `is_active = true`
- Verify `type` matches expected provider type

### "Data not syncing"
- Legacy tables are deprecated - all writes should go to `professionals` only
- Check onboarding/settings code isn't writing to legacy tables

## Future Improvements

1. **Remove Legacy Tables**: After ensuring all data is migrated and no code references them
2. **Add Provider Type Enum**: Use PostgreSQL enum for `type` column
3. **Add Indexes**: Ensure proper indexes on `type`, `is_active`, `wilaya` for performance
4. **Add RLS Policies**: Row-level security policies for provider data access
