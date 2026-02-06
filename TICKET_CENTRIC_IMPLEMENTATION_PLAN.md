# Ticket-Centric Prescription Messaging Implementation Plan

## Executive Summary

**Problem**: Current system creates threads independently, allowing messages before prescriptions exist, causing delivery failures and workflow confusion.

**Solution**: Implement Ticket-Centric Architecture (per SOP Section 1.1) where `healthcare_tickets` is the central hub, and threads/messages are tied to tickets.

## Current System Issues

1. ❌ Threads created BEFORE prescriptions exist
2. ❌ Messages can be sent before pharmacy receives prescription
3. ❌ No guarantee of workflow order
4. ❌ RLS issues due to user ID mismatches
5. ❌ No proper audit trail
6. ❌ Loose coupling via `order_id` only

## Proposed Ticket-Centric Flow

### Workflow: Doctor → Pharmacy Prescription

```
STEP 1: Doctor Selects Pharmacy
  ↓
  Create healthcare_tickets record
  - ticket_type: 'prescription'
  - status: 'created'
  - primary_provider_id: doctor.id
  - secondary_provider_id: pharmacy.id
  - appointment_id: appointment.id
  - prescription_id: NULL (not created yet)
  ↓
STEP 2: System Auto-Creates Thread
  ↓
  Create chat_threads record
  - ticket_id: healthcare_tickets.id (PRIMARY LINK)
  - order_id: appointment_id (backward compat)
  - order_type: 'prescription'
  - Auto-add members from ticket parties
  ↓
STEP 3: Doctor Builds & Saves Prescription
  ↓
  Create prescriptions record
  - doctor_id, pharmacy_id, patient_id, medications, etc.
  ↓
  Update healthcare_tickets
  - prescription_id: prescription.id
  - status: 'sent'
  ↓
  Send notification to pharmacy
  ↓
STEP 4: Pharmacy Receives Ticket
  ↓
  Query healthcare_tickets WHERE secondary_provider_id = pharmacy.id
  - Status: 'sent' or 'received'
  - prescription_id is populated
  ↓
  Find thread via ticket_id
  - Load all messages
  - Display prescription details
  ↓
STEP 5: Pharmacy Updates Status
  ↓
  Update healthcare_tickets.status = 'received' → 'processing' → 'ready'
  - Timeline entries track all changes
  - Messages can reference status updates
```

## Database Schema Updates

### 1. Add `ticket_id` to `chat_threads`

```sql
-- Add ticket_id column (if not exists)
ALTER TABLE chat_threads 
ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES healthcare_tickets(id) ON DELETE CASCADE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_chat_threads_ticket_id ON chat_threads(ticket_id);

-- Keep order_id for backward compatibility, but ticket_id is PRIMARY
```

### 2. Migration: Link Existing Threads to Tickets

```sql
-- For existing prescription threads, create tickets and link them
-- This ensures backward compatibility
```

## Implementation Steps

### Phase 1: Update Thread Creation (Doctor Side)

**File**: `appointment-thread.tsx` → `findOrCreateThread()`

**Current Flow:**
```typescript
// Creates thread directly
const { data: newThread } = await supabase
  .from('chat_threads')
  .insert({ order_id: appointmentId, ... })
```

**New Flow:**
```typescript
// 1. Create or find ticket FIRST
const ticket = await createOrGetPrescriptionTicket({
  appointmentId,
  doctorId,
  pharmacyId: targetId,
  patientId: appointment.patient_id
})

// 2. Create thread linked to ticket
const { data: newThread } = await supabase
  .from('chat_threads')
  .insert({
    ticket_id: ticket.id,  // PRIMARY LINK
    order_id: appointmentId,  // backward compat
    order_type: 'prescription',
    ...
  })
```

### Phase 2: Update Prescription Saving

**File**: `prescription-builder.tsx` → `savePrescription()`

**Current Flow:**
```typescript
// Saves prescription, updates thread metadata
await supabase.from('prescriptions').insert({...})
await supabase.from('chat_threads').update({metadata: {prescription_id}})
```

