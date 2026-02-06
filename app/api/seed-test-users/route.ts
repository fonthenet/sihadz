import { NextResponse } from 'next/server'

/** Disabled: fake/test accounts have been removed. Only real user-created data is used. */
export async function POST() {
  return NextResponse.json(
    { error: 'Test account creation is disabled. Use the app to register real professionals.' },
    { status: 410 }
  )
}
