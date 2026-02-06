-- ============================================================================
-- SEED SCF CHART OF ACCOUNTS FOR PHARMACY
-- This script seeds the standard SCF accounts for a pharmacy
-- Run this AFTER creating a pharmacy professional account
-- ============================================================================

-- Function to seed chart of accounts for a pharmacy
CREATE OR REPLACE FUNCTION seed_pharmacy_chart_of_accounts(p_pharmacy_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM accounting_accounts WHERE pharmacy_id = p_pharmacy_id LIMIT 1) THEN
    RETURN;
  END IF;

  -- ============================================================================
  -- CLASS 1 - CAPITAUX (Equity)
  -- ============================================================================
  INSERT INTO accounting_accounts (pharmacy_id, code, name, name_ar, account_class, account_type, normal_balance, is_detail, is_system) VALUES
  (p_pharmacy_id, '10', 'Capital et réserves', 'رأس المال والاحتياطيات', 1, 'equity', 'credit', FALSE, TRUE),
  (p_pharmacy_id, '101', 'Capital social', 'رأس المال', 1, 'equity', 'credit', TRUE, TRUE),
  (p_pharmacy_id, '106', 'Réserves', 'الاحتياطيات', 1, 'equity', 'credit', TRUE, TRUE),
  (p_pharmacy_id, '11', 'Report à nouveau', 'الأرباح المرحلة', 1, 'equity', 'credit', TRUE, TRUE),
  (p_pharmacy_id, '12', 'Résultat de l''exercice', 'نتيجة السنة المالية', 1, 'equity', 'credit', TRUE, TRUE);

  -- ============================================================================
  -- CLASS 2 - IMMOBILISATIONS (Fixed Assets)
  -- ============================================================================
  INSERT INTO accounting_accounts (pharmacy_id, code, name, name_ar, account_class, account_type, normal_balance, is_detail, is_system) VALUES
  (p_pharmacy_id, '20', 'Immobilisations incorporelles', 'الأصول غير الملموسة', 2, 'asset', 'debit', FALSE, TRUE),
  (p_pharmacy_id, '21', 'Immobilisations corporelles', 'الأصول الملموسة', 2, 'asset', 'debit', FALSE, TRUE),
  (p_pharmacy_id, '213', 'Constructions', 'المباني', 2, 'asset', 'debit', TRUE, TRUE),
  (p_pharmacy_id, '215', 'Matériel et outillage', 'المعدات والأدوات', 2, 'asset', 'debit', TRUE, TRUE),
  (p_pharmacy_id, '218', 'Autres immobilisations corporelles', 'أصول ملموسة أخرى', 2, 'asset', 'debit', TRUE, TRUE),
  (p_pharmacy_id, '28', 'Amortissements', 'الاستهلاك', 2, 'asset', 'credit', FALSE, TRUE),
  (p_pharmacy_id, '281', 'Amort. immobilisations corporelles', 'استهلاك الأصول الملموسة', 2, 'asset', 'credit', TRUE, TRUE);

  -- ============================================================================
  -- CLASS 3 - STOCKS (Inventory)
  -- ============================================================================
  INSERT INTO accounting_accounts (pharmacy_id, code, name, name_ar, account_class, account_type, normal_balance, is_detail, is_system) VALUES
  (p_pharmacy_id, '30', 'Stocks de marchandises', 'مخزون البضائع', 3, 'asset', 'debit', FALSE, TRUE),
  (p_pharmacy_id, '300', 'Stock de médicaments', 'مخزون الأدوية', 3, 'asset', 'debit', TRUE, TRUE),
  (p_pharmacy_id, '301', 'Stock de parapharmacie', 'مخزون شبه صيدلة', 3, 'asset', 'debit', TRUE, TRUE),
  (p_pharmacy_id, '39', 'Provisions pour dépréciation stocks', 'مخصص انخفاض المخزون', 3, 'asset', 'credit', TRUE, TRUE);

  -- ============================================================================
  -- CLASS 4 - TIERS (Third Parties - Receivables/Payables)
  -- ============================================================================
  INSERT INTO accounting_accounts (pharmacy_id, code, name, name_ar, account_class, account_type, normal_balance, is_detail, account_subtype, is_system) VALUES
  -- Suppliers
  (p_pharmacy_id, '40', 'Fournisseurs et comptes rattachés', 'الموردون والحسابات المرتبطة', 4, 'liability', 'credit', FALSE, 'supplier', TRUE),
  (p_pharmacy_id, '401', 'Fournisseurs', 'الموردون', 4, 'liability', 'credit', TRUE, 'supplier', TRUE),
  (p_pharmacy_id, '403', 'Fournisseurs - effets à payer', 'الموردون - أوراق الدفع', 4, 'liability', 'credit', TRUE, 'supplier', TRUE),
  (p_pharmacy_id, '404', 'Fournisseurs d''immobilisations', 'موردو الأصول الثابتة', 4, 'liability', 'credit', TRUE, 'supplier', TRUE),
  
  -- Clients
  (p_pharmacy_id, '41', 'Clients et comptes rattachés', 'العملاء والحسابات المرتبطة', 4, 'asset', 'debit', FALSE, 'client', TRUE),
  (p_pharmacy_id, '411', 'Clients', 'العملاء', 4, 'asset', 'debit', TRUE, 'client', TRUE),
  (p_pharmacy_id, '4111', 'Clients - Comptant', 'العملاء نقدا', 4, 'asset', 'debit', TRUE, 'client', TRUE),
  (p_pharmacy_id, '4112', 'Clients - Crédit', 'العملاء - ائتمان', 4, 'asset', 'debit', TRUE, 'client', TRUE),
  (p_pharmacy_id, '4113', 'Clients - CNAS', 'العملاء - الصندوق الوطني للتأمينات الاجتماعية', 4, 'asset', 'debit', TRUE, 'cnas', TRUE),
  (p_pharmacy_id, '4114', 'Clients - CASNOS', 'العملاء - صندوق غير الأجراء', 4, 'asset', 'debit', TRUE, 'casnos', TRUE),
  (p_pharmacy_id, '4115', 'Clients - CVM', 'العملاء - الاتفاقية العسكرية', 4, 'asset', 'debit', TRUE, 'cvm', TRUE),
  (p_pharmacy_id, '416', 'Clients douteux', 'العملاء المشكوك فيهم', 4, 'asset', 'debit', TRUE, 'client', TRUE),
  
  -- Personnel
  (p_pharmacy_id, '42', 'Personnel et comptes rattachés', 'الموظفون والحسابات المرتبطة', 4, 'liability', 'credit', FALSE, NULL, TRUE),
  (p_pharmacy_id, '421', 'Personnel - rémunérations dues', 'الموظفون - الرواتب المستحقة', 4, 'liability', 'credit', TRUE, NULL, TRUE),
  (p_pharmacy_id, '425', 'Personnel - avances et acomptes', 'الموظفون - السلف والدفعات', 4, 'asset', 'debit', TRUE, NULL, TRUE),
  
  -- Social organizations
  (p_pharmacy_id, '43', 'Organismes sociaux', 'الهيئات الاجتماعية', 4, 'liability', 'credit', FALSE, NULL, TRUE),
  (p_pharmacy_id, '431', 'CNAS (Sécurité sociale)', 'الصندوق الوطني للتأمينات', 4, 'liability', 'credit', TRUE, NULL, TRUE),
  
  -- State/Tax
  (p_pharmacy_id, '44', 'État et collectivités publiques', 'الدولة والجماعات المحلية', 4, 'liability', 'credit', FALSE, NULL, TRUE),
  (p_pharmacy_id, '4452', 'TVA récupérable sur immob.', 'الرسم المسترجع على الأصول', 4, 'asset', 'debit', TRUE, NULL, TRUE),
  (p_pharmacy_id, '4456', 'TVA déductible', 'الرسم القابل للخصم', 4, 'asset', 'debit', TRUE, NULL, TRUE),
  (p_pharmacy_id, '4457', 'TVA collectée', 'الرسم المحصل', 4, 'liability', 'credit', TRUE, NULL, TRUE),
  (p_pharmacy_id, '4455', 'TVA à décaisser', 'الرسم الواجب الدفع', 4, 'liability', 'credit', TRUE, NULL, TRUE),
  (p_pharmacy_id, '447', 'Autres impôts et taxes', 'ضرائب ورسوم أخرى', 4, 'liability', 'credit', TRUE, NULL, TRUE),
  (p_pharmacy_id, '4486', 'État - IBS à payer', 'الدولة - الضريبة على الأرباح', 4, 'liability', 'credit', TRUE, NULL, TRUE),
  (p_pharmacy_id, '4487', 'État - IRG à payer', 'الدولة - ضريبة الدخل', 4, 'liability', 'credit', TRUE, NULL, TRUE),
  
  -- Other receivables/payables
  (p_pharmacy_id, '46', 'Débiteurs et créditeurs divers', 'مدينون ودائنون متنوعون', 4, 'asset', 'debit', TRUE, NULL, TRUE),
  (p_pharmacy_id, '49', 'Provisions pour dépréciation tiers', 'مخصص انخفاض حسابات الغير', 4, 'asset', 'credit', TRUE, NULL, TRUE);

  -- ============================================================================
  -- CLASS 5 - FINANCIERS (Financial - Cash & Bank)
  -- ============================================================================
  INSERT INTO accounting_accounts (pharmacy_id, code, name, name_ar, account_class, account_type, normal_balance, is_detail, account_subtype, is_system) VALUES
  (p_pharmacy_id, '51', 'Banques et établissements financiers', 'البنوك والمؤسسات المالية', 5, 'asset', 'debit', FALSE, 'bank', TRUE),
  (p_pharmacy_id, '512', 'Banque - compte courant', 'البنك - الحساب الجاري', 5, 'asset', 'debit', TRUE, 'bank', TRUE),
  (p_pharmacy_id, '514', 'CCP (Compte Chèque Postal)', 'حساب الشيك البريدي', 5, 'asset', 'debit', TRUE, 'bank', TRUE),
  (p_pharmacy_id, '517', 'Autres organismes financiers', 'مؤسسات مالية أخرى', 5, 'asset', 'debit', TRUE, 'bank', TRUE),
  (p_pharmacy_id, '53', 'Caisse', 'الصندوق', 5, 'asset', 'debit', FALSE, 'cash', TRUE),
  (p_pharmacy_id, '531', 'Caisse siège', 'صندوق المقر', 5, 'asset', 'debit', TRUE, 'cash', TRUE),
  (p_pharmacy_id, '532', 'Caisse secondaire', 'صندوق ثانوي', 5, 'asset', 'debit', TRUE, 'cash', TRUE),
  (p_pharmacy_id, '58', 'Virements internes', 'التحويلات الداخلية', 5, 'asset', 'debit', TRUE, NULL, TRUE);

  -- ============================================================================
  -- CLASS 6 - CHARGES (Expenses)
  -- ============================================================================
  INSERT INTO accounting_accounts (pharmacy_id, code, name, name_ar, account_class, account_type, normal_balance, is_detail, tva_applicable, is_system) VALUES
  -- Purchases
  (p_pharmacy_id, '60', 'Achats consommés', 'المشتريات المستهلكة', 6, 'expense', 'debit', FALSE, FALSE, TRUE),
  (p_pharmacy_id, '600', 'Achats de marchandises', 'مشتريات البضائع', 6, 'expense', 'debit', TRUE, TRUE, TRUE),
  (p_pharmacy_id, '6001', 'Achats de médicaments', 'مشتريات الأدوية', 6, 'expense', 'debit', TRUE, FALSE, TRUE),
  (p_pharmacy_id, '6002', 'Achats de parapharmacie', 'مشتريات شبه صيدلة', 6, 'expense', 'debit', TRUE, TRUE, TRUE),
  (p_pharmacy_id, '603', 'Variation des stocks', 'تغير المخزون', 6, 'expense', 'debit', TRUE, FALSE, TRUE),
  
  -- External services
  (p_pharmacy_id, '61', 'Services extérieurs', 'خدمات خارجية', 6, 'expense', 'debit', FALSE, TRUE, TRUE),
  (p_pharmacy_id, '613', 'Locations', 'الإيجارات', 6, 'expense', 'debit', TRUE, TRUE, TRUE),
  (p_pharmacy_id, '615', 'Entretien et réparations', 'الصيانة والإصلاحات', 6, 'expense', 'debit', TRUE, TRUE, TRUE),
  (p_pharmacy_id, '616', 'Primes d''assurance', 'أقساط التأمين', 6, 'expense', 'debit', TRUE, FALSE, TRUE),
  
  -- Other external services
  (p_pharmacy_id, '62', 'Autres services extérieurs', 'خدمات خارجية أخرى', 6, 'expense', 'debit', FALSE, TRUE, TRUE),
  (p_pharmacy_id, '622', 'Rémunérations d''intermédiaires', 'أتعاب الوسطاء', 6, 'expense', 'debit', TRUE, TRUE, TRUE),
  (p_pharmacy_id, '626', 'Frais postaux et télécom', 'مصاريف البريد والاتصالات', 6, 'expense', 'debit', TRUE, TRUE, TRUE),
  (p_pharmacy_id, '627', 'Services bancaires', 'خدمات بنكية', 6, 'expense', 'debit', TRUE, FALSE, TRUE),
  
  -- Personnel
  (p_pharmacy_id, '63', 'Charges de personnel', 'أعباء الموظفين', 6, 'expense', 'debit', FALSE, FALSE, TRUE),
  (p_pharmacy_id, '631', 'Rémunérations du personnel', 'رواتب الموظفين', 6, 'expense', 'debit', TRUE, FALSE, TRUE),
  (p_pharmacy_id, '634', 'Charges sociales (CNAS)', 'الأعباء الاجتماعية', 6, 'expense', 'debit', TRUE, FALSE, TRUE),
  
  -- Taxes
  (p_pharmacy_id, '64', 'Impôts, taxes et versements assimilés', 'الضرائب والرسوم', 6, 'expense', 'debit', FALSE, FALSE, TRUE),
  (p_pharmacy_id, '641', 'Impôts et taxes directes', 'الضرائب المباشرة', 6, 'expense', 'debit', TRUE, FALSE, TRUE),
  
  -- Other charges
  (p_pharmacy_id, '65', 'Autres charges opérationnelles', 'أعباء عملياتية أخرى', 6, 'expense', 'debit', TRUE, TRUE, TRUE),
  (p_pharmacy_id, '654', 'Créances irrécouvrables', 'ديون معدومة', 6, 'expense', 'debit', TRUE, FALSE, TRUE),
  
  -- Financial charges
  (p_pharmacy_id, '66', 'Charges financières', 'أعباء مالية', 6, 'expense', 'debit', FALSE, FALSE, TRUE),
  (p_pharmacy_id, '661', 'Charges d''intérêts', 'مصاريف الفوائد', 6, 'expense', 'debit', TRUE, FALSE, TRUE),
  
  -- Depreciation
  (p_pharmacy_id, '68', 'Dotations aux amortissements et provisions', 'مخصصات الاستهلاك والمؤونات', 6, 'expense', 'debit', FALSE, FALSE, TRUE),
  (p_pharmacy_id, '681', 'Dotations aux amortissements', 'مخصصات الاستهلاك', 6, 'expense', 'debit', TRUE, FALSE, TRUE),
  
  -- Tax on profits
  (p_pharmacy_id, '69', 'Impôts sur les résultats', 'الضريبة على الأرباح', 6, 'expense', 'debit', FALSE, FALSE, TRUE),
  (p_pharmacy_id, '695', 'Impôt sur les bénéfices (IBS)', 'الضريبة على أرباح الشركات', 6, 'expense', 'debit', TRUE, FALSE, TRUE);

  -- ============================================================================
  -- CLASS 7 - PRODUITS (Revenue)
  -- ============================================================================
  INSERT INTO accounting_accounts (pharmacy_id, code, name, name_ar, account_class, account_type, normal_balance, is_detail, tva_applicable, is_system) VALUES
  -- Sales
  (p_pharmacy_id, '70', 'Ventes de marchandises et produits', 'مبيعات البضائع والمنتجات', 7, 'revenue', 'credit', FALSE, FALSE, TRUE),
  (p_pharmacy_id, '700', 'Ventes de marchandises', 'مبيعات البضائع', 7, 'revenue', 'credit', TRUE, FALSE, TRUE),
  (p_pharmacy_id, '7001', 'Ventes de médicaments', 'مبيعات الأدوية', 7, 'revenue', 'credit', TRUE, FALSE, TRUE),
  (p_pharmacy_id, '7002', 'Ventes de parapharmacie', 'مبيعات شبه صيدلة', 7, 'revenue', 'credit', TRUE, TRUE, TRUE),
  (p_pharmacy_id, '708', 'Réductions sur ventes (RRR)', 'تخفيضات على المبيعات', 7, 'revenue', 'debit', TRUE, FALSE, TRUE),
  
  -- Other income
  (p_pharmacy_id, '75', 'Autres produits opérationnels', 'إيرادات عملياتية أخرى', 7, 'revenue', 'credit', TRUE, TRUE, TRUE),
  
  -- Financial income
  (p_pharmacy_id, '76', 'Produits financiers', 'إيرادات مالية', 7, 'revenue', 'credit', FALSE, FALSE, TRUE),
  (p_pharmacy_id, '761', 'Produits des participations', 'إيرادات المساهمات', 7, 'revenue', 'credit', TRUE, FALSE, TRUE),
  (p_pharmacy_id, '768', 'Autres produits financiers', 'إيرادات مالية أخرى', 7, 'revenue', 'credit', TRUE, FALSE, TRUE),
  
  -- Reversals
  (p_pharmacy_id, '78', 'Reprises sur provisions', 'استرداد المؤونات', 7, 'revenue', 'credit', TRUE, FALSE, TRUE);

  -- ============================================================================
  -- SEED DEFAULT JOURNAL TYPES
  -- ============================================================================
  INSERT INTO accounting_journal_types (pharmacy_id, code, name, name_ar, description, default_debit_account, default_credit_account, prefix, is_system) VALUES
  (p_pharmacy_id, 'VT', 'Journal des Ventes', 'دفتر المبيعات', 'Toutes les ventes et factures clients', '411', '700', 'VT', TRUE),
  (p_pharmacy_id, 'AC', 'Journal des Achats', 'دفتر المشتريات', 'Toutes les factures fournisseurs', '600', '401', 'AC', TRUE),
  (p_pharmacy_id, 'CA', 'Journal de Caisse', 'دفتر الصندوق', 'Mouvements de caisse', '531', NULL, 'CA', TRUE),
  (p_pharmacy_id, 'BQ', 'Journal de Banque', 'دفتر البنك', 'Mouvements bancaires', '512', NULL, 'BQ', TRUE),
  (p_pharmacy_id, 'OD', 'Journal des Opérations Diverses', 'دفتر العمليات المتنوعة', 'Écritures diverses, régularisations', NULL, NULL, 'OD', TRUE),
  (p_pharmacy_id, 'SA', 'Journal des Salaires', 'دفتر الرواتب', 'Écritures de paie', '631', '421', 'SA', TRUE),
  (p_pharmacy_id, 'AN', 'Journal des À-Nouveaux', 'دفتر الأرصدة الافتتاحية', 'Soldes d''ouverture', NULL, NULL, 'AN', TRUE);

  -- ============================================================================
  -- SEED DEFAULT POSTING RULES
  -- ============================================================================
  INSERT INTO accounting_posting_rules (pharmacy_id, rule_code, name, description, source_type, journal_type_code, description_template, lines_template) VALUES
  
  -- POS Cash Sale
  (p_pharmacy_id, 'pos_sale_cash', 'Vente au comptant', 'Vente payée en espèces', 'pos_sale', 'VT',
   'Vente {sale_number}',
   '[
     {"account_code": "531", "side": "debit", "field": "paid_cash", "description": "Encaissement espèces"},
     {"account_code": "7001", "side": "credit", "field": "subtotal_meds", "description": "Ventes médicaments"},
     {"account_code": "7002", "side": "credit", "field": "subtotal_para", "description": "Ventes parapharmacie"}
   ]'::JSONB),
  
  -- POS Chifa Sale
  (p_pharmacy_id, 'pos_sale_chifa', 'Vente Chifa', 'Vente avec tiers-payant CNAS', 'pos_sale', 'VT',
   'Vente Chifa {sale_number} - {customer_name}',
   '[
     {"account_code": "4113", "side": "debit", "field": "chifa_total", "description": "Créance CNAS"},
     {"account_code": "531", "side": "debit", "field": "patient_total", "description": "Part patient espèces"},
     {"account_code": "7001", "side": "credit", "field": "total_amount", "description": "Ventes médicaments"}
   ]'::JSONB),
  
  -- CNAS Payment Received
  (p_pharmacy_id, 'chifa_payment', 'Règlement CNAS', 'Paiement reçu de CNAS', 'chifa_payment', 'BQ',
   'Règlement CNAS Bordereau {bordereau_number}',
   '[
     {"account_code": "512", "side": "debit", "field": "amount_paid", "description": "Encaissement CNAS"},
     {"account_code": "4113", "side": "credit", "field": "amount_paid", "description": "Règlement créance CNAS"}
   ]'::JSONB),
  
  -- Stock Purchase
  (p_pharmacy_id, 'stock_purchase', 'Achat de marchandises', 'Réception de stock fournisseur', 'stock_receipt', 'AC',
   'Facture {reference_number} - {supplier_name}',
   '[
     {"account_code": "6001", "side": "debit", "field": "total_ht", "description": "Achats médicaments"},
     {"account_code": "4456", "side": "debit", "field": "tva_amount", "description": "TVA déductible"},
     {"account_code": "401", "side": "credit", "field": "total_ttc", "description": "Fournisseur à payer"}
   ]'::JSONB),
  
  -- Supplier Payment
  (p_pharmacy_id, 'supplier_payment', 'Règlement fournisseur', 'Paiement au fournisseur', 'supplier_payment', 'BQ',
   'Règlement {supplier_name}',
   '[
     {"account_code": "401", "side": "debit", "field": "amount", "description": "Règlement fournisseur"},
     {"account_code": "512", "side": "credit", "field": "amount", "description": "Décaissement banque"}
   ]'::JSONB),
  
  -- Chifa Rejection Write-off
  (p_pharmacy_id, 'chifa_writeoff', 'Créance CNAS irrécouvrable', 'Rejet CNAS passé en perte', 'chifa_writeoff', 'OD',
   'Rejet CNAS - {rejection_reason}',
   '[
     {"account_code": "654", "side": "debit", "field": "rejected_amount", "description": "Créance irrécouvrable"},
     {"account_code": "4113", "side": "credit", "field": "rejected_amount", "description": "Annulation créance CNAS"}
   ]'::JSONB);

  -- ============================================================================
  -- CREATE DEFAULT FISCAL YEAR
  -- ============================================================================
  INSERT INTO accounting_fiscal_years (pharmacy_id, name, code, start_date, end_date, status, is_current)
  VALUES (
    p_pharmacy_id,
    'Exercice ' || EXTRACT(YEAR FROM CURRENT_DATE),
    EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,
    DATE_TRUNC('year', CURRENT_DATE),
    DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day',
    'open',
    TRUE
  );

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER TO AUTO-SEED ON PHARMACY CREATION
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_seed_pharmacy_accounting()
RETURNS TRIGGER AS $$
BEGIN
  -- Only seed for pharmacies
  IF NEW.type = 'pharmacy' THEN
    PERFORM seed_pharmacy_chart_of_accounts(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS trg_seed_pharmacy_accounting ON professionals;
CREATE TRIGGER trg_seed_pharmacy_accounting
  AFTER INSERT ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION auto_seed_pharmacy_accounting();

-- ============================================================================
-- SEED EXISTING PHARMACIES
-- ============================================================================
DO $$
DECLARE
  v_pharmacy RECORD;
BEGIN
  FOR v_pharmacy IN 
    SELECT id FROM professionals WHERE type = 'pharmacy'
  LOOP
    PERFORM seed_pharmacy_chart_of_accounts(v_pharmacy.id);
  END LOOP;
END;
$$;
