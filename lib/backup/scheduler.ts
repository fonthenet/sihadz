/**
 * Backup Scheduler
 * Manages scheduled backup jobs
 * 
 * Note: For production, this should be integrated with:
 * - Vercel Cron Jobs (for serverless)
 * - Supabase Edge Functions with pg_cron
 * - Or a dedicated job queue like BullMQ
 */

import { createAdminClient } from '@/lib/supabase/server'
import { BackupSchedule, BackupJob } from './types'

// =====================================================
// SCHEDULE MANAGEMENT
// =====================================================

/**
 * Get all enabled schedules that are due to run
 */
export async function getDueSchedules(): Promise<BackupSchedule[]> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('backup_schedules')
    .select('*')
    .eq('is_enabled', true)
    .lte('next_run_at', new Date().toISOString())
  
  if (error) {
    console.error('Failed to get due schedules:', error)
    return []
  }
  
  return data || []
}

/**
 * Update schedule after run
 */
export async function updateScheduleAfterRun(
  scheduleId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const supabase = createAdminClient()
  
  // Calculate next run time
  const { data: schedule } = await supabase
    .from('backup_schedules')
    .select('schedule')
    .eq('id', scheduleId)
    .single()
  
  const nextRun = calculateNextRun(schedule?.schedule || '0 2 * * *')
  
  const { error } = await supabase
    .from('backup_schedules')
    .update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRun.toISOString(),
      last_error: success ? null : errorMessage
    })
    .eq('id', scheduleId)
  
  if (error) {
    console.error('Failed to update schedule:', error)
  }
}

/**
 * Calculate next run time from cron expression
 */
export function calculateNextRun(cronExpression: string): Date {
  const now = new Date()
  
  // Simple cron parsing for common patterns
  const parts = cronExpression.split(' ')
  if (parts.length !== 5) {
    // Default to 24 hours from now
    return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
  
  // Daily schedule (0 H * * *)
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const targetHour = parseInt(hour) || 2
    const targetMinute = parseInt(minute) || 0
    
    const next = new Date(now)
    next.setHours(targetHour, targetMinute, 0, 0)
    
    // If already past today's scheduled time, move to tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
    
    return next
  }
  
  // Weekly schedule (0 H * * D)
  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const targetHour = parseInt(hour) || 2
    const targetMinute = parseInt(minute) || 0
    const targetDay = parseInt(dayOfWeek) || 0 // 0 = Sunday
    
    const next = new Date(now)
    next.setHours(targetHour, targetMinute, 0, 0)
    
    // Calculate days until target day
    const currentDay = next.getDay()
    let daysUntil = targetDay - currentDay
    if (daysUntil <= 0 || (daysUntil === 0 && next <= now)) {
      daysUntil += 7
    }
    
    next.setDate(next.getDate() + daysUntil)
    return next
  }
  
  // Monthly schedule (0 H D * *)
  if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
    const targetHour = parseInt(hour) || 2
    const targetMinute = parseInt(minute) || 0
    const targetDayOfMonth = parseInt(dayOfMonth) || 1
    
    const next = new Date(now)
    next.setDate(targetDayOfMonth)
    next.setHours(targetHour, targetMinute, 0, 0)
    
    // If already past this month's date, move to next month
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
    }
    
    return next
  }
  
  // Default: 24 hours from now
  return new Date(now.getTime() + 24 * 60 * 60 * 1000)
}

// =====================================================
// JOB QUEUE
// =====================================================

/**
 * Create a new backup job
 */
