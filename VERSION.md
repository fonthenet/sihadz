# DZDoc / Multi-Service Health Platform — Version History

## Stable 1 (v1.0.0)

**Marked:** First stable release for the prescription/thread workflow.

### Included in Stable 1

- **Doctor dashboard**
  - Appointments list and details; thread list survives refresh (API + fallback).
  - Prescription threads: create by pharmacy, ticket-centric flow, RLS fix for `healthcare_tickets` INSERT by primary provider.
  - Thread lookup: accept thread by appointment match when `threadId` is provided; no duplicate cards (dedupe by `threadId` + type/target).
  - Delete thread: full cleanup — resolve prescription (metadata, ticket, appointment+pharmacy fallback), DELETE prescription API, cancel healthcare_ticket, delete chat_thread (messages/members CASCADE).
- **Pharmacy**
  - Prescriptions list and discussion thread; thread loaded by ticket or order_id/metadata.
  - No pharmacy-side delete (doctor-only delete).
- **SOP**
  - Revenue, tickets, threads vs chat, and booking/auth rules as in `app/dashboard/sop/initial-sop-data.ts`.

### How to use this marker

- **Stable 1** = baseline for the prescription/thread flow; use this tag/commit for rollback or comparison.
- For future releases, add new sections above (e.g. **Stable 2**, **v1.1.0**) with date and summary.
