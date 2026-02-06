#!/usr/bin/env node
/**
 * Import DZ-Pharma-Data (4,800+ Algerian medications) into the database
 * Source: https://github.com/fennecinspace/DZ-Pharma-Data
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const DZ_PHARMA_DATA_URL = 'https://raw.githubusercontent.com/fennecinspace/DZ-Pharma-Data/master/data/meds.json'

async function fetchMedications() {
  console.log('📥 Fetching medications from DZ-Pharma-Data...')
  const response = await fetch(DZ_PHARMA_DATA_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`)
  }
  const data = await response.json()
  
  // Flatten the alphabetical structure
  const medications = []
  for (const letter of Object.keys(data)) {
    if (Array.isArray(data[letter])) {
      medications.push(...data[letter])
    }
  }
  
  console.log(`✅ Fetched ${medications.length} medications`)
  return medications
}

function parsePrice(priceStr) {
  if (!priceStr || priceStr === '--- DA' || priceStr === '00 DA' || priceStr === 'null') {
    return null
  }
  // Extract numeric value from strings like "314.70 DA" or "5,842.27 DA"
  const match = priceStr.replace(/,/g, '').match(/(\d+\.?\d*)/)
  return match ? parseFloat(match[1]) : null
}

function mapTherapeuticClass(therapeutic) {
  if (!therapeutic) return 'other'
  const t = therapeutic.toLowerCase()
  
  if (t.includes('antalgique') || t.includes('douleur')) return 'analgesics'
  if (t.includes('anti-inflammatoire')) return 'nsaids'
  if (t.includes('infectiologie') || t.includes('antibio')) return 'antibiotics'
  if (t.includes('pneumologie') || t.includes('respirat')) return 'respiratory'
  if (t.includes('gastro')) return 'gastro'
  if (t.includes('cardio') || t.includes('angeio')) return 'cardiovascular'
  if (t.includes('diabete') || t.includes('metabolisme')) return 'diabetes'
  if (t.includes('psychiatrie') || t.includes('neurologie')) return 'psychotropics'
  if (t.includes('dermatologie')) return 'dermatology'
  if (t.includes('ophtalmologie')) return 'ophthalmology'
  if (t.includes('otologie') || t.includes('orl')) return 'ent'
  if (t.includes('gyneco') || t.includes('urologie')) return 'gynecology'
  if (t.includes('cancerologie') || t.includes('oncologie')) return 'oncology'
  if (t.includes('hematologie')) return 'hematology'
  if (t.includes('rhumatologie')) return 'rheumatology'
  if (t.includes('allergo')) return 'allergy'
  if (t.includes('anesthesio')) return 'anesthesia'
  if (t.includes('parasitologie')) return 'parasitology'
  if (t.includes('vitamine') || t.includes('supplement')) return 'vitamins'
  
  return 'other'
}

function transformMedication(med) {
  const referencePrice = parsePrice(med.reference_rate)
  const publicPrice = parsePrice(med.ppa)
  const price = publicPrice || referencePrice
  
  return {
    brand_name: med.commercial_name || med.name?.split(' ')[0] || 'Unknown',
    full_name: med.name || med.commercial_name,
    dci: med.generic || 'Unknown',
    therapeutic_class: med.class?.therapeutic || null,
    pharmacological_class: med.class?.pharmacological || null,
    category: mapTherapeuticClass(med.class?.therapeutic),
    dosage_forms: med.form ? [med.form] : [],
    strengths: med.dosage ? [med.dosage] : [],
    conditioning: med.conditioning || null,
    manufacturer: med.lab?.name || null,
    manufacturer_address: med.lab?.address || null,
    manufacturer_tel: med.lab?.tel || null,
    manufacturer_web: med.lab?.web || null,
    country_origin: med.country || null,
    cnas_covered: med.refundable === true,
    requires_prescription: med.list === 'Liste I' || med.list === 'Liste II',
    prescription_list: med.list || null,
    reference_price_dzd: referencePrice,
    public_price_dzd: publicPrice,
    price_range: price ? `${Math.round(price)} DZD` : null,
    registration_number: med.registration || null,
    dci_code: med.dci || null,
    pharmnet_link: med.link || null,
    notice_link: med.notice || null,
    image_url: med.img || null,
    is_marketed: med.commercialisation === true,
    indications: null, // Not available in source data
    typical_dosage: null, // Not available in source data
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

async function createTable() {
  console.log('🔧 Creating/updating algerian_medications table...')
  
  // First, let's drop and recreate the table with proper schema
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Drop existing table if exists
      DROP TABLE IF EXISTS algerian_medications CASCADE;
      
      -- Create comprehensive medications table
      CREATE TABLE algerian_medications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_name VARCHAR(255) NOT NULL,
        full_name TEXT,
        dci VARCHAR(500),
        therapeutic_class VARCHAR(255),
        pharmacological_class VARCHAR(255),
        category VARCHAR(100),
        dosage_forms TEXT[],
        strengths TEXT[],
        conditioning TEXT,
        manufacturer VARCHAR(255),
        manufacturer_address TEXT,
        manufacturer_tel VARCHAR(255),
        manufacturer_web VARCHAR(255),
        country_origin VARCHAR(100),
        cnas_covered BOOLEAN DEFAULT false,
        requires_prescription BOOLEAN DEFAULT true,
        prescription_list VARCHAR(50),
        reference_price_dzd DECIMAL(10,2),
        public_price_dzd DECIMAL(10,2),
        price_range VARCHAR(50),
        registration_number VARCHAR(100),
        dci_code VARCHAR(50),
        pharmnet_link TEXT,
        notice_link TEXT,
        image_url TEXT,
        is_marketed BOOLEAN DEFAULT true,
        indications TEXT,
        typical_dosage TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Enable RLS
      ALTER TABLE algerian_medications ENABLE ROW LEVEL SECURITY;
      
      -- Allow authenticated users to read
      DROP POLICY IF EXISTS "Anyone can read medications" ON algerian_medications;
      CREATE POLICY "Anyone can read medications"
        ON algerian_medications FOR SELECT
        TO authenticated
        USING (true);
      
      -- Create indexes for faster searches
      CREATE INDEX IF NOT EXISTS idx_meds_brand ON algerian_medications(brand_name);
      CREATE INDEX IF NOT EXISTS idx_meds_dci ON algerian_medications(dci);
      CREATE INDEX IF NOT EXISTS idx_meds_category ON algerian_medications(category);
      CREATE INDEX IF NOT EXISTS idx_meds_therapeutic ON algerian_medications(therapeutic_class);
      CREATE INDEX IF NOT EXISTS idx_meds_cnas ON algerian_medications(cnas_covered);
      CREATE INDEX IF NOT EXISTS idx_meds_marketed ON algerian_medications(is_marketed);
    `
  })
  
  if (error) {
    // If RPC doesn't exist, the table might already exist, continue
    console.log('⚠️ Could not recreate table via RPC, will try direct insert...')
  } else {
    console.log('✅ Table created successfully')
  }
}

async function importMedications(medications) {
  console.log(`📤 Importing ${medications.length} medications...`)
  
  // Transform all medications
  const transformed = medications.map(transformMedication)
  
  // Insert in batches of 500
  const batchSize = 500
  let imported = 0
  let errors = 0
  
  for (let i = 0; i < transformed.length; i += batchSize) {
    const batch = transformed.slice(i, i + batchSize)
    
    const { error } = await supabase
      .from('algerian_medications')
      .upsert(batch, { 
        onConflict: 'brand_name,dci,conditioning',
        ignoreDuplicates: true 
      })
    
    if (error) {
      // Try insert instead
      const { error: insertError } = await supabase
        .from('algerian_medications')
        .insert(batch)
      
      if (insertError) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, insertError.message)
        errors += batch.length
      } else {
        imported += batch.length
      }
    } else {
      imported += batch.length
    }
    
    process.stdout.write(`\r📊 Progress: ${Math.min(i + batchSize, transformed.length)}/${transformed.length} (${Math.round((i + batchSize) / transformed.length * 100)}%)`)
  }
  
  console.log(`\n✅ Imported ${imported} medications (${errors} errors)`)
}

async function generateStats() {
  console.log('\n📊 Generating statistics...')
  
  const { count: total } = await supabase
    .from('algerian_medications')
    .select('*', { count: 'exact', head: true })
  
  const { count: cnasCount } = await supabase
    .from('algerian_medications')
    .select('*', { count: 'exact', head: true })
    .eq('cnas_covered', true)
  
  const { count: marketedCount } = await supabase
    .from('algerian_medications')
    .select('*', { count: 'exact', head: true })
    .eq('is_marketed', true)
  
  const { data: categories } = await supabase
    .from('algerian_medications')
    .select('category')
  
  const categoryCounts = {}
  categories?.forEach(c => {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1
  })
  
  console.log('\n=== IMPORT STATISTICS ===')
  console.log(`Total medications: ${total}`)
  console.log(`CNAS covered: ${cnasCount} (${Math.round(cnasCount/total*100)}%)`)
  console.log(`Currently marketed: ${marketedCount}`)
  console.log('\nBy category:')
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`)
    })
}

async function main() {
  try {
    console.log('🚀 Starting DZ-Pharma-Data import...\n')
    
    // Fetch medications from GitHub
    const medications = await fetchMedications()
    
    // Import into database
    await importMedications(medications)
    
    // Generate statistics
    await generateStats()
    
    console.log('\n✅ Import complete!')
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  }
}

main()
