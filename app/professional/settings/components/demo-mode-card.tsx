'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DemoModeCardProps {
  onToggle?: () => void
}

/** Only shown when legacy SEED-* demo data exists. Allows clearing it. Seed is disabled. */
export default function DemoModeCard({ onToggle }: DemoModeCardProps) {
  const { toast } = useToast()
  const [demoDataPresent, setDemoDataPresent] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/demo', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { active: false }))
      .then((d) => setDemoDataPresent(!!d.active))
      .catch(() => setDemoDataPresent(false))
  }, [])

  const handleClear = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to clear demo data')
      setDemoDataPresent(false)
      toast({ title: 'Demo data cleared', description: 'All sample data has been removed.' })
      onToggle?.()
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (!demoDataPresent) return null

  return (
    <Card className="shadow-sm border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-amber-600" />
          Remove sample data
        </CardTitle>
        <CardDescription>
          Legacy sample data (SEED-*) was found. Remove it to keep only real data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={handleClear} disabled={loading}>
          {loading ? <LoadingSpinner size="sm" className="me-2" /> : null}
          Clear sample data
        </Button>
      </CardContent>
    </Card>
  )
}
