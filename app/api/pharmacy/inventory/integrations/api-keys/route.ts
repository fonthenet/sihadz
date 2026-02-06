import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateApiKey, hashApiKey, isValidScope, getDefaultScopes } from '@/lib/inventory/api-keys'
import type { ApiKeyScope, CreateApiKeyInput } from '@/lib/inventory/api-keys'

/**
 * GET /api/pharmacy/inventory/integrations/api-keys
 * List API keys for the pharmacy (excludes actual keys, only prefixes)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('type', 'pharmacy')
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

    const { data: keys, error } = await supabase
      .from('pharmacy_api_keys')
      .select('id, key_prefix, name, scopes, rate_limit_per_minute, is_active, expires_at, last_used_at, usage_count, created_at')
      .eq('pharmacy_id', professional.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ keys: keys || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/inventory/integrations/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('type', 'pharmacy')
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

    const body: CreateApiKeyInput = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Validate scopes
    const scopes = body.scopes || getDefaultScopes()
    for (const scope of scopes) {
      if (!isValidScope(scope)) {
        return NextResponse.json({ error: `Invalid scope: ${scope}` }, { status: 400 })
      }
    }

    // Generate key
    const { key, prefix, hash } = generateApiKey()

    // Calculate expiry
    let expiresAt: string | null = null
    if (body.expires_in_days && body.expires_in_days > 0) {
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + body.expires_in_days)
      expiresAt = expiry.toISOString()
    }

    // Insert
    const { data: apiKey, error } = await supabase
      .from('pharmacy_api_keys')
      .insert({
        pharmacy_id: professional.id,
        key_prefix: prefix,
        key_hash: hash,
        name: body.name,
        scopes,
        rate_limit_per_minute: body.rate_limit_per_minute || 60,
        expires_at: expiresAt,
        is_active: true
      })
      .select('id, key_prefix, name, scopes, expires_at, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return with full key (only shown once!)
    return NextResponse.json({
      success: true,
      api_key: {
        ...apiKey,
        key // Full key, show only once!
      },
      message: 'API key created. Copy the key now - it will not be shown again.'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/pharmacy/inventory/integrations/api-keys
 * Revoke an API key
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('type', 'pharmacy')
      .single()

    if (!professional) {
      return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('pharmacy_api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: user.id
      })
      .eq('id', keyId)
      .eq('pharmacy_id', professional.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'API key revoked' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
