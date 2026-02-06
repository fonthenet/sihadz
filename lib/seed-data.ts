/**
 * DISABLED: Fake/seed data has been removed from the platform.
 * No auto-generated or demo data is added to new accounts.
 * Use the app to add real data only.
 */

export async function seedUserData(
  _userId: string,
  _userType: 'patient' | 'doctor' | 'pharmacist'
) {
  return { success: false, error: 'Seed data is disabled.' }
}
