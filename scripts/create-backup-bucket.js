/**
 * Create Backup Storage Bucket
 * Run: node scripts/create-backup-bucket.js
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const BUCKET_NAME = 'backup-files'

async function createBackupBucket() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  })

  console.log('Checking for existing bucket...')
  
  // List buckets
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  
  if (listError) {
    console.error('Failed to list buckets:', listError.message)
    console.log('Attempting to create bucket anyway...')
  } else {
    const exists = buckets?.some(b => b.name === BUCKET_NAME)
    if (exists) {
      console.log(`Bucket "${BUCKET_NAME}" already exists!`)
      return
    }
  }

  console.log(`Creating bucket "${BUCKET_NAME}"...`)
  
  // Create bucket with minimal options first
  const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: false
    // Note: fileSizeLimit and allowedMimeTypes can be set in Supabase dashboard
  })

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket already exists!')
    } else {
      console.error('Failed to create bucket:', error.message)
      process.exit(1)
    }
  } else {
    console.log('Bucket created successfully!')
  }

  // Verify bucket access
  console.log('Verifying bucket access...')
  const { data: files, error: accessError } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', { limit: 1 })

  if (accessError) {
    console.error('Bucket access test failed:', accessError.message)
  } else {
    console.log('Bucket is accessible!')
  }

  console.log('Done!')
}

createBackupBucket().catch(console.error)
