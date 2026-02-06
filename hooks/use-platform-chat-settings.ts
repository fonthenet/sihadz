'use client'

import { useState, useEffect, useCallback } from 'react'

export interface PlatformChatSettings {
  enable_patient_to_doctor_chat: boolean
  enable_patient_to_pharmacy_chat: boolean
  enable_patient_to_lab_chat: boolean
  enable_doctor_to_doctor_chat: boolean
  enable_provider_to_provider_chat: boolean
}

const defaultSettings: PlatformChatSettings = {
  enable_patient_to_doctor_chat: true,
  enable_patient_to_pharmacy_chat: true,
  enable_patient_to_lab_chat: true,
  enable_doctor_to_doctor_chat: true,
  enable_provider_to_provider_chat: true,
}

// Cache for platform settings
let cachedSettings: PlatformChatSettings | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60000 // 1 minute

export function usePlatformChatSettings() {
  const [settings, setSettings] = useState<PlatformChatSettings>(cachedSettings || defaultSettings)
  const [loading, setLoading] = useState(!cachedSettings)

  const fetchSettings = useCallback(async () => {
    // Use cache if fresh
    if (cachedSettings && Date.now() - cacheTimestamp < CACHE_TTL) {
      setSettings(cachedSettings)
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/platform-settings/chat')
      if (res.ok) {
        const data = await res.json()
        cachedSettings = { ...defaultSettings, ...data }
        cacheTimestamp = Date.now()
        setSettings(cachedSettings)
      }
    } catch (error) {
      console.error('Failed to load platform chat settings:', error)
      // Keep using defaults if fetch fails
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Check if a specific chat type is allowed
  const canPatientChatWithDoctor = settings.enable_patient_to_doctor_chat
  const canPatientChatWithPharmacy = settings.enable_patient_to_pharmacy_chat
  const canPatientChatWithLab = settings.enable_patient_to_lab_chat
  const canDoctorChatWithDoctor = settings.enable_doctor_to_doctor_chat
  const canProviderChatWithProvider = settings.enable_provider_to_provider_chat

  // Check if a user can message another user based on their types
  const canUserChatWith = useCallback((
    currentUserType: string,
    targetUserType: string
  ): boolean => {
    const currentIsPatient = currentUserType === 'patient'
    const targetIsPatient = targetUserType === 'patient'
    
    const currentIsDoctor = currentUserType === 'doctor'
    const targetIsDoctor = targetUserType === 'doctor'
    
    const currentIsProvider = ['doctor', 'nurse', 'pharmacy', 'laboratory', 'clinic', 'ambulance', 'pharma_supplier', 'equipment_supplier'].includes(currentUserType)
    const targetIsProvider = ['doctor', 'nurse', 'pharmacy', 'laboratory', 'clinic', 'ambulance', 'pharma_supplier', 'equipment_supplier'].includes(targetUserType)
    
    const currentIsSupplier = ['pharma_supplier', 'equipment_supplier'].includes(currentUserType)
    const targetIsSupplier = ['pharma_supplier', 'equipment_supplier'].includes(targetUserType)

    // Patient trying to message a provider (but not suppliers - suppliers are B2B only)
    if (currentIsPatient && targetIsProvider) {
      if (targetIsSupplier) return false // Patients cannot message suppliers
      if (targetIsDoctor) return settings.enable_patient_to_doctor_chat
      if (targetUserType === 'pharmacy') return settings.enable_patient_to_pharmacy_chat
      if (targetUserType === 'laboratory') return settings.enable_patient_to_lab_chat
      // Default allow for other provider types
      return true
    }
    
    // Supplier trying to message a patient - not allowed (B2B only)
    if (currentIsSupplier && targetIsPatient) {
      return false
    }

    // Provider trying to message a patient
    if (currentIsProvider && targetIsPatient) {
      if (currentIsDoctor) return settings.enable_patient_to_doctor_chat
      if (currentUserType === 'pharmacy') return settings.enable_patient_to_pharmacy_chat
      if (currentUserType === 'laboratory') return settings.enable_patient_to_lab_chat
      return true
    }

    // Doctor to doctor
    if (currentIsDoctor && targetIsDoctor) {
      return settings.enable_doctor_to_doctor_chat
    }

    // Provider to provider
    if (currentIsProvider && targetIsProvider) {
      return settings.enable_provider_to_provider_chat
    }

    // Patient to patient - always allowed
    if (currentIsPatient && targetIsPatient) {
      return true
    }

    return true
  }, [settings])

  return {
    settings,
    loading,
    canPatientChatWithDoctor,
    canPatientChatWithPharmacy,
    canPatientChatWithLab,
    canDoctorChatWithDoctor,
    canProviderChatWithProvider,
    canUserChatWith,
    refresh: fetchSettings,
  }
}

// Invalidate cache (call when settings are updated)
export function invalidatePlatformChatSettingsCache() {
  cachedSettings = null
  cacheTimestamp = 0
}
