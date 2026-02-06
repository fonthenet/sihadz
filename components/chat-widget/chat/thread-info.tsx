'use client'

import { useState, useEffect } from 'react'
import { X, Users, Bell, BellOff, Trash2, LogOut, Image, File, Link, ChevronDown, ChevronUp, FileText, Film, Music, Download, MoreHorizontal, UserMinus, Shield, ShieldOff, UserX } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { cn } from '@/lib/utils'
import { getInitials, formatRelativeTime, formatFileSize } from '@/lib/chat/chat-utils'
import type { ThreadWithDetails, Attachment, ThreadMember } from '@/types/chat'
import { avatarGradientFor } from '@/lib/chat/ui'
import { createBrowserClient } from '@/lib/supabase/client'
import { dotClassForDbStatus, shouldShowPresence } from '@/components/presence-status'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ThreadInfoProps {
  thread: ThreadWithDetails | null
  isOpen: boolean
  onClose: () => void
  isDark?: boolean
  currentUserId?: string
  onMuteThread?: (threadId: string, until: Date | null) => Promise<void>
  onLeaveGroup?: (threadId: string) => Promise<void>
  onClearChat?: (threadId: string) => Promise<void>
  onRemoveMember?: (threadId: string, memberUserId: string) => Promise<void>
  onUpdateMemberRole?: (threadId: string, memberUserId: string, role: 'owner' | 'admin' | 'member') => Promise<void>
  onDeleteGroup?: (threadId: string) => Promise<void>
  onBlockUser?: (userId: string) => Promise<void>
  isBlocked?: (userId: string) => boolean
}

