'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { FileText, Upload, Trash2, Eye, Download, Loader2, Paperclip, ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DocumentViewer } from '@/components/document-viewer'

type VisitDoc = {
  id: string
  file_name: string
  file_url: string
  file_type: string
  document_type: string
  uploaded_by_type: string
  created_at: string
}

interface VisitDocumentsAttachProps {
  appointmentId: string
  /** 'patient' | 'professional' - who is viewing (both can upload) */
  viewerType: 'patient' | 'professional'
  /** When true, render content only (no card/collapsible) - for embedding in tabs */
  embedded?: boolean
}

export function VisitDocumentsAttach({ appointmentId, viewerType, embedded }: VisitDocumentsAttachProps) {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<VisitDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewerDoc, setViewerDoc] = useState<VisitDoc | null>(null)
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = async () => {
    try {
      const res = await fetch(`/api/documents/visit/${appointmentId}`, { credentials: 'include' })
      if (res.ok) {
        const { documents: docs } = await res.json()
        setDocuments(docs ?? [])
      }
    } catch (e) {
      console.error('[VisitDocumentsAttach]', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [appointmentId])

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
      fd.append('type', 'visit')
      fd.append('appointmentId', appointmentId)
      fd.append('documentType', 'other')
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd, credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      toast({ title: 'Document attached' })
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
      const res = await fetch(`/api/documents/visit/${appointmentId}?id=${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id))
        toast({ title: 'Document removed' })
      } else throw new Error('Delete failed')
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  const docList = loading ? (
    <div className="flex justify-center py-6">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ) : documents.length === 0 ? (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground mb-3">No documents attached to this visit</p>
      <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        <Upload className="h-4 w-4 me-1" />
        Add document
      </Button>
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
                  {doc.uploaded_by_type === 'patient' ? 'Patient' : 'Professional'}
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
              <a href={`/api/documents/proxy?type=visit&id=${encodeURIComponent(doc.id)}&download=1`} download={doc.file_name} title="Download">
                <Download className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(doc.id)} title="Remove">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )

  const documentViewer = viewerDoc && (
    <DocumentViewer
      open={!!viewerDoc}
      onOpenChange={(o) => !o && setViewerDoc(null)}
      fileUrl={viewerDoc.file_url}
      fileName={viewerDoc.file_name}
      fileType={viewerDoc.file_type}
      documentId={viewerDoc.id}
      documentType="visit"
    />
  )

  if (embedded) {
    return (
      <>
        <div className="flex items-center justify-end gap-2 mb-3">
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Upload className="h-4 w-4 me-1" />}
            Attach file
          </Button>
        </div>
        {docList}
        {documentViewer}
      </>
    )
  }

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity w-full min-w-0">
                <CardTitle className="flex items-center gap-2 text-base m-0">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  Attached documents
                  {documents.length > 0 && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {documents.length}
                    </Badge>
                  )}
                </CardTitle>
                <span className="shrink-0 text-muted-foreground">
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>
            </CollapsibleTrigger>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Upload className="h-4 w-4 me-1" />}
              Attach file
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>{docList}</CardContent>
        </CollapsibleContent>
      </Collapsible>
      {documentViewer}
    </Card>
  )
}
