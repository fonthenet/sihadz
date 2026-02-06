'use client'

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

type Profile = {
  id: string
  email: string
  full_name: string
  full_name_ar: string | null
  phone: string | null
  user_type: 'patient' | 'doctor' | 'nurse' | 'pharmacy' | 'laboratory' | 'clinic' | 'admin' | 'professional' | 'super_admin'
  avatar_url: string | null
  is_verified: boolean
  /** For professionals: business/practice name from professionals table */
  business_name?: string | null
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export const useAuth = () => useContext(AuthContext)

const publicPaths = ['/', '/login', '/register', '/register/doctor', '/register/pharmacy', '/forgot-password', '/search', '/doctors', '/pharmacies', '/labs', '/clinics', '/nurses', '/symptom-checker', '/healthcare-directory', '/pharmacie-de-garde', '/auth-test', '/auth/callback', '/professional/auth/login', '/professional/auth/signup', '/professional/staff-login']

type InitialProfile = {
  id: string
  email: string
  full_name: string
  full_name_ar: string | null
  phone: string | null
  user_type: Profile['user_type']
  avatar_url: string | null
  is_verified: boolean
  business_name?: string | null
} | null

export function AuthProvider({ children, initialProfile }: { children: ReactNode; initialProfile?: InitialProfile }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => {
    try {
      return createBrowserClient()
    } catch (error) {
      console.error('[AuthProvider] Failed to create Supabase client:', error)
      // Return null - auth will be disabled but site won't crash
      return null as any
    }
  }, [])
  
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(initialProfile ?? null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    if (!supabase) return

    try {
      // 1. Check professionals table first – source of truth for doctors, pharmacies, labs, clinics
      const { data: professional } = await supabase
        .from('professionals')
        .select('type')
        .eq('auth_user_id', userId)
        .maybeSingle()

      if (professional?.type) {
        // User is a professional – fetch profile + business_name for display
        const { data: profRow } = await supabase
          .from('professionals')
          .select('business_name')
          .eq('auth_user_id', userId)
          .maybeSingle()
        const { data: profData } = await supabase
          .from('profiles')
          .select('id, email, full_name, full_name_ar, phone, avatar_url, is_verified')
          .eq('id', userId)
          .maybeSingle()
        const base = profData
          ? { ...profData, user_type: professional.type, business_name: profRow?.business_name ?? null }
          : { id: userId, email: '', full_name: '', full_name_ar: null, phone: null, avatar_url: null, is_verified: false, user_type: professional.type, business_name: profRow?.business_name ?? null }
        setProfile(base as Profile)
        return
      }

      // 2. Not a professional – use profile from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data && !error) {
        setProfile(data as Profile)
      } else {
        console.log('[v0] No profile found for user:', userId, error?.message)
        setProfile(null)
      }
    } catch (err) {
      console.log('[v0] Profile fetch error:', err)
      setProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const signOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error('[AuthProvider] Sign out error:', error)
      }
    }
    setUser(null)
    setProfile(null)
    setSession(null)
    router.push('/login')
  }

  useEffect(() => {
    if (!supabase) {
      // Supabase client not available - skip auth initialization
      setLoading(false)
      return
    }

    let mounted = true
    
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (mounted) {
          if (currentSession) {
            setSession(currentSession)
            setUser(currentSession.user)
            // Fetch profile but don't block on it
            fetchProfile(currentSession.user.id).catch(() => {})
          }
          // Always set loading to false after getting session
          setLoading(false)
        }
      } catch (error) {
        console.error('[AuthProvider] Auth initialization error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return
        
        if (newSession) {
          setSession(newSession)
          setUser(newSession.user)
          // Fetch profile in background, don't await
          fetchProfile(newSession.user.id).catch(() => {})
        } else {
          setSession(null)
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [supabase])

  // Refresh profile when avatar is updated from any component
  useEffect(() => {
    const handler = () => {
      if (user) fetchProfile(user.id).catch(() => {})
    }
    window.addEventListener('dzd_avatar_updated', handler)
    return () => window.removeEventListener('dzd_avatar_updated', handler)
  }, [user])

  // Route protection
  useEffect(() => {
    if (loading) return

    const isPublicPath = publicPaths.some(path => 
      pathname === path || 
      pathname.startsWith('/doctors/') || 
      pathname.startsWith('/nurses/') || 
      pathname.startsWith('/labs/') || 
      pathname.startsWith('/clinics/') || 
      pathname.startsWith('/pharmacies/') || 
      pathname.startsWith('/booking/')
    ) || pathname.startsWith('/professional/')

    if (!user && !isPublicPath) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [user, loading, pathname, router])

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
