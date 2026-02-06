/**
 * GET /api/backup/oauth/callback
 * Handle Google OAuth callback (redirect from Google)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { 
  exchangeCodeForTokens,
  connectGoogleDrive
} from '@/lib/backup'

export async function GET(request: NextRequest) {
  const { getRequestOrigin } = await import('@/lib/request-origin')
  const origin = getRequestOrigin(request)
  
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.redirect(new URL('/login?error=auth_required', origin))
    }
    
    // Get code and state from URL
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    // Handle errors from Google
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Authorization failed'
      return NextResponse.redirect(
        `${origin}/professional/dashboard/settings?backup_error=${encodeURIComponent(errorDescription)}`
      )
    }
    
    if (!code) {
      return NextResponse.redirect(
        `${origin}/professional/dashboard/settings?backup_error=Missing+authorization+code`
      )
    }
    
    // Verify state token
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        if (stateData.user_id !== user.id) {
          return NextResponse.redirect(
            `${origin}/professional/dashboard/settings?backup_error=Invalid+state+token`
          )
        }
        // Check if state is not too old (10 minutes for OAuth flow)
        if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
          return NextResponse.redirect(
            `${origin}/professional/dashboard/settings?backup_error=Authorization+expired`
          )
        }
      } catch (e) {
        return NextResponse.redirect(
          `${origin}/professional/dashboard/settings?backup_error=Invalid+state+token`
        )
      }
    }
    
    // Exchange code for tokens (origin must match redirect_uri used in auth URL)
    const tokens = await exchangeCodeForTokens(code, origin)
    
    // Save connection
    await connectGoogleDrive(user.id, tokens)
    
    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${origin}/professional/dashboard/settings?backup_success=google_connected`
    )
    
  } catch (error: any) {
    console.error('OAuth callback error:', error)
    const { getRequestOrigin } = await import('@/lib/request-origin')
    const origin = getRequestOrigin(request)
    return NextResponse.redirect(
      `${origin}/professional/dashboard/settings?backup_error=${encodeURIComponent(error.message || 'Connection failed')}`
    )
  }
}
