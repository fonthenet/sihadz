# Inabex Software Suite - Complete Reference

> Extracted from 1456 screenshots across 48 video tutorials
> Products: Works, PharmaX, Zorg ERP, Xycomat, InaBox, LiveData, HubPharm, Arrenia, DirectWay, CloudSave

---

## 1. Works (Core ERP)

### Overview
General-purpose commercial management ERP that serves as the foundation for all Inabex products.

### Key Modules

#### 1.1 Stock Management
- **Products**: Full product catalog with codes, descriptions, categories
- **Lots**: Batch/lot tracking with expiry dates
- **Stock par dépôt**: Stock by warehouse/location
- **Quotas**: Sales quotas management
- **Explorateur de stocks**: Stock browser/explorer
- **Journal - Stock commercial**: Commercial stock journal
- **Journal - Stock Spécial**: Special stock journal
- **Journal transferts inter-dépôt**: Inter-warehouse transfer journal

#### 1.2 Inventory
- **Nouvel Inventaire**: Create new inventory count
- **Inventaire en cours**: Inventory in progress
- **Listes - Inventaires**: Inventory lists
- **Raisons Inventaires**: Inventory adjustment reasons
- **Double vérification**: Two-person verification option
- **Xycomat mobile integration**: Android barcode scanning

#### 1.3 Inventory Configuration
```
Paramètres:
- Entrées: AL00001 - Entrée Inventaire
- Sorties: AL00002 - Sortie Inventaire
- Catégorie: INVENTAIRE
- État: En Cours

PMP Options:
- Saisir le PMP pendant l'Inventaire
- Valoriser les pièces générées: PMP

Search Options:
- Code Produit
- Code Lot
- Code Lot puis Code Produit
```

#### 1.4 Sales & Clients
- **Clients**: Client/customer management
- **Groupes - Clients**: Client groups
- **Journal - Ventes**: Sales journal
- **Journal - Divers Ventes**: Miscellaneous sales
- **Journal - Commandes Clients**: Customer order journal
- **Journal - Proforma Client**: Proforma invoice journal
- **Journal - Demandes Facture**: Invoice request journal
- **Situation globale des clients**: Global client situation

#### 1.5 Treasury (Trésorerie)
- **Recettes / Dépenses**: Income / Expenses
- **Chéquiers**: Checkbooks
- **Chèques**: Cheques
- **Remise en banque**: Bank deposits

#### 1.6 Document Management (Gestion des pièces)
- **Envoi de facture par Internet**: Email invoices
- **Réclamations**: Claims/Complaints
- **Workflows**: Document workflows
- **Transformation des pièces**: Document transformation (e.g., Order → Invoice)
- **La Corbeille**: Trash/Recycle bin with full audit trail

### Pricing Structure
```
Price Tiers (Prix de vente HT):
- Néant [0%]: Base price
- Gros [0%]: Wholesale
- Revendeur [X%]: Reseller
- Public [25%]: Retail
- Particulier [X%]: Individual
- Spécial [X%]: Special
- Promo [X%]: Promotional

Each shows: Prix HT → Prix TTC with margin %
```

### Price History Tracking
```
Historique des prix:
- Tarif (price tier)
- Ancien Prix (old price)
- Modifié le (modified date/time)
- Modifié par (modified by user)
```

### PMP (Prix Moyen Pondéré)
- Weighted Average Cost tracking
- Updated with each purchase
- Used for inventory valuation
- Error handling for product matching

---

## 2. PharmaX (Pharmacy Management)

### Overview
Specialized version of Works for pharmacies with Chifa/CNAS integration.

### Key Features

#### 2.1 Chifa Integration
See separate Chifa specification document.

Key fields:
- Produit Chifa, Lot, Exp, Qté, P.Vente
- Sous Total, Durée, Tarif Réf., N°Enregistrement
- Montant Assuré, Montant Officine, Montant Total
- Majoration 20% for local products

#### 2.2 Pharmaceutical Specific
- **Déblocage automatique des lots**: Automatic batch release
- **Equivalences**: Drug equivalence mapping
- **Gestion de Quota**: Quota management for controlled substances
- **Psychotropic drug alerts**: Special controls for psychotropics

