# Chifa/CNAS/CASNOS Integration Specification

> **Research compiled from: CNAS.dz, ChifaPlus, Pharmacium, CASNOS official sources, Algerian pharmacy software vendors**

## 1. Overview of Insurance Systems

### 1.1 Insurance Bodies

| Code | Name | Covers |
|------|------|--------|
| **CNAS** | Caisse Nationale des Assurances Sociales | Salaried employees (workers) |
| **CASNOS** | Caisse Nationale de Sécurité Sociale des Non-Salariés | Self-employed, merchants, artisans, farmers, liberal professions |
| **CVM** | Convention Militaire | Military personnel and families |
| **HORS_CHIFA** | Non-insured | Private pay (no insurance) |

### 1.2 Chifa Card
- Electronic health insurance card
- Issued by CNAS/CASNOS
- Contains: Numéro d'assuré, Rang, Ayants-droit (dependents)
- 14+ million cardholders, 38+ million beneficiaries
- Enables **tiers-payant** (third-party payment) - patient pays nothing or minimal amount

---

## 2. Reimbursement Rates

### 2.1 Standard Prescriptions
| Type | Ceiling per Prescription |
|------|--------------------------|
| Ordinary insured | 5,000 DA (increased from 3,000 DA with Chifa 2) |
| Chronic diseases (ALD) | **100% - No ceiling** |

### 2.2 Chronic Diseases (ALD) - 26 Pathologies at 100%

**Cardiovascular:**
- Hypertension artérielle maligne
- Angine de poitrine
- Infarctus du myocarde
- Accident vasculaire cérébral (AVC)
- Troubles du rythme cardiaque
- Maladies des valves cardiaques

**Neurological/Muscular:**
- Sclérose en plaques
- Épilepsie
- Paralysie faciale d'origine cérébrale
- Amyotrophie spinale progressive
- Myopathie
- Myasthénie
- Inflammation des nerfs

**Other:**
- Tuberculose (all forms)
- Cancers
- Maladies du sang (blood diseases)
- Maladies rénales (kidney diseases)
- Diabète
- Cirrhose du foie
- Arthrite rhumatoïde
- Spondylarthrite ankylosante
- Insuffisance respiratoire chronique
- Lupus érythémateux disséminé
- Lèpre

### 2.3 Medication Reimbursement Tiers
Based on **vignette** (medication barcode label):
- Some medications: 100% covered
- Some medications: 80% covered
- Some medications: 60% covered
- Some medications: Not covered (patient pays full)

---

## 3. Pharmacy Workflow

### 3.1 Point of Sale with Chifa

```
1. Patient presents: 
   - Prescription (Ordonnance)
   - Chifa card (or family member's card + dependant proof)

2. Pharmacist actions:
   - Insert Chifa card into reader
   - Software reads: Numéro assuré, Rang, Organisme (CNAS/CASNOS), ALD status
   - Validate prescription date (not expired)
   - Check patient eligibility (card active, not exceeded ceiling)

3. Dispensing:
   - Scan/enter medications
   - System calculates:
     * Total price (TTC)
     * Chifa portion (what insurance pays)
     * Patient portion (what patient pays)
   - Dispense medications
   - Patient pays their portion (if any)

4. Invoice creation:
   - Create Facture Chifa with all details
   - Link to prescription data
   - Status: PENDING

5. Accumulate for batch submission
```

### 3.2 Bordereau (Batch) Workflow

```
1. Create Bordereau:
   - Group invoices by: Organisme (CNAS or CASNOS), Period
   - Maximum 20 invoices per bordereau
   - Assign bordereau number

2. Validate Bordereau:
   - Check all invoices complete
   - Verify totals
   - Lock bordereau (no more edits)

3. Submit to CNAS/CASNOS:
   - Export bordereau (electronic or physical)
   - Deposit at CNAS/CASNOS agency
   - Record submission date

4. Track Payment:
   - Status: SUBMITTED → PROCESSING → PAID / PARTIALLY_PAID / REJECTED
   - Record payment amount received
   - Track rejections

5. Handle Rejections:
   - View rejection motif (reason)
   - Correct invoice if possible
   - Resubmit in new bordereau or write off
```

### 3.3 Special Cases

#### Factures en Instance (CM) - Pending Invoices
- When medication not available at pharmacy
- Create placeholder invoice
- Fulfill later when stock arrives
- Then add to bordereau

