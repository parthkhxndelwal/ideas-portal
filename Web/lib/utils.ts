import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * List of valid Top-Level Domains (TLDs) for email validation
 * Includes common TLDs and country-code TLDs
 */
const VALID_TLDS = [
  // Generic TLDs
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
  'info', 'biz', 'name', 'mobi', 'pro', 'travel', 'museum',
  'coop', 'aero', 'asia', 'cat', 'jobs', 'tel', 'xxx',
  
  // New generic TLDs
  'app', 'blog', 'cloud', 'dev', 'email', 'online', 'site',
  'store', 'tech', 'web', 'website', 'ai', 'io', 'co',
  
  // Country code TLDs (most common)
  'ac', 'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az',
  'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bm', 'bn', 'bo', 'br', 'bs', 'bt', 'bw', 'by', 'bz',
  'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz',
  'de', 'dj', 'dk', 'dm', 'do', 'dz',
  'ec', 'ee', 'eg', 'er', 'es', 'et', 'eu',
  'fi', 'fj', 'fk', 'fm', 'fo', 'fr',
  'ga', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy',
  'hk', 'hm', 'hn', 'hr', 'ht', 'hu',
  'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it',
  'je', 'jm', 'jo', 'jp',
  'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz',
  'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly',
  'ma', 'mc', 'md', 'me', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz',
  'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz',
  'om',
  'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py',
  'qa',
  're', 'ro', 'rs', 'ru', 'rw',
  'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'su', 'sv', 'sx', 'sy', 'sz',
  'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv', 'tw', 'tz',
  'ua', 'ug', 'uk', 'us', 'uy', 'uz',
  'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu',
  'wf', 'ws',
  'ye', 'yt',
  'za', 'zm', 'zw'
]

/**
 * Validates an email address with comprehensive TLD checking
 * @param email - The email address to validate
 * @returns An object with isValid boolean and optional error message
 */
export function validateEmailWithTLD(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' }
  }

  // Trim whitespace
  email = email.trim()

  // Basic format check
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!basicEmailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' }
  }

  // Split email into parts
  const [localPart, domain] = email.split('@')
  
  if (!localPart || !domain) {
    return { isValid: false, error: 'Invalid email format' }
  }

  // Check for consecutive dots
  if (domain.includes('..')) {
    return { isValid: false, error: 'Invalid domain format' }
  }

  // Extract TLD (everything after the last dot)
  const parts = domain.split('.')
  if (parts.length < 2) {
    return { isValid: false, error: 'Email must have a valid domain' }
  }

  const tld = parts[parts.length - 1].toLowerCase()
  
  // Check if TLD is valid
  if (!VALID_TLDS.includes(tld)) {
    return { isValid: false, error: 'Invalid email domain. Please use a valid email address with a recognized domain extension (e.g., .com, .edu, .in)' }
  }

  // Additional validation: check local part
  if (localPart.length > 64) {
    return { isValid: false, error: 'Email username is too long' }
  }

  // Check for invalid characters in local part
  const invalidCharsRegex = /[<>()[\]\\,;:\s]/
  if (invalidCharsRegex.test(localPart)) {
    return { isValid: false, error: 'Email contains invalid characters' }
  }

  return { isValid: true }
}

/**
 * Calculates the academic year based on semester number
 * @param semester - The semester number (1, 2, 3, 4, etc.)
 * @returns The calculated year as a string, or empty string if invalid
 */
export function calculateYearFromSemester(semester: number): string {
  if (!semester || semester < 1) {
    return ""
  }
  // Semesters 1-2 = Year 1, 3-4 = Year 2, 5-6 = Year 3, etc.
  return Math.ceil(semester / 2).toString()
}

/**
 * Extracts semester number from courseAndSemester string and calculates year
 * @param courseAndSemester - String like "B.Tech CSE 5" where 5 is the semester
 * @returns The calculated year as a string, or empty string if not found
 */
export function calculateYearFromCourseAndSemester(courseAndSemester: string): string {
  if (!courseAndSemester) {
    return ""
  }
  
  // Extract semester number from the end of the string
  const semesterMatch = courseAndSemester.match(/(\d+)$/)
  if (semesterMatch) {
    const semester = parseInt(semesterMatch[1], 10)
    return calculateYearFromSemester(semester)
  }
  
  return ""
}
