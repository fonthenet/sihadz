# Prescription Anti-Fraud System — Design

## Problem Statement

Patients abuse paper prescriptions by:
- Using the same prescription at multiple pharmacies
- Obtaining multiple copies from doctors and redeeming each
- Doctor shopping (visiting multiple doctors for same controlled drugs)
- Reselling medications obtained fraudulently

Pharmacies and doctors need a way to flag and detect fraud for **both**:
- **Platform customers** (patient_id, appointment-linked)
- **Walk-in customers** (paper prescription, no profile)

## Reference: Major Health Systems

| System | Approach |
|--------|----------|
| **US PDMP** | State-level registry; pharmacies query before dispensing controlled substances |
| **UK NHS** | Electronic prescribing (EPS); prescriptions tracked in spine; single-use codes |
| **France** | Carnet de ordonnances sécurisé; numbered prescriptions; central traceability |
| **Algeria** | Ordre des Pharmaciens; Ordonnancier for Tableau A/B/C; CNAS for reimbursement |

## Design Principles

1. **One prescription = one redemption** — Each prescription (or medication line) can be dispensed once per pharmacy.
2. **Registry over trust** — Central registry of dispensed prescriptions; pharmacies check before dispensing.
3. **Anonymous walk-ins** — Support patients without platform accounts using CIN, phone, or name+DOB.
4. **Flagging, not blocking** — Doctors/pharmacies flag suspicious behavior; platform can warn or block.
5. **Privacy-aware** — Store minimal identifiers; support regulatory audits.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PRESCRIPTION ANTI-FRAUD REGISTRY                         │
│                    (prescription_redemptions + fraud_flags)                   │
└─────────────────────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲                    ▲
         │                    │                    │                    │
    ┌────┴────┐          ┌────┴────┐          ┌────┴────┐          ┌────┴────┐
    │ Doctor  │          │Pharmacy │          │Pharmacy │          │  Super  │
    │  Flag   │          │ Redeem  │          │  Check  │          │  Admin  │
    │ Patient │          │  (API)  │          │ Before  │          │ View    │
    └─────────┘          └─────────┘          │ Dispense│          └─────────┘
                                              └─────────┘
