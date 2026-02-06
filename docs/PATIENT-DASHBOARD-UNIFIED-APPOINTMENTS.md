# Patient Dashboard — Unified My Appointments (Design)

## Problem

- Patient sees: **Overview** (appointments + prescriptions + documents tabs), **My Appointments** (upcoming + tickets + cancelled + completed), and **Tickets** (all tickets). Too many places with overlapping info; confusing.

## Goal

- **One main entry:** **My Appointments** — where the patient sees and controls everything related to appointments and related tickets.
- **Overview** becomes a light summary + quick actions; no duplicate full lists.
- **Prescription flow unchanged** (Stable system v2): receiving prescriptions via tickets, pharmacy status, viewing prescription in ticket detail — all stay as-is.

## Design

### 1. Overview (`/dashboard`)

- **Keep:** Welcome, quick actions (New Appointment, Messages, My Appointments, Pharmacies, etc.), summary **numbers** (upcoming count, prescriptions count).
- **Remove:** The big tabs “Appointments | Prescriptions | Documents” that duplicate full lists.
- **Replace with:** One “What’s next” block: e.g. next upcoming appointment (if any) + “View all in My Appointments” and “Prescriptions” linking to `/dashboard/prescriptions`. Documents can stay as a small section or link to `/dashboard/documents`.

### 2. Sidebar

- **My Appointments** — primary (unchanged).
- **Tickets** — remove as top-level item. Ticket list and detail remain available **inside** My Appointments (tab or view).
- **Prescriptions** — keep (Stable system v2).
- **Overview, Documents, Messages, Wallet, Settings** — unchanged.

### 3. My Appointments (`/dashboard/appointments`) — Single hub

**Tabs:**

1. **Upcoming**
   - Upcoming appointments (with “View ticket” when a ticket exists).
   - Upcoming tickets not tied to an upcoming appointment (e.g. prescription at pharmacy — ready for pickup).
   - Actions: Join, Contact, Change date/time, Cancel, View details, View ticket.

2. **History**
   - **Completed** appointments (with “View prescription” / “View ticket” if any).
   - **Cancelled** appointments.
   - Single list or two subsections; same layout style as current.

3. **All tickets** (optional)
   - Full list of healthcare tickets (same data as current Tickets page).
   - Click → open ticket detail (prescription + timeline) — same behavior as Stable system v2, no change to that modal/API.

**Flows preserved**

- “View ticket” → goes to `/dashboard/tickets` with ticket context, or open ticket detail modal (same as today) so prescription + timeline stay unchanged.
- “View prescription” on appointment/ticket → ticket detail or `/dashboard/prescriptions`; no change to how prescription data is loaded.

### 4. Tickets page (`/dashboard/tickets`)

- **Keep the page and all behavior** (list, filters, ticket detail modal with prescription + timeline). Stable system v2.
- **Access:** From sidebar we remove the “Tickets” link; access is via My Appointments → “All tickets” tab or “View ticket” links. Optional: keep a small “Tickets” link in sidebar that goes to `/dashboard/appointments?view=tickets` or `/dashboard/tickets` for power users.

### 5. Prescriptions page (`/dashboard/prescriptions`)

- No change. Stable system v2. Linked from Overview and from My Appointments when relevant.

## Summary

| Before                         | After                                      |
|--------------------------------|--------------------------------------------|
| Overview: Appointments + Prescriptions + Documents tabs | Overview: summary + “What’s next” + link to My Appointments |
| Sidebar: Overview, My Appointments, Prescriptions, …, Tickets | Sidebar: Overview, My Appointments, Prescriptions, … (no Tickets) |
| My Appointments: Upcoming + Cancelled + Completed + tickets mixed in | My Appointments: Upcoming \| History \| All tickets |
| Tickets: separate full page   | Tickets: inside My Appointments (All tickets tab) + same page/detail kept |

Prescription receiving and viewing (ticket detail, pharmacy flow, APIs) remain **Stable system v2** — no breaking changes.
