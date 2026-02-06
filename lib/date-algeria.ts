/**
 * Algeria date and time formatting.
 * Always uses timezone Africa/Algiers and Algeria locales (ar-DZ, fr-DZ).
 */

export const ALGERIA_TZ = 'Africa/Algiers'

export type AlgeriaLang = 'ar' | 'fr' | 'en'

export function getAlgeriaLocale(lang: AlgeriaLang): string {
  if (lang === 'ar') return 'ar-DZ'
  if (lang === 'fr') return 'fr-DZ'
  return 'en-GB' // en with Algeria TZ for consistent formatting
}

const defaultOptions = { timeZone: ALGERIA_TZ } as const

/** Format a date in Algeria timezone with locale (date only). */
export function formatDateAlgeria(
  date: Date,
  lang: AlgeriaLang = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = getAlgeriaLocale(lang)
  return date.toLocaleDateString(locale, { ...defaultOptions, ...options })
}

/** Format time in Algeria timezone. */
export function formatTimeAlgeria(
  date: Date,
  lang: AlgeriaLang = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = getAlgeriaLocale(lang)
  return date.toLocaleTimeString(locale, {
    ...defaultOptions,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  })
}

/** Format date and time in Algeria timezone. */
export function formatDateTimeAlgeria(
  date: Date,
  lang: AlgeriaLang = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = getAlgeriaLocale(lang)
  return date.toLocaleString(locale, { ...defaultOptions, ...options })
}

/** Parse DB date (string or Date) as local calendar date to avoid -1 day in other timezones. */
export function parseDateOnlyAsLocal(
  value: string | Date | null | undefined
): Date | null {
  if (value == null) return null
  let y: number, m: number, d: number
  if (typeof value === 'string') {
    const part = value.split('T')[0]
    const parts = part.split('-').map(Number)
    if (parts.length !== 3) return null
    ;[y, m, d] = parts
  } else {
    const date = value as Date
    y = date.getUTCFullYear()
    m = date.getUTCMonth() + 1
    d = date.getUTCDate()
  }
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function toDateOnlyString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
