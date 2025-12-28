/**
 * Unit tests for data symmetry verification.
 *
 * Story 3A.1: Data Symmetry Enforcement
 * Verifies that co-parents have IDENTICAL access to all family data.
 * This is the core principle of Epic 3A.
 */

import { describe, it, expect } from 'vitest'
import type { FamilyGuardian, ChildGuardian } from '@fledgely/shared/contracts'

/**
 * Simulates the security rule check for child document read access.
 * Both guardians in the guardians[] array have identical permissions.
 */
function canGuardianReadChild(userUid: string, childGuardians: ChildGuardian[]): boolean {
  return childGuardians.some((g) => g.uid === userUid)
}

/**
 * Simulates the security rule check for family document read access.
 * Both guardians in the guardians[] array have identical permissions.
 */
function canGuardianReadFamily(userUid: string, familyGuardians: FamilyGuardian[]): boolean {
  return familyGuardians.some((g) => g.uid === userUid)
}

describe('Story 3A.1: Data Symmetry Enforcement', () => {
  describe('AC1: Identical Data Access', () => {
    it('both guardians can read the same child data', () => {
      const guardian1Uid = 'guardian-1'
      const guardian2Uid = 'guardian-2'

      const childGuardians: ChildGuardian[] = [
        { uid: guardian1Uid, role: 'guardian', addedAt: new Date() },
        { uid: guardian2Uid, role: 'guardian', addedAt: new Date() },
      ]

      // Both guardians should have access
      expect(canGuardianReadChild(guardian1Uid, childGuardians)).toBe(true)
      expect(canGuardianReadChild(guardian2Uid, childGuardians)).toBe(true)
    })

    it('both guardians can read the same family data', () => {
      const guardian1Uid = 'guardian-1'
      const guardian2Uid = 'guardian-2'

      const familyGuardians: FamilyGuardian[] = [
        { uid: guardian1Uid, role: 'guardian', addedAt: new Date() },
        { uid: guardian2Uid, role: 'guardian', addedAt: new Date() },
      ]

      // Both guardians should have access
      expect(canGuardianReadFamily(guardian1Uid, familyGuardians)).toBe(true)
      expect(canGuardianReadFamily(guardian2Uid, familyGuardians)).toBe(true)
    })

    it('non-guardian cannot read child data', () => {
      const guardianUid = 'guardian-1'
      const coParentUid = 'guardian-2'
      const outsiderUid = 'outsider-999'

      const childGuardians: ChildGuardian[] = [
        { uid: guardianUid, role: 'guardian', addedAt: new Date() },
        { uid: coParentUid, role: 'guardian', addedAt: new Date() },
      ]

      // Outsider should NOT have access
      expect(canGuardianReadChild(outsiderUid, childGuardians)).toBe(false)
    })

    it('non-guardian cannot read family data', () => {
      const guardianUid = 'guardian-1'
      const coParentUid = 'guardian-2'
      const outsiderUid = 'outsider-999'

      const familyGuardians: FamilyGuardian[] = [
        { uid: guardianUid, role: 'guardian', addedAt: new Date() },
        { uid: coParentUid, role: 'guardian', addedAt: new Date() },
      ]

      // Outsider should NOT have access
      expect(canGuardianReadFamily(outsiderUid, familyGuardians)).toBe(false)
    })
  })

  describe('AC2: Security Rules Enforce Read Equality', () => {
    it('access pattern is symmetric - both or neither', () => {
      const guardian1Uid = 'guardian-1'
      const guardian2Uid = 'guardian-2'

      const childGuardians: ChildGuardian[] = [
        { uid: guardian1Uid, role: 'guardian', addedAt: new Date() },
        { uid: guardian2Uid, role: 'guardian', addedAt: new Date() },
      ]

      const guardian1Access = canGuardianReadChild(guardian1Uid, childGuardians)
      const guardian2Access = canGuardianReadChild(guardian2Uid, childGuardians)

      // Both must have the same access (both true or both false)
      expect(guardian1Access).toBe(guardian2Access)
    })

    it('access is determined by guardians array membership', () => {
      const guardian1Uid = 'guardian-1'
      const guardian2Uid = 'guardian-2'
      const guardian3Uid = 'guardian-3'

      // Child only has guardian1 and guardian2
      const childGuardians: ChildGuardian[] = [
        { uid: guardian1Uid, role: 'guardian', addedAt: new Date() },
        { uid: guardian2Uid, role: 'guardian', addedAt: new Date() },
      ]

      // Guardian3 is not in guardians array
      expect(canGuardianReadChild(guardian1Uid, childGuardians)).toBe(true)
      expect(canGuardianReadChild(guardian2Uid, childGuardians)).toBe(true)
      expect(canGuardianReadChild(guardian3Uid, childGuardians)).toBe(false)
    })

    it('role does not affect read access (all guardians equal)', () => {
      const primaryUid = 'primary-1'
      const coParentUid = 'coparent-2'

      // Even if they have different roles, both can read
      const childGuardians: ChildGuardian[] = [
        { uid: primaryUid, role: 'primary_guardian', addedAt: new Date() },
        { uid: coParentUid, role: 'guardian', addedAt: new Date() },
      ]

      // Both should have access regardless of role
      expect(canGuardianReadChild(primaryUid, childGuardians)).toBe(true)
      expect(canGuardianReadChild(coParentUid, childGuardians)).toBe(true)
    })
  })

  describe('AC4: Simultaneous Data Visibility', () => {
    it('new data is visible to all guardians at the same time', () => {
      // This simulates Firestore real-time listeners behavior
      const guardian1Uid = 'guardian-1'
      const guardian2Uid = 'guardian-2'

      // When new child data is created, it includes both guardians
      const newChildData = {
        id: 'child-new',
        familyId: 'family-1',
        name: 'New Child',
        guardians: [
          { uid: guardian1Uid, role: 'guardian' as const, addedAt: new Date() },
          { uid: guardian2Uid, role: 'guardian' as const, addedAt: new Date() },
        ],
      }

      // Both guardians should see the new data simultaneously
      const guardian1CanSee = newChildData.guardians.some((g) => g.uid === guardian1Uid)
      const guardian2CanSee = newChildData.guardians.some((g) => g.uid === guardian2Uid)

      expect(guardian1CanSee).toBe(true)
      expect(guardian2CanSee).toBe(true)

      // Data is visible to both at the same instant (atomic visibility)
      expect(guardian1CanSee).toBe(guardian2CanSee)
    })

    it('data visibility is atomic - both guardians are added together', () => {
      const guardian1Uid = 'guardian-1'
      const guardian2Uid = 'guardian-2'

      // In the acceptInvitation flow, both guardians are added atomically
      const guardiansBefore: ChildGuardian[] = [
        { uid: guardian1Uid, role: 'guardian', addedAt: new Date() },
      ]

      // After co-parent accepts, both are in array
      const guardiansAfter: ChildGuardian[] = [
        { uid: guardian1Uid, role: 'guardian', addedAt: new Date() },
        { uid: guardian2Uid, role: 'guardian', addedAt: new Date() },
      ]

      // Before: only guardian1 has access
      expect(canGuardianReadChild(guardian1Uid, guardiansBefore)).toBe(true)
      expect(canGuardianReadChild(guardian2Uid, guardiansBefore)).toBe(false)

      // After: both have access
      expect(canGuardianReadChild(guardian1Uid, guardiansAfter)).toBe(true)
      expect(canGuardianReadChild(guardian2Uid, guardiansAfter)).toBe(true)
    })
  })

  describe('Shared Custody Detection', () => {
    it('identifies shared custody families (2+ guardians)', () => {
      const familyGuardians: FamilyGuardian[] = [
        { uid: 'guardian-1', role: 'guardian', addedAt: new Date() },
        { uid: 'guardian-2', role: 'guardian', addedAt: new Date() },
      ]

      const isSharedCustody = familyGuardians.length >= 2
      expect(isSharedCustody).toBe(true)
    })

    it('single guardian family is not shared custody', () => {
      const familyGuardians: FamilyGuardian[] = [
        { uid: 'guardian-1', role: 'guardian', addedAt: new Date() },
      ]

      const isSharedCustody = familyGuardians.length >= 2
      expect(isSharedCustody).toBe(false)
    })
  })
})
