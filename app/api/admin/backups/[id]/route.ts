/**
 * Admin Backup Management by ID
 * GET - Get backup details
 * DELETE - Delete any backup
 * POST - Restore from backup (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/admin/verify-admin'
import { decryptBackup } from '@/lib/backup/encryption'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    
    const adminResult = await verifyAdminAccess(supabase)
    if (!adminResult.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const adminClient = createAdminClient()
    
    const { data: backup, error } = await adminClient
      .from('backup_files')
      .select(`
        *,
        profiles:user_id (email, full_name),
        professionals:professional_id (business_name, type)
      `)
      .eq('id', id)
      .single()
    
    if (error || !backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }
    
    // Get download URL
    const { data: signedUrl } = await adminClient.storage
      .from('backup-files')
      .createSignedUrl(backup.storage_path, 3600)
    
    return NextResponse.json({
      backup: {
        ...backup,
        user_email: backup.profiles?.email,
        user_name: backup.profiles?.full_name,
        professional_name: backup.professionals?.business_name,
        professional_type: backup.professionals?.type,
        download_url: signedUrl?.signedUrl
      }
    })
    
  } catch (error: any) {
    console.error('Admin get backup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    
    const adminResult = await verifyAdminAccess(supabase)
    if (!adminResult.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Super admin access required for deletion' },
        { status: 403 }
      )
    }
    
    const adminClient = createAdminClient()
    
    // Get backup to find storage path
    const { data: backup, error: fetchError } = await adminClient
      .from('backup_files')
      .select('storage_path, google_file_id')
      .eq('id', id)
      .single()
    
    if (fetchError || !backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }
    
    // Delete from storage
    if (backup.storage_path) {
      await adminClient.storage.from('backup-files').remove([backup.storage_path])
    }
    
    // Mark as deleted in database
    const { error: deleteError } = await adminClient
      .from('backup_files')
      .update({ status: 'deleted' })
      .eq('id', id)
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, message: 'Backup deleted' })
    
  } catch (error: any) {
    console.error('Admin delete backup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    
    const adminResult = await verifyAdminAccess(supabase)
    if (!adminResult.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Super admin access required for restore' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { dry_run = true } = body // Default to dry run for safety
    
    const adminClient = createAdminClient()
    
    // Get backup
    const { data: backup, error: fetchError } = await adminClient
      .from('backup_files')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }
    
    // Download encrypted backup
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('backup-files')
      .download(backup.storage_path)
    
    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download backup' }, { status: 500 })
    }
    
    // Parse and decrypt
    const encryptedBackup = JSON.parse(await fileData.text())
    const { data, verified } = await decryptBackup(encryptedBackup)
    
    if (!verified) {
      return NextResponse.json(
        { error: 'Backup verification failed - data may be corrupted' },
        { status: 400 }
      )
    }
    
    if (dry_run) {
      // Return preview of what would be restored
      return NextResponse.json({
        success: true,
        dry_run: true,
        preview: {
          backup_type: backup.backup_type,
          created_at: backup.created_at,
          verified: true,
          data_summary: {
            has_professional: !!data.professional,
            has_pharmacy: !!data.pharmacy,
            has_patient: !!data.patient,
            has_settings: !!data.settings,
            // Count items
            products_count: data.pharmacy?.products?.length || 0,
            appointments_count: data.professional?.appointments?.length || 0,
            prescriptions_count: data.professional?.prescriptions?.length || 0
          }
        }
      })
    }
    
    // TODO: Implement full restore logic
    // This requires careful handling of:
    // - Conflict resolution
    // - Foreign key constraints
    // - Audit logging
    // For now, return that restore is not yet implemented
    
    return NextResponse.json({
      success: false,
      error: 'Full restore not yet implemented. Use dry_run to preview backup contents.'
    }, { status: 501 })
    
  } catch (error: any) {
    console.error('Admin restore backup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
