'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/language-context'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { PrescriptionForm } from '@/components/prescription-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight,
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Shield
} from 'lucide-react'

// Mock patient data
const mockPatient = {
  id: '1',
  name: 'محمد أمين بن عبد الله',
  nameEn: 'Mohamed Amine Benabdallah',
  phone: '+213 555 123 456',
  email: 'mohamed@email.com',
  dateOfBirth: '1990-05-15',
  chifaNumber: '123456789012',
  hasChifa: true,
  allergies: ['Pénicilline'],
  chronicConditions: ['Hypertension'],
  lastVisit: '2024-01-15'
}

function PrescriptionPageContent() {
  const { t, language, dir } = useLanguage()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId')
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

  const handlePrescriptionSubmit = (prescription: {
    medications: Array<{
      name: string
      dosage: string
      frequency: string
      duration: string
      instructions: string
      isReimbursable: boolean
    }>
    notes: string
    pharmacyId?: string
  }) => {
    console.log('Prescription submitted:', prescription)
    // In production, this would send to API and notify pharmacy
  }

  return (
    <div className="min-h-screen flex flex-col" dir={dir}>
      <Header />
      
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/doctor-dashboard" className="hover:text-primary">{t('doctorDashboard')}</Link>
            <ArrowIcon className="h-4 w-4" />
            <span className="text-foreground">{t('newPrescription')}</span>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Prescription Form */}
            <div className="lg:col-span-2">
              <PrescriptionForm
                patientId={patientId || '1'}
                patientName={language === 'ar' ? mockPatient.name : mockPatient.nameEn}
                onSubmit={handlePrescriptionSubmit}
              />
            </div>

            {/* Patient Info Sidebar */}
            <div className="space-y-4">
              {/* Patient Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t('patientInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-semibold text-lg">{language === 'ar' ? mockPatient.name : mockPatient.nameEn}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {mockPatient.phone}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('dateOfBirth')}</span>
                      <p className="font-medium">{new Date(mockPatient.dateOfBirth).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('lastVisit')}</span>
                      <p className="font-medium">{new Date(mockPatient.lastVisit).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {mockPatient.hasChifa && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <Shield className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">{t('chifaVerified')}</p>
                        <p className="text-xs text-green-600">N° {mockPatient.chifaNumber}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Medical Alerts */}
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-orange-800 text-base">{t('medicalAlerts')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockPatient.allergies.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-orange-800">{t('allergies')}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mockPatient.allergies.map((allergy, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {mockPatient.chronicConditions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-orange-800">{t('chronicConditions')}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mockPatient.chronicConditions.map((condition, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs border-orange-300 text-orange-700">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Tips */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('prescriptionTips')}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>• {t('tipReimbursable')}</p>
                  <p>• {t('tipGeneric')}</p>
                  <p>• {t('tipPharmacy')}</p>
                  <p>• {t('tipDuration')}</p>
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

function Loading() {
  return null;
}

export default function NewPrescriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PrescriptionPageContent />
    </Suspense>
  )
}
