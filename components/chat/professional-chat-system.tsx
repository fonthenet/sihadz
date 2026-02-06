'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { createBrowserClient } from '@/lib/supabase/client'
import { useDirectorySearch, useThreadMessages, useThreads } from '@/lib/chat/use-chat'
import type { ChatMessage, DirectoryUser, ThreadListItem } from '@/lib/chat/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImagePreviewDialog } from '@/components/image-preview-dialog'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

import {
  ArrowLeft,
  Check,
  CheckCheck,
  Download,
  Edit3,
  FileText,
  MessageSquare,
  MoreVertical,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Send,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'

interface ProfessionalChatSystemProps {
  userId: string
  userType: string
  userName: string
  className?: string
  isWidget?: boolean
  initialOtherUserId?: string
}

type ThreadView = 'all' | 'groups'

function formatSmartDay(d: Date) {
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, dd MMM yyyy')
}

function formatSmartTime(d: Date) {
  return format(d, 'HH:mm')
}

async function postJson<T = any>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data as T
}

function getThreadTitle(t: ThreadListItem) {
  if (t.thread_type === 'group') return t.title || 'Group'
  return t.other_display_name || t.title || 'Conversation'
}

function getThreadSubtitle(t: ThreadListItem) {
  if (t.thread_type === 'group') return 'Group'
  return t.other_entity_type || ''
}

