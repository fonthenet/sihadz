-- ============================================================================
-- Seed Storefront Demo Data
-- Enables storefront and adds sample products for the first pharmacy found
-- ============================================================================

DO $$
DECLARE
    v_pharmacy_id UUID;
    v_cat_meds UUID;
    v_cat_care UUID;
    v_cat_baby UUID;
BEGIN
    -- Get the first pharmacy
    SELECT id INTO v_pharmacy_id 
    FROM professionals 
    WHERE type = 'pharmacy' AND status = 'verified'
    LIMIT 1;

    IF v_pharmacy_id IS NULL THEN
        RAISE NOTICE 'No approved pharmacy found. Skipping seed.';
        RETURN;
    END IF;

    RAISE NOTICE 'Seeding storefront for pharmacy: %', v_pharmacy_id;

    -- 1. Enable storefront settings
    INSERT INTO storefront_settings (
        professional_id,
        is_enabled,
        storefront_name,
        storefront_description,
        pickup_enabled,
        delivery_enabled,
        delivery_fee,
        accept_cash_on_pickup,
        accept_online_payment,
        min_order_amount,
        preparation_time_minutes
    ) VALUES (
        v_pharmacy_id,
        true,
        'Pharmacie en Ligne',
        'Bienvenue dans notre pharmacie en ligne. Commandez vos médicaments et produits de santé en toute simplicité. Retrait rapide en magasin.',
        true,
        true,
        200,
        true,
        false,
        500,
        30
    )
    ON CONFLICT (professional_id) DO UPDATE SET
        is_enabled = true,
        storefront_name = EXCLUDED.storefront_name,
        storefront_description = EXCLUDED.storefront_description,
        pickup_enabled = EXCLUDED.pickup_enabled,
        delivery_enabled = EXCLUDED.delivery_enabled,
        delivery_fee = EXCLUDED.delivery_fee,
        accept_cash_on_pickup = EXCLUDED.accept_cash_on_pickup,
        min_order_amount = EXCLUDED.min_order_amount,
        preparation_time_minutes = EXCLUDED.preparation_time_minutes;

    -- 2. Create categories
    INSERT INTO storefront_categories (id, professional_id, name, name_ar, slug, display_order, is_active)
    VALUES 
        (gen_random_uuid(), v_pharmacy_id, 'Médicaments', 'الأدوية', 'medicaments', 1, true),
        (gen_random_uuid(), v_pharmacy_id, 'Soins & Hygiène', 'العناية والنظافة', 'soins-hygiene', 2, true),
        (gen_random_uuid(), v_pharmacy_id, 'Bébé & Maman', 'الطفل والأم', 'bebe-maman', 3, true)
    ON CONFLICT DO NOTHING;

    -- Get category IDs
    SELECT id INTO v_cat_meds FROM storefront_categories 
    WHERE professional_id = v_pharmacy_id AND slug = 'medicaments' LIMIT 1;
    
    SELECT id INTO v_cat_care FROM storefront_categories 
    WHERE professional_id = v_pharmacy_id AND slug = 'soins-hygiene' LIMIT 1;
    
    SELECT id INTO v_cat_baby FROM storefront_categories 
    WHERE professional_id = v_pharmacy_id AND slug = 'bebe-maman' LIMIT 1;

    -- 3. Create sample products
    INSERT INTO storefront_products (
        professional_id, category_id, name, name_ar, description, description_ar,
        product_type, price, compare_at_price, is_available, is_featured, display_order
    ) VALUES
    -- Medications
    (v_pharmacy_id, v_cat_meds, 'Doliprane 1000mg', 'دوليبران 1000 ملغ', 
     'Paracétamol 1000mg - Boîte de 8 comprimés. Antalgique et antipyrétique.', 
     'باراسيتامول 1000 ملغ - علبة 8 أقراص',
     'product', 250, NULL, true, true, 1),
    
    (v_pharmacy_id, v_cat_meds, 'Augmentin 1g', 'أوغمنتين 1 غ',
     'Amoxicilline/Acide clavulanique - Boîte de 12 comprimés. Antibiotique.',
     'أموكسيسيلين/حمض الكلافولانيك - علبة 12 قرص',
     'product', 850, NULL, true, false, 2),
    
    (v_pharmacy_id, v_cat_meds, 'Voltarène 50mg', 'فولتارين 50 ملغ',
     'Diclofénac 50mg - Boîte de 20 comprimés. Anti-inflammatoire.',
     'ديكلوفيناك 50 ملغ - علبة 20 قرص',
     'product', 380, NULL, true, false, 3),
    
    (v_pharmacy_id, v_cat_meds, 'Spasfon', 'سبازفون',
     'Phloroglucinol - Boîte de 30 comprimés. Antispasmodique.',
     'فلوروغلوسينول - علبة 30 قرص',
     'product', 420, NULL, true, true, 4),
    
    (v_pharmacy_id, v_cat_meds, 'Smecta', 'سميكتا',
     'Diosmectite - Boîte de 30 sachets. Anti-diarrhéique.',
     'ديوسميكتيت - علبة 30 كيس',
     'product', 550, NULL, true, false, 5),

    -- Care & Hygiene
    (v_pharmacy_id, v_cat_care, 'Gel Hydroalcoolique 500ml', 'جل معقم 500 مل',
     'Gel désinfectant pour les mains. Élimine 99.9% des bactéries.',
     'جل مطهر لليدين. يقضي على 99.9% من البكتيريا',
     'product', 350, 450, true, true, 1),
    
    (v_pharmacy_id, v_cat_care, 'Masques Chirurgicaux (50)', 'أقنعة جراحية (50)',
     'Boîte de 50 masques chirurgicaux 3 plis.',
     'علبة 50 قناع جراحي 3 طبقات',
     'product', 600, NULL, true, false, 2),
    
    (v_pharmacy_id, v_cat_care, 'Tensio Control', 'جهاز قياس الضغط',
     'Tensiomètre électronique au bras. Précis et facile à utiliser.',
     'جهاز قياس ضغط الدم الإلكتروني',
     'product', 4500, 5200, true, true, 3),
    
    (v_pharmacy_id, v_cat_care, 'Thermomètre Digital', 'ميزان حرارة رقمي',
     'Thermomètre digital avec écran LCD. Résultat en 60 secondes.',
     'ميزان حرارة رقمي بشاشة LCD',
     'product', 800, NULL, true, false, 4),

    -- Baby & Mom
    (v_pharmacy_id, v_cat_baby, 'Pampers Taille 3 (68)', 'بامبرز مقاس 3 (68)',
     'Couches Pampers taille 3 (6-10kg) - Paquet de 68 couches.',
     'حفاضات بامبرز مقاس 3 (6-10 كغ) - عبوة 68 حفاضة',
     'product', 2200, NULL, true, true, 1),
    
    (v_pharmacy_id, v_cat_baby, 'Lait Gallia 1er âge', 'حليب غاليا المرحلة الأولى',
     'Lait infantile 1er âge (0-6 mois) - Boîte 800g.',
     'حليب الرضع المرحلة الأولى (0-6 أشهر) - علبة 800 غ',
     'product', 1800, NULL, true, false, 2),
    
    (v_pharmacy_id, v_cat_baby, 'Biberon Avent 260ml', 'رضاعة أفينت 260 مل',
     'Biberon anti-colique Philips Avent 260ml.',
     'رضاعة مضادة للمغص فيليبس أفينت 260 مل',
     'product', 1200, NULL, true, false, 3),
    
    (v_pharmacy_id, v_cat_baby, 'Crème Change Mustela', 'كريم موستيلا للحفاضات',
     'Crème pour le change Mustela 100ml. Apaise et protège.',
     'كريم تغيير الحفاضات موستيلا 100 مل',
     'product', 950, NULL, true, false, 4)
    
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Storefront seeded successfully for pharmacy: %', v_pharmacy_id;
END $$;

-- Show the seeded pharmacy
SELECT 
    p.id,
    p.business_name,
    s.is_enabled,
    (SELECT COUNT(*) FROM storefront_products WHERE professional_id = p.id) as product_count
FROM professionals p
LEFT JOIN storefront_settings s ON s.professional_id = p.id
WHERE p.type = 'pharmacy' AND p.status = 'verified'
LIMIT 5;
