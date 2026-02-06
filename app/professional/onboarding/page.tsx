'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, MapPin, Clock, DollarSign, FileText, Upload, AlertCircle } from 'lucide-react'
import { FullPageLoading, LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'

const WILAYAS_DATA: Record<string, string[]> = {
  'Adrar': ['Adrar', 'Reggane', 'Timimoun', 'Aoulef'],
  'Chlef': ['Chlef', 'Ténès', 'El Karimia', 'Oued Fodda'],
  'Laghouat': ['Laghouat', 'Aflou', 'Ksar El Hirane'],
  'Oum El Bouaghi': ['Oum El Bouaghi', 'Ain Beida', 'Ain M\'lila'],
  'Batna': ['Batna', 'Barika', 'Ain Touta', 'N\'Gaous'],
  'Béjaïa': ['Béjaïa', 'Akbou', 'Kherrata', 'Sidi Aich'],
  'Biskra': ['Biskra', 'Tolga', 'Ouled Djellal', 'Sidi Okba'],
  'Béchar': ['Béchar', 'Kenadsa', 'Abadla'],
  'Blida': ['Blida', 'Boufarik', 'El Affroun', 'Mouzaia'],
  'Bouira': ['Bouira', 'Lakhdaria', 'Sour El Ghozlane', 'M\'Chedallah'],
  'Tamanrasset': ['Tamanrasset', 'In Salah', 'In Guezzam'],
  'Tébessa': ['Tébessa', 'Bir El Ater', 'Cheria', 'El Aouinet'],
  'Tlemcen': ['Tlemcen', 'Maghnia', 'Ghazaouet', 'Remchi'],
  'Tiaret': ['Tiaret', 'Frenda', 'Sougueur', 'Ksar Chellala'],
  'Tizi Ouzou': ['Tizi Ouzou', 'Azazga', 'Draa Ben Khedda', 'Ain El Hammam'],
  'Alger': ['Alger Centre', 'Bab El Oued', 'Hussein Dey', 'El Harrach', 'Bir Mourad Rais', 'Kouba', 'Hydra', 'Dely Ibrahim'],
  'Djelfa': ['Djelfa', 'Ain Oussera', 'Messaad', 'Hassi Bahbah'],
  'Jijel': ['Jijel', 'El Milia', 'Taher', 'Texenna'],
  'Sétif': ['Sétif', 'El Eulma', 'Ain Oulmene', 'Ain Arnat'],
  'Saïda': ['Saïda', 'Ain El Hadjar', 'El Hassasna'],
  'Skikda': ['Skikda', 'Collo', 'Azzaba', 'El Harrouch'],
  'Sidi Bel Abbès': ['Sidi Bel Abbès', 'Telagh', 'Ben Badis'],
  'Annaba': ['Annaba', 'El Bouni', 'El Hadjar', 'Berrahal'],
  'Guelma': ['Guelma', 'Oued Zenati', 'Bouchegouf'],
  'Constantine': ['Constantine', 'El Khroub', 'Ain Smara', 'Hamma Bouziane'],
  'Médéa': ['Médéa', 'Berrouaghia', 'Ksar El Boukhari'],
  'Mostaganem': ['Mostaganem', 'Ain Tedles', 'Sidi Ali'],
  'M\'Sila': ['M\'Sila', 'Bou Saada', 'Ain El Melh', 'Sidi Aissa'],
  'Mascara': ['Mascara', 'Sig', 'Mohammadia', 'Tighennif'],
  'Ouargla': ['Ouargla', 'Hassi Messaoud', 'Touggourt', 'Temacine'],
  'Oran': ['Oran', 'Ain El Turck', 'Es Senia', 'Bir El Djir', 'Arzew'],
  'El Bayadh': ['El Bayadh', 'Boualem', 'El Abiodh Sidi Cheikh'],
  'Illizi': ['Illizi', 'Djanet', 'In Amenas'],
  'Bordj Bou Arreridj': ['Bordj Bou Arreridj', 'Ras El Oued', 'Bordj Ghedir'],
  'Boumerdès': ['Boumerdès', 'Bordj Menaiel', 'Dellys', 'Khemis El Khechna'],
  'El Tarf': ['El Tarf', 'El Kala', 'Bouhadjar', 'Ben M\'Hidi'],
  'Tindouf': ['Tindouf'],
  'Tissemsilt': ['Tissemsilt', 'Bordj Bou Naama', 'Theniet El Had'],
  'El Oued': ['El Oued', 'Guemar', 'Robbah', 'Djamaa'],
  'Khenchela': ['Khenchela', 'Kais', 'Chechar', 'El Hamma'],
  'Souk Ahras': ['Souk Ahras', 'Sedrata', 'M\'Daourouch'],
  'Tipaza': ['Tipaza', 'Koléa', 'Cherchell', 'Hadjout'],
  'Mila': ['Mila', 'Chelghoum Laid', 'Ferdjioua', 'Grarem Gouga'],
  'Aïn Defla': ['Aïn Defla', 'Khemis Miliana', 'El Attaf', 'Miliana'],
  'Naâma': ['Naâma', 'Mecheria', 'Ain Sefra'],
  'Aïn Témouchent': ['Aïn Témouchent', 'El Malah', 'Beni Saf', 'Hammam Bou Hadjar'],
  'Ghardaïa': ['Ghardaïa', 'Metlili', 'El Meniaa', 'Berriane'],
  'Relizane': ['Relizane', 'Oued Rhiou', 'Mazouna', 'Djidiouia'],
}

const WILAYAS = Object.keys(WILAYAS_DATA)

const SPECIALIZATIONS = {
  doctor: ['Cardiology', 'Dermatology', 'Pediatrics', 'Neurology', 'Orthopedics', 'General Practice', 'Other'],
  nurse: ['Home Care', 'Wound Care', 'Injections', 'Monitoring', 'Pediatric Nursing', 'Elderly Care', 'Other'],
  clinic: ['Multi-Specialty', 'Surgical Center', 'Diagnostic Center', 'Urgent Care', 'Other'],
  pharmacy: ['Community Pharmacy', 'Hospital Pharmacy', 'Clinical Pharmacy'],
  laboratory: ['Medical Laboratory', 'Pathology Lab', 'Microbiology Lab', 'Blood Bank'],
  radiology: ['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Mammography'],
  ambulance: ['Emergency Ambulance', 'Patient Transport', 'Medical Evacuation'],
  dental: ['General Dentistry', 'Orthodontics', 'Oral Surgery', 'Pediatric Dentistry'],
  pharma_supplier: ['Pharmaceuticals', 'Generics', 'OTC Products', 'Vaccines', 'Hospital Supplies', 'Full Catalog'],
  equipment_supplier: ['Diagnostic Equipment', 'Surgical Instruments', 'Lab Equipment', 'Mobility Aids', 'Consumables', 'Full Catalog'],
  other: ['Physical Therapy', 'Nutrition', 'Psychology', 'Other']
}

export default function ProfessionalOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [professionalType, setProfessionalType] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  
  // Profile data
  const [specialization, setSpecialization] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [yearsExperience, setYearsExperience] = useState('0')
  const [bio, setBio] = useState('')
  
  // Location data
  const [wilaya, setWilaya] = useState('')
  const [commune, setCommune] = useState('')
  const [address, setAddress] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  
  // Service data
  const [consultationFee, setConsultationFee] = useState('')
  const [acceptsChifa, setAcceptsChifa] = useState('yes')
  const [languages, setLanguages] = useState('Arabic, French')
  
  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  useEffect(() => {
    loadProfessionalData()
  }, [])

  // Auto-resize bio textarea when content changes (e.g. pre-filled or paste)
  useEffect(() => {
    const el = document.getElementById('bio') as HTMLTextAreaElement | null
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }, [bio])

  const loadProfessionalData = async () => {
    try {
      const supabase = createBrowserClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/professional/auth/login')
        return
      }

      const { data: professional, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (error || !professional) {
        router.push('/professional/auth/signup')
        return
      }

      setProfessionalType(professional.type)
      setProfessionalId(professional.id)
      
      // Check if already onboarded - use professionals table fields
      if (professional.onboarding_completed || professional.profile_completed) {
        router.push('/professional/dashboard')
        return
      }
      
      // Pre-fill existing data if any (including specialty from signup)
      if (professional.specialty) setSpecialization(professional.specialty)
      if (professional.wilaya) setWilaya(professional.wilaya)
      if (professional.commune) setCommune(professional.commune)
      if (professional.license_number && professional.license_number !== 'PENDING') {
        setLicenseNumber(professional.license_number)
      }

    } catch (err) {
      console.error('[v0] Failed to load professional data:', err)
      setError('Failed to load your account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleComplete = async () => {
    setIsSaving(true)
    setError('')

    try {
      const supabase = createBrowserClient()

      console.log('[v0] Starting onboarding completion for professional:', professionalId)

      // Update professionals table: ensure active for booking once signed up; complete onboarding
      // SINGLE SOURCE OF TRUTH: All provider data lives in professionals table only
      const updateData: Record<string, unknown> = {
        wilaya,
        commune,
        address_line1: address || null,
        license_number: licenseNumber,
        profile_completed: true,
        onboarding_completed: true,
        is_active: true, // Active for booking by default; schedule (working_hours, holidays) can restrict slots
      }

      // Add type-specific fields to professionals
      if (professionalType === 'doctor') {
        updateData.specialty = specialization || null
        updateData.consultation_fee = consultationFee ? parseInt(consultationFee) : 2000
        updateData.e_visit_fee = consultationFee ? Math.max(500, Math.floor(parseInt(consultationFee) * 0.7)) : null
        updateData.supports_e_visit = true
        updateData.supports_in_person = true
        updateData.experience_years = yearsExperience ? parseInt(yearsExperience) : 0
        updateData.bio = bio || null
      } else if (professionalType === 'pharmacy') {
        updateData.has_delivery = false // Can be updated later in settings
      } else if (professionalType === 'clinic') {
        updateData.specialties = specialization ? [specialization] : []
      } else if (professionalType === 'laboratory') {
        updateData.test_types = specialization ? [specialization] : []
      } else if (professionalType === 'pharma_supplier' || professionalType === 'equipment_supplier') {
        updateData.specialty = specialization || null
      }

      const { error: profError } = await supabase
        .from('professionals')
        .update(updateData)
        .eq('id', professionalId)

      if (profError) {
        console.error('[v0] Failed to update professional:', profError)
        throw new Error(`Failed to update professional: ${profError.message}`)
      }

      console.log('[v0] Professional updated successfully')

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('professional_profiles')
        .select('id')
        .eq('professional_id', professionalId)
        .single()

      const profileData = {
        professional_id: professionalId,
        specialization,
        years_of_experience: yearsExperience ? parseInt(yearsExperience) : null,
        bio: bio || null,
        consultation_fee: consultationFee ? parseInt(consultationFee) : null,
        accepts_chifa: acceptsChifa === 'yes',
        languages: languages ? languages.split(',').map(l => l.trim()) : [],
      }

      let profileError
      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('professional_profiles')
          .update(profileData)
          .eq('professional_id', professionalId)
        profileError = error
      } else {
        // Insert new profile
        const { error } = await supabase
          .from('professional_profiles')
          .insert(profileData)
        profileError = error
      }

      if (profileError) {
        console.error('[v0] Failed to save profile:', profileError)
        throw new Error(`Failed to save profile: ${profileError.message}`)
      }

      console.log('[v0] Profile saved successfully')

      // NOTE: We NO LONGER create records in legacy tables (doctors, pharmacies, clinics, laboratories).
      // The professionals table is the SINGLE SOURCE OF TRUTH. All provider data lives there.
      // Legacy tables are deprecated - views exist for backward compatibility if needed.

      console.log('[v0] Onboarding completed, redirecting to dashboard')
      router.replace('/professional/dashboard')

    } catch (err) {
      console.error('[v0] Onboarding error:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <FullPageLoading />
  }

  const availableSpecializations = SPECIALIZATIONS[professionalType as keyof typeof SPECIALIZATIONS] || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">Complete Your Profile</h1>
          <p className="text-center text-muted-foreground mb-6">
            Step {step} of {totalSteps}
          </p>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Professional Information'}
              {step === 2 && 'Location Details'}
              {step === 3 && 'Services & Pricing'}
              {step === 4 && 'Review & Complete'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Tell us about your qualifications and expertise'}
              {step === 2 && 'Where can patients find you?'}
              {step === 3 && 'Set your consultation fees and availability'}
              {step === 4 && 'Review your information before going live'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Professional Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Select value={specialization} onValueChange={setSpecialization}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSpecializations.map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license">License Number</Label>
                  <Input
                    id="license"
                    placeholder="Professional license or registration number"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    placeholder="e.g., 10"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio / About</Label>
                  <Textarea
                    id="bio"
                    placeholder="Brief description of your practice, expertise, and approach..."
                    rows={3}
                    className="min-h-[80px] max-h-[240px] resize-none overflow-y-auto"
                    value={bio}
                    onChange={(e) => {
                      const el = e.target
                      setBio(el.value)
                      el.style.height = 'auto'
                      el.style.height = `${Math.min(el.scrollHeight, 240)}px`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="wilaya">Wilaya</Label>
                    <Select value={wilaya} onValueChange={(val) => { setWilaya(val); setCommune(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wilaya" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Object.keys(WILAYAS_DATA).sort().map((w) => (
                          <SelectItem key={w} value={w}>
                            {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commune">City/Commune</Label>
                    <Select value={commune} onValueChange={setCommune} disabled={!wilaya}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {wilaya && WILAYAS_DATA[wilaya]?.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Full Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Street address, building number, floor..."
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maps">Google Maps Link (Optional)</Label>
                  <Input
                    id="maps"
                    placeholder="https://maps.google.com/..."
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Services */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fee">Consultation Fee (DZD)</Label>
                  <Input
                    id="fee"
                    type="number"
                    placeholder="e.g., 3000"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Standard fee for in-person consultation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chifa">Accept Chifa Card?</Label>
                  <Select value={acceptsChifa} onValueChange={setAcceptsChifa}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes, I accept Chifa</SelectItem>
                      <SelectItem value="no">No, cash only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="languages">Languages Spoken</Label>
                  <Input
                    id="languages"
                    placeholder="Arabic, French, English"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Separate languages with commas
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">{specialization}</p>
                      <p className="text-sm text-muted-foreground">
                        {yearsExperience && `${yearsExperience} years experience`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{wilaya}</p>
                      <p className="text-sm text-muted-foreground">{address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{consultationFee} DZD</p>
                      <p className="text-sm text-muted-foreground">
                        {acceptsChifa === 'yes' ? 'Accepts Chifa' : 'Cash only'}
                      </p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your profile will be reviewed by our team before going live. This usually takes 24-48 hours.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-6">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1 bg-transparent">
                  Back
                </Button>
              )}
              {step < totalSteps ? (
                <Button type="button" onClick={handleNext} className="flex-1">
                  Next
                </Button>
              ) : (
                <Button type="button" onClick={handleComplete} className="flex-1" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <LoadingSpinner size="sm" className="me-2" />
                      Completing...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
