'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/language-context'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Users, 
  Plus, 
  Calendar, 
  CreditCard,
  Edit,
  Trash2,
  Heart,
  Baby,
  User,
  Clock,
  FileText,
  ChevronRight,
  Shield,
  UserPlus
} from 'lucide-react'

interface FamilyMember {
  id: string
  name: string
  relationship: 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other'
  age: number
  gender: 'male' | 'female'
  chifaNumber?: string
  bloodType?: string
  allergies?: string[]
  upcomingAppointments: number
  lastVisit?: string
}

// Family members will be fetched from database
const initialFamilyMembers: FamilyMember[] = [
  { 
    id: '1', 
    name: 'أحمد بن علي', 
    relationship: 'self', 
    age: 40, 
    gender: 'male',
    chifaNumber: '1234567890',
    bloodType: 'AB+',
    allergies: ['الكحول'],
    upcomingAppointments: 2,
    lastVisit: '2024-12-30'
  },
  { 
    id: '2', 
    name: 'فاطمة بن علي', 
    relationship: 'spouse', 
    age: 35, 
    gender: 'female',
    bloodType: 'O-',
    allergies: [],
    upcomingAppointments: 1,
    lastVisit: '2025-01-10'
  },
  { 
    id: '3', 
    name: 'محمد بن علي', 
    relationship: 'child', 
    age: 8, 
    gender: 'male',
    bloodType: 'A+',
    allergies: ['الفول السوداني'],
    upcomingAppointments: 0,
    lastVisit: '2024-12-20'
  },
  { 
    id: '4', 
    name: 'مريم بن علي', 
    relationship: 'child', 
    age: 5, 
    gender: 'female',
    bloodType: 'B+',
    allergies: ['الأسبرين'],
    upcomingAppointments: 1,
    lastVisit: '2025-01-05'
  },
  { 
    id: '5', 
    name: 'الحاج عمر بن علي', 
    relationship: 'parent', 
    age: 65, 
    gender: 'male',
    chifaNumber: '5555555555',
    bloodType: 'O+',
    allergies: ['الأسبرين'],
    upcomingAppointments: 3,
    lastVisit: '2025-01-12'
  },
]

const mockFamilyMembers = initialFamilyMembers;

