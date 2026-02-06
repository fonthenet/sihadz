'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, Trash2, Eye, Download, Loader2, Paperclip } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DocumentViewer } from '@/components/document-viewer'

type LabRequestDoc = {
  id: string
  file_name: string
  file_url: string
  file_type: string
  document_type: string
  created_at: string
}

interface LabRequestDocumentsAttachProps {
  labRequestId: string
  /** 'laboratory' can upload; 'doctor' | 'patient' view only */
  viewerType: 'laboratory' | 'doctor' | 'patient'
  /** Compact mode for embedding in ticket/card */
  compact?: boolean
}

export function LabRequestDocumentsAttach({ labRequestId, viewerType, compact }: LabRequestDocumentsAttachProps) {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<LabRequestDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewerDoc, setViewerDoc] = useState<LabRequestDoc | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canUpload = viewerType === 'laboratory'

  const loadDocuments = async () => {
    try {
      const res = await fetch(`/api/documents/lab-request/${labRequestId}`, { credentials: 'include' })
      if (res.ok) {
        const { documents: docs } = await res.json()
        setDocuments(docs ?? [])
      }
    } catch (e) {
      console.error('[LabRequestDocumentsAttach]', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [labRequestId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 10MB', variant: 'destructive' })
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Use JPEG, PNG, WebP, or PDF', variant: 'destructive' })
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'lab_request')
      fd.append('labRequestId', labRequestId)
      fd.append('documentType', 'lab_result')
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd, credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      toast({ title: 'Document attached', description: 'Doctor and patient will be notified.' })
      loadDocuments()
    } catch (err) {
      toast({ title: 'Upload failed', description: String(err), variant: 'destructive' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/lab-request/${labRequestId}?id=${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id))
        toast({ title: 'Document removed' })
      } else throw new Error('Delete failed')
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  if (compact && documents.length === 0 && !canUpload) return null

  const proxyUrl = (doc: LabRequestDoc) => `/api/documents/proxy?type=lab_request&id=${encodeURIComponent(doc.id)}`
  const downloadUrl = (doc: LabRequestDoc) => `${proxyUrl(doc)}&download=1`

  return (
    <Card className={compact ? 'border-muted' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-4 w-4" />
            {compact ? 'Lab documents' : 'Lab request documents'}
          </CardTitle>
          {canUpload && (
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
          )}
          {canUpload && (
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Upload className="h-4 w-4 me-1" />}
              Attach file
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              {canUpload ? 'No documents attached to this lab request' : 'No documents from the lab yet'}
            </p>
            {canUpload && (
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4 me-1" />
                Add document
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        Lab
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewerDoc(doc)} title="View">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={downloadUrl(doc)} download={doc.file_name} title="Download">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  {canUpload && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(doc.id)} title="Remove">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {viewerDoc && (
        <DocumentViewer
          open={!!viewerDoc}
          onOpenChange={(open) => !open && setViewerDoc(null)}
          fileUrl={proxyUrl(viewerDoc)}
          fileName={viewerDoc.file_name}
          fileType={viewerDoc.file_type}
        />
      )}
    </Card>
  )
}