#### 2.3 Product Tabs
```
Product Dialog Tabs:
- Général
- Informations
- Promotion/Quantités
- Lots
- Equivalences (pharmacy-specific)
- Colisage
- Comptes Comptables
- Note
```

---

## 3. Zorg (Commercial ERP)

### Overview
Full-featured commercial ERP with advanced analytics.

### Key Features

#### 3.1 Statistics & Analytics
- **Journaux**: Accounting journals
- **Fiches analytiques tiers et produits**: Third-party and product analytics
- **Statistiques, tableau de bord**: Statistics dashboard
- **Analyse croisée dynamique avec graphiques**: Dynamic cross-analysis with charts

#### 3.2 Analysis Views
```
Analyse des ventes:
- PM. Stock (stock-based)
- Facturation (invoice-based)

Pivot Table:
- Rows: Clients (PH ADEL CHAMPS, PH AOUI DALILA, etc.)
- Columns: Products (AFAF, AICHA, AMEL, AMBR, etc.)
- Values: Quantities/Amounts
```

#### 3.3 Grids
- Multi-function data grids
- Column adjustments
- Horizontal/Vertical separators
- Export to Excel

---

## 4. Xycomat (Mobile Solutions)

### Overview
Mobile app suite for field operations.

### Products

#### 4.1 Xycomat Commande (Order Taking)
- Work in **connected** or **disconnected** mode
- Sync with Works server
- Product selection with images
- Client list with balances

```
Order States:
- EN ATTENTE (pending)
- À ENVOYER (to send)
- ENVOYÉE (sent)

Menu:
- Accueil
- Gestion des Commandes
- Liste des Clients
- Liste des Transactions
- Paramètres
- Informations
- Déconnexion
```

#### 4.2 Xycomat ControlSortie (Exit Control)
- Delivery verification
- Integration with Works
- Barcode scanning

#### 4.3 Xycomat Inventaire (Inventory)
- Real-time inventory counting
- Android terminal with barcode
- Roles: Inventorier, Verificateur
- Multiple depots support
- Sync with Works

```
Features:
- Vérification permanente du stock sans attendre la fin de l'année
- (Permanent stock verification without waiting for year-end)
```

---

## 5. InaBox (Revenue Monitoring)

### Overview
Mobile app for monitoring pharmacy/business revenue.

### Features

#### 5.1 Mobile Dashboard
```
Key Metrics:
- Montant côture: Closing amount (actual cash)
- Écart: Variance (0.8%)
- Caisse théorique: Theoretical cash

Payment Categories (Pie Chart):
- Vente Payée
- Avance Crédit
- Règlement
- Alimentation Caisse
```

#### 5.2 Web Dashboard
```
Tabs:
- Accueil
- Journal
- Recherche
- Synchronisations
- Abonnements

Variables:
- Caisse de clôture
- Caisse théorique
- Écart
- Marge
- Chiffre d'affaire
- Panier moyen
- Indice de vente
- Instance
```

#### 5.3 Sessions
```
Session Info:
- Amount (22,587.74 DZD)
- Prepared by: User
- Prepared at: Date/Time
- Status: EN COURS
- Montant Préparation: Opening float
```

---

## 6. LiveData (Real-time Visibility)

### Overview
Web portal for real-time business data visibility.

### Features

#### 6.1 Views
- **Vue Simple**: Simple view
- **Vue Avance**: Advanced view
- **Administration**: Admin settings

#### 6.2 Lists
- Produits (Products)
- Clients
- Fournisseurs (Suppliers)

#### 6.3 Client Balance View
```
Columns per POS:
- POS EST (Balance, MaxBalance)
- POS OUEST (Balance, MaxBalance)
- Grand Total (Balance, MaxBalance)

Client List:
- Code, Nom, Référence, Sold (balance in DZD)
```

---

## 7. HubPharm (Pharmacy Community)

### Overview
Platform for inter-pharmacy communication and eInvoicing.

