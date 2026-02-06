# Multi-Family Member: Prescriptions & Lab Tests — Design (A to Z)

## Problem Statement

When a patient books an appointment for **multiple family members** (e.g., parent + 2 children), the doctor faces:

1. **Different prescriptions per member** — Each person may need different medications (e.g., child A: antibiotics, child B: antihistamine, parent: pain relief).
2. **Different lab tests per member** — Each may need different tests (e.g., blood work for one, urine for another).
3. **Data only in notes** — Health data (allergies, conditions, weight) is currently shown in the UI but not properly associated with each prescription/lab request. The pharmacy/lab receives a prescription without clear "patient name + age + allergies" per order.

## Current State

| Component | Supports multi-family? | Notes |
|-----------|------------------------|-------|
| **Appointments** | ✅ Yes | `family_member_ids[]`, `family_member_id` (first) |
| **Ticket metadata** | ✅ Yes | `family_members_vitals[]` with each member's data |
| **Prescriptions** | ⚠️ Partial | Has `family_member_id` (singular). API inherits from appointment's `family_member_id` only. **No UI to select which member.** |
| **Lab requests** | ⚠️ Partial | Same — has `family_member_id`, API accepts it, but **no UI selector**. |
| **PrescriptionBuilder** | ❌ No | Never passes `familyMemberId` to API |
| **LabTestRequestBuilder** | ❌ No | Same |
| **ClinicalOrdersPanel** | ⚠️ Partial | Passes `familyMemberId` (singular, first member only) — not used by builders |
| **Pharmacy view** | ❓ Unknown | Needs to show "For: [Name], [Age], Allergies: ..." per prescription |
| **Lab view** | ❓ Unknown | Same — needs patient context per request |

## Design Principles

1. **One prescription = one patient** — Each prescription is for exactly one person (self or one family member).
2. **One lab request = one patient** — Same.
3. **Explicit selection** — Doctor must explicitly choose "For: [Name]" when creating each order.
4. **Structured data, not notes** — Patient name, age, allergies, etc. must be stored in DB and displayed on print/PDF, not only in free-text notes.
5. **Backward compatible** — Single-family and self-booking must continue to work.

---

## Proposed Architecture (A to Z)

### A. Data Model (Already in place)

- `prescriptions.family_member_id` — which family member this Rx is for (null = self)
- `lab_test_requests.family_member_id` — same
- `appointments.family_member_ids[]` — all members in this visit
- `healthcare_tickets.metadata.family_members_vitals[]` — health snapshot per member at booking time

**No schema change needed** for prescriptions/lab requests. We only need to **use** `family_member_id` correctly and add UI.

### B. Doctor UI: "For whom?" Selector

When the doctor clicks **"New Prescription"** or **"New Lab Request"**:

1. **If appointment has multiple family members** (`family_member_ids.length > 1`):
   - Show a **required** dropdown/radio at the top: **"Prescription for:"**
   - Options: `[Self - {patient name}]` (if booking for self is possible) + each family member: `[Child - Ahmed, 5 yrs]`, `[Child - Sara, 3 yrs]`, etc.
   - Use `family_members_vitals` from ticket or `familyContext.familyMembers` for names and ages.

2. **If single family member or self only**:
   - No selector needed — auto-set `family_member_id` from appointment (current behavior).
   - Optionally show a small badge: "For: Ahmed (child, 5 yrs)" for clarity.

### C. PrescriptionBuilder Changes

1. **New prop**: `familyMembers?: Array<{ id: string; full_name: string; age_years?: number; relationship?: string }>`
2. **New prop**: `selectedFamilyMemberId?: string | null` — or make it internal state when opening "New Prescription".
3. **New state**: `prescriptionForMemberId: string | null` — which family member this Rx is for.
4. **UI**: When `familyMembers?.length > 1`, render a selector before diagnosis/medications.
5. **API call**: Include `familyMemberId: prescriptionForMemberId` in the POST body.

### D. LabTestRequestBuilder Changes

Same pattern as PrescriptionBuilder:

1. Add `familyMembers` prop.
2. Add `prescriptionForMemberId` (or `labRequestForMemberId`) state and selector.
3. Pass `familyMemberId` to lab-requests API.

### E. ClinicalOrdersPanel Changes

1. **New prop**: `familyMembers?: Array<{ id: string; full_name: string; age_years?: number; relationship?: string }>` — from `familyContext.familyMembers` or ticket metadata.
2. Pass `familyMembers` to PrescriptionBuilder and LabTestRequestBuilder.
3. When opening "New Prescription" dialog, optionally pre-select the first member if only one, or require selection if multiple.

### F. Doctor Appointment Details → ClinicalOrdersPanel

1. Pass `familyMembers` instead of (or in addition to) `familyMemberId`:
   - From `familyContext.familyMembers` when available.
   - Or build from `appointment.family_member_ids` + `family_members_vitals` from ticket.