```

---

## Data Model

### 1. Prescription Redemptions (`prescription_redemptions`)

Tracks every time a prescription (or medication line) is dispensed. Prevents double redemption.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| prescription_id | UUID | FK to prescriptions (null for external paper) |
| pharmacy_id | UUID | FK to professionals |
| **Patient identifiers** (at least one required for walk-ins) | | |
| patient_id | UUID | FK to auth.users (platform patient) |
| patient_cin | TEXT | CIN for walk-in (indexed, hashed for search) |
| patient_phone | TEXT | Phone for walk-in |
| patient_name | TEXT | Full name (walk-in) |
| patient_dob | DATE | Date of birth (walk-in) |
| **Prescription identifiers** | | |
| prescription_number | TEXT | RX-... (platform or external) |
| external_prescription_ref | TEXT | Reference for paper RX from non-platform doctor |
| medication_index | INT | 0-based index in medications array |
| medication_name | TEXT | For external RX |
| quantity_dispensed | INT | |
| **Audit** | | |
| dispensed_at | TIMESTAMPTZ | |
| dispensed_by | UUID | Employee/pharmacist |
| verified_patient_id | BOOLEAN | Did pharmacy verify CIN/ID? |
| source | TEXT | 'platform' \| 'walk_in_paper' \| 'walk_in_digital' |

**Unique constraints** (one redemption per prescription line globally):
- Platform: `(prescription_id, medication_index)` where prescription_id IS NOT NULL
- Prescription number: `(prescription_number, medication_index)` — covers platform printed + walk-in
- External: `(external_prescription_ref, medication_index)` where external_prescription_ref IS NOT NULL

### 2. Fraud Flags (`prescription_fraud_flags`)

Doctors and pharmacies can flag suspicious patients or prescriptions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| flagged_by | UUID | professional_id (doctor or pharmacy) |
| flagged_by_type | TEXT | 'doctor' \| 'pharmacy' |
| **Subject** | | |
| patient_id | UUID | If platform patient |
| patient_cin | TEXT | If walk-in |
| patient_phone | TEXT | |
| patient_name | TEXT | |
| prescription_id | UUID | Optional: specific prescription |
| **Flag details** | | |
| flag_type | TEXT | 'double_redemption' \| 'doctor_shopping' \| 'suspicious_quantity' \| 'forged_prescription' \| 'other' |
| severity | TEXT | 'low' \| 'medium' \| 'high' \| 'critical' |
| description | TEXT | Free text |
| evidence | JSONB | Links to redemptions, photos, etc. |
| **Status** | | |
| status | TEXT | 'open' \| 'under_review' \| 'resolved' \| 'dismissed' |
| resolved_at | TIMESTAMPTZ | |
| resolved_by | UUID | Admin |
| resolution_notes | TEXT | |

### 3. Controlled Substance Registry (extend `ordonnancier_entries`)

Already exists for Tableau A/B/C. Ensure `prescription_number` is indexed and queryable across pharmacies for duplicate checks.

### 4. Patient Risk Scores (`patient_prescription_risk`)

Computed view or cached table for quick lookup.

| Column | Type | Description |
|--------|------|-------------|
| patient_id | UUID | Or (patient_cin, patient_phone) for walk-in |
| risk_level | TEXT | 'none' \| 'low' \| 'medium' \| 'high' \| 'blocked' |
| risk_factors | JSONB | List of contributing factors |
| last_updated | TIMESTAMPTZ | |

---

## Flows

### A. Platform Prescription — Pharmacy Dispenses

1. **Before dispensing**: Pharmacy calls `GET /api/prescription-fraud/check?prescriptionId=X&pharmacyId=Y`
2. API checks `prescription_redemptions` for same prescription_id + medication_index at **any** pharmacy
3. If any redemption exists → return `{ allowed: false, reason: "already_dispensed", at_pharmacy: "..." }`
4. If `patient_id` has `patient_prescription_risk.blocked` → return `{ allowed: false, reason: "patient_flagged" }`
5. If clean → return `{ allowed: true }`
6. **On dispense**: Pharmacy calls `POST /api/prescription-fraud/redeem` with redemption details
7. System inserts into `prescription_redemptions`; marks prescription line as redeemed

### B. Walk-In — Paper Prescription from Platform Doctor

1. Patient brings paper RX (has QR code or prescription_number)
2. Pharmacy scans QR or enters prescription_number
3. System looks up prescription; if found, runs same check as A
4. On dispense, records redemption with `patient_cin` or `patient_phone` if provided

### C. Walk-In — Paper Prescription from External Doctor

1. Prescription has no platform link
2. Pharmacy creates `external_prescription_ref` (e.g. hash of doctor name + date + patient name)
3. **Before dispensing**: Check `prescription_redemptions` WHERE `external_prescription_ref` + pharmacy
4. **Optional**: Check `patient_cin` or `patient_phone` in fraud flags
5. On dispense, record redemption with `source: 'walk_in_paper'`

### D. Doctor Flags Patient

1. Doctor in appointment view: "Flag patient for prescription abuse"
2. Calls `POST /api/prescription-fraud/flag` with patient_id, flag_type, description
3. Patient gets risk_score updated; pharmacies see warning on next check

### E. Pharmacy Flags Patient

1. After dispensing or refusing: "Report suspicious behavior"
2. Same API; can link to specific prescription or redemption

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prescription-fraud/check` | Check if prescription/line can be dispensed |
| POST | `/api/prescription-fraud/redeem` | Record redemption (platform or walk-in) |
| POST | `/api/prescription-fraud/flag` | Flag patient or prescription |
| GET | `/api/prescription-fraud/patient-risk` | Get risk level for patient (cin/phone/id) |
| GET | `/api/prescription-fraud/redemptions` | List redemptions for prescription (audit) |
| GET | `/api/prescription-fraud/flags` | List flags (admin or own pharmacy/doctor) |

