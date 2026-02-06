'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { translations, type Language, type TranslationKey } from './translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
  dir: 'ltr' | 'rtl'
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const VALID_LANGS: Language[] = ['ar', 'fr', 'en']

function setLangCookie(lang: string) {
  if (typeof document === 'undefined') return
  document.cookie = `dzdoc-language=${encodeURIComponent(lang)};path=/;max-age=31536000;SameSite=Lax`
}

export function LanguageProvider({ children, initialLanguage = 'en' }: { children: ReactNode; initialLanguage?: Language }) {
  // Server passes initialLanguage from cookie; matches script output for no hydration mismatch.
  const [language, setLanguageState] = useState<Language>(initialLanguage)

  // Keep html dir/lang in sync when language changes (script already set it on load)
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language])

  // Sync profile when user is logged in (write-only: we never let profile override localStorage)
  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const local = localStorage.getItem('dzdoc-language') as Language | null
        if (local && VALID_LANGS.includes(local)) {
          supabase.from('profiles').update({ preferred_language: local }).eq('id', user.id).then(() => {})
        }
      }
    })
  }, [language])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('dzdoc-language', lang)
    setLangCookie(lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').update({ preferred_language: lang }).eq('id', user.id).then(() => {})
      }
    })
  }, [])
  
  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key
  }
  
  const dir = language === 'ar' ? 'rtl' : 'ltr'
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    return {
      language: 'en' as Language,
      setLanguage: () => {},
      t: (key: TranslationKey) => {
        try {
          return translations?.en?.[key] || translations?.fr?.[key] || key
        } catch {
          return key
        }
      },
      dir: 'ltr' as const
    }
  }
  return context
}
