#!/usr/bin/env node
/**
 * Create storage buckets in the PRODUCTION Supabase project.
 * Use this when you get "Bucket not found" (404) on sihadz.com.
 *
 * Run with production credentials (copy from Vercel → Project → Settings → Environment Variables):
 *
 *   PowerShell:
 *   $env:NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="your-production-service-role-key"
 *   npm run storage:setup-prod
 *
 *   Bash:
 *   NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co" SUPABASE_SERVICE_ROLE_KEY="your-key" npm run storage:setup-prod
 *
 * Or create .env.production.local with those vars (gitignored), then run:
 *   npm run storage:setup-prod
 */

const path = require('path')

// Try production env first, then .env.local
const prodPath = path.join(__dirname, '..', '.env.production.local')
const prodPath2 = path.join(__dirname, '..', '.env.production')

const fs = require('fs')
// Prefer production env files; do NOT load .env.local (that's for local dev)
let envPath = null
if (fs.existsSync(prodPath)) envPath = prodPath
else if (fs.existsSync(prodPath2)) envPath = prodPath2
if (envPath) require('dotenv').config({ path: envPath })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('')
  console.error('❌ Missing production Supabase credentials!')
  console.error('')
  console.error('Set these env vars (copy from Vercel → Settings → Environment Variables):')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('PowerShell:')
  console.error('  $env:NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"')
  console.error('  $env:SUPABASE_SERVICE_ROLE_KEY="your-key"')
  console.error('  npm run storage:setup-prod')
  console.error('')
  process.exit(1)
}

// Show which project we're targeting (mask the key)
const projectMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/)
const projectId = projectMatch ? projectMatch[1] : 'unknown'
console.log('Target project:', projectId)
console.log('')

// Run the main setup (dotenv in setup script won't override our already-set vars)
require('./setup-all-storage-buckets.js')
