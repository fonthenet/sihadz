/**
 * AI Audit Logger
 * Logs all AI operations to the database for compliance and analytics
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { AuditLogEntry, AIProvider, AISkill, UserRole } from './types';
import { maskPII } from './safety/pre-check';

/**
 * Create a hash of the input for audit purposes (no PII stored)
 */
export function hashInput(input: any): string {
  try {
    const masked = maskPII(input);
    const str = JSON.stringify(masked);
    // Simple hash - just take first 32 chars of base64
    return Buffer.from(str).toString('base64').slice(0, 32);
  } catch {
    return 'error-hashing';
  }
}

/**
 * Create a brief summary of the output structure for audit (no sensitive data)
 */
export function summarizeOutput(output: any): string {
  if (!output) return 'null';
  if (typeof output !== 'object') return typeof output;
  
  try {
    const keys = Object.keys(output);
    if (keys.length === 0) return '{}';
    
    // Show structure but not values
    const structure = keys.map(key => {
      const val = output[key];
      if (Array.isArray(val)) return `${key}[${val.length}]`;
      if (typeof val === 'object' && val !== null) return `${key}{}`;
      return key;
    });
    
    return `{${structure.join(', ')}}`;
  } catch {
    return 'error-summarizing';
  }
}

/**
 * Log an AI operation to the audit table
 */
export async function logAudit(entry: AuditLogEntry): Promise<string> {
  try {
    const admin = createAdminClient();
    
    const { data, error } = await admin
      .from('ai_audit_logs')
      .insert({
        user_id: entry.userId,
        user_role: entry.userRole,
        skill: entry.skill,
        provider: entry.provider,
        model: entry.model,
        tokens_input: entry.tokens.input,
        tokens_output: entry.tokens.output,
        latency_ms: entry.latencyMs,
        input_hash: entry.inputHash,
        output_summary: entry.outputSummary,
        ticket_id: entry.ticketId || null,
        appointment_id: entry.appointmentId || null,
        success: entry.success,
        error_message: entry.errorMessage || null,
        language: entry.language || 'fr',
        disclaimer_shown: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[AI Audit] Failed to log:', error.message);
      return '';
    }

    // Also update usage tracking
    await updateUsageTracking(entry.userId, entry.skill, entry.tokens.input + entry.tokens.output);

    return data?.id || '';
  } catch (err: any) {
    console.error('[AI Audit] Error:', err.message);
    return '';
  }
}

/**
 * Update usage tracking for billing (future use)
 */
async function updateUsageTracking(userId: string, skill: string, tokens: number): Promise<void> {
  try {
    const admin = createAdminClient();
    
    // Call the database function to update usage
    await admin.rpc('log_ai_usage', {
      p_user_id: userId,
      p_skill: skill,
      p_tokens: tokens,
    });
  } catch (err: any) {
    // Non-critical, just log
    console.warn('[AI Usage] Failed to update tracking:', err.message);
  }
}

/**
 * Get user's AI usage for current period
 */
export async function getUserAIUsage(userId: string): Promise<Record<string, { count: number; tokens: number }>> {
  try {
    const admin = createAdminClient();
    
    const periodStart = new Date();
    periodStart.setDate(1); // First of month
    
    const { data, error } = await admin
      .from('ai_usage_tracking')
      .select('skill, usage_count, tokens_used')
      .eq('user_id', userId)
      .gte('period_start', periodStart.toISOString().split('T')[0]);

    if (error || !data) return {};

    const usage: Record<string, { count: number; tokens: number }> = {};
    for (const row of data) {
      usage[row.skill] = {
        count: row.usage_count,
        tokens: row.tokens_used,
      };
    }
    
    return usage;
  } catch {
    return {};
  }
}

/**
 * Check if user can use a specific AI skill (for future rate limiting)
 */
export async function canUseSkill(userId: string, skill: AISkill): Promise<{ allowed: boolean; reason?: string }> {
  // For now, always allow (unlimited testing)
  // This will be replaced with actual subscription checks later
  return { allowed: true };
}

/**
 * Log user feedback on AI response
 */
export async function logFeedback(
  auditId: string,
  userId: string,
  rating: number,
  feedbackType: string,
  comment?: string
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    
    const { error } = await admin
      .from('ai_feedback')
      .insert({
        audit_id: auditId,
        user_id: userId,
        rating,
        feedback_type: feedbackType,
        comment: comment || null,
      });

    return !error;
  } catch {
    return false;
  }
}
