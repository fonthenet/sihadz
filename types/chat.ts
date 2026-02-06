'use client'

// ============================================
// CHAT WIDGET - COMPLETE TYPE DEFINITIONS
// ============================================

// === Enums & Literal Types ===

export type UserType = 'doctor' | 'pharmacy' | 'laboratory' | 'clinic' | 'business' | 'patient' | 'admin' | 'nurse' | 'ambulance' | 'pharma_supplier' | 'equipment_supplier'
export type ThreadType = 'direct' | 'group'
export type MessageType = 'text' | 'file' | 'image' | 'audio' | 'video' | 'system'
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'
export type GroupRole = 'owner' | 'admin' | 'member'
export type NotificationLevel = 'all' | 'mentions' | 'none'
export type MuteDuration = '1h' | '8h' | '24h' | 'forever'
export type ThemeMode = 'light' | 'dark' | 'system'
export type FontSize = 'small' | 'medium' | 'large'

// === Core Entities ===

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  user_type: UserType
  is_online: boolean
  presence_status: PresenceStatus
  status_message: string | null
  last_seen_at: string
  created_at: string
  updated_at: string
}

export interface Thread {
  id: string
  thread_type: ThreadType
  title: string | null
  avatar_url: string | null
  description: string | null
  created_by: string | null
  is_archived: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ThreadMember {
  thread_id: string
  user_id: string
  role: GroupRole
  last_read_message_id: string | null
  is_muted: boolean
  muted_until: string | null
  notification_level: NotificationLevel
  joined_at: string
  profile?: Profile
}

export interface Message {
  id: string
  thread_id: string
  sender_id: string
  message_type: MessageType
  content: string | null
  reply_to_message_id: string | null
  forwarded_from_id: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_for: string[] | null // user IDs for "delete for me"
  edited_at: string | null
  status: MessageStatus
  metadata: Record<string, unknown>
  created_at: string
  // Relations
  sender?: Profile
  attachments?: Attachment[]
  reply_to?: Message | null
  reactions?: MessageReaction[]
  link_previews?: LinkPreview[]
}

export interface Attachment {
  id: string
  message_id: string
  file_name: string
  file_type: string
  file_size: number | null
  storage_path: string
  thumbnail_path: string | null
  duration: number | null // for audio/video
  dimensions: { width: number; height: number } | null // for images/video
  created_at: string
  // Computed
  url?: string
  thumbnail_url?: string
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  user?: Profile
}

export interface LinkPreview {
  id: string
  url: string
  title: string | null
  description: string | null
  image_url: string | null
  site_name: string | null
  fetched_at: string
}

export interface PinnedMessage {
  id: string
  thread_id: string
  message_id: string
  pinned_by: string
  pinned_at: string
  message?: Message
  pinner?: Profile
}

export interface MessageEdit {
  id: string
  message_id: string
  previous_content: string
  edited_at: string
}

export interface UserBlock {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
  blocked_user?: Profile
}

// === Extended Thread with Details ===

export interface ThreadWithDetails extends Thread {
  members: ThreadMember[]
  last_message?: Message | null
  unread_count: number
  other_user?: Profile | null // For direct chats
  pinned_messages?: PinnedMessage[]
  my_membership?: ThreadMember
}

// === Settings ===

export interface ChatUserSettings {
  user_id: string
  // Availability - who can message this user
  accepting_new_chats?: boolean
  accept_from_patients?: boolean
  accept_from_providers?: boolean
  accept_from_anyone?: boolean
  // Notifications
  notifications_enabled: boolean
  sound_enabled: boolean
  desktop_notifications: boolean
  // Appearance
  theme: ThemeMode
  font_size: FontSize
  compact_mode: boolean
  message_preview_lines: number
  // Privacy
  show_typing_indicators: boolean
  show_read_receipts: boolean
  show_online_status: boolean
  // Input
  enter_to_send: boolean
  updated_at: string
}

export interface ChatSystemPolicy {
  enter_to_send: PolicySetting
  typing_indicators: PolicySetting
  read_receipts: PolicySetting
  online_status: PolicySetting
  message_edit: EditDeletePolicy
  message_delete: EditDeletePolicy & { delete_for_everyone: boolean }
  file_uploads: FileUploadPolicy
  link_previews: PolicySetting
  group_creation: GroupCreationPolicy
  rate_limit: RateLimitPolicy
}

interface PolicySetting {
  enabled: boolean
  user_override: boolean
}

interface EditDeletePolicy {
  enabled: boolean
  time_window_minutes: number
}

interface FileUploadPolicy {
  enabled: boolean
  max_size_mb: number
  allowed_types: string[]
}

interface GroupCreationPolicy {
  allowed_roles: UserType[]
}

interface RateLimitPolicy {
  messages_per_minute: number
}

// === Notifications ===

export interface ChatNotification {
  id: string
  user_id: string
  thread_id: string | null
  message_id: string | null
  type: 'message' | 'mention' | 'reaction' | 'group_invite' | 'group_update'
  title: string
  body: string | null
  is_read: boolean
  created_at: string
  thread?: Thread
  message?: Message
}

// === Search ===

export interface SearchResult {
  id: string
  thread_id: string
  content: string
  sender_id: string
  sender_name: string
  created_at: string
  rank: number
  thread?: Thread
}

// === Optimistic Updates ===

export interface PendingMessage extends Omit<Message, 'id'> {
  tempId: string
  retryCount: number
}

export interface UploadProgress {
  fileId: string
  fileName: string
  fileSize: number
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
  url?: string
}

// === Context Menu ===

export interface ContextMenuAction {
  id: string
  label: string
  icon?: string
  danger?: boolean
  disabled?: boolean
  shortcut?: string
  onClick: () => void
}

// === Real-time Events ===

export interface TypingEvent {
  user_id: string
  user_name: string
  thread_id: string
  is_typing: boolean
}

export interface PresenceEvent {
  user_id: string
  status: PresenceStatus
  last_seen_at: string
}

export interface MessageEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  message: Message
}

// === Component Props (commonly used) ===

export interface ChatWidgetProps {
  userId: string
  userName: string
  userAvatar?: string
  userType?: UserType
  position?: 'bottom-right' | 'bottom-left'
  defaultOpen?: boolean
  defaultThreadId?: string
  onOpenChange?: (open: boolean) => void
  className?: string
}

export interface MessageListProps {
  messages: Message[]
  pendingMessages: PendingMessage[]
  loading: boolean
  hasMore: boolean
  currentUserId: string
  typingUsers: TypingEvent[]
  settings: ChatUserSettings | null
  onLoadMore: () => void
  onDeleteMessage: (messageId: string, forEveryone: boolean) => void
  onEditMessage: (messageId: string, content: string) => void
  onReplyMessage: (message: Message) => void
  onForwardMessage: (message: Message) => void
  onReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
  onRetryMessage: (tempId: string) => void
  onCancelMessage: (tempId: string) => void
  onCopyMessage: (content: string) => void
  onPinMessage: (messageId: string) => void
  onJumpToMessage: (messageId: string) => void
}

export interface MessageComposerProps {
  threadId: string | null
  disabled?: boolean
  replyTo: Message | null
  editingMessage: Message | null
  settings: ChatUserSettings | null
  policy: ChatSystemPolicy | null
  onSend: (content: string, attachments?: File[], replyToId?: string) => Promise<void>
  onCancelReply: () => void
  onCancelEdit: () => void
  onSaveEdit: (content: string) => void
  onTyping: (isTyping: boolean) => void
  onFileSelect: (files: File[]) => void
}

// === Utility Types ===

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
}
