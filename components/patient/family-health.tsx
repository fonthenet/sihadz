'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Users, UserPlus, Syringe, Baby, Calendar, Shield, AlertTriangle,
  CheckCircle, Clock, ChevronRight, Heart, Activity, Thermometer
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/language-context'

interface FamilyMember {
  id: string
  name: string
  relationship: string
  date_of_birth: string
  gender: string
  blood_type?: string
  allergies?: string[]
  chronic_conditions?: string[]
}

interface VaccineRecord {
  id: string
  vaccine_name: string
  vaccine_name_ar: string
  date_administered: string
  next_dose_date?: string
  administered_by?: string
  batch_number?: string
  is_booster: boolean
}

interface UpcomingVaccine {
  vaccine_name: string
  vaccine_name_ar: string
  recommended_age: string
  is_mandatory: boolean
  disease_prevention: string
}

export function FamilyHealth() {
  const { language, dir } = useLanguage()
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([])
  const [upcomingVaccines, setUpcomingVaccines] = useState<UpcomingVaccine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showAddVaccine, setShowAddVaccine] = useState(false)

  // Translation helper
  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      ar: {
        'family_health': 'صحة العائلة',
        'manage_family': 'إدارة سجلات صحة أفراد العائلة',
        'family_members': 'أفراد العائلة',
        'vaccines': 'التطعيمات',
        'health_records': 'السجلات الصحية',
        'add_member': 'إضافة فرد',
        'add_vaccine': 'إضافة تطعيم',
        'upcoming_vaccines': 'التطعيمات القادمة',
        'vaccine_history': 'سجل التطعيمات',
        'child': 'طفل',
        'spouse': 'زوج/زوجة',
        'parent': 'والد/والدة',
        'sibling': 'أخ/أخت',
        'other': 'آخر',
        'years_old': 'سنة',
        'months_old': 'شهر',
        'blood_type': 'فصيلة الدم',
        'allergies': 'الحساسيات',
        'chronic_conditions': 'الأمراض المزمنة',
        'mandatory': 'إلزامي',
        'recommended': 'موصى به',
        'overdue': 'متأخر',
        'due_soon': 'قريباً',
        'completed': 'مكتمل',
        'vaccine_coverage': 'تغطية التطعيمات',
        'no_members': 'لم تتم إضافة أفراد العائلة بعد',
        'full_name': 'الاسم الكامل',
        'relationship': 'العلاقة',
        'date_of_birth': 'تاريخ الميلاد',
        'gender': 'الجنس',
        'male': 'ذكر',
        'female': 'أنثى',
        'save': 'حفظ',
        'cancel': 'إلغاء',
        'protects_against': 'يحمي من',
        'administered_on': 'تم إعطاؤه في',
        'next_dose': 'الجرعة التالية',
        'flu_shot_reminder': 'تذكير: موسم الإنفلونزا قادم! تأكد من حصول جميع أفراد العائلة على لقاح الإنفلونزا.',
      },
      en: {
        'family_health': 'Family Health',
        'manage_family': 'Manage health records for your family members',
        'family_members': 'Family Members',
        'vaccines': 'Vaccines',
        'health_records': 'Health Records',
        'add_member': 'Add Member',
        'add_vaccine': 'Add Vaccine',
        'upcoming_vaccines': 'Upcoming Vaccines',
        'vaccine_history': 'Vaccine History',
        'child': 'Child',
        'spouse': 'Spouse',
        'parent': 'Parent',
        'sibling': 'Sibling',
        'other': 'Other',
        'years_old': 'years old',
        'months_old': 'months old',
        'blood_type': 'Blood Type',
        'allergies': 'Allergies',
        'chronic_conditions': 'Chronic Conditions',
        'mandatory': 'Mandatory',
        'recommended': 'Recommended',
        'overdue': 'Overdue',
        'due_soon': 'Due Soon',
        'completed': 'Completed',
        'vaccine_coverage': 'Vaccine Coverage',
        'no_members': 'No family members added yet',
        'full_name': 'Full Name',
        'relationship': 'Relationship',
        'date_of_birth': 'Date of Birth',
        'gender': 'Gender',
        'male': 'Male',
        'female': 'Female',
        'save': 'Save',
        'cancel': 'Cancel',
        'protects_against': 'Protects against',
        'administered_on': 'Administered on',
        'next_dose': 'Next dose',
        'flu_shot_reminder': 'Reminder: Flu season is coming! Make sure all family members get their flu shots.',
      },
      fr: {
        'family_health': 'Santé Familiale',
        'manage_family': 'Gérer les dossiers de santé de votre famille',
        'family_members': 'Membres de la Famille',
        'vaccines': 'Vaccins',
        'health_records': 'Dossiers Médicaux',
        'add_member': 'Ajouter un Membre',
        'add_vaccine': 'Ajouter un Vaccin',
        'upcoming_vaccines': 'Vaccins à Venir',
        'vaccine_history': 'Historique des Vaccins',
        'child': 'Enfant',
        'spouse': 'Conjoint(e)',
        'parent': 'Parent',
        'sibling': 'Frère/Sœur',
        'other': 'Autre',
        'years_old': 'ans',
        'months_old': 'mois',
        'blood_type': 'Groupe Sanguin',
        'allergies': 'Allergies',
        'chronic_conditions': 'Maladies Chroniques',
        'mandatory': 'Obligatoire',
        'recommended': 'Recommandé',
        'overdue': 'En Retard',
        'due_soon': 'Bientôt Dû',
        'completed': 'Terminé',
        'vaccine_coverage': 'Couverture Vaccinale',
        'no_members': 'Aucun membre de la famille ajouté',
        'full_name': 'Nom Complet',
        'relationship': 'Relation',
        'date_of_birth': 'Date de Naissance',
        'gender': 'Sexe',
        'male': 'Masculin',
        'female': 'Féminin',
        'save': 'Enregistrer',
        'cancel': 'Annuler',
        'protects_against': 'Protège contre',
        'administered_on': 'Administré le',
        'next_dose': 'Prochaine dose',
        'flu_shot_reminder': 'Rappel: La saison de la grippe arrive! Assurez-vous que tous les membres de la famille reçoivent leur vaccin.',
      }
    }
    return translations[language]?.[key] || translations.en[key] || key
  }

  useEffect(() => {
    loadFamilyData()
  }, [])

  useEffect(() => {
    if (selectedMember) {
      loadVaccineRecords(selectedMember.id)
      loadUpcomingVaccines(selectedMember)
    }
  }, [selectedMember])

  const loadFamilyData = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: members } = await supabase
          .from('family_members')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        if (members && members.length > 0) {
          setFamilyMembers(members)
          setSelectedMember(members[0])
        }
      }
    } catch (error) {
      console.error('Error loading family data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadVaccineRecords = async (memberId: string) => {
    try {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('vaccination_records')
        .select(`
          *,
          vaccines (name, name_ar, disease_prevention)
        `)
        .eq('family_member_id', memberId)
        .order('date_administered', { ascending: false })

      if (data) {
        setVaccineRecords(data.map(record => ({
          id: record.id,
          vaccine_name: record.vaccines?.name || record.vaccine_id,
          vaccine_name_ar: record.vaccines?.name_ar || record.vaccine_id,
          date_administered: record.date_administered,
          next_dose_date: record.next_dose_date,
          administered_by: record.administered_by,
          batch_number: record.batch_number,
          is_booster: record.is_booster
        })))
      }
    } catch (error) {
      console.error('Error loading vaccine records:', error)
    }
  }

  const loadUpcomingVaccines = async (member: FamilyMember) => {
    try {
      const supabase = createBrowserClient()
      const age = calculateAge(member.date_of_birth)
      
      // Get all vaccines and filter by age appropriateness
      const { data: vaccines } = await supabase
        .from('vaccines')
        .select('*')
        .eq('is_active', true)
        .order('recommended_age_months', { ascending: true })

      // Get already administered vaccines
      const { data: administered } = await supabase
        .from('vaccination_records')
        .select('vaccine_id')
        .eq('family_member_id', member.id)

      const administeredIds = new Set(administered?.map(v => v.vaccine_id) || [])
      
      // Filter vaccines that haven't been administered yet
      const upcoming = vaccines?.filter(v => !administeredIds.has(v.id)) || []
      
      setUpcomingVaccines(upcoming.map(v => ({
        vaccine_name: v.name,
        vaccine_name_ar: v.name_ar,
        recommended_age: v.recommended_age_months ? `${v.recommended_age_months} months` : 'Any age',
        is_mandatory: v.is_mandatory,
        disease_prevention: v.disease_prevention
      })))
    } catch (error) {
      console.error('Error loading upcoming vaccines:', error)
    }
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const calculateAgeInMonths = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                   (today.getMonth() - birthDate.getMonth())
    return months
  }

  const getAgeDisplay = (dateOfBirth: string) => {
    const months = calculateAgeInMonths(dateOfBirth)
    if (months < 24) {
      return `${months} ${t('months_old')}`
    }
    return `${Math.floor(months / 12)} ${t('years_old')}`
  }

  const getVaccineCoverage = () => {
    if (!selectedMember || upcomingVaccines.length === 0) return 100
    const total = vaccineRecords.length + upcomingVaccines.length
    return Math.round((vaccineRecords.length / total) * 100)
  }

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'child': return <Baby className="h-4 w-4" />
      case 'spouse': return <Heart className="h-4 w-4" />
      case 'parent': return <Users className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  // Check if it's flu season (October - March)
  const isFlySeason = () => {
    const month = new Date().getMonth()
    return month >= 9 || month <= 2
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={dir === 'rtl' ? 'text-right' : ''}>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {t('family_health')}
          </h1>
          <p className="text-muted-foreground">{t('manage_family')}</p>
        </div>
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('add_member')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('add_member')}</DialogTitle>
              <DialogDescription>Add a family member to track their health</DialogDescription>
            </DialogHeader>
            <AddFamilyMemberForm 
              language={language}
              dir={dir}
              t={t}
              onSuccess={() => {
                setShowAddMember(false)
                loadFamilyData()
              }}
              onCancel={() => setShowAddMember(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Flu Season Alert */}
      {isFlySeason() && (
        <Alert className="border-amber-500 bg-amber-50">
          <Thermometer className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {t('flu_shot_reminder')}
          </AlertDescription>
        </Alert>
      )}

      {/* Family Members Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {familyMembers.map((member) => (
          <Card 
            key={member.id}
            className={`cursor-pointer transition-all ${
              selectedMember?.id === member.id 
                ? 'ring-2 ring-primary' 
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedMember(member)}
          >
            <CardContent className="p-4">
              <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {getRelationshipIcon(member.relationship)}
                </div>
                <div className={dir === 'rtl' ? 'text-right' : ''}>
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t(member.relationship)} - {getAgeDisplay(member.date_of_birth)}
                  </p>
                </div>
              </div>
              {member.blood_type && (
                <Badge variant="outline" className="mt-2">
                  {t('blood_type')}: {member.blood_type}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
        
        {familyMembers.length === 0 && !isLoading && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('no_members')}</p>
              <Button className="mt-4" onClick={() => setShowAddMember(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('add_member')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selected Member Details */}
      {selectedMember && (
        <Tabs defaultValue="vaccines" className="space-y-4">
          <TabsList>
            <TabsTrigger value="vaccines" className="gap-2">
              <Syringe className="h-4 w-4" />
              {t('vaccines')}
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-2">
              <Activity className="h-4 w-4" />
              {t('health_records')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vaccines" className="space-y-4">
            {/* Vaccine Coverage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  {t('vaccine_coverage')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{vaccineRecords.length} / {vaccineRecords.length + upcomingVaccines.length} vaccines</span>
                    <span>{getVaccineCoverage()}%</span>
                  </div>
                  <Progress value={getVaccineCoverage()} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Upcoming Vaccines */}
              <Card>
                <CardHeader className={`flex flex-row items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <CardTitle className="text-lg">{t('upcoming_vaccines')}</CardTitle>
                  <Button size="sm" onClick={() => setShowAddVaccine(true)}>
                    <Syringe className="h-4 w-4 mr-1" />
                    {t('add_vaccine')}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingVaccines.slice(0, 5).map((vaccine, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg bg-muted/50 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={dir === 'rtl' ? 'text-right' : ''}>
                          <p className="font-medium">
                            {language === 'ar' ? vaccine.vaccine_name_ar : vaccine.vaccine_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t('protects_against')}: {vaccine.disease_prevention}
                          </p>
                        </div>
                        <Badge variant={vaccine.is_mandatory ? 'destructive' : 'secondary'}>
                          {vaccine.is_mandatory ? t('mandatory') : t('recommended')}
                        </Badge>
                      </div>
                    ))}
                    {upcomingVaccines.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p>All vaccines up to date!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Vaccine History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('vaccine_history')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {vaccineRecords.slice(0, 5).map((record) => (
                      <div 
                        key={record.id}
                        className={`flex items-center justify-between p-3 rounded-lg bg-muted/50 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={dir === 'rtl' ? 'text-right' : ''}>
                          <p className="font-medium flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            {language === 'ar' ? record.vaccine_name_ar : record.vaccine_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t('administered_on')}: {new Date(record.date_administered).toLocaleDateString()}
                          </p>
                        </div>
                        {record.is_booster && (
                          <Badge variant="outline">Booster</Badge>
                        )}
                      </div>
                    ))}
                    {vaccineRecords.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No vaccine records yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="records">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Health records will be displayed here</p>
                <p className="text-sm mt-2">Including medical history, conditions, and health metrics</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// Add Family Member Form Component
function AddFamilyMemberForm({ 
  language, 
  dir, 
  t, 
  onSuccess, 
  onCancel 
}: { 
  language: string
  dir: string
  t: (key: string) => string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    date_of_birth: '',
    gender: '',
    blood_type: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('family_members')
        .insert({
          user_id: user.id,
          ...formData
        })

      if (error) throw error
      onSuccess()
    } catch (error) {
      console.error('Error adding family member:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('full_name')}</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="relationship">{t('relationship')}</Label>
        <Select 
          value={formData.relationship} 
          onValueChange={(value) => setFormData({ ...formData, relationship: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select relationship" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="child">{t('child')}</SelectItem>
            <SelectItem value="spouse">{t('spouse')}</SelectItem>
            <SelectItem value="parent">{t('parent')}</SelectItem>
            <SelectItem value="sibling">{t('sibling')}</SelectItem>
            <SelectItem value="other">{t('other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dob">{t('date_of_birth')}</Label>
        <Input
          id="dob"
          type="date"
          value={formData.date_of_birth}
          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gender">{t('gender')}</Label>
        <Select 
          value={formData.gender} 
          onValueChange={(value) => setFormData({ ...formData, gender: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">{t('male')}</SelectItem>
            <SelectItem value="female">{t('female')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blood_type">{t('blood_type')}</Label>
        <Select 
          value={formData.blood_type} 
          onValueChange={(value) => setFormData({ ...formData, blood_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select blood type (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A+">A+</SelectItem>
            <SelectItem value="A-">A-</SelectItem>
            <SelectItem value="B+">B+</SelectItem>
            <SelectItem value="B-">B-</SelectItem>
            <SelectItem value="AB+">AB+</SelectItem>
            <SelectItem value="AB-">AB-</SelectItem>
            <SelectItem value="O+">O+</SelectItem>
            <SelectItem value="O-">O-</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="bg-transparent">
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : t('save')}
        </Button>
      </div>
    </form>
  )
}
