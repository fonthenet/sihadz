'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/language-context'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { DocumentUpload } from '@/components/document-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight,
  ArrowLeft,
  FileText, 
  CreditCard, 
  Shield, 
  Upload,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'

interface Document {
  id: string
  name: string
  type: 'chifa' | 'id' | 'medical' | 'insurance' | 'lab' | 'other'
  uploadDate: string
  status: 'verified' | 'pending' | 'expired'
  fileUrl: string
}

export default function DocumentsPage() {
  const { t, dir } = useLanguage()
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />{t('verified')}</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />{t('pending')}</Badge>
      case 'expired':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />{t('expired')}</Badge>
    }
  }

  const getDocumentIcon = (type: Document['type']) => {
    switch (type) {
      case 'chifa':
        return <Shield className="h-8 w-8 text-primary" />
      case 'id':
        return <CreditCard className="h-8 w-8 text-blue-600" />
      default:
        return <FileText className="h-8 w-8 text-muted-foreground" />
    }
  }

  const filteredDocuments = activeTab === 'all' 
    ? (documents || [])
    : (documents || []).filter(d => d.type === activeTab)

  const handleUpload = (files: File[], category: string) => {
    const newDocs = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      name: file.name,
      type: category as Document['type'],
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'pending' as const,
      fileUrl: URL.createObjectURL(file)
    }))
    setDocuments([...newDocs, ...documents])
  }

  return (
    <div className="min-h-screen flex flex-col" dir={dir}>
      <Header />
      
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/dashboard" className="hover:text-primary">{t('dashboard')}</Link>
            <ArrowIcon className="h-4 w-4" />
            <span className="text-foreground">{t('myDocuments')}</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">{t('myDocuments')}</h1>
                  <p className="text-muted-foreground">{t('manageDocuments')}</p>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList className="grid grid-cols-5 w-full max-w-lg">
                  <TabsTrigger value="all">{t('all')}</TabsTrigger>
                  <TabsTrigger value="chifa">CHIFA</TabsTrigger>
                  <TabsTrigger value="id">{t('idCard')}</TabsTrigger>
                  <TabsTrigger value="medical">{t('medical')}</TabsTrigger>
                  <TabsTrigger value="lab">{t('labResults')}</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                  {filteredDocuments.length === 0 ? (
                    <Card className="text-center py-12">
                      <CardContent>
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">{t('noDocuments')}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {filteredDocuments.map((doc) => (
                        <Card key={doc.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="flex items-center gap-4 p-4">
                            <div className="p-3 bg-muted rounded-lg">
                              {getDocumentIcon(doc.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{doc.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {t('uploaded')}: {new Date(doc.uploadDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(doc.status)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Upload Sidebar */}
            <div className="lg:w-96">
              <Card>
                <CardHeader>
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
                        id: `new-${Date.now()}`,
                        name: doc.name,
                        type: (doc.type === 'carte_chifa' ? 'chifa' : doc.type === 'national_id' ? 'id' : doc.type === 'lab_results' ? 'lab' : doc.type === 'medical_records' ? 'medical' : 'other') as Document['type'],
                        uploadDate: doc.uploadDate,
                        status: doc.status,
                        fileUrl: doc.fileUrl
                      }
                      setDocuments(prev => [newDoc, ...prev])
                    }}
                    onDelete={(id) => setDocuments(prev => prev.filter(d => d.id !== id))}
                    maxFiles={5}
                    showChifaCard={false}
                  />
                </CardContent>
              </Card>

              {/* CHIFA Card Info */}
              <Card className="mt-4 border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
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
        </div>
      </main>

      <Footer />
    </div>
  )
}