---

## UI Components

### For Pharmacies

1. **Check before dispense** — Modal or inline: "Verify prescription" → calls check API → shows result (green OK / red blocked / yellow warning)
2. **Redeem flow** — After dispensing, "Record redemption" with patient CIN/phone if walk-in
3. **Flag button** — "Report abuse" on prescription or patient view

### For Doctors

1. **Flag patient** — In appointment/prescription view: "Flag for prescription abuse"
2. **Warning banner** — When writing prescription for flagged patient: "This patient has been flagged. Proceed with caution."

### For Super Admin

1. **Fraud dashboard** — List flags, resolve/dismiss, view patterns
2. **Patient risk** — Override risk level, block patient

---

## Privacy & Compliance

- **CIN storage**: Hash for search; full value only when required for regulatory (Ordre des Pharmaciens, CNAS)
- **Retention**: Redemptions kept per Algerian pharmaceutical regulations (typically 5+ years)
- **Access**: Pharmacies see only what they need to verify; doctors see flags they created + platform warnings
- **Consent**: Platform TOS can include sharing for fraud prevention; walk-ins implied by presenting RX

---

## Implementation Phases

### Phase 1: Core Registry (MVP)
- `prescription_redemptions` table
- Check API for platform prescriptions
- Redeem API when pharmacy fulfills
- Basic UI: "Verify" button in pharmacy prescription view

### Phase 2: Walk-In Support
- External prescription ref; CIN/phone capture
- Check for walk-ins
- Pharmacy POS or manual entry flow

### Phase 3: Flagging
- `prescription_fraud_flags` table
- Flag API; doctor/pharmacy UI
- Patient risk scoring (simple: count flags)

### Phase 4: Advanced
- Pattern detection (doctor shopping, same RX multiple)
- Super-admin dashboard
- Integration with Ordonnancier for Tableau A/B/C

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Schema `prescription_redemptions` | ✅ Done | Script 153 |
| Schema `prescription_fraud_flags` | ✅ Done | Script 153 |
| Schema `patient_prescription_risk` | ✅ Done | Script 153 |
| RLS: professionals see all flags/redemptions | ✅ Done | Script 154 — shared awareness |
| RLS: flagger can resolve/dismiss own flags | ✅ Done | Script 154 — self-service |
| RLS: professionals can upsert risk | ✅ Done | Script 154 |
| Trigger: auto-update risk on flag | ✅ Done | Script 154 |
| GET `/api/prescription-fraud/check` | ✅ Done | Platform + walk-in |
| POST `/api/prescription-fraud/redeem` | ✅ Done | Platform + walk-in |
| POST `/api/prescription-fraud/flag` | ✅ Done | Doctor/pharmacy |
| PATCH `/api/prescription-fraud/flag/[id]` | ✅ Done | Resolve/dismiss (flagger or admin) |
| GET `/api/prescription-fraud/patient-risk` | ✅ Done | CIN/phone/patient_id |
| GET `/api/prescription-fraud/flags` | ✅ Done | List flags for patient |
| GET `/api/prescription-fraud/redemptions` | ✅ Done | List redemptions for patient/RX |
| Pharmacy UI (verify, redeem, flag) | ⏳ Pending | Integrate into pharmacy-fulfillment flow |
| Doctor UI (flag patient) | ⏳ Pending | In appointment/prescription view |

**Design principle:** Pharmacies and doctors are the primary actors for fraud; they have full visibility and self-service resolution. Super admin retains oversight but is not required for day-to-day fraud handling.

---

## Algeria-Specific Notes

- **Ordre des Pharmaciens**: May require reporting of suspicious activity
- **CNAS**: Reimbursement claims could cross-check against redemptions
- **Ordre des Médecins**: Doctor flagging should align with professional ethics
- **CIN**: Standard identifier; consider NIF for legal entities
