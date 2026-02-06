'use client'

// ============================================
// CHAT WIDGET - UTILITY FUNCTIONS
// ============================================

import type { ThemeMode, FontSize } from '@/types/chat'

// Note: cn is imported from @/lib/utils in components

// === Date/Time Formatting ===

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatMessageTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  })
}

export function formatSmartDate(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const messageDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (messageDate.getTime() === today.getTime()) {
    return 'Today'
  }
  if (messageDate.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }
  
  const diffDays = Math.floor((today.getTime() - messageDate.getTime()) / 86400000)
  if (diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'long' })
  }

  return d.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

export function formatLastSeen(date: Date | string | null): string {
  if (!date) return 'Never'
  
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// === String Utilities ===

export function getInitials(name: string): string {
  if (!name) return '??'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function highlightMatches(text: string, query: string): string {
  if (!query.trim()) return text
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g
  return text.match(urlRegex) || []
}

export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g
  const matches = text.matchAll(mentionRegex)
  return Array.from(matches, m => m[1])
}

// === File Utilities ===

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️'
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦'
  return '📎'
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/')
}

export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/')
}

// === Validation ===

export function validateFileUpload(
  file: File,
  maxSizeMB: number = 25,
  allowedTypes: string[] = ['image/*', 'application/pdf', 'video/*', 'audio/*']
): { valid: boolean; error?: string } {
  const maxSize = maxSizeMB * 1024 * 1024

  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large. Maximum size is ${maxSizeMB}MB` 
    }
  }

  const isAllowed = allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const baseType = type.slice(0, -2)
      return file.type.startsWith(baseType)
    }
    return file.type === type
  })

  if (!isAllowed) {
    return { 
      valid: false, 
      error: 'File type not allowed' 
    }
  }

  return { valid: true }
}

// === Message Utilities ===

export function isMessageEditable(
  createdAt: string,
  timeWindowMinutes: number = 15
): boolean {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffMinutes = diffMs / 60000
  return diffMinutes <= timeWindowMinutes
}

export function isMessageDeletable(
  createdAt: string,
  timeWindowMinutes: number = 60
): boolean {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffMinutes = diffMs / 60000
  return diffMinutes <= timeWindowMinutes
}

export function groupMessagesByDate<T extends { created_at: string }>(
  messages: T[]
): { date: string; messages: T[] }[] {
  const groups: { date: string; messages: T[] }[] = []
  let currentDate = ''

  messages.forEach((message) => {
    const messageDate = formatSmartDate(message.created_at)

    if (messageDate !== currentDate) {
      currentDate = messageDate
      groups.push({ date: messageDate, messages: [] })
    }

    groups[groups.length - 1].messages.push(message)
  })

  return groups
}

// === UI Utilities ===

export function getThemeColors(theme: ThemeMode, systemTheme: 'light' | 'dark') {
  const effectiveTheme = theme === 'system' ? systemTheme : theme
  
  return {
    bg: effectiveTheme === 'dark' ? 'bg-slate-900' : 'bg-white',
    bgSecondary: effectiveTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-50',
    bgTertiary: effectiveTheme === 'dark' ? 'bg-slate-700' : 'bg-slate-100',
    text: effectiveTheme === 'dark' ? 'text-white' : 'text-slate-900',
    textSecondary: effectiveTheme === 'dark' ? 'text-slate-300' : 'text-slate-600',
    textMuted: effectiveTheme === 'dark' ? 'text-slate-400' : 'text-slate-500',
    border: effectiveTheme === 'dark' ? 'border-slate-700' : 'border-slate-200',
    hover: effectiveTheme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100',
  }
}

export function getFontSizeClass(size: FontSize): string {
  switch (size) {
    case 'small': return 'text-xs'
    case 'large': return 'text-base'
    default: return 'text-sm'
  }
}

// === Keyboard Shortcuts ===

export function isShortcut(
  event: KeyboardEvent,
  key: string,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}
): boolean {
  const ctrlOrMeta = modifiers.ctrl || modifiers.meta
  
  if (ctrlOrMeta && !(event.ctrlKey || event.metaKey)) return false
  if (modifiers.shift && !event.shiftKey) return false
  if (modifiers.alt && !event.altKey) return false
  
  return event.key.toLowerCase() === key.toLowerCase()
}

// === ID Generation ===

export function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// === Clipboard ===

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  }
}

// === Audio ===

let audioContext: AudioContext | null = null

export function playNotificationSound(soundUrl?: string): void {
  try {
    if (soundUrl) {
      const audio = new Audio(soundUrl)
      audio.volume = 0.5
      audio.play().catch(() => {})
    } else {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.1
      
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.1)
    }
  } catch (err) {
    console.warn('Could not play notification sound:', err)
  }
}

// === Debounce/Throttle ===

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// === Local Storage Helpers ===

export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn('Could not save to localStorage:', err)
  }
}

// === Browser Notifications ===

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  
  if (Notification.permission === 'granted') return true
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  
  return false
}

export function showBrowserNotification(
  title: string,
  body: string,
  options?: { icon?: string; onClick?: () => void }
): void {
  if (Notification.permission !== 'granted') return
  
  const notification = new Notification(title, {
    body,
    icon: options?.icon || '/chat-icon.png',
  })
  
  if (options?.onClick) {
    notification.onclick = options.onClick
  }
}
