import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15MB

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status })
}

async function requireAuth() {
  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  return { supabase, userId }
}

async function requireThreadMember(admin: ReturnType<typeof createAdminClient>, threadId: string, userId: string) {
  const { data: mem } = await admin
    .from('chat_thread_members')
    .select('user_id, role, muted')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .maybeSingle()
  return mem
}

export async function GET(req: NextRequest) {
  const { supabase, userId } = await requireAuth()
  if (!userId) return json(401, { ok: false, error: 'Unauthorized' })

  const type = req.nextUrl.searchParams.get('type') || 'threads'
  const threadId = req.nextUrl.searchParams.get('threadId') || undefined
  const cursor = req.nextUrl.searchParams.get('cursor') || undefined
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 40), 80)

  // Threads list (includes unread, last message) via RPC if available, else fallback
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
      const p = profileMap.get(m.user_id)
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

    // pinned messages for this user (best effort)
    const { data: pinned } = await supabase
      .from('chat_pinned_messages')
      .select('message_id, created_at')
      .eq('user_id', userId)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(20)

    return json(200, { ok: true, members: enrichedMembers, attachments, pinned: pinned || [] })
  }

  // Message search (full-text if enabled; fallback to ILIKE)
  if (type === 'search') {
    if (!threadId) return json(400, { ok: false, error: 'threadId required' })
    const q = (req.nextUrl.searchParams.get('q') || '').trim()
    if (!q) return json(200, { ok: true, results: [] })

    // Try tsvector search if column exists (will error if not)
    const tryTs = await supabase
      .from('chat_messages')
      .select('id, thread_id, sender_id, content, created_at')
      // @ts-ignore - supabase-js supports textSearch
      .textSearch('content_tsv', q, { type: 'websearch' })
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!tryTs.error) {
      return json(200, { ok: true, results: tryTs.data || [] })
    }

    const { data } = await supabase
      .from('chat_messages')
      .select('id, thread_id, sender_id, content, created_at')
      .eq('thread_id', threadId)
      .ilike('content', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(50)

    return json(200, { ok: true, results: data || [] })
  }

  return json(400, { ok: false, error: 'Unknown type' })
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await requireAuth()
    const admin = createAdminClient()

    if (!userId) return json(401, { ok: false, error: 'Unauthorized' })

    const body = await req.json()
    const { action } = body
    if (!action) return json(400, { ok: false, error: 'Missing action' })

    if (action === 'thread.openDirect') {
      const { otherUserId } = body
      if (!otherUserId) return json(400, { ok: false, error: 'Missing otherUserId' })
      if (otherUserId === userId) return json(400, { ok: false, error: 'Cannot DM yourself' })

      // block check (best effort)
      const { data: blocked } = await supabase
        .from('chat_blocks')
        .select('blocker_id')
        .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`)
        .limit(1)

      if (blocked && blocked.length) return json(403, { ok: false, error: 'User is blocked' })

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
      if (unique.length < 3) return json(400, { ok: false, error: 'Group must have at least 3 members' })

      const { data: thread, error: threadErr } = await admin
        .from('chat_threads')
        .insert({ type: 'group', title, created_by: userId })
        .select('id')
        .single()

      if (threadErr || !thread) return json(500, { ok: false, error: threadErr?.message || 'Group create failed' })

      await admin.from('chat_thread_members').insert(
        unique.map((id: string) => ({ thread_id: thread.id, user_id: id, role: id === userId ? 'owner' : 'member' }))
      )

      return json(200, { ok: true, threadId: thread.id })
    }

    if (action === 'message.send') {
      const threadId = body.threadId as string
      const content = (body.content as string | null) ?? null
      const replyToMessageId = (body.replyToMessageId as string | null) ?? null
      const attachments = (body.attachments as Array<{ fileName: string; fileType: string; fileSize?: number }>) || []
      if (!threadId) return json(400, { ok: false, error: 'Missing threadId' })
      if (!content && attachments.length === 0) return json(400, { ok: false, error: 'Nothing to send' })

      // Must be a member of the thread
      const member = await requireThreadMember(admin, threadId, userId)
      if (!member) return json(403, { ok: false, error: 'Not a thread member' })

      // enforce 15MB
      for (const a of attachments) {
        if (a.fileSize && a.fileSize > MAX_FILE_SIZE_BYTES) {
          return json(413, { ok: false, error: `File too large. Max size is 15MB.` })
        }
      }

      const messageType =
        attachments.length
          ? (attachments[0].fileType?.startsWith('image/') ? 'image' : 'file')
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

      if (!attachments.length) return json(200, { ok: true, messageId: msg.id })

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
      const messageId = body.messageId as string
      const content = String(body.content || '').trim()
      if (!messageId) return json(400, { ok: false, error: 'Missing messageId' })
      if (!content) return json(400, { ok: false, error: 'Content required' })

      const { data: msg } = await admin
        .from('chat_messages')
        .select('id, sender_id, created_at, thread_id, is_deleted')
        .eq('id', messageId)
        .maybeSingle()

      if (!msg) return json(404, { ok: false, error: 'Message not found' })
      if (msg.sender_id !== userId) return json(403, { ok: false, error: 'Not allowed' })
      if (msg.is_deleted) return json(400, { ok: false, error: 'Message deleted' })

      // Default policy: 60 minutes edit window (super-admin controls can override later)
      const createdAt = new Date(msg.created_at).getTime()
      if (Date.now() - createdAt > 60 * 60 * 1000) return json(403, { ok: false, error: 'Edit window expired' })

      const { error } = await admin
        .from('chat_messages')
        .update({ content, is_edited: true, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', userId)

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true })
    }

    if (action === 'file.getDownloadUrl') {
      const storagePath = body.storagePath as string
      if (!storagePath) return json(400, { ok: false, error: 'Missing storagePath' })

      const { data: signed, error } = await admin.storage
        .from('chat-attachments')
        .createSignedUrl(storagePath, 60)

      if (error || !signed) return json(500, { ok: false, error: error?.message || 'Signed download failed' })
      return json(200, { ok: true, url: signed.signedUrl })
    }

    if (action === 'thread.setMuted') {
      const threadId = body.threadId as string
      const muted = Boolean(body.muted)
      if (!threadId) return json(400, { ok: false, error: 'Missing threadId' })

      const { error } = await supabase
        .from('chat_thread_members')
        .update({ muted })
        .eq('thread_id', threadId)
        .eq('user_id', userId)

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true, muted })
    }

    if (action === 'thread.leave') {
      const threadId = body.threadId as string
      if (!threadId) return json(400, { ok: false, error: 'Missing threadId' })

      const { data: thread } = await admin.from('chat_threads').select('id,type').eq('id', threadId).maybeSingle()
      if (!thread) return json(404, { ok: false, error: 'Thread not found' })
      if (thread.type !== 'group') return json(400, { ok: false, error: 'Cannot leave a direct thread' })

      const { error } = await supabase.from('chat_thread_members').delete().eq('thread_id', threadId).eq('user_id', userId)
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

    if (action === 'message.togglePinned') {
      const messageId = body.messageId as string
      const threadId = body.threadId as string
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

    if (action === 'message.deleteForMe') {
      const messageId = body.messageId as string
      if (!messageId) return json(400, { ok: false, error: 'Missing messageId' })

      // Ensure user has access to the message via thread membership (best effort)
      const { data: msg } = await admin.from('chat_messages').select('id, thread_id').eq('id', messageId).maybeSingle()
      if (!msg) return json(404, { ok: false, error: 'Message not found' })
      const member = await requireThreadMember(admin, msg.thread_id, userId)
      if (!member) return json(403, { ok: false, error: 'Not allowed' })

      // Insert ignore duplicates (requires unique constraint on (user_id, message_id))
      const { error } = await admin
        .from('chat_message_deletes')
        .upsert({ user_id: userId, message_id: messageId }, { onConflict: 'user_id,message_id' })
      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true })
    }

    if (action === 'message.delete') {
      const messageId = body.messageId as string
      if (!messageId) return json(400, { ok: false, error: 'Missing messageId' })

      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), content: null })
        .eq('id', messageId)
        .eq('sender_id', userId)

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true })
    }

    if (action === 'user.blockToggle') {
      const otherUserId = body.otherUserId as string
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

    return json(400, { ok: false, error: `Unknown action: ${action}` })
  } catch (err: any) {
    return json(500, { ok: false, error: err?.message || 'Server error' })
  }
}
