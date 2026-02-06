// ============================================
// CHAT WIDGET - CONSTANTS
// ============================================

// === Feature Flags ===
export const FEATURES = {
  FILE_UPLOADS: true,
  REACTIONS: true,
  EDIT_MESSAGES: true,
  DELETE_MESSAGES: true,
  FORWARD_MESSAGES: true,
  PIN_MESSAGES: true,
  LINK_PREVIEWS: true,
  TYPING_INDICATORS: true,
  READ_RECEIPTS: true,
  ONLINE_STATUS: true,
  MESSAGE_SEARCH: true,
  NOTIFICATIONS: true,
  DARK_MODE: true,
  KEYBOARD_SHORTCUTS: true,
} as const

// === Timing ===
export const TIMING = {
  TYPING_TIMEOUT: 3000, // ms before typing indicator clears
  TYPING_DEBOUNCE: 500, // ms debounce for typing events
  PRESENCE_HEARTBEAT: 30000, // ms between presence updates
  PRESENCE_TIMEOUT: 120000, // ms before user marked offline
  IDLE_TIMEOUT: 300000, // ms before user marked away
  RECONNECT_DELAY: 1000, // initial reconnect delay
  MAX_RECONNECT_DELAY: 30000, // max reconnect delay
  TOAST_DURATION: 5000, // notification toast duration
  LINK_PREVIEW_CACHE: 604800000, // 7 days in ms
} as const

// === Limits ===
export const LIMITS = {
  MAX_MESSAGE_LENGTH: 4000,
  MAX_FILE_SIZE_MB: 25,
  MAX_FILES_PER_MESSAGE: 10,
  MAX_REACTIONS_PER_MESSAGE: 20,
  MAX_PINNED_MESSAGES: 50,
  MAX_GROUP_MEMBERS: 256,
  MESSAGES_PER_PAGE: 50,
  THREADS_PER_PAGE: 20,
  SEARCH_RESULTS_LIMIT: 50,
  MIN_SEARCH_QUERY: 2,
  RATE_LIMIT_MESSAGES: 30, // per minute
} as const

// === File Upload ===
export const FILE_UPLOAD = {
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/json',
    'application/zip',
  ],
  IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime'],
  AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  THUMBNAIL_SIZE: 200,
  PREVIEW_MAX_WIDTH: 400,
  PREVIEW_MAX_HEIGHT: 300,
} as const

// === Keyboard Shortcuts ===
export const SHORTCUTS = {
  SEARCH: { key: 'k', ctrl: true, description: 'Search messages' },
  NEW_CHAT: { key: 'n', ctrl: true, description: 'New conversation' },
  CLOSE: { key: 'Escape', description: 'Close panel' },
  SEND: { key: 'Enter', description: 'Send message' },
  NEW_LINE: { key: 'Enter', shift: true, description: 'New line' },
  EDIT_LAST: { key: 'ArrowUp', description: 'Edit last message' },
  BOLD: { key: 'b', ctrl: true, description: 'Bold text' },
  ITALIC: { key: 'i', ctrl: true, description: 'Italic text' },
  EMOJI: { key: 'e', ctrl: true, description: 'Open emoji picker' },
  ATTACH: { key: 'u', ctrl: true, description: 'Attach file' },
} as const

// === Emoji ===
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏']

export const EMOJI_CATEGORIES = {
  recent: '🕐',
  smileys: '😀',
  people: '👋',
  animals: '🐻',
  food: '🍔',
  travel: '✈️',
  activities: '⚽',
  objects: '💡',
  symbols: '❤️',
  flags: '🏳️',
} as const

// === Message Types ===
export const MESSAGE_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  SYSTEM: 'system',
} as const

export const SYSTEM_MESSAGE_TYPES = {
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_LEFT: 'member_left',
  GROUP_CREATED: 'group_created',
  GROUP_RENAMED: 'group_renamed',
  GROUP_AVATAR_CHANGED: 'group_avatar_changed',
  ADMIN_PROMOTED: 'admin_promoted',
  ADMIN_DEMOTED: 'admin_demoted',
  MESSAGE_PINNED: 'message_pinned',
  MESSAGE_UNPINNED: 'message_unpinned',
} as const

// === Status Colors ===
export const STATUS_COLORS = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-slate-400',
} as const

