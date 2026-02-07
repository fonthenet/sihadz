'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createBrowserClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Heart, Pill, AlertTriangle } from 'lucide-react'
import type { PatientVitals } from './vital-card'

const labels = {
  ar: {
    title: 'تحديث المعلومات الحيوية',
    description: 'معلومات صحية أساسية تظهر للطبيب أثناء المواعيد. تُحفظ في ملفك الشخصي.',
    bloodType: 'فصيلة الدم',
    height: 'الطول (سم)',
    weight: 'الوزن (كغ)',
    allergies: 'الحساسية',
    allergiesPlaceholder: 'مثال: البنسلين، الفول السوداني...',
    chronicConditions: 'أمراض مزمنة',
    chronicPlaceholder: 'مثال: السكري، ضغط الدم...',
    currentMedications: 'الأدوية الحالية',
    medicationsPlaceholder: 'مثال: دواء، جرعة، تكرار...',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    save: 'حفظ',
    saving: 'جاري الحفظ...',
    success: 'تم حفظ المعلومات الحيوية',
    error: 'فشل الحفظ. حاول مرة أخرى.',
  },
  fr: {
    title: 'Mettre à jour les informations vitales',
    description: 'Informations de santé de base visibles par le médecin lors des rendez-vous. Enregistrées dans votre profil.',
    bloodType: 'Groupe sanguin',
    height: 'Taille (cm)',
    weight: 'Poids (kg)',
    allergies: 'Allergies',
    allergiesPlaceholder: 'Ex: Pénicilline, arachides...',
    chronicConditions: 'Affections chroniques',
    chronicPlaceholder: 'Ex: Diabète, hypertension...',
    currentMedications: 'Médicaments actuels',
    medicationsPlaceholder: 'Ex: Médicament, dosage, fréquence...',
    gender: 'Genre',
    male: 'Homme',
    female: 'Femme',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    success: 'Informations vitales enregistrées',
    error: 'Échec de l\'enregistrement. Réessayez.',
  },
  en: {
    title: 'Update vital information',
    description: 'Basic health info visible to your doctor during appointments. Saved to your profile.',
    bloodType: 'Blood Type',
    height: 'Height (cm)',
    weight: 'Weight (kg)',
    allergies: 'Allergies',
    allergiesPlaceholder: 'e.g. Penicillin, peanuts...',
    chronicConditions: 'Chronic Conditions',
    chronicPlaceholder: 'e.g. Diabetes, hypertension...',
    currentMedications: 'Current Medications',
    medicationsPlaceholder: 'e.g. Medication, dosage, frequency...',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    save: 'Save',
    saving: 'Saving...',
    success: 'Vital information saved',
    error: 'Failed to save. Please try again.',
  },
}

function formatAllergies(val: string | string[] | null | undefined): string {
  if (!val) return ''
  if (Array.isArray(val)) return val.join(', ')
  return String(val)
}

interface VitalUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  vitals: PatientVitals | null
  language: 'ar' | 'fr' | 'en'
  onSaved?: () => void
}

export function VitalUpdateDialog({
  open,
  onOpenChange,
  userId,
  vitals,
  language,
  onSaved,
}: VitalUpdateDialogProps) {
  const l = labels[language]
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [gender, setGender] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [allergies, setAllergies] = useState('')
  const [chronicConditions, setChronicConditions] = useState('')
  const [currentMedications, setCurrentMedications] = useState('')

  // Reset form when dialog opens or vitals change
  useEffect(() => {
    if (open) {
      setGender(vitals?.gender ?? '')
      setBloodType(vitals?.blood_type ?? '')
      setHeightCm(vitals?.height_cm != null ? String(vitals.height_cm) : '')
      setWeightKg(vitals?.weight_kg != null ? String(vitals.weight_kg) : '')
      setAllergies(formatAllergies(vitals?.allergies) ?? '')
      setChronicConditions(vitals?.chronic_conditions ?? '')
      setCurrentMedications(vitals?.current_medications ?? '')
    }
  }, [open, vitals])

  const handleSave = async () => {
    setSaving(true)
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        gender: gender || null,
        blood_type: bloodType || null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        allergies: allergies.trim() || null,
        chronic_conditions: chronicConditions.trim() || null,
        current_medications: currentMedications.trim() || null,
      })
      .eq('id', userId)

    setSaving(false)
    if (error) {
      toast({ title: l.error, variant: 'destructive' })
      return
    }
    toast({ title: l.success })
    onSaved?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            {l.title}
          </DialogTitle>
          <DialogDescription>{l.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="vital-gender">{l.gender}</Label>
              <Select value={gender || undefined} onValueChange={setGender}>
                <SelectTrigger id="vital-gender" className="min-w-0">
                  <SelectValue placeholder={l.gender} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{l.male}</SelectItem>
                  <SelectItem value="female">{l.female}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-0">
              <Label htmlFor="vital-bloodType">{l.bloodType}</Label>
              <Select value={bloodType || undefined} onValueChange={setBloodType}>
                <SelectTrigger id="vital-bloodType" className="min-w-0">
                  <SelectValue placeholder={l.bloodType} />
                </SelectTrigger>
                <SelectContent>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="vital-heightCm">{l.height}</Label>
              <Input
                id="vital-heightCm"
                type="number"
                min={50}
                max={250}
                step={0.1}
                placeholder="170"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="min-w-0"
              />
            </div>
            <div className="space-y-2 min-w-0">
              <Label htmlFor="vital-weightKg">{l.weight}</Label>
              <Input
                id="vital-weightKg"
                type="number"
                min={20}
                max={300}
                step={0.1}
                placeholder="70"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="min-w-0"
              />
            </div>
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="vital-allergies" className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              {l.allergies}
            </Label>
            <Input
              id="vital-allergies"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder={l.allergiesPlaceholder}
              className="min-w-0"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="vital-chronicConditions">{l.chronicConditions}</Label>
            <Input
              id="vital-chronicConditions"
              value={chronicConditions}
              onChange={(e) => setChronicConditions(e.target.value)}
              placeholder={l.chronicPlaceholder}
              className="min-w-0"
            />
          </div>

          <div className="space-y-2 min-w-0">
            <Label htmlFor="vital-currentMedications" className="flex items-center gap-1.5">
              <Pill className="h-3.5 w-3.5 text-primary" />
              {l.currentMedications}
            </Label>
            <Input
              id="vital-currentMedications"
              value={currentMedications}
              onChange={(e) => setCurrentMedications(e.target.value)}
              placeholder={l.medicationsPlaceholder}
              className="min-w-0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving} className="min-w-[100px]">
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="me-2" />
                {l.saving}
              </>
            ) : (
              l.save
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
