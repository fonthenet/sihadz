import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15MB

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status })
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return json(401, { ok: false, error: 'Unauthorized' })

  const type = req.nextUrl.searchParams.get('type') || 'threads'
  const threadId = req.nextUrl.searchParams.get('threadId') || undefined
  const cursor = req.nextUrl.searchParams.get('cursor') || undefined
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 40), 80)

  // Threads list (includes unread, last message) via RPC
  if (type === 'threads') {
    const { data, error } = await supabase.rpc('chat_get_threads', { p_user_id: userId })
    if (error) return json(500, { ok: false, error: error.message })
    return json(200, { ok: true, threads: data || [] })
  }

  // Messages (paged by created_at)
  if (type === 'messages') {
    if (!threadId) return json(400, { ok: false, error: 'threadId required' })
    let q = supabase
      .from('chat_messages')
      .select(`*, chat_attachments(*)`)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) q = q.lt('created_at', cursor)

    const { data, error } = await q
    if (error) return json(500, { ok: false, error: error.message })

    const rows = (data || []).reverse()
    const last = rows[rows.length - 1]
    if (last?.id) {
      await supabase
        .from('chat_thread_members')
        .update({ last_read_message_id: last.id })
        .eq('thread_id', threadId)
        .eq('user_id', userId)
    }

    return json(200, { ok: true, messages: rows, nextCursor: rows[0]?.created_at || null })
  }

  // Thread info for right panel: members + recent files + pinned messages
  if (type === 'threadInfo') {
    if (!threadId) return json(400, { ok: false, error: 'threadId required' })

    const { data: members, error: memErr } = await supabase
      .from('chat_thread_members')
      .select('user_id, role, joined_at, muted, last_read_message_id')
      .eq('thread_id', threadId)

    if (memErr) return json(500, { ok: false, error: memErr.message })

    const memberIds = (members || []).map((m: any) => m.user_id)
    const { data: profiles } = await supabase
      .from('directory_users')
      .select('user_id, display_name, entity_type, avatar_url')
      .in('user_id', memberIds)

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]))

    const enrichedMembers = (members || []).map((m: any) => {
      const p = profileMap.get(m.user_id) as { display_name?: string; entity_type?: string; avatar_url?: string } | undefined
      return {
        ...m,
        display_name: p?.display_name || 'User',
        entity_type: p?.entity_type || 'business',
        avatar_url: p?.avatar_url || null,
      }
    })

    // recent files
    const { data: files } = await supabase
      .from('chat_messages')
      .select('id, created_at, chat_attachments(*)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(30)

    const attachments = (files || [])
      .flatMap((m: any) => (m.chat_attachments || []).map((a: any) => ({ ...a, message_created_at: m.created_at })))
      .slice(0, 30)

    // pinned messages for this user
    const { data: pinned } = await supabase
      .from('chat_pinned_messages')
      .select('message_id, created_at')
      .eq('user_id', userId)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(20)

    return json(200, { ok: true, members: enrichedMembers, attachments, pinned: pinned || [] })
  }

  // Message search
  if (type === 'search') {
    if (!threadId) return json(400, { ok: false, error: 'threadId required' })
    const q = (req.nextUrl.searchParams.get('q') || '').trim()
    if (!q) return json(200, { ok: true, results: [] })

    const { data } = await supabase
      .from('chat_messages')
      .select('id, thread_id, sender_id, content, created_at')
      .eq('thread_id', threadId)
      .ilike('content', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(50)

    return json(200, { ok: true, results: data || [] })
  }

  // Get chat settings
  if (type === 'settings') {
    const { data, error } = await supabase
      .from('chat_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) return json(500, { ok: false, error: error.message })
    return json(200, { ok: true, settings: data || null })
  }

  // Get quick replies
  if (type === 'quickReplies') {
    const { data, error } = await supabase
      .from('chat_quick_replies')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) return json(500, { ok: false, error: error.message })
    return json(200, { ok: true, quickReplies: data || [] })
  }

  // Get user presence
  if (type === 'presence') {
    const targetUserId = req.nextUrl.searchParams.get('userId')
    if (!targetUserId) return json(400, { ok: false, error: 'userId required' })

    const { data, error } = await supabase
      .from('user_presence')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (error) return json(500, { ok: false, error: error.message })
    return json(200, { ok: true, presence: data || { status: 'offline', last_seen_at: null } })
  }

  // Search directory (providers and optionally patients)
  if (type === 'directory') {
    const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase()
    const includePatients = req.nextUrl.searchParams.get('includePatients') === 'true'

    if (!q) return json(200, { ok: true, results: [] })

    const { data, error } = await supabase
      .from('directory_users')
      .select('user_id, display_name, entity_type, avatar_url, is_active')
      .ilike('search_text', `%${q}%`)
      .limit(25)

    if (error) return json(500, { ok: false, error: error.message })

    const allowed = new Set(['doctor', 'pharmacy', 'laboratory', 'clinic', 'business', 'admin'])
    if (includePatients) allowed.add('patient')

    const filtered = (data || [])
      .filter((u: any) => u.user_id !== userId)
      .filter((u: any) => allowed.has(String(u.entity_type)))
      .filter((u: any) => u.is_active !== false)

    return json(200, { ok: true, results: filtered })
  }

  return json(400, { ok: false, error: 'Unknown type' })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const admin = createAdminClient()

    const { data: auth } = await supabase.auth.getUser()
    const userId = auth?.user?.id
    if (!userId) return json(401, { ok: false, error: 'Unauthorized' })

    const body = await req.json()
    const { action } = body
    if (!action) return json(400, { ok: false, error: 'Missing action' })

    // ==================== THREAD ACTIONS ====================

    if (action === 'thread.openDirect') {
      const { otherUserId } = body
      if (!otherUserId) return json(400, { ok: false, error: 'Missing otherUserId' })
      if (otherUserId === userId) return json(400, { ok: false, error: 'Cannot DM yourself' })

      // Check if blocked
      const { data: blocked } = await supabase
        .from('chat_blocks')
        .select('blocker_id')
        .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`)
        .limit(1)

      if (blocked && blocked.length) return json(403, { ok: false, error: 'User is blocked' })

      // Check if other user accepts chats
      const { data: otherSettings } = await admin
        .from('chat_settings')
        .select('accept_new_chats, who_can_contact')
        .eq('user_id', otherUserId)
        .maybeSingle()

      // Find existing direct thread
      const { data: myMemberships } = await admin
        .from('chat_thread_members')
        .select('thread_id')
        .eq('user_id', userId)

      const ids = (myMemberships || []).map((x: any) => x.thread_id)
      if (ids.length) {
        const { data: candidates } = await admin
          .from('chat_threads')
          .select('id,type')
          .in('id', ids)
          .eq('type', 'direct')

        for (const t of candidates || []) {
          const { data: members } = await admin
            .from('chat_thread_members')
            .select('user_id')
            .eq('thread_id', t.id)

          const set = new Set((members || []).map((m: any) => m.user_id))
          if (set.has(userId) && set.has(otherUserId) && set.size === 2) {
            return json(200, { ok: true, threadId: t.id })
          }
        }
      }

      // Create new thread
      const { data: thread, error: threadErr } = await admin
        .from('chat_threads')
        .insert({ type: 'direct', created_by: userId })
        .select('id')
        .single()

      if (threadErr || !thread) return json(500, { ok: false, error: threadErr?.message || 'Thread create failed' })

      await admin.from('chat_thread_members').insert([
        { thread_id: thread.id, user_id: userId, role: 'member' },
        { thread_id: thread.id, user_id: otherUserId, role: 'member' },
      ])

      return json(200, { ok: true, threadId: thread.id })
    }

    if (action === 'thread.createGroup') {
      const title = String(body.title || '').trim()
      const memberIds = Array.isArray(body.memberIds) ? body.memberIds : []
      const unique = Array.from(new Set([userId, ...memberIds])).filter(Boolean)

      if (!title) return json(400, { ok: false, error: 'Missing title' })
      if (unique.length < 2) return json(400, { ok: false, error: 'Group must have at least 2 members' })

      const { data: thread, error: threadErr } = await admin
        .from('chat_threads')
        .insert({ type: 'group', title, created_by: userId })
        .select('id')
        .single()

      if (threadErr || !thread) return json(500, { ok: false, error: threadErr?.message || 'Group create failed' })

      await admin.from('chat_thread_members').insert(
        unique.map((id: string, i: number) => ({
          thread_id: thread.id,
          user_id: id,
          role: i === 0 ? 'admin' : 'member', // Creator is admin
        }))
      )

      return json(200, { ok: true, threadId: thread.id })
    }

    if (action === 'thread.leave') {
      const { threadId } = body
      if (!threadId) return json(400, { ok: false, error: 'Missing threadId' })

      const { error } = await supabase
        .from('chat_thread_members')
        .update({ left_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('user_id', userId)

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true })
    }

    if (action === 'thread.mute') {
      const { threadId, muted, mutedUntil } = body
      if (!threadId) return json(400, { ok: false, error: 'Missing threadId' })

      const { error } = await supabase
        .from('chat_thread_members')
        .update({ muted: !!muted, muted_until: mutedUntil || null })
        .eq('thread_id', threadId)
        .eq('user_id', userId)

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true })
    }

    if (action === 'thread.togglePinned') {
      const threadId = body.threadId as string
      if (!threadId) return json(400, { ok: false, error: 'Missing threadId' })

      const { data: existing } = await supabase
        .from('chat_pinned_threads')
        .select('thread_id')
        .eq('user_id', userId)
        .eq('thread_id', threadId)
        .maybeSingle()

      if (existing) {
        await supabase.from('chat_pinned_threads').delete().eq('user_id', userId).eq('thread_id', threadId)
        return json(200, { ok: true, pinned: false })
      } else {
        const { error } = await supabase.from('chat_pinned_threads').insert({ user_id: userId, thread_id: threadId })
        if (error) return json(500, { ok: false, error: error.message })
        return json(200, { ok: true, pinned: true })
      }
    }

    // ==================== MESSAGE ACTIONS ====================

    if (action === 'message.send') {
      const threadId = body.threadId as string
      const content = (body.content as string | null) ?? null
      const replyToMessageId = body.replyToMessageId as string | null
      const attachments = (body.attachments as Array<{ fileName: string; fileType: string; fileSize?: number }>) || []

      if (!threadId) return json(400, { ok: false, error: 'Missing threadId' })
      if (!content && attachments.length === 0) return json(400, { ok: false, error: 'Nothing to send' })

      // Enforce 15MB limit
      for (const a of attachments) {
        if (a.fileSize && a.fileSize > MAX_FILE_SIZE_BYTES) {
          return json(413, { ok: false, error: 'File too large. Max size is 15MB.' })
        }
      }

      const messageType = attachments.length
        ? attachments[0].fileType?.startsWith('image/') ? 'image' : 'file'
        : 'text'

      const { data: msg, error: msgErr } = await admin
        .from('chat_messages')
        .insert({
          thread_id: threadId,
          sender_id: userId,
          content,
          message_type: messageType,
          reply_to_message_id: replyToMessageId,
        })
        .select('id')
        .single()

      if (msgErr || !msg) return json(500, { ok: false, error: msgErr?.message || 'Message insert failed' })

      // Update thread updated_at
      await admin
        .from('chat_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', threadId)

      if (!attachments.length) return json(200, { ok: true, messageId: msg.id })

      // Handle attachments
      const uploads: Array<{ attachmentId: string; storagePath: string; signedUrl: string; token: string }> = []

      for (const a of attachments) {
        const safeName = String(a.fileName || 'file').replace(/[^\w.\-]+/g, '_')
        const storagePath = `${threadId}/${msg.id}/${crypto.randomUUID()}_${safeName}`

        const { data: row, error: attErr } = await admin
          .from('chat_attachments')
          .insert({
            message_id: msg.id,
            file_name: a.fileName,
            file_type: a.fileType,
            file_size: a.fileSize ?? null,
            storage_path: storagePath,
          })
          .select('id, storage_path')
          .single()

        if (attErr || !row) return json(500, { ok: false, error: attErr?.message || 'Attachment insert failed' })

        const { data: signed, error: signErr } = await admin.storage
          .from('chat-attachments')
          .createSignedUploadUrl(storagePath)

        if (signErr || !signed) return json(500, { ok: false, error: signErr?.message || 'Signed upload failed' })

        uploads.push({
          attachmentId: row.id,
          storagePath,
          signedUrl: signed.signedUrl,
          token: signed.token,
        })
      }

      return json(200, { ok: true, messageId: msg.id, uploads })
    }

    if (action === 'message.edit') {
      const { messageId, content } = body
      if (!messageId) return json(400, { ok: false, error: 'Missing messageId' })

      const { error } = await supabase
        .from('chat_messages')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('sender_id', userId)

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true })
    }

    if (action === 'message.delete') {
      const { messageId } = body
      if (!messageId) return json(400, { ok: false, error: 'Missing messageId' })

      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), content: null })
        .eq('id', messageId)
        .eq('sender_id', userId)

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true })
    }

    if (action === 'message.deleteForMe') {
      const { messageId } = body
      if (!messageId) return json(400, { ok: false, error: 'Missing messageId' })

      const { error } = await supabase
        .from('chat_message_deletes')
        .insert({ user_id: userId, message_id: messageId })

      if (error && !error.message.includes('duplicate')) {
        return json(500, { ok: false, error: error.message })
      }
      return json(200, { ok: true })
    }

    if (action === 'message.togglePinned') {
      const { messageId, threadId } = body
      if (!messageId || !threadId) return json(400, { ok: false, error: 'Missing messageId/threadId' })

      const { data: existing } = await supabase
        .from('chat_pinned_messages')
        .select('message_id')
        .eq('user_id', userId)
        .eq('thread_id', threadId)
        .eq('message_id', messageId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('chat_pinned_messages')
          .delete()
          .eq('user_id', userId)
          .eq('thread_id', threadId)
          .eq('message_id', messageId)
        return json(200, { ok: true, pinned: false })
      } else {
        const { error } = await supabase
          .from('chat_pinned_messages')
          .insert({ user_id: userId, thread_id: threadId, message_id: messageId })
        if (error) return json(500, { ok: false, error: error.message })
        return json(200, { ok: true, pinned: true })
      }
    }

    // ==================== FILE ACTIONS ====================

    if (action === 'file.getDownloadUrl') {
      const storagePath = body.storagePath as string
      if (!storagePath) return json(400, { ok: false, error: 'Missing storagePath' })

      const { data: signed, error } = await admin.storage
        .from('chat-attachments')
        .createSignedUrl(storagePath, 60)

      if (error || !signed) return json(500, { ok: false, error: error?.message || 'Signed download failed' })
      return json(200, { ok: true, url: signed.signedUrl })
    }

    // ==================== USER ACTIONS ====================

    if (action === 'user.blockToggle') {
      const { otherUserId } = body
      if (!otherUserId) return json(400, { ok: false, error: 'Missing otherUserId' })

      const { data: existing } = await supabase
        .from('chat_blocks')
        .select('blocked_id')
        .eq('blocker_id', userId)
        .eq('blocked_id', otherUserId)
        .maybeSingle()

      if (existing) {
        await supabase.from('chat_blocks').delete().eq('blocker_id', userId).eq('blocked_id', otherUserId)
        return json(200, { ok: true, blocked: false })
      } else {
        const { error } = await supabase.from('chat_blocks').insert({ blocker_id: userId, blocked_id: otherUserId })
        if (error) return json(500, { ok: false, error: error.message })
        return json(200, { ok: true, blocked: true })
      }
    }

    if (action === 'user.report') {
      const { otherUserId, reason, messageId } = body
      if (!otherUserId) return json(400, { ok: false, error: 'Missing otherUserId' })

      // For now, just log the report. In production, this would go to a reports table
      console.log('[CHAT REPORT]', { reporterId: userId, reportedId: otherUserId, reason, messageId })
      return json(200, { ok: true })
    }

    // ==================== SETTINGS ACTIONS ====================

    if (action === 'settings.update') {
      const settings = body.settings as Record<string, any>
      if (!settings) return json(400, { ok: false, error: 'Missing settings' })

      const { error } = await supabase
        .from('chat_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString(),
        })

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true })
    }

    if (action === 'presence.update') {
      const { status, statusMessage } = body

      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          status: status || 'online',
          status_message: statusMessage,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true })
    }

    // ==================== QUICK REPLIES ====================

    if (action === 'quickReply.create') {
      const { title, content, category, shortcut } = body
      if (!title || !content) return json(400, { ok: false, error: 'Missing title or content' })

      const { data, error } = await supabase
        .from('chat_quick_replies')
        .insert({
          user_id: userId,
          title,
          content,
          category: category || null,
          shortcut: shortcut || null,
        })
        .select('id')
        .single()

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true, id: data.id })
    }

    if (action === 'quickReply.update') {
      const { id, title, content, category, shortcut } = body
      if (!id) return json(400, { ok: false, error: 'Missing id' })

      const { error } = await supabase
        .from('chat_quick_replies')
        .update({
          title,
          content,
          category: category || null,
          shortcut: shortcut || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true })
    }

    if (action === 'quickReply.delete') {
      const { id } = body
      if (!id) return json(400, { ok: false, error: 'Missing id' })

      const { error } = await supabase
        .from('chat_quick_replies')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true })
    }

    return json(400, { ok: false, error: `Unknown action: ${action}` })
  } catch (err: any) {
    console.error('[Messaging API Error]', err)
    return json(500, { ok: false, error: err?.message || 'Server error' })
  }
}
