/**
 * Lightweight connectivity ping
 * Used by offline sync to verify real network reachability (not just navigator.onLine)
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return NextResponse.json({ ok: true, t: Date.now() })
}