### Features

#### 7.1 eFacture (Electronic Invoicing)
- Import invoices from suppliers
- Medication mapping to internal products
- Integration with multiple ERPs

```
Supported Systems:
- ZORG
- PharmaCom
- SAP
→ Integrate into PharmaX Authentique
```

#### 7.2 Medication Mapping
```
Columns:
- Désignation
- Conditionnement (packaging)
- NumEnreg (CNAS registration)
- CodeCNAS

Filters:
- Médicaments non mappés
- Médicaments mappés
- Tous les médicaments
```

---

## 8. DirectWay (Distribution Sales)

### Overview
Mobile solution for direct distribution sales.

### Key Concepts
- Field sales with supervisor coordination
- Van/truck sales operations
- Real-time stock visibility

---

## 9. Arrenia (Real-time Browser View)

### Overview
Web-based real-time stock and balance visibility.

### Features
- "Visibilité nulle des associées" problem solving
- Browser-based access
- Real-time data from Works

---

## 10. CloudSave (Cloud Backup)

### Overview
Cloud backup service for Works databases.

### Features
- Automatic cloud backup
- Console visualization
- Download and restore
- Local backup viewing

---

## 11. Document Workflow System

### States
```
State Configuration:
- Code: Numeric code (e.g., 007)
- État: State name (Contrôlée, Validée, En cours, Soldé)
- Couleur: Color coding
- Verrouiller la pièce associée: Lock document

User Permissions:
- Per-user access control
- Cocher tout / Décocher tout

Transitions:
- Contrôlée → Validée
```

### Transaction States
```
- Non défini (undefined)
- Annulé (cancelled)
- Chez nous (with us)
- En Circulation (in circulation)
- Impayé (unpaid)
- Payé (paid)
```

---

## 12. Fiscal Year Transition

### Passage d'exercice
```
Steps:
1. Prerequisites check
2. Balance calculation options:
   - Calculer selon: Mouvement de stock
   - Méthode: Transaction unique ou détaillée
   - Date transaction: Début d'exercice
   - Libellé: "Solde au 01/01/YYYY"
3. Lock generated transactions
4. Set default state and mode
5. Assign accounting accounts
```

---

## 13. Invoice Structure

### Header
- Référence (Invoice number)
- Client name and info
- Date, Date échéance

### Lines
```
Columns:
- Désignation
- N°Lot
- Date Exp.
- Quantité
- PU HT
- Ristourne (discount)
- TVA%
- Montant HT
- Total TVA
- Montant TTC
```

### Totals
```
- Montant HT
- Remise (discount)
- Montant Net HT
- TVA
- Timbre (stamp duty)
- Mode & Timbre
- Net à payer
```

---

## 14. Applicable Business Types

| Software | Business Type |
|----------|---------------|
| Works | General retail, wholesale, distribution |
| PharmaX | Pharmacies |
| Zorg | Commercial enterprises |
| Xycomat | Field sales, delivery, distribution |
| InaBox | Any business (revenue monitoring) |
| LiveData | Multi-branch businesses |
| HubPharm | Pharmacy networks |
| DirectWay | FMCG distribution |
| Arrenia | Partnerships, shareholders |

---

## 15. Platform Integration Ideas

Based on this research, features to consider for platform businesses:

### For Pharmacies
- Full Chifa/CNAS integration (see separate spec)
- Drug equivalences
- Psychotropic controls
- Batch/expiry management

### For Laboratories
- Sample tracking with batch numbers
- Result workflows (states)
- Equipment calibration tracking

### For Clinics
- Appointment-based revenue tracking
- Service inventory (consumables)
- Insurance claims (similar to Chifa)

### For Retail/General
- POS with barcode
- Multi-warehouse
- Customer credit tracking
- Supplier management

### For Distribution
- Mobile order taking (Xycomat-style)
- Route management
- Delivery verification
- Real-time stock visibility

### Universal Features
- Treasury/Cash management
- TVA/Tax tracking
- Price history/audit trail
- Document workflows
- Multi-user permissions
- Cloud backup
- Mobile dashboards
