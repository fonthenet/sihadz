'use client'

import { useState, useCallback } from 'react'
import { upload } from '@vercel/blob/client'

export interface UploadProgress {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  url?: string
  error?: string
  preview?: string
}

interface UseEnhancedUploadOptions {
  /**
   * Maximum file size in bytes (default: 10MB)
   */
  maxSize?: number
  /**
   * Allowed file types (MIME types)
   */
  allowedTypes?: string[]
  /**
   * Compress images before upload (default: true)
   */
  compressImages?: boolean
  /**
   * Max image width/height for compression (default: 1920)
   */
  maxImageDimension?: number
  /**
   * Image quality for compression (0-1, default: 0.85)
   */
  imageQuality?: number
  /**
   * Callback when upload completes
   */
  onComplete?: (file: File, url: string) => void
  /**
   * Callback when upload fails
   */
  onError?: (file: File, error: string) => void
}

/**
 * Enhanced file upload hook with:
 * - Client-side direct upload to Vercel Blob
 * - Automatic image compression
 * - Progress tracking
 * - Preview generation
 * - Better error handling
 */
export function useEnhancedUpload(options: UseEnhancedUploadOptions = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
    compressImages = true,
    maxImageDimension = 1920,
    imageQuality = 0.85,
    onComplete,
    onError,
  } = options

  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())

  /**
   * Compress image file before upload
   */
  const compressImage = useCallback(
    async (file: File): Promise<File> => {
      if (!compressImages || !file.type.startsWith('image/')) {
        return file
      }

      return new Promise((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)

        img.onload = () => {
          URL.revokeObjectURL(objectUrl)

          // Calculate new dimensions
          let { width, height } = img
          if (width > maxImageDimension || height > maxImageDimension) {
            if (width > height) {
              height = (height / width) * maxImageDimension
              width = maxImageDimension
            } else {
              width = (width / height) * maxImageDimension
              height = maxImageDimension
            }
          }

          // Create canvas and compress
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(file)
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file)
                return
              }
              // Only use compressed version if it's smaller
              if (blob.size < file.size) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                resolve(file)
              }
            },
            file.type,
            imageQuality
          )
        }

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl)
          resolve(file) // Fallback to original file
        }

        img.src = objectUrl
      })
    },
    [compressImages, maxImageDimension, imageQuality]
  )

  /**
   * Generate preview URL for file
   */
  const generatePreview = useCallback((file: File): string | undefined => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file)
    }
    return undefined
  }, [])

  /**
   * Validate file before upload
   */
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `File too large. Maximum size: ${(maxSize / (1024 * 1024)).toFixed(0)}MB`,
        }
      }

      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `File type not allowed. Allowed: ${allowedTypes.join(', ')}`,
        }
      }

      return { valid: true }
    },
    [maxSize, allowedTypes]
  )

  /**
   * Upload single file
   */
  const uploadFile = useCallback(
    async (file: File, pathname?: string): Promise<{ url?: string; error?: string }> => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`

      // Validate file
      const validation = validateFile(file)
      if (!validation.valid) {
        onError?.(file, validation.error!)
        return { error: validation.error }
      }

      // Generate preview
      const preview = generatePreview(file)

      // Add to upload queue
      setUploads((prev) =>
        new Map(prev).set(id, {
          id,
          file,
          progress: 0,
          status: 'pending',
          preview,
        })
      )

      try {
        // Compress image if applicable
        setUploads((prev) => {
          const item = prev.get(id)
          if (!item) return prev
          return new Map(prev).set(id, { ...item, status: 'processing' })
        })

        const processedFile = await compressImage(file)

        // Upload to Vercel Blob
        setUploads((prev) => {
          const item = prev.get(id)
          if (!item) return prev
          return new Map(prev).set(id, { ...item, status: 'uploading', progress: 0 })
        })

        const blob = await upload(pathname || processedFile.name, processedFile, {
          access: 'public',
          handleUploadUrl: '/api/blob/upload',
          onUploadProgress: ({ percentage }) => {
            setUploads((prev) => {
              const item = prev.get(id)
              if (!item) return prev
              return new Map(prev).set(id, { ...item, progress: percentage })
            })
          },
        })

        // Complete
        setUploads((prev) => {
          const item = prev.get(id)
          if (!item) return prev
          return new Map(prev).set(id, { ...item, status: 'complete', progress: 100, url: blob.url })
        })

        onComplete?.(file, blob.url)
        return { url: blob.url }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        setUploads((prev) => {
          const item = prev.get(id)
          if (!item) return prev
          return new Map(prev).set(id, { ...item, status: 'error', error: errorMessage })
        })
        onError?.(file, errorMessage)
        return { error: errorMessage }
      }
    },
    [validateFile, generatePreview, compressImage, onComplete, onError]
  )

  /**
   * Upload multiple files
   */
  const uploadFiles = useCallback(
    async (files: File[], pathPrefix?: string): Promise<Array<{ url?: string; error?: string }>> => {
      return Promise.all(
        files.map((file, i) =>
          uploadFile(file, pathPrefix ? `${pathPrefix}/${Date.now()}-${i}-${file.name}` : undefined)
        )
      )
    },
    [uploadFile]
  )

  /**
   * Remove upload from tracking
   */
  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => {
      const next = new Map(prev)
      const item = next.get(id)
      if (item?.preview) {
        URL.revokeObjectURL(item.preview)
      }
      next.delete(id)
      return next
    })
  }, [])

  /**
   * Clear all uploads
   */
  const clearUploads = useCallback(() => {
    uploads.forEach((item) => {
      if (item.preview) {
        URL.revokeObjectURL(item.preview)
      }
    })
    setUploads(new Map())
  }, [uploads])

  /**
   * Retry failed upload
   */
  const retryUpload = useCallback(
    async (id: string) => {
      const item = uploads.get(id)
      if (!item || item.status !== 'error') return

      removeUpload(id)
      return uploadFile(item.file)
    },
    [uploads, removeUpload, uploadFile]
  )

  return {
    uploads: Array.from(uploads.values()),
    uploadFile,
    uploadFiles,
    removeUpload,
    clearUploads,
    retryUpload,
    isUploading: Array.from(uploads.values()).some(
      (u) => u.status === 'uploading' || u.status === 'processing'
    ),
  }
}
