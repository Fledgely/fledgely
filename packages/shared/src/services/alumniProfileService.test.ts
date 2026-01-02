/**
 * Alumni Profile Service Tests - Story 38.7 Task 2
 *
 * Tests for alumni profile management.
 * AC3: "Alumni" status preserved (can rejoin voluntarily if desired)
 * AC4: No monitoring data collected post-graduation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createAlumniProfile,
  getAlumniProfile,
  updateAlumniPreferences,
  preserveAlumniStatus,
  checkRejoinEligibility,
  processRejoin,
  verifyNoDataCollection,
  deactivateAlumniProfile,
  getAlumniByFamily,
  clearAllAlumniData,
  getAlumniCount,
} from './alumniProfileService'

describe('AlumniProfileService', () => {
  beforeEach(() => {
    clearAllAlumniData()
  })

  // ============================================
  // Profile Creation Tests
  // ============================================

  describe('createAlumniProfile', () => {
    it('should create alumni profile for graduated child', () => {
      const profile = createAlumniProfile('child-123', 'family-456')

      expect(profile).not.toBeNull()
      expect(profile.childId).toBe('child-123')
      expect(profile.familyId).toBe('family-456')
      expect(profile.status).toBe('active')
    })

    it('should set default preferences', () => {
      const profile = createAlumniProfile('child-123', 'family-456')

      expect(profile.wellnessTipsEnabled).toBe(true)
      expect(profile.selfTrackingEnabled).toBe(false)
      expect(profile.canRejoin).toBe(true)
    })

    it('should set graduation date', () => {
      const before = new Date()
      const profile = createAlumniProfile('child-123', 'family-456')
      const after = new Date()

      expect(profile.graduatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(profile.graduatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should generate unique IDs', () => {
      const profile1 = createAlumniProfile('child-1', 'family-1')
      const profile2 = createAlumniProfile('child-2', 'family-2')

      expect(profile1.id).not.toBe(profile2.id)
    })

    it('should store profile for retrieval', () => {
      const created = createAlumniProfile('child-123', 'family-456')
      const retrieved = getAlumniProfile(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created.id)
    })
  })

  // ============================================
  // Profile Retrieval Tests
  // ============================================

  describe('getAlumniProfile', () => {
    it('should retrieve existing profile', () => {
      const created = createAlumniProfile('child-123', 'family-456')
      const retrieved = getAlumniProfile(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved!.childId).toBe('child-123')
    })

    it('should return null for non-existent profile', () => {
      const profile = getAlumniProfile('non-existent')
      expect(profile).toBeNull()
    })
  })

  // ============================================
  // Preference Updates Tests
  // ============================================

  describe('updateAlumniPreferences', () => {
    it('should update wellness tips preference', () => {
      const profile = createAlumniProfile('child-123', 'family-456')

      const updated = updateAlumniPreferences(profile.id, { wellnessTipsEnabled: false })

      expect(updated).not.toBeNull()
      expect(updated!.wellnessTipsEnabled).toBe(false)
    })

    it('should update self-tracking preference', () => {
      const profile = createAlumniProfile('child-123', 'family-456')

      const updated = updateAlumniPreferences(profile.id, { selfTrackingEnabled: true })

      expect(updated).not.toBeNull()
      expect(updated!.selfTrackingEnabled).toBe(true)
    })

    it('should update lastActiveAt', () => {
      const profile = createAlumniProfile('child-123', 'family-456')

      const before = new Date()
      const updated = updateAlumniPreferences(profile.id, { wellnessTipsEnabled: true })
      const after = new Date()

      expect(updated!.lastActiveAt!.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(updated!.lastActiveAt!.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should return null for non-existent profile', () => {
      const updated = updateAlumniPreferences('non-existent', { wellnessTipsEnabled: false })
      expect(updated).toBeNull()
    })
  })

  // ============================================
  // Alumni Status Preservation Tests (AC3)
  // ============================================

  describe('preserveAlumniStatus (AC3)', () => {
    it('should preserve active status', () => {
      const profile = createAlumniProfile('child-123', 'family-456')

      const preserved = preserveAlumniStatus(profile.id)

      expect(preserved).toBe(true)
      const retrieved = getAlumniProfile(profile.id)
      expect(retrieved!.status).toBe('active')
    })

    it('should keep canRejoin flag intact', () => {
      const profile = createAlumniProfile('child-123', 'family-456')

      preserveAlumniStatus(profile.id)

      const retrieved = getAlumniProfile(profile.id)
      expect(retrieved!.canRejoin).toBe(true)
    })

    it('should return false for non-existent profile', () => {
      const result = preserveAlumniStatus('non-existent')
      expect(result).toBe(false)
    })
  })

  // ============================================
  // Rejoin Eligibility Tests (AC3)
  // ============================================

  describe('checkRejoinEligibility (AC3)', () => {
    it('should return true for active alumni with canRejoin', () => {
      const profile = createAlumniProfile('child-123', 'family-456')

      const eligible = checkRejoinEligibility(profile.id)
      expect(eligible).toBe(true)
    })

    it('should return false for already rejoined alumni', () => {
      const profile = createAlumniProfile('child-123', 'family-456')
      processRejoin(profile.id)

      const eligible = checkRejoinEligibility(profile.id)
      expect(eligible).toBe(false)
    })

    it('should return false for inactive alumni', () => {
      const profile = createAlumniProfile('child-123', 'family-456')
      deactivateAlumniProfile(profile.id)

      const eligible = checkRejoinEligibility(profile.id)
      expect(eligible).toBe(false)
    })

    it('should return false for non-existent profile', () => {
      const eligible = checkRejoinEligibility('non-existent')
      expect(eligible).toBe(false)
    })
  })

  // ============================================
  // Rejoin Process Tests (AC3)
  // ============================================

  describe('processRejoin (AC3)', () => {
    it('should mark alumni as rejoined', () => {
      const profile = createAlumniProfile('child-123', 'family-456')

      const result = processRejoin(profile.id)

      expect(result).toBe(true)
      const updated = getAlumniProfile(profile.id)
      expect(updated!.status).toBe('rejoined')
    })

    it('should set canRejoin to false after rejoining', () => {
      const profile = createAlumniProfile('child-123', 'family-456')
      processRejoin(profile.id)

      const updated = getAlumniProfile(profile.id)
      expect(updated!.canRejoin).toBe(false)
    })

    it('should return false for non-eligible alumni', () => {
      const profile = createAlumniProfile('child-123', 'family-456')
      deactivateAlumniProfile(profile.id)

      const result = processRejoin(profile.id)
      expect(result).toBe(false)
    })

    it('should return false for non-existent profile', () => {
      const result = processRejoin('non-existent')
      expect(result).toBe(false)
    })
  })

  // ============================================
  // No Data Collection Tests (AC4)
  // ============================================

  describe('verifyNoDataCollection (AC4)', () => {
    it('should return true - alumni profiles do not collect monitoring data', () => {
      const profile = createAlumniProfile('child-123', 'family-456')

      const result = verifyNoDataCollection(profile.id)
      expect(result).toBe(true)
    })

    it('should return true even when self-tracking enabled', () => {
      const profile = createAlumniProfile('child-123', 'family-456')
      updateAlumniPreferences(profile.id, { selfTrackingEnabled: true })

      // Self-tracking is local, not monitoring
      const result = verifyNoDataCollection(profile.id)
      expect(result).toBe(true)
    })

    it('should return false for non-existent profile', () => {
      const result = verifyNoDataCollection('non-existent')
      expect(result).toBe(false)
    })
  })

  // ============================================
  // Deactivation Tests
  // ============================================

  describe('deactivateAlumniProfile', () => {
    it('should set status to inactive', () => {
      const profile = createAlumniProfile('child-123', 'family-456')

      const result = deactivateAlumniProfile(profile.id)

      expect(result).toBe(true)
      const updated = getAlumniProfile(profile.id)
      expect(updated!.status).toBe('inactive')
    })

    it('should return false for non-existent profile', () => {
      const result = deactivateAlumniProfile('non-existent')
      expect(result).toBe(false)
    })
  })

  // ============================================
  // Family Query Tests
  // ============================================

  describe('getAlumniByFamily', () => {
    it('should return all alumni for a family', () => {
      createAlumniProfile('child-1', 'family-123')
      createAlumniProfile('child-2', 'family-123')
      createAlumniProfile('child-3', 'family-other')

      const alumni = getAlumniByFamily('family-123')

      expect(alumni).toHaveLength(2)
    })

    it('should return empty array for family with no alumni', () => {
      const alumni = getAlumniByFamily('family-none')
      expect(alumni).toHaveLength(0)
    })
  })

  // ============================================
  // Testing Utilities
  // ============================================

  describe('Testing Utilities', () => {
    it('should clear all data', () => {
      createAlumniProfile('child-1', 'family-1')
      createAlumniProfile('child-2', 'family-2')

      clearAllAlumniData()

      expect(getAlumniCount()).toBe(0)
    })

    it('should count alumni profiles', () => {
      expect(getAlumniCount()).toBe(0)

      createAlumniProfile('child-1', 'family-1')
      expect(getAlumniCount()).toBe(1)

      createAlumniProfile('child-2', 'family-2')
      expect(getAlumniCount()).toBe(2)
    })
  })
})
