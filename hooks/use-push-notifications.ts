'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { 
  initializePushNotifications, 
  registerPushTokenWithBackend,
  addPushNotificationListener,
  isNative,
  getPlatform
} from '@/lib/native'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface UsePushNotificationsOptions {
  userId: string | null
  enabled?: boolean
  onNotificationReceived?: (notification: { title?: string; body?: string; data?: Record<string, any> }) => void
}

export function usePushNotifications({ 
  userId, 
  enabled = true,
  onNotificationReceived 
}: UsePushNotificationsOptions) {
  const [isRegistered, setIsRegistered] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const initializedRef = useRef(false)
  const tokenRef = useRef<string | null>(null)

  // Initialize and register push notifications
  const initialize = useCallback(async () => {
    if (!userId || !enabled || initializedRef.current) return
    
    // Only run on native platforms
    if (!isNative()) {
      return
    }

    initializedRef.current = true

    try {
      const result = await initializePushNotifications()
      
      if (!result.success || !result.token) {
        setError(result.error || 'Failed to get push token')
        return
      }

      setToken(result.token)
      tokenRef.current = result.token

      // Register with backend
      const supabase = createBrowserClient()
      const registered = await registerPushTokenWithBackend(result.token, supabase)
      
      if (registered) {
        setIsRegistered(true)
        console.log('Push notifications registered successfully')
      } else {
        setError('Failed to register push token with backend')
      }
    } catch (err) {
      setError(String(err))
      console.error('Push notification initialization error:', err)
    }
  }, [userId, enabled])

  // Handle notification taps - navigate to the relevant screen
  const handleNotificationTap = useCallback((notification: { title?: string; body?: string; data?: Record<string, any> }) => {
    const data = notification.data
    
    if (data?.type === 'chat_message' && data?.thread_id) {
      // Navigate to the chat thread
      router.push(`/messages?thread=${data.thread_id}`)
    } else if (data?.type === 'appointment' && data?.appointment_id) {
      router.push(`/appointments/${data.appointment_id}`)
    } else if (data?.action_url) {
      router.push(data.action_url)
    }
  }, [router])

  // Handle foreground notifications
  const handleNotificationReceived = useCallback((notification: { title?: string; body?: string; data?: Record<string, any> }) => {
    // Show in-app toast for foreground notifications
    if (notification.title) {
      toast(notification.title, {
        description: notification.body,
        action: notification.data?.thread_id ? {
          label: 'View',
          onClick: () => handleNotificationTap(notification)
        } : undefined
      })
    }

    // Call custom handler if provided
    onNotificationReceived?.(notification)
  }, [handleNotificationTap, onNotificationReceived])

  // Initialize on mount when user is available
  useEffect(() => {
    if (userId && enabled) {
      initialize()
    }
  }, [userId, enabled, initialize])

  // Set up notification listeners
  useEffect(() => {
    if (!userId || !enabled || !isNative()) return

    const cleanup = addPushNotificationListener(
      handleNotificationReceived,
      handleNotificationTap
    )

    return cleanup
  }, [userId, enabled, handleNotificationReceived, handleNotificationTap])

  return {
    isRegistered,
    token,
    error,
    isNative: isNative(),
    platform: getPlatform(),
    initialize
  }
}