export async function createBackupJob(
  userId: string,
  jobType: 'create' | 'sync_google' | 'sync_icloud' | 'restore' | 'delete',
  inputData?: Record<string, unknown>,
  options?: {
    professional_id?: string
    backup_type?: string
    priority?: number
  }
): Promise<BackupJob> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('backup_jobs')
    .insert({
      user_id: userId,
      professional_id: options?.professional_id,
      backup_type: options?.backup_type || 'full',
      job_type: jobType,
      status: 'pending',
      priority: options?.priority || 5,
      input_data: inputData,
      max_attempts: 3
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create job: ${error.message}`)
  }
  
  return data
}

/**
 * Get pending jobs to process
 */
export async function getPendingJobs(limit: number = 10): Promise<BackupJob[]> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('backup_jobs')
    .select('*')
    .eq('status', 'pending')
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit)
  
  if (error) {
    console.error('Failed to get pending jobs:', error)
    return []
  }
  
  return data || []
}

/**
 * Start processing a job
 */
export async function startJob(jobId: string): Promise<void> {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('backup_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      attempts: supabase.rpc('increment_attempts', { row_id: jobId })
    })
    .eq('id', jobId)
  
  if (error) {
    // Fallback: just update status
    await supabase
      .from('backup_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId)
  }
}

/**
 * Complete a job
 */
export async function completeJob(
  jobId: string,
  outputData?: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('backup_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      output_data: outputData
    })
    .eq('id', jobId)
  
  if (error) {
    console.error('Failed to complete job:', error)
  }
}

/**
 * Fail a job (with retry logic)
 */
export async function failJob(
  jobId: string,
  errorMessage: string
): Promise<void> {
  const supabase = createAdminClient()
  
  // Get current job
  const { data: job } = await supabase
    .from('backup_jobs')
    .select('attempts, max_attempts')
    .eq('id', jobId)
    .single()
  
  const attempts = (job?.attempts || 0) + 1
  const maxAttempts = job?.max_attempts || 3
  
  if (attempts >= maxAttempts) {
    // Mark as failed permanently
    const { error } = await supabase
      .from('backup_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
        attempts
      })
      .eq('id', jobId)
    
    if (error) {
      console.error('Failed to mark job as failed:', error)
    }
  } else {
    // Schedule retry with exponential backoff
    const retryDelay = Math.pow(2, attempts) * 60 * 1000 // 2^n minutes
    const nextRetry = new Date(Date.now() + retryDelay)
    
    const { error } = await supabase
      .from('backup_jobs')
      .update({
        status: 'pending',
        error_message: errorMessage,
        next_retry_at: nextRetry.toISOString(),
        attempts
      })
      .eq('id', jobId)
    
    if (error) {
      console.error('Failed to schedule retry:', error)
    }
  }
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<void> {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('backup_jobs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString()
    })
    .eq('id', jobId)
  
  if (error) {
    console.error('Failed to cancel job:', error)
  }
}

// =====================================================
// CLEANUP
// =====================================================

/**
 * Clean up old completed/failed jobs
 */
export async function cleanupOldJobs(olderThanDays: number = 30): Promise<number> {
  const supabase = createAdminClient()
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
  
  const { data, error } = await supabase
    .from('backup_jobs')
    .delete()
    .in('status', ['completed', 'failed', 'cancelled'])
    .lt('completed_at', cutoffDate.toISOString())
    .select('id')
  
  if (error) {
    console.error('Failed to cleanup jobs:', error)
    return 0
  }
  
  return data?.length || 0
}

// =====================================================
// CRON ENDPOINT HELPER
// =====================================================

/**
 * Process scheduled backups
 * Call this from a cron job or Vercel cron
 */
export async function processScheduledBackups(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const stats = { processed: 0, succeeded: 0, failed: 0 }
  
  // Get due schedules
  const dueSchedules = await getDueSchedules()
  
  for (const schedule of dueSchedules) {
    stats.processed++
    
    try {
      // Create a job for this scheduled backup
      await createBackupJob(
        schedule.user_id,
        'create',
        {
          backup_type: schedule.backup_type,
          auto_sync_google: schedule.auto_sync_google,
          auto_sync_icloud: schedule.auto_sync_icloud
        },
        {
          professional_id: schedule.professional_id,
          backup_type: schedule.backup_type,
          priority: 3 // Higher priority for scheduled backups
        }
      )
      
      await updateScheduleAfterRun(schedule.id, true)
      stats.succeeded++
    } catch (error: any) {
      await updateScheduleAfterRun(schedule.id, false, error.message)
      stats.failed++
    }
  }
  
  return stats
}
