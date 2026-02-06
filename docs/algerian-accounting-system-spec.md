# Algerian Accounting System - Complete Specification

> **Research compiled from official sources: DGI, CNRC, Loi 07-11 (SCF), Décret 05-468, Lois de Finances 2024-2025**

## 1. Legal Framework

### 1.1 Système Comptable Financier (SCF)
- **Law**: Loi 07-11 du 25 novembre 2007
- **Effective**: January 1, 2010
- **Basis**: Hybrid system (IFRS framework + French-style chart of accounts)
- **Principles**: Double-entry, accrual accounting, historical cost, prudence

### 1.2 Key Principles (Article 6, Loi 07-11)
1. Entity convention
2. Going concern (continuité d'exploitation)
3. Accrual basis (comptabilité d'engagement)
4. Period independence (indépendance des exercices)
5. Consistency (permanence des méthodes)
6. Substance over form
7. True and fair view (image fidèle)
8. Historical cost
9. Prudence

---

## 2. Chart of Accounts (Plan Comptable SCF)

### 2.1 Account Classes

| Class | Name (FR) | Name (EN) | Description |
|-------|-----------|-----------|-------------|
| **1** | Capitaux | Equity | Capital, reserves, retained earnings |
| **2** | Immobilisations | Fixed Assets | Tangible, intangible, financial assets |
| **3** | Stocks | Inventory | Raw materials, goods, WIP |
| **4** | Tiers | Third Parties | Customers, suppliers, tax, social |
| **5** | Financiers | Financial | Cash, bank, investments |
| **6** | Charges | Expenses | Operating, financial, exceptional |
| **7** | Produits | Revenue | Sales, financial income, other |

### 2.2 Key Account Codes for Pharmacy/Retail

```
CLASS 1 - CAPITAUX
  10    Capital et réserves
    101   Capital social
    106   Réserves
    11    Report à nouveau
    12    Résultat de l'exercice

CLASS 2 - IMMOBILISATIONS
  20    Immobilisations incorporelles
  21    Immobilisations corporelles
    213   Constructions
    215   Matériel et outillage
    218   Autres immobilisations corporelles

CLASS 3 - STOCKS
  30    Stocks de marchandises
  31    Matières premières
  37    Stocks à l'extérieur
  38    Achats stockés (Médicaments)
  39    Provisions pour dépréciation des stocks

CLASS 4 - TIERS
  40    Fournisseurs et comptes rattachés
    401   Fournisseurs
    403   Fournisseurs - effets à payer
    404   Fournisseurs d'immobilisations
  41    Clients et comptes rattachés
    411   Clients
    413   Clients - effets à recevoir
    416   Clients douteux
  42    Personnel et comptes rattachés
    421   Personnel - rémunérations dues
    425   Personnel - avances et acomptes
  43    Organismes sociaux
    431   CNAS (Sécurité sociale)
    432   Autres organismes sociaux
  44    État et collectivités publiques
    441   État - subventions à recevoir
    442   État - impôts et taxes recouvrables
    443   Opérations particulières avec l'État
    4452  État - TVA récupérable sur immobilisations
    4456  État - TVA déductible
    4457  État - TVA collectée
    4458  État - TVA à régulariser
    447   Autres impôts, taxes et versements assimilés
    448   État - charges à payer (IRG, IBS, TAP)
  45    Groupe et associés
  46    Débiteurs et créditeurs divers
  47    Comptes transitoires ou d'attente
  48    Charges/Produits constatés d'avance
  49    Provisions pour dépréciation des comptes de tiers

CLASS 5 - FINANCIERS
  51    Banques et établissements financiers
    512   Banques - comptes courants
    514   CCP (Compte Chèque Postal)
    517   Autres organismes financiers
  52    Instruments de trésorerie
  53    Caisse
    531   Caisse siège
    532   Caisse succursale
  54    Régies d'avances et accréditifs
  58    Virements internes
  59    Provisions pour dépréciation des comptes financiers

CLASS 6 - CHARGES
  60    Achats consommés
    600   Achats de marchandises
    601   Matières premières
    602   Autres approvisionnements
    603   Variation des stocks
  61    Services extérieurs
    611   Sous-traitance
    613   Locations
    614   Charges locatives
    615   Entretien et réparations
    616   Primes d'assurance
  62    Autres services extérieurs
    621   Personnel extérieur
    622   Rémunérations d'intermédiaires
    623   Publicité
    624   Transport de biens
    625   Déplacements
    626   Frais postaux et télécommunications
    627   Services bancaires
    628   Cotisations et dons
  63    Charges de personnel
    631   Rémunérations du personnel
    634   Charges sociales (CNAS)
    635   Autres charges sociales
  64    Impôts, taxes et versements assimilés
    641   Impôts et taxes directes
    642   Impôts et taxes indirectes
    645   Autres impôts et taxes
  65    Autres charges opérationnelles
  66    Charges financières
    661   Charges d'intérêts
    665   Écarts de change (pertes)
  67    Éléments extraordinaires (charges)
  68    Dotations aux amortissements et provisions
  69    Impôts sur les résultats (IBS)
    695   Impôt sur les bénéfices (IBS)
    698   Autres impôts sur les résultats

CLASS 7 - PRODUITS
  70    Ventes de marchandises et produits
    700   Ventes de marchandises
    701   Ventes de produits finis
    704   Travaux et prestations
    706   Autres produits des activités
    707   Produits annexes
    708   Réductions sur ventes (RRR accordés)
  71    Production stockée
  72    Production immobilisée
  73    Produits nets partiels sur opérations long terme
  74    Subventions d'exploitation
  75    Autres produits opérationnels
  76    Produits financiers
    761   Produits des participations
    762   Produits des autres immobilisations
    765   Écarts de change (gains)
    768   Autres produits financiers
  77    Éléments extraordinaires (produits)
  78    Reprises sur pertes de valeur et provisions
  79    Transferts de charges
```

---

## 3. Tax System

### 3.1 TVA (Value Added Tax)

| Rate | Application |
|------|-------------|
| **0%** | Exports, certain exempted goods |
| **9%** | Reduced rate: essential goods, cultural, tourism services |
| **19%** | Standard rate: all other goods and services |

**Pharmacy-specific**: Most medications are TVA 0% (exonerated as essential health products)

**Accounts**:
- 4456 TVA Déductible (on purchases)
- 4457 TVA Collectée (on sales)
- 4455 TVA à Décaisser (net payable)

### 3.2 IBS (Corporate Tax)

| Activity Type | Rate |
|---------------|------|
| Manufacturing/Production | 19% |
| Trading/Commerce | 26% |
| Reinvested profits | 10% |
| Services | 26% |

**Pharmacy**: Typically 26% (commerce) unless manufacturing

### 3.3 IRG (Income Tax - for individuals/sole proprietors)

| Annual Income (DZD) | Rate |
|---------------------|------|
| 0 - 240,000 | 0% |
| 240,001 - 480,000 | 23% |
| 480,001 - 960,000 | 27% |
| 960,001 - 1,920,000 | 30% |
| 1,920,001 - 3,840,000 | 33% |
| > 3,840,000 | 35% |

**Abatement**: 40% reduction (capped 12,000-18,000 DZD/year)

### 3.4 TAP (Professional Activity Tax)
- **ABOLISHED** as of January 1, 2024 (Loi de Finances 2024)

### 3.5 Pharmacy-Specific: Margin Rate
- **10% forfaitaire** on medication sales (since January 2023)
- Applies to medications only, not parapharmacy

---

## 4. G50 Declaration

### 4.1 What is G50?
Monthly tax declaration submitted to DGI (Direction Générale des Impôts)

### 4.2 Taxes Declared on G50
1. TVA (Collectée - Déductible = Net)
2. IRG (retenue à la source on salaries)
3. IBS (acomptes provisionnels)
4. Droits de timbre
5. Autres taxes parafiscales

### 4.3 Deadlines
- **Due**: Before the 20th of each month
- **Penalty**: 500-1,500 DZD for late filing

### 4.4 Online Filing: Jibayatic
- Portal: jibayatic.mfdgi.gov.dz
- Mandatory for DGE companies
- Available for CDI/CPI taxpayers

---

## 5. Invoice Requirements (Décret 05-468)

### 5.1 Mandatory Fields - Seller

| Field | Arabic | Required |
|-------|--------|----------|
| Business Name | الاسم التجاري | ✓ |
| Legal Form | الشكل القانوني | ✓ |
| Address | العنوان | ✓ |
| Phone/Fax/Email | الهاتف/الفاكس/البريد | ✓ |
| **NIF** (Numéro d'Identification Fiscale) | رقم التعريف الجبائي | ✓ |
| **NIS** (Numéro d'Identification Statistique) | رقم التعريف الإحصائي | ✓ |
| **RC** (Registre du Commerce) | السجل التجاري | ✓ |
| **Article d'Imposition** | المادة الضريبية | ✓ |
| Capital Social | رأس المال | ✓ (if applicable) |

### 5.2 Mandatory Fields - Invoice

| Field | Description |
|-------|-------------|
| Invoice Number | Sequential, unique, chronological |
| Invoice Date | Date of issue |
| Buyer Info | Name, address, NIF/RC (if professional) |
| Items | Description, quantity, unit price HT |
| TVA | Rate and amount per line |
| Total HT | Subtotal before tax |
| Total TVA | Tax amount |
| **Total TTC** | Grand total (in numbers AND letters) |
| Payment Terms | Mode and due date |
| Signature & Stamp | Required (except electronic) |

### 5.3 Numbering Rules
- **Sequential**: No gaps allowed
- **Chronological**: Must follow time order
- **Format**: Typically YYYY/NNNNNN or FAC-YYYY-NNNNNN
- **Retention**: 10 years minimum

---

## 6. Financial Statements (États Financiers)

### 6.1 Required Annual Statements

1. **Bilan** (Balance Sheet) - Actif & Passif
2. **Compte de Résultat** (Income Statement)
3. **Tableau des Flux de Trésorerie** (Cash Flow Statement)
4. **Tableau de Variation des Capitaux Propres**
5. **Annexes** (Notes to Financial Statements)

### 6.2 Fiscal Year
- Closes: **December 31**
- AGM: January 1 - June 30 (following year)
- CNRC Filing: Within 1 month of AGM

### 6.3 Documents to File (CNRC)
- Compte de résultat (French + Arabic)
- Tableau de l'actif (French + Arabic)
- Tableau du passif (French + Arabic)
- PV de l'AGM (signed)

---

## 7. Journals (Journaux Comptables)

### 7.1 Standard Journals

| Code | Name | Purpose |
|------|------|---------|
| VT | Journal des Ventes | Sales invoices |
| AC | Journal des Achats | Purchase invoices |
| CA | Journal de Caisse | Cash transactions |
| BQ | Journal de Banque | Bank transactions |
| OD | Journal des Opérations Diverses | Adjustments, provisions |
| SA | Journal des Salaires | Payroll entries |
| AN | Journal des À-Nouveaux | Opening balances |

### 7.2 Entry Requirements
- Date
- Account codes (debit and credit)
- Libellé (description)
- Reference document
- Amounts
- **Debit = Credit** (always balanced)

---

## 8. Integration with POS/Inventory

### 8.1 Automatic Journal Entries from POS Sale

```
When: POS Sale completed
Journal: VT (Ventes)

Entry:
  Debit  531 Caisse (or 512 Banque)     [Amount received]
  Credit 700 Ventes de marchandises      [Sale HT]
  Credit 4457 TVA Collectée              [TVA amount]

If customer on credit:
  Debit  411 Clients                     [Total TTC]
  Credit 700 Ventes de marchandises      [Sale HT]
  Credit 4457 TVA Collectée              [TVA amount]

Stock movement (perpetual inventory):
  Debit  603 Variation des stocks        [Cost of goods sold]
  Credit 30/38 Stock de marchandises     [Cost of goods sold]
```

### 8.2 Automatic Entry from Purchase/Stock Receipt

```
When: Stock received from supplier
Journal: AC (Achats)

Entry:
  Debit  600 Achats de marchandises      [Purchase HT]
  Debit  4456 TVA Déductible             [TVA amount]
  Credit 401 Fournisseurs                [Total TTC]

Stock movement:
  Debit  30/38 Stock de marchandises     [Cost]
  Credit 603 Variation des stocks        [Cost]
```

### 8.3 Automatic Entry from Cash Session Close

```
When: Cash drawer session closed
Journal: CA (Caisse)

Variance entry (if short):
  Debit  658 Charges diverses            [Shortage amount]
  Credit 531 Caisse                      [Shortage amount]

Variance entry (if over):
  Debit  531 Caisse                      [Overage amount]
  Credit 758 Produits divers             [Overage amount]
```

### 8.4 Chifa/CNAS Claims

```
When: Chifa claim created (CNAS portion of sale)
Entry:
  Debit  411 Clients (or 418 CNAS)       [Chifa amount]
  Credit 700 Ventes                      [Chifa amount]

When: CNAS payment received:
  Debit  512 Banque                      [Amount received]
  Credit 411/418 CNAS                    [Amount received]
```

---

## 9. Reports to Generate

### 9.1 Daily/Weekly
- Journal de caisse (cash register summary)
- Situation de trésorerie (cash position)
- Chiffre d'affaires journalier (daily sales)

### 9.2 Monthly
- Grand Livre (General Ledger)
- Balance Générale (Trial Balance)
- État de TVA (TVA summary for G50)
- État des créances clients
- État des dettes fournisseurs

### 9.3 Annually
- Bilan (Balance Sheet)
- Compte de Résultat (P&L)
- Tableau des Flux de Trésorerie
- États fiscaux (tax returns)
- Inventaire physique valorisé

---

## 10. Existing Software Reference (Algeria)

### 10.1 PC Compta (DLG)
Features:
- Multi-company, multi-year
- Full SCF chart of accounts
- All journal types
- Financial statements
- Analytical accounting

### 10.2 DLGCom (ERP)
Features:
- Inventory management
- Sales/Purchase management
- Stock movements
- Integration with PC Compta
- Barcode support

### 10.3 Key Takeaways for Our Implementation
1. Use SCF chart of accounts with all standard codes
2. Support all journal types
3. Auto-generate entries from POS/inventory
4. Generate G50-ready TVA summary
5. Produce legal invoices with all required fields
6. Support fiscal year closing
7. Arabic + French labels
8. Sequential document numbering

---

## 11. Implementation Phases

### Phase 1: Foundation
- [ ] Chart of accounts (full SCF)
- [ ] Fiscal years management
- [ ] Journal types
- [ ] Basic journal entry CRUD

### Phase 2: Integration
- [ ] Auto-entries from POS sales
- [ ] Auto-entries from stock receipts
- [ ] Auto-entries from cash sessions
- [ ] Customer/Supplier ledgers

### Phase 3: Invoicing
- [ ] Legal invoice generation
- [ ] All mandatory fields (NIF, NIS, RC, AI)
- [ ] Sequential numbering
- [ ] PDF generation (French + Arabic)

### Phase 4: Tax Management
- [ ] TVA tracking and summary
- [ ] G50 preparation report
- [ ] IRG withholding (payroll)
- [ ] IBS calculation

### Phase 5: Reporting
- [ ] General Ledger
- [ ] Trial Balance
- [ ] Balance Sheet
- [ ] Income Statement
- [ ] Cash Flow Statement

### Phase 6: Closing
- [ ] Period closing (monthly)
- [ ] Fiscal year closing
- [ ] Opening balance generation
- [ ] Audit trail
