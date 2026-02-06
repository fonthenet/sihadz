'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Standalone /payment is deprecated. Payment with balance, wallet, and deposit
 * happens in the booking flow at /booking/confirm. Redirect there.
 */
export default function PaymentPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/booking/new')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting to booking...</p>
    </div>
  )
}
