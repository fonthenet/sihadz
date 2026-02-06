/**
 * Create professional-services storage bucket for service images
 * Run: node scripts/create-professional-services-bucket.js
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const BUCKET_NAME = 'professional-services'

async function createBucket() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  })

  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.some(b => b.name === BUCKET_NAME)) {
    console.log(`Bucket "${BUCKET_NAME}" already exists.`)
    return
  }

  const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  })

  if (error) {
    console.error('Failed to create bucket:', error.message)
    process.exit(1)
  }
  console.log(`Bucket "${BUCKET_NAME}" created successfully.`)
}

createBucket()
