import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createServerClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, attachments } = body

    const { data: newMessage, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: params.id,
        sender_id: user.id,
        message,
        attachments
      })
      .select(`
        *,
        sender:profiles(id, full_name, user_type)
      `)
      .single()

    if (error) throw error

    // Create timeline entry
    await supabase
      .from('ticket_timeline')
      .insert({
        ticket_id: params.id,
        event_type: 'message_sent',
        actor_id: user.id,
        description: 'New message added'
      })

    return NextResponse.json({ message: newMessage })
  } catch (error: any) {
    console.error('[v0] Error sending message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
