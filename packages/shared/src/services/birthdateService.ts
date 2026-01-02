/**
 * BirthdateService - Story 38.5 Task 2
 *
 * Service for managing child birthdates.
 * AC1: Child's birthdate is stored on file (FR72)
 */

import type { ChildBirthdate } from '../contracts/age18Deletion'
import {
  createChildBirthdate,
  isValidBirthdateForStorage,
  AGE_18_IN_YEARS,
} from '../contracts/age18Deletion'

// ============================================
// In-memory stores (would be replaced with database)
// ============================================

const birthdateStore: Map<string, ChildBirthdate> = new Map()

// ============================================
// Birthdate Management Functions (AC1)
// ============================================

/**
 * Set birthdate for a child.
 * AC1: Child's birthdate is stored on file (FR72)
 */
export function setBirthdate(childId: string, familyId: string, birthdate: Date): ChildBirthdate {
  // Validate birthdate
  if (!isValidBirthdateForStorage(birthdate)) {
    throw new Error('Invalid birthdate: must be a valid date in the past')
  }

  // Check if child already has birthdate
  if (birthdateStore.has(childId)) {
    throw new Error(`Birthdate already exists for child: ${childId}`)
  }

  const record = createChildBirthdate(childId, familyId, birthdate)
  birthdateStore.set(childId, record)
  return record
}

/**
 * Get birthdate for a child.
 */
export function getBirthdate(childId: string): ChildBirthdate | null {
  return birthdateStore.get(childId) || null
}

/**
 * Update birthdate for a child.
 */
export function updateBirthdate(childId: string, birthdate: Date): ChildBirthdate {
  const existing = birthdateStore.get(childId)
  if (!existing) {
    throw new Error(`Birthdate not found for child: ${childId}`)
  }

  // Validate new birthdate
  if (!isValidBirthdateForStorage(birthdate)) {
    throw new Error('Invalid birthdate: must be a valid date in the past')
  }

  const updated: ChildBirthdate = {
    ...existing,
    birthdate,
    updatedAt: new Date(),
  }

  birthdateStore.set(childId, updated)
  return updated
}

// ============================================
// Age Calculation Functions
// ============================================

/**
 * Calculate age in years from birthdate.
 * @param birthdate - The birthdate
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns Age in full years
 */
export function calculateAge(birthdate: Date, referenceDate: Date = new Date()): number {
  const today = new Date(referenceDate)
  const birth = new Date(birthdate)

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return Math.max(0, age)
}

/**
 * Get age in years and months.
 */
export function getAgeInYearsAndMonths(birthdate: Date): { years: number; months: number } {
  const today = new Date()
  const birth = new Date(birthdate)

  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()

  // Adjust if birthday hasn't occurred yet this year
  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
    years--
    months += 12
  }

  // Adjust months if day hasn't occurred yet this month
  if (today.getDate() < birth.getDate() && months > 0) {
    months--
  } else if (today.getDate() < birth.getDate() && months === 0) {
    // Already adjusted years, months is now 11
    months = 11
  }

  return { years: Math.max(0, years), months: Math.max(0, months % 12) }
}

// ============================================
// Age 18 Detection Functions
// ============================================

/**
 * Check if child is 18 or older.
 */
export function is18OrOlder(birthdate: Date): boolean {
  const age = calculateAge(birthdate)
  return age >= AGE_18_IN_YEARS
}

/**
 * Get days until child turns 18.
 * Returns 0 if child is already 18 or older.
 */
export function getDaysUntil18(birthdate: Date): number {
  if (is18OrOlder(birthdate)) {
    return 0
  }

  const eighteenthBirthday = get18thBirthdayDate(birthdate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  eighteenthBirthday.setHours(0, 0, 0, 0)

  const diffTime = eighteenthBirthday.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Get the date of child's 18th birthday.
 */
export function get18thBirthdayDate(birthdate: Date): Date {
  const eighteenthBirthday = new Date(birthdate)
  eighteenthBirthday.setFullYear(birthdate.getFullYear() + AGE_18_IN_YEARS)
  return eighteenthBirthday
}

// ============================================
// Validation Functions
// ============================================

/**
 * Check if birthdate is valid.
 * Re-export from contracts for convenience.
 */
export function isValidBirthdate(birthdate: Date): boolean {
  return isValidBirthdateForStorage(birthdate)
}

// ============================================
// Query Functions
// ============================================

/**
 * Get all stored birthdates.
 */
export function getAllBirthdates(): ChildBirthdate[] {
  return Array.from(birthdateStore.values())
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all stored birthdate data (for testing).
 */
export function clearAllBirthdateData(): void {
  birthdateStore.clear()
}