export function ProfessionalChatSystem({
  userId,
  userType,
  userName,
  className,
  isWidget,
  initialOtherUserId,
}: ProfessionalChatSystemProps) {
  const { toast } = useToast()
  const supabase = useMemo(() => createBrowserClient(), [])

  // Thread list
  const { threads, loading: threadsLoading, refresh: refreshThreads } = useThreads(userId)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [threadView, setThreadView] = useState<ThreadView>('all')
  const [threadFilter, setThreadFilter] = useState('')

  const activeThread = useMemo(() => {
    if (!activeThreadId) return null
    return threads.find((t) => t.thread_id === activeThreadId) || null
  }, [threads, activeThreadId])

  // Messages
  const {
    messages,
    loading: messagesLoading,
    loadingMore,
    loadMore,
    send,
    retrySend,
    deleteMessage,
    deleteMessageForMe,
    editMessage,
    togglePinMessage,
    getDownloadUrl,
    otherLastReadId,
    typingUsers,
    setTyping,
    searchMessages,
  } = useThreadMessages(userId, activeThread?.thread_id || null)

  // Right panel thread info
  const [infoOpen, setInfoOpen] = useState(!isWidget)
  const [threadInfo, setThreadInfo] = useState<null | {
    members: Array<{ user_id: string; display_name: string; entity_type: string; role: string; muted: boolean }>
    attachments: Array<{ id: string; file_name: string; file_type: string; storage_path: string; message_created_at: string }>
    pinned: Array<{ message_id: string; created_at: string }>
  }>(null)

  // Composer state
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null)
  const [editDraft, setEditDraft] = useState('')

  // Search
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const includePatients = userType !== 'patient'
  const { results: directoryResults, loading: directoryLoading } = useDirectorySearch(userId, cmdQuery, includePatients)

  const [threadSearchOpen, setThreadSearchOpen] = useState(false)
  const [threadSearchQuery, setThreadSearchQuery] = useState('')
  const [threadSearchLoading, setThreadSearchLoading] = useState(false)
  const [threadSearchResults, setThreadSearchResults] = useState<Array<{ id: string; sender_id: string; content: string | null; created_at: string }>>(
    []
  )

  // Attachment preview
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState<string>('Attachment')

  // Panels (collapsible)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [mobileShowThreads, setMobileShowThreads] = useState(true)

  // Incoming message notification (sound)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const lastNotifiedMessageIdRef = useRef<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioPrimedRef = useRef(false)

  const playNotification = useCallback(() => {
    if (!soundEnabled) return
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx()
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const now = ctx.currentTime
      const tone = (freq: number, t0: number, dur: number, peak: number) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'
        o.frequency.setValueAtTime(freq, t0)
        g.gain.setValueAtTime(0.0001, t0)
        g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
        o.connect(g)
        g.connect(ctx.destination)
        o.start(t0)
        o.stop(t0 + dur + 0.02)
      }
      tone(740, now, 0.16, 0.05)
      tone(988, now + 0.13, 0.18, 0.04)
    } catch {
      // ignore
    }
  }, [soundEnabled])

  useEffect(() => {
    const prime = () => {
      if (audioPrimedRef.current) return
      audioPrimedRef.current = true
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!Ctx) return
        if (!audioCtxRef.current) audioCtxRef.current = new Ctx()
        const ctx = audioCtxRef.current
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      } catch {}
    }
    window.addEventListener('pointerdown', prime, { once: true })
    window.addEventListener('keydown', prime, { once: true })
    return () => {
      window.removeEventListener('pointerdown', prime)
      window.removeEventListener('keydown', prime)
    }
  }, [])

  // Ctrl/⌘ + K to open command palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k'
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault()
        setCmdOpen(true)
      }
      if (e.key === 'Escape') {
        setThreadSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Auto-open DM if requested (patient→doctor link etc.)
  useEffect(() => {
    ;(async () => {
      if (!initialOtherUserId) return
      try {
        const resp = await postJson<{ ok: true; threadId: string }>('/api/messaging', {
          action: 'thread.openDirect',
          otherUserId: initialOtherUserId,
        })
        await refreshThreads()
        setActiveThreadId(resp.threadId)
        setMobileShowThreads(false)
      } catch (e: any) {
        toast({ title: 'Unable to open chat', description: e?.message || 'Please try again', variant: 'destructive' })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOtherUserId])

  // Thread info panel load
  useEffect(() => {
    ;(async () => {
      if (!activeThread?.thread_id || !infoOpen) {
        setThreadInfo(null)
        return
      }
      const url = `/api/messaging?type=threadInfo&threadId=${encodeURIComponent(activeThread.thread_id)}`
      const res = await fetch(url)
      const data = await res.json().catch(() => null)
      if (!res.ok || data?.ok === false) return
      setThreadInfo(data)
    })()
  }, [activeThread?.thread_id, infoOpen])

  if (activeThread?.thread_id !== prevThreadIdRef.current) {
    prevThreadIdRef.current = activeThread?.thread_id ?? null
    stickToBottomRef.current = true
  }

  // Scroll behavior + incoming notifications - always scroll on open, reload, or new message
  useEffect(() => {
    if (!activeThread?.thread_id) return
    const el = listRef.current
    if (!el) return
    const last = messages[messages.length - 1]
    if (last?.id && last.sender_id !== userId && last.id !== lastNotifiedMessageIdRef.current) {
      lastNotifiedMessageIdRef.current = last.id
      playNotification()
    }

    const shouldScroll = !last || last.sender_id !== userId || stickToBottomRef.current
    if (shouldScroll) {
      el.scrollTop = el.scrollHeight
      const t1 = setTimeout(() => { el.scrollTop = el.scrollHeight }, 100)
      const t2 = setTimeout(() => { el.scrollTop = el.scrollHeight }, 300)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [messages, activeThread?.thread_id, userId, playNotification])

  const onListScroll = () => {
    const el = listRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 160
    stickToBottomRef.current = nearBottom
    if (el.scrollTop < 80 && !loadingMore) loadMore()
  }

  // ResizeObserver: scroll when content height changes (images load) and user is near bottom
  useEffect(() => {
    const el = listRef.current
    if (!el || !activeThread?.thread_id) return
    const ro = new ResizeObserver(() => {
      const list = listRef.current
      if (!list) return
      const nearBottom = list.scrollHeight - (list.scrollTop + list.clientHeight) < 120
      if (nearBottom) list.scrollTop = list.scrollHeight
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [activeThread?.thread_id])

  // Search in thread (debounced)
  useEffect(() => {
    let alive = true
    const t = setTimeout(async () => {
      if (!activeThread?.thread_id) return
      const q = threadSearchQuery.trim()
      if (!q) {
        setThreadSearchOpen(false)
        setThreadSearchResults([])
        return
      }
      setThreadSearchLoading(true)
      try {
        const res = await searchMessages(q)
        if (!alive) return
        setThreadSearchResults(res || [])
        setThreadSearchOpen(true)
      } catch {
        // ignore
      } finally {
        if (alive) setThreadSearchLoading(false)
      }
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [threadSearchQuery, activeThread?.thread_id, searchMessages])

  const visibleThreads = useMemo(() => {
    const q = threadFilter.trim().toLowerCase()
    const base = threadView === 'groups' ? threads.filter((t) => t.thread_type === 'group') : threads
    if (!q) return base
    return base.filter((t) => getThreadTitle(t).toLowerCase().includes(q))
  }, [threads, threadView, threadFilter])

  const openDirect = useCallback(
    async (other: DirectoryUser) => {
      const resp = await postJson<{ ok: true; threadId: string }>('/api/messaging', {
        action: 'thread.openDirect',
        otherUserId: other.user_id,
      })
      await refreshThreads()
      setActiveThreadId(resp.threadId)
      setMobileShowThreads(false)
      setCmdOpen(false)
      setCmdQuery('')
    },
    [refreshThreads]
  )

  const onDropFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    setFiles((prev) => [...prev, ...Array.from(list)])
  }

  const doSend = useCallback(async () => {
    if (!activeThread?.thread_id) return
    const text = draft.trim()
    if (!text && files.length === 0) return
    try {
      await send(text, files, { replyToMessageId: replyTo?.id || undefined })
      setDraft('')
      setFiles([])
      setReplyTo(null)
    } catch (e: any) {
      toast({ title: 'Send failed', description: e?.message || 'Please try again', variant: 'destructive' })
    }
  }, [activeThread?.thread_id, draft, files, replyTo?.id, send, toast])

  const openEdit = (m: ChatMessage) => {
    setEditingMessage(m)
    setEditDraft(m.content || '')
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editingMessage) return
    const next = editDraft.trim()
    if (!next) return
    try {
      await editMessage(editingMessage.id, next)
      setEditOpen(false)
      setEditingMessage(null)
      setEditDraft('')
    } catch (e: any) {
      toast({ title: 'Edit failed', description: e?.message || 'Please try again', variant: 'destructive' })
    }
  }

  const downloadAttachment = async (storagePath: string) => {
    try {
      const url = await getDownloadUrl(storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      toast({ title: 'Download failed', description: e?.message || 'Please try again', variant: 'destructive' })
    }
  }

  const previewAttachment = async (title: string, storagePath: string) => {
    try {
      const url = await getDownloadUrl(storagePath)
      setPreviewTitle(title)
      setPreviewUrl(url)
      setPreviewOpen(true)
    } catch (e: any) {
      toast({ title: 'Preview failed', description: e?.message || 'Please try again', variant: 'destructive' })
    }
  }

  // Read receipt (direct threads): treat all messages <= otherLastReadId as read
  const otherReadIndex = useMemo(() => {
    if (!otherLastReadId) return -1
    return messages.findIndex((m) => m.id === otherLastReadId)
  }, [messages, otherLastReadId])

  const lastOutgoingId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === userId) return messages[i].id
    }
    return null
  }, [messages, userId])

  const isLastOutgoingSeen = useMemo(() => {
    if (!lastOutgoingId || otherReadIndex < 0) return false
    const idx = messages.findIndex((m) => m.id === lastOutgoingId)
    if (idx < 0) return false
    return idx <= otherReadIndex
  }, [lastOutgoingId, messages, otherReadIndex])

  const renderMessage = (m: ChatMessage, idx: number) => {
    const mine = m.sender_id === userId
    const created = new Date(m.created_at)

    // day separator
    const prev = messages[idx - 1]
    const needDay =
      idx === 0 ||
      (prev ? new Date(prev.created_at).toDateString() !== created.toDateString() : true)

    const senderName = mine ? 'You' : m.sender?.name || 'User'
    const showStatus = mine && m.id === lastOutgoingId

    const bubble = (
      <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
        <div className={cn('max-w-[84%] space-y-1')}>
          <div
            className={cn(
              'rounded-2xl border px-3 py-2 shadow-sm',
              mine ? 'bg-primary text-primary-foreground border-primary/20' : 'bg-muted border-border'
            )}
          >
            {/* Reply preview */}
            {m.reply_to_message_id ? (
              <div className={cn('mb-2 rounded-xl border px-2 py-1 text-xs', mine ? 'border-primary/30 bg-primary/20' : 'bg-background')}>
                Replying to a message
              </div>
            ) : null}

            {/* Content */}
            {m.is_deleted ? (
              <div className={cn('text-sm italic flex items-center gap-1.5', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                Message deleted
              </div>
            ) : m.content ? (
              <div className="whitespace-pre-wrap text-sm">{m.content}</div>
            ) : null}

            {/* Attachments - hide when message is deleted */}
            {!m.is_deleted && m.attachments?.length ? (
              <div className="mt-2 space-y-2">
                {m.attachments.map((a) => {
                  const isImage = (a.file_type || '').startsWith('image/')
                  return (
                    <div key={a.id} className={cn('flex items-center justify-between gap-3 rounded-xl border p-2', mine ? 'border-primary/30 bg-primary/10' : 'bg-background')}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', mine ? 'bg-primary/20' : 'bg-muted')}>
                          <FileText className={cn('h-4 w-4', mine ? 'text-primary-foreground' : 'text-muted-foreground')} />
                        </div>
                        <div className="min-w-0">
                          <div className={cn('truncate text-sm font-medium', mine ? 'text-primary-foreground' : 'text-foreground')}>
                            {a.file_name}
                          </div>
                          <div className={cn('truncate text-xs', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                            {a.file_type || 'file'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isImage ? (
                          <Button
                            variant={mine ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-8"
                            onClick={() => previewAttachment(a.file_name, a.storage_path)}
                          >
                            View
                          </Button>
                        ) : null}
                        <Button
                          variant={mine ? 'secondary' : 'outline'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => downloadAttachment(a.storage_path)}
                          aria-label="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>

          <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', mine ? 'justify-end' : 'justify-start')}>
            <span>{senderName}</span>
            <span>•</span>
            <span>{formatSmartTime(created)}</span>
            {m.is_edited ? (
              <>
                <span>•</span>
                <span>edited</span>
              </>
            ) : null}

            {mine ? (
              <>
                <span>•</span>
                {m.client_status === 'sending' ? (
                  <span className="inline-flex items-center gap-1">
                    <span>Sending</span>
                  </span>
                ) : m.client_status === 'failed' ? (
                  <button
                    className="inline-flex items-center gap-1 underline underline-offset-2"
                    onClick={() => retrySend(m.id, m.content || '')}
                    title={m.client_error || 'Failed'}
                  >
                    Retry
                  </button>
                ) : showStatus ? (
                  <span className="inline-flex items-center gap-1">
                    {isLastOutgoingSeen ? (
                      <>
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Seen</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Delivered</span>
                      </>
                    )}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    )

    const canEdit = mine && !m.is_deleted && (m.content || '').trim().length > 0
    const canDeleteForEveryone = mine

    return (
      <React.Fragment key={m.id}>
        {needDay ? (
          <div className="my-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <div className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              {formatSmartDay(created)}
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>
        ) : null}

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="group relative">
              {bubble}
              {/* Mobile-friendly menu button */}
              <button
                className={cn(
                  'absolute top-2 opacity-0 transition-opacity group-hover:opacity-100',
                  mine ? 'right-2' : 'left-2',
                  'rounded-md bg-background/70 p-1 backdrop-blur hover:bg-background'
                )}
                onClick={(e) => {
                  // Let right-click menu handle desktop; keep button for mobile (no-op here)
                  e.preventDefault()
                  e.stopPropagation()
                }}
                aria-label="Message actions"
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-56">
            <ContextMenuItem
              onSelect={() => {
                setReplyTo(m)
              }}
            >
              Reply
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={async () => {
                try {
                  await navigator.clipboard.writeText(m.content || '')
                  toast({ title: 'Copied', description: 'Message copied to clipboard' })
                } catch {
                  toast({ title: 'Copy failed', variant: 'destructive' })
                }
              }}
            >
              Copy
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={async () => {
                await togglePinMessage(m.id).catch(() => {})
              }}
            >
              Pin / unpin
            </ContextMenuItem>
            <ContextMenuSeparator />
            {canEdit ? (
              <ContextMenuItem
                onSelect={() => {
                  openEdit(m)
                }}
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </ContextMenuItem>
            ) : null}
            <ContextMenuItem
              onSelect={async () => {
                await deleteMessageForMe(m.id).catch(() => {})
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete for me
            </ContextMenuItem>
            {canDeleteForEveryone ? (
              <ContextMenuItem
                variant="destructive"
                onSelect={async () => {
                  await deleteMessage(m.id).catch(() => {})
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete for everyone
              </ContextMenuItem>
            ) : null}
          </ContextMenuContent>
        </ContextMenu>
      </React.Fragment>
    )
  }

  return (
    <div
      className={cn(
        'relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-background text-foreground',
        className
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {!isWidget ? null : (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileShowThreads(true)}
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Chat</div>
            <div className="truncate text-xs text-muted-foreground">{userName}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="hidden md:inline-flex" onClick={() => setCmdOpen(true)}>
            <Search className="h-4 w-4 mr-2" />
            Search
            <span className="ml-2 text-xs text-muted-foreground">Ctrl/⌘ K</span>
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCmdOpen(true)} className="md:hidden" aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>

          {!isWidget ? (
            <Button variant="outline" size="icon" onClick={() => setInfoOpen((v) => !v)} aria-label="Toggle info">
              {infoOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </Button>
          ) : null}

          <Button
            variant="outline"
            size="icon"
            onClick={() => setLeftCollapsed((v) => !v)}
            aria-label="Toggle sidebar"
          >
            {leftCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup direction="horizontal">
          {/* Left threads panel */}
          <ResizablePanel
            defaultSize={28}
            minSize={16}
            maxSize={40}
            collapsible
            collapsedSize={6}
            onCollapse={() => setLeftCollapsed(true)}
            onExpand={() => setLeftCollapsed(false)}
            className={cn('min-w-0 border-r', mobileShowThreads ? 'block' : 'hidden md:block')}
          >
            <div className="flex h-full min-w-0 flex-col">
              <div className={cn('flex items-center gap-2 p-3', leftCollapsed ? 'justify-center' : '')}>
                <Button
                  onClick={() => setCmdOpen(true)}
                  className={cn(leftCollapsed ? 'h-10 w-10 rounded-xl p-0' : 'h-10 flex-1 justify-start rounded-xl')}
                >
                  <UserPlus className={cn('h-4 w-4', leftCollapsed ? '' : 'mr-2')} />
                  {leftCollapsed ? null : 'New chat'}
                </Button>
              </div>

              {!leftCollapsed ? (
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={threadView === 'all' ? 'default' : 'outline'}
                      className="h-8 rounded-xl px-3"
                      onClick={() => setThreadView('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={threadView === 'groups' ? 'default' : 'outline'}
                      className="h-8 rounded-xl px-3"
                      onClick={() => setThreadView('groups')}
                    >
                      Groups
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Input
                      value={threadFilter}
                      onChange={(e) => setThreadFilter(e.target.value)}
                      placeholder="Search chats…"
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
              ) : null}

              <Separator />

              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {threadsLoading ? (
                  <div className="p-4 text-sm text-muted-foreground">Loading…</div>
                ) : visibleThreads.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No conversations yet</div>
                ) : (
                  <div className={cn('space-y-1', leftCollapsed ? 'flex flex-col items-center' : '')}>
                    {visibleThreads.map((t) => {
                      const selected = t.thread_id === activeThreadId
                      const title = getThreadTitle(t)
                      const subtitle = getThreadSubtitle(t)
                      return (
                        <button
                          key={t.thread_id}
                          className={cn(
                            'w-full rounded-xl px-3 py-2 text-left transition-colors',
                            selected ? 'bg-muted' : 'hover:bg-muted/60',
                            leftCollapsed ? 'w-12 px-0 py-2 text-center' : ''
                          )}
                          title={title}
                          onClick={() => {
                            setActiveThreadId(t.thread_id)
                            setMobileShowThreads(false)
                          }}
                        >
                          <div className={cn('flex items-center gap-3', leftCollapsed ? 'justify-center' : '')}>
                            <Avatar className={cn(leftCollapsed ? 'h-9 w-9' : 'h-10 w-10')}>
                              <AvatarImage src={t.other_avatar_url || ''} />
                              <AvatarFallback className="text-xs font-semibold">
                                {title.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {!leftCollapsed ? (
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="truncate text-sm font-semibold">{title}</div>
                                  {t.unread_count ? <Badge className="h-5 px-2 text-xs">{t.unread_count}</Badge> : null}
                                </div>
                                <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle || ' '}</div>
                                {t.last_message_content ? (
                                  <div className="mt-1 truncate text-xs text-muted-foreground">{t.last_message_content}</div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Middle messages panel */}
          <ResizablePanel defaultSize={isWidget ? 72 : 52} minSize={40} className={cn('min-w-0', mobileShowThreads ? 'hidden md:block' : 'block')}>
            <div className="flex h-full min-w-0 flex-col">
              {/* Chat header */}
              <div className="border-b px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">
                      {activeThread ? getThreadTitle(activeThread) : 'Select a conversation'}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {activeThread ? getThreadSubtitle(activeThread) : ' '}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="md:hidden"
                      onClick={() => setMobileShowThreads(true)}
                      aria-label="Show conversations"
                    >
                      <PanelLeftOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3">
                  <Input
                    value={threadSearchQuery}
                    onChange={(e) => setThreadSearchQuery(e.target.value)}
                    placeholder="Search in conversation…"
                    className="h-10 rounded-xl"
                    disabled={!activeThread}
                  />
                  {threadSearchOpen ? (
                    <div className="mt-2 rounded-xl border bg-muted/30 p-2 text-xs text-muted-foreground">
                      {threadSearchLoading ? 'Searching…' : `${threadSearchResults.length} result(s)`}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Messages */}
              <div className="min-h-0 flex-1">
                <div ref={listRef} onScroll={onListScroll} className="h-full overflow-y-auto px-4 py-4 pb-32">
                  {!activeThread ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      Pick a chat from the sidebar, or start a new one with <b>Ctrl/⌘ + K</b>.
                    </div>
                  ) : messagesLoading ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">Loading messages…</div>
                  ) : messages.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No messages yet</div>
                  ) : (
                    <div className="space-y-3">{messages.map((m, idx) => renderMessage(m, idx))}</div>
                  )}
                </div>
              </div>

              {/* Reply bar */}
              {replyTo ? (
                <div className="border-t bg-muted/20 px-4 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">Replying</div>
                      <div className="truncate text-xs text-muted-foreground">{replyTo.content || 'Attachment'}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Composer */}
              <div
                className="sticky bottom-0 z-20 border-t bg-background px-4 py-3"
                onDragOver={(e) => {
                  e.preventDefault()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  onDropFiles(e.dataTransfer.files)
                }}
              >
                {files.length ? (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs">
                        <span className="max-w-[240px] truncate">{f.name}</span>
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          aria-label="Remove attachment"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      onDropFiles(e.target.files)
                      e.currentTarget.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach files"
                    disabled={!activeThread}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={activeThread ? 'Type a message…' : 'Select a conversation to start'}
                    rows={2}
                    className="min-h-[44px] flex-1 resize-none rounded-xl"
                    disabled={!activeThread}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        doSend()
                      }
                    }}
                    onFocus={() => setTyping(true)}
                    onBlur={() => setTyping(false)}
                  />

                  <Button
                    type="button"
                    className="h-10 rounded-xl px-4"
                    onClick={() => doSend()}
                    disabled={!activeThread}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                </div>

                {typingUsers?.length ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {typingUsers.map((t) => t.display_name).join(', ')} typing…
                  </div>
                ) : null}
              </div>
            </div>
          </ResizablePanel>

          {/* Right info panel (desktop) */}
          {!isWidget && infoOpen ? (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={20} minSize={16} maxSize={30} className="hidden md:block min-w-0 border-l">
                <div className="flex h-full flex-col">
                  <div className="border-b px-4 py-3">
                    <div className="text-sm font-semibold">Info</div>
                    <div className="text-xs text-muted-foreground">Members, files, pins</div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {!activeThread ? (
                      <div className="text-sm text-muted-foreground">Select a conversation.</div>
                    ) : (
                      <>
                        <div className="rounded-2xl border p-4">
                          <div className="text-xs font-semibold text-muted-foreground">MEMBERS</div>
                          <div className="mt-3 space-y-2">
                            {(threadInfo?.members || []).map((m) => (
                              <div key={m.user_id} className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">{m.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium">{m.display_name}</div>
                                  <div className="truncate text-xs text-muted-foreground">
                                    {m.entity_type} • {m.role}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border p-4">
                          <div className="text-xs font-semibold text-muted-foreground">RECENT FILES</div>
                          <div className="mt-3 space-y-2">
                            {(threadInfo?.attachments || []).slice(0, 10).map((a) => (
                              <button
                                key={a.id}
                                className="w-full rounded-xl border bg-background p-2 text-left hover:bg-muted/50"
                                onClick={() => downloadAttachment(a.storage_path)}
                              >
                                <div className="truncate text-sm font-medium">{a.file_name}</div>
                                <div className="truncate text-xs text-muted-foreground">{a.file_type}</div>
                              </button>
                            ))}
                            {!threadInfo?.attachments?.length ? (
                              <div className="text-sm text-muted-foreground">No files yet.</div>
                            ) : null}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit message</DialogTitle>
            <DialogDescription>Update your message (time-limited edit window).</DialogDescription>
          </DialogHeader>
          <Textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={4} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveEdit()}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog - fit to screen on mobile */}
      <ImagePreviewDialog
        open={previewOpen}
        onOpenChange={(o) => {
          setPreviewOpen(o)
          if (!o) setPreviewUrl(null)
        }}
        src={previewUrl || ''}
        alt={previewTitle}
      />

      {/* Command palette: search users + chats */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen} title="Search" description="Search users or chats" className="max-w-2xl">
        <CommandInput value={cmdQuery} onValueChange={setCmdQuery} placeholder="Search users (and providers)..." />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          <CommandGroup heading="Chats">
            {threads
              .filter((t) => getThreadTitle(t).toLowerCase().includes(cmdQuery.trim().toLowerCase()))
              .slice(0, 10)
              .map((t) => (
                <CommandItem
                  key={`thread-${t.thread_id}`}
                  onSelect={() => {
                    setActiveThreadId(t.thread_id)
                    setCmdOpen(false)
                    setMobileShowThreads(false)
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="truncate">{getThreadTitle(t)}</span>
                  <CommandShortcut>Open</CommandShortcut>
                </CommandItem>
              ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Users">
            {directoryLoading ? (
              <CommandItem disabled>Searching…</CommandItem>
            ) : (
              directoryResults.slice(0, 15).map((u) => (
                <CommandItem key={`user-${u.user_id}`} onSelect={() => openDirect(u)}>
                  <UserPlus className="h-4 w-4" />
                  <span className="truncate">{u.display_name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{u.entity_type}</span>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}
