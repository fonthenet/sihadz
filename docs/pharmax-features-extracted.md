# Features Extracted from PharmaX/Inabex Screenshots

> Research from 1456 screenshots across 48 video tutorials

## 1. Chifa Integration (PharmaX Connect)

### POS Screen Columns
- **Produit Chifa** - Chifa product code/name
- **Lot** - Batch number
- **Exp** - Expiry date
- **Qté** - Quantity
- **P.Vente** - Sale price
- **Sous Total** - Line subtotal
- **Durée** - Duration (treatment days, typically 10)
- **Tarif Réf.** - Reference tariff (CNAS reimbursement price)
- **N°Enregistrement** - CNAS registration number

### Chifa Invoice Fields
- **Montant Assuré** - Amount covered by insurance (patient portion)
- **Montant Officine** - Amount for pharmacy (what pharmacy claims)
- **Montant Total** - Total amount
- **Majoration 20%** - 20% markup for local products

### Action Buttons
- **Signer** - Sign the Chifa invoice
- **Lister l'Historique** - List consumption history
- **Lire la Carte** - Read Chifa card
- **Historique Consommation** - Patient consumption history
- **Substitution** - Product substitution
- **Instance F12** - Pending invoices

### Client Balance
- **Situation Client** dialog
- **Solde** - Outstanding balance
- Transaction history with: Numéro, Libellé, Heure, Montant, Utilisateur

---

## 2. Cash/Treasury Management (InaBox Mobile)

### Daily Cash Summary
- **Montant côture** - Closing amount (actual cash count)
- **Écart** - Variance (difference between actual and theoretical)
- **Caisse théorique** - Theoretical cash (calculated from sales)

### Payment Categories (Pie Chart)
- **Vente Payée** - Paid sales
- **Avance Crédit** - Credit advances
- **Règlement** - Payments received
- **Alimentation Caisse** - Cash deposits (float)

### User Info
- Prepared by: [User name]
- Mobile access on smartphone and tablet

---

## 3. ERP/Accounting (Zorg)

### Menu Structure
```
Gestion commerciale
├── Ordre de transfert
├── Journal - Mouvements de stock
├── Inventaires
│   ├── Nouvel Inventaire
│   ├── Inventaire en cours
│   ├── Listes - Inventaires
│   └── Raisons Inventaires
├── Trésorerie
│   ├── Recettes / Dépenses
│   ├── Chéquiers
│   ├── Chèques
│   └── Remise en banque
└── Favoris
```

### Sales Journal (Journal - Ventes)
Columns:
- Général
- Autre ann... (annotations)
- Référence (e.g., P18/00003)
- Date
- Date échéa... (due date)
- État (Validé, Brouillon, etc.)
- Code
- Raison sociale
- Famille
- Commercial
- Affiche (display flag)

### Statistics & Analytics
- Journaux (Journals)
- Fiches analytiques tiers et produits
- Statistiques, tableau de bord
- Analyse croisée dynamique avec graphiques

### Analysis Views
- Analyse des ventes (PM. Stock)
- Analyse des ventes (Facturation)
- Client breakdown by: AFAF, AICHA, AMEL, AMBR, etc.

---

## 4. Pricing Structure

### Price Tiers (HT - before tax)
- **Gros [0%]** - Wholesale
- **Revendeur [0%]** - Reseller
- **Public [0%]** - Retail public
- **Particulier [0%]** - Individual
- **Promo [0%]** - Promotional
- **Nouveautés** - New products

### Cost Tracking
- **PPA** - Prix Public Algérie
- **PMP (HT)** - Prix Moyen Pondéré (Weighted Average Cost)
- **Prix d'achat (HT)** - Purchase price before tax

---

## 5. Invoice Structure

### Header
- Référence (Invoice number: P18/00003)
- Client name
- Date, Date échéance (due date)

### Lines
- Désignation (Product description)
- Quant... (Quantity)
- Prix Unit... (Unit price)
- Poi... (Weight?)
- Volu... (Volume?)
- Ristou... (Discount)
- TVA % (17%)
- Montant (Line total)

