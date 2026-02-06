/**
 * Section-to-permission mapping per business type.
 * Used to show only the sections each role can see (e.g. no lab tests in pharmacy).
 */

export type DashboardPerms = Record<string, boolean>

/** Pharmacy: section id -> permission keys; any true grants access */
export const PHARMACY_SECTION_PERMISSIONS: Record<string, string[]> = {
  overview: ['overview'],
  pos: ['pos'],
  prescriptions: ['prescriptions'],
  orders: ['orders'],
  messages: ['messages'],
  inventory: ['inventory'],
  warehouses: ['inventory'],
  'purchase-orders': ['orders', 'inventory'],
  chifa: ['chifa'],
  accounting: ['finances'],
  delivery: ['delivery'],
  analytics: ['analytics'],
  finances: ['finances'],
  settings: ['settings'],
}

/** Doctor: section id -> permission keys */
export const DOCTOR_SECTION_PERMISSIONS: Record<string, string[]> = {
  overview: ['overview'],
  patients: ['patients'],
  appointments: ['appointments'],
  messages: ['messages'],
  prescriptions: ['prescriptions'],
  'lab-requests': ['lab_requests'],
  analytics: ['analytics'],
  finances: ['finances'],
  documents: ['documents'],
  settings: ['settings'],
}

/** Lab: section id -> permission keys (no pharmacy sections) */
export const LAB_SECTION_PERMISSIONS: Record<string, string[]> = {
  overview: ['overview'],
  requests: ['requests', 'lab_requests'],
  patients: ['patients'],
  samples: ['samples'],
  results: ['results'],
  equipment: ['equipment'],
  analytics: ['analytics'],
  finances: ['finances'],
  documents: ['documents'],
  messages: ['messages'],
  settings: ['settings'],
}

/** Clinic: section id -> permission keys */
export const CLINIC_SECTION_PERMISSIONS: Record<string, string[]> = {
  overview: ['overview'],
  appointments: ['appointments'],
  patients: ['patients'],
  messages: ['messages'],
  analytics: ['analytics'],
  finances: ['finances'],
  settings: ['settings'],
}

const SECTION_MAP_BY_TYPE: Record<string, Record<string, string[]>> = {
  pharmacy: PHARMACY_SECTION_PERMISSIONS,
  doctor: DOCTOR_SECTION_PERMISSIONS,
  laboratory: LAB_SECTION_PERMISSIONS,
  clinic: CLINIC_SECTION_PERMISSIONS,
  ambulance: { overview: ['overview'], messages: ['messages'], settings: ['settings'] },
}

function canAccessSection(perms: DashboardPerms | null | undefined, sectionId: string, map: Record<string, string[]>): boolean {
  if (!perms) return true
  const keys = map[sectionId]
  if (!keys) return true
  return keys.some(k => perms[k] === true)
}

/**
 * Get the list of section IDs that should be visible for this professional type and employee permissions.
 * Used by sidebar and dashboard content to show only allowed sections.
 */
export function getVisibleSectionIds(
  professionalType: string,
  dashboardPerms: DashboardPerms | null | undefined
): string[] {
  const map = SECTION_MAP_BY_TYPE[professionalType] || DOCTOR_SECTION_PERMISSIONS
  const sectionIds = Object.keys(map)
  if (!dashboardPerms) return sectionIds
  return sectionIds.filter(id => canAccessSection(dashboardPerms, id, map))
}

/**
 * Check if the current section is allowed for this professional type and permissions.
 */
export function canAccessSectionForType(
  professionalType: string,
  dashboardPerms: DashboardPerms | null | undefined,
  sectionId: string
): boolean {
  const map = SECTION_MAP_BY_TYPE[professionalType] || DOCTOR_SECTION_PERMISSIONS
  return canAccessSection(dashboardPerms, sectionId, map)
}
