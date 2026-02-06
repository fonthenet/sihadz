# Prescription Messaging Architecture Proposal

## Current Problems Identified

1. **Threads created independently** - Threads exist without guaranteed prescription creation
2. **No proper workflow** - Messages can exist before pharmacy receives prescription
3. **Loose coupling** - `order_id` linking is fragile and can break
4. **No audit trail** - Hard to track prescription → message flow
5. **RLS issues** - User ID mismatches causing message delivery failures

## Root Cause Analysis

The current system uses `chat_threads` with `order_id` (appointment ID) but:
- Threads are created BEFORE prescriptions exist
- No guarantee pharmacy receives the prescription
- Messages can be sent before prescription is saved
- No single source of truth for the workflow

## Proposed Solution: Ticket-Centric Architecture

Based on the SOP Section 1.1: **"Ticket-Centric Architecture where every healthcare interaction is encapsulated within a single, trackable ticket"**

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HEALTHCARE TICKET                          │
│  (Single Source of Truth - Central Hub)                      │
│  - ticket_number: TKT-20260129-ABC12                         │
│  - ticket_type: 'prescription'                               │
│  - prescription_id: UUID                                      │
│  - appointment_id: UUID                                       │
│  - status: 'created' → 'sent' → 'received' → 'ready'         │
│  - All parties: patient, doctor, pharmacy                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ references
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    CHAT THREAD                                │
│  - ticket_id: UUID (PRIMARY LINK)                            │
│  - order_id: UUID (appointment_id - for backward compat)     │
│  - order_type: 'prescription'                                 │
│  - Created AUTOMATICALLY when ticket is created              │
│  - Members added AUTOMATICALLY from ticket parties           │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ contains
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    CHAT MESSAGES                             │
│  - thread_id: UUID                                            │
│  - sender_id: UUID (auth.uid())                              │
│  - All messages tied to thread → ticket → prescription       │
└─────────────────────────────────────────────────────────────┘
```

## Recommended Workflow

### Phase 1: Prescription Creation (Doctor)

1. **Doctor selects pharmacy** → Creates/updates `healthcare_tickets` record
   - `ticket_type: 'prescription'`
   - `status: 'created'`
   - `primary_provider_id: doctor.id`
   - `secondary_provider_id: pharmacy.id`
   - `appointment_id: appointment.id`

2. **System automatically creates thread** linked to ticket
   - `chat_threads.ticket_id = healthcare_tickets.id` (PRIMARY)
   - `chat_threads.order_id = appointment_id` (for backward compat)
   - `chat_threads.order_type = 'prescription'`
   - Auto-adds members: doctor, pharmacy, patient

3. **Doctor builds prescription** in thread
   - Can add medications, notes, etc.
   - Messages are saved to thread

4. **Doctor saves prescription** → Updates ticket
   - Creates `prescriptions` record
   - Updates `healthcare_tickets.prescription_id`
   - Updates `healthcare_tickets.status = 'sent'`
   - Sends notification to pharmacy

### Phase 2: Pharmacy Receives (Pharmacy)

1. **Pharmacy receives ticket notification**
   - Ticket appears in pharmacy dashboard
   - Status: 'sent' → 'received'

2. **Pharmacy opens ticket** → Thread automatically loads
   - Thread is found via `ticket_id`
   - All messages are visible
   - Prescription details are visible

3. **Pharmacy can communicate** via thread
   - Messages tied to ticket
   - Full audit trail

### Phase 3: Status Updates

- Status changes update ticket
- Timeline entries track all changes
- Messages can reference status updates

## Implementation Plan

### Step 1: Update Database Schema

```sql
-- Add ticket_id to chat_threads (if not exists)
ALTER TABLE chat_threads 
ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES healthcare_tickets(id);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_chat_threads_ticket_id ON chat_threads(ticket_id);

-- Ensure order_id still exists for backward compatibility
-- But ticket_id becomes PRIMARY identifier
```

### Step 2: Update Prescription Creation Flow

**When doctor selects pharmacy:**
1. Create/update `healthcare_tickets` record
2. Create `chat_threads` record with `ticket_id`
3. Add members from ticket parties
4. Return thread_id

**When doctor saves prescription:**
1. Create `prescriptions` record
2. Update `healthcare_tickets.prescription_id`
3. Update `healthcare_tickets.status = 'sent'`
4. Send notification to pharmacy

### Step 3: Update Pharmacy View

**Pharmacy loads prescriptions:**
1. Query `healthcare_tickets` where `secondary_provider_id = pharmacy.id`
2. For each ticket, find thread via `ticket_id`
3. Load messages from thread
4. Display prescription from `ticket.prescription_id`

### Step 4: Update Message System

**All message operations:**
- Find thread via `ticket_id` (PRIMARY)
- Fallback to `order_id` for backward compatibility
- Ensure RLS uses correct `auth.uid()` matching ticket parties

## Benefits of This Approach

1. **Single Source of Truth** - Ticket is the central hub
2. **Guaranteed Workflow** - Prescription must exist before messages
3. **Full Audit Trail** - Ticket timeline tracks everything
4. **Better Tracking** - Can query tickets by status, type, parties
5. **Compliance** - Aligns with SOP ticket-centric architecture
6. **Scalability** - Easy to add lab requests, referrals, etc.

## Migration Strategy

1. **Add `ticket_id` column** to existing threads
2. **Create tickets** for existing prescriptions
3. **Link threads** to tickets
4. **Update code** to use `ticket_id` as primary lookup
5. **Keep `order_id`** for backward compatibility during transition

## Alternative: Use `ticket_messages` Table

The SOP also mentions `ticket_messages` table. We could:
- Use `ticket_messages` for all prescription-related communication
- Keep `chat_threads` for general chat only
- This would be cleaner separation but requires more refactoring

## Recommendation

**Use Ticket-Centric with Threads:**
- Keep `chat_threads` but link via `ticket_id`
- Use `healthcare_tickets` as central hub
- Prescription workflow: Ticket → Thread → Messages
- This provides best of both worlds: ticket tracking + rich messaging UI
