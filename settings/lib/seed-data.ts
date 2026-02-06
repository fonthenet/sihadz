import { createServerClient } from '@/lib/supabase/server'

export async function seedUserData(userId: string, userType: 'patient' | 'doctor' | 'pharmacist') {
  const supabase = await createServerClient()
  
  console.log('[v0] Seeding data for user:', userId, 'type:', userType)
  
  try {
    if (userType === 'patient') {
      await seedPatientData(supabase, userId)
    } else if (userType === 'doctor') {
      await seedDoctorData(supabase, userId)
    } else if (userType === 'pharmacist') {
      await seedPharmacistData(supabase, userId)
    }
    
    console.log('[v0] Seed data created successfully')
    return { success: true }
  } catch (error) {
    console.error('[v0] Error seeding data:', error)
    return { success: false, error }
  }
}

async function seedPatientData(supabase: any, userId: string) {
  // Get the user's profile to use their name
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  // Create family members
  const familyMembers = [
    {
      user_id: userId,
      full_name: 'Sarah Johnson',
      full_name_ar: 'سارة جونسون',
      relationship: 'spouse',
      gender: 'female',
      date_of_birth: '1992-05-15',
      blood_type: 'A+',
      chifa_number: '2845679012345',
      chronic_conditions: ['Asthma'],
      allergies: ['Penicillin']
    },
    {
      user_id: userId,
      full_name: 'Emma Johnson',
      full_name_ar: 'إيما جونسون',
      relationship: 'child',
      gender: 'female',
      date_of_birth: '2018-08-20',
      blood_type: 'A+',
      chifa_number: '2845679098765',
      chronic_conditions: [],
      allergies: []
    },
    {
      user_id: userId,
      full_name: 'Michael Johnson Sr.',
      full_name_ar: 'مايكل جونسون الأب',
      relationship: 'parent',
      gender: 'male',
      date_of_birth: '1960-03-10',
      blood_type: 'O+',
      chifa_number: '2845679011111',
      chronic_conditions: ['Diabetes', 'Hypertension'],
      allergies: ['Sulfa drugs']
    }
  ]
  
  const { data: family, error: familyError } = await supabase
    .from('family_members')
    .insert(familyMembers)
    .select()
  
  if (familyError) {
    console.error('[v0] Error creating family members:', familyError)
  }
  
  // Get some doctors for appointments
  const { data: doctors } = await supabase
    .from('doctors')
    .select('id, user_id, consultation_fee, e_visit_fee')
    .limit(3)
  
  if (doctors && doctors.length > 0) {
    // Create appointments
    const now = new Date()
    const appointments = [
      {
        patient_id: userId,
        doctor_id: doctors[0]?.id,
        appointment_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
        appointment_time: '10:00:00',
        visit_type: 'video',
        status: 'confirmed',
        consultation_fee: doctors[0]?.e_visit_fee || 3000,
        symptoms: 'Regular checkup and blood pressure monitoring',
        symptoms_ar: 'فحص دوري ومراقبة ضغط الدم',
        severity: 'mild',
        duration: '30',
        payment_status: 'paid',
        payment_method: 'card'
      },
      {
        patient_id: userId,
        doctor_id: doctors[1]?.id,
        appointment_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
        appointment_time: '14:30:00',
        visit_type: 'in-person',
        status: 'confirmed',
        consultation_fee: doctors[1]?.consultation_fee || 2500,
        symptoms: 'Dental cleaning and examination',
        symptoms_ar: 'تنظيف وفحص الأسنان',
        severity: 'mild',
        duration: '45',
        payment_status: 'pending',
        payment_method: 'cash'
      },
      {
        patient_id: userId,
        doctor_id: doctors[0]?.id,
        appointment_date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days ago
        appointment_time: '09:00:00',
        visit_type: 'in-person',
        status: 'completed',
        consultation_fee: doctors[0]?.consultation_fee || 3000,
        symptoms: 'Annual physical examination',
        symptoms_ar: 'الفحص الطبي السنوي',
        severity: 'mild',
        duration: '60',
        payment_status: 'paid',
        payment_method: 'chifa'
      }
    ]
    
    const { data: createdAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .insert(appointments)
      .select()
    
    if (appointmentsError) {
      console.error('[v0] Error creating appointments:', appointmentsError)
    }
    
    // Create a prescription for the completed appointment
    if (createdAppointments && createdAppointments.length > 0) {
      const completedApt = createdAppointments.find((apt: any) => apt.status === 'completed')
      if (completedApt && doctors[0]?.user_id) {
        const prescription = {
          patient_id: userId,
          doctor_id: doctors[0].id,
          appointment_id: completedApt.id,
          diagnosis: 'Mild Hypertension - Stage 1',
          diagnosis_ar: 'ارتفاع ضغط الدم الخفيف - المرحلة الأولى',
          status: 'active',
          is_chifa_eligible: true,
          valid_until: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          medications: [
            {
              name: 'Amlodipine 5mg',
              nameAr: 'أملوديبين 5 ملغ',
              dosage: '1 tablet',
              dosageAr: 'قرص واحد',
              frequency: 'Once daily',
              frequencyAr: 'مرة واحدة يومياً',
              duration: '30 days',
              durationAr: '30 يوماً',
              instructions: 'Take in the morning with water',
              instructionsAr: 'تناول في الصباح مع الماء'
            },
            {
              name: 'Vitamin D3 1000 IU',
              nameAr: 'فيتامين د3 1000 وحدة',
              dosage: '1 capsule',
              dosageAr: 'كبسولة واحدة',
              frequency: 'Once daily',
              frequencyAr: 'مرة واحدة يومياً',
              duration: '30 days',
              durationAr: '30 يوماً',
              instructions: 'Take with food',
              instructionsAr: 'تناول مع الطعام'
            }
          ],
          notes: 'Monitor blood pressure daily. Follow up in 4 weeks.',
          qr_code: `RX-${userId.substring(0, 8)}-${Date.now()}`
        }
        
        await supabase.from('prescriptions').insert(prescription)
      }
    }
  }
  
  // Create a document (Chifa card)
  const document = {
    user_id: userId,
    document_type: 'chifa_card',
    name: 'CNAS National Health Insurance Card',
    file_url: '/images/sample-chifa.jpg',
    mime_type: 'image/jpeg',
    file_size: 245678,
    is_verified: true,
    metadata: {
      number: '1234567890123',
      coverage: '80%'
    }
  }
  
  await supabase.from('documents').insert(document)
  
  // Create notifications
  const notifications = [
    {
      user_id: userId,
      type: 'appointment',
      title: 'Upcoming Appointment',
      title_ar: 'موعد قادم',
      message: 'You have an appointment in 2 days with your doctor',
      message_ar: 'لديك موعد خلال يومين مع طبيبك',
      is_read: false,
      action_url: '/dashboard/appointments'
    },
    {
      user_id: userId,
      type: 'prescription',
      title: 'New Prescription Available',
      title_ar: 'وصفة طبية جديدة متاحة',
      message: 'Your prescription from your recent visit is ready',
      message_ar: 'وصفتك الطبية من زيارتك الأخيرة جاهزة',
      is_read: false,
      action_url: '/dashboard/prescriptions'
    }
  ]
  
  await supabase.from('notifications').insert(notifications)
}

async function seedDoctorData(supabase: any, userId: string) {
  // Get the user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  // Create doctor profile
  const doctor = {
    user_id: userId,
    specialty: 'Cardiology',
    specialty_ar: 'طب القلب',
    specialty_fr: 'Cardiologie',
    license_number: `MD-${Math.floor(Math.random() * 1000000)}`,
    experience_years: 8,
    consultation_fee: 3500,
    e_visit_fee: 2500,
    supports_e_visit: true,
    supports_in_person: true,
    bio: 'Experienced cardiologist specializing in preventive care and heart disease management.',
    bio_ar: 'طبيب قلب متمرس متخصص في الرعاية الوقائية وإدارة أمراض القلب.',
    education: ['MD - University of Algiers', 'Cardiology Residency - CHU Mustapha', 'Board Certified Cardiologist'],
    wilaya_code: '16',
    city: 'Algiers',
    clinic_name: 'Heart Care Clinic',
    clinic_name_ar: 'عيادة العناية بالقلب',
    clinic_address: '123 Boulevard Mohamed V, Algiers',
    clinic_address_ar: '123 شارع محمد الخامس، الجزائر',
    clinic_phone: '+213 555 123 456',
    working_hours: {
      sunday: { open: '09:00', close: '17:00', isOpen: true },
      monday: { open: '09:00', close: '17:00', isOpen: true },
      tuesday: { open: '09:00', close: '17:00', isOpen: true },
      wednesday: { open: '09:00', close: '17:00', isOpen: true },
      thursday: { open: '09:00', close: '13:00', isOpen: true },
      friday: { open: '00:00', close: '00:00', isOpen: false },
      saturday: { open: '10:00', close: '14:00', isOpen: true }
    },
    rating: 4.8,
    review_count: 127,
    is_verified: true,
    is_active: true
  }
  
  const { data: doctorProfile, error: doctorError } = await supabase
    .from('doctors')
    .insert(doctor)
    .select()
    .single()
  
  if (doctorError) {
    console.error('[v0] Error creating doctor profile:', doctorError)
    return
  }
  
  // Get some patients for appointments
  const { data: patients } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_type', 'patient')
    .limit(3)
  
  if (patients && patients.length > 0) {
    const now = new Date()
    const appointments = [
      {
        patient_id: patients[0]?.id,
        doctor_id: doctorProfile.id,
        appointment_date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        appointment_time: '10:00:00',
        visit_type: 'in-person',
        status: 'confirmed',
        consultation_fee: doctor.consultation_fee,
        symptoms: 'Chest pain during exercise',
        symptoms_ar: 'ألم في الصدر أثناء ممارسة الرياضة',
        severity: 'moderate',
        duration: '30',
        payment_status: 'paid',
        payment_method: 'card'
      },
      {
        patient_id: patients[1]?.id,
        doctor_id: doctorProfile.id,
        appointment_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        appointment_time: '14:00:00',
        visit_type: 'video',
        status: 'confirmed',
        consultation_fee: doctor.e_visit_fee,
        symptoms: 'Follow-up consultation',
        symptoms_ar: 'استشارة متابعة',
        severity: 'mild',
        duration: '20',
        payment_status: 'pending',
        payment_method: 'cash'
      }
    ]
    
    await supabase.from('appointments').insert(appointments)
  }
  
  // Create notifications
  const notifications = [
    {
      user_id: userId,
      type: 'appointment',
      title: 'New Appointment Request',
      title_ar: 'طلب موعد جديد',
      message: 'You have a new appointment scheduled for tomorrow',
      message_ar: 'لديك موعد جديد مجدول لغداً',
      is_read: false,
      action_url: '/doctor/appointments'
    }
  ]
  
  await supabase.from('notifications').insert(notifications)
}

async function seedPharmacistData(supabase: any, userId: string) {
  // Get the user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  // Create pharmacy profile
  const pharmacy = {
    user_id: userId,
    name: 'Al-Shifa Pharmacy',
    name_ar: 'صيدلية الشفاء',
    license_number: `PH-${Math.floor(Math.random() * 1000000)}`,
    phone: '+213 555 987 654',
    email: profile?.email,
    wilaya_code: '16',
    city: 'Algiers',
    address: '456 Rue Didouche Mourad, Algiers',
    address_ar: '456 شارع ديدوش مراد، الجزائر',
    latitude: 36.7538,
    longitude: 3.0588,
    working_hours: {
      sunday: { open: '08:00', close: '20:00', isOpen: true },
      monday: { open: '08:00', close: '20:00', isOpen: true },
      tuesday: { open: '08:00', close: '20:00', isOpen: true },
      wednesday: { open: '08:00', close: '20:00', isOpen: true },
      thursday: { open: '08:00', close: '20:00', isOpen: true },
      friday: { open: '09:00', close: '18:00', isOpen: true },
      saturday: { open: '08:00', close: '20:00', isOpen: true }
    },
    has_delivery: true,
    is_24h: false,
    is_on_duty: true,
    rating: 4.6,
    review_count: 89,
    is_verified: true,
    is_active: true
  }
  
  const { data: pharmacyProfile, error: pharmacyError } = await supabase
    .from('pharmacies')
    .insert(pharmacy)
    .select()
    .single()
  
  if (pharmacyError) {
    console.error('[v0] Error creating pharmacy profile:', pharmacyError)
    return
  }
  
  // Get some prescriptions to fulfill
  const { data: prescriptions } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('status', 'active')
    .is('pharmacy_id', null)
    .limit(2)
  
  if (prescriptions && prescriptions.length > 0) {
    // Assign some prescriptions to this pharmacy
    for (const prescription of prescriptions) {
      await supabase
        .from('prescriptions')
        .update({ pharmacy_id: pharmacyProfile.id })
        .eq('id', prescription.id)
    }
  }
  
  // Create notifications
  const notifications = [
    {
      user_id: userId,
      type: 'prescription',
      title: 'New Prescription Orders',
      title_ar: 'طلبات وصفات طبية جديدة',
      message: 'You have new prescriptions waiting to be fulfilled',
      message_ar: 'لديك وصفات طبية جديدة في انتظار التنفيذ',
      is_read: false,
      action_url: '/pharmacy/prescriptions'
    }
  ]
  
  await supabase.from('notifications').insert(notifications)
}
