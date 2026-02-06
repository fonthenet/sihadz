import { NextRequest, NextResponse } from 'next/server'
import { processPendingWebhooks } from '@/lib/inventory/webhooks'

/**
 * POST /api/pharmacy/inventory/webhooks/process
 * Process pending webhook deliveries (call from cron or manually)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal cron secret (optional security)
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const processed = await processPendingWebhooks(limit)

    return NextResponse.json({
      success: true,
      processed,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
