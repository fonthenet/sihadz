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
  user_type: 'patient' | 'doctor' | 'pharmacy' | 'admin'
  avatar_url: string | null
  is_verified: boolean
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

const publicPaths = ['/', '/login', '/register', '/register/doctor', '/register/pharmacy', '/forgot-password', '/search', '/doctors', '/pharmacies', '/labs', '/clinics', '/nurses', '/symptom-checker', '/healthcare-directory', '/pharmacie-de-garde', '/auth-test', '/auth/callback', '/professional/auth/login', '/professional/auth/signup']

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createBrowserClient(), [])
  
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (data && !error) {
        setProfile(data as Profile)
      } else {
        // Profile might not exist yet for new users - that's okay
        console.log('[v0] No profile found for user:', userId, error?.message)
        setProfile(null)
      }
    } catch (err) {
      // Profile fetch failed - continue without profile
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
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    router.push('/login')
  }

  useEffect(() => {
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
      subscription.unsubscribe()
    }
  }, [supabase])

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
    )

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
