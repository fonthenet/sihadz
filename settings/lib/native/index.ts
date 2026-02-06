/**
 * Native Mobile Utilities for DZDoc
 * These functions work on both web and native (iOS/Android)
 * They gracefully fallback to web APIs when not on native
 */

// Check if running in Capacitor native environment
export const isNative = (): boolean => {
  if (typeof window === 'undefined') return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

// Check platform
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  if (typeof window === 'undefined') return 'web'
  const capacitor = (window as any).Capacitor
  if (!capacitor?.isNativePlatform?.()) return 'web'
  return capacitor.getPlatform?.() || 'web'
}

// Camera - Take prescription photos
export const takePhoto = async (): Promise<string | null> => {
  if (!isNative()) {
    // Fallback to file input for web
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.capture = 'environment'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        } else {
          resolve(null)
        }
      }
      input.click()
    })
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    })
    return photo.base64String ? `data:image/jpeg;base64,${photo.base64String}` : null
  } catch (error) {
    console.error('Camera error:', error)
    return null
  }
}

// Geolocation - Find nearby pharmacies
export const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
  if (!isNative()) {
    // Fallback to browser geolocation
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  try {
    const { Geolocation } = await import('@capacitor/geolocation')
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    })
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    }
  } catch (error) {
    console.error('Geolocation error:', error)
    return null
  }
}

// Push Notifications - Appointment reminders
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNative()) {
    // Fallback to browser notifications
    if (!('Notification' in window)) return false
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const result = await PushNotifications.requestPermissions()
    return result.receive === 'granted'
  } catch (error) {
    console.error('Push notification error:', error)
    return false
  }
}

// Local Notifications - Appointment reminders
export const scheduleAppointmentReminder = async (
  appointmentId: string,
  title: string,
  body: string,
  scheduledAt: Date
): Promise<boolean> => {
  if (!isNative()) {
    // Web fallback - use service worker notifications if available
    console.log('Local notifications not supported on web')
    return false
  }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [
        {
          id: parseInt(appointmentId.replace(/\D/g, '').slice(0, 9)) || Date.now(),
          title,
          body,
          schedule: { at: scheduledAt },
          sound: 'notification.wav',
          actionTypeId: 'APPOINTMENT_REMINDER',
          extra: { appointmentId },
        },
      ],
    })
    return true
  } catch (error) {
    console.error('Local notification error:', error)
    return false
  }
}

// Haptic Feedback - Native touch feedback
export const hapticFeedback = async (type: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> => {
  if (!isNative()) return

  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    const style = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    }[type]
    await Haptics.impact({ style })
  } catch (error) {
    // Haptics not critical, silently fail
  }
}

// Share - Share prescription or appointment details
export const shareContent = async (title: string, text: string, url?: string): Promise<boolean> => {
  if (!isNative()) {
    // Web Share API fallback
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return true
      } catch {
        return false
      }
    }
    return false
  }

  try {
    const { Share } = await import('@capacitor/share')
    await Share.share({ title, text, url, dialogTitle: title })
    return true
  } catch (error) {
    console.error('Share error:', error)
    return false
  }
}

// Open Maps - Get directions to pharmacy/clinic
export const openMapsDirections = async (address: string): Promise<void> => {
  const encodedAddress = encodeURIComponent(address)
  const platform = getPlatform()

  if (platform === 'ios') {
    // Apple Maps
    window.open(`maps://maps.apple.com/?daddr=${encodedAddress}`, '_system')
  } else if (platform === 'android') {
    // Google Maps
    window.open(`geo:0,0?q=${encodedAddress}`, '_system')
  } else {
    // Web fallback
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
  }
}

// Call Phone - Contact doctor/pharmacy
export const callPhone = (phoneNumber: string): void => {
  window.location.href = `tel:${phoneNumber}`
}

// Open App Settings - For permission issues
export const openAppSettings = async (): Promise<void> => {
  if (!isNative()) return

  try {
    const { App } = await import('@capacitor/app')
    // Note: This requires the App plugin to be installed
    // For now, we'll just log - implement when App plugin is added
    console.log('Opening app settings...')
  } catch (error) {
    console.error('Cannot open app settings:', error)
  }
}

// Check if app is in foreground/background
export const addAppStateListener = (callback: (isActive: boolean) => void): (() => void) => {
  if (!isNative()) {
    // Web fallback using visibility API
    const handler = () => callback(!document.hidden)
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }

  let listener: any = null
  
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appStateChange', ({ isActive }) => {
      callback(isActive)
    }).then((l) => {
      listener = l
    })
  })

  return () => {
    if (listener) {
      listener.remove()
    }
  }
}
