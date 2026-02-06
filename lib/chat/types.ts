export type DirectoryEntityType =
  | 'doctor'
  | 'pharmacy'
  | 'laboratory'
  | 'clinic'
  | 'business'
  | 'patient'
  | 'admin'

export type ThreadType = 'direct' | 'group'
export type MessageType = 'text' | 'file' | 'image' | 'system'

export interface DirectoryUser {
  user_id: string
  display_name: string
  entity_type: DirectoryEntityType
  avatar_url: string | null
  is_active?: boolean
}

export interface ThreadListItem {
  thread_id: string
  thread_type: ThreadType
  title: string | null
  updated_at: string
  last_message_id: string | null
  last_message_type: MessageType | null
  last_message_content: string | null
  last_message_created_at: string | null
  unread_count: number
  is_pinned?: boolean
  is_favorite?: boolean
  other_user_id: string | null
  other_display_name: string | null
  other_avatar_url: string | null
  other_entity_type: DirectoryEntityType | null
}

export interface ChatAttachment {
  id: string
  message_id: string
  file_name: string
  file_type: string
  file_size: number | null
  storage_path: string
  created_at: string
}

export interface ChatMessageRow {
  id: string
  thread_id: string
  sender_id: string
  message_type: MessageType
  content: string | null
  reply_to_message_id: string | null
  is_edited?: boolean
  edited_at?: string | null
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  chat_attachments?: ChatAttachment[]
}

export interface ChatMessage extends ChatMessageRow {
  sender?: {
    id: string
    name: string
    avatar: string | null
    type: DirectoryEntityType
  }
  attachments: ChatAttachment[]

  // Client-only fields (optimistic UI / retry)
  client_status?: 'sending' | 'failed'
  client_error?: string
}


export interface PinnedMessage {
  thread_id: string
  message_id: string
  created_at: string
}
