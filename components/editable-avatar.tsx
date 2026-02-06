'use client'

import { useRef, useState, ReactNode } from 'react'
import { Camera, Stethoscope, FlaskConical, Pill, Building2, Ambulance } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { compressImage, validateFile } from '@/lib/utils/upload-helpers'

/** Professional type to icon mapping */
const PROFESSIONAL_ICONS: Record<string, ReactNode> = {
  doctor: <Stethoscope className="h-5 w-5" />,
  nurse: <Stethoscope className="h-5 w-5" />,
  laboratory: <FlaskConical className="h-5 w-5" />,
  pharmacy: <Pill className="h-5 w-5" />,
  clinic: <Building2 className="h-5 w-5" />,
  ambulance: <Ambulance className="h-5 w-5" />,
}

interface EditableAvatarProps {
  userId?: string | null
  src: string | null | undefined
  fallback: string
  /** Professional type for icon fallback (doctor, laboratory, pharmacy, clinic, ambulance) */
  professionalType?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  onUpdate?: (avatarUrl: string) => void
  readOnly?: boolean
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10 md:h-12 md:w-12',
  lg: 'h-16 w-16',
}

export function EditableAvatar({
  userId,
  src,
  fallback,
  professionalType,
  className,
  size = 'md',
  onUpdate,
  readOnly = false,
}: EditableAvatarProps) {
  // Use professional-type icon if available and no custom fallback text
  const fallbackContent = professionalType && PROFESSIONAL_ICONS[professionalType]
    ? PROFESSIONAL_ICONS[professionalType]
    : fallback
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const canEdit = !readOnly && !!userId

  const handleClick = () => {
    if (!canEdit || uploading) return
    inputRef.current?.click()
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Validate file
    const validation = validateFile(file, {
      maxSize: 2 * 1024 * 1024, // 2MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    })
    
    if (!validation.valid) {
      toast({
        title: 'Invalid file',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    setPreviewUrl(null)
    try {
      // Compress image before upload
      const compressedFile = await compressImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.9
      })
      
      const formData = new FormData()
      formData.append('file', compressedFile)
      const res = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }
      setPreviewUrl(data.avatar_url)
      onUpdate?.(data.avatar_url)
      toast({ title: 'Photo updated', description: 'Your profile picture has been updated.' })
      window.dispatchEvent(new Event('dzd_avatar_updated'))
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update photo',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const displaySrc = previewUrl || src

  const content = (
    <>
      <Avatar className={cn(sizeClasses[size], 'ring-2 ring-cyan-500/50 ring-offset-2 flex-shrink-0')}>
        {displaySrc && <AvatarImage src={displaySrc} />}
        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white font-semibold text-sm md:text-base">
          {fallbackContent}
        </AvatarFallback>
      </Avatar>
      {canEdit && (
        <>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
            {uploading ? (
              <LoadingSpinner size="sm" className="h-5 w-5 text-white" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleChange}
          />
        </>
      )}
    </>
  )

  if (canEdit) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className={cn(
          'relative group/avatar rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-70',
          className
        )}
        title="Change profile picture"
      >
        {content}
      </button>
    )
  }

  return (
    <div className={cn('relative rounded-full', className)}>
      <Avatar className={cn(sizeClasses[size], 'ring-2 ring-cyan-500/50 ring-offset-2 flex-shrink-0')}>
        {displaySrc && <AvatarImage src={displaySrc} />}
        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white font-semibold text-sm md:text-base">
          {fallbackContent}
        </AvatarFallback>
      </Avatar>
    </div>
  )
}
