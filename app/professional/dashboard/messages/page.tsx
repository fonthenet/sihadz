'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import { SectionLoading } from '@/components/ui/page-loading'
import { EmbeddedChat } from '@/components/chat-widget/embedded-chat'

export default function ProMessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const threadId = searchParams.get('thread')
  const { user, profile } = useAuth()
  const [professional, setProfessional] = useState<{ business_name?: string; type?: string; avatar_url?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // Check employee session first (employees use PIN - may not have chat access)
        const empRes = await fetch('/api/employee-auth/dashboard-session', { credentials: 'include' })
        if (empRes.ok) {
          const empData = await empRes.json()
          if (empData.valid) {
            setProfessional(empData.professional || {})
            setLoading(false)
            return
          }
        }

        // Owner session - use auth
        const supabase = createBrowserClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/professional/auth/login')
          return
        }

        const { data: profData } = await supabase
          .from('professionals')
          .select('business_name, type, avatar_url')
          .eq('auth_user_id', authUser.id)
          .maybeSingle()

        setProfessional(profData || {})
      } catch (err) {
        console.error('Error loading pro messages:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  // Use auth user for chat (owner only - employees use PIN and don't have Supabase auth)
  const authUserId = user?.id

  if (loading) {
    return (
      <SectionLoading
        minHeight="min-h-[calc(100vh-5rem)]"
        className="text-muted-foreground"
      />
    )
  }

  if (!authUserId) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <p className="text-muted-foreground">Please sign in to view messages</p>
      </div>
    )
  }

  // Same wrapper as patient messages page - layout provides padding
  return (
    <div className="w-full min-w-0 h-[calc(100vh-5rem)] min-h-[400px] flex flex-col">
      <EmbeddedChat
        userId={authUserId}
        userName={professional?.business_name || profile?.full_name || user?.email?.split('@')[0] || 'User'}
        userAvatar={profile?.avatar_url ?? professional?.avatar_url ?? undefined}
        userType={(professional?.type as any) || 'doctor'}
        defaultThreadId={threadId || undefined}
      />
    </div>
  )
}
