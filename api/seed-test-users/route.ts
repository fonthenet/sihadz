import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabaseAdmin = createAdminClient()
  try {
    const { secret } = await request.json()
    
    // Simple protection - require a secret to run this
    if (secret !== "create-test-accounts-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results: { email: string; success: boolean; error?: string }[] = []
    const password = "Test123456!"

    // Create test accounts
    const testAccounts = [
      // Patients
      { email: "patient1@algeriamed.test", role: "patient", name: "Ahmed Benali", gender: "male", birth_date: "1985-03-15" },
      { email: "patient2@algeriamed.test", role: "patient", name: "Fatima Boudiaf", gender: "female", birth_date: "1992-07-22" },
      { email: "patient3@algeriamed.test", role: "patient", name: "Karim Hadj", gender: "male", birth_date: "1978-11-08" },
      { email: "patient4@algeriamed.test", role: "patient", name: "Amina Zerrouki", gender: "female", birth_date: "1955-02-18" },
      { email: "patient5@algeriamed.test", role: "patient", name: "Youcef Messaoud", gender: "male", birth_date: "1998-06-30" },
      
      // Doctors  
      { email: "doctor1@algeriamed.test", role: "doctor", name: "Dr. Yacine Amrani", specialty: "Cardiology" },
      { email: "doctor2@algeriamed.test", role: "doctor", name: "Dr. Samia Khelifi", specialty: "Pediatrics" },
      { email: "doctor3@algeriamed.test", role: "doctor", name: "Dr. Rachid Benkhaled", specialty: "General Medicine" },
      { email: "doctor4@algeriamed.test", role: "doctor", name: "Dr. Leila Mammeri", specialty: "Gynecology" },
      { email: "doctor5@algeriamed.test", role: "doctor", name: "Dr. Omar Zeroual", specialty: "Dermatology" },
      
      // Clinics
      { email: "clinic1@algeriamed.test", role: "clinic", name: "Clinique El Shifa" },
      { email: "clinic2@algeriamed.test", role: "clinic", name: "Clinique Essalam" },
      
      // Pharmacies
      { email: "pharmacy1@algeriamed.test", role: "pharmacy", name: "Pharmacie El Nour" },
      { email: "pharmacy2@algeriamed.test", role: "pharmacy", name: "Grande Pharmacie d'Alger" },
      
      // Labs
      { email: "lab1@algeriamed.test", role: "laboratory", name: "Laboratoire Central" },
      { email: "lab2@algeriamed.test", role: "laboratory", name: "Laboratoire Ibn Sina" },
    ]

    for (const account of testAccounts) {
      // Create auth user via Admin API (properly hashes password)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { full_name: account.name, role: account.role }
      })

      if (authError) {
        results.push({ email: account.email, success: false, error: authError.message })
        continue
      }

      if (!authData.user) {
        results.push({ email: account.email, success: false, error: "No user returned" })
        continue
      }

      // Create profile
      const profileData: any = {
        id: authData.user.id,
        email: account.email,
        full_name: account.name,
        role: account.role,
        wilaya_code: "16",
        phone: "+213550000000",
        is_verified: true,
        is_active: true,
      }

      // Add patient-specific fields
      if (account.role === "patient") {
        profileData.gender = account.gender
        profileData.birth_date = account.birth_date
      }

      const { error: profileError } = await supabaseAdmin.from("profiles").insert(profileData)

      if (profileError) {
        results.push({ email: account.email, success: false, error: `Profile: ${profileError.message}` })
        continue
      }

      // Create professional record for non-patients
      if (account.role !== "patient") {
        const { error: profError } = await supabaseAdmin.from("professionals").insert({
          auth_user_id: authData.user.id,
          email: account.email,
          name: account.name,
          type: account.role,
          status: "approved",
          is_verified: true,
          wilaya_code: "16",
        })

        if (profError) {
          results.push({ email: account.email, success: false, error: `Professional: ${profError.message}` })
          continue
        }

        // Create doctor-specific records
        if (account.role === "doctor") {
          const { error: doctorError } = await supabaseAdmin.from("doctors").insert({
            id: authData.user.id,
            user_id: authData.user.id,
            license_number: `MED-16-${Math.floor(Math.random() * 10000)}`,
            specialty: account.specialty,
            specialty_ar: "تخصص طبي",
            specialty_fr: account.specialty,
            bio: `Experienced ${account.specialty} specialist`,
            experience_years: 10,
            consultation_fee: 3000,
            e_visit_fee: 2500,
            supports_e_visit: true,
            supports_in_person: true,
            wilaya_code: "16",
            city: "Alger",
            clinic_name: "Private Clinic",
            clinic_address: "123 Rue de la Liberté, Alger",
            clinic_phone: "+213550000000",
            rating: 4.5,
            review_count: 100,
            is_verified: true,
            is_active: true,
          })

          if (doctorError) {
            console.error("Doctor record error:", doctorError)
          }
        }

        // Create pharmacy records
        if (account.role === "pharmacy") {
          const { error: pharmacyError } = await supabaseAdmin.from("pharmacies").insert({
            id: authData.user.id,
            user_id: authData.user.id,
            license_number: `PH-16-${Math.floor(Math.random() * 10000)}`,
            name: account.name,
            name_ar: "صيدلية",
            phone: "+213550000000",
            email: account.email,
            wilaya_code: "16",
            city: "Alger",
            address: "123 Rue de la Liberté, Alger",
            is_on_duty: true,
            is_24h: false,
            has_delivery: true,
            is_verified: true,
            is_active: true,
            rating: 4.5,
            review_count: 50,
          })

          if (pharmacyError) {
            console.error("Pharmacy record error:", pharmacyError)
          }
        }
      }

      results.push({ email: account.email, success: true })
    }

    return NextResponse.json({ 
      message: "Seeding complete",
      password: password,
      results 
    })

  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
