'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SeedTestAccountsPage() {
  return (
    <div className="min-h-screen bg-muted/30 p-8 flex items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Test accounts disabled</CardTitle>
          <CardDescription>
            Fake and test accounts have been removed. Only real accounts you create (e.g. via professional signup) are used. Use the app to register real doctors, clinics, pharmacies, and labs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
