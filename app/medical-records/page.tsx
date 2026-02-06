'use client'

import React, { useState } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Upload, 
  Download, 
  Share2, 
  Lock, 
  Eye,
  Trash2,
  Search,
  Filter,
  Plus,
  ImageIcon,
  FileImage,
  Syringe,
  TestTube,
  Pill,
  Heart,
  Activity,
  Calendar,
  Clock,
  Shield,
  FolderOpen,
  ChevronRight,
  MoreVertical
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Loading from './loading'

interface MedicalRecord {
  id: string
  type: 'lab' | 'radiology' | 'prescription' | 'vaccination' | 'consultation' | 'other'
  title: string
  date: string
  doctor?: string
  facility?: string
  description?: string
  shared: boolean
  sharedWith?: string[]
  fileType: 'pdf' | 'image' | 'document'
}

// Medical records will be fetched from database  
const initialRecords: MedicalRecord[] = []

const healthMetrics = [
  { label: 'ضغط الدم', value: '120/80', unit: 'mmHg', status: 'normal', date: '2025-01-15' },
  { label: 'السكر', value: '95', unit: 'mg/dL', status: 'normal', date: '2025-01-15' },
  { label: 'الوزن', value: '75', unit: 'kg', status: 'normal', date: '2025-01-10' },
  { label: 'الكوليسترول', value: '180', unit: 'mg/dL', status: 'normal', date: '2024-12-15' },
]

const mockRecords = [
  { id: '1', type: 'lab', title: 'Lab Test 1', date: '2024-12-01', doctor: 'Dr. Smith', facility: 'City Hospital', shared: false, fileType: 'document' },
  { id: '2', type: 'radiology', title: 'X-Ray 1', date: '2024-12-05', doctor: 'Dr. Johnson', facility: 'City Hospital', shared: true, sharedWith: ['Patient A'], fileType: 'image' },
  { id: '3', type: 'prescription', title: 'Prescription 1', date: '2024-12-10', doctor: 'Dr. Brown', facility: 'City Hospital', shared: false, fileType: 'pdf' },
  { id: '4', type: 'vaccination', title: 'Vaccination 1', date: '2024-12-15', doctor: 'Dr. Davis', facility: 'City Hospital', shared: true, sharedWith: ['Patient B'], fileType: 'document' },
  { id: '5', type: 'consultation', title: 'Consultation 1', date: '2025-01-01', doctor: 'Dr. Wilson', facility: 'City Hospital', shared: false, fileType: 'document' },
]

