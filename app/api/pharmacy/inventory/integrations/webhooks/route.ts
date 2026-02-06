import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { WebhookEventType } from '@/lib/inventory/webhooks'

interface WebhookConfig {
  url: string
  secret?: string
  events?: WebhookEventType[]
}

/**
 * GET /api/pharmacy/inventory/integrations/webhooks
 * List webhook integrations for the pharmacy
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

    const { data: webhooks, error } = await supabase
      .from('pharmacy_integrations')
      .select('id, name, config, is_active, last_sync_at, last_sync_status, last_error, created_at')
      .eq('pharmacy_id', professional.id)
      .eq('integration_type', 'webhook')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Mask secrets in response
    const safeWebhooks = (webhooks || []).map(w => ({
      ...w,
      config: {
        ...w.config,
        secret: w.config?.secret ? '********' : undefined
      }
    }))

    return NextResponse.json({ webhooks: safeWebhooks })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/pharmacy/inventory/integrations/webhooks
 * Create a new webhook integration
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

    const body = await request.json()
    const { name, url, secret, events } = body

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const config: WebhookConfig = { url }
    if (secret) config.secret = secret
    if (events?.length) config.events = events

    const { data: webhook, error } = await supabase
      .from('pharmacy_integrations')
      .insert({
        pharmacy_id: professional.id,
        integration_type: 'webhook',
        name,
        config,
        is_active: true,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      webhook: {
        ...webhook,
        config: { ...webhook.config, secret: secret ? '********' : undefined }
      },
      message: 'Webhook created successfully'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/pharmacy/inventory/integrations/webhooks
 * Update a webhook integration
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { id, name, url, secret, events, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 })
    }

    // Get existing
    const { data: existing } = await supabase
      .from('pharmacy_integrations')
      .select('config')
      .eq('id', id)
      .eq('pharmacy_id', professional.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const config: WebhookConfig = { ...existing.config }
    if (url) config.url = url
    if (secret) config.secret = secret
    if (events !== undefined) config.events = events

    const updateData: any = {
      config,
      updated_at: new Date().toISOString()
    }
    if (name) updateData.name = name
    if (is_active !== undefined) updateData.is_active = is_active

    const { error } = await supabase
      .from('pharmacy_integrations')
      .update(updateData)
      .eq('id', id)
      .eq('pharmacy_id', professional.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Webhook updated' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/pharmacy/inventory/integrations/webhooks
 * Delete a webhook integration
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('pharmacy_integrations')
      .delete()
      .eq('id', id)
      .eq('pharmacy_id', professional.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Webhook deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
