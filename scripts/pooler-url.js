#!/usr/bin/env node
/**
 * Print the Connection pooler DATABASE_URL template for your Supabase project.
 * Use this in .env.local instead of the direct connection (port 5432) to avoid ETIMEDOUT.
 *
 * Run: node scripts/pooler-url.js
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const u = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!u) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
  process.exit(1)
}
let ref
try {
  ref = new URL(u).hostname.replace(/\.supabase\.co$/, '')
} catch {
  console.error('Invalid NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

console.log('Use this Connection pooler URI in .env.local as DATABASE_URL:\n')
console.log(`postgresql://postgres.${ref}:[YOUR-DB-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`)
console.log('\n1. Replace [YOUR-DB-PASSWORD] with your database password (Project Settings → Database).')
console.log('2. Replace [REGION] with your pooler region (e.g. eu-central-1, us-east-1).')
console.log('   Get it from: Supabase → Project Settings → Database → Connection string → URI → "Connection pooler" (Transaction).')
