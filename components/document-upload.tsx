'use client'

import React from "react"

import { useState, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DocumentViewer } from '@/components/document-viewer'
import { useAuth } from '@/components/auth-provider'
import {
  Upload,
  FileText,
  ImageIcon,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Download,
  CreditCard,
  Shield,
  Trash2
} from 'lucide-react'

export type DocumentType = 
  | 'carte_chifa'
  | 'national_id'
  | 'medical_records'
  | 'lab_results'
  | 'xrays'
  | 'insurance'
  | 'prescription'
  | 'other'

export interface Document {
  id: string
  type: DocumentType
  name: string
  fileUrl: string
  fileType: 'image' | 'pdf'
  uploadDate: string
  expiryDate?: string
  status: 'verified' | 'pending' | 'expired'
  chifaNumber?: string
}

interface DocumentUploadProps {
  documents: Document[]
  onUpload: (doc: Omit<Document, 'id'>) => void
  onDelete: (id: string) => void
  allowedTypes?: DocumentType[]
  maxFiles?: number
  showChifaCard?: boolean
}

export function DocumentUpload({
  documents = [],
  onUpload,
  onDelete,
  allowedTypes = ['carte_chifa', 'national_id', 'medical_records', 'lab_results', 'xrays', 'insurance', 'other'],
  maxFiles = 10,
  showChifaCard = true
}: DocumentUploadProps) {
  const { t, language, dir } = useLanguage()
  const { user } = useAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedType, setSelectedType] = useState<DocumentType>('other')
  const [chifaNumber, setChifaNumber] = useState('')
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  const documentTypeLabels: Record<DocumentType, { ar: string; fr: string; en: string }> = {
    carte_chifa: { ar: 'بطاقة الشفاء', fr: 'Carte Chifa', en: 'Chifa Card' },
    national_id: { ar: 'بطاقة التعريف الوطنية', fr: 'Carte d\'identité nationale', en: 'National ID Card' },
    medical_records: { ar: 'السجلات الطبية', fr: 'Dossiers médicaux', en: 'Medical Records' },
    lab_results: { ar: 'نتائج التحاليل', fr: 'Résultats d\'analyses', en: 'Lab Results' },
    xrays: { ar: 'صور الأشعة', fr: 'Radiographies', en: 'X-Ray Images' },
    insurance: { ar: 'بطاقة التأمين', fr: 'Carte d\'assurance', en: 'Insurance Card' },
    prescription: { ar: 'الوصفة الطبية', fr: 'Ordonnance', en: 'Prescription' },
    other: { ar: 'مستندات أخرى', fr: 'Autres documents', en: 'Other Documents' }
  }

  const getTypeLabel = (type: DocumentType) => documentTypeLabels[type][language]

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [selectedType, chifaNumber])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    handleFiles(files)
  }

  const handleFiles = async (files: File[]) => {
    if ((documents?.length || 0) + files.length > maxFiles) {
      alert(language === 'ar' ? `الحد الأقصى ${maxFiles} ملفات` : `Maximum ${maxFiles} files allowed`)
      return
    }

    if (!user?.id) {
      alert(language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please log in first')
      return
    }

    setIsUploading(true)

    for (const file of files) {
      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf'
      
      if (!isImage && !isPdf) {
        alert(language === 'ar' ? 'يرجى رفع صور أو ملفات PDF فقط' : 'Please upload images or PDF files only')
        continue
      }

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'patient')
        formData.append('documentType', selectedType)
        formData.append('patientId', user.id)
        
        const uploadRes = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        })
        
        if (!uploadRes.ok) {
          const error = await uploadRes.json()
          throw new Error(error.error || 'Upload failed')
        }
        
        const { fileUrl } = await uploadRes.json()
        
        const newDoc: Omit<Document, 'id'> = {
          type: selectedType,
          name: file.name,
          fileUrl,
          fileType: isImage ? 'image' : 'pdf',
          uploadDate: new Date().toISOString().split('T')[0],
          status: 'verified',
          ...(selectedType === 'carte_chifa' && chifaNumber ? { chifaNumber } : {})
        }
        
        onUpload(newDoc)
      } catch (error: any) {
        console.error('[documents] Upload error:', error)
        alert(language === 'ar' ? `فشل الرفع: ${error.message}` : `Upload failed: ${error.message}`)
      }
    }

    setIsUploading(false)
  }

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 me-1" />
            {t('verified')}
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20">
            <CheckCircle className="h-3 w-3 me-1" />
            {t('uploaded')}
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">
            <AlertCircle className="h-3 w-3 me-1" />
            {t('chifaExpired')}
          </Badge>
        )
    }
  }

  const chifaCard = documents?.find(d => d.type === 'carte_chifa')

  return (
    <div className="space-y-6">
      {/* Carte CHIFA Card */}
      {showChifaCard && (
        <Card className={`border-2 ${chifaCard?.status === 'verified' ? 'border-green-500/50 bg-green-500/5' : 'border-primary/20'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('carteChifa')}</CardTitle>
                  <CardDescription>{t('carteChifaDesc')}</CardDescription>
                </div>
              </div>
              {chifaCard && getStatusBadge(chifaCard.status)}
            </div>
          </CardHeader>
          <CardContent>
            {chifaCard ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('carteChifaNumber')}</p>
                    <p className="font-mono text-lg font-semibold">{chifaCard.chifaNumber || 'N/A'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setPreviewDoc(chifaCard)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="bg-transparent text-destructive hover:text-destructive" onClick={() => onDelete(chifaCard.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t('chifaBenefits')}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('carteChifaNumber')}</Label>
                    <Input
                      placeholder="XXXX XXXX XXXX"
                      value={chifaNumber}
                      onChange={(e) => setChifaNumber(e.target.value)}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('uploadCarteChifa')}</Label>
                    <div className="relative">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          setSelectedType('carte_chifa')
                          handleFileSelect(e)
                        }}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'ارفع صورة واضحة للوجهين الأمامي والخلفي لبطاقة الشفاء' : 
                   language === 'fr' ? 'Téléversez une photo claire du recto et verso de votre carte Chifa' :
                   'Upload a clear photo of both front and back of your Chifa card'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>{t('myDocuments')}</CardTitle>
          <CardDescription>
            {language === 'ar' ? 'ارفع مستنداتك الطبية للوصول السريع' :
             language === 'fr' ? 'Téléversez vos documents médicaux pour un accès rapide' :
             'Upload your medical documents for quick access'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document Type Selector */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('documentType')}</Label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as DocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedTypes.filter(t => t !== 'carte_chifa').map(type => (
                    <SelectItem key={type} value={type}>
                      {getTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            <Upload className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-foreground">
              {t('dragDrop')} <span className="text-primary font-medium">{t('browse')}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t('supportedFormats')}</p>
            <p className="text-sm text-muted-foreground">{t('maxFileSize')}</p>
          </div>

          {/* Uploaded Documents List */}
          {(documents || []).filter(d => d.type !== 'carte_chifa').length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">
                {language === 'ar' ? 'المستندات المرفوعة' : language === 'fr' ? 'Documents téléversés' : 'Uploaded Documents'}
              </h4>
              <div className="grid gap-3">
                {(documents || []).filter(d => d.type !== 'carte_chifa').map(doc => (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        {doc.fileType === 'image' ? (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{doc.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{getTypeLabel(doc.type)}</span>
                          <span>•</span>
                          <span>{doc.uploadDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(doc.status)}
                      <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(doc.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {previewDoc && (
        <DocumentViewer
          open={!!previewDoc}
          onOpenChange={(open) => !open && setPreviewDoc(null)}
          fileUrl={previewDoc.fileUrl}
          fileName={previewDoc.name}
          fileType={previewDoc.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'}
        />
      )}
    </div>
  )
}
