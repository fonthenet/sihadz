import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { emitWebhookEvent } from '@/lib/inventory/webhooks'

/**
 * POST /api/pharmacy/inventory/webhooks/test
 * Send a test webhook to verify integration
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

    // Emit test event
    await emitWebhookEvent(professional.id, 'product.created', {
      test: true,
      message: 'This is a test webhook from your pharmacy inventory system',
      product: {
        id: 'test-123',
        name: 'Test Product',
        barcode: '0000000000000',
        selling_price: 100
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Test webhook queued. Check your webhook endpoint for delivery.'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
