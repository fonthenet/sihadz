'use client'

import { useCallback, useEffect, useState } from 'react'

/** Lightweight hook to get total unread chat count. Uses /api/messaging?type=threads. */
export function useChatUnreadCount(userId: string | null) {
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    if (!userId) {
      setCount(0)
      return
    }

    try {
      const res = await fetch(`/api/messaging?type=threads`)
      const data = await res.json()
      if (data?.ok && Array.isArray(data.threads)) {
        const total = data.threads.reduce((sum: number, t: { unread_count?: number }) => sum + (t.unread_count || 0), 0)
        setCount(total)
      } else {
        setCount(0)
      }
    } catch {
      setCount(0)
    }
  }, [userId])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [fetchCount])

  return { count, refresh: fetchCount }
}