2. Include "Self" as an option when the appointment is for self (no family members) or when the account holder is also a patient in the visit (edge case).

### G. Prescription Display: "For [Name]"

When displaying a prescription (doctor, patient, pharmacy):

- If `prescription.family_member_id` is set:
  - Fetch `family_members.full_name`, `date_of_birth` (for age), `allergies`, etc.
  - Show clearly: **"For: Ahmed Benali (5 yrs) — Allergies: Penicillin"**
- If null: show account holder's name from `profiles` or `patient_id`.

Same for lab requests.

### H. Pharmacy View

- Prescription card/print must show:
  - **Patient:** [Full name]
  - **Age:** X yrs
  - **Allergies:** ...
  - **Chronic conditions:** ...
- Data comes from `family_members` when `family_member_id` is set, else from `profiles`.

### I. Lab View

- Lab request must show the same patient context for correct labeling of samples and results.

### J. Ticket / Thread Association

- One ticket per appointment (current).
- Multiple prescriptions can link to the same ticket (`healthcare_tickets.prescription_id` is singular — may need to support multiple, or use a join table).
- **Check**: Does the ticket have `prescription_id` (single) or can multiple prescriptions link to one ticket?
  - If single: we may need `prescription_ticket` or `ticket_prescriptions` join, or store array in metadata.
  - Simpler: keep one "primary" prescription_id for backward compat, and list all prescriptions in ticket metadata or via `prescriptions.appointment_id` / `prescriptions.ticket_id` (if such a column exists).

Let me verify: prescriptions have `appointment_id`. So we can list all prescriptions for an appointment. The ticket has `appointment_id`. So: prescriptions for this visit = those with `appointment_id = X`. The ticket's `prescription_id` might be "most recent" or "primary" — need to check usage.

### K. Visit Context for AI (Lab Suggestions)

- When multiple family members, the lab request builder's AI suggestions should use the **selected member's** age, gender, allergies — not a mix.
- Pass `visitContext` per member when the doctor selects one.

### L. Summary of Code Changes

| File | Change |
|------|--------|
| `ClinicalOrdersPanel` | Add `familyMembers` prop; pass to PrescriptionBuilder & LabTestRequestBuilder |
| `PrescriptionBuilder` | Add `familyMembers`, `familyMemberId`; add "For:" selector; pass `familyMemberId` to API |
| `LabTestRequestBuilder` | Same |
| `doctor-appointment-details-client` | Pass `familyMembers` (from familyContext) to ClinicalOrdersPanel |
| `app/api/prescriptions/route.ts` | Already accepts `familyMemberId`; ensure it's used (no inheritance when explicit) |
| `app/api/lab-requests/route.ts` | Same |
| Prescription print/display components | Show "For: [name], [age], Allergies: ..." when family_member_id set |
| Pharmacy prescription view | Same |

---

## Implementation Order

1. **Phase 1 — Doctor UX (Core)**
   - Add `familyMembers` to ClinicalOrdersPanel props (from doctor-appointment-details).
   - Add "For:" selector to PrescriptionBuilder when `familyMembers.length > 1`.
   - Add "For:" selector to LabTestRequestBuilder when `familyMembers.length > 1`.
   - Pass `familyMemberId` from both builders to their APIs.

2. **Phase 2 — Display**
   - Update prescription display (doctor, patient, pharmacy) to show "For: [Name], [Age], Allergies: ..." when `family_member_id` is set.
   - Same for lab request display.

3. **Phase 3 — Polish**
   - Pre-select first family member when only one.
   - Ensure visit context (allergies, age) passed to AI uses the selected member.
   - Add badge on prescription/lab cards: "For: Ahmed (5 yrs)".

---

## Edge Cases

1. **Appointment for self only** — No family members. No selector. `family_member_id` = null. Works as today.
2. **Appointment for one family member** — Can skip selector (auto-select) but show badge for clarity.
3. **Appointment for multiple** — Selector required. Each new prescription/lab request: doctor must choose.
4. **Edit existing prescription** — Show which member it's for (read-only). Editing the "for" might be allowed but consider audit trail.
5. **Legacy prescriptions** — Old prescriptions without `family_member_id`: display as "For: [Account holder name]" (current behavior).

---

## Open Questions

1. **Ticket ↔ Prescriptions**: Is `healthcare_tickets.prescription_id` single? Can one ticket have multiple prescriptions? (Likely yes via `prescriptions.appointment_id` — list all for the appointment.)
2. **Pharmacy/Lab RLS**: Do pharmacies/labs need to read `family_members` for prescriptions with `family_member_id`? (RLS in script 096/097 suggests they can when it's a family member of a patient they're serving.)
3. **CHIFA per family member**: Each family member may have their own CHIFA number. Ensure `family_members.chifa_number` is used when displaying/sending to pharmacy.
