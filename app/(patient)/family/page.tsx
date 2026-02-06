'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SectionLoading, LoadingSpinner } from '@/components/ui/page-loading'
import { 
  Users, 
  Plus, 
  Calendar, 
  Edit,
  Trash2,
  Heart,
  Baby,
  User,
  Syringe,
  FileText,
  ChevronRight,
  Shield,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Clock,
  Scale,
  Ruler,
  Activity,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  UserCircle,
  X,
  CircleDashed,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface FamilyMember {
  id: string
  full_name: string
  full_name_ar?: string
  date_of_birth: string
  gender: 'male' | 'female' | null
  blood_type?: string
  relationship: string
  relationship_details?: string
  is_minor: boolean
  requires_guardian: boolean
  chifa_number?: string
  allergies: { name: string; severity: string; type?: string }[]
  chronic_conditions: { name: string }[]
  current_medications: { name: string; dosage?: string }[]
  birth_weight_kg?: number
  gestational_weeks?: number
  delivery_type?: string
  feeding_type?: string
  height_cm?: number
  weight_kg?: number
  head_circumference_cm?: number
  last_measured_at?: string
  school_name?: string
  school_grade?: string
  special_needs?: string
  notes_for_doctor?: string
  family_doctor_id?: string
  pediatrician_id?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  family_doctor?: { id: string; business_name: string; specialty?: string } | null
  pediatrician?: { id: string; business_name: string; specialty?: string } | null
  upcoming_appointments?: number
  created_at: string
}

interface VaccinationSummary {
  totalVaccines: number
  completed: number
  mandatoryTotal: number
  mandatoryCompleted: number
  overdueCount: number
  dueCount: number
  completionPercent: number
}

// Translations
const t = {
  en: {
    title: 'My Family',
    subtitle: 'Manage your family members and their health records',
    addMember: 'Add Family Member',
    noMembers: 'No family members yet',
    noMembersDesc: 'Add your children, spouse, parents, or other family members to book appointments for them.',
    child: 'Child',
    spouse: 'Spouse',
    parent: 'Parent',
    sibling: 'Sibling',
    grandparent: 'Grandparent',
    grandchild: 'Grandchild',
    other: 'Other',
    male: 'Male',
    female: 'Female',
    years: 'years',
    months: 'months',
    upcomingApts: 'upcoming appointments',
    vaccinations: 'Vaccinations',
    vaccinesComplete: 'vaccines complete',
    overdue: 'overdue',
    due: 'due now',
    allergies: 'Allergies',
    noAllergies: 'No known allergies',
    conditions: 'Conditions',
    medications: 'Medications',
    measurements: 'Growth',
    height: 'Height',
    weight: 'Weight',
    head: 'Head',
    bmi: 'BMI',
    lastMeasured: 'Last measured',
    birthInfo: 'Birth Info',
    birthWeight: 'Birth weight',
    gestational: 'Gestational',
    weeks: 'weeks',
    delivery: 'Delivery',
    vaginal: 'Vaginal',
    cesarean: 'C-section',
    feeding: 'Feeding',
    breastfed: 'Breastfed',
    formula: 'Formula',
    mixed: 'Mixed',
    solid: 'Solid foods',
    school: 'School',
    grade: 'Grade',
    specialNeeds: 'Special needs',
    notesForDoctor: 'Notes for doctor',
    familyDoctor: 'Family doctor',
    pediatrician: 'Pediatrician',
    emergency: 'Emergency contact',
    bookAppointment: 'Book Appointment',
    viewVaccinations: 'View Vaccinations',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to remove this family member?',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    loading: 'Loading...',
    fullName: 'Full name',
    dateOfBirth: 'Date of birth',
    bloodType: 'Blood type',
    relationship: 'Relationship',
    chifaNumber: 'CHIFA number',
    addAllergy: 'Add allergy',
    allergen: 'Allergen',
    severity: 'Severity',
    mild: 'Mild',
    moderate: 'Moderate',
    severe: 'Severe',
    lifeThreatening: 'Life-threatening',
    guardians: 'Guardians',
    addGuardian: 'Add guardian',
    requiresGuardian: 'Requires guardian',
    healthProfile: 'Health Profile',
    basicInfo: 'Basic Info',
    medicalInfo: 'Medical',
    profile: 'Profile',
  },
  fr: {
    title: 'Ma Famille',
    subtitle: 'Gérez les membres de votre famille et leurs dossiers de santé',
    addMember: 'Ajouter un membre',
    noMembers: 'Aucun membre de famille',
    noMembersDesc: 'Ajoutez vos enfants, conjoint, parents ou autres membres de la famille pour réserver des rendez-vous pour eux.',
    child: 'Enfant',
    spouse: 'Conjoint(e)',
    parent: 'Parent',
    sibling: 'Frère/Sœur',
    grandparent: 'Grand-parent',
    grandchild: 'Petit-enfant',
    other: 'Autre',
    male: 'Homme',
    female: 'Femme',
    years: 'ans',
    months: 'mois',
    upcomingApts: 'rendez-vous à venir',
    vaccinations: 'Vaccinations',
    vaccinesComplete: 'vaccins complets',
    overdue: 'en retard',
    due: 'à faire',
    allergies: 'Allergies',
    noAllergies: 'Aucune allergie connue',
    conditions: 'Conditions',
    medications: 'Médicaments',
    measurements: 'Croissance',
    height: 'Taille',
    weight: 'Poids',
    head: 'Tête',
    bmi: 'IMC',
    lastMeasured: 'Dernière mesure',
    birthInfo: 'Info naissance',
    birthWeight: 'Poids naissance',
    gestational: 'Gestation',
    weeks: 'semaines',
    delivery: 'Accouchement',
    vaginal: 'Voie basse',
    cesarean: 'Césarienne',
    feeding: 'Alimentation',
    breastfed: 'Allaité',
    formula: 'Lait maternisé',
    mixed: 'Mixte',
    solid: 'Solides',
    school: 'École',
    grade: 'Classe',
    specialNeeds: 'Besoins spéciaux',
    notesForDoctor: 'Notes pour le médecin',
    familyDoctor: 'Médecin de famille',
    pediatrician: 'Pédiatre',
    emergency: 'Contact urgence',
    bookAppointment: 'Prendre RDV',
    viewVaccinations: 'Voir vaccinations',
    edit: 'Modifier',
    delete: 'Supprimer',
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer ce membre de la famille?',
    cancel: 'Annuler',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    loading: 'Chargement...',
    fullName: 'Nom complet',
    dateOfBirth: 'Date de naissance',
    bloodType: 'Groupe sanguin',
    relationship: 'Relation',
    chifaNumber: 'Numéro CHIFA',
    addAllergy: 'Ajouter allergie',
    allergen: 'Allergène',
    severity: 'Sévérité',
    mild: 'Légère',
    moderate: 'Modérée',
    severe: 'Sévère',
    lifeThreatening: 'Mortelle',
    guardians: 'Tuteurs',
    addGuardian: 'Ajouter tuteur',
    requiresGuardian: 'Nécessite un tuteur',
    healthProfile: 'Profil santé',
    basicInfo: 'Info base',
    medicalInfo: 'Médical',
    profile: 'Profil',
  },
  ar: {
    title: 'عائلتي',
    subtitle: 'إدارة أفراد عائلتك وسجلاتهم الصحية',
    addMember: 'إضافة فرد',
    noMembers: 'لا يوجد أفراد عائلة',
    noMembersDesc: 'أضف أطفالك أو زوجك أو والديك أو أفراد العائلة الآخرين لحجز المواعيد لهم.',
    child: 'طفل',
    spouse: 'زوج/ة',
    parent: 'والد/ة',
    sibling: 'أخ/أخت',
    grandparent: 'جد/جدة',
    grandchild: 'حفيد/ة',
    other: 'آخر',
    male: 'ذكر',
    female: 'أنثى',
    years: 'سنة',
    months: 'شهر',
    upcomingApts: 'مواعيد قادمة',
    vaccinations: 'التطعيمات',
    vaccinesComplete: 'تطعيمات مكتملة',
    overdue: 'متأخر',
    due: 'مستحق الآن',
    allergies: 'الحساسية',
    noAllergies: 'لا حساسية معروفة',
    conditions: 'الحالات',
    medications: 'الأدوية',
    measurements: 'النمو',
    height: 'الطول',
    weight: 'الوزن',
    head: 'محيط الرأس',
    bmi: 'مؤشر كتلة الجسم',
    lastMeasured: 'آخر قياس',
    birthInfo: 'معلومات الولادة',
    birthWeight: 'وزن الولادة',
    gestational: 'فترة الحمل',
    weeks: 'أسبوع',
    delivery: 'نوع الولادة',
    vaginal: 'طبيعية',
    cesarean: 'قيصرية',
    feeding: 'التغذية',
    breastfed: 'رضاعة طبيعية',
    formula: 'حليب صناعي',
    mixed: 'مختلط',
    solid: 'أطعمة صلبة',
    school: 'المدرسة',
    grade: 'الصف',
    specialNeeds: 'احتياجات خاصة',
    notesForDoctor: 'ملاحظات للطبيب',
    familyDoctor: 'طبيب العائلة',
    pediatrician: 'طبيب الأطفال',
    emergency: 'جهة اتصال الطوارئ',
    bookAppointment: 'حجز موعد',
    viewVaccinations: 'عرض التطعيمات',
    edit: 'تعديل',
    delete: 'حذف',
    confirmDelete: 'هل أنت متأكد من حذف هذا الفرد من العائلة؟',
    cancel: 'إلغاء',
    save: 'حفظ',
    saving: 'جارٍ الحفظ...',
    loading: 'جارٍ التحميل...',
    fullName: 'الاسم الكامل',
    dateOfBirth: 'تاريخ الميلاد',
    bloodType: 'فصيلة الدم',
    relationship: 'صلة القرابة',
    chifaNumber: 'رقم الشفاء',
    addAllergy: 'إضافة حساسية',
    allergen: 'المادة المسببة',
    severity: 'الشدة',
    mild: 'خفيفة',
    moderate: 'متوسطة',
    severe: 'شديدة',
    lifeThreatening: 'مهددة للحياة',
    guardians: 'الأوصياء',
    addGuardian: 'إضافة وصي',
    requiresGuardian: 'يحتاج وصي',
    healthProfile: 'الملف الصحي',
    basicInfo: 'معلومات أساسية',
    medicalInfo: 'طبي',
    profile: 'الملف',
  },
}

function calculateAge(dob: string): { years: number; months: number } {
  const birth = new Date(dob)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (months < 0) {
    years--
    months += 12
  }
  return { years, months }
}

function formatAge(dob: string, lang: string): string {
  const { years, months } = calculateAge(dob)
  const labels = t[lang as keyof typeof t] || t.en
  if (years < 2) {
    const totalMonths = years * 12 + months
    return `${totalMonths} ${labels.months}`
  }
  return `${years} ${labels.years}`
}

// Allergy severity color
function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'life_threatening':
    case 'lifethreatening':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
    case 'severe':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
    case 'moderate':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800'
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
  }
}

