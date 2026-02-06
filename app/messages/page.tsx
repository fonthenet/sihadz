'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { FullPageLoading } from '@/components/ui/page-loading'

/**
 * Redirect /messages?thread=... to the correct messages route.
 * Chat notifications use /messages?thread=... (from DB trigger).
 * Patients: /dashboard/messages
 * Professionals: /professional/dashboard/messages
 * Uses router.replace for client-side navigation (no full reload).
 */
export default function MessagesRedirectPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const redirect = async () => {
      const thread = searchParams.get('thread')
      const query = thread ? `?thread=${thread}` : ''

      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login' + (thread ? `?next=/dashboard/messages${query}` : ''))
        return
      }

      const { data: prof } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      const base = prof ? '/professional/dashboard/messages' : '/dashboard/messages'
      router.replace(base + query)
    }
    redirect()
  }, [searchParams, router])

  return <FullPageLoading />
}
