/**
 * Algerian National & Islamic Holidays
 * 
 * Fixed holidays use Gregorian dates
 * Islamic holidays are calculated based on Hijri calendar (approximate, may vary by 1-2 days)
 */

export interface Holiday {
  name: string
  nameAr: string
  nameFr: string
  date: string // YYYY-MM-DD for fixed, or 'islamic' for calculated
  type: 'national' | 'islamic' | 'observance'
  isPublicHoliday: boolean
  days?: number // Duration (default 1)
}

// Fixed national holidays (same date every year)
export const FIXED_HOLIDAYS: Omit<Holiday, 'date'>[] = [
  {
    name: "New Year's Day",
    nameAr: "رأس السنة الميلادية",
    nameFr: "Jour de l'An",
    type: 'national',
    isPublicHoliday: true
  },
  {
    name: "Amazigh New Year (Yennayer)",
    nameAr: "يناير - رأس السنة الأمازيغية",
    nameFr: "Yennayer - Nouvel An Amazigh",
    type: 'national',
    isPublicHoliday: true
  },
  {
    name: "Labor Day",
    nameAr: "عيد العمال",
    nameFr: "Fête du Travail",
    type: 'national',
    isPublicHoliday: true
  },
  {
    name: "Independence Day",
    nameAr: "عيد الاستقلال",
    nameFr: "Fête de l'Indépendance",
    type: 'national',
    isPublicHoliday: true
  },
  {
    name: "Revolution Day",
    nameAr: "عيد الثورة",
    nameFr: "Anniversaire de la Révolution",
    type: 'national',
    isPublicHoliday: true
  }
]

// Fixed holiday dates (month-day)
export const FIXED_HOLIDAY_DATES: Record<string, string> = {
  "New Year's Day": "01-01",
  "Amazigh New Year (Yennayer)": "01-12",
  "Labor Day": "05-01",
  "Independence Day": "07-05",
  "Revolution Day": "11-01"
}

// Islamic holidays (calculated from Hijri calendar)
export const ISLAMIC_HOLIDAYS: Omit<Holiday, 'date'>[] = [
  {
    name: "Islamic New Year",
    nameAr: "رأس السنة الهجرية",
    nameFr: "Nouvel An Hégirien",
    type: 'islamic',
    isPublicHoliday: true
  },
  {
    name: "Ashura",
    nameAr: "عاشوراء",
    nameFr: "Achoura",
    type: 'islamic',
    isPublicHoliday: true,
    days: 2 // 9th and 10th Muharram
  },
  {
    name: "Mawlid (Prophet's Birthday)",
    nameAr: "المولد النبوي الشريف",
    nameFr: "Mawlid Ennabaoui",
    type: 'islamic',
    isPublicHoliday: true
  },
  {
    name: "Eid al-Fitr",
    nameAr: "عيد الفطر",
    nameFr: "Aïd el-Fitr",
    type: 'islamic',
    isPublicHoliday: true,
    days: 2
  },
  {
    name: "Eid al-Adha",
    nameAr: "عيد الأضحى",
    nameFr: "Aïd el-Adha",
    type: 'islamic',
    isPublicHoliday: true,
    days: 2
  }
]

// Hijri month/day for Islamic holidays
export const ISLAMIC_HOLIDAY_HIJRI: Record<string, { month: number; day: number }> = {
  "Islamic New Year": { month: 1, day: 1 },        // 1 Muharram
  "Ashura": { month: 1, day: 10 },                 // 10 Muharram
  "Mawlid (Prophet's Birthday)": { month: 3, day: 12 }, // 12 Rabi' al-Awwal
  "Eid al-Fitr": { month: 10, day: 1 },            // 1 Shawwal
  "Eid al-Adha": { month: 12, day: 10 }            // 10 Dhu al-Hijjah
}

/**
 * Hijri to Gregorian conversion (approximate algorithm)
 * Note: Islamic calendar is lunar and actual dates may vary by 1-2 days
 * based on moon sighting. This is an approximation.
 */
function hijriToGregorian(hijriYear: number, hijriMonth: number, hijriDay: number): Date {
  // Approximate conversion using the Kuwaiti algorithm
  const jd = Math.floor((11 * hijriYear + 3) / 30) + 
             354 * hijriYear + 
             30 * hijriMonth - 
             Math.floor((hijriMonth - 1) / 2) + 
             hijriDay + 1948440 - 385
  
  // Julian Day to Gregorian
  const l = jd + 68569
  const n = Math.floor(4 * l / 146097)
  const l2 = l - Math.floor((146097 * n + 3) / 4)
  const i = Math.floor(4000 * (l2 + 1) / 1461001)
  const l3 = l2 - Math.floor(1461 * i / 4) + 31
  const j = Math.floor(80 * l3 / 2447)
  const day = l3 - Math.floor(2447 * j / 80)
  const l4 = Math.floor(j / 11)
  const month = j + 2 - 12 * l4
  const year = 100 * (n - 49) + i + l4
  
  return new Date(year, month - 1, day)
}

