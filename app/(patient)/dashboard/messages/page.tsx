'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { SectionLoading } from '@/components/ui/page-loading'
import { EmbeddedChat } from '@/components/chat-widget/embedded-chat'

export default function MessagesPage() {
  const searchParams = useSearchParams()
  const threadId = searchParams.get('thread')
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string; user_type?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient()
    
    const loadUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          setLoading(false)
          return
        }
        setUser(authUser)
        
        // Load profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, user_type')
          .eq('id', authUser.id)
          .maybeSingle()
        
        if (profileData) {
          setProfile(profileData)
        }
      } catch (err) {
        console.error('Error loading user:', err)
      } finally {
        setLoading(false)
      }
    }
    
    loadUser()
  }, [])

  if (loading) {
    return (
      <SectionLoading
        minHeight="min-h-[calc(100vh-5rem)]"
        label="Loading..."
      />
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <p className="text-muted-foreground">Please sign in to view messages</p>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 h-[calc(100vh-5rem)] min-h-[400px] flex flex-col">
      <EmbeddedChat
        userId={user.id}
        userName={profile?.full_name || user.email?.split('@')[0] || 'User'}
        userAvatar={profile?.avatar_url || undefined}
        userType={(profile?.user_type as any) || 'patient'}
        defaultThreadId={threadId || undefined}
      />
    </div>
  )
}
