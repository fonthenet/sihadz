# Stable System v2 — Patient Prescription & Ticket Flow

**Status:** Do not break. This flow is working and must remain stable.

## What is included

- **Prescription creation** by doctor (from appointment).
- **Healthcare ticket** creation (appointment ticket, prescription ticket with pharmacy).
- **Pharmacy flow:** scan, status updates (processing → ready_for_pickup → picked_up).
- **APIs:** `/api/prescriptions/*`, `/api/tickets/*`, `/api/tickets/[id]` (patient sees prescription + timeline).
- **Patient viewing prescription:** ticket detail (e.g. `/dashboard/tickets` modal or link from My Appointments) shows prescription (diagnosis, medications, status) and timeline. No thread/messaging for patient.
- **Prescriptions page:** `/dashboard/prescriptions` — list of prescriptions for the patient. Keep as-is.

## Out of scope for “unified My Appointments” changes

- Do not change how prescriptions are created, stored, or updated.
- Do not change ticket creation or status transitions.
- Do not remove or alter the ticket detail view (prescription + timeline); it can be linked from the unified My Appointments hub instead of a separate sidebar item.

Last updated: 2025-01-29