export default function MedicalRecordsPage() {
  const { language, dir } = useLanguage()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const searchParams = useSearchParams()

  const texts = {
    ar: {
      title: 'السجل الطبي',
      subtitle: 'جميع سجلاتك الطبية في مكان واحد آمن',
      all: 'الكل',
      lab: 'تحاليل',
      radiology: 'أشعة',
      prescriptions: 'وصفات',
      vaccinations: 'تطعيمات',
      consultations: 'استشارات',
      upload: 'رفع ملف',
      search: 'بحث في السجلات...',
      filter: 'تصفية',
      download: 'تحميل',
      share: 'مشاركة',
      delete: 'حذف',
      view: 'عرض',
      shared: 'تمت المشاركة',
      sharedWith: 'مشارك مع',
      doctor: 'الطبيب',
      facility: 'المنشأة',
      date: 'التاريخ',
      healthMetrics: 'المؤشرات الصحية',
      lastUpdated: 'آخر تحديث',
      normal: 'طبيعي',
      high: 'مرتفع',
      low: 'منخفض',
      secureStorage: 'تخزين آمن',
      secureDescription: 'جميع سجلاتك مشفرة ومحمية',
      noRecords: 'لا توجد سجلات',
      uploadFirst: 'قم برفع أول سجل طبي لك',
      quickActions: 'إجراءات سريعة',
      addLabResult: 'إضافة تحليل',
      addXray: 'إضافة أشعة',
      addPrescription: 'إضافة وصفة',
      addVaccination: 'إضافة تطعيم',
      recentRecords: 'السجلات الأخيرة',
      viewAll: 'عرض الكل',
      totalRecords: 'إجمالي السجلات',
      sharedRecords: 'سجلات مشاركة',
      lastUpload: 'آخر رفع',
    },
    fr: {
      title: 'Dossier Médical',
      subtitle: 'Tous vos dossiers médicaux en un seul endroit sécurisé',
      all: 'Tous',
      lab: 'Analyses',
      radiology: 'Radiologie',
      prescriptions: 'Ordonnances',
      vaccinations: 'Vaccinations',
      consultations: 'Consultations',
      upload: 'Télécharger',
      search: 'Rechercher dans les dossiers...',
      filter: 'Filtrer',
      download: 'Télécharger',
      share: 'Partager',
      delete: 'Supprimer',
      view: 'Voir',
      shared: 'Partagé',
      sharedWith: 'Partagé avec',
      doctor: 'Médecin',
      facility: 'Établissement',
      date: 'Date',
      healthMetrics: 'Indicateurs de santé',
      lastUpdated: 'Dernière mise à jour',
      normal: 'Normal',
      high: 'Élevé',
      low: 'Bas',
      secureStorage: 'Stockage sécurisé',
      secureDescription: 'Tous vos dossiers sont cryptés et protégés',
      noRecords: 'Aucun dossier',
      uploadFirst: 'Téléchargez votre premier dossier médical',
      quickActions: 'Actions rapides',
      addLabResult: 'Ajouter une analyse',
      addXray: 'Ajouter une radiographie',
      addPrescription: 'Ajouter une ordonnance',
      addVaccination: 'Ajouter une vaccination',
      recentRecords: 'Dossiers récents',
      viewAll: 'Voir tous',
      totalRecords: 'Total des dossiers',
      sharedRecords: 'Dossiers partagés',
      lastUpload: 'Dernier téléchargement',
    },
    en: {
      title: 'Medical Records',
      subtitle: 'All your medical records in one secure place',
      all: 'All',
      lab: 'Lab Results',
      radiology: 'Radiology',
      prescriptions: 'Prescriptions',
      vaccinations: 'Vaccinations',
      consultations: 'Consultations',
      upload: 'Upload File',
      search: 'Search records...',
      filter: 'Filter',
      download: 'Download',
      share: 'Share',
      delete: 'Delete',
      view: 'View',
      shared: 'Shared',
      sharedWith: 'Shared with',
      doctor: 'Doctor',
      facility: 'Facility',
      date: 'Date',
      healthMetrics: 'Health Metrics',
      lastUpdated: 'Last updated',
      normal: 'Normal',
      high: 'High',
      low: 'Low',
      secureStorage: 'Secure Storage',
      secureDescription: 'All your records are encrypted and protected',
      noRecords: 'No records',
      uploadFirst: 'Upload your first medical record',
      quickActions: 'Quick Actions',
      addLabResult: 'Add Lab Result',
      addXray: 'Add X-Ray',
      addPrescription: 'Add Prescription',
      addVaccination: 'Add Vaccination',
      recentRecords: 'Recent Records',
      viewAll: 'View All',
      totalRecords: 'Total Records',
      sharedRecords: 'Shared Records',
      lastUpload: 'Last Upload',
    }
  }

  const txt = texts[language]

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'lab': return <TestTube className="h-5 w-5 text-blue-500" />
      case 'radiology': return <FileImage className="h-5 w-5 text-purple-500" />
      case 'prescription': return <Pill className="h-5 w-5 text-green-500" />
      case 'vaccination': return <Syringe className="h-5 w-5 text-orange-500" />
      case 'consultation': return <FileText className="h-5 w-5 text-primary" />
      default: return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getRecordTypeLabel = (type: string) => {
    const labels = {
      lab: txt.lab,
      radiology: txt.radiology,
      prescription: txt.prescriptions,
      vaccination: txt.vaccinations,
      consultation: txt.consultations,
      other: txt.all
    }
    return labels[type as keyof typeof labels] || type
  }

  const [records, setRecords] = useState<MedicalRecord[]>(initialRecords)
  
  const filteredRecords = records.filter(record => {
    if (activeTab !== 'all' && record.type !== activeTab) return false
    if (searchQuery && !record.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const sharedCount = mockRecords.filter(r => r.shared).length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className={`flex items-center justify-between mb-8 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <div className={dir === 'rtl' ? 'text-right' : ''}>
              <h1 className="text-3xl font-bold text-foreground">{txt.title}</h1>
              <p className="text-muted-foreground mt-1">{txt.subtitle}</p>
            </div>
            <Button className={`gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <Upload className="h-4 w-4" />
              {txt.upload}
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className={dir === 'rtl' ? 'text-right' : ''}>
                    <p className="text-sm text-muted-foreground">{txt.totalRecords}</p>
                    <p className="text-2xl font-bold">{mockRecords.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Share2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className={dir === 'rtl' ? 'text-right' : ''}>
                    <p className="text-sm text-muted-foreground">{txt.sharedRecords}</p>
                    <p className="text-2xl font-bold">{sharedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-500" />
                  </div>
                  <div className={dir === 'rtl' ? 'text-right' : ''}>
                    <p className="text-sm text-muted-foreground">{txt.lastUpload}</p>
                    <p className="text-lg font-semibold">2025-01-15</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-primary rounded-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div className={dir === 'rtl' ? 'text-right' : ''}>
                    <p className="text-sm font-medium">{txt.secureStorage}</p>
                    <p className="text-xs text-muted-foreground">{txt.secureDescription}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className={dir === 'rtl' ? 'text-right' : ''}>{txt.quickActions}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-3`}>
                    <Button variant="outline" className={`h-auto py-4 flex flex-col gap-2 bg-transparent`}>
                      <TestTube className="h-6 w-6 text-blue-500" />
                      <span className="text-xs">{txt.addLabResult}</span>
                    </Button>
                    <Button variant="outline" className={`h-auto py-4 flex flex-col gap-2 bg-transparent`}>
                      <FileImage className="h-6 w-6 text-purple-500" />
                      <span className="text-xs">{txt.addXray}</span>
                    </Button>
                    <Button variant="outline" className={`h-auto py-4 flex flex-col gap-2 bg-transparent`}>
                      <Pill className="h-6 w-6 text-green-500" />
                      <span className="text-xs">{txt.addPrescription}</span>
                    </Button>
                    <Button variant="outline" className={`h-auto py-4 flex flex-col gap-2 bg-transparent`}>
                      <Syringe className="h-6 w-6 text-orange-500" />
                      <span className="text-xs">{txt.addVaccination}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Records List */}
              <Card>
                <CardHeader>
                  <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <CardTitle>{txt.recentRecords}</CardTitle>
                    <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <div className="relative">
                        <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                        <Input
                          placeholder={txt.search}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`w-48 ${dir === 'rtl' ? 'pr-10 text-right' : 'pl-10'}`}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className={`mb-4 w-full justify-start overflow-x-auto ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <TabsTrigger value="all">{txt.all}</TabsTrigger>
                      <TabsTrigger value="lab">{txt.lab}</TabsTrigger>
                      <TabsTrigger value="radiology">{txt.radiology}</TabsTrigger>
                      <TabsTrigger value="prescription">{txt.prescriptions}</TabsTrigger>
                      <TabsTrigger value="vaccination">{txt.vaccinations}</TabsTrigger>
                    </TabsList>

                    <div className="space-y-3">
                      {filteredRecords.length === 0 ? (
                        <div className="text-center py-12">
                          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">{txt.noRecords}</p>
                          <p className="text-sm text-muted-foreground">{txt.uploadFirst}</p>
                        </div>
                      ) : (
                        filteredRecords.map((record) => (
                          <div
                            key={record.id}
                            className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                          >
                            <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                              <div className="p-2 bg-muted rounded-lg">
                                {getRecordIcon(record.type)}
                              </div>
                              <div className={dir === 'rtl' ? 'text-right' : ''}>
                                <p className="font-medium">{record.title}</p>
                                <div className={`flex items-center gap-2 text-sm text-muted-foreground ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                                  <span>{record.date}</span>
                                  {record.doctor && (
                                    <>
                                      <span>•</span>
                                      <span>{record.doctor}</span>
                                    </>
                                  )}
                                </div>
                                {record.shared && (
                                  <Badge variant="secondary" className="mt-1 text-xs gap-1">
                                    <Share2 className="h-3 w-3" />
                                    {txt.shared}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Share2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Health Metrics */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                    <Activity className="h-5 w-5 text-primary" />
                    {txt.healthMetrics}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {healthMetrics.map((metric, index) => (
                    <div key={index} className={`p-3 bg-muted/50 rounded-lg ${dir === 'rtl' ? 'text-right' : ''}`}>
                      <div className={`flex items-center justify-between mb-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm font-medium">{metric.label}</span>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          {txt.normal}
                        </Badge>
                      </div>
                      <div className={`flex items-baseline gap-1 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                        <span className="text-2xl font-bold">{metric.value}</span>
                        <span className="text-sm text-muted-foreground">{metric.unit}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {txt.lastUpdated}: {metric.date}
                      </p>
                    </div>
                  ))}
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