/**
 * Get the Hijri year for a given Gregorian year
 * Approximate calculation
 */
function getHijriYear(gregorianYear: number): number {
  return Math.floor((gregorianYear - 622) * (33 / 32)) + 1
}

/**
 * Get all holidays for a specific Gregorian year
 */
export function getHolidaysForYear(year: number): Holiday[] {
  const holidays: Holiday[] = []
  
  // Add fixed holidays
  for (const holiday of FIXED_HOLIDAYS) {
    const dateStr = FIXED_HOLIDAY_DATES[holiday.name]
    if (dateStr) {
      holidays.push({
        ...holiday,
        date: `${year}-${dateStr}`
      })
    }
  }
  
  // Calculate Islamic holidays
  const hijriYear = getHijriYear(year)
  
  // Check both current and next Hijri year (Islamic year spans two Gregorian years)
  for (const hijriYr of [hijriYear, hijriYear + 1]) {
    for (const holiday of ISLAMIC_HOLIDAYS) {
      const hijriDate = ISLAMIC_HOLIDAY_HIJRI[holiday.name]
      if (hijriDate) {
        const gregorianDate = hijriToGregorian(hijriYr, hijriDate.month, hijriDate.day)
        
        // Only include if the date falls within the requested year
        if (gregorianDate.getFullYear() === year) {
          const dateStr = gregorianDate.toISOString().split('T')[0]
          
          // Add main day
          holidays.push({
            ...holiday,
            date: dateStr
          })
          
          // Add additional days for multi-day holidays
          if (holiday.days && holiday.days > 1) {
            for (let d = 1; d < holiday.days; d++) {
              const nextDay = new Date(gregorianDate)
              nextDay.setDate(nextDay.getDate() + d)
              if (nextDay.getFullYear() === year) {
                holidays.push({
                  ...holiday,
                  name: `${holiday.name} (Day ${d + 1})`,
                  date: nextDay.toISOString().split('T')[0]
                })
              }
            }
          }
        }
      }
    }
  }
  
  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get holidays for a specific month
 */
export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const allHolidays = getHolidaysForYear(year)
  const monthStr = String(month).padStart(2, '0')
  const prefix = `${year}-${monthStr}`
  
  return allHolidays.filter(h => h.date.startsWith(prefix))
}

/**
 * Check if a specific date is a public holiday
 */
export function isPublicHoliday(date: string): Holiday | null {
  const year = parseInt(date.substring(0, 4))
  const holidays = getHolidaysForYear(year)
  return holidays.find(h => h.date === date && h.isPublicHoliday) || null
}

/**
 * Get all public holiday dates for a year as a Set for fast lookup
 */
export function getPublicHolidayDates(year: number): Set<string> {
  const holidays = getHolidaysForYear(year)
  return new Set(holidays.filter(h => h.isPublicHoliday).map(h => h.date))
}

/**
 * Ramadan dates (approximate - actual dates depend on moon sighting)
 * Format: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 */
export const RAMADAN_DATES: Record<number, { start: string; end: string }> = {
  2024: { start: '2024-03-11', end: '2024-04-09' },
  2025: { start: '2025-02-28', end: '2025-03-29' },
  2026: { start: '2026-02-17', end: '2026-03-19' },
  2027: { start: '2027-02-07', end: '2027-03-08' },
  2028: { start: '2028-01-27', end: '2028-02-25' },
  2029: { start: '2029-01-15', end: '2029-02-13' },
  2030: { start: '2030-01-05', end: '2030-02-03' }
}

/**
 * Check if a date falls within Ramadan
 */
export function isRamadan(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const dateStr = d.toISOString().split('T')[0]
  
  // Check current year and potentially next/previous year (Ramadan can span years)
  for (const y of [year - 1, year, year + 1]) {
    const ramadan = RAMADAN_DATES[y]
    if (ramadan && dateStr >= ramadan.start && dateStr <= ramadan.end) {
      return true
    }
  }
  return false
}

/**
 * Get Ramadan info for a specific year
 */
export function getRamadanForYear(year: number): { start: string; end: string } | null {
  return RAMADAN_DATES[year] || null
}

/**
 * Get days remaining in Ramadan from a specific date
 */
export function getDaysRemainingInRamadan(date: string | Date): number | null {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const dateStr = d.toISOString().split('T')[0]
  
  for (const y of [year - 1, year, year + 1]) {
    const ramadan = RAMADAN_DATES[y]
    if (ramadan && dateStr >= ramadan.start && dateStr <= ramadan.end) {
      const endDate = new Date(ramadan.end)
      const diffTime = endDate.getTime() - d.getTime()
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }
  }
  return null
}

export interface RamadanSchedule {
  enabled: boolean
  workingHours: Record<string, { open: string; close: string; isOpen: boolean }>
}

