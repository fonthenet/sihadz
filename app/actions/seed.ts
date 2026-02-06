'use server'

/** Disabled: fake seed data (family members, appointments, etc.) has been removed. */
export async function seedNewUserData(_userId: string, _userType: 'patient' | 'doctor' | 'pharmacist') {
  return { success: false, error: 'Seed data is disabled. Use the app to add real data.' }
}
