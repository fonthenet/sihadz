// @ts-nocheck
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient()

    // Pharmacy test accounts to create
    const pharmacies = [
      {
        email: 'pharmacy1@algeriamed.test',
        name: 'PharmaMed Algiers',
        phone: '+213555111111',
        license_number: 'PHARM-001'
      },
      {
        email: 'pharmacy2@algeriamed.test',
        name: 'Health Plus Pharmacy',
        phone: '+213555222222',
        license_number: 'PHARM-002'
      },
      {
        email: 'pharmacy3@algeriamed.test',
        name: 'Wellness Pharma',
        phone: '+213555333333',
        license_number: 'PHARM-003'
      },
      {
        email: 'pharmacy4@algeriamed.test',
        name: 'Central Pharmacy',
        phone: '+213555444444',
        license_number: 'PHARM-004'
      },
      {
        email: 'pharmacy5@algeriamed.test',
        name: 'Night & Day Pharmacy',
        phone: '+213555555555',
        license_number: 'PHARM-005'
      }
    ]

    const password = '123456'
    const results = []

    for (const pharmacy of pharmacies) {
      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: pharmacy.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: pharmacy.name,
            provider_type: 'pharmacy'
          }
        })

        if (authError) {
          console.log(`[v0] Auth error for ${pharmacy.email}:`, authError.message)
          results.push({
            email: pharmacy.email,
            success: false,
            reason: authError.message
          })
          continue
        }

        // Create professional record
        const { error: profError } = await supabase
          .from('professionals')
          .insert({
            auth_user_id: authData.user.id,
            full_name: pharmacy.name,
            email: pharmacy.email,
            phone: pharmacy.phone,
            provider_type: 'pharmacy',
            license_number: pharmacy.license_number,
            status: 'verified',
            created_at: new Date().toISOString()
          })

        if (profError) {
          console.log(`[v0] Professional record error for ${pharmacy.email}:`, profError.message)
          results.push({
            email: pharmacy.email,
            success: false,
            reason: `Auth created but professional record failed: ${profError.message}`
          })
        } else {
          results.push({
            email: pharmacy.email,
            success: true,
            message: `Pharmacy account created successfully`
          })
        }
      } catch (error) {
        results.push({
          email: pharmacy.email,
          success: false,
          reason: (error as Error).message
        })
      }
    }

    return NextResponse.json({
      success: true,
      created_accounts: results.filter(r => r.success).length,
      total_accounts: pharmacies.length,
      results
    })
  } catch (error) {
    console.error('[v0] Pharmacy account creation error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
