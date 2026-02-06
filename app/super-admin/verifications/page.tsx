'use client'

import { ProfessionalApprovals } from '@/app/super-admin/components/professional-approvals'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function VerificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Professional Verifications</h1>
        <p className="text-muted-foreground mt-2">Review and approve pending professional accounts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Professionals waiting for admin approval to start accepting patients</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfessionalApprovals />
        </CardContent>
      </Card>
    </div>
  )
}