export default function FamilyPage() {
  const { language, dir } = useLanguage()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)

  const texts = {
    ar: {
      title: 'أفراد العائلة',
      subtitle: 'إدارة حسابات أفراد عائلتك وحجز المواعيد لهم',
      addMember: 'إضافة فرد',
      self: 'أنا',
      spouse: 'الزوج/الزوجة',
      child: 'ابن/ابنة',
      parent: 'الوالد/الوالدة',
      sibling: 'أخ/أخت',
      other: 'آخر',
      years: 'سنة',
      male: 'ذكر',
      female: 'أنثى',
      chifaNumber: 'رقم الشيفا',
      bloodType: 'فصيلة الدم',
      allergies: 'الحساسية',
      upcomingAppointments: 'مواعيد قادمة',
      lastVisit: 'آخر زيارة',
      bookAppointment: 'حجز موعد',
      viewRecords: 'عرض السجلات',
      edit: 'تعديل',
      delete: 'حذف',
      noAllergies: 'لا توجد حساسية معروفة',
      addFamilyMember: 'إضافة فرد جديد للعائلة',
      addDescription: 'أضف معلومات فرد العائلة لتتمكن من حجز المواعيد له',
      name: 'الاسم الكامل',
      namePlaceholder: 'أدخل الاسم',
      relationship: 'صلة القرابة',
      age: 'العمر',
      gender: 'الجنس',
      chifaPlaceholder: 'أدخل رقم الشيفا (اختياري)',
      bloodTypePlaceholder: 'اختر فصيلة الدم',
      allergiesPlaceholder: 'أدخل أي حساسية معروفة',
      cancel: 'إلغاء',
      save: 'حفظ',
      totalMembers: 'إجمالي الأفراد',
      totalAppointments: 'إجمالي المواعيد القادمة',
      childrenCount: 'الأطفال',
      adultsCount: 'البالغين',
      familyHealth: 'صحة العائلة',
      familyHealthDesc: 'نظرة عامة على صحة أفراد عائلتك',
    },
    fr: {
      title: 'Membres de la Famille',
      subtitle: 'Gérez les comptes de votre famille et réservez des rendez-vous pour eux',
      addMember: 'Ajouter un membre',
      self: 'Moi',
      spouse: 'Conjoint(e)',
      child: 'Enfant',
      parent: 'Parent',
      sibling: 'Frère/Sœur',
      other: 'Autre',
      years: 'ans',
      male: 'Homme',
      female: 'Femme',
      chifaNumber: 'Numéro CHIFA',
      bloodType: 'Groupe sanguin',
      allergies: 'Allergies',
      upcomingAppointments: 'Rendez-vous à venir',
      lastVisit: 'Dernière visite',
      bookAppointment: 'Réserver',
      viewRecords: 'Voir les dossiers',
      edit: 'Modifier',
      delete: 'Supprimer',
      noAllergies: 'Aucune allergie connue',
      addFamilyMember: 'Ajouter un nouveau membre',
      addDescription: 'Ajoutez les informations d\'un membre de la famille pour réserver des rendez-vous pour lui',
      name: 'Nom complet',
      namePlaceholder: 'Entrez le nom',
      relationship: 'Relation',
      age: 'Âge',
      gender: 'Sexe',
      chifaPlaceholder: 'Entrez le numéro CHIFA (optionnel)',
      bloodTypePlaceholder: 'Sélectionnez le groupe sanguin',
      allergiesPlaceholder: 'Entrez toute allergie connue',
      cancel: 'Annuler',
      save: 'Enregistrer',
      totalMembers: 'Total des membres',
      totalAppointments: 'Total des rendez-vous à venir',
      childrenCount: 'Enfants',
      adultsCount: 'Adultes',
      familyHealth: 'Santé familiale',
      familyHealthDesc: 'Aperçu de la santé de votre famille',
    },
    en: {
      title: 'Family Members',
      subtitle: 'Manage your family accounts and book appointments for them',
      addMember: 'Add Member',
      self: 'Self',
      spouse: 'Spouse',
      child: 'Child',
      parent: 'Parent',
      sibling: 'Sibling',
      other: 'Other',
      years: 'years',
      male: 'Male',
      female: 'Female',
      chifaNumber: 'CHIFA Number',
      bloodType: 'Blood Type',
      allergies: 'Allergies',
      upcomingAppointments: 'Upcoming Appointments',
      lastVisit: 'Last Visit',
      bookAppointment: 'Book Appointment',
      viewRecords: 'View Records',
      edit: 'Edit',
      delete: 'Delete',
      noAllergies: 'No known allergies',
      addFamilyMember: 'Add New Family Member',
      addDescription: 'Add family member information to book appointments for them',
      name: 'Full Name',
      namePlaceholder: 'Enter name',
      relationship: 'Relationship',
      age: 'Age',
      gender: 'Gender',
      chifaPlaceholder: 'Enter CHIFA number (optional)',
      bloodTypePlaceholder: 'Select blood type',
      allergiesPlaceholder: 'Enter any known allergies',
      cancel: 'Cancel',
      save: 'Save',
      totalMembers: 'Total Members',
      totalAppointments: 'Total Upcoming Appointments',
      childrenCount: 'Children',
      adultsCount: 'Adults',
      familyHealth: 'Family Health',
      familyHealthDesc: 'Overview of your family\'s health',
    }
  }

  const txt = texts[language]

  const getRelationshipLabel = (relationship: string) => {
    const labels: { [key: string]: string } = {
      self: txt.self,
      spouse: txt.spouse,
      child: txt.child,
      parent: txt.parent,
      sibling: txt.sibling,
      other: txt.other
    }
    return labels[relationship] || relationship
  }

  const getRelationshipIcon = (relationship: string, gender: string) => {
    if (relationship === 'child') {
      return <Baby className="h-5 w-5" />
    }
    return <User className="h-5 w-5" />
  }

  const getRelationshipColor = (relationship: string) => {
    const colors: { [key: string]: string } = {
      self: 'bg-primary text-primary-foreground',
      spouse: 'bg-pink-500 text-white',
      child: 'bg-blue-500 text-white',
      parent: 'bg-purple-500 text-white',
      sibling: 'bg-green-500 text-white',
      other: 'bg-gray-500 text-white'
    }
    return colors[relationship] || 'bg-gray-500 text-white'
  }

  const childrenCount = mockFamilyMembers.filter(m => m.age < 18).length
  const adultsCount = mockFamilyMembers.filter(m => m.age >= 18).length
  const totalAppointments = mockFamilyMembers.reduce((sum, m) => sum + m.upcomingAppointments, 0)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className={`flex items-center justify-between mb-8 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <div className={dir === 'rtl' ? 'text-right' : ''}>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                {dir === 'rtl' ? (
                  <>
                    {txt.title}
                    <Users className="h-8 w-8 text-primary" />
                  </>
                ) : (
                  <>
                    <Users className="h-8 w-8 text-primary" />
                    {txt.title}
                  </>
                )}
              </h1>
              <p className="text-muted-foreground mt-1">{txt.subtitle}</p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className={`gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <UserPlus className="h-4 w-4" />
                  {txt.addMember}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className={dir === 'rtl' ? 'text-right' : ''}>{txt.addFamilyMember}</DialogTitle>
                  <DialogDescription className={dir === 'rtl' ? 'text-right' : ''}>
                    {txt.addDescription}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className={dir === 'rtl' ? 'text-right block' : ''}>{txt.name}</Label>
                    <Input placeholder={txt.namePlaceholder} className={dir === 'rtl' ? 'text-right' : ''} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={dir === 'rtl' ? 'text-right block' : ''}>{txt.relationship}</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder={txt.relationship} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self">{txt.self}</SelectItem>
                          <SelectItem value="spouse">{txt.spouse}</SelectItem>
                          <SelectItem value="child">{txt.child}</SelectItem>
                          <SelectItem value="parent">{txt.parent}</SelectItem>
                          <SelectItem value="sibling">{txt.sibling}</SelectItem>
                          <SelectItem value="other">{txt.other}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className={dir === 'rtl' ? 'text-right block' : ''}>{txt.age}</Label>
                      <Input type="number" placeholder="25" className={dir === 'rtl' ? 'text-right' : ''} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={dir === 'rtl' ? 'text-right block' : ''}>{txt.gender}</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder={txt.gender} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">{txt.male}</SelectItem>
                          <SelectItem value="female">{txt.female}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className={dir === 'rtl' ? 'text-right block' : ''}>{txt.bloodType}</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder={txt.bloodTypePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className={dir === 'rtl' ? 'text-right block' : ''}>{txt.chifaNumber}</Label>
                    <Input placeholder={txt.chifaPlaceholder} className={dir === 'rtl' ? 'text-right' : ''} />
                  </div>
                  <div className="space-y-2">
                    <Label className={dir === 'rtl' ? 'text-right block' : ''}>{txt.allergies}</Label>
                    <Input placeholder={txt.allergiesPlaceholder} className={dir === 'rtl' ? 'text-right' : ''} />
                  </div>
                </div>
                <div className={`flex gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <Button className="flex-1">{txt.save}</Button>
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowAddDialog(false)}>
                    {txt.cancel}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className={dir === 'rtl' ? 'text-right' : ''}>
                    <p className="text-sm text-muted-foreground">{txt.totalMembers}</p>
                    <p className="text-2xl font-bold">{mockFamilyMembers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Baby className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className={dir === 'rtl' ? 'text-right' : ''}>
                    <p className="text-sm text-muted-foreground">{txt.childrenCount}</p>
                    <p className="text-2xl font-bold">{childrenCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <User className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className={dir === 'rtl' ? 'text-right' : ''}>
                    <p className="text-sm text-muted-foreground">{txt.adultsCount}</p>
                    <p className="text-2xl font-bold">{adultsCount}</p>
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
                    <p className="text-sm text-muted-foreground">{txt.totalAppointments}</p>
                    <p className="text-2xl font-bold">{totalAppointments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Family Members Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockFamilyMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  {/* Header */}
                  <div className={`flex items-start justify-between mb-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={getRelationshipColor(member.relationship)}>
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={dir === 'rtl' ? 'text-right' : ''}>
                        <p className="font-semibold">{member.name}</p>
                        <div className={`flex items-center gap-2 text-sm text-muted-foreground ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                          <Badge variant="outline" className="text-xs">
                            {getRelationshipLabel(member.relationship)}
                          </Badge>
                          <span>•</span>
                          <span>{member.age} {txt.years}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 mb-4">
                    {member.chifaNumber && (
                      <div className={`flex items-center gap-2 text-sm ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{txt.chifaNumber}:</span>
                        <span>{member.chifaNumber}</span>
                      </div>
                    )}
                    {member.bloodType && (
                      <div className={`flex items-center gap-2 text-sm ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                        <Heart className="h-4 w-4 text-red-500" />
                        <span className="text-muted-foreground">{txt.bloodType}:</span>
                        <Badge variant="outline" className="text-xs">{member.bloodType}</Badge>
                      </div>
                    )}
                    {member.allergies && member.allergies.length > 0 ? (
                      <div className={`flex items-center gap-2 text-sm ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                        <Shield className="h-4 w-4 text-orange-500" />
                        <span className="text-muted-foreground">{txt.allergies}:</span>
                        <span className="text-orange-600">{member.allergies.join(', ')}</span>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 text-sm ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                        <Shield className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">{txt.noAllergies}</span>
                      </div>
                    )}
                    <div className={`flex items-center gap-2 text-sm ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">{txt.upcomingAppointments}:</span>
                      <Badge variant={member.upcomingAppointments > 0 ? "default" : "secondary"}>
                        {member.upcomingAppointments}
                      </Badge>
                    </div>
                    {member.lastVisit && (
                      <div className={`flex items-center gap-2 text-sm ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{txt.lastVisit}:</span>
                        <span>{member.lastVisit}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={`flex gap-2 pt-4 border-t ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <Link href={`/booking/new?patient=${member.id}`} className="flex-1">
                      <Button size="sm" className={`w-full gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <Calendar className="h-4 w-4" />
                        {txt.bookAppointment}
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" className="bg-transparent">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add Member Card */}
            <Card className="border-dashed border-2 hover:border-primary hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setShowAddDialog(true)}>
              <CardContent className="pt-6 flex flex-col items-center justify-center h-full min-h-[300px]">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <p className="font-semibold text-lg">{txt.addMember}</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {txt.addDescription}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
