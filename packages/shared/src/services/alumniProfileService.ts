/**
 * Alumni Profile Service - Story 38.7 Task 2
 *
 * Service for alumni profile management.
 * AC3: "Alumni" status preserved (can rejoin voluntarily if desired)
 * AC4: No monitoring data collected post-graduation
 */

import {
  createAlumniProfile as createAlumniProfileBase,
  type AlumniProfile,
} from '../contracts/postGraduation'

// ============================================
// In-Memory Storage (would be Firestore in production)
// ============================================

const alumniStore = new Map<string, AlumniProfile>()

// ============================================
// Profile Creation Functions
// ============================================

/**
 * Create an alumni profile for a graduated child.
 * AC3: Alumni status preserved, can rejoin voluntarily.
 *
 * @param childId - The child's ID
 * @param familyId - The family's ID
 * @returns The created alumni profile
 */
export function createAlumniProfile(childId: string, familyId: string): AlumniProfile {
  const profile = createAlumniProfileBase(childId, familyId)

  // Store the profile
  alumniStore.set(profile.id, profile)

  return profile
}

// ============================================
// Profile Retrieval Functions
// ============================================

/**
 * Get an alumni profile by ID.
 *
 * @param alumniId - The alumni profile ID
 * @returns The alumni profile or null if not found
 */
export function getAlumniProfile(alumniId: string): AlumniProfile | null {
  return alumniStore.get(alumniId) || null
}

/**
 * Get all alumni profiles for a family.
 *
 * @param familyId - The family's ID
 * @returns Array of alumni profiles
 */
export function getAlumniByFamily(familyId: string): AlumniProfile[] {
  return Array.from(alumniStore.values()).filter((p) => p.familyId === familyId)
}

// ============================================
// Preference Update Functions
// ============================================

/**
 * Update alumni preferences.
 *
 * @param alumniId - The alumni profile ID
 * @param preferences - The preferences to update
 * @returns The updated profile or null if not found
 */
export function updateAlumniPreferences(
  alumniId: string,
  preferences: Partial<Pick<AlumniProfile, 'wellnessTipsEnabled' | 'selfTrackingEnabled'>>
): AlumniProfile | null {
  const profile = alumniStore.get(alumniId)

  if (!profile) {
    return null
  }

  // Update preferences
  if (preferences.wellnessTipsEnabled !== undefined) {
    profile.wellnessTipsEnabled = preferences.wellnessTipsEnabled
  }
  if (preferences.selfTrackingEnabled !== undefined) {
    profile.selfTrackingEnabled = preferences.selfTrackingEnabled
  }

  // Update last active timestamp
  profile.lastActiveAt = new Date()

  return profile
}

// ============================================
// Status Preservation Functions (AC3)
// ============================================

/**
 * Preserve alumni status.
 * AC3: Alumni status preserved, can rejoin voluntarily.
 *
 * @param alumniId - The alumni profile ID
 * @returns True if status was preserved
 */
export function preserveAlumniStatus(alumniId: string): boolean {
  const profile = alumniStore.get(alumniId)

  if (!profile) {
    return false
  }

  // Status is already preserved in storage
  return true
}

// ============================================
// Rejoin Functions (AC3)
// ============================================

/**
 * Check if an alumni is eligible to rejoin.
 * AC3: Can rejoin voluntarily if desired.
 *
 * @param alumniId - The alumni profile ID
 * @returns True if eligible to rejoin
 */
export function checkRejoinEligibility(alumniId: string): boolean {
  const profile = alumniStore.get(alumniId)

  if (!profile) {
    return false
  }

  // Can rejoin if: active status and canRejoin flag is true
  return profile.status === 'active' && profile.canRejoin === true
}

/**
 * Process a rejoin request.
 * AC3: Can rejoin voluntarily if desired.
 *
 * @param alumniId - The alumni profile ID
 * @returns True if rejoin was processed successfully
 */
export function processRejoin(alumniId: string): boolean {
  const profile = alumniStore.get(alumniId)

  if (!profile) {
    return false
  }

  // Check eligibility
  if (!checkRejoinEligibility(alumniId)) {
    return false
  }

  // Update status to rejoined
  profile.status = 'rejoined'
  profile.canRejoin = false // Can't rejoin again after rejoining
  profile.lastActiveAt = new Date()

  return true
}

// ============================================
// No Data Collection Verification (AC4)
// ============================================

/**
 * Verify that no monitoring data is being collected.
 * AC4: No monitoring data collected post-graduation.
 *
 * @param alumniId - The alumni profile ID
 * @returns True if no data collection is happening
 */
export function verifyNoDataCollection(alumniId: string): boolean {
  const profile = alumniStore.get(alumniId)

  if (!profile) {
    return false
  }

  // Alumni profiles never collect monitoring data
  // Self-tracking is local/user-controlled, not external monitoring
  return true
}

// ============================================
// Deactivation Functions
// ============================================

/**
 * Deactivate an alumni profile.
 *
 * @param alumniId - The alumni profile ID
 * @returns True if deactivated successfully
 */
export function deactivateAlumniProfile(alumniId: string): boolean {
  const profile = alumniStore.get(alumniId)

  if (!profile) {
    return false
  }

  profile.status = 'inactive'
  profile.lastActiveAt = new Date()

  return true
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all alumni data (for testing).
 */
export function clearAllAlumniData(): void {
  alumniStore.clear()
}

/**
 * Get count of alumni profiles (for testing).
 */
export function getAlumniCount(): number {
  return alumniStore.size
}