#### Vignettes de Dépannage - Emergency Dispensing
- Emergency supply when patient's pharmacy doesn't have stock
- Special tracking required
- Different reimbursement process

#### Échange entre Pharmaciens
- Inter-pharmacy transfers/loans
- Track separately from sales
- No Chifa involvement

---

## 4. Data Model

### 4.1 Chifa Invoice (Facture Chifa)

```
chifa_invoices
├── id (UUID)
├── pharmacy_id (FK)
├── invoice_number (sequential: FAC-YYYY-NNNNNN)
├── invoice_date
├── sale_id (FK to pos_sales) - links to POS transaction
│
├── -- Patient/Insured Info --
├── insured_number (numéro assuré from Chifa card)
├── insured_name
├── insured_rank (rang: 1=principal, 2+=ayant-droit)
├── beneficiary_name (if different from insured)
├── beneficiary_relationship (spouse, child, etc.)
│
├── -- Insurance Info --
├── insurance_type (CNAS, CASNOS, CVM, HORS_CHIFA)
├── is_chronic (ALD - 100% coverage)
├── chronic_code (pathology code if ALD)
│
├── -- Prescription Info --
├── prescriber_name
├── prescriber_specialty
├── prescription_date
├── prescription_number (if available)
│
├── -- Financial --
├── total_amount (total TTC)
├── chifa_amount (portion to claim from insurance)
├── patient_amount (portion paid by patient)
├── patient_paid (boolean)
│
├── -- Status --
├── status (DRAFT, PENDING, IN_BORDEREAU, SUBMITTED, PAID, REJECTED, WRITTEN_OFF)
├── bordereau_id (FK, nullable)
│
├── created_at
└── updated_at
```

### 4.2 Chifa Invoice Items

```
chifa_invoice_items
├── id (UUID)
├── invoice_id (FK)
├── product_id (FK to pharmacy_products)
├── product_name
├── product_barcode
├── batch_number
├── expiry_date
│
├── quantity
├── unit_price (PPVG - public price)
├── total_price
│
├── reimbursement_rate (100, 80, 60, 0)
├── chifa_amount (calculated)
├── patient_amount (calculated)
│
├── -- Pharmacy margin --
├── purchase_price
├── margin_amount
│
└── created_at
```

### 4.3 Bordereau (Batch)

```
chifa_bordereaux
├── id (UUID)
├── pharmacy_id (FK)
├── bordereau_number (BOR-YYYY-NNNNNN)
├── insurance_type (CNAS, CASNOS, CVM)
│
├── -- Period --
├── period_start
├── period_end
│
├── -- Counts --
├── invoice_count
├── total_amount (sum of chifa_amount from invoices)
│
├── -- Status --
├── status (DRAFT, FINALIZED, SUBMITTED, PROCESSING, PAID, PARTIALLY_PAID, REJECTED)
├── finalized_at
├── submitted_at
├── submitted_by (user who deposited)
│
├── -- Payment --
├── amount_paid
├── payment_date
├── payment_reference
│
├── -- Notes --
├── notes
│
├── created_at
└── updated_at
```

### 4.4 Chifa Rejections

```
chifa_rejections
├── id (UUID)
├── invoice_id (FK)
├── bordereau_id (FK)
├── pharmacy_id (FK)
│
├── rejection_date
├── rejection_code
├── rejection_motif (reason text)
│
├── -- Resolution --
├── status (PENDING, CORRECTED, RESUBMITTED, WRITTEN_OFF)
├── corrected_invoice_id (FK, new invoice if corrected)
├── resolution_notes
├── resolved_at
├── resolved_by
│
├── created_at
└── updated_at
```

### 4.5 Chronic Disease Registry

```
chronic_disease_codes
├── id (UUID)
├── code (e.g., ALD-01)
├── name_fr
├── name_ar
├── category
├── coverage_rate (100)
├── active
└── created_at
```

---

## 5. Key Features to Implement

### 5.1 Chifa Sale Module (POS Enhancement)
- [ ] Read Chifa card data (simulated - actual hardware integration separate)
- [ ] Auto-detect insurance type from card
- [ ] Check ALD status for 100% coverage
- [ ] Calculate reimbursement per medication
- [ ] Split total: Chifa portion vs Patient portion
- [ ] Create Chifa invoice automatically from sale