**New Flow:**
```typescript
// 1. Save prescription
const { data: prescription } = await supabase.from('prescriptions').insert({...})

// 2. Update ticket with prescription_id
await supabase
  .from('healthcare_tickets')
  .update({ 
    prescription_id: prescription.id,
    status: 'sent'  // Prescription is now sent
  })
  .eq('id', ticketId)  // Use ticket_id from thread

// 3. Update thread metadata (optional, ticket is source of truth)
await supabase
  .from('chat_threads')
  .update({ metadata: { prescription_id: prescription.id } })
  .eq('ticket_id', ticketId)
```

### Phase 3: Update Pharmacy View

**File**: `pharmacy-prescriptions.tsx` → `loadPrescriptions()`

**Current Flow:**
```typescript
// Loads prescriptions directly
const res = await fetch('/api/prescriptions/pharmacy')
```

**New Flow:**
```typescript
// Option A: Load via tickets (RECOMMENDED)
const { data: tickets } = await supabase
  .from('healthcare_tickets')
  .select(`
    *,
    prescription:prescriptions(*),
    thread:chat_threads(id, title, updated_at)
  `)
  .eq('secondary_provider_id', pharmacyId)
  .eq('ticket_type', 'prescription')
  .order('created_at', { ascending: false })

// Option B: Keep current API but ensure tickets exist
// Load prescriptions, then find associated tickets/threads
```

### Phase 4: Update Thread Lookup

**File**: `pharmacy-prescriptions.tsx` → `loadThreadAndMessages()`

**Current Flow:**
```typescript
// Finds thread by order_id + pharmacy_id
const { data: thread } = await supabase
  .from('chat_threads')
  .eq('order_id', appointmentId)
  .eq('metadata->>target_id', pharmacyId)
```

**New Flow:**
```typescript
// Option A: Find via ticket (RECOMMENDED)
// 1. Find ticket for this prescription
const { data: ticket } = await supabase
  .from('healthcare_tickets')
  .select('id')
  .eq('prescription_id', prescriptionId)
  .eq('secondary_provider_id', pharmacyId)
  .single()

// 2. Find thread via ticket_id
const { data: thread } = await supabase
  .from('chat_threads')
  .select('*')
  .eq('ticket_id', ticket.id)
  .single()

// Option B: Fallback to order_id (backward compat)
if (!thread) {
  // Use current method as fallback
}
```

## Benefits

1. ✅ **Guaranteed Workflow**: Prescription must exist before messages
2. ✅ **Single Source of Truth**: Ticket is central hub
3. ✅ **Full Audit Trail**: Ticket timeline tracks everything
4. ✅ **Better Tracking**: Query tickets by status, type, parties
5. ✅ **SOP Compliant**: Aligns with ticket-centric architecture
6. ✅ **Scalable**: Easy to add lab requests, referrals, etc.
7. ✅ **RLS Friendly**: Ticket parties define who can access

## Migration Strategy

1. **Add `ticket_id` column** to `chat_threads` (non-breaking)
2. **Create tickets** for existing prescriptions
3. **Link threads** to tickets
4. **Update code** to use `ticket_id` as primary lookup
5. **Keep `order_id`** for backward compatibility
6. **Gradual rollout**: New prescriptions use tickets, old ones still work

## Alternative: Use `ticket_messages` Table

The SOP also defines `ticket_messages` table. We could:

**Option A**: Use `ticket_messages` for prescription communication
- Pros: Cleaner separation, ticket-native
- Cons: Need to rebuild UI, lose rich messaging features

**Option B**: Use `chat_threads` linked via `ticket_id` (RECOMMENDED)
- Pros: Keep existing UI, add ticket tracking
- Cons: Two message systems (but they serve different purposes per SOP)

**Recommendation**: Option B - Link `chat_threads` to tickets. This gives us ticket tracking while keeping the rich messaging UI.

## Next Steps

1. ✅ Review and approve architecture
2. Add `ticket_id` column to `chat_threads`
3. Create helper function: `createOrGetPrescriptionTicket()`
4. Update thread creation to use tickets
5. Update prescription saving to update tickets
6. Update pharmacy view to load via tickets
7. Test end-to-end workflow
8. Migrate existing data
