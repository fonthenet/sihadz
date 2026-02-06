'use client'

import { useCallback, useState, useRef } from 'react'
import { useEnhancedUpload, type UploadProgress } from '@/lib/hooks/use-enhanced-upload'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  File as FileIcon,
  CheckCircle,
  AlertCircle,
  RotateCw,
  Loader2,
} from 'lucide-react'

interface EnhancedFileUploadProps {
  /**
   * Callback when files are uploaded successfully
   */
  onUploadComplete?: (urls: string[]) => void
  /**
   * Maximum file size in MB
   */
  maxSizeMB?: number
  /**
   * Allowed file types (MIME types)
   */
  allowedTypes?: string[]
  /**
   * Allow multiple files
   */
  multiple?: boolean
  /**
   * Show upload previews
   */
  showPreviews?: boolean
  /**
   * Custom upload path prefix
   */
  pathPrefix?: string
  /**
   * Custom class name
   */
  className?: string
  /**
   * Disabled state
   */
  disabled?: boolean
  /**
   * Accept attribute for file input
   */
  accept?: string
  /**
   * Children to render custom trigger
   */
  children?: React.ReactNode
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />
  if (type.startsWith('video/')) return <Film className="h-5 w-5" />
  if (type.startsWith('audio/')) return <Music className="h-5 w-5" />
  if (type === 'application/pdf') return <FileText className="h-5 w-5" />
  return <FileIcon className="h-5 w-5" />
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function EnhancedFileUpload({
  onUploadComplete,
  maxSizeMB = 10,
  allowedTypes,
  multiple = false,
  showPreviews = true,
  pathPrefix,
  className,
  disabled = false,
  accept,
  children,
}: EnhancedFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { uploads, uploadFiles, removeUpload, retryUpload, isUploading } = useEnhancedUpload({
    maxSize: maxSizeMB * 1024 * 1024,
    allowedTypes,
    onComplete: (file, url) => {
      // Check if all uploads are complete
      setTimeout(() => {
        const allComplete = uploads.every((u) => u.status === 'complete')
        if (allComplete) {
          const urls = uploads.filter((u) => u.url).map((u) => u.url!)
          onUploadComplete?.(urls)
        }
      }, 100)
    },
  })

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const fileArray = Array.from(files)
      await uploadFiles(fileArray, pathPrefix)
    },
    [uploadFiles, pathPrefix]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return
      handleFileSelect(e.dataTransfer.files)
    },
    [disabled, handleFileSelect]
  )

  const openFilePicker = () => {
    if (disabled || isUploading) return
    fileInputRef.current?.click()
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={children ? undefined : openFilePicker}
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-all',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-accent/5',
          disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          !children && 'p-8 text-center'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          disabled={disabled || isUploading}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="sr-only"
        />

        {children || (
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                'rounded-full bg-primary/10 p-3 transition-transform',
                isDragging && 'scale-110'
              )}
            >
              <Upload className={cn('h-6 w-6 text-primary', isUploading && 'animate-pulse')} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {allowedTypes
                  ? `Allowed: ${allowedTypes.map((t) => t.split('/')[1]).join(', ')}`
                  : 'Images, PDFs, and more'}{' '}
                (max {maxSizeMB}MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress List */}
      {showPreviews && uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload) => (
            <UploadItem
              key={upload.id}
              upload={upload}
              onRemove={() => removeUpload(upload.id)}
              onRetry={() => retryUpload(upload.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface UploadItemProps {
  upload: UploadProgress
  onRemove: () => void
  onRetry: () => void
}

function UploadItem({ upload, onRemove, onRetry }: UploadItemProps) {
  const isImage = upload.file.type.startsWith('image/')

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      {/* Preview or Icon */}
      <div className="flex-shrink-0">
        {isImage && upload.preview ? (
          <img
            src={upload.preview}
            alt={upload.file.name}
            className="h-12 w-12 rounded object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-muted-foreground">
            {getFileIcon(upload.file.type)}
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{upload.file.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(upload.file.size)}</span>
          {upload.status === 'uploading' && <span>• {upload.progress}%</span>}
          {upload.status === 'processing' && <span>• Processing...</span>}
          {upload.status === 'complete' && <span className="text-green-600">• Complete</span>}
          {upload.status === 'error' && (
            <span className="text-red-600">• {upload.error || 'Failed'}</span>
          )}
        </div>

        {/* Progress Bar */}
        {(upload.status === 'uploading' || upload.status === 'processing') && (
          <Progress
            value={upload.status === 'processing' ? undefined : upload.progress}
            className="mt-2 h-1"
          />
        )}
      </div>

      {/* Status Icon & Actions */}
      <div className="flex items-center gap-1">
        {upload.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {upload.status === 'processing' && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        {upload.status === 'complete' && <CheckCircle className="h-4 w-4 text-green-600" />}
        {upload.status === 'error' && (
          <>
            <AlertCircle className="h-4 w-4 text-red-600" />
            <Button variant="ghost" size="sm" onClick={onRetry} className="h-7 w-7 p-0">
              <RotateCw className="h-3 w-3" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
