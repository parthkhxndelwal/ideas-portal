/**
 * Email resolution with priority-based fallback
 */

import {
  isValidEmail,
  normalizeEmail,
  phoneToKrmuEmail,
  isPhoneNumberWithTwo,
} from "./utils.js"

/**
 * Resolve email for KRMU student
 * Priority: app email > payment email > phone number > derived @krmu.edu.in
 */
export async function resolveKrmuEmail(csvRecord, dbRegistration) {
  try {
    // Priority 1: Email from app registration
    if (dbRegistration?.email) {
      const email = normalizeEmail(dbRegistration.email)
      if (isValidEmail(email)) {
        return {
          email,
          source: "app",
          verified: true,
        }
      }
    }

    // Priority 2: Email from payment CSV
    if (csvRecord?.email) {
      const email = normalizeEmail(csvRecord.email)
      if (isValidEmail(email)) {
        return {
          email,
          source: "payment",
          verified: true,
        }
      }
    }

    // Priority 3: Convert phone number (starting with 2) to email
    if (csvRecord?.phone) {
      if (isPhoneNumberWithTwo(csvRecord.phone)) {
        const phoneEmail = phoneToKrmuEmail(csvRecord.phone)
        if (phoneEmail && isValidEmail(phoneEmail)) {
          return {
            email: phoneEmail,
            source: "phone",
            verified: false,
            warning: "Derived from phone number - not verified",
          }
        }
      }
    }

    // Priority 4: Derived @krmu.edu.in (if rollNumber exists)
    if (dbRegistration?.rollNumber) {
      const derivedEmail = `${dbRegistration.rollNumber}@krmu.edu.in`
      if (isValidEmail(derivedEmail)) {
        return {
          email: derivedEmail,
          source: "derived",
          verified: false,
          warning: "Derived from roll number - not verified",
        }
      }
    }

    return {
      email: null,
      error: "NO_VALID_EMAIL_FOUND",
    }
  } catch (error) {
    return {
      email: null,
      error: error.message,
    }
  }
}

/**
 * Resolve email for external student
 * Priority: app email > payment email
 */
export async function resolveExternalEmail(csvRecord, dbRegistration) {
  try {
    // Priority 1: Email from app registration
    if (dbRegistration?.email) {
      const email = normalizeEmail(dbRegistration.email)
      if (isValidEmail(email)) {
        return {
          email,
          source: "app",
          verified: true,
        }
      }
    }

    // Priority 2: Email from payment CSV
    if (csvRecord?.email) {
      const email = normalizeEmail(csvRecord.email)
      if (isValidEmail(email)) {
        return {
          email,
          source: "payment",
          verified: true,
        }
      }
    }

    return {
      email: null,
      error: "NO_VALID_EMAIL_FOUND",
    }
  } catch (error) {
    return {
      email: null,
      error: error.message,
    }
  }
}

/**
 * Resolve email based on student type
 */
export async function resolveEmail(csvRecord, dbRegistration, isKrmu) {
  if (isKrmu) {
    return await resolveKrmuEmail(csvRecord, dbRegistration)
  } else {
    return await resolveExternalEmail(csvRecord, dbRegistration)
  }
}

export default {
  resolveKrmuEmail,
  resolveExternalEmail,
  resolveEmail,
}
