#!/usr/bin/env node
/**
 * Create the 'documents' storage bucket in Supabase for document uploads.
 * Run: node scripts/create-documents-bucket.js
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
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const bucketName = 'documents'
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.some(b => b.name === bucketName)) {
    console.log(`Bucket "${bucketName}" already exists.`)
    process.exit(0)
    return
  }

  const { error } = await supabase.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  })

  if (error) {
    console.error('Error creating bucket:', error.message)
    process.exit(1)
  }

  console.log(`Bucket "${bucketName}" created successfully.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
