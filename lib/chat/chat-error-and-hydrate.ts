'use client'

// ============================================
// CHAT - SHARED ERROR & HYDRATE HELPERS
// Used by widget (use-chat-hooks), messages page, and pro messages.
// ============================================

import type { SupabaseClient } from '@supabase/supabase-js'

/** Get a readable message from Supabase or any thrown value (avoids empty {} in console) */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err == null) return fallback
  if (typeof err === 'string') return err
  const o = err as Record<string, unknown>
  if (typeof o?.message === 'string' && o.message) return o.message
  if (typeof o?.error_description === 'string' && o.error_description) return o.error_description
  if (typeof o?.details === 'string' && o.details) return o.details
  if (typeof o?.hint === 'string' && o.hint) return o.hint
  if (typeof o?.code === 'string' && o.code) return o.code
  try {
    const s = JSON.stringify(err)
    if (s && s !== '{}') return s
  } catch (_) {}
  return fallback
}

/** Detect schema/relationship errors (missing FK, schema cache) so we can fall back to fetch + hydrate */
export function isSchemaRelError(err: unknown, tableA: string, tableB: string): boolean {
  const msg = getErrorMessage(err, '')
  return msg.includes(`relationship between '${tableA}' and '${tableB}'`) || msg.includes('schema cache')
}

/** Get a display name from profile data, with fallbacks */
function getDisplayName(profile: Record<string, unknown> | null | undefined): string {
  if (!profile) return ''
  const fullName = ((profile.full_name as string) || '').trim()
  if (fullName) return fullName
  const email = ((profile.email as string) || '').trim()
  if (email) return email.split('@')[0]
  return ''
}

/** Hydrate thread members: fetch profiles and professionals. For professionals, ALWAYS use business_name as display name. */
export async function hydrateProfilesByUserId(
  supabase: SupabaseClient,
  rows: Array<{ user_id: string; [k: string]: unknown }>
): Promise<Array<{ user_id: string; [k: string]: unknown; profile: unknown }>> {
  const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)))
  if (!ids.length) return rows as Array<{ user_id: string; [k: string]: unknown; profile: unknown }>

  const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
  const byId = new Map((profiles || []).map((p: { id: string }) => [p.id, p]))

  // Ensure all profiles have a displayable name (use email fallback if full_name is empty)
  for (const [id, profile] of byId.entries()) {
    const p = profile as Record<string, unknown>
    const displayName = getDisplayName(p)
    if (displayName && displayName !== ((p.full_name as string) || '').trim()) {
      byId.set(id, { ...p, full_name: displayName })
    }
  }

  // Fetch ALL professionals for these users - professionals ALWAYS show business_name as contact name
  const { data: pros } = await supabase
    .from('professionals')
    .select('auth_user_id, business_name, type, is_active, wilaya, is_verified, status')
    .in('auth_user_id', ids)
  for (const p of pros || []) {
    const aid = (p as { auth_user_id?: string })?.auth_user_id
    if (!aid) continue
    const existing = byId.get(aid) as Record<string, unknown> | undefined
    const businessName = (p as { business_name?: string }).business_name || 'Unknown User'
    if (!existing) {
      byId.set(aid, {
        id: aid,
        full_name: businessName,
        avatar_url: null,
        user_type: (p as { type?: string }).type || 'doctor',
        is_online: !!(p as { is_active?: boolean }).is_active,
        wilaya: (p as { wilaya?: string }).wilaya || null,
        is_verified: !!(p as { is_verified?: boolean }).is_verified || (p as { status?: string }).status === 'verified',
      })
    } else {
      // Professional: override full_name with business_name (business name is the contact name)
      byId.set(aid, { ...existing, full_name: businessName })
    }
  }

  return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }))
}

/** Hydrate message rows with sender profile. For professionals, ALWAYS use business_name as display name. */
export async function hydrateSendersById(
  supabase: SupabaseClient,
  rows: Array<{ sender_id: string; [k: string]: unknown }>
): Promise<Array<{ sender_id: string; [k: string]: unknown; sender: unknown }>> {
  const ids = Array.from(new Set(rows.map((r) => r.sender_id).filter(Boolean)))
  if (!ids.length) return rows as Array<{ sender_id: string; [k: string]: unknown; sender: unknown }>

  const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
  const byId = new Map((profiles || []).map((p: { id: string }) => [p.id, p]))

  // Ensure all profiles have a displayable name (use email fallback if full_name is empty)
  for (const [id, profile] of byId.entries()) {
    const p = profile as Record<string, unknown>
    const displayName = getDisplayName(p)
    if (displayName && displayName !== ((p.full_name as string) || '').trim()) {
      byId.set(id, { ...p, full_name: displayName })
    }
  }

  // Fetch ALL professionals - professionals ALWAYS show business_name as contact name
  const { data: pros } = await supabase
    .from('professionals')
    .select('auth_user_id, business_name, type, is_active, wilaya, is_verified, status')
    .in('auth_user_id', ids)
  for (const p of pros || []) {
    const aid = (p as { auth_user_id?: string })?.auth_user_id
    if (!aid) continue
    const existing = byId.get(aid) as Record<string, unknown> | undefined
    const businessName = (p as { business_name?: string }).business_name || 'Unknown User'
    if (!existing) {
      byId.set(aid, {
        id: aid,
        full_name: businessName,
        avatar_url: null,
        user_type: (p as { type?: string }).type || 'doctor',
        is_online: !!(p as { is_active?: boolean }).is_active,
        wilaya: (p as { wilaya?: string }).wilaya || null,
        is_verified: !!(p as { is_verified?: boolean }).is_verified || (p as { status?: string }).status === 'verified',
      })
    } else {
      // Professional: override full_name with business_name
      byId.set(aid, { ...existing, full_name: businessName })
    }
  }

  return rows.map((r) => ({ ...r, sender: byId.get(r.sender_id) ?? null }))
}

/** Ensure other_user uses business_name when the user is a professional, and always has a displayable name. */
export async function ensureOtherUserBusinessName(
  supabase: SupabaseClient,
  userId: string,
  profile: Record<string, unknown> | null
): Promise<Record<string, unknown> | null> {
  if (!profile) return null
  
  // First check if this is a professional - use business_name
  const { data: prof } = await supabase
    .from('professionals')
    .select('auth_user_id, business_name, type')
    .eq('auth_user_id', userId)
    .maybeSingle()
  if (prof && (prof as { business_name?: string }).business_name) {
    return { ...profile, full_name: (prof as { business_name: string }).business_name }
  }
  
  // For non-professionals, ensure we have a displayable name (use email fallback)
  const displayName = getDisplayName(profile)
  if (displayName && displayName !== ((profile.full_name as string) || '').trim()) {
    return { ...profile, full_name: displayName }
  }
  
  return profile
}
