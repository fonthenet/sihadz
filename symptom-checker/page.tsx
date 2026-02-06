'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/language-context'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Brain, 
  AlertTriangle, 
  Clock, 
  Stethoscope, 
  Heart,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Activity,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface SymptomAnalysis {
  summary: string
  possibleConditions: {
    name: string
    nameAr: string
    nameFr: string
    probability: 'high' | 'medium' | 'low'
    description: string
  }[]
  urgencyLevel: 'emergency' | 'urgent' | 'soon' | 'routine'
  urgencyExplanation: string
  recommendedSpecialty: string
  recommendedSpecialtyAr: string
  recommendedSpecialtyFr: string
  selfCareAdvice: string[]
  warningSignsToWatch: string[]
  questionsForDoctor: string[]
}

export default function SymptomCheckerPage() {
  const { t, language, dir } = useLanguage()
  const [step, setStep] = useState(1)
  const [symptoms, setSymptoms] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [duration, setDuration] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null)
  const [error, setError] = useState('')

  const texts = {
    ar: {
      title: 'فحص الأعراض بالذكاء الاصطناعي',
      subtitle: 'صف أعراضك واحصل على توجيهات فورية',
      disclaimer: 'هذه الأداة للتوجيه فقط وليست بديلاً عن الاستشارة الطبية',
      step1: 'معلومات أساسية',
      step2: 'وصف الأعراض',
      step3: 'النتائج والتوصيات',
      age: 'العمر',
      gender: 'الجنس',
      male: 'ذكر',
      female: 'أنثى',
      duration: 'منذ متى تعاني من هذه الأعراض؟',
      durationPlaceholder: 'مثال: يومين، أسبوع...',
      symptoms: 'صف أعراضك بالتفصيل',
      symptomsPlaceholder: 'اكتب أعراضك هنا... مثال: صداع شديد مع غثيان وحساسية للضوء منذ يومين',
      analyze: 'تحليل الأعراض',
      analyzing: 'جاري التحليل...',
      next: 'التالي',
      back: 'السابق',
      urgency: 'مستوى الاستعجال',
      emergency: 'طوارئ - اذهب للمستشفى فوراً',
      urgent: 'عاجل - راجع طبيب خلال 24 ساعة',
      soon: 'قريباً - حدد موعد خلال أيام',
      routine: 'عادي - يمكن الانتظار لموعد منتظم',
      possibleConditions: 'الحالات المحتملة',
      recommendedSpecialty: 'التخصص المطلوب',
      selfCare: 'نصائح للعناية الذاتية',
      warningsSigns: 'علامات تحذيرية',
      questionsForDoctor: 'أسئلة للطبيب',
      bookNow: 'احجز موعد الآن',
      high: 'احتمال عالي',
      medium: 'احتمال متوسط',
      low: 'احتمال منخفض',
      poweredByAI: 'مدعوم بالذكاء الاصطناعي',
      notDiagnosis: 'هذا ليس تشخيصاً طبياً',
    },
    fr: {
      title: 'Vérificateur de Symptômes IA',
      subtitle: 'Décrivez vos symptômes et obtenez des conseils instantanés',
      disclaimer: 'Cet outil est uniquement informatif et ne remplace pas une consultation médicale',
      step1: 'Informations de base',
      step2: 'Description des symptômes',
      step3: 'Résultats et recommandations',
      age: 'Âge',
      gender: 'Sexe',
      male: 'Homme',
      female: 'Femme',
      duration: 'Depuis combien de temps avez-vous ces symptômes?',
      durationPlaceholder: 'Ex: 2 jours, une semaine...',
      symptoms: 'Décrivez vos symptômes en détail',
      symptomsPlaceholder: 'Écrivez vos symptômes ici... Ex: Maux de tête sévères avec nausées et sensibilité à la lumière depuis 2 jours',
      analyze: 'Analyser les symptômes',
      analyzing: 'Analyse en cours...',
      next: 'Suivant',
      back: 'Retour',
      urgency: 'Niveau d\'urgence',
      emergency: 'Urgence - Allez aux urgences immédiatement',
      urgent: 'Urgent - Consultez un médecin dans les 24h',
      soon: 'Bientôt - Prenez rendez-vous dans les jours à venir',
      routine: 'Routine - Peut attendre un rendez-vous régulier',
      possibleConditions: 'Conditions possibles',
      recommendedSpecialty: 'Spécialité recommandée',
      selfCare: 'Conseils d\'auto-soins',
      warningsSigns: 'Signes d\'alerte',
      questionsForDoctor: 'Questions pour le médecin',
      bookNow: 'Réserver maintenant',
      high: 'Probabilité élevée',
      medium: 'Probabilité moyenne',
      low: 'Probabilité faible',
      poweredByAI: 'Propulsé par l\'IA',
      notDiagnosis: 'Ceci n\'est pas un diagnostic médical',
    },
    en: {
      title: 'AI Symptom Checker',
      subtitle: 'Describe your symptoms and get instant guidance',
      disclaimer: 'This tool is for guidance only and does not replace medical consultation',
      step1: 'Basic Information',
      step2: 'Symptom Description',
      step3: 'Results & Recommendations',
      age: 'Age',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      duration: 'How long have you had these symptoms?',
      durationPlaceholder: 'e.g., 2 days, a week...',
      symptoms: 'Describe your symptoms in detail',
      symptomsPlaceholder: 'Type your symptoms here... e.g., Severe headache with nausea and light sensitivity for 2 days',
      analyze: 'Analyze Symptoms',
      analyzing: 'Analyzing...',
      next: 'Next',
      back: 'Back',
      urgency: 'Urgency Level',
      emergency: 'Emergency - Go to hospital immediately',
      urgent: 'Urgent - See a doctor within 24 hours',
      soon: 'Soon - Schedule within days',
      routine: 'Routine - Can wait for regular appointment',
      possibleConditions: 'Possible Conditions',
      recommendedSpecialty: 'Recommended Specialty',
      selfCare: 'Self-Care Advice',
      warningsSigns: 'Warning Signs to Watch',
      questionsForDoctor: 'Questions for Your Doctor',
      bookNow: 'Book Appointment Now',
      high: 'High probability',
      medium: 'Medium probability',
      low: 'Low probability',
      poweredByAI: 'Powered by AI',
      notDiagnosis: 'This is not a medical diagnosis',
    }
  }

  const txt = texts[language]

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setError('')
    
    try {
      const response = await fetch('/api/symptom-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: `${symptoms}. Duration: ${duration}`,
          age,
          gender,
          language
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setAnalysis(data.analysis)
        setStep(3)
      } else {
        setError(data.error || 'Analysis failed')
      }
    } catch (err) {
      setError('Failed to connect to AI service')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'emergency': return 'bg-red-500'
      case 'urgent': return 'bg-orange-500'
      case 'soon': return 'bg-yellow-500'
      case 'routine': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getUrgencyText = (level: string) => {
    switch (level) {
      case 'emergency': return txt.emergency
      case 'urgent': return txt.urgent
      case 'soon': return txt.soon
      case 'routine': return txt.routine
      default: return ''
    }
  }

  const getProbabilityColor = (prob: string) => {
    switch (prob) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const ArrowNext = dir === 'rtl' ? ArrowLeft : ArrowRight
  const ArrowBack = dir === 'rtl' ? ArrowRight : ArrowLeft

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className={`text-center mb-8 ${dir === 'rtl' ? 'text-right' : 'text-left'} sm:text-center`}>
            <div className={`flex items-center justify-center gap-3 mb-4`}>
              <div className="p-3 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">{txt.title}</h1>
            </div>
            <p className="text-muted-foreground text-lg">{txt.subtitle}</p>
            <Badge variant="outline" className="mt-3 gap-2">
              <Sparkles className="h-3 w-3" />
              {txt.poweredByAI}
            </Badge>
          </div>

          {/* Disclaimer */}
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">{txt.notDiagnosis}</AlertTitle>
            <AlertDescription className="text-yellow-700">
              {txt.disclaimer}
            </AlertDescription>
          </Alert>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <CheckCircle className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className={dir === 'rtl' ? 'text-right' : ''}>{txt.step1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className={dir === 'rtl' ? 'text-right block' : ''}>{txt.age}</Label>
                    <Input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="25"
                      className={dir === 'rtl' ? 'text-right' : ''}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={dir === 'rtl' ? 'text-right block' : ''}>{txt.gender}</Label>
                    <RadioGroup value={gender} onValueChange={(v) => setGender(v as 'male' | 'female')}>
                      <div className={`flex gap-4 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                        <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <RadioGroupItem value="male" id="male" />
                          <Label htmlFor="male" className="cursor-pointer">{txt.male}</Label>
                        </div>
                        <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <RadioGroupItem value="female" id="female" />
                          <Label htmlFor="female" className="cursor-pointer">{txt.female}</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={dir === 'rtl' ? 'text-right block' : ''}>{txt.duration}</Label>
                  <Input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder={txt.durationPlaceholder}
                    className={dir === 'rtl' ? 'text-right' : ''}
                  />
                </div>

                <div className={`flex ${dir === 'rtl' ? 'justify-start' : 'justify-end'}`}>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!age || !gender || !duration}
                    className={`gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                  >
                    {txt.next}
                    <ArrowNext className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Symptoms */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className={dir === 'rtl' ? 'text-right' : ''}>{txt.step2}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className={dir === 'rtl' ? 'text-right block' : ''}>{txt.symptoms}</Label>
                  <Textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder={txt.symptomsPlaceholder}
                    className={`min-h-[200px] ${dir === 'rtl' ? 'text-right' : ''}`}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className={`flex justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className={`gap-2 bg-transparent ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                  >
                    <ArrowBack className="h-4 w-4" />
                    {txt.back}
                  </Button>
                  <Button
                    onClick={handleAnalyze}
                    disabled={!symptoms.trim() || isAnalyzing}
                    className={`gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                  >
                    {isAnalyzing ? (
                      <>
                        <LoadingSpinner size="sm" />
                        {txt.analyzing}
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        {txt.analyze}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Results */}
          {step === 3 && analysis && (
            <div className="space-y-6">
              {/* Urgency Alert */}
              <Card className={`border-2 ${
                analysis.urgencyLevel === 'emergency' ? 'border-red-500 bg-red-50' :
                analysis.urgencyLevel === 'urgent' ? 'border-orange-500 bg-orange-50' :
                analysis.urgencyLevel === 'soon' ? 'border-yellow-500 bg-yellow-50' :
                'border-green-500 bg-green-50'
              }`}>
                <CardContent className="pt-6">
                  <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <div className={`p-3 rounded-full ${getUrgencyColor(analysis.urgencyLevel)}`}>
                      {analysis.urgencyLevel === 'emergency' ? (
                        <ShieldAlert className="h-6 w-6 text-white" />
                      ) : (
                        <Clock className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className={dir === 'rtl' ? 'text-right' : ''}>
                      <h3 className="font-bold text-lg">{txt.urgency}</h3>
                      <p className="font-semibold">{getUrgencyText(analysis.urgencyLevel)}</p>
                      <p className="text-sm text-muted-foreground mt-1">{analysis.urgencyExplanation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                    <Info className="h-5 w-5 text-primary" />
                    {language === 'ar' ? 'ملخص' : language === 'fr' ? 'Résumé' : 'Summary'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-muted-foreground ${dir === 'rtl' ? 'text-right' : ''}`}>
                    {analysis.summary}
                  </p>
                </CardContent>
              </Card>

              {/* Recommended Specialty */}
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-full bg-primary">
                      <Stethoscope className="h-6 w-6 text-white" />
                    </div>
                    <div className={`flex-1 ${dir === 'rtl' ? 'text-right' : ''}`}>
                      <h3 className="font-bold text-lg">{txt.recommendedSpecialty}</h3>
                      <p className="text-primary font-semibold">
                        {language === 'ar' ? analysis.recommendedSpecialtyAr : 
                         language === 'fr' ? analysis.recommendedSpecialtyFr : 
                         analysis.recommendedSpecialty}
                      </p>
                    </div>
                    <Link href={`/search?specialty=${encodeURIComponent(analysis.recommendedSpecialty)}`}>
                      <Button className={`gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        {txt.bookNow}
                        <ArrowNext className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Possible Conditions */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                    <Activity className="h-5 w-5 text-primary" />
                    {txt.possibleConditions}
                  </CardTitle>
                  <CardDescription className={dir === 'rtl' ? 'text-right' : ''}>
                    {txt.notDiagnosis}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.possibleConditions.map((condition, index) => (
                      <div 
                        key={index}
                        className={`p-4 rounded-lg border ${dir === 'rtl' ? 'text-right' : ''}`}
                      >
                        <div className={`flex items-center justify-between gap-2 mb-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <h4 className="font-semibold">
                            {language === 'ar' ? condition.nameAr : 
                             language === 'fr' ? condition.nameFr : 
                             condition.name}
                          </h4>
                          <Badge className={getProbabilityColor(condition.probability)}>
                            {condition.probability === 'high' ? txt.high :
                             condition.probability === 'medium' ? txt.medium : txt.low}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{condition.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Self Care Advice */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                    <Heart className="h-5 w-5 text-primary" />
                    {txt.selfCare}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className={`space-y-2 ${dir === 'rtl' ? 'text-right' : ''}`}>
                    {analysis.selfCareAdvice.map((advice, index) => (
                      <li key={index} className={`flex items-start gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{advice}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Warning Signs */}
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 text-red-700 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                    <AlertTriangle className="h-5 w-5" />
                    {txt.warningsSigns}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className={`space-y-2 ${dir === 'rtl' ? 'text-right' : ''}`}>
                    {analysis.warningSignsToWatch.map((sign, index) => (
                      <li key={index} className={`flex items-start gap-2 text-red-700 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <span>{sign}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Questions for Doctor */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                    <MessageSquare className="h-5 w-5 text-primary" />
                    {txt.questionsForDoctor}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className={`space-y-2 ${dir === 'rtl' ? 'text-right' : ''}`}>
                    {analysis.questionsForDoctor.map((question, index) => (
                      <li key={index} className={`flex items-start gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <span className="text-primary font-bold">{index + 1}.</span>
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className={`flex gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1)
                    setAnalysis(null)
                    setSymptoms('')
                  }}
                  className="flex-1 bg-transparent"
                >
                  {language === 'ar' ? 'فحص جديد' : language === 'fr' ? 'Nouvelle analyse' : 'New Check'}
                </Button>
                <Link href={`/search?specialty=${encodeURIComponent(analysis.recommendedSpecialty)}`} className="flex-1">
                  <Button className={`w-full gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    {txt.bookNow}
                    <ArrowNext className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
