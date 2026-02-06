'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  Trash2,
  Send,
  Printer,
  QrCode,
  FileSignature,
  Pill,
  Clock,
  Calendar,
  CheckCircle,
  Shield,
  AlertCircle
} from 'lucide-react'

export interface Medication {
  id: string
  name: string
  nameAr?: string
  dosage: string
  frequency: string
  duration: number
  instructions: string
  isReimbursable: boolean
  hasGeneric: boolean
  genericName?: string
}

export interface Prescription {
  id: string
  patientId: string
  patientName: string
  patientNameAr?: string
  doctorId: string
  doctorName: string
  doctorNameAr?: string
  doctorSpecialty: string
  doctorLicense: string
  medications: Medication[]
  diagnosis: string
  notes: string
  createdAt: string
  validUntil: string
  refills: number
  qrCode: string
  digitalSignature: string
  status: 'active' | 'sent' | 'dispensed' | 'expired'
  pharmacyId?: string
  pharmacyName?: string
}

interface PrescriptionFormProps {
  patientId: string
  patientName: string
  patientNameAr?: string
  onSubmit: (prescription: Omit<Prescription, 'id' | 'qrCode' | 'digitalSignature'>) => void
  onSendToPharmacy: (prescription: Prescription, pharmacyId: string) => void
}

const commonMedications = [
  { name: 'Paracetamol', nameAr: 'باراسيتامول', reimbursable: true },
  { name: 'Amoxicillin', nameAr: 'أموكسيسيلين', reimbursable: true },
  { name: 'Omeprazole', nameAr: 'أوميبرازول', reimbursable: true },
  { name: 'Ibuprofen', nameAr: 'إيبوبروفين', reimbursable: true },
  { name: 'Metformin', nameAr: 'ميتفورمين', reimbursable: true },
  { name: 'Amlodipine', nameAr: 'أملوديبين', reimbursable: true },
  { name: 'Lisinopril', nameAr: 'ليسينوبريل', reimbursable: true },
  { name: 'Atorvastatin', nameAr: 'أتورفاستاتين', reimbursable: true },
]

const frequencyOptions = [
  { value: 'once_daily', ar: 'مرة يومياً', fr: '1x/jour', en: 'Once daily' },
  { value: 'twice_daily', ar: 'مرتين يومياً', fr: '2x/jour', en: 'Twice daily' },
  { value: 'three_daily', ar: 'ثلاث مرات يومياً', fr: '3x/jour', en: 'Three times daily' },
  { value: 'four_daily', ar: 'أربع مرات يومياً', fr: '4x/jour', en: 'Four times daily' },
  { value: 'as_needed', ar: 'عند الحاجة', fr: 'Si besoin', en: 'As needed' },
  { value: 'before_meals', ar: 'قبل الوجبات', fr: 'Avant repas', en: 'Before meals' },
  { value: 'after_meals', ar: 'بعد الوجبات', fr: 'Après repas', en: 'After meals' },
  { value: 'at_bedtime', ar: 'قبل النوم', fr: 'Au coucher', en: 'At bedtime' },
]

