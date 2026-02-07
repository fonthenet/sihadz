/**
 * SOP (Standard Operating Procedure) data types and initial content.
 * Replace or extend sections here with your full SOP content.
 */

export interface SopSubsection {
  id: string
  title: string
  content: string
  table?: {
    headers: string[]
    rows: string[][]
  }
}

export interface SopSection {
  id: string
  title: string
  icon: string
  collapsed: boolean
  subsections: SopSubsection[]
}

export interface SopData {
  title: string
  subtitle: string
  version: string
  lastUpdated: string
  sections: SopSection[]
}

export const initialSopData: SopData = {
  title: 'Multi-Service Health Platform',
  subtitle: 'Standard Operating Procedure - Algeria',
  version: '6.1',
  lastUpdated: new Date().toISOString().split('T')[0],
  sections: [
    {
      id: '1',
      title: 'Executive Summary',
      icon: 'FileText',
      collapsed: true,
      subsections: [
        {
          id: '1.1',
          title: 'Platform Vision',
          content:
            'The Multi-Service Health Platform is a comprehensive healthcare ecosystem designed for the Algerian market, connecting patients with healthcare providers across multiple service categories: medical consultations, clinical procedures, laboratory services, and pharmacy fulfillment.\n\nThe platform operates on a Ticket-Centric Architecture where every healthcare interaction is encapsulated within a single, traceable ticket that maintains complete audit trails, privacy-scoped communications, and integrated order management.\n\nOur goal: Replace fragmented paper-based systems with a unified digital healthcare experience.',
        },
        {
          id: '1.2',
          title: 'Core Design Principles',
          content:
            '• Privacy-First: Minimum necessary access model with explicit data sharing grants\n• Ticket-Centric: Every healthcare interaction is a trackable, auditable ticket\n• Scoped Communication: Thread isolation prevents information leakage\n• Event-Sourced: Complete audit trail for compliance and debugging\n• Role-Based Access Control (RBAC): Granular permissions by role\n• Deposit-Based Revenue: Platform fees collected upfront\n• Reschedule-First: Encourage rescheduling over cancellation\n• Offline-Ready: Graceful degradation for poor connectivity\n• Algeria-Localized: French/Arabic, local payment methods, CNAS-ready',
        },
        {
          id: '1.3',
          title: 'Revenue Model',
          content:
            '1. BOOKING DEPOSITS: 300-500 DZD per appointment (platform fee)\n2. PATIENT MEMBERSHIPS: Family+ (500/mo), Premium (1,500/mo)\n3. PROVIDER SUBSCRIPTIONS: Pro (3,000/mo), Clinic (8,000/mo), Enterprise (custom)\n4. PREMIUM ADD-ONS: E-Visit, Delivery, Home Collection, Priority Listing\n5. PHARMACY SaaS: Full inventory management system subscription\n6. TRANSACTION FEES: Optional payment processing fees',
        },
      ],
    },
    {
      id: '2',
      title: 'Provider Categories & Onboarding',
      icon: 'Building2',
      collapsed: true,
      subsections: [
        {
          id: '2.1',
          title: 'Doctor Specialties',
          content:
            'Doctors are categorized by specialty during onboarding. Each specialty unlocks relevant templates, coding suggestions, and learning materials.',
          table: {
            headers: ['Category', 'Specialties', 'Special Features'],
            rows: [
              ['Primary Care', 'General Medicine, Family Medicine, Internal Medicine', 'Full prescription templates, referral tools'],
              ['Pediatrics', 'General Pediatrics, Neonatology', 'Growth charts, vaccination schedules, child dosing'],
              ['Women\'s Health', 'Gynecology, Obstetrics, Reproductive Medicine', 'Pregnancy tracking, prenatal templates'],
              ['Surgery', 'General Surgery, Orthopedics, Neurosurgery, Cardiac Surgery, Plastic Surgery', 'Pre-op checklists, post-op follow-up templates'],
            ],
          },
        },
        {
          id: '2.2',
          title: 'Onboarding Flow — Doctors',
          content:
            'STEP 1: Registration — Name, phone, email, specialty selection, years of experience\n\nSTEP 2: Verification — Medical license upload, National ID, specialty certification, practice address\n\nSTEP 3: Profile Setup — Professional photo, bio (French + Arabic), languages, consultation types and fees\n\nSTEP 4: Availability Setup — Working days/hours, appointment duration, buffer time\n\nSTEP 5: Admin Review — License verification, approval or request for more info\n\nSTEP 6: Welcome & Training — Platform tutorial, specialty-specific learning resources',
        },
      ],
    },
    // SECTION 9: PHARMACY INVENTORY & POS
    {
      id: '9',
      title: 'Pharmacy Inventory & POS',
      icon: 'Package',
      collapsed: true,
      subsections: [
        {
          id: '9.1',
          title: 'Product Management',
          content:
            'PRODUCT CATALOG:\n• Unique product per pharmacy (not shared catalog)\n• Barcode scanning (EAN-13, Code 128)\n• DCI code linking for generic equivalents\n• Multi-language names (French primary, Arabic secondary)\n• CNAS/Chifa eligibility tracking per product\n\nPRODUCT ATTRIBUTES:\n• Name, generic name, DCI code, manufacturer\n• Form (tablet, capsule, syrup, injection, cream, etc.)\n• Dosage, packaging (box of 20, bottle 100ml, etc.)\n• Storage conditions (room temp, refrigerated, frozen)\n• Controlled substance flag + Tableau classification\n\nPRICING:\n• Purchase price (from supplier)\n• Selling price (to customer)\n• Margin calculation (auto or manual)\n• CNAS tarif de référence (reference price for reimbursement)\n• Reimbursement rate (0%, 80%, 100%)',
        },
        {
          id: '9.2',
          title: 'Stock Tracking',
          content:
            'BATCH/LOT MANAGEMENT:\n• Each stock entry has batch number and expiry date\n• Multiple batches per product (FEFO - First Expiry First Out)\n• Reserved quantity for pending prescriptions\n• Location tracking (shelf, drawer, refrigerator)\n\nSTOCK LEVELS:\n• Current quantity = On-hand - Reserved\n• Min stock level (reorder point)\n• Reorder quantity (suggested order amount)\n• Safety stock for critical medications\n\nALERTS:\n• Low stock: quantity < min_stock_level\n• Expiring soon: 30, 60, 90 day warnings\n• Expired: auto-flag, prevent sale\n• Stock discrepancy: count vs system mismatch',
          table: {
            headers: ['Alert Type', 'Trigger', 'Action'],
            rows: [
              ['Low Stock', 'qty < min_level', 'Notification + reorder suggestion'],
              ['Expiring 30d', 'expiry < today + 30', 'Yellow warning, prioritize sale'],
              ['Expiring 7d', 'expiry < today + 7', 'Red warning, consider return'],
              ['Expired', 'expiry < today', 'Block sale, mark for disposal'],
              ['Discrepancy', 'count != system', 'Require adjustment with reason'],
            ],
          },
        },
        {
          id: '9.3',
          title: 'Stock Movements',
          content:
            'TRANSACTION TYPES:\n• PURCHASE: Stock received from supplier\n• SALE: Stock sold to customer (prescription or OTC)\n• ADJUSTMENT: Inventory count correction\n• RETURN_SUPPLIER: Expired/damaged returned to supplier\n• RETURN_CUSTOMER: Customer return (rare, requires approval)\n• EXPIRED: Marked as expired, removed from sellable stock\n• TRANSFER: Between locations or pharmacies\n• DAMAGE: Broken, spoiled, lost\n\nAUDIT TRAIL:\n• Every movement logged with timestamp\n• User attribution (who made the change)\n• Reason code required for adjustments\n• Before/after quantities recorded\n• Reference to source (prescription ID, PO number, etc.)\n• 7-year retention per Algerian law',
        },
        {
          id: '9.4',
          title: 'POS Operations (Algeria Focus)',
          content:
            'ALGERIA MARKET CONTEXT:\n• ~90% cash transactions\n• Heavy Chifa card usage for CNAS reimbursement\n• Tiers-payant: pharmacy claims directly from CNAS\n• Split payments: patient pays ticket modérateur\n\nSALE FLOW:\n1. Scan/search products or load prescription\n2. System calculates CNAS coverage per item\n3. Display total, Chifa portion, patient portion\n4. Collect cash from patient (their portion only)\n5. Generate ticket de caisse (receipt)\n6. Update stock (deduct from inventory)\n7. Queue Chifa items for CNAS claim batch\n\nPAYMENT METHODS:\n• Cash (primary) - with change calculation\n• Chifa/CNAS reimbursement (tiers-payant)\n• BaridiMob / CCP (emerging)\n• Credit (B2B institutional only)',
          table: {
            headers: ['Payment', 'When', 'Tracking'],
            rows: [
              ['Cash', 'Immediate from patient', 'Cash drawer, daily reconciliation'],
              ['Chifa', 'Claim to CNAS monthly', 'Pending claims, batch submission'],
              ['BaridiMob', 'Immediate via Chargily', 'Payment gateway records'],
              ['Credit', 'B2B invoiced', 'Accounts receivable'],
            ],
          },
        },
        {
          id: '9.5',
          title: 'Chifa/CNAS Integration',
          content:
            'REIMBURSEMENT RATES:\n• 100%: Chronic disease medications, life-saving drugs\n• 80%: Standard reimbursable medications\n• 0%: OTC, cosmetics, non-listed items\n\nTIERS-PAYANT WORKFLOW:\n1. Verify patient Chifa number and eligibility\n2. Check medication is on CNAS liste\n3. Calculate reimbursement at tarif de référence\n4. Patient pays ticket modérateur (20% or 0%)\n5. Pharmacy accumulates claims during period\n6. Submit batch to CNAS (monthly)\n7. Track claim status (submitted, processing, paid, rejected)\n8. Reconcile CNAS payments to submitted claims\n\nCLAIM BATCH:\n• Group by period (typically monthly)\n• Include: patient Chifa#, prescription#, medications, quantities, amounts\n• Submit electronically or via physical bordereaux\n• Track partial payments and rejections',
        },
        {
          id: '9.6',
          title: 'Algerian Accounting',
          content:
            'TVA (VAT) RATES:\n• 0%: Essential medications, medical devices\n• 9%: Reduced rate (some health products)\n• 19%: Standard rate (cosmetics, OTC)\n\nDOCUMENTS:\n• Ticket de caisse: Required for all retail sales\n• Facture: For B2B and upon request\n• Bon de livraison: Delivery note from supplier\n• Bordereau CNAS: Claim submission document\n\nDECLARATIONS:\n• G50: Monthly tax declaration to DGI\n• CNAS bordereaux: Monthly reimbursement claims\n• Registre des stupéfiants: Controlled substance log\n\nINVOICE NUMBERING:\n• Sequential per fiscal year: FAC-2026-00001\n• No gaps allowed (regulatory requirement)\n• Separate series for different document types',
          table: {
            headers: ['Document', 'When', 'Retention'],
            rows: [
              ['Ticket de caisse', 'Every sale', '10 years'],
              ['Facture', 'B2B / on request', '10 years'],
              ['CNAS bordereau', 'Monthly claim', '10 years'],
              ['Ordonnancier', 'Controlled substances', 'Permanent'],
              ['Inventory records', 'All movements', '7 years'],
            ],
          },
        },
        {
          id: '9.7',
          title: 'Controlled Substances',
          content:
            'TABLEAU CLASSIFICATION (Algeria):\n• Tableau A: Stupéfiants (narcotics) - strictest control\n• Tableau B: Psychotropes (psychotropics) - high control\n• Tableau C: Substances dangereuses - moderate control\n\nREQUIREMENTS:\n• Ordonnancier (special register) mandatory\n• Prescription required, verified against patient ID\n• Quantity limits per prescription\n• Cannot be delivered without original prescription\n• Stock reconciliation more frequent (weekly)\n• Separate secure storage\n\nORDONNANCIER ENTRIES:\n• Date, patient name, prescriber name\n• Medication, quantity dispensed\n• Prescription number, patient ID verified\n• Pharmacist signature\n• Running balance of controlled stock',
        },
        {
          id: '9.8',
          title: 'Prescription Anti-Fraud',
          content:
            'PROBLEM: Patients may use the same prescription at multiple pharmacies, doctor-shop, or forge prescriptions.\n\nPHARMACIES AND DOCTORS HANDLE FRAUD (not platform admin):\n• Full visibility: professionals see all flags and redemptions for shared awareness\n• Self-service: flagger can resolve/dismiss their own flags\n• Risk auto-updated when flags are created or resolved\n\nONE REDEMPTION PER PRESCRIPTION:\n• Central registry (prescription_redemptions) tracks every dispensed prescription line\n• Before dispensing: Pharmacy must verify prescription not already redeemed elsewhere\n• Platform patients: Check by prescription_id or prescription_number\n• Walk-ins: Check by prescription_number or external_prescription_ref + patient CIN/phone\n\nFLAGGING:\n• Doctors and pharmacies can flag suspicious patients (double_redemption, doctor_shopping, forged_prescription, etc.)\n• Flagged patients get risk level (low, medium, high, blocked) — auto-computed from open flags\n• Pharmacies see warning or block when checking before dispense\n• Flagger can resolve/dismiss; view patient flags and redemption history\n\nFLOWS:\n• Platform RX: Verify → Dispense → Record redemption\n• Walk-in (paper): Enter prescription ref + patient CIN/phone → Verify → Dispense → Record\n• Doctor/Pharmacy: "Report abuse" → Flag patient with type and description\n• Resolve: Flagger or admin updates status to resolved/dismissed\n\nSee docs/PRESCRIPTION-ANTI-FRAUD-DESIGN.md for full design.',
        },
        {
          id: '9.9',
          title: 'Supplier Management',
          content:
            'SUPPLIER RECORD:\n• Name, contact person, phone, email\n• Address, wilaya, commune\n• Payment terms (cash, 30 days, 60 days)\n• Product catalog from supplier\n• Performance history (delivery time, issues)\n\nPURCHASE ORDERS:\n• Create PO from low stock alerts\n• Send to supplier (email, fax, phone)\n• Track order status (sent, confirmed, shipped, received)\n• Receiving: verify quantities, check expiry dates\n• Create stock entries from received items\n• Handle discrepancies (short, damaged, wrong items)\n\nPRICING UPDATES:\n• Supplier price changes\n• Update purchase prices\n• Recalculate margins\n• Flag items with margin below threshold',
        },
        {
          id: '9.10',
          title: 'Reports & Analytics',
          content:
            'DAILY REPORTS:\n• Sales summary (cash, Chifa, total)\n• Cash drawer reconciliation\n• Low stock alerts\n• Expiring items\n\nMONTHLY REPORTS:\n• Sales by product, category, supplier\n• Profit margin analysis\n• CNAS claims summary\n• Stock valuation (FIFO)\n• TVA summary for G50\n\nINVENTORY REPORTS:\n• Current stock levels\n• Stock movement history\n• Expiry date report\n• Dead stock (no movement > 90 days)\n• ABC analysis (fast/slow movers)',
          table: {
            headers: ['Report', 'Frequency', 'Purpose'],
            rows: [
              ['Daily Sales', 'Daily', 'Cash reconciliation, performance'],
              ['CNAS Claims', 'Monthly', 'Submit to CNAS, track payments'],
              ['Stock Valuation', 'Monthly', 'Accounting, tax reporting'],
              ['Expiry Report', 'Weekly', 'Prevent losses, prioritize sales'],
              ['Margin Analysis', 'Monthly', 'Profitability, pricing decisions'],
            ],
          },
        },
      ],
    },
    // SECTION 15: SECURITY & AUDIT
    {
      id: '15',
      title: 'Security & Audit',
      icon: 'Shield',
      collapsed: true,
      subsections: [
        {
          id: '15.1',
          title: 'Data Protection Principles',
          content:
            'CORE PRINCIPLES:\n• Minimum Necessary Access: Users only see data required for their role\n• Audit Everything: All data access is logged with user, timestamp, action\n• Never Silently Fail: Errors must be surfaced, logged, and escalated\n• Defense in Depth: Multiple layers of security (RLS, API auth, UI checks)\n• Privacy by Design: Data isolation built into architecture\n\nHEALTHCARE COMPLIANCE:\n• HIPAA-aligned data handling (even though not US-based)\n• Complete audit trails for all medical data access\n• Role-based access control with granular permissions\n• Encryption at rest and in transit',
        },
        {
          id: '15.2',
          title: 'Audit Logging Requirements',
          content:
            'ALL of the following MUST be logged:\n\n• Data Access: Who accessed what record, when, why\n• Modifications: All creates, updates, deletes with before/after values\n• Access Denied: Failed access attempts (security monitoring)\n• Errors: Query failures, system errors, validation failures\n• Authentication: Login, logout, password changes, MFA events\n\nLOG RETENTION:\n• Minimum 7 years for healthcare data access logs\n• Real-time alerting for CRITICAL severity events\n• Daily integrity checks for data consistency',
          table: {
            headers: ['Severity', 'Description', 'Response'],
            rows: [
              ['INFO', 'Normal operations', 'Archive after 90 days'],
              ['WARNING', 'Unusual but not critical', 'Review daily'],
              ['ERROR', 'Operation failed', 'Investigate within 4 hours'],
              ['CRITICAL', 'Security breach or data issue', 'Immediate escalation'],
            ],
          },
        },
        {
          id: '15.3',
          title: 'Row-Level Security (RLS)',
          content:
            'Supabase RLS policies enforce access control at the database level:\n\nPRESCRIPTIONS:\n• Patient: Can read own prescriptions (patient_id = auth.uid())\n• Doctor: Can read/write prescriptions they created (doctor_id = professional.id)\n• Pharmacy: Can read prescriptions assigned to them (pharmacy_id = professional.id)\n\nAPPOINTMENTS:\n• Patient: Can read/update own appointments\n• Doctor: Can read/update appointments where they are the provider\n\nRULE: API routes should VERIFY access before using admin client to bypass RLS.',
        },
        {
          id: '15.4',
          title: 'Query Safety Protocol',
          content:
            'Before writing ANY database query:\n\n1. VERIFY SCHEMA: Check column names exist using information_schema\n2. HANDLE ERRORS: Never use if (!error && data) - explicitly handle errors\n3. LOG ACCESS: Use audit logging for all healthcare data\n4. VALIDATE RESULTS: Check data integrity after fetch\n5. TEST ALL ROLES: Verify visibility for patient, doctor, pharmacy, lab\n\nPROHIBITED:\n• Silent error swallowing\n• Assuming column names without verification\n• Direct database access without auth check\n• Bypassing RLS without access verification',
        },
        {
          id: '15.5',
          title: 'Error Escalation Matrix',
          content: 'How errors are handled based on severity and type.',
          table: {
            headers: ['Error Type', 'Severity', 'Action'],
            rows: [
              ['Query fails', 'ERROR', 'Log, show user message, alert on-call'],
              ['Data not visible to user', 'CRITICAL', 'Immediate investigation, log audit'],
              ['Schema mismatch', 'CRITICAL', 'Block deploy, fix immediately'],
              ['Access denied (valid user)', 'WARNING', 'Log, review RLS policies'],
              ['Access denied (attack)', 'CRITICAL', 'Block IP, alert security'],
              ['Data integrity check fails', 'CRITICAL', 'Page on-call, investigate'],
            ],
          },
        },
      ],
    },
    // SECTION 17: FAILURE/TIMEOUT/ESCALATION
    {
      id: '17',
      title: 'Failure & Timeout Handling',
      icon: 'AlertTriangle',
      collapsed: true,
      subsections: [
        {
          id: '17.1',
          title: 'Timeout Configuration',
          content: 'Default timeouts for various operations.',
          table: {
            headers: ['Operation', 'Timeout', 'Retry', 'Fallback'],
            rows: [
              ['API request', '30s', '2x with backoff', 'Show cached data if available'],
              ['Database query', '10s', '1x', 'Return error, log CRITICAL'],
              ['File upload', '60s', '1x', 'Show partial progress, resume option'],
              ['Real-time subscription', '5s reconnect', 'Infinite with backoff', 'Show offline indicator'],
              ['Payment processing', '120s', '0 (no auto-retry)', 'Manual retry button'],
            ],
          },
        },
        {
          id: '17.2',
          title: 'Graceful Degradation',
          content:
            'When services fail, the platform degrades gracefully:\n\n• Database unavailable: Show cached data, queue writes for retry\n• Auth service down: Allow read-only access to cached content\n• Payment gateway down: Show message, offer offline payment methods\n• Real-time unavailable: Fall back to polling every 30s\n• File storage down: Queue uploads, show pending indicator\n\nUSER COMMUNICATION:\n• Always show what\'s happening (loading, error, retry)\n• Never show blank screens or silent failures\n• Offer actionable next steps (retry, contact support)',
        },
        {
          id: '17.3',
          title: 'Incident Response',
          content:
            'SEVERITY LEVELS:\n• P0 (Critical): Data loss, security breach, complete outage → Immediate response\n• P1 (High): Major feature broken, data visibility issues → 1 hour response\n• P2 (Medium): Minor feature broken, performance degraded → 4 hour response\n• P3 (Low): Cosmetic issues, edge cases → Next business day\n\nRESPONSE STEPS:\n1. Detect: Automated monitoring + user reports\n2. Acknowledge: Confirm issue within SLA\n3. Investigate: Root cause analysis\n4. Mitigate: Fix or workaround\n5. Resolve: Permanent fix deployed\n6. Post-mortem: Document and prevent recurrence',
        },
      ],
    },
    // SECTION 21: PLATFORM-WIDE COMMUNICATION (v6 addition — Threads vs Chat)
    {
      id: '21',
      title: 'Platform-Wide Communication',
      icon: 'MessageSquare',
      collapsed: false,
      subsections: [
        {
          id: '21.1',
          title: 'Overview: Threads vs Chat',
          content:
            'The platform has TWO distinct communication systems:\n\nTHREADS (Scoped Medical Communication)\n• Tied to tickets/orders — Every thread belongs to a specific ticket, prescription order, or lab order\n• Private & Audited — Part of medical records, permanent, compliant\n• System-assigned participants — Only relevant parties (patient ↔ doctor ↔ pharmacy/lab)\n• Cannot be deleted — Audit trail requirement\n• No discovery — You can\'t "find" threads, they\'re created automatically with orders\n\nCHAT (General Platform Communication)\n• Standalone conversations — Not tied to any medical interaction\n• Discoverable — Users can find and message any available provider\n• Availability controls — Providers choose if they accept new chats\n• User-controlled — Can mute, archive, block\n• Networking — Professionals can connect with each other\n• Family/Social — Patients can chat with family members\n\nRULE: Medical questions during active care → Use THREAD. General inquiries, follow-ups after ticket closed, networking → Use CHAT.',
        },
        {
          id: '21.2',
          title: 'Chat Participants & Roles',
          content: 'Who can chat with whom.',
          table: {
            headers: ['From / To', 'Patient', 'Doctor', 'Pharmacy', 'Lab', 'Admin'],
            rows: [
              ['Patient', '✅ Family', '✅ If available', '✅ If available', '✅ If available', '✅ Support'],
              ['Doctor', '✅ If allowed', '✅ Network', '✅ Network', '✅ Network', '✅ Support'],
              ['Pharmacy', '✅ If allowed', '✅ Network', '✅ Network', '❌', '✅ Support'],
              ['Lab', '✅ If allowed', '✅ Network', '❌', '✅ Network', '✅ Support'],
              ['Admin', '✅ Support', '✅ Support', '✅ Support', '✅ Support', '✅ Internal'],
            ],
          },
        },
        {
          id: '21.3',
          title: 'Availability System',
          content:
            'Provider Chat Availability: Accept new chat requests (ON/OFF), who can start a chat (existing patients / any patient / other providers), auto-reply when unavailable, quiet hours.\n\nPatient Privacy: Who can message me (providers / family), show online status (everyone / contacts / nobody).',
          table: {
            headers: ['State', 'Icon', 'Meaning'],
            rows: [
              ['Available', '🟢', 'Accepting chats, online now'],
              ['Away', '🟡', 'Online but may be slow to respond'],
              ['Busy', '🔴', 'Online but in consultation'],
              ['Offline', '⚫', 'Not currently online'],
              ['Do Not Disturb', '🚫', 'No notifications'],
              ['Unavailable', '—', 'Not accepting new chats'],
            ],
          },
        },
        {
          id: '21.4',
          title: 'Chat Features',
          content: 'Core: Text messages, read receipts, typing indicator, online status, file attachments (10MB), unread count, search, notifications. Extended: Reply, edit/delete, reactions, pin, mute, archive, block.',
          table: {
            headers: ['Feature', 'Description'],
            rows: [
              ['Text messages', 'Plain text with emoji support'],
              ['Read receipts', 'Sent ✓ Delivered ✓✓ Read (blue)'],
              ['Typing indicator', "'Dr. Ahmed is typing...'"],
              ['Online status', 'Green dot for online users'],
              ['File attachments', 'Images, PDFs, documents (10MB limit)'],
              ['Unread count', 'Badge showing unread messages'],
              ['Search', 'Search within conversation'],
              ['Notifications', 'Push, email, SMS for important'],
            ],
          },
        },
        {
          id: '21.5',
          title: 'UI/UX Specifications',
          content:
            'Chat Widget: Collapsed = floating button bottom-right with unread badge. Expanded (Compact) = 400px × 600px. Expanded (Full) = max 1200px, sidebar + chat + info panel. Dashboard: In professional dashboards, chat as full panel integrated into page layout.',
        },
        {
          id: '21.6',
          title: 'Database Schema',
          content:
            'Tables: chat_user_settings (preferences, availability), chat_conversations (threads, types), chat_participants (members, roles, mute), chat_messages (content, reply_to, status), chat_attachments, chat_reactions, chat_read_receipts, chat_blocks, chat_presence.',
        },
        {
          id: '21.7',
          title: 'Real-Time Implementation',
          content:
            'Technology: Supabase Realtime. Channels: user-chats (conversation list), online-users (presence), typing:{conversationId} (typing indicators). Why Supabase: Native PostgreSQL, RLS, WebSocket, scalable.',
        },
        {
          id: '21.8',
          title: 'Integration Points',
          content:
            'With Ticket Threads: When ticket closes, offer "Continue chatting with Dr. X outside this ticket?". With Provider Profiles: "Send Message" button, response time expectation. With Notifications: New message → Push; first from new person → Email + Push; unread > 24h → Email summary.',
        },
        {
          id: '21.9',
          title: 'Moderation & Safety',
          content:
            'Auto: Spam detection, link filtering, report system. Provider protections: Rate limit (max 10 new chats/day from unknown), cool-off after block, harassment escalation. Patient: Verified providers only, no unsolicited marketing, easy block.',
        },
        {
          id: '21.10',
          title: 'Implementation Phases',
          content:
            'Phase 1 (MVP): Direct 1-to-1, availability toggle, text + images, read receipts, online status, typing, notifications. Phase 2: Full availability, reply/edit/delete, reactions, file attachments, search. Phase 3: Group chats, voice messages, pin, admin moderation.',
          table: {
            headers: ['Breakpoint', 'Layout'],
            rows: [
              ['< 640px (mobile)', 'Full-screen chat, no sidebars, bottom nav'],
              ['640-1024px (tablet)', 'Collapsible sidebar, compact mode'],
              ['> 1024px (desktop)', 'Full layout with all panels'],
            ],
          },
        },
        {
          id: '21.11',
          title: 'Reference Implementation',
          content:
            'Complete implementation: types/chat-types.ts, contexts/chat-context.tsx, hooks/use-chat.ts, components (chat-widget, message-list, message-composer, thread-list, etc.), SQL migrations (RLS, tables, find_or_create_direct_thread). See codebase for full code.',
        },
      ],
    },
    // SECTION 22: OFFLINE OPERATIONS & BACKUP
    {
      id: '22',
      title: 'Offline Operations & Backup',
      icon: 'CloudOff',
      collapsed: true,
      subsections: [
        {
          id: '22.1',
          title: 'Algeria Infrastructure Context',
          content:
            'The platform must handle Algeria\'s infrastructure challenges:\n\n• Internet outages (ISP): Common, can last hours to days\n• Power cuts (Sonelgaz): Frequent during summer/winter peaks\n• Mobile network congestion: Daily during peak hours\n• Rural connectivity: Often limited to 2G/3G\n\nDESIGN PRINCIPLE: Server-first with offline fallback. All critical operations must work offline, syncing when connectivity returns.',
          table: {
            headers: ['Challenge', 'Frequency', 'Mitigation'],
            rows: [
              ['Internet outage', 'Common', 'Local cache, offline mode, sync queue'],
              ['Power cut', 'Frequent', 'UPS, auto-save, graceful shutdown'],
              ['Slow connection', 'Daily peaks', 'Progressive loading, compression'],
              ['Rural 2G/3G', 'Constant', 'Lightweight payloads, offline-first'],
            ],
          },
        },
        {
          id: '22.2',
          title: 'Offline Capability Tiers',
          content:
            'Different user types have different offline capabilities:\n\nTIER 1 - FULL OFFLINE (Pharmacy POS):\n• Complete sales processing\n• Inventory management\n• CNAS claim queuing\n• Receipt printing\n\nTIER 2 - READ + QUEUE (Doctor/Lab):\n• View appointments\n• Read patient records\n• Create orders (queue for sync)\n\nTIER 3 - CACHED VIEW (Patient):\n• View past records\n• Cached provider info\n• Appointment reminders',
        },
        {
          id: '22.3',
          title: 'Encrypted Backup System',
          content:
            'All backups are encrypted with AES-256-GCM before storage.\n\nSECURITY:\n• Platform master key (BACKUP_MASTER_KEY env var)\n• Unique IV per backup\n• GCM authentication tag for integrity\n• SHA-256 checksum verification\n• Backup files are useless without platform key\n\nSTORAGE HIERARCHY:\n1. Server (Primary) - Supabase Storage bucket\n2. Device (Mobile) - Local filesystem via Capacitor\n3. Google Drive (Optional) - User\'s cloud for redundancy\n4. iCloud (iOS Optional) - Apple cloud backup',
          table: {
            headers: ['Storage', 'Type', 'When'],
            rows: [
              ['Supabase Storage', 'Primary', 'Always - every backup'],
              ['Device Local', 'Mobile Primary', 'Always on mobile'],
              ['Local PC/Network', 'Optional', 'User selects folder (Chrome/Edge)'],
              ['Google Drive', 'Optional', 'User connects account'],
              ['iCloud', 'iOS Optional', 'User enables in settings'],
            ],
          },
        },
        {
          id: '22.4',
          title: 'Backup Data Contents',
          content:
            'FULL BACKUP includes:\n• Professional profile & settings\n• Employee records\n• Appointments (last 1000)\n• Prescriptions & lab requests\n• Medical records\n\nPHARMACY BACKUP adds:\n• Product catalog\n• Stock levels & movements\n• POS sales & sessions\n• CNAS/Chifa invoices & claims\n• Accounting entries\n• Supplier & purchase orders\n\nPATIENT BACKUP:\n• Profile & preferences\n• Appointment history\n• Prescriptions received\n• Lab results\n• Payment history',
        },
        {
          id: '22.5',
          title: 'Backup File Format',
          content:
            'Encrypted backup files use .dzdbackup extension:\n\n{\n  "version": "1.0",\n  "platform": "dzd-healthcare",\n  "created_at": "2026-01-29T10:30:00Z",\n  "backup_type": "full|pharmacy|professional|patient",\n  "entity_id": "uuid",\n  "iv": "base64-16-bytes",\n  "auth_tag": "base64-16-bytes",\n  "checksum": "sha256-of-plaintext",\n  "encrypted_data": "base64-ciphertext"\n}\n\nOnly the platform with BACKUP_MASTER_KEY can decrypt these files.',
        },
        {
          id: '22.6',
          title: 'Backup Schedule & Retention',
          content:
            'SCHEDULE OPTIONS:\n• Daily at 2:00 AM (default)\n• Daily at 3:00 AM\n• Weekly on Sunday\n• Weekly on Monday\n• Monthly on 1st\n\nRETENTION POLICY:\n• Default: 30 days\n• Minimum 3 backups always kept\n• Pinned backups never auto-delete\n• Expired backups cleaned up automatically\n\nMOBILE RETENTION:\n• Default: 7 backups on device\n• Max storage: 500 MB\n• Oldest deleted when limit reached',
        },
        {
          id: '22.7',
          title: 'Google Drive Integration',
          content:
            'OPTIONAL feature for offsite redundancy.\n\nSETUP:\n1. User clicks "Connect Google Drive" in settings\n2. OAuth2 flow opens Google consent screen\n3. Tokens encrypted and stored in database\n4. Backup folder created in user\'s Drive\n\nSYNC OPTIONS:\n• Auto-sync: Automatically copy new backups to Drive\n• Manual sync: User selects which backups to sync\n• WiFi-only: Only sync when on WiFi (mobile)\n\nFALLBACK:\n• If server backup lost, can restore from Google Drive\n• Google Drive is secondary, never primary',
        },
        {
          id: '22.8',
          title: 'Local PC / Network Drive',
          content:
            'OPTIONAL feature for local backup control.\n\nOVERVIEW:\n• Uses File System Access API (Chrome/Edge)\n• User selects a folder on local PC or network drive\n• Backups auto-save to that folder when created\n• Works with mapped network drives (Z:\\Backups, etc.)\n\nSETUP:\n1. User clicks "Select Folder" in backup settings\n2. Browser prompts folder picker\n3. User grants read/write permission\n4. Folder handle stored in IndexedDB for persistence\n\nAUTO-SAVE:\n• When backup is created, encrypted file auto-saves locally\n• Both server AND local copy created simultaneously\n• Local files can be manually managed or backed up further\n\nBROWSER SUPPORT:\n• Chrome/Edge: Full support\n• Firefox/Safari: Manual download only (no folder access)\n\nNETWORK DRIVES:\n• Select mapped drive letter (Z:\\, N:\\, etc.)\n• Or navigate to network path via file picker\n• Great for NAS or shared server backups',
        },
        {
          id: '22.9',
          title: 'Mobile Backup Flow',
          content:
            'On mobile (Capacitor app):\n\n1. BACKUP CREATION:\n   - Export data from local SQLite\n   - Encrypt with platform key\n   - Save to device storage (always)\n   - Add to sync queue\n\n2. BACKGROUND SYNC:\n   - Check connectivity status\n   - If online + WiFi (if setting enabled)\n   - Upload pending backups to server\n   - Mark as synced\n\n3. NETWORK LISTENER:\n   - Monitor connectivity changes\n   - Auto-trigger sync when online\n   - Exponential backoff on failures',
        },
        {
          id: '22.10',
          title: 'Restore Procedures',
          content:
            'RESTORE FLOW (Admin supervised):\n\n1. Select backup from list\n2. Dry run first (preview what will restore)\n3. Decrypt and verify checksum\n4. Import data with conflict resolution\n5. Audit log all restored records\n\nCONFLICT RESOLUTION:\n• Server data wins for conflicts\n• Merge strategy for non-conflicting\n• All decisions logged for audit\n\nACCESS CONTROL:\n• Users can download their own backups\n• Full restore requires admin privileges\n• All restore actions logged',
        },
        {
          id: '22.11',
          title: 'Power Outage Protocol',
          content:
            'PREVENTION:\n• UPS recommended for POS terminals (30 min)\n• Network equipment UPS (15 min)\n• Mobile devices always have battery\n\nIMMEDIATE (0-5 min):\n• Auto-save current state to IndexedDB/SQLite\n• Queue pending transactions\n\nSHORT OUTAGE (5-30 min):\n• Continue on UPS\n• Queue all operations for sync\n\nEXTENDED (30+ min):\n• Graceful shutdown sequence\n• Print offline receipt book number\n• Save state for recovery\n\nRECOVERY:\n• Auto-sync queued operations\n• Verify data integrity\n• Resume normal operations',
        },
        {
          id: '22.12',
          title: 'Implementation Reference',
          content:
            'KEY FILES:\n\nLib:\n• lib/backup/types.ts - TypeScript interfaces\n• lib/backup/encryption.ts - AES-256-GCM\n• lib/backup/storage.ts - Supabase Storage\n• lib/backup/exporter.ts - Data export\n• lib/backup/google-drive.ts - Google API\n• lib/backup/scheduler.ts - Job queue\n• lib/backup/mobile-storage.ts - Capacitor FS\n• lib/backup/mobile-sync.ts - Background sync\n• lib/backup/local-pc-storage.ts - File System Access API\n\nAPI Routes:\n• /api/backup/create - Create backup\n• /api/backup/list - List backups\n• /api/backup/[id] - Get/Delete\n• /api/backup/settings - Config\n• /api/backup/restore - Admin restore\n• /api/backup/connect-google - OAuth\n• /api/backup/sync-google/[id] - Sync\n\nUI Components:\n• components/backup/backup-settings.tsx\n• components/backup/backup-history.tsx\n• components/backup/mobile-backup-settings.tsx\n• components/backup/local-pc-backup.tsx\n\nDatabase:\n• scripts/078-backup-system-tables.sql',
        },
      ],
    },
  ],
}