export const MESSAGE_STATUS_ICONS = {
  sending: 'clock',
  sent: 'check',
  delivered: 'check-check',
  read: 'check-check-blue',
  failed: 'alert-circle',
} as const

// === Theme ===
export const THEME = {
  colors: {
    primary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    accent: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4',
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
    },
  },
  gradients: {
    primary: 'from-teal-500 to-cyan-600',
    primaryHover: 'from-teal-600 to-cyan-700',
    secondary: 'from-amber-400 to-orange-500',
    danger: 'from-red-500 to-rose-600',
  },
} as const

// === Animation ===
export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    default: 'ease-in-out',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const

// === Local Storage Keys ===
export const STORAGE_KEYS = {
  THEME: 'chat-theme',
  FONT_SIZE: 'chat-font-size',
  SIDEBAR_WIDTH: 'chat-sidebar-width',
  SOUND_ENABLED: 'chat-sound-enabled',
  DRAFT_PREFIX: 'chat-draft-',
  RECENT_EMOJIS: 'chat-recent-emojis',
  EXPANDED: 'chat-expanded',
} as const

// === Supabase ===
export const SUPABASE_TABLES = {
  PROFILES: 'profiles',
  THREADS: 'chat_threads',
  THREAD_MEMBERS: 'chat_thread_members',
  MESSAGES: 'chat_messages',
  ATTACHMENTS: 'chat_attachments',
  REACTIONS: 'chat_message_reactions',
  BLOCKS: 'chat_blocks',
  PINNED: 'chat_pinned_messages',
  EDITS: 'chat_message_edits',
  LINK_PREVIEWS: 'chat_link_previews',
  SETTINGS: 'chat_user_settings',
  POLICIES: 'chat_system_policies',
  NOTIFICATIONS: 'chat_notifications',
  RECEIPTS: 'chat_message_receipts',
  TYPING: 'chat_typing_status',
  AUDIT: 'chat_audit_log',
} as const

export const SUPABASE_FUNCTIONS = {
  FIND_OR_CREATE_DIRECT: 'find_or_create_direct_thread',
  SEARCH_MESSAGES: 'search_chat_messages',
  EDIT_MESSAGE: 'edit_chat_message',
  DELETE_MESSAGE: 'delete_chat_message',
  MANAGE_MEMBER: 'manage_group_member',
  LEAVE_GROUP: 'leave_chat_group',
  MARK_STATUS: 'mark_messages_status',
  UPDATE_PRESENCE: 'update_user_presence',
  GET_UNREAD: 'get_unread_counts',
  GET_SETTINGS: 'get_or_create_chat_settings',
} as const

export const STORAGE_BUCKETS = {
  ATTACHMENTS: 'chat-attachments',
  AVATARS: 'chat-avatars',
} as const

// === Error Messages ===
export const ERROR_MESSAGES = {
  NETWORK: 'Unable to connect. Please check your internet connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMIT: 'Too many requests. Please wait a moment.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 25MB.',
  FILE_TYPE_NOT_ALLOWED: 'This file type is not allowed.',
  MESSAGE_TOO_LONG: 'Message is too long. Maximum length is 4000 characters.',
  EDIT_WINDOW_EXPIRED: 'You can no longer edit this message.',
  DELETE_WINDOW_EXPIRED: 'You can no longer delete this message.',
  GROUP_FULL: 'This group has reached maximum capacity.',
  BLOCKED_USER: 'You cannot message this user.',
  GENERIC: 'Something went wrong. Please try again.',
} as const

// === Success Messages ===
export const SUCCESS_MESSAGES = {
  MESSAGE_SENT: 'Message sent',
  MESSAGE_EDITED: 'Message edited',
  MESSAGE_DELETED: 'Message deleted',
  MESSAGE_COPIED: 'Message copied to clipboard',
  MESSAGE_PINNED: 'Message pinned',
  MESSAGE_UNPINNED: 'Message unpinned',
  FILE_UPLOADED: 'File uploaded successfully',
  GROUP_CREATED: 'Group created successfully',
  MEMBER_ADDED: 'Member added to group',
  MEMBER_REMOVED: 'Member removed from group',
  LEFT_GROUP: 'You left the group',
  USER_BLOCKED: 'User blocked',
  USER_UNBLOCKED: 'User unblocked',
  SETTINGS_SAVED: 'Settings saved',
  NOTIFICATION_MUTED: 'Notifications muted',
} as const
