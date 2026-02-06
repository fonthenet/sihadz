'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  isNative,
  getPlatform,
  takePhoto,
  getCurrentLocation,
  requestNotificationPermission,
  scheduleAppointmentReminder,
  hapticFeedback,
  shareContent,
  openMapsDirections,
  callPhone,
  addAppStateListener,
} from '@/lib/native'

/**
 * Hook to access native mobile features in DZDoc
 * Works seamlessly on web with graceful fallbacks
 */
export function useNative() {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web')
  const [isNativePlatform, setIsNativePlatform] = useState(false)
  const [isAppActive, setIsAppActive] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  useEffect(() => {
    // Detect platform on mount
    setPlatform(getPlatform())
    setIsNativePlatform(isNative())

    // Listen for app state changes (foreground/background)
    const unsubscribe = addAppStateListener((active) => {
      setIsAppActive(active)
    })

    return unsubscribe
  }, [])

  // Camera - Take prescription/document photo
  const capturePhoto = useCallback(async () => {
    if (isNativePlatform) {
      await hapticFeedback('light')
    }
    return takePhoto()
  }, [isNativePlatform])

  // Location - Find nearby pharmacies/doctors
  const getLocation = useCallback(async () => {
    return getCurrentLocation()
  }, [])

  // Notifications - Request permission and schedule
  const enableNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission()
    setNotificationsEnabled(granted)
    return granted
  }, [])

  const scheduleReminder = useCallback(
    async (appointmentId: string, title: string, body: string, date: Date) => {
      if (!notificationsEnabled) {
        await enableNotifications()
      }
      return scheduleAppointmentReminder(appointmentId, title, body, date)
    },
    [notificationsEnabled, enableNotifications]
  )

  // Haptics - Native touch feedback
  const vibrate = useCallback(
    async (type: 'light' | 'medium' | 'heavy' = 'medium') => {
      if (isNativePlatform) {
        await hapticFeedback(type)
      }
    },
    [isNativePlatform]
  )

  // Share - Share appointment/prescription details
  const share = useCallback(async (title: string, text: string, url?: string) => {
    return shareContent(title, text, url)
  }, [])

  // Maps - Get directions to pharmacy/clinic
  const getDirections = useCallback((address: string) => {
    openMapsDirections(address)
  }, [])

  // Phone - Call doctor/pharmacy
  const call = useCallback((phoneNumber: string) => {
    if (isNativePlatform) {
      hapticFeedback('light')
    }
    callPhone(phoneNumber)
  }, [isNativePlatform])

  return {
    // Platform info
    platform,
    isNative: isNativePlatform,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web',
    isAppActive,

    // Features
    capturePhoto,
    getLocation,
    enableNotifications,
    scheduleReminder,
    notificationsEnabled,
    vibrate,
    share,
    getDirections,
    call,
  }
}

export default useNative
