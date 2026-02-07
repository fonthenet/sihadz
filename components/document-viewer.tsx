'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, ExternalLink, FileText, X } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useFitToScreenScale } from '@/hooks/use-fit-to-screen-scale'

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const PDF_TYPES = ['application/pdf', 'pdf']
const DOC_TYPES = [
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'doc',
  'docx',
]

function isImage(fileType: string): boolean {
  const t = (fileType || '').toLowerCase()
  return IMAGE_TYPES.some((m) => t.includes(m.replace('image/', ''))) || t.startsWith('image/')
}

function isPdf(fileType: string): boolean {
  const t = (fileType || '').toLowerCase()
  return PDF_TYPES.some((m) => t.includes(m))
}

function isDoc(fileType: string): boolean {
  const t = (fileType || '').toLowerCase()
  return DOC_TYPES.some((m) => t.includes(m))
}

export interface DocumentViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Direct URL (for blob URLs or public URLs). Ignored when documentId+documentType provided. */
  fileUrl: string
  fileName?: string
  fileType?: string
  /** When provided with documentType, fetches via proxy (for private Supabase storage). */
  documentId?: string
  documentType?: 'professional' | 'visit' | 'patient' | 'lab_request'
}

export function DocumentViewer({ open, onOpenChange, fileUrl, fileName = 'Document', fileType = '', documentId, documentType }: DocumentViewerProps) {
  const [viewMode, setViewMode] = useState<'image' | 'pdf' | 'doc' | 'fallback'>('fallback')
  const [iframeError, setIframeError] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const fitScale = useFitToScreenScale(800, 1050, 0, true)

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const effectiveUrl = useMemo(() => {
    if (documentId && documentType) {
      return `/api/documents/proxy?type=${documentType}&id=${encodeURIComponent(documentId)}`
    }
    return fileUrl
  }, [fileUrl, documentId, documentType])

  useEffect(() => {
    if (!open || !effectiveUrl) return
    setIframeError(false)
    if (isImage(fileType)) {
      setViewMode('image')
    } else if (isPdf(fileType) || (fileType || '').toLowerCase().includes('html')) {
      setViewMode('pdf')
    } else if (isDoc(fileType)) {
      setViewMode('doc')
    } else {
      // Try to infer from URL or filename
      const ext = (fileName || '').split('.').pop()?.toLowerCase()
      if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
        setViewMode('image')
      } else if (ext === 'pdf') {
        setViewMode('pdf')
      } else if (['doc', 'docx'].includes(ext || '')) {
        setViewMode('doc')
      } else {
        setViewMode('fallback')
      }
    }
  }, [open, effectiveUrl, fileType, fileName])

  const [downloading, setDownloading] = useState(false)
  const handleDownload = async () => {
    const name = fileName || 'document'
    const sameOrigin = typeof window !== 'undefined' && (effectiveUrl.startsWith('/') || effectiveUrl.startsWith(window.location.origin))
    const isBlob = effectiveUrl.startsWith('blob:')

    if (sameOrigin && !isBlob) {
      setDownloading(true)
      const downloadUrl = effectiveUrl.includes('?') ? `${effectiveUrl}&download=1` : `${effectiveUrl}?download=1`
      try {
        const res = await fetch(downloadUrl, { credentials: 'include' })
        if (!res.ok) throw new Error('Download failed')
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 500)
      } catch {
        const fallbackUrl = effectiveUrl.includes('?') ? `${effectiveUrl}&download=1` : `${effectiveUrl}?download=1`
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = fallbackUrl
        document.body.appendChild(iframe)
        setTimeout(() => document.body.removeChild(iframe), 5000)
      } finally {
        setDownloading(false)
      }
    } else if (isBlob) {
      const a = document.createElement('a')
      a.href = effectiveUrl
      a.download = name
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else {
      const res = await fetch(effectiveUrl, { mode: 'cors' }).catch(() => null)
      if (res?.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 500)
      } else {
        window.open(effectiveUrl, '_blank')
      }
    }
  }

  const handleOpenNewTab = () => {
    window.open(effectiveUrl, '_blank', 'noopener,noreferrer')
  }

  const absoluteUrl = typeof window !== 'undefined' && !effectiveUrl.startsWith('http') ? `${window.location.origin}${effectiveUrl.startsWith('/') ? '' : '/'}${effectiveUrl}` : effectiveUrl
  const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(absoluteUrl)}&embedded=true`

  const mobileStyle = isMobile
    ? { minWidth: 0, minHeight: 0, width: '100%', maxWidth: '100vw', height: '100%', maxHeight: '100dvh' }
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isMobile && (viewMode === 'pdf' || viewMode === 'doc')
            ? '!p-0 !gap-0 overflow-hidden rounded-none border-0 translate-x-0 translate-y-0 top-0 left-0 !grid-cols-1'
            : 'p-0 gap-0 max-w-[95vw] w-full max-h-[100dvh] sm:max-h-[90vh] overflow-hidden flex flex-col'
        }
        size="xl2"
        showCloseButton={true}
        resizable={!isMobile}
        style={
          isMobile && (viewMode === 'pdf' || viewMode === 'doc')
            ? {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                transform: 'none',
                width: '100vw',
                height: '100dvh',
                maxWidth: '100vw',
                maxHeight: '100dvh',
                minWidth: 0,
                minHeight: 0,
                borderRadius: 0,
                display: 'block',
                overflow: 'hidden',
              }
            : mobileStyle
        }
      >
        {/* Floating X button on mobile for PDF/doc */}
        {isMobile && (viewMode === 'pdf' || viewMode === 'doc') && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 end-3 z-20 h-12 w-12 rounded-full bg-black/70 hover:bg-black/90 text-white shadow-lg"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </Button>
        )}
        {/* Download button on mobile */}
        {isMobile && (viewMode === 'pdf' || viewMode === 'doc') && !iframeError && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 end-[4.5rem] z-20 h-12 w-12 rounded-full bg-black/70 hover:bg-black/90 text-white shadow-lg disabled:opacity-70"
            onClick={handleDownload}
            disabled={downloading}
            aria-label="Download"
          >
            {downloading ? <LoadingSpinner size="sm" className="text-white" /> : <Download className="h-6 w-6" />}
          </Button>
        )}
        {/* Desktop/non-PDF header */}
        {!(isMobile && (viewMode === 'pdf' || viewMode === 'doc')) && (
          <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0 flex flex-row items-center justify-between gap-2">
            <DialogTitle className="truncate flex-1 min-w-0 pe-2">{fileName}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full bg-muted hover:bg-muted/80"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>
        )}
        <div
          className={
            viewMode === 'pdf' || viewMode === 'doc'
              ? isMobile
                ? 'absolute inset-0 overflow-hidden bg-white'
                : 'flex-1 min-h-0 min-w-0 overflow-hidden bg-white'
              : 'flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-background'
          }
        >
          {viewMode === 'image' && (
            <img
              src={effectiveUrl}
              alt={fileName}
              className="w-full h-full object-contain"
            />
          )}
          {viewMode === 'pdf' && !iframeError && (
            isMobile ? (
              <div className="absolute inset-0 overflow-hidden bg-white">
                <iframe
                  src={effectiveUrl}
                  title={fileName}
                  className="border-0 bg-white block"
                  style={{
                    width: 800,
                    height: 1050,
                    transform: `scale(${fitScale})`,
                    transformOrigin: 'top left',
                  }}
                  onError={() => setIframeError(true)}
                />
              </div>
            ) : (
              <iframe
                src={effectiveUrl}
                title={fileName}
                className="absolute inset-0 w-full h-full border-0 bg-white"
                onError={() => setIframeError(true)}
              />
            )
          )}
          {viewMode === 'doc' && !iframeError && (
            <iframe
              src={googleDocsViewerUrl}
              title={fileName}
              className="absolute inset-0 w-full h-full border-0 bg-white"
              onError={() => setIframeError(true)}
            />
          )}
          {(viewMode === 'fallback' || iframeError) && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">
                  {iframeError ? 'Preview could not be loaded' : 'Preview not available'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {iframeError
                    ? 'The document may require authentication or the format is not supported for inline preview.'
                    : 'Open or download the file to view it.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleOpenNewTab}>
                  <ExternalLink className="h-4 w-4 me-2" />
                  Open in new tab
                </Button>
                <Button onClick={handleDownload} disabled={downloading}>
                  {downloading ? <LoadingSpinner size="sm" className="me-2" /> : <Download className="h-4 w-4 me-2" />}
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>
        {(viewMode === 'image' || (viewMode === 'pdf' && !iframeError) || (viewMode === 'doc' && !iframeError)) && !isMobile && (
          <div className="px-6 py-3 border-t shrink-0 flex justify-end">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
              {downloading ? <LoadingSpinner size="sm" className="me-2" /> : <Download className="h-4 w-4 me-2" />}
              Download
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
