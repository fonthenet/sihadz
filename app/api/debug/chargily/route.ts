import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const apiKey = process.env.CHARGILY_SECRET_KEY
  
  console.log('[v0] Checking Chargily credentials...')
  console.log('[v0] API Key exists:', !!apiKey)
  console.log('[v0] API Key starts with:', apiKey?.substring(0, 10))
  console.log('[v0] Environment:', process.env.NODE_ENV)

  if (!apiKey) {
    return NextResponse.json({
      status: 'error',
      message: 'CHARGILY_SECRET_KEY not set',
      env: process.env.NODE_ENV,
    })
  }

  // Test the API with a simple request
  try {
    const response = await fetch('https://api.chargily.io/test/api/v2/merchant', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    const data = await response.json()

    return NextResponse.json({
      status: response.ok ? 'success' : 'error',
      statusCode: response.status,
      message: response.ok ? 'Chargily API authenticated' : 'Authentication failed',
      apiResponse: data,
    })
  } catch (error) {
    console.error('[v0] Error testing Chargily API:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