/**
 * Default Ramadan working hours for Algeria (shorter hours)
 */
export const DEFAULT_RAMADAN_SCHEDULE: Record<string, { open: string; close: string; isOpen: boolean }> = {
  sunday: { open: '09:00', close: '15:00', isOpen: true },
  monday: { open: '09:00', close: '15:00', isOpen: true },
  tuesday: { open: '09:00', close: '15:00', isOpen: true },
  wednesday: { open: '09:00', close: '15:00', isOpen: true },
  thursday: { open: '09:00', close: '15:00', isOpen: true },
  friday: { open: '09:00', close: '12:00', isOpen: true }, // Friday shorter for Jumu'ah
  saturday: { open: '09:00', close: '14:00', isOpen: true }
}

/**
 * Pre-calculated Islamic holidays for 2024-2030 (more accurate than algorithm)
 * These are approximate dates - actual dates depend on moon sighting
 */
export const PRECALCULATED_ISLAMIC_HOLIDAYS: Record<number, Record<string, string>> = {
  2024: {
    "Islamic New Year": "2024-07-07",
    "Ashura": "2024-07-17",
    "Mawlid (Prophet's Birthday)": "2024-09-16",
    "Eid al-Fitr": "2024-04-10",
    "Eid al-Adha": "2024-06-17"
  },
  2025: {
    "Islamic New Year": "2025-06-26",
    "Ashura": "2025-07-06",
    "Mawlid (Prophet's Birthday)": "2025-09-05",
    "Eid al-Fitr": "2025-03-30",
    "Eid al-Adha": "2025-06-06"
  },
  2026: {
    "Islamic New Year": "2026-06-16",
    "Ashura": "2026-06-26",
    "Mawlid (Prophet's Birthday)": "2026-08-25",
    "Eid al-Fitr": "2026-03-20",
    "Eid al-Adha": "2026-05-27"
  },
  2027: {
    "Islamic New Year": "2027-06-06",
    "Ashura": "2027-06-16",
    "Mawlid (Prophet's Birthday)": "2027-08-15",
    "Eid al-Fitr": "2027-03-09",
    "Eid al-Adha": "2027-05-16"
  },
  2028: {
    "Islamic New Year": "2028-05-25",
    "Ashura": "2028-06-04",
    "Mawlid (Prophet's Birthday)": "2028-08-03",
    "Eid al-Fitr": "2028-02-26",
    "Eid al-Adha": "2028-05-04"
  },
  2029: {
    "Islamic New Year": "2029-05-14",
    "Ashura": "2029-05-24",
    "Mawlid (Prophet's Birthday)": "2029-07-24",
    "Eid al-Fitr": "2029-02-14",
    "Eid al-Adha": "2029-04-23"
  },
  2030: {
    "Islamic New Year": "2030-05-03",
    "Ashura": "2030-05-13",
    "Mawlid (Prophet's Birthday)": "2030-07-13",
    "Eid al-Fitr": "2030-02-04",
    "Eid al-Adha": "2030-04-13"
  }
}

/**
 * Get holidays using pre-calculated dates when available
 */
export function getAccurateHolidaysForYear(year: number): Holiday[] {
  const holidays: Holiday[] = []
  
  // Add fixed holidays
  for (const holiday of FIXED_HOLIDAYS) {
    const dateStr = FIXED_HOLIDAY_DATES[holiday.name]
    if (dateStr) {
      holidays.push({
        ...holiday,
        date: `${year}-${dateStr}`
      })
    }
  }
  
  // Use pre-calculated dates if available
  const precalc = PRECALCULATED_ISLAMIC_HOLIDAYS[year]
  
  for (const holiday of ISLAMIC_HOLIDAYS) {
    let dateStr: string
    
    if (precalc && precalc[holiday.name]) {
      dateStr = precalc[holiday.name]
    } else {
      // Fall back to calculated dates
      const hijriYear = getHijriYear(year)
      const hijriDate = ISLAMIC_HOLIDAY_HIJRI[holiday.name]
      if (!hijriDate) continue
      
      const gregorianDate = hijriToGregorian(hijriYear, hijriDate.month, hijriDate.day)
      if (gregorianDate.getFullYear() !== year) continue
      
      dateStr = gregorianDate.toISOString().split('T')[0]
    }
    
    // Add main day
    holidays.push({
      ...holiday,
      date: dateStr
    })
    
    // Add additional days for multi-day holidays
    if (holiday.days && holiday.days > 1) {
      const mainDate = new Date(dateStr)
      for (let d = 1; d < holiday.days; d++) {
        const nextDay = new Date(mainDate)
        nextDay.setDate(nextDay.getDate() + d)
        holidays.push({
          ...holiday,
          name: `${holiday.name} (Day ${d + 1})`,
          date: nextDay.toISOString().split('T')[0]
        })
      }
    }
  }
  
  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}
