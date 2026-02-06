'use server'

import { seedUserData } from '@/lib/seed-data'

export async function seedNewUserData(userId: string, userType: 'patient' | 'doctor' | 'pharmacist') {
  return await seedUserData(userId, userType)
}
