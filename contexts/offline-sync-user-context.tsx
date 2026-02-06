'use client'

import { createContext, useContext, type ReactNode } from 'react'

const OfflineSyncUserIdContext = createContext<string | null>(null)

export function OfflineSyncUserIdProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  return (
    <OfflineSyncUserIdContext.Provider value={userId}>
      {children}
    </OfflineSyncUserIdContext.Provider>
  )
}

export function useOfflineSyncUserId() {
  return useContext(OfflineSyncUserIdContext)
}