export function ThreadInfo({ 
  thread, 
  isOpen, 
  onClose, 
  isDark = false,
  currentUserId,
  onMuteThread,
  onLeaveGroup,
  onClearChat,
  onRemoveMember,
  onUpdateMemberRole,
  onDeleteGroup,
  onBlockUser,
  isBlocked,
  showOnlineStatus = true,
}: ThreadInfoProps) {
  const [showFiles, setShowFiles] = useState(true)
  const [files, setFiles] = useState<Attachment[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Load shared files
  useEffect(() => {
    if (!thread?.id || !isOpen) return
    
    const loadFiles = async () => {
      setFilesLoading(true)
      try {
        const supabase = createBrowserClient()
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('thread_id', thread.id)
        
        if (!messages?.length) {
          setFiles([])
          return
        }

        const messageIds = messages.map(m => m.id)
        const { data: attachments } = await supabase
          .from('chat_attachments')
          .select('*')
          .in('message_id', messageIds)
          .order('created_at', { ascending: false })
          .limit(20)

        // Add signed URLs (bucket is private)
        const filesWithUrls = await Promise.all((attachments || []).map(async (att) => {
          let url = att.url
          if (!url && att.storage_path) {
            if (att.storage_path.startsWith('http')) url = att.storage_path
            else {
              const { data } = await supabase.storage.from('chat-attachments').createSignedUrl(att.storage_path, 3600)
              url = data?.signedUrl || ''
            }
          }
          return { ...att, url: url || '' }
        }))
        
        setFiles(filesWithUrls)
      } catch (err) {
        console.error('Error loading files:', err)
      } finally {
        setFilesLoading(false)
      }
    }

    loadFiles()
    setIsMuted(thread.my_membership?.is_muted || false)
  }, [thread?.id, isOpen])

  if (!thread || !isOpen) return null

  const displayName = thread.thread_type === 'group'
    ? thread.title || 'Group Chat'
    : thread.other_user?.full_name || 'Unknown User'

  const handleMute = async () => {
    if (!onMuteThread) return
    setActionLoading('mute')
    try {
      await onMuteThread(thread.id, isMuted ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
      setIsMuted(!isMuted)
    } finally {
      setActionLoading(null)
    }
  }

  const handleLeave = async () => {
    if (!onLeaveGroup) return
    if (!confirm('Are you sure you want to leave this group?')) return
    setActionLoading('leave')
    try {
      await onLeaveGroup(thread.id)
      onClose()
    } finally {
      setActionLoading(null)
    }
  }

  const handleClearChat = async () => {
    if (!onClearChat) return
    if (!confirm('Are you sure you want to clear chat history? This cannot be undone.')) return
    setActionLoading('clear')
    try {
      await onClearChat(thread.id)
    } finally {
      setActionLoading(null)
    }
  }

  // Group files by type
  const imageFiles = files.filter(f => f.file_type?.startsWith('image/'))
  const videoFiles = files.filter(f => f.file_type?.startsWith('video/'))
  const audioFiles = files.filter(f => f.file_type?.startsWith('audio/'))
  const docFiles = files.filter(f => !f.file_type?.startsWith('image/') && !f.file_type?.startsWith('video/') && !f.file_type?.startsWith('audio/'))

  const getFileIcon = (type: string) => {
    if (type?.startsWith('image/')) return <Image className="h-4 w-4" />
    if (type?.startsWith('video/')) return <Film className="h-4 w-4" />
    if (type?.startsWith('audio/')) return <Music className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  return (
    <div className={cn(
      "w-80 border-s flex flex-col h-full",
      isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
    )}>
      <div className={cn(
        "p-4 border-b flex items-center justify-between",
        isDark ? "border-slate-700" : "border-slate-200"
      )}>
        <h3 className={cn("font-semibold", isDark ? "text-white" : "text-slate-900")}>Details</h3>
        <button
          onClick={onClose}
          className={cn(
            "p-2 rounded-lg transition-colors",
            isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-400"
          )}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className={cn(
          "p-6 flex flex-col items-center text-center border-b",
          isDark ? "border-slate-700" : "border-slate-200"
        )}>
          <div className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-4',
            thread.thread_type === 'group'
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
              : cn('bg-gradient-to-br text-white', avatarGradientFor(thread.other_user?.id || thread.id))
          )}>
            {thread.thread_type === 'group' ? (
              <Users className="h-10 w-10 text-white" />
            ) : thread.other_user?.avatar_url ? (
              <img src={thread.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(displayName)
            )}
          </div>
          <h4 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-slate-900")}>{displayName}</h4>
          {thread.thread_type === 'direct' && thread.other_user && (
            <>
              <p className={cn("text-sm capitalize mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
                {thread.other_user.user_type}
              </p>
              {shouldShowPresence(thread.other_user.presence_status, thread.other_user.is_online) && (
                <span className={cn(
                  "inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 text-xs rounded-full",
                  thread.other_user.presence_status === 'online' && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
                  thread.other_user.presence_status === 'busy' && "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
                  thread.other_user.presence_status === 'away' && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                  (!thread.other_user.presence_status || thread.other_user.presence_status === 'offline') && "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", dotClassForDbStatus(thread.other_user.presence_status))} />
                  {thread.other_user.presence_status === 'online' ? 'Online' : 
                   thread.other_user.presence_status === 'busy' ? 'Busy' : 
                   thread.other_user.presence_status === 'away' ? 'Away' : 'Offline'}
                </span>
              )}
            </>
          )}
          {thread.thread_type === 'group' && (
            <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
              {thread.members?.length || 0} members
            </p>
          )}
        </div>

        {thread.thread_type === 'group' && thread.members && (
          <div className={cn("p-4 border-b", isDark ? "border-slate-700" : "border-slate-200")}>
            <h5 className={cn("text-xs font-semibold uppercase tracking-wider mb-3", isDark ? "text-slate-500" : "text-slate-400")}>
              Members
            </h5>
            <div className="space-y-2">
              {thread.members.map((member: ThreadMember) => {
                const mid = member.user_id
                const isSelf = mid === currentUserId
                const isOwner = thread.my_membership?.role === 'owner'
                const isAdmin = thread.my_membership?.role === 'owner' || thread.my_membership?.role === 'admin'
                const canManage = isAdmin && !isSelf && currentUserId
                const memberRole = member.role || 'member'
                const blocked = isBlocked?.(mid) ?? false

                return (
                  <div key={mid} className={cn(
                    "flex items-center gap-3 p-2 rounded-xl group",
                    isDark ? "hover:bg-slate-800" : "hover:bg-slate-50"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs font-medium",
                      avatarGradientFor(mid)
                    )}>
                      {member.profile?.avatar_url ? (
                        <img src={member.profile.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" />
                      ) : member.profile ? getInitials(member.profile.full_name) : '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", isDark ? "text-white" : "text-slate-900")}>
                        {member.profile?.full_name || 'Unknown'}
                        {memberRole !== 'member' && (
                          <span className={cn("ml-1 text-[10px] capitalize", isDark ? "text-slate-500" : "text-slate-400")}>
                            ({memberRole})
                          </span>
                        )}
                      </p>
                      <p className={cn("text-xs capitalize", isDark ? "text-slate-500" : "text-slate-500")}>
                        {member.profile?.user_type || 'member'}
                      </p>
                    </div>
                    {showOnlineStatus && shouldShowPresence(member.profile?.presence_status, member.profile?.is_online) && (
                      <span 
                        className={cn("w-2 h-2 rounded-full", dotClassForDbStatus(member.profile?.presence_status))}
                        title={member.profile?.presence_status || 'online'}
                      />
                    )}
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-500"
                            )}
                            aria-label="Member actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {memberRole === 'admin' && isOwner && (
                            <DropdownMenuItem
                              onClick={() => onUpdateMemberRole?.(thread.id, mid, 'member')}
                              className="text-destructive focus:text-destructive"
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remove admin
                            </DropdownMenuItem>
                          )}
                          {memberRole === 'member' && isOwner && (
                            <DropdownMenuItem onClick={() => onUpdateMemberRole?.(thread.id, mid, 'admin')}>
                              <Shield className="h-4 w-4 mr-2" />
                              Make admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={async () => {
                              if (!confirm(`Remove ${member.profile?.full_name || 'this member'} from the group?`)) return
                              await onRemoveMember?.(thread.id, mid)
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remove from group
                          </DropdownMenuItem>
                          {onBlockUser && !blocked && (
                            <DropdownMenuSeparator />
                          )}
                          {onBlockUser && !blocked && (
                            <DropdownMenuItem
                              onClick={() => onBlockUser(mid)}
                              className="text-destructive focus:text-destructive"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Block user
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Collapsible Files Section */}
        <div className={cn("border-b", isDark ? "border-slate-700" : "border-slate-200")}>
          <button
            onClick={() => setShowFiles(!showFiles)}
            className={cn(
              "w-full p-4 flex items-center justify-between",
              isDark ? "hover:bg-slate-800" : "hover:bg-slate-50"
            )}
          >
            <h5 className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>
              Shared Files ({files.length})
            </h5>
            {showFiles ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          
          {showFiles && (
            <div className="px-4 pb-4">
              {filesLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="md" className="text-slate-400" />
                </div>
              ) : files.length === 0 ? (
                <p className={cn("text-sm text-center py-4", isDark ? "text-slate-500" : "text-slate-400")}>
                  No shared files yet
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Images grid */}
                  {imageFiles.length > 0 && (
                    <div>
                      <p className={cn("text-[10px] uppercase tracking-wider mb-2", isDark ? "text-slate-600" : "text-slate-400")}>
                        Images ({imageFiles.length})
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {imageFiles.slice(0, 6).map(file => (
                          <a
                            key={file.id}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                          >
                            <img src={file.url} alt={file.file_name} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents list */}
                  {docFiles.length > 0 && (
                    <div>
                      <p className={cn("text-[10px] uppercase tracking-wider mb-2", isDark ? "text-slate-600" : "text-slate-400")}>
                        Documents ({docFiles.length})
                      </p>
                      <div className="space-y-1">
                        {docFiles.slice(0, 5).map(file => (
                          <a
                            key={file.id}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={file.file_name}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg text-sm transition-colors",
                              isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                            )}
                          >
                            {getFileIcon(file.file_type)}
                            <span className={cn("flex-1 truncate", isDark ? "text-slate-300" : "text-slate-700")}>
                              {file.file_name}
                            </span>
                            <span className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-400")}>
                              {formatFileSize(file.file_size)}
                            </span>
                            <Download className="h-3.5 w-3.5 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4">
          <h5 className={cn("text-xs font-semibold uppercase tracking-wider mb-3", isDark ? "text-slate-500" : "text-slate-400")}>
            Actions
          </h5>
          <div className="space-y-1">
            <button 
              onClick={handleMute}
              disabled={actionLoading === 'mute'}
              className={cn(
                "w-full p-3 rounded-xl text-left flex items-center gap-3 transition-colors disabled:opacity-50",
                isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-700"
              )}
            >
              {actionLoading === 'mute' ? (
                <LoadingSpinner size="sm" className="text-slate-400" />
              ) : isMuted ? (
                <BellOff className="h-5 w-5 text-slate-400" />
              ) : (
                <Bell className="h-5 w-5 text-slate-400" />
              )}
              <span className="text-sm">{isMuted ? 'Unmute notifications' : 'Mute notifications'}</span>
            </button>
            <button 
              onClick={handleClearChat}
              disabled={actionLoading === 'clear'}
              className={cn(
                "w-full p-3 rounded-xl text-left flex items-center gap-3 transition-colors disabled:opacity-50",
                isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-700"
              )}
            >
              {actionLoading === 'clear' ? (
                <LoadingSpinner size="sm" className="text-slate-400" />
              ) : (
                <Trash2 className="h-5 w-5 text-slate-400" />
              )}
              <span className="text-sm">Clear chat history</span>
            </button>
            {thread.thread_type === 'group' && (
              <>
                {thread.my_membership?.role === 'owner' && onDeleteGroup && (
                  <button 
                    onClick={async () => {
                      if (!confirm('Delete this group permanently? All messages will be lost. This cannot be undone.')) return
                      setActionLoading('delete')
                      try {
                        await onDeleteGroup(thread.id)
                        onClose()
                      } finally {
                        setActionLoading(null)
                      }
                    }}
                    disabled={actionLoading === 'delete'}
                    className={cn(
                      "w-full p-3 rounded-xl text-left flex items-center gap-3 transition-colors disabled:opacity-50",
                      isDark ? "hover:bg-red-900/30 text-red-400" : "hover:bg-red-50 text-red-600"
                    )}
                  >
                    {actionLoading === 'delete' ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                    <span className="text-sm font-medium">Delete group</span>
                  </button>
                )}
                <button 
                  onClick={handleLeave}
                  disabled={actionLoading === 'leave'}
                  className={cn(
                    "w-full p-3 rounded-xl text-left flex items-center gap-3 transition-colors disabled:opacity-50",
                    isDark ? "hover:bg-red-900/20 text-red-400" : "hover:bg-red-50 text-red-600"
                  )}
                >
                  {actionLoading === 'leave' ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <LogOut className="h-5 w-5" />
                  )}
                  <span className="text-sm">Leave group</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
