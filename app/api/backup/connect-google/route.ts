/**
 * GET /api/backup/connect-google - Start Google OAuth flow
 * POST /api/backup/connect-google - Handle OAuth callback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { 
  isGoogleDriveConfigured,
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  connectGoogleDrive
} from '@/lib/backup'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if Google Drive is configured
    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        { error: 'Google Drive integration is not configured' },
        { status: 503 }
      )
    }
    
    // Generate state token for CSRF protection
    const state = Buffer.from(JSON.stringify({
      user_id: user.id,
      timestamp: Date.now()
    })).toString('base64')
    
    // Use public origin (handles proxy so redirect goes to sihadz.com, not localhost)
    const { getRequestOrigin } = await import('@/lib/request-origin')
    const origin = getRequestOrigin(request)
    
    // Get OAuth URL
    const authUrl = getGoogleAuthUrl(state, origin)
    
    return NextResponse.json({ auth_url: authUrl })
    
  } catch (error: any) {
    console.error('Google connect error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start Google connection' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse request body
    const { code, state } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 })
    }
    
    // Verify state token
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        if (stateData.user_id !== user.id) {
          return NextResponse.json({ error: 'Invalid state token' }, { status: 400 })
        }
        // Check if state is not too old (5 minutes)
        if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
          return NextResponse.json({ error: 'State token expired' }, { status: 400 })
        }
      } catch (e) {
        return NextResponse.json({ error: 'Invalid state token' }, { status: 400 })
      }
    }
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)
    
    // Save connection
    const connection = await connectGoogleDrive(user.id, tokens)
    
    return NextResponse.json({
      success: true,
      email: connection.email,
      folder_name: connection.folder_name
    })
    
  } catch (error: any) {
    console.error('Google callback error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to connect Google Drive' },
      { status: 500 }
    )
  }
}
