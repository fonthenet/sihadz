'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/language-context'
import { useAuth } from '@/components/auth-provider'
import { DocumentUpload } from '@/components/document-upload'
import { DocumentViewer } from '@/components/document-viewer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { DashboardPageWrapper } from '@/components/dashboard/dashboard-page-wrapper'
import { 
  FileText, 
  CreditCard, 
  Shield, 
  Upload,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  FlaskConical,
  LayoutGrid,
  List
} from 'lucide-react'
import { SectionLoading, LoadingSpinner } from '@/components/ui/page-loading'
import { formatDateAlgeria } from '@/lib/date-algeria'
import type { AlgeriaLang } from '@/lib/date-algeria'

interface Document {
  id: string
  name: string
  type: 'chifa' | 'id' | 'medical' | 'insurance' | 'lab' | 'other'
  uploadDate: string
  status: 'verified' | 'pending' | 'expired'
  fileUrl: string
  /** For lab results from API: request_id to link to appointment view */
  labRequestId?: string
  /** For lab results from API: appointment_id if available */
  appointmentId?: string
}

interface LabResultItem {
  id: string
  request_id: string
  result_pdf_url: string | null
  result_data: { lab_fulfillment?: Array<{ test_name?: string; result_value?: string }> } | null
  created_at: string
  request?: {
    request_number?: string
    completed_at?: string
    laboratory?: { business_name?: string }
  }
}

const mapDocType = (dt: string): Document['type'] => {
  if (dt === 'carte_chifa') return 'chifa'
  if (dt === 'national_id') return 'id'
  if (dt === 'medical_records') return 'medical'
  if (dt === 'lab_results') return 'lab'
  if (dt === 'insurance') return 'insurance'
  return 'other'
}

