'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Brain,
  Send,
  AlertTriangle,
  Heart,
  Pill,
  Stethoscope,
  MessageSquare,
  Sparkles,
  Clock,
  ChevronRight,
  Phone,
  Hospital
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import { DashboardPageWrapper } from '@/components/dashboard/dashboard-page-wrapper'

/** Pool of quick questions per language. Shuffled daily by date. */
const QUESTION_POOLS = {
  en: [
    'What are common side effects of antibiotics?',
    'How can I manage high blood pressure naturally?',
    'What should I know about diabetes medication?',
    'Tips for better sleep quality?',
    'When should I see a doctor for a headache?',
    'What are the signs of dehydration?',
    'How to treat a mild fever at home?',
    'What foods help with digestion?',
    'When is a cough something to worry about?',
    'How can I boost my immune system?',
    'What should I know about vitamin D?',
    'Tips for managing seasonal allergies?',
    'When to seek help for a sore throat?',
    'How to relieve muscle pain naturally?',
    'What are the benefits of staying hydrated?',
  ],
  fr: [
    'Quels sont les effets secondaires des antibiotiques?',
    'Comment gérer l\'hypertension naturellement?',
    'Que dois-je savoir sur les médicaments pour le diabète?',
    'Conseils pour mieux dormir?',
    'Quand consulter pour un mal de tête?',
    'Quels sont les signes de déshydratation?',
    'Comment traiter une fièvre légère à la maison?',
    'Quels aliments aident à la digestion?',
    'Quand une toux doit-elle inquiéter?',
    'Comment renforcer mon système immunitaire?',
    'Que dois-je savoir sur la vitamine D?',
    'Conseils pour les allergies saisonnières?',
    'Quand consulter pour un mal de gorge?',
    'Comment soulager les douleurs musculaires naturellement?',
    'Quels sont les bienfaits de l\'hydratation?',
  ],
  ar: [
    'ما هي الآثار الجانبية للمضادات الحيوية؟',
    'كيف أتحكم في ضغط الدم بشكل طبيعي؟',
    'ماذا يجب أن أعرف عن أدوية السكري؟',
    'نصائح لنوم أفضل؟',
    'متى يجب استشارة الطبيب لصداع؟',
    'ما هي علامات الجفاف؟',
    'كيف أعالج الحمى الخفيفة في المنزل؟',
    'ما الأطعمة التي تساعد على الهضم؟',
    'متى يجب القلق من السعال؟',
    'كيف أقوي جهازي المناعي؟',
    'ماذا يجب أن أعرف عن فيتامين د؟',
    'نصائح لحساسية المواسم؟',
    'متى أستشير الطبيب لالتهاب الحلق؟',
    'كيف أعالج آلام العضلات بشكل طبيعي؟',
    'ما فوائد شرب الماء؟',
  ],
}

/** Seeded random 0-1 for deterministic daily shuffle */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/** Returns 5 questions for the current day. Same date = same questions for all users. */
function getDailyQuestions(lang: 'en' | 'fr' | 'ar'): string[] {
  const pool = QUESTION_POOLS[lang]
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  )
  const seed = now.getFullYear() * 366 + dayOfYear
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 5)
}

