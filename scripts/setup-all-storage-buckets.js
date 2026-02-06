#!/usr/bin/env node
/**
 * Create ALL required storage buckets for Siha DZ in one go.
 * 
 * Buckets created:
 * - avatars (public) - Profile pictures
 * - documents (public) - Medical documents and PDFs
 * - chat-attachments (public) - Chat file uploads
 * - professional-services (public) - Service images
 * - backup-files (private) - Database backups
 * 
 * Usage: node scripts/setup-all-storage-buckets.js
 *    or: npm run storage:setup-all
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')

const BUCKETS = [
  {
    name: 'avatars',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  {
    name: 'documents',
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  {
    name: 'chat-attachments',
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/ogg'],
  },
  {
    name: 'professional-services',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  {
    name: 'backup-files',
    public: false,
    fileSizeLimit: 100 * 1024 * 1024, // 100MB
  },
]

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('❌ Missing environment variables!')
    console.error('Add to .env.local:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL')
    console.error('  SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nGet them from: Supabase Dashboard → Project Settings → API')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('🚀 Setting up Supabase Storage buckets...\n')

  // Get existing buckets
  const { data: existingBuckets } = await supabase.storage.listBuckets()
  const existingNames = new Set(existingBuckets?.map(b => b.name) || [])

  let created = 0
  let skipped = 0
  let failed = 0

  for (const bucket of BUCKETS) {
    const { name, public: isPublic, fileSizeLimit, allowedMimeTypes } = bucket

    if (existingNames.has(name)) {
      console.log(`⏭️  Bucket "${name}" already exists`)
      skipped++
      continue
    }

    console.log(`📦 Creating bucket: ${name} (${isPublic ? 'public' : 'private'})...`)

    const { error } = await supabase.storage.createBucket(name, {
      public: isPublic,
      fileSizeLimit,
      allowedMimeTypes,
    })

    if (error) {
      if (error.message?.includes('already exists')) {
        console.log(`⏭️  Bucket "${name}" already exists`)
        skipped++
      } else {
        console.error(`❌ Failed to create "${name}": ${error.message}`)
        failed++
      }
    } else {
      console.log(`✅ Created "${name}"`)
      created++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`📊 Summary:`)
  console.log(`   ✅ Created: ${created}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log('='.repeat(50))

  if (failed > 0) {
    console.error('\n⚠️  Some buckets failed to create. Check the errors above.')
    process.exit(1)
  }

  if (created > 0) {
    console.log('\n✨ All buckets are ready! File uploads should now work.')
  } else {
    console.log('\n✨ All buckets already exist! File uploads should work.')
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
