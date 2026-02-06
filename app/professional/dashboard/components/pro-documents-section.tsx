'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { FileText, Upload, Trash2, Eye, Download, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useLanguage } from '@/lib/i18n/language-context'
import { DocumentViewer } from '@/components/document-viewer'

const CATEGORY_LABELS: Record<string, { en: string; fr: string; ar: string }> = {
  license: { en: 'Licenses & Certifications', fr: 'Licences et certifications', ar: 'التراخيص والشهادات' },
  insurance: { en: 'Insurance', fr: 'Assurance', ar: 'التأمين' },
  other: { en: 'Other', fr: 'Autres', ar: 'أخرى' },
  certificate: { en: 'Licenses & Certifications', fr: 'Licences et certifications', ar: 'التراخيص والشهادات' }, // legacy
}

type ProDoc = {
  id: string
  category: string
  document_type: string
  file_name: string
  file_url: string
  file_type: string
  expiry_date?: string
  status: string
  created_at: string
}

interface ProDocumentsSectionProps {
  /** Pass from parent - works for both owner and employee sessions. Required for employees (no Supabase auth). */
  professionalId?: string | null
}

export function ProDocumentsSection({ professionalId: propProfessionalId }: ProDocumentsSectionProps = {}) {
  const { language } = useLanguage()
  const { toast } = useToast()
  const [documents, setDocuments] = useState<ProDoc[]>([])
  const [fetchedProfessionalId, setFetchedProfessionalId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewerDoc, setViewerDoc] = useState<ProDoc | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createBrowserClient()

  const professionalId = propProfessionalId ?? fetchedProfessionalId

  const lang = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en'
  const getCatLabel = (cat: string) => CATEGORY_LABELS[cat]?.[lang] ?? cat

  const loadProfessional = useCallback(async () => {
    if (propProfessionalId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('professionals').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (prof) setFetchedProfessionalId(prof.id)
  }, [supabase, propProfessionalId])

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents/professional', { credentials: 'include' })
      if (res.ok) {
        const { documents: docs } = await res.json()
        setDocuments(docs ?? [])
      }
    } catch (e) {
      console.error('[ProDocumentsSection]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfessional()
  }, [loadProfessional])

  useEffect(() => {
    if (professionalId) loadDocuments()
    else if (!propProfessionalId) setLoading(false)
  }, [professionalId, loadDocuments, propProfessionalId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !professionalId) return
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
      fd.append('type', 'professional')
      fd.append('professionalId', professionalId)
      fd.append('documentType', 'other')
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd, credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      toast({ title: 'Document uploaded' })
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
      const res = await fetch(`/api/documents/professional/${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id))
        toast({ title: 'Document deleted' })
      } else throw new Error('Delete failed')
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Documents
        </CardTitle>
        <CardDescription>
          Upload and manage your professional documents (certificates, licenses, insurance, etc.).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading || !professionalId}
            />
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {documents.length} document{documents.length !== 1 ? 's' : ''}
              </p>
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading || !professionalId}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Upload className="h-4 w-4 me-2" />}
                Upload document
              </Button>
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-2">No documents yet</p>
                <p className="text-sm text-muted-foreground mb-4">Click the button above to upload licenses, certificates, or insurance documents</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-3 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-xs">
                            {getCatLabel(doc.category)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => setViewerDoc(doc)} title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/api/documents/proxy?type=professional&id=${encodeURIComponent(doc.id)}&download=1`} download={doc.file_name} title="Download">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </CardContent>
      {viewerDoc && (
        <DocumentViewer
          open={!!viewerDoc}
          onOpenChange={(open) => !open && setViewerDoc(null)}
          fileUrl={viewerDoc.file_url}
          fileName={viewerDoc.file_name}
          fileType={viewerDoc.file_type}
          documentId={viewerDoc.id}
          documentType="professional"
        />
      )}
    </Card>
  )
}