const t = {
  en: {
    title: 'AI Health Advisor',
    subtitle: 'Ask health questions and get AI-powered guidance',
    placeholder: 'Ask a health question... (e.g., "What are the side effects of paracetamol?")',
    send: 'Ask',
    disclaimer: 'This is general health information, not medical advice. Always consult a healthcare professional for personalized guidance.',
    quickQuestions: 'Quick Questions',
    recentQuestions: 'Recent Questions',
    keyPoints: 'Key Points',
    relatedTopics: 'Related Topics',
    seeDoctor: 'Consider seeing a doctor',
    emergency: 'Emergency! Call 1021 or go to nearest hospital',
    urgent: 'Seek medical attention soon',
    poweredBy: 'Powered by',
  },
  fr: {
    title: 'Conseiller Santé IA',
    subtitle: 'Posez des questions de santé et obtenez des conseils IA',
    placeholder: 'Posez une question de santé... (ex: "Quels sont les effets secondaires du paracétamol?")',
    send: 'Demander',
    disclaimer: 'Ceci est une information générale de santé, pas un avis médical. Consultez toujours un professionnel de santé.',
    quickQuestions: 'Questions Rapides',
    recentQuestions: 'Questions Récentes',
    keyPoints: 'Points Clés',
    relatedTopics: 'Sujets Connexes',
    seeDoctor: 'Consultez un médecin',
    emergency: 'Urgence! Appelez le 1021 ou allez à l\'hôpital',
    urgent: 'Consultez rapidement un médecin',
    poweredBy: 'Propulsé par',
  },
  ar: {
    title: 'مستشار الصحة الذكي',
    subtitle: 'اطرح أسئلة صحية واحصل على إرشادات ذكية',
    placeholder: 'اطرح سؤالاً صحياً... (مثال: "ما هي الآثار الجانبية للباراسيتامول؟")',
    send: 'اسأل',
    disclaimer: 'هذه معلومات صحية عامة وليست نصيحة طبية. استشر دائماً أخصائي الرعاية الصحية.',
    quickQuestions: 'أسئلة سريعة',
    recentQuestions: 'الأسئلة الأخيرة',
    keyPoints: 'النقاط الرئيسية',
    relatedTopics: 'مواضيع ذات صلة',
    seeDoctor: 'يُنصح بمراجعة الطبيب',
    emergency: 'طوارئ! اتصل بـ 1021 أو اذهب لأقرب مستشفى',
    urgent: 'راجع الطبيب قريباً',
    poweredBy: 'مدعوم من',
  }
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  keyPoints?: string[]
  relatedTopics?: string[]
  shouldSeeDoctor?: boolean
  urgency?: 'routine' | 'soon' | 'urgent' | 'emergency'
  provider?: string
  timestamp: Date
}

