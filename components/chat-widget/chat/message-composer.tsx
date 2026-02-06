'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Smile, X, Image as ImageIcon, FileText, Film, Music, Save, Mic } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { AnimatePresence, motion } from 'framer-motion'
import { VoiceMessageRecorder } from '@/components/chat/voice-message-recorder'
import { cn } from '@/lib/utils'
import { formatFileSize, validateFileUpload, getFileIcon } from '@/lib/chat/chat-utils'
import type { Message, UploadProgress } from '@/types/chat'

interface MessageComposerProps {
  disabled?: boolean
  replyTo: Message | null
  editingMessage: Message | null
  onSend: (content: string, replyToId?: string) => Promise<void>
  onCancelReply: () => void
  onEdit: (messageId: string, content: string) => Promise<void>
  onCancelEdit: () => void
  onTyping: (isTyping: boolean) => void
  onFileSelect?: (file: File) => void | Promise<void>
  onVoiceSend?: (blob: Blob, duration: number) => Promise<void>
  isDark?: boolean
  uploads?: UploadProgress[]
  /** When true: Enter sends, Shift+Enter newline. When false: Enter newline, Shift+Enter sends. */
  enterToSend?: boolean
}

interface PendingFile {
  file: File
  preview: string | null
  error?: string
}

export function MessageComposer({
  disabled,
  replyTo,
  editingMessage,
  onSend,
  onCancelReply,
  onEdit,
  onCancelEdit,
  onTyping,
  onFileSelect,
  onVoiceSend,
  isDark = false,
  uploads = [],
  enterToSend = true
}: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Sync content when editing message changes
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || '')
      textareaRef.current?.focus()
    } else {
      setContent('')
    }
  }, [editingMessage])

  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [replyTo])

  const handleContentChange = (value: string) => {
    setContent(value)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    onTyping(true)
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false)
    }, 2000)
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validation = validateFileUpload(file)
      
      if (!validation.valid) {
        setPendingFiles(prev => [...prev, { file, preview: null, error: validation.error }])
        continue
      }

      // Generate preview for images
      let preview: string | null = null
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }
      
      setPendingFiles(prev => [...prev, { file, preview }])
    }
  }

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => {
      const file = prev[index]
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSend = async () => {
    const hasContent = content.trim().length > 0
    const hasFiles = pendingFiles.filter(f => !f.error).length > 0

    if (editingMessage) {
      // Edit mode: save changes
      if (!hasContent || sending) return
      setSending(true)
      try {
        await onEdit(editingMessage.id, content.trim())
        setContent('')
        onCancelEdit()
        onTyping(false)
      } finally {
        setSending(false)
      }
      return
    }

    if ((!hasContent && !hasFiles) || sending) return

    setSending(true)
    try {
      // Send text message first
      if (hasContent) {
        await onSend(content.trim(), replyTo?.id)
        setContent('')
      }
      
      // Send files
      for (const pf of pendingFiles) {
        if (pf.error) continue
        await onFileSelect?.(pf.file)
        if (pf.preview) URL.revokeObjectURL(pf.preview)
      }
      
      setPendingFiles([])
      onCancelReply()
      onTyping(false)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && editingMessage) {
      e.preventDefault()
      onCancelEdit()
      return
    }
    if (e.key === 'Enter') {
      if (enterToSend && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      } else if (!enterToSend && e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }
  }

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [content])

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  // Get file icon component
  const getFileIconComponent = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />
    if (type.startsWith('video/')) return <Film className="h-5 w-5" />
    if (type.startsWith('audio/')) return <Music className="h-5 w-5" />
    return <FileText className="h-5 w-5" />
  }

  // Active uploads from props
  const activeUploads = uploads.filter(u => u.status === 'uploading')

  return (
    <div 
      ref={dropZoneRef}
      className={cn(
        "border-t p-4 transition-colors",
        isDark ? "border-slate-700 bg-slate-900" : "border-slate-100 bg-white",
        dragOver && "ring-2 ring-teal-500 ring-inset bg-teal-50/10"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {pendingFiles.map((pf, idx) => (
            <div
              key={idx}
              className={cn(
                "relative group rounded-xl overflow-hidden border",
                pf.error 
                  ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20" 
                  : isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"
              )}
            >
              {pf.preview ? (
                <img src={pf.preview} alt={pf.file.name} className="h-20 w-20 object-cover" />
              ) : (
                <div className="h-20 w-20 flex flex-col items-center justify-center p-2">
                  {getFileIconComponent(pf.file.type)}
                  <span className={cn(
                    "text-[10px] mt-1 truncate max-w-full px-1",
                    isDark ? "text-slate-400" : "text-slate-500"
                  )}>
                    {pf.file.name.length > 12 ? pf.file.name.slice(0, 10) + '...' : pf.file.name}
                  </span>
                  <span className={cn(
                    "text-[9px]",
                    isDark ? "text-slate-500" : "text-slate-400"
                  )}>
                    {formatFileSize(pf.file.size)}
                  </span>
                </div>
              )}
              {pf.error && (
                <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center p-1">
                  <span className="text-white text-[9px] text-center">{pf.error}</span>
                </div>
              )}
              <button
                onClick={() => removePendingFile(idx)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active uploads progress */}
      {activeUploads.length > 0 && (
        <div className="mb-3 space-y-2">
          {activeUploads.map(upload => (
            <div 
              key={upload.fileId}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg text-sm",
                isDark ? "bg-slate-800" : "bg-slate-100"
              )}
            >
              <LoadingSpinner size="sm" className="border-teal-500" />
              <span className={cn("truncate flex-1", isDark ? "text-slate-300" : "text-slate-600")}>
                {upload.fileName}
              </span>
              <span className="text-xs text-teal-500">{upload.progress}%</span>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
        multiple
        onChange={(e) => {
          handleFileSelect(e.target.files)
          e.target.value = ''
        }}
      />

      <AnimatePresence mode="wait">
        {isRecordingVoice ? (
          <motion.div
            key="voice-recorder"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full"
          >
            <VoiceMessageRecorder
              isRecording={isRecordingVoice}
              onStartRecording={() => setIsRecordingVoice(true)}
              onCancel={() => setIsRecordingVoice(false)}
              onSend={async (blob, duration) => {
                try {
                  if (onVoiceSend) {
                    await onVoiceSend(blob, duration)
                  }
                } finally {
                  setIsRecordingVoice(false)
                }
              }}
              disabled={disabled}
            />
          </motion.div>
        ) : (
          <motion.div
            key="text-composer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex items-end gap-3 w-full"
          >
            <div className="flex gap-1">
              {!editingMessage && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  )}
                  title="Attach"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowEmoji(!showEmoji)}
                  className={cn(
                    'p-2.5 rounded-xl transition-all',
                    showEmoji
                      ? (isDark ? 'bg-slate-800 text-teal-300' : 'bg-teal-100 text-teal-600')
                      : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100')
                  )}
                  title="Add emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>
                {showEmoji && (
                  <div className={cn(
                    "absolute bottom-full left-0 mb-2 p-2 rounded-xl shadow-lg border flex gap-1 z-10",
                    isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-100"
                  )}>
                    {['1f604', '2764', '1f44d', '1f525', '1f389', '1f44f', '1f914', '1f622'].map((code, i) => (
                      <button
                        key={code}
                        onClick={() => {
                          setContent(prev => prev + String.fromCodePoint(parseInt(code, 16)))
                          setShowEmoji(false)
                        }}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center text-xl rounded-lg transition-colors",
                          isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                        )}
                      >
                        {String.fromCodePoint(parseInt(code, 16))}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
                disabled={disabled}
                rows={1}
                className={cn(
                  "w-full px-4 py-3 rounded-2xl text-sm resize-none transition-all border focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed",
                  isDark
                    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                )}
                style={{ minHeight: '52px' }}
              />
            </div>

            {editingMessage && (
              <button
                onClick={onCancelEdit}
                className={cn(
                  'p-2.5 rounded-xl transition-all',
                  isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
                )}
                title="Cancel edit"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            {/* Voice message button - show only when no text and not editing */}
            {!editingMessage && !content.trim() && pendingFiles.length === 0 && onVoiceSend && (
              <button
                onClick={() => setIsRecordingVoice(true)}
                disabled={disabled}
                className={cn(
                  'p-2.5 rounded-xl transition-all',
                  isDark 
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-teal-400' 
                    : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'
                )}
                title="Record voice message"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
            
            <button
              onClick={handleSend}
              disabled={
                editingMessage
                  ? !content.trim() || disabled || sending
                  : (!content.trim() && pendingFiles.filter(f => !f.error).length === 0) || disabled || sending
              }
              className={cn(
                'p-2.5 rounded-xl transition-all',
                (editingMessage ? content.trim() : content.trim() || pendingFiles.filter(f => !f.error).length > 0)
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700 shadow-lg shadow-teal-500/25'
                  : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {sending ? <LoadingSpinner size="sm" /> : editingMessage ? <Save className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