### Totals
- **Montant HT** - Amount before tax
- **Montant Net HT** - Net amount before tax
- **TVA** - Tax amount
- **Mode & Timbre** - Payment mode & stamp duty
- **Virement** - Bank transfer
- **Net à payer** - Total to pay

### States
- Contrôlée (Controlled)
- Validée (Validated)
- En cours (In progress)
- Soldé (Settled)

---

## 6. Document Workflow

### State Configuration
- **Code** - State code (e.g., 007)
- **État** - State name (Contrôlée, Validée)
- **Couleur** - Color coding
- **Verrouiller la pièce associée** - Lock associated document
- **État AmeniA** - External system state (En cours)

### User Permissions
- Cocher tout / Décocher tout (Select all/None)
- Per-user checkboxes: Nathanael, Karter, Celeste, Bobby, Danica

### State Transitions
Contrôlée → Validée (with validation rules)

---

## 7. eFacture (HubPharm)

### Invoice Import
- Fournisseur selection (Supplier: BIOPURE Spa - Biopure Constantine)
- Facture field (Invoice reference)
- File upload

### Medication Mapping
Columns:
- **Désignation** - Product name
- **Conditionnement** - Packaging (PELL B/10)
- **NumEnreg** - CNAS registration number (00113G2670413)
- **CodeCNAS** - CNAS code (05027, 00039)

Filters:
- Médicaments non mappés (Unmapped)
- Médicaments mappés (Mapped)
- Tous les médicaments (All)

### Mapping Workflow
1. Select medication to map
2. Choose from suggestions (same name, different packaging)
3. Confirm mapping (irreversible warning)
4. If not found: "Médicament non trouvé?" → Ajouter button

---

## 8. Inventory Management

### Inventory Types
- Nouvel Inventaire
- Inventaire en cours
- Inventaire temps réel (Real-time)
- Double vérification (Double verification)

### Mobile Inventory (Xycomat)
- Android terminal with barcode
- Roles: Inventorier, Verificateur (cateur)
- Multiple depots: Dépôt, Depot principal

### Inventory List
- Description
- Inventaire Physique
- Dépôt

---

## 9. Fiscal Year Transition

### Balance Calculation Options (Step 5/7)
- **Calculer selon**: Mouvement de stock
- **Méthode**: Générer une seule transaction représentant le solde globale
- **Date transaction**: La date début d'exercice
- **Libellé**: Solde au 01/01/2018
- **Verrouiller les transactions générées** (Lock generated transactions)

### Transaction States
- Non défini
- Annulé
- Chez nous
- En Circulation
- Impayé
- Payé

### Payment Mode
- Espèce (Cash)
- Compte associé (linked account)

---

## 10. Dashboard Tiles (Works Home)

| Tile | Description |
|------|-------------|
| Facture d'achat | Purchase invoices |
| Journal des achats | Purchase journal |
| Commande fournisse... | Supplier orders |
| Journal des com... | Order journal |
| Tableau de bord | Dashboard |

---

## 11. Key Observations for Implementation

### Must-Have Features
1. **Chifa sale with split calculation** (Assuré/Officine/Total)
2. **20% majoration for local products** (automatic)
3. **Durée (treatment days)** tracking
4. **N°Enregistrement** (CNAS registration) per product
5. **Tarif Référence** (CNAS reference price)
6. **Client balance (Solde)** display at POS
7. **Instance (pending invoices)** management
8. **Cash variance tracking** (théorique vs actual)
9. **Journal entries with workflow states**
10. **TVA calculation** (HT → TTC)
11. **PMP tracking** (weighted average cost)
12. **Medication mapping** (internal code to CNAS code)

### Nice-to-Have Features
1. Consumption history per patient
2. Mobile cash monitoring (InaBox)
3. Real-time inventory on Android
4. Cross-analysis reports
5. Document state workflows with permissions
6. Multi-tier pricing (Gros, Revendeur, Public, etc.)