export default function HealthAdvisorPage() {
  const { language } = useLanguage()
  const labels = t[language as keyof typeof t] || t.en
  const { toast } = useToast()
  const dailyQuestions = useMemo(
    () => getDailyQuestions((language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en')),
    [language]
  )
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (question?: string) => {
    const q = question || input.trim()
    if (!q) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: q,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/health-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get response')

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer || data.raw || 'I couldn\'t generate a response.',
        keyPoints: data.key_points,
        relatedTopics: data.related_topics,
        shouldSeeDoctor: data.should_see_doctor,
        urgency: data.urgency,
        provider: data.provider,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'emergency': return 'bg-red-500 text-white'
      case 'urgent': return 'bg-orange-500 text-white'
      case 'soon': return 'bg-amber-500 text-white'
      default: return 'bg-green-500 text-white'
    }
  }

  type SectionType = 'intro' | 'causes' | 'monitor' | 'tips' | 'medications' | 'info' | 'default'

  const sectionStyles: Record<SectionType, { border: string; bg: string; title: string; icon: typeof Brain }> = {
    intro: { border: 'border-violet-200 dark:border-violet-800', bg: 'bg-violet-50/50 dark:bg-violet-950/20', title: 'text-violet-700 dark:text-violet-300', icon: Brain },
    causes: { border: 'border-blue-200 dark:border-blue-900', bg: 'bg-blue-50/50 dark:bg-blue-950/20', title: 'text-blue-700 dark:text-blue-300', icon: Stethoscope },
    monitor: { border: 'border-amber-200 dark:border-amber-900', bg: 'bg-amber-50/50 dark:bg-amber-950/20', title: 'text-amber-700 dark:text-amber-300', icon: AlertTriangle },
    tips: { border: 'border-emerald-200 dark:border-emerald-900', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20', title: 'text-emerald-700 dark:text-emerald-300', icon: Heart },
    medications: { border: 'border-purple-200 dark:border-purple-900', bg: 'bg-purple-50/50 dark:bg-purple-950/20', title: 'text-purple-700 dark:text-purple-300', icon: Pill },
    info: { border: 'border-sky-200 dark:border-sky-900', bg: 'bg-sky-50/50 dark:bg-sky-950/20', title: 'text-sky-700 dark:text-sky-300', icon: Stethoscope },
    default: { border: 'border-border', bg: 'bg-muted/30', title: 'text-foreground', icon: Brain },
  }

  const getType = (title: string): SectionType => {
    const t = title.toLowerCase()
    if (/causes?|possible|possibles|incluent|include/i.test(t)) return 'causes'
    if (/surveiller|monitor|signes|watch|surveillance|warning|danger|alert/i.test(t)) return 'monitor'
    if (/soulagement|relief|conseils|tips|soins|self-care|self care|home care|what to do|recommendation/i.test(t)) return 'tips'
    if (/médicament|medication|ordonnance|treatment|pour vos|appropriate/i.test(t)) return 'medications'
    if (/prise en charge|medical|complementaire|informations|when to see|see.*doctor|quand consulter/i.test(t)) return 'info'
    if (/overview|aperçu|détails|résumé|summary/i.test(t)) return 'intro'
    if (/based on|health record|votre dossier|selon votre|your record|historique/i.test(t)) return 'info'
    return 'default'
  }

  /** Check if a line is a section header */
  function isHeaderLine(line: string): { isHeader: boolean; title: string; rest: string } {
    const trimmed = line.trim()
    
    // Pattern 1: Markdown bold headers like **Overview** or *Overview*
    const markdownMatch = trimmed.match(/^\*{1,2}([^*]+)\*{1,2}$/)
    if (markdownMatch) {
      return { isHeader: true, title: markdownMatch[1].trim(), rest: '' }
    }
    
    // Pattern 2: Header with colon like "Overview:" or "Overview: some text"
    const colonMatch = trimmed.match(/^([A-ZÀ-Ÿa-zà-ÿ\s]{3,50}):(.*)$/)
    if (colonMatch) {
      const possibleTitle = colonMatch[1].trim()
      // Check if it looks like a header (known keywords)
      const headerKeywords = /^(overview|warning|self-care|when to|medications?|causes?|based on|health record|possible|signes|surveiller|soulagement|prise en charge|détails|aperçu|médicaments?|quand|conseils|recommandations?)/i
      if (headerKeywords.test(possibleTitle) || possibleTitle.split(' ').length <= 5) {
        return { isHeader: true, title: possibleTitle, rest: colonMatch[2].trim() }
      }
    }
    
    // Pattern 3: Bullet point that is actually a header (• **Header**)
    const bulletHeaderMatch = trimmed.match(/^[•\-]\s*\*{1,2}([^*]+)\*{1,2}$/)
    if (bulletHeaderMatch) {
      return { isHeader: true, title: bulletHeaderMatch[1].trim(), rest: '' }
    }
    
    return { isHeader: false, title: '', rest: '' }
  }

  /** Render rich content from answer text */
  function RichAnswer({ text }: { text: string }) {
    if (!text?.trim()) return null

    // Split text into lines, then group by sections
    const lines = text.split('\n')
    const sections: { title?: string; lines: string[]; type: SectionType }[] = []
    let currentSection: { title?: string; lines: string[]; type: SectionType } = { lines: [], type: 'intro' }

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const headerCheck = isHeaderLine(trimmed)
      
      if (headerCheck.isHeader) {
        // Save previous section if it has content
        if (currentSection.lines.length > 0 || currentSection.title) {
          sections.push(currentSection)
        }
        currentSection = { 
          title: headerCheck.title, 
          lines: headerCheck.rest ? [headerCheck.rest] : [], 
          type: getType(headerCheck.title) 
        }
      } else {
        // Clean up markdown formatting from content lines
        let cleanLine = trimmed
          .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // Remove **bold** or *italic*
        
        currentSection.lines.push(cleanLine)
      }
    }
    
    // Push last section
    if (currentSection.lines.length > 0 || currentSection.title) {
      sections.push(currentSection)
    }

    // If no sections were found, treat the whole text as one section
    if (sections.length === 0) {
      sections.push({ lines: lines.filter(l => l.trim()), type: 'default' })
    }

    return (
      <div className="space-y-3">
        {sections.map((section, i) => {
          const style = sectionStyles[section.type]
          const Icon = style.icon
          return (
            <div key={i} className={`rounded-xl border p-4 ${style.border} ${style.bg}`}>
              {section.title && (
                <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${style.title}`}>
                  <Icon className="h-4 w-4" />
                  {section.title}
                </h4>
              )}
              <div className="space-y-2">
                {section.lines.map((line, j) => {
                  // Check if it's a bullet point (•, -, or * followed by space and text)
                  const bulletMatch = line.match(/^[•\-]\s+(.+)$/)
                  if (bulletMatch) {
                    return (
                      <div key={j} className="flex gap-2 text-sm">
                        <span className={`shrink-0 ${style.title}`}>•</span>
                        <span>{bulletMatch[1]}</span>
                      </div>
                    )
                  }
                  // Check if it's a numbered item
                  const numberMatch = line.match(/^(\d+)\.\s*(.+)$/)
                  if (numberMatch) {
                    return (
                      <div key={j} className="flex gap-2 text-sm">
                        <span className={`shrink-0 font-medium ${style.title}`}>{numberMatch[1]}.</span>
                        <span>{numberMatch[2]}</span>
                      </div>
                    )
                  }
                  // Regular text paragraph
                  return <p key={j} className="text-sm leading-relaxed">{line}</p>
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <DashboardPageWrapper maxWidth="md" showHeader={false} className="min-h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
          <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{labels.title}</h1>
          <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
        </div>
      </div>

      {/* Disclaimer */}
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
          {labels.disclaimer}
        </AlertDescription>
      </Alert>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col min-h-[400px]">
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-6 py-8">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{labels.quickQuestions}</p>
                </div>
                <div className="grid gap-2">
                  {dailyQuestions.map((example, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="justify-start text-left h-auto py-3 px-4"
                      onClick={() => handleSend(example)}
                    >
                      <ChevronRight className="h-4 w-4 mr-2 shrink-0 text-primary" />
                      <span className="text-sm">{example}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[95%] rounded-2xl p-4 ${
                      msg.type === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-transparent'
                    }`}>
                      {msg.type === 'assistant' && msg.urgency === 'emergency' && (
                        <div className="flex items-center gap-2 mb-3 p-2 bg-red-500/20 rounded-lg text-red-600 dark:text-red-400">
                          <Phone className="h-4 w-4" />
                          <span className="text-sm font-medium">{labels.emergency}</span>
                        </div>
                      )}
                      
                      {msg.type === 'assistant' && msg.urgency === 'urgent' && (
                        <div className="flex items-center gap-2 mb-3 p-2 bg-orange-500/20 rounded-lg text-orange-600 dark:text-orange-400">
                          <Hospital className="h-4 w-4" />
                          <span className="text-sm font-medium">{labels.urgent}</span>
                        </div>
                      )}

                      {msg.type === 'assistant' ? (
                        <RichAnswer text={msg.content} />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                      
                      {msg.type === 'assistant' && msg.keyPoints && msg.keyPoints.length > 0 && (
                        <div className="mt-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            {labels.keyPoints}
                          </p>
                          <ul className="space-y-1.5">
                            {msg.keyPoints.map((point, i) => (
                              <li key={i} className="text-sm flex items-start gap-2 text-emerald-800 dark:text-emerald-200">
                                <span className="text-emerald-500 mt-0.5">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {msg.type === 'assistant' && msg.shouldSeeDoctor && msg.urgency !== 'emergency' && (
                        <Alert className="mt-4 border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                          <Stethoscope className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-800 dark:text-amber-200 font-medium">
                            {labels.seeDoctor}
                          </AlertDescription>
                        </Alert>
                      )}

                      {msg.type === 'assistant' && msg.provider && (
                        <div className="mt-2 text-xs opacity-50 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {labels.poweredBy} {msg.provider}
                        </div>
                      )}

                      <div className="mt-2 text-xs opacity-50 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl p-4">
                      <LoadingSpinner size="md" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={labels.placeholder}
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={loading}
              />
              <Button 
                onClick={() => handleSend()} 
                disabled={loading || !input.trim()}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                {loading ? (
                  <LoadingSpinner size="md" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardPageWrapper>
  )
}