export function PrescriptionForm({ 
  patientId, 
  patientName, 
  patientNameAr,
  onSubmit,
  onSendToPharmacy 
}: PrescriptionFormProps) {
  const { t, language, dir } = useLanguage()
  const [medications, setMedications] = useState<Medication[]>([])
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [refills, setRefills] = useState(0)
  const [validityDays, setValidityDays] = useState(30)

  // New medication form state
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    frequency: 'twice_daily',
    duration: 7,
    instructions: '',
    isReimbursable: true,
    hasGeneric: false,
    genericName: ''
  })

  const addMedication = () => {
    if (!newMed.name || !newMed.dosage) return

    const medication: Medication = {
      id: Date.now().toString(),
      name: newMed.name,
      dosage: newMed.dosage,
      frequency: newMed.frequency,
      duration: newMed.duration,
      instructions: newMed.instructions,
      isReimbursable: newMed.isReimbursable,
      hasGeneric: newMed.hasGeneric,
      genericName: newMed.genericName
    }

    setMedications([...medications, medication])
    setNewMed({
      name: '',
      dosage: '',
      frequency: 'twice_daily',
      duration: 7,
      instructions: '',
      isReimbursable: true,
      hasGeneric: false,
      genericName: ''
    })
  }

  const removeMedication = (id: string) => {
    setMedications(medications.filter(m => m.id !== id))
  }

  const getFrequencyLabel = (value: string) => {
    const option = frequencyOptions.find(o => o.value === value)
    return option ? option[language] : value
  }

  const handleSubmit = () => {
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validityDays)

    const prescription: Omit<Prescription, 'id' | 'qrCode' | 'digitalSignature'> = {
      patientId,
      patientName,
      patientNameAr,
      doctorId: 'doc-1',
      doctorName: 'Dr. Amina Benali',
      doctorNameAr: 'د. أمينة بن علي',
      doctorSpecialty: language === 'ar' ? 'طب القلب' : 'Cardiology',
      doctorLicense: 'DZ-MED-2024-1234',
      medications,
      diagnosis,
      notes,
      createdAt: new Date().toISOString().split('T')[0],
      validUntil: validUntil.toISOString().split('T')[0],
      refills,
      status: 'active'
    }

    onSubmit(prescription)
  }

  return (
    <div className="space-y-6">
      {/* Patient Info Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المريض' : 'Patient'}</p>
              <h3 className="text-xl font-semibold text-foreground">
                {language === 'ar' ? patientNameAr || patientName : patientName}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <Calendar className="h-3 w-3 me-1" />
                {new Date().toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnosis */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'التشخيص' : language === 'fr' ? 'Diagnostic' : 'Diagnosis'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder={language === 'ar' ? 'اكتب التشخيص...' : language === 'fr' ? 'Entrez le diagnostic...' : 'Enter diagnosis...'}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            {t('medications')}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'أضف الأدوية الموصوفة' : language === 'fr' ? 'Ajoutez les médicaments prescrits' : 'Add prescribed medications'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Added Medications List */}
          {medications.length > 0 && (
            <div className="space-y-3">
              {medications.map((med, index) => (
                <div key={med.id} className="flex items-start justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {index + 1}
                      </span>
                      <h4 className="font-semibold text-foreground">{med.name}</h4>
                      {med.isReimbursable && (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          <Shield className="h-3 w-3 me-1" />
                          {t('reimbursable')}
                        </Badge>
                      )}
                    </div>
                    <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
                      <span><strong>{t('dosage')}:</strong> {med.dosage}</span>
                      <span><strong>{t('frequency')}:</strong> {getFrequencyLabel(med.frequency)}</span>
                      <span><strong>{t('durationDays')}:</strong> {med.duration}</span>
                    </div>
                    {med.instructions && (
                      <p className="text-sm text-muted-foreground">
                        <strong>{t('instructions')}:</strong> {med.instructions}
                      </p>
                    )}
                    {med.hasGeneric && med.genericName && (
                      <p className="text-sm text-secondary">
                        <strong>{t('genericAvailable')}:</strong> {med.genericName}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeMedication(med.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Add New Medication Form */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">{t('addMedication')}</h4>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('medication')}</Label>
                <Input
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  placeholder={language === 'ar' ? 'اسم الدواء' : 'Medication name'}
                  list="common-meds"
                />
                <datalist id="common-meds">
                  {commonMedications.map(med => (
                    <option key={med.name} value={med.name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label>{t('dosage')}</Label>
                <Input
                  value={newMed.dosage}
                  onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                  placeholder={language === 'ar' ? 'مثال: 500mg' : 'e.g., 500mg'}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('frequency')}</Label>
                <Select value={newMed.frequency} onValueChange={(v) => setNewMed({ ...newMed, frequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt[language]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('durationDays')}</Label>
                <Input
                  type="number"
                  value={newMed.duration}
                  onChange={(e) => setNewMed({ ...newMed, duration: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={365}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>{t('instructions')}</Label>
                <Input
                  value={newMed.instructions}
                  onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                  placeholder={language === 'ar' ? 'تعليمات خاصة للمريض' : 'Special instructions for patient'}
                />
              </div>

              <div className="flex items-center gap-6 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="reimbursable"
                    checked={newMed.isReimbursable}
                    onCheckedChange={(checked) => setNewMed({ ...newMed, isReimbursable: !!checked })}
                  />
                  <Label htmlFor="reimbursable" className="cursor-pointer">
                    {t('reimbursable')}
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasGeneric"
                    checked={newMed.hasGeneric}
                    onCheckedChange={(checked) => setNewMed({ ...newMed, hasGeneric: !!checked })}
                  />
                  <Label htmlFor="hasGeneric" className="cursor-pointer">
                    {t('genericAvailable')}
                  </Label>
                </div>
              </div>

              {newMed.hasGeneric && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>{language === 'ar' ? 'اسم البديل الجنيس' : 'Generic Name'}</Label>
                  <Input
                    value={newMed.genericName}
                    onChange={(e) => setNewMed({ ...newMed, genericName: e.target.value })}
                    placeholder={language === 'ar' ? 'اسم الدواء الجنيس' : 'Generic medication name'}
                  />
                </div>
              )}
            </div>

            <Button onClick={addMedication} disabled={!newMed.name || !newMed.dosage} className="w-full sm:w-auto">
              <Plus className="me-2 h-4 w-4" />
              {t('addMedication')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Options */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'خيارات إضافية' : language === 'fr' ? 'Options supplémentaires' : 'Additional Options'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('refillsRemaining')}</Label>
              <Select value={refills.toString()} onValueChange={(v) => setRefills(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('noRefills')}</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('validUntil')}</Label>
              <Select value={validityDays.toString()} onValueChange={(v) => setValidityDays(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 {language === 'ar' ? 'أيام' : 'days'}</SelectItem>
                  <SelectItem value="14">14 {language === 'ar' ? 'يوم' : 'days'}</SelectItem>
                  <SelectItem value="30">30 {language === 'ar' ? 'يوم' : 'days'}</SelectItem>
                  <SelectItem value="60">60 {language === 'ar' ? 'يوم' : 'days'}</SelectItem>
                  <SelectItem value="90">90 {language === 'ar' ? 'يوم' : 'days'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
              rows={2}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleSubmit} disabled={medications.length === 0} className="w-full sm:w-auto">
            <FileSignature className="me-2 h-4 w-4" />
            {t('createPrescription')}
          </Button>
          <Button variant="outline" className="w-full sm:w-auto bg-transparent">
            <Printer className="me-2 h-4 w-4" />
            {language === 'ar' ? 'طباعة' : 'Print'}
          </Button>
          <Button variant="secondary" disabled={medications.length === 0} className="w-full sm:w-auto">
            <Send className="me-2 h-4 w-4" />
            {t('sendToPharmacy')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