// Member card component
function MemberCard({ 
  member, 
  labels, 
  onEdit, 
  onDelete,
  onViewVaccinations,
  expandedId,
  setExpandedId,
  vaccinations,
}: { 
  member: FamilyMember
  labels: typeof t.en
  onEdit: (m: FamilyMember) => void
  onDelete: (id: string) => void
  onViewVaccinations: (id: string) => void
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  vaccinations: Record<string, VaccinationSummary>
}) {
  const isExpanded = expandedId === member.id
  const isChild = member.relationship === 'child' || member.relationship === 'grandchild'
  const isInfant = isChild && calculateAge(member.date_of_birth).years < 2
  const vaxSummary = vaccinations[member.id]
  
  const relationshipLabel = labels[member.relationship as keyof typeof labels] || member.relationship
  const Icon = member.relationship === 'child' ? Baby : member.relationship === 'parent' || member.relationship === 'grandparent' ? UserCircle : User

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-2 ring-primary/30' : ''}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className={`text-lg font-semibold ${member.gender === 'female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>
              {member.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{member.full_name}</h3>
              <Badge variant="secondary" className="text-xs shrink-0">
                <Icon className="h-3 w-3 mr-1" />
                {relationshipLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatAge(member.date_of_birth, 'en')}
              {member.gender && ` • ${labels[member.gender as keyof typeof labels]}`}
              {member.blood_type && ` • ${member.blood_type}`}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(member)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setExpandedId(isExpanded ? null : member.id)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 space-y-3">
        {/* Quick stats */}
        <div className="flex flex-wrap gap-2">
          {/* Upcoming appointments */}
          {member.upcoming_appointments !== undefined && member.upcoming_appointments > 0 && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              {member.upcoming_appointments} {labels.upcomingApts}
            </Badge>
          )}
          
          {/* Allergies quick view */}
          {member.allergies && member.allergies.length > 0 && (
            <Badge className={`gap-1 text-xs ${getSeverityColor(member.allergies[0]?.severity || 'mild')}`}>
              <AlertCircle className="h-3 w-3" />
              {member.allergies.length} {labels.allergies.toLowerCase()}
            </Badge>
          )}
          
          {/* Vaccination status for children */}
          {isChild && vaxSummary && (
            <Badge 
              variant="outline" 
              className={`gap-1 text-xs ${vaxSummary.overdueCount > 0 ? 'border-red-300 text-red-700 dark:text-red-400' : vaxSummary.dueCount > 0 ? 'border-amber-300 text-amber-700 dark:text-amber-400' : 'border-green-300 text-green-700 dark:text-green-400'}`}
            >
              <Syringe className="h-3 w-3" />
              {vaxSummary.completionPercent}%
              {vaxSummary.overdueCount > 0 && ` (${vaxSummary.overdueCount} ${labels.overdue})`}
              {vaxSummary.overdueCount === 0 && vaxSummary.dueCount > 0 && ` (${vaxSummary.dueCount} ${labels.due})`}
            </Badge>
          )}
        </div>
        
        {/* Expanded content */}
        {isExpanded && (
          <div className="pt-3 border-t space-y-4">
            {/* Allergies */}
            {member.allergies && member.allergies.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{labels.allergies}</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {member.allergies.map((a, i) => (
                    <Badge key={i} className={`text-xs ${getSeverityColor(a.severity)}`}>
                      {a.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Measurements for children */}
            {isChild && (member.height_cm || member.weight_kg) && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{labels.measurements}</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {member.height_cm && (
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <Ruler className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">{member.height_cm} cm</p>
                      <p className="text-[10px] text-muted-foreground">{labels.height}</p>
                    </div>
                  )}
                  {member.weight_kg && (
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <Scale className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">{member.weight_kg} kg</p>
                      <p className="text-[10px] text-muted-foreground">{labels.weight}</p>
                    </div>
                  )}
                  {isInfant && member.head_circumference_cm && (
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <CircleDashed className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">{member.head_circumference_cm} cm</p>
                      <p className="text-[10px] text-muted-foreground">{labels.head}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Birth info for infants */}
            {isInfant && (member.birth_weight_kg || member.delivery_type) && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{labels.birthInfo}</Label>
                <div className="text-sm mt-1 space-y-0.5">
                  {member.birth_weight_kg && <p>{labels.birthWeight}: {member.birth_weight_kg} kg</p>}
                  {member.gestational_weeks && <p>{labels.gestational}: {member.gestational_weeks} {labels.weeks}</p>}
                  {member.delivery_type && <p>{labels.delivery}: {member.delivery_type === 'cesarean' ? labels.cesarean : labels.vaginal}</p>}
                  {member.feeding_type && <p>{labels.feeding}: {labels[member.feeding_type as keyof typeof labels] || member.feeding_type}</p>}
                </div>
              </div>
            )}
            
            {/* School info */}
            {member.school_name && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{labels.school}</Label>
                <p className="text-sm">{member.school_name}{member.school_grade && ` - ${labels.grade} ${member.school_grade}`}</p>
              </div>
            )}
            
            {/* Special needs */}
            {member.special_needs && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{labels.specialNeeds}</Label>
                <p className="text-sm">{member.special_needs}</p>
              </div>
            )}
            
            {/* Notes for doctor */}
            {member.notes_for_doctor && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{labels.notesForDoctor}</Label>
                <p className="text-sm text-muted-foreground">{member.notes_for_doctor}</p>
              </div>
            )}
            
            {/* Assigned doctors */}
            {(member.family_doctor || member.pediatrician) && (
              <div className="flex flex-wrap gap-2">
                {member.family_doctor && (
                  <Badge variant="outline" className="gap-1">
                    <Stethoscope className="h-3 w-3" />
                    {member.family_doctor.business_name}
                  </Badge>
                )}
                {member.pediatrician && (
                  <Badge variant="outline" className="gap-1">
                    <Baby className="h-3 w-3" />
                    {member.pediatrician.business_name}
                  </Badge>
                )}
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href={`/booking/new?familyMember=${member.id}`}>
                <Button size="sm" className="gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {labels.bookAppointment}
                </Button>
              </Link>
              {isChild && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => onViewVaccinations(member.id)}>
                  <Syringe className="h-3.5 w-3.5" />
                  {labels.viewVaccinations}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive" onClick={() => onDelete(member.id)}>
                <Trash2 className="h-3.5 w-3.5" />
                {labels.delete}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function FamilyPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const { toast } = useToast()
  const labels = t[language as keyof typeof t] || t.en
  
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [vaccinations, setVaccinations] = useState<Record<string, VaccinationSummary>>({})
  
  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Vaccination dialog
  const [vaxMemberId, setVaxMemberId] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    blood_type: '',
    relationship: 'child',
    chifa_number: '',
    notes_for_doctor: '',
    birth_weight_kg: '',
    gestational_weeks: '',
    delivery_type: '',
    feeding_type: '',
    height_cm: '',
    weight_kg: '',
    head_circumference_cm: '',
    school_name: '',
    school_grade: '',
    special_needs: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  })
  
  // Fetch family members
  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/family-members')
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
        
        // Fetch vaccination summaries for children
        for (const m of (data.members || [])) {
          if (m.relationship === 'child' || m.relationship === 'grandchild') {
            fetch(`/api/family-members/${m.id}/vaccinations`)
              .then(r => r.ok ? r.json() : null)
              .then(d => {
                if (d?.summary) {
                  setVaccinations(prev => ({ ...prev, [m.id]: d.summary }))
                }
              })
              .catch(() => {})
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch family members:', e)
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])
  
  // Open add dialog
  const handleAdd = () => {
    setEditingMember(null)
    setFormData({
      full_name: '',
      date_of_birth: '',
      gender: '',
      blood_type: '',
      relationship: 'child',
      chifa_number: '',
      notes_for_doctor: '',
      birth_weight_kg: '',
      gestational_weeks: '',
      delivery_type: '',
      feeding_type: '',
      height_cm: '',
      weight_kg: '',
      head_circumference_cm: '',
      school_name: '',
      school_grade: '',
      special_needs: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    })
    setDialogOpen(true)
  }
  
  // Open edit dialog
  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member)
    setFormData({
      full_name: member.full_name || '',
      date_of_birth: member.date_of_birth || '',
      gender: member.gender || '',
      blood_type: member.blood_type || '',
      relationship: member.relationship || 'other',
      chifa_number: member.chifa_number || '',
      notes_for_doctor: member.notes_for_doctor || '',
      birth_weight_kg: member.birth_weight_kg?.toString() || '',
      gestational_weeks: member.gestational_weeks?.toString() || '',
      delivery_type: member.delivery_type || '',
      feeding_type: member.feeding_type || '',
      height_cm: member.height_cm?.toString() || '',
      weight_kg: member.weight_kg?.toString() || '',
      head_circumference_cm: member.head_circumference_cm?.toString() || '',
      school_name: member.school_name || '',
      school_grade: member.school_grade || '',
      special_needs: member.special_needs || '',
      emergency_contact_name: member.emergency_contact_name || '',
      emergency_contact_phone: member.emergency_contact_phone || '',
    })
    setDialogOpen(true)
  }
  
  // Save member
  const handleSave = async () => {
    if (!formData.full_name || !formData.date_of_birth || !formData.relationship) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' })
      return
    }
    
    setSaving(true)
    try {
      const payload = {
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender || null,
        blood_type: formData.blood_type || null,
        relationship: formData.relationship,
        chifa_number: formData.chifa_number || null,
        notes_for_doctor: formData.notes_for_doctor || null,
        birth_weight_kg: formData.birth_weight_kg ? parseFloat(formData.birth_weight_kg) : null,
        gestational_weeks: formData.gestational_weeks ? parseInt(formData.gestational_weeks) : null,
        delivery_type: formData.delivery_type || null,
        feeding_type: formData.feeding_type || null,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        head_circumference_cm: formData.head_circumference_cm ? parseFloat(formData.head_circumference_cm) : null,
        school_name: formData.school_name || null,
        school_grade: formData.school_grade || null,
        special_needs: formData.special_needs || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
      }
      
      const url = editingMember ? `/api/family-members/${editingMember.id}` : '/api/family-members'
      const method = editingMember ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (res.ok) {
        toast({ title: editingMember ? 'Updated' : 'Added', description: `${formData.full_name} has been saved.` })
        setDialogOpen(false)
        fetchMembers()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Failed to save', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }
  
  // Delete member
  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/family-members/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Deleted', description: 'Family member removed.' })
        setDeleteId(null)
        fetchMembers()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Failed to delete', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }
  
  const isChild = formData.relationship === 'child' || formData.relationship === 'grandchild'
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              {labels.title}
            </h1>
            <p className="text-muted-foreground text-sm">{labels.subtitle}</p>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            {labels.addMember}
          </Button>
        </div>
        
        {/* Content */}
        {loading ? (
          <SectionLoading minHeight="min-h-[200px]" label={labels.loading} />
        ) : members.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{labels.noMembers}</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">{labels.noMembersDesc}</p>
              <Button onClick={handleAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                {labels.addMember}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                labels={labels}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteId(id)}
                onViewVaccinations={(id) => router.push(`/family/${id}/vaccinations`)}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                vaccinations={vaccinations}
              />
            ))}
          </div>
        )}
      
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember ? labels.edit : labels.addMember}</DialogTitle>
            <DialogDescription>
              {editingMember ? `Editing ${editingMember.full_name}` : 'Add a new family member'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Basic Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>{labels.fullName} *</Label>
                <Input 
                  value={formData.full_name} 
                  onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>{labels.dateOfBirth} *</Label>
                <Input 
                  type="date"
                  value={formData.date_of_birth} 
                  onChange={(e) => setFormData(p => ({ ...p, date_of_birth: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{labels.relationship} *</Label>
                <Select value={formData.relationship} onValueChange={(v) => setFormData(p => ({ ...p, relationship: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">{labels.child}</SelectItem>
                    <SelectItem value="spouse">{labels.spouse}</SelectItem>
                    <SelectItem value="parent">{labels.parent}</SelectItem>
                    <SelectItem value="sibling">{labels.sibling}</SelectItem>
                    <SelectItem value="grandparent">{labels.grandparent}</SelectItem>
                    <SelectItem value="grandchild">{labels.grandchild}</SelectItem>
                    <SelectItem value="other">{labels.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{labels.male}/{labels.female}</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData(p => ({ ...p, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{labels.male}</SelectItem>
                    <SelectItem value="female">{labels.female}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{labels.bloodType}</Label>
                <Select value={formData.blood_type} onValueChange={(v) => setFormData(p => ({ ...p, blood_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                      <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{labels.chifaNumber}</Label>
                <Input 
                  value={formData.chifa_number} 
                  onChange={(e) => setFormData(p => ({ ...p, chifa_number: e.target.value }))}
                  placeholder="CHIFA number"
                />
              </div>
            </div>
            
            {/* Child-specific fields */}
            {isChild && (
              <>
                <div className="border-t pt-4">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-3 block">{labels.birthInfo}</Label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs">{labels.birthWeight} (kg)</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={formData.birth_weight_kg} 
                        onChange={(e) => setFormData(p => ({ ...p, birth_weight_kg: e.target.value }))}
                        placeholder="3.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{labels.gestational}</Label>
                      <Input 
                        type="number"
                        value={formData.gestational_weeks} 
                        onChange={(e) => setFormData(p => ({ ...p, gestational_weeks: e.target.value }))}
                        placeholder="40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{labels.delivery}</Label>
                      <Select value={formData.delivery_type} onValueChange={(v) => setFormData(p => ({ ...p, delivery_type: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vaginal">{labels.vaginal}</SelectItem>
                          <SelectItem value="cesarean">{labels.cesarean}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-3 block">{labels.measurements}</Label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs">{labels.height} (cm)</Label>
                      <Input 
                        type="number"
                        step="0.1"
                        value={formData.height_cm} 
                        onChange={(e) => setFormData(p => ({ ...p, height_cm: e.target.value }))}
                        placeholder="85"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{labels.weight} (kg)</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={formData.weight_kg} 
                        onChange={(e) => setFormData(p => ({ ...p, weight_kg: e.target.value }))}
                        placeholder="12.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{labels.head} (cm)</Label>
                      <Input 
                        type="number"
                        step="0.1"
                        value={formData.head_circumference_cm} 
                        onChange={(e) => setFormData(p => ({ ...p, head_circumference_cm: e.target.value }))}
                        placeholder="45"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-3 block">{labels.school}</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs">{labels.school}</Label>
                      <Input 
                        value={formData.school_name} 
                        onChange={(e) => setFormData(p => ({ ...p, school_name: e.target.value }))}
                        placeholder="School name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{labels.grade}</Label>
                      <Input 
                        value={formData.school_grade} 
                        onChange={(e) => setFormData(p => ({ ...p, school_grade: e.target.value }))}
                        placeholder="3rd grade"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Notes */}
            <div className="border-t pt-4 space-y-3">
              <div className="space-y-2">
                <Label>{labels.specialNeeds}</Label>
                <Textarea 
                  value={formData.special_needs} 
                  onChange={(e) => setFormData(p => ({ ...p, special_needs: e.target.value }))}
                  placeholder="Any special needs or conditions..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{labels.notesForDoctor}</Label>
                <Textarea 
                  value={formData.notes_for_doctor} 
                  onChange={(e) => setFormData(p => ({ ...p, notes_for_doctor: e.target.value }))}
                  placeholder="Notes that will be visible to doctors..."
                  rows={2}
                />
              </div>
            </div>
            
            {/* Emergency contact */}
            <div className="border-t pt-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-3 block">{labels.emergency}</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Name</Label>
                  <Input 
                    value={formData.emergency_contact_name} 
                    onChange={(e) => setFormData(p => ({ ...p, emergency_contact_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Phone</Label>
                  <Input 
                    value={formData.emergency_contact_phone} 
                    onChange={(e) => setFormData(p => ({ ...p, emergency_contact_phone: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {labels.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><LoadingSpinner size="sm" className="me-2" />{labels.saving}</> : labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.delete}</DialogTitle>
            <DialogDescription>{labels.confirmDelete}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              {labels.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <LoadingSpinner size="sm" className="me-2" /> : null}
              {labels.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
