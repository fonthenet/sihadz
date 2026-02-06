'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { EmployeePermissions } from '@/lib/employee-auth'

// ============================================================================
// Types
// ============================================================================

export interface EmployeeInfo {
  id: string
  displayName: string
  username: string
  role: string | null
  avatarUrl: string | null
}

export interface ProfessionalInfo {
  id: string
  businessName: string
  type: string
}

export interface EmployeeSessionState {
  isLoading: boolean
  isAuthenticated: boolean
  employee: EmployeeInfo | null
  professional: ProfessionalInfo | null
  permissions: EmployeePermissions | null
  expiresAt: string | null
}

export interface EmployeeContextValue extends EmployeeSessionState {
  login: (practiceCode: string, username: string, pin: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  hasPermission: (category: 'dashboard' | 'actions' | 'data', permission: string) => boolean
  hasDashboardAccess: (section: string) => boolean
  hasActionPermission: (action: string) => boolean
}

// ============================================================================
// Default Values
// ============================================================================

const defaultState: EmployeeSessionState = {
  isLoading: true,
  isAuthenticated: false,
  employee: null,
  professional: null,
  permissions: null,
  expiresAt: null,
}

const defaultContext: EmployeeContextValue = {
  ...defaultState,
  login: async () => ({ success: false, error: 'Context not initialized' }),
  logout: async () => {},
  refresh: async () => {},
  hasPermission: () => false,
  hasDashboardAccess: () => false,
  hasActionPermission: () => false,
}

// ============================================================================
// Context
// ============================================================================

const EmployeeContext = createContext<EmployeeContextValue>(defaultContext)

// ============================================================================
// Provider
// ============================================================================

interface EmployeeProviderProps {
  children: ReactNode
}

export function EmployeeProvider({ children }: EmployeeProviderProps) {
  const [state, setState] = useState<EmployeeSessionState>(defaultState)

  // Validate session on mount
  const validateSession = useCallback(async () => {
    try {
      const response = await fetch('/api/employee-auth/validate', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.valid) {
          setState({
            isLoading: false,
            isAuthenticated: true,
            employee: data.employee,
            professional: data.professional,
            permissions: data.permissions,
            expiresAt: data.expiresAt,
          })
          return
        }
      }

      // Not authenticated
      setState({
        ...defaultState,
        isLoading: false,
      })
    } catch (error) {
      console.error('Session validation error:', error)
      setState({
        ...defaultState,
        isLoading: false,
      })
    }
  }, [])

  useEffect(() => {
    validateSession()
  }, [validateSession])

  // Login
  const login = useCallback(async (
    practiceCode: string,
    username: string,
    pin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/employee-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ practiceCode, username, pin }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' }
      }

      setState({
        isLoading: false,
        isAuthenticated: true,
        employee: data.employee,
        professional: data.professional,
        permissions: data.permissions,
        expiresAt: data.expiresAt,
      })

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'An error occurred during login' }
    }
  }, [])

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/employee-auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout error:', error)
    }

    setState({
      ...defaultState,
      isLoading: false,
    })
  }, [])

  // Refresh session
  const refresh = useCallback(async () => {
    await validateSession()
  }, [validateSession])

  // Permission helpers
  const hasPermission = useCallback((
    category: 'dashboard' | 'actions' | 'data',
    permission: string
  ): boolean => {
    if (!state.permissions) return false
    const categoryPerms = state.permissions[category] as Record<string, boolean>
    return categoryPerms?.[permission] === true
  }, [state.permissions])

  const hasDashboardAccess = useCallback((section: string): boolean => {
    return hasPermission('dashboard', section)
  }, [hasPermission])

  const hasActionPermission = useCallback((action: string): boolean => {
    return hasPermission('actions', action)
  }, [hasPermission])

  const value: EmployeeContextValue = {
    ...state,
    login,
    logout,
    refresh,
    hasPermission,
    hasDashboardAccess,
    hasActionPermission,
  }

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useEmployeeSession(): EmployeeContextValue {
  const context = useContext(EmployeeContext)
  if (!context) {
    throw new Error('useEmployeeSession must be used within an EmployeeProvider')
  }
  return context
}

// ============================================================================
// HOC for requiring employee auth
// ============================================================================

export function withEmployeeAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { requiredPermissions?: Array<{ category: 'dashboard' | 'actions' | 'data'; permission: string }> }
) {
  return function WrappedComponent(props: P) {
    const { isLoading, isAuthenticated, hasPermission } = useEmployeeSession()

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/professional/staff-login'
      }
      return null
    }

    // Check required permissions
    if (options?.requiredPermissions) {
      const hasAllRequired = options.requiredPermissions.every(
        ({ category, permission }) => hasPermission(category, permission)
      )
      if (!hasAllRequired) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
          </div>
        )
      }
    }

    return <Component {...props} />
  }
}
