'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { ChatWidget } from '@/components/chat-widget'

export function FloatingChatWidget() {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [user, setUser] = useState<any>(null)
  const [userName, setUserName] = useState('')
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined)
  const [userType, setUserType] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const refresh = async () => {
      const { data: auth } = await supabase.auth.getUser()
      const u = auth?.user
      if (!u) {
        setUser(null)
        setIsLoading(false)
        return
      }
      setUser(u)

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, user_type, avatar_url')
        .eq('id', u.id)
        .single()
      
      const { data: professional } = await supabase
        .from('professionals')
        .select('business_name, type, avatar_url')
        .eq('auth_user_id', u.id)
        .single()

      setUserName(professional?.business_name || profile?.full_name || 'User')
      setUserAvatar(professional?.avatar_url || profile?.avatar_url || undefined)
      setUserType(professional?.type || profile?.user_type || 'patient')
      setIsLoading(false)
    }

    refresh()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh()
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  if (isLoading || !user) return null

  return (
    <ChatWidget
      userId={user.id}
      userName={userName}
      userAvatar={userAvatar}
      userType={userType}
      position="bottom-right"
      defaultOpen={false}
    />
  )
}
