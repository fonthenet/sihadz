'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n/language-context'

const CHECK_INTERVAL_MS = 60_000

export function useDeploymentStatus() {
  const { t } = useLanguage()
  const knownBuildIdRef = useRef<string | null>(null)
  const hasShownRef = useRef(false)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/build-info.json?t=${Date.now()}`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = (await res.json()) as { buildId?: string; timestamp?: string }
        const serverBuildId = data.buildId || data.timestamp || ''

        if (!serverBuildId) return

        if (knownBuildIdRef.current === null) {
          knownBuildIdRef.current = serverBuildId
          return
        }

        if (knownBuildIdRef.current !== serverBuildId && !hasShownRef.current) {
          hasShownRef.current = true
          toast.info(t('newVersionAvailable'), {
            description: t('newVersionDescription'),
            action: {
              label: t('refresh'),
              onClick: () => window.location.reload(),
            },
            duration: 15_000,
          })
        }
      } catch {
        // ignore
      }
    }

    const id = setInterval(check, CHECK_INTERVAL_MS)
    check()
    return () => clearInterval(id)
  }, [t])
}
