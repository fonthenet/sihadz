/**
 * Enhanced upload utilities with image compression, progress tracking, and better UX
 */

export interface UploadProgress {
  progress: number
  loaded: number
  total: number
  status: 'idle' | 'compressing' | 'uploading' | 'complete' | 'error'
  error?: string
}

export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png'
}

/**
 * Compress image before upload to reduce file size
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    mimeType = 'image/jpeg',
  } = options

  // Skip compression for non-images or already small files
  if (!file.type.startsWith('image/') || file.size < 100 * 1024) {
    return file
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            // Only use compressed version if it's actually smaller
            if (blob.size < file.size) {
              const compressedFile = new File([blob], file.name, {
                type: mimeType,
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          mimeType,
          quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
  })
}

/**
 * Generate thumbnail from image file
 */
export async function generateThumbnail(
  file: File,
  size: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(size / img.width, size / img.height)
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = () => reject(new Error('Failed to load image'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
  })
}

/**
 * Upload file with progress tracking
 */
export async function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress?: (progress: UploadProgress) => void
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          progress: Math.round((e.loaded / e.total) * 100),
          loaded: e.loaded,
          total: e.total,
          status: 'uploading',
        })
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Create a Response-like object
        const response = new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers(
            xhr
              .getAllResponseHeaders()
              .split('\r\n')
              .filter(Boolean)
              .reduce((acc, header) => {
                const [key, value] = header.split(': ')
                if (key && value) acc[key] = value
                return acc
              }, {} as Record<string, string>)
          ),
        })
        resolve(response)
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'))
    })

    xhr.open('POST', url)
    xhr.send(formData)
  })
}

/**
 * Validate file before upload
 */
export interface FileValidation {
  valid: boolean
  error?: string
}

export function validateFile(
  file: File,
  options: {
    maxSize?: number
    allowedTypes?: string[]
    allowedExtensions?: string[]
  } = {}
): FileValidation {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ],
    allowedExtensions,
  } = options

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatBytes(maxSize)}`,
    }
  }

  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    }
  }

  // Check file extension
  if (allowedExtensions) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File extension not allowed. Allowed: ${allowedExtensions.join(', ')}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Create a preview URL for a file
 */
export function createPreviewURL(file: File): string | null {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file)
  }
  return null
}

/**
 * Cleanup preview URLs to prevent memory leaks
 */
export function revokePreviewURL(url: string): void {
  try {
    URL.revokeObjectURL(url)
  } catch (e) {
    console.warn('Failed to revoke object URL:', e)
  }
}

/**
 * Upload multiple files with queue management
 */
export async function uploadQueue(
  files: File[],
  uploadFn: (file: File) => Promise<string>,
  options: {
    concurrency?: number
    onProgress?: (completed: number, total: number) => void
    onFileComplete?: (file: File, url: string) => void
    onFileError?: (file: File, error: Error) => void
  } = {}
): Promise<{ successful: string[]; failed: Array<{ file: File; error: Error }> }> {
  const { concurrency = 3, onProgress, onFileComplete, onFileError } = options

  const results: string[] = []
  const errors: Array<{ file: File; error: Error }> = []
  let completed = 0

  const uploadFile = async (file: File): Promise<void> => {
    try {
      const url = await uploadFn(file)
      results.push(url)
      onFileComplete?.(file, url)
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload failed')
      errors.push({ file, error: err })
      onFileError?.(file, err)
    } finally {
      completed++
      onProgress?.(completed, files.length)
    }
  }

  // Process files in batches based on concurrency
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency)
    await Promise.all(batch.map(uploadFile))
  }

  return { successful: results, failed: errors }
}