### 5.2 Bordereau Management
- [ ] Create new bordereau (auto or manual)
- [ ] Add invoices to bordereau (max 20)
- [ ] View bordereau summary (count, total)
- [ ] Finalize/lock bordereau
- [ ] Print bordereau summary for submission
- [ ] Mark as submitted
- [ ] Track payment status
- [ ] Record payment received

### 5.3 Rejection Management
- [ ] View rejections per bordereau
- [ ] View rejection motif
- [ ] Correct invoice (create corrected copy)
- [ ] Add corrected invoice to new bordereau
- [ ] Write off uncorrectable rejections
- [ ] Rejection statistics/reports

### 5.4 Reports & Analytics
- [ ] Chifa sales summary (daily/weekly/monthly)
- [ ] Pending bordereaux (not yet submitted)
- [ ] Outstanding claims (submitted, awaiting payment)
- [ ] Rejection rate analysis
- [ ] Payment delay analysis
- [ ] Cash flow projection from pending claims

### 5.5 Accounting Integration
When Chifa sale occurs:
```
Journal Entry (auto-generated):

Debit  411 Clients - CNAS/CASNOS     [Chifa amount]
Debit  531 Caisse                    [Patient portion - if cash]
Credit 700 Ventes de médicaments     [Total HT]
Credit 4457 TVA Collectée            [TVA - usually 0 for meds]

When payment received from CNAS/CASNOS:
Debit  512 Banque                    [Amount received]
Credit 411 Clients - CNAS/CASNOS     [Amount received]

If rejection written off:
Debit  654 Créances irrécouvrables   [Written-off amount]
Credit 411 Clients - CNAS/CASNOS     [Written-off amount]
```

---

## 6. UI Screens

### 6.1 Chifa Dashboard
- Overview: Pending claims, Outstanding payments, Recent rejections
- Quick stats: Total claims this month, Amount pending, Amount received

### 6.2 Bordereau List
- Filter: Status, Insurance type, Date range
- Columns: Number, Date, Invoice count, Total, Status, Payment
- Actions: View, Finalize, Submit, Record payment

### 6.3 Bordereau Detail
- Header: Number, Insurance type, Period, Status
- Invoices list with patient/amount details
- Total summary
- Payment history
- Rejections (if any)

### 6.4 Rejection Queue
- List all pending rejections
- Filter by bordereau, date, motif
- Action: Correct, Resubmit, Write off

### 6.5 Chifa Reports
- Claims by period
- Payment tracking
- Rejection analysis
- Cash flow forecast

---

## 7. Integration with Existing POS

### 7.1 Enhanced POS Flow
```
Current POS Sale → Enhanced with:
├── Insurance type selector (CNAS/CASNOS/CVM/HORS_CHIFA)
├── Chifa card data entry (number, rank, name)
├── ALD checkbox (for 100% coverage)
├── Per-item reimbursement rate
├── Split payment display (Chifa vs Patient)
├── Auto-create Chifa invoice on sale
└── Link sale to invoice for traceability
```

### 7.2 Data Flow
```
POS Sale (pos_sales)
    ↓
Chifa Invoice (chifa_invoices) - auto-created if insurance sale
    ↓
Bordereau (chifa_bordereaux) - grouped for submission
    ↓
Accounting Journal Entry (journal_entries) - auto-posted
```

---

## 8. Implementation Phases

### Phase 1: Data Model
- [ ] Create chifa_invoices table
- [ ] Create chifa_invoice_items table
- [ ] Create chifa_bordereaux table
- [ ] Create chifa_rejections table
- [ ] Create chronic_disease_codes table
- [ ] RLS policies

### Phase 2: POS Enhancement
- [ ] Add insurance type to POS
- [ ] Add Chifa card data fields
- [ ] Per-item reimbursement calculation
- [ ] Split payment display
- [ ] Auto-create Chifa invoice

### Phase 3: Bordereau Management
- [ ] Bordereau CRUD APIs
- [ ] Add invoices to bordereau
- [ ] Finalize/submit workflow
- [ ] Payment recording

### Phase 4: Rejection Handling
- [ ] Rejection CRUD
- [ ] Correction workflow
- [ ] Resubmission tracking

### Phase 5: Accounting Integration
- [ ] Auto-journal entries for Chifa sales
- [ ] Receivables tracking (411 Clients)
- [ ] Payment reconciliation
- [ ] Write-off entries

### Phase 6: Reports
- [ ] Chifa dashboard
- [ ] Bordereau reports
- [ ] Rejection analytics
- [ ] Cash flow forecast
