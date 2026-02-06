'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Eye, Download, Loader2, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DocumentViewer } from '@/components/document-viewer'

type PatientDoc = {
  id: string
  document_type: string
  file_name: string
  file_url: string
  file_type: string
  created_at: string
}

interface PatientDocumentsViewProps {
  patientId: string
  /** When true, allow professional to attach a file to patient */
  canAttach?: boolean
}

export function PatientDocumentsView({ patientId, canAttach = true }: PatientDocumentsViewProps) {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<PatientDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewerDoc, setViewerDoc] = useState<PatientDoc | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!patientId) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/documents/patient/${patientId}`, { credentials: 'include' })
        if (cancelled) return
        if (res.ok) {
          const { documents: docs } = await res.json()
          setDocuments(docs ?? [])
        }
      } catch (e) {
        if (!cancelled) console.error('[PatientDocumentsView]', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [patientId])

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
      fd.append('type', 'patient')
      fd.append('patientId', patientId)
      fd.append('documentType', 'other')
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd, credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      toast({ title: 'Document added to patient' })
      const json = await res.json()
      setDocuments((prev) => [
        { id: json.id, file_name: file.name, file_url: json.fileUrl, file_type: file.type.includes('pdf') ? 'pdf' : 'image', document_type: 'other', created_at: new Date().toISOString() },
        ...prev,
      ])
    } catch (err) {
      toast({ title: 'Upload failed', description: String(err), variant: 'destructive' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/patient/${patientId}`, { credentials: 'include' })
      if (res.ok) {
        const { documents: docs } = await res.json()
        setDocuments(docs ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  if (!patientId) return null

  return (
    <Card className="mt-3">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Patient documents
          </CardTitle>
          {canAttach && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-3 w-3 animate-spin me-1" /> : <Upload className="h-3 w-3 me-1" />}
                Attach
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="py-2 px-3">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No documents in patient vault</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-2 px-2 rounded border bg-muted/20">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <Badge variant="outline" className="text-xs shrink-0">{doc.document_type}</Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewerDoc(doc)} title="View">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={`/api/documents/proxy?type=patient&id=${encodeURIComponent(doc.id)}&download=1`} download={doc.file_name} title="Download">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
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
          fileUrl={viewerDoc.file_url}
          fileName={viewerDoc.file_name}
          fileType={viewerDoc.file_type}
          documentId={viewerDoc.id}
          documentType="patient"
        />
      )}
    </Card>
  )
}