export default function DocumentsPage() {
  const { t, language } = useLanguage()
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [labResults, setLabResults] = useState<LabResultItem[]>([])
  const [labResultsLoading, setLabResultsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null)
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null)

  // Fetch patient documents from database on mount
  useEffect(() => {
    async function fetchPatientDocs() {
      if (!user?.id) return
      try {
        const res = await fetch(`/api/documents/patient/${user.id}`)
        if (res.ok) {
          const data = await res.json()
          const docs: Document[] = (data.documents || []).map((d: any) => ({
            id: d.id,
            name: d.file_name || d.name || 'Document',
            type: d.document_type === 'carte_chifa' ? 'chifa' :
                  d.document_type === 'national_id' ? 'id' :
                  d.document_type === 'lab_results' ? 'lab' :
                  d.document_type === 'medical_records' ? 'medical' :
                  d.document_type === 'insurance' ? 'insurance' : 'other',
            uploadDate: d.created_at || d.upload_date || new Date().toISOString(),
            status: (d.status === 'verified' || d.status === 'expired' ? d.status : 'pending') as const,
            fileUrl: d.file_url || '',
          }))
          setDocuments(docs)
        }
      } catch (e) {
        console.error('[Documents] Failed to fetch patient docs:', e)
      } finally {
        setDocsLoading(false)
      }
    }
    fetchPatientDocs()
  }, [user?.id])

  const handleOpenLabPdf = async (labRequestId: string) => {
    setPdfLoadingId(labRequestId)
    // Open blank window immediately (synchronously on user click) to avoid popup blockers
    // on production (e.g. sihadz.com with Cloudflare). We'll navigate it when PDF is ready.
    const targetWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (targetWindow) {
      targetWindow.document.write('<html><body style="font-family:sans-serif;padding:2rem;text-align:center;">Loading PDF...</body></html>')
      targetWindow.document.close()
    }
    try {
      const res = await fetch(`/api/lab-requests/${labRequestId}`)
      if (!res.ok) throw new Error('Failed to load lab results')
      const labRequest = await res.json()
      const { openPdfLabRequest, getLabRequestPrintHtml, openPrintWindow } = await import('@/lib/print-prescription-lab')
      const labTemplate = labRequest.laboratory ? { labName: labRequest.laboratory.business_name } : {}
      const ok = await openPdfLabRequest(labRequest, null, { labReportTemplate: labTemplate, targetWindow })
      if (!ok) {
        openPrintWindow(getLabRequestPrintHtml(labRequest, null, { labReportTemplate: labTemplate }), 'Lab Results', targetWindow)
      }
    } catch (e) {
      console.error('[Documents] PDF error:', e)
      if (targetWindow && !targetWindow.closed) {
        targetWindow.location.href = `/api/documents/lab-results/${labRequestId}/view`
      } else {
        window.open(`/api/documents/lab-results/${labRequestId}/view`, '_blank')
      }
    } finally {
      setPdfLoadingId(null)
    }
  }

  useEffect(() => {
    async function fetchLabResults() {
      try {
        const res = await fetch('/api/documents/lab-results')
        if (res.ok) {
          const { labResults: data } = await res.json()
          setLabResults(data ?? [])
        }
      } catch (e) {
        console.error('[Documents] Failed to fetch lab results:', e)
      } finally {
        setLabResultsLoading(false)
      }
    }
    fetchLabResults()
  }, [])

  useEffect(() => {
    async function fetchDocuments() {
      if (!user?.id) {
        setDocsLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/documents/patient/${user.id}`, { credentials: 'include' })
        if (res.ok) {
          const { documents: data } = await res.json()
          const mapped: Document[] = (data ?? []).map((d: { id: string; file_name: string; file_url: string; document_type?: string; created_at: string }) => ({
            id: d.id,
            name: d.file_name,
            type: mapDocType(d.document_type ?? 'other'),
            uploadDate: d.created_at?.split('T')[0] ?? new Date().toISOString().split('T')[0],
            status: 'pending' as const,
            fileUrl: d.file_url,
          }))
          setDocuments(mapped)
        }
      } catch (e) {
        console.error('[Documents] Failed to fetch documents:', e)
      } finally {
        setDocsLoading(false)
      }
    }
    fetchDocuments()
  }, [user?.id])

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />{t('verified')}</Badge>
      case 'pending':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 me-1" />{t('uploaded')}</Badge>
      case 'expired':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />{t('expired')}</Badge>
    }
  }

  const getDocumentIcon = (type: Document['type']) => {
    switch (type) {
      case 'chifa':
        return <Shield className="h-5 w-5 text-primary dark:text-emerald-400" />
      case 'id':
        return <CreditCard className="h-5 w-5 text-blue-600" />
      case 'lab':
        return <FlaskConical className="h-5 w-5 text-violet-600" />
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  // Lab results from API are automatically included as "lab" documents
  const labDocsFromApi: Document[] = labResults.map((lr) => {
    const reqNum = lr.request?.request_number ?? lr.request_id?.slice(0, 8)
    const labName = lr.request?.laboratory?.business_name
    const name = labName ? `Lab results ${reqNum} - ${labName}` : `Lab results ${reqNum}`
    const apptId = (lr.request as { appointment_id?: string })?.appointment_id
    return {
      id: `lab-${lr.id}`,
      name,
      type: 'lab' as const,
      uploadDate: lr.created_at,
      status: 'verified' as const,
      fileUrl: lr.result_pdf_url ?? '#',
      labRequestId: lr.request_id,
      appointmentId: apptId,
    }
  })

  const handleDeleteDocument = async (id: string) => {
    if (user?.id && !id.startsWith('new-') && !id.startsWith('lab-')) {
      try {
        const res = await fetch(`/api/documents/patient/${user.id}/delete?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
        if (!res.ok) return
      } catch {
        return
      }
    }
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  const allDocuments = [...labDocsFromApi, ...(documents || [])]
  const filteredDocuments = activeTab === 'all' 
    ? allDocuments
    : allDocuments.filter(d => d.type === activeTab)



  return (
    <DashboardPageWrapper maxWidth="xl" showHeader={false}>
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('myDocuments')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('manageDocuments')}</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/30">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-2"
            onClick={() => setViewMode('grid')}
            title={language === 'ar' ? 'عرض شبكي' : language === 'fr' ? 'Vue grille' : 'Grid view'}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-2"
            onClick={() => setViewMode('list')}
            title={language === 'ar' ? 'عرض قائمة' : language === 'fr' ? 'Vue liste' : 'List view'}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-nowrap w-full overflow-x-auto">
              <TabsTrigger value="all">{t('all')}</TabsTrigger>
              <TabsTrigger value="chifa">CHIFA</TabsTrigger>
              <TabsTrigger value="id">{t('idCard')}</TabsTrigger>
              <TabsTrigger value="medical">{t('medical')}</TabsTrigger>
              <TabsTrigger value="lab">{t('labResults')}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {(labResultsLoading || docsLoading) ? (
                <Card className="rounded-none sm:rounded-xl py-8">
                  <CardContent>
                    <SectionLoading label={t('loading') || 'Loading...'} minHeight="min-h-[160px]" />
                  </CardContent>
                </Card>
              ) : filteredDocuments.length === 0 ? (
                <Card className="rounded-none sm:rounded-xl text-center py-8">
                  <CardContent>
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">{t('noDocuments')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2' 
                  : 'flex flex-col gap-2'}>
                  {filteredDocuments.map((doc) => {
                    const labDocHref = doc.labRequestId && doc.appointmentId
                      ? `/dashboard/appointments/${doc.appointmentId}?labRequest=${doc.labRequestId}`
                      : doc.labRequestId
                        ? `/dashboard/prescriptions?tab=labtests&labRequest=${doc.labRequestId}`
                        : null
                    const isLabDoc = doc.id.startsWith('lab-')
                    const hasPdfUrl = doc.fileUrl && doc.fileUrl !== '#'
                    // Lab docs: click opens PDF directly (same blob experience as appointment details)
                    const useClientPdf = isLabDoc && doc.labRequestId && !hasPdfUrl
                    const cardHref = isLabDoc && hasPdfUrl ? doc.fileUrl! : !useClientPdf ? labDocHref : null
                    const openInNewTab = isLabDoc && hasPdfUrl
                    const isPdfLoading = pdfLoadingId === doc.labRequestId
                    const cardContent = (
                      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="p-2 bg-muted rounded-lg shrink-0">
                            {getDocumentIcon(doc.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{doc.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">
                              {t('uploaded')}: {formatDateAlgeria(new Date(doc.uploadDate), (language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en') as AlgeriaLang)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 flex-wrap">
                          {getStatusBadge(doc.status)}
                          <div className="flex items-center gap-1" onClick={(e) => isLabDoc && e.stopPropagation()}>
                          {isLabDoc && (cardHref || useClientPdf) ? (
                            <>
                              {useClientPdf ? (
                                <Button variant="ghost" size="icon" disabled={isPdfLoading} onClick={(e) => { e.stopPropagation(); handleOpenLabPdf(doc.labRequestId!) }}>
                                  {isPdfLoading ? <LoadingSpinner size="sm" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setViewerDoc(doc) }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {useClientPdf ? (
                                <Button variant="ghost" size="icon" disabled={isPdfLoading} onClick={(e) => { e.stopPropagation(); handleOpenLabPdf(doc.labRequestId!) }}>
                                  {isPdfLoading ? <LoadingSpinner size="sm" /> : <Download className="h-4 w-4" />}
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={cardHref!} download={doc.name}>
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </>
                          ) : null}
                          {!isLabDoc && doc.fileUrl && doc.fileUrl !== '#' && (
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setViewerDoc(doc) }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {!isLabDoc && (
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id) }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        </div>
                      </CardContent>
                    )
                    return (
                      <Card
                        key={doc.id}
                        className={`rounded-none sm:rounded-xl py-2 gap-0 ${(cardHref || useClientPdf) ? 'hover:shadow-md transition-shadow cursor-pointer' : 'hover:shadow-md transition-shadow'}`}
                      >
                        {useClientPdf ? (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleOpenLabPdf(doc.labRequestId!)}
                            onKeyDown={(e) => e.key === 'Enter' && handleOpenLabPdf(doc.labRequestId!)}
                            className="block"
                          >
                            {cardContent}
                          </div>
                        ) : cardHref ? (
                          openInNewTab ? (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => setViewerDoc(doc)}
                              onKeyDown={(e) => e.key === 'Enter' && setViewerDoc(doc)}
                              className="block"
                            >
                              {cardContent}
                            </div>
                          ) : (
                            <Link href={cardHref} className="block">
                              {cardContent}
                            </Link>
                          )
                        ) : (
                          cardContent
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Upload Sidebar */}
        <div className="lg:w-80 shrink-0">
          <Card className="rounded-none sm:rounded-xl py-2 gap-0">
            <CardHeader className="py-2 px-3 sm:px-4">
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {t('uploadDocument')}
              </CardTitle>
              <CardDescription>{t('uploadDocumentDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload
                documents={[]}
                onUpload={(doc) => {
                  const newDoc: Document = {
                    id: 'id' in doc && doc.id ? doc.id : `new-${Date.now()}`,
                    name: doc.name,
                    type: (doc.type === 'carte_chifa' ? 'chifa' : doc.type === 'national_id' ? 'id' : doc.type === 'lab_results' ? 'lab' : doc.type === 'medical_records' ? 'medical' : 'other') as Document['type'],
                    uploadDate: doc.uploadDate,
                    status: doc.status,
                    fileUrl: doc.fileUrl
                  }
                  setDocuments(prev => [newDoc, ...prev])
                }}
                onDelete={async (id) => {
                  if (user?.id && !id.startsWith('new-')) {
                    try {
                      const res = await fetch(`/api/documents/patient/${user.id}/delete?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
                      if (!res.ok) return
                    } catch {
                      return
                    }
                  }
                  setDocuments(prev => prev.filter(d => d.id !== id))
                }}
                maxFiles={5}
                showChifaCard={false}
                uploadToServer={user?.id ? { type: 'patient', patientId: user.id } : undefined}
              />
            </CardContent>
          </Card>

          {/* CHIFA Card Info */}
          <Card className="rounded-none sm:rounded-xl mt-3 py-2 gap-0 border-primary/20 dark:border-emerald-400/20 bg-primary/5 dark:bg-emerald-500/5">
            <CardHeader className="py-2 px-3 sm:px-4">
              <CardTitle className="flex items-center gap-2 text-primary dark:text-emerald-400">
                <Shield className="h-5 w-5" />
                {t('carteChifa')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>{t('chifaInfo')}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('chifaBenefit1')}</li>
                <li>{t('chifaBenefit2')}</li>
                <li>{t('chifaBenefit3')}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      {viewerDoc && viewerDoc.fileUrl && viewerDoc.fileUrl !== '#' && (
        <DocumentViewer
          open={!!viewerDoc}
          onOpenChange={(open) => !open && setViewerDoc(null)}
          fileUrl={viewerDoc.fileUrl}
          fileName={viewerDoc.name}
          fileType={viewerDoc.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : ''}
        />
      )}
    </DashboardPageWrapper>
  )
}
