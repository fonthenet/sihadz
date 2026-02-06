#!/usr/bin/env node
/**
 * Create the 'avatars' storage bucket in Supabase (required for profile picture uploads).
 * Uses NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 *
 * Usage: node scripts/create-avatars-bucket.js
 *    or: npm run storage:create-avatars
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('Missing env vars. Add to .env.local:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL')
    console.error('  SUPABASE_SERVICE_ROLE_KEY')
    console.error('Get them from Supabase Dashboard → Project Settings → API')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const bucketName = 'avatars'
  const { data, error } = await supabase.storage.createBucket(bucketName, {
    public: true,
  })

  if (error) {
    if (error.message?.includes('already exists') || error.message?.includes('Bucket already exists')) {
      console.log(`Bucket "${bucketName}" already exists. Nothing to do.`)
      process.exit(0)
      return
    }
    console.error('Error creating bucket:', error.message)
    process.exit(1)
  }

  console.log(`Bucket "${bucketName}" created successfully.`)
  if (data) console.log(data)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
