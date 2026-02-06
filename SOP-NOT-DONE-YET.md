# SOP — What Hasn't Been Done Yet

> Based on the Multi-Service Health Platform SOP (v6.1) and workspace rules.  
> Last updated: 2026-01-29

---

## Section 1 — Executive Summary

| Item | Status | Notes |
|------|--------|-------|
| **Ticket-centric architecture** | Partial | Tickets exist for appointments; not fully unified across prescriptions/lab orders |
| **Deposit-based revenue (300–500 DZD)** | Partial | Wallet/deposit used for appointments; fixed 300–500 DZD platform fee not enforced everywhere |
| **Reschedule-first** | Not done | No reschedule-first UX; cancellation vs reschedule flows not prioritized |
| **Event-sourced audit** | Partial | Some audit; not full event-sourced architecture |
| **Patient memberships (Family+/Premium)** | Not done | No membership tiers |
| **Provider subscriptions (Pro/Clinic/Enterprise)** | Not done | No subscription tiers |

---

## Section 2 — Provider Onboarding

| Item | Status | Notes |
|------|--------|-------|
| **Doctor specialties (primary care, pediatrics, women's health, surgery)** | Partial | Basic onboarding; specialty-specific templates/coding missing |
| **License verification workflow** | Partial | Basic approval; no structured license verification flow |
| **Admin review step** | Partial | Super-admin approve exists; full review workflow missing |
| **Onboarding tutorial / training** | Not done | No specialty-specific learning |
| **Availability setup (buffer time, duration)** | Partial | Basic schedules; full buffer/duration config unclear |

---

## Sections 3–8 — Referenced in Rule but Not in SOP File

| Section | Title | Status |
|---------|-------|--------|
| 3 | Availability & Time-Off | Partial — basic schedules; time-off blocks unclear |
| 4 | Ticket System | Partial — tickets exist; CREATED → DEPOSIT_PAID → ACCEPTED → … → COMPLETED/CLOSED not enforced |
| 5 | Payment & Wallet | Partial — wallet, Chargily; refund rules (48h/24h/<24h) not fully implemented |
| 6 | Cancellation/Rescheduling | Not done — reschedule-first, cancellation timeframes |
| 7 | Membership | Not done |
| 8 | Doctor Tools | Partial — prescriptions, lab requests; full toolset unclear |

---

## Section 9 — Pharmacy Inventory & POS

### 9.1 Product Management

| Item | Status | Notes |
|------|--------|-------|
| **Arabic names** | Partial | French primary; Arabic secondary not prominent |
| **Storage conditions** | Partial | May exist in schema; UI unclear |
| **Controlled substance flag + Tableau A/B/C** | Not done | No Tableau classification |
| **CNAS tarif de référence per product** | Partial | Schema may have; full UI/config unclear |
| **Reimbursement rate (0%, 80%, 100%)** | Partial | Calculation exists; full product config unclear |

### 9.2 Stock Tracking

| Item | Status | Notes |
|------|--------|-------|
| **Reserved quantity for pending prescriptions** | Partial | Reserved qty logic unclear |
| **Location tracking (shelf, drawer, refrigerator)** | Partial | Warehouses exist; location per batch unclear |
| **Expiring 30d / 7d alerts** | Partial | Alerts exist; 30/7 day thresholds may differ |
| **Stock discrepancy (count vs system)** | Partial | Adjustments exist; formal discrepancy workflow unclear |
| **FEFO enforcement** | Partial | Logic may exist; enforced FEFO at sale unclear |

### 9.3 Stock Movements

| Item | Status | Notes |
|------|--------|-------|
| **RETURN_SUPPLIER** | Partial | May exist; full workflow unclear |
| **RETURN_CUSTOMER** | Not done | Approval workflow |
| **EXPIRED (mark for disposal)** | Partial | May exist; disposal workflow unclear |
| **TRANSFER between pharmacies** | Partial | Intra-warehouse; inter-pharmacy unclear |
| **DAMAGE** | Partial | May be covered by adjustments |
| **7-year retention / audit** | Partial | Not verified |

### 9.4 POS Operations

| Item | Status | Notes |
|------|--------|-------|
| **Chifa at POS** | Partial | Cart has Chifa split; full tiers-payant flow (patient portion only) unclear |
| **BaridiMob / CCP** | Partial | POS field exists; no Chargily integration at POS |
| **Credit (B2B)** | Not done | B2B invoicing / AR |
| **Queue Chifa items for CNAS batch** | Partial | Chifa management exists; automatic queue from POS unclear |

### 9.5 Chifa/CNAS Integration

| Item | Status | Notes |
|------|--------|-------|
| **Patient Chifa verification at sale** | Partial | Chifa # may be captured; eligibility check unclear |
| **CNAS liste check** | Partial | Product eligibility; CNAS liste validation unclear |
| **Electronic batch submission to CNAS** | Not done | Bordereaux exist; no e-submission |
| **Claim status (submitted, processing, paid, rejected)** | Partial | Rejections exist; full status tracking unclear |
| **Reconcile CNAS payments to claims** | Not done | Payment reconciliation |

### 9.6 Algerian Accounting

| Item | Status | Notes |
|------|--------|-------|
| **TVA (0%, 9%, 19%)** | Partial | TVA in schema; full G50 workflow unclear |
| **G50 monthly declaration** | Not done | No G50 export/generation |
| **Invoice numbering (FAC-2026-00001)** | Partial | Sequential numbering; gap enforcement unclear |
| **Registre des stupéfiants** | Not done | Controlled substance log |
| **10-year document retention** | Partial | Not enforced by system |

### 9.7 Controlled Substances

| Item | Status | Notes |
|------|--------|-------|
| **Ordonnancier (special register)** | Not done | No ordonnancier |
| **Tableau A/B/C classification** | Not done | |
| **Prescription + patient ID verification** | Partial | Prescription flow exists; ID check unclear |
| **Quantity limits per prescription** | Not done | |
| **Weekly stock reconciliation** | Not done | |
| **Separate secure storage** | Not done | |

### 9.8 Supplier Management

| Item | Status | Notes |
|------|--------|-------|
| **Wilaya, commune** | Partial | Algeria locations exist; supplier address fields unclear |
| **Payment terms (cash, 30, 60 days)** | Partial | May exist |
| **Product catalog from supplier** | Partial | May exist |
| **Performance history** | Not done | |
| **Create PO from low stock** | Partial | Suggestions exist; full flow unclear |
| **Receiving workflow** | Partial | May exist |
| **Handle discrepancies (short, damaged, wrong)** | Partial | |
| **Pricing updates / margin recalculation** | Partial | |

### 9.9 Reports & Analytics

| Item | Status | Notes |
|------|--------|-------|
| **Daily sales summary** | Partial | Session reports exist; daily rollup unclear |
| **Monthly sales by product/category/supplier** | Partial | |
| **Profit margin analysis** | Partial | |
| **CNAS claims summary** | Partial | Chifa dashboard exists |
| **Stock valuation (FIFO)** | Partial | calc exists; report unclear |
| **TVA summary for G50** | Not done | |
| **Dead stock (>90 days)** | Partial | |
| **ABC analysis** | Not done | |

---

## Sections 10–14 — Referenced in Rule but Not in SOP File

| Section | Title | Status |
|---------|-------|--------|
| 10 | Learning Center | Not done |
| 11 | Clinical Coding & AI | Not done |
| 12 | System Feedback | Not done |
| 13 | Consent & Privacy | Partial — privacy settings; full consent flow unclear |
| 14 | Disputes | Not done |

---

## Section 15 — Security & Audit

| Item | Status | Notes |
|------|--------|-------|
| **Audit logging (all access, modifications)** | Partial | RLS; no dedicated audit log table |
| **Access denied logging** | Partial | |
| **7-year log retention** | Not done | |
| **Real-time CRITICAL alerting** | Not done | |
| **Daily integrity checks** | Not done | |
| **Error escalation matrix** | Partial | Basic error handling; no P0/P1/P2 matrix |

---

## Section 16 — AI Integrations

| Item | Status |
|------|--------|
| AI integrations | Not done |

---

## Section 17 — Failure & Timeout Handling

| Item | Status | Notes |
|------|--------|-------|
| **Timeout config (API 30s, DB 10s, etc.)** | Partial | Defaults only |
| **Retry with backoff** | Partial | |
| **Graceful degradation** | Partial | Basic; no offline queue |
| **Fallback to polling** | Partial | |
| **P0/P1/P2/P3 incident response** | Not done | |
| **On-call / escalation** | Not done | |

---

## Sections 18–20 — Roadmap & Work Plan

| Section | Title | Status |
|---------|-------|--------|
| 18 | Implementation Roadmap | Not done |
| 19 | Development Work Plan | Not done |
| 20 | (if any) | — |

---

## Section 21 — Platform-Wide Communication (Threads vs Chat)

| Item | Status | Notes |
|------|--------|-------|
| **THREADS (ticket-scoped)** | Partial | Prescription threads exist; not unified with tickets |
| **CHAT (standalone, discoverable)** | Not done | No Chat system; only ticket-scoped threads |
| **Availability toggle (accept new chats)** | Not done | |
| **Who can chat with whom matrix** | Not done | |
| **Chat widget (collapsed/expanded)** | Not done | |
| **chat_user_settings, chat_conversations, etc.** | Partial | chat_* tables may exist; Chat UI missing |
| **Supabase Realtime for Chat** | Partial | May be used for threads; Chat not implemented |
| **"Continue chatting with Dr. X"** | Not done | |
| **Moderation (spam, rate limit, block)** | Not done | |

---

## Section 22 — Offline Operations & Backup

| Item | Status | Notes |
|------|--------|-------|
| **Tier 1 — Full offline (Pharmacy POS)** | Not done | No IndexedDB/SQLite offline POS |
| **Tier 2 — Read + queue (Doctor/Lab)** | Not done | No offline queue |
| **Tier 3 — Cached view (Patient)** | Partial | Basic caching; offline view unclear |
| **Backup schedule (daily 2AM, etc.)** | Partial | Scheduler may exist; full cron unclear |
| **Retention (30 days, min 3, pinned)** | Partial | |
| **Mobile backup (Capacitor, SQLite)** | Partial | Lib exists; mobile app unclear |
| **iCloud (iOS)** | Not done | |
| **Dry-run restore** | Partial | |
| **Conflict resolution** | Partial | |
| **Power outage protocol** | Not done | Auto-save, offline receipt book number |
| **UPS recommendations** | Not done | Docs only |

---

## Cross-Cutting

### Ticket System (SOP Rule)

| Item | Status |
|------|--------|
| States: CREATED → DEPOSIT_PAID → ACCEPTED → … → COMPLETED/CLOSED | Partial |
| Multiple orders per ticket | Partial |
| Orders never edited after send | Partial |
| Refunds: 48h+ = 100%, 24–48h = 50%, <24h = 0% | Not done |

### Revenue (SOP Rule)

| Item | Status |
|------|--------|
| Deposit 300–500 DZD | Partial |
| Wallet top-up (BaridiMob, CCP, Cash) | Partial |
| Refunds by timeframe | Not done |

### Language & Localization

| Item | Status |
|------|--------|
| French primary | Partial |
| Arabic | Partial |
| Algeria wilayas, CNAS | Partial |

---

## Summary

- **Not done:** Chat, membership, subscriptions, ordonnancier, G50, CNAS e-submission, full offline POS, dispute handling, learning center, clinical coding & AI, system feedback, incident response, AI integrations.
- **Partial:** Ticket states, refund rules, Chifa workflows, audit logging, controlled substances, many reports, mobile backup, conflict resolution.
- **Done:** Basic POS, inventory, Chifa management, backup (server/local/Google), RBAC, employee auth, prescriptions, lab requests, appointments, wallet.
