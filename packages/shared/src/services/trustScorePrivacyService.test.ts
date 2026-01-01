/**
 * TrustScorePrivacyService Tests - Story 36.6 Task 1
 *
 * Tests for trust score privacy rules.
 * AC1: Each child sees only their own score
 * AC2: Parents see each child's score separately
 * AC3: Siblings cannot compare scores
 */

import { describe, it, expect } from 'vitest'
import {
  canViewTrustScore,
  getViewableTrustScores,
  isParentViewer,
  type FamilyMember,
  type ViewerRole,
} from './trustScorePrivacyService'

// Test data
const createFamilyMember = (
  id: string,
  role: ViewerRole,
  familyId: string = 'family-123'
): FamilyMember => ({
  id,
  role,
  familyId,
})

describe('TrustScorePrivacyService - Story 36.6 Task 1', () => {
  describe('AC1: Each child sees only their own score', () => {
    it('should allow child to view their own score', () => {
      const child = createFamilyMember('child-1', 'child')

      const result = canViewTrustScore('child-1', 'child-1', [child])

      expect(result.canView).toBe(true)
    })

    it('should deny child from viewing sibling score', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')

      const result = canViewTrustScore('child-1', 'child-2', [child1, child2])

      expect(result.canView).toBe(false)
    })

    it('should provide reason when access denied', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')

      const result = canViewTrustScore('child-1', 'child-2', [child1, child2])

      expect(result.reason).toBeDefined()
      expect(result.reason).toMatch(/privacy|own/i)
    })

    it('should return only own ID for child viewer', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')
      const parent = createFamilyMember('parent-1', 'parent')

      const viewable = getViewableTrustScores('child-1', [child1, child2, parent])

      expect(viewable).toEqual(['child-1'])
    })
  })

  describe('AC2: Parents see each child score separately', () => {
    it('should allow parent to view any child score', () => {
      const parent = createFamilyMember('parent-1', 'parent')
      const child = createFamilyMember('child-1', 'child')

      const result = canViewTrustScore('parent-1', 'child-1', [parent, child])

      expect(result.canView).toBe(true)
    })

    it('should allow parent to view multiple children scores', () => {
      const parent = createFamilyMember('parent-1', 'parent')
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')

      const result1 = canViewTrustScore('parent-1', 'child-1', [parent, child1, child2])
      const result2 = canViewTrustScore('parent-1', 'child-2', [parent, child1, child2])

      expect(result1.canView).toBe(true)
      expect(result2.canView).toBe(true)
    })

    it('should return all children IDs for parent viewer', () => {
      const parent = createFamilyMember('parent-1', 'parent')
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')
      const child3 = createFamilyMember('child-3', 'child')

      const viewable = getViewableTrustScores('parent-1', [parent, child1, child2, child3])

      expect(viewable).toHaveLength(3)
      expect(viewable).toContain('child-1')
      expect(viewable).toContain('child-2')
      expect(viewable).toContain('child-3')
    })

    it('should identify parent viewer correctly', () => {
      const parent = createFamilyMember('parent-1', 'parent')
      const child = createFamilyMember('child-1', 'child')

      expect(isParentViewer('parent-1', [parent, child])).toBe(true)
      expect(isParentViewer('child-1', [parent, child])).toBe(false)
    })
  })

  describe('AC3: Siblings cannot compare scores', () => {
    it('should deny sibling access to other sibling score', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')
      const child3 = createFamilyMember('child-3', 'child')

      const result12 = canViewTrustScore('child-1', 'child-2', [child1, child2, child3])
      const result13 = canViewTrustScore('child-1', 'child-3', [child1, child2, child3])
      const result21 = canViewTrustScore('child-2', 'child-1', [child1, child2, child3])

      expect(result12.canView).toBe(false)
      expect(result13.canView).toBe(false)
      expect(result21.canView).toBe(false)
    })

    it('should not include sibling IDs in viewable list', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')

      const viewable = getViewableTrustScores('child-1', [child1, child2])

      expect(viewable).not.toContain('child-2')
    })
  })

  describe('Edge cases', () => {
    it('should handle unknown viewer gracefully', () => {
      const child = createFamilyMember('child-1', 'child')

      const result = canViewTrustScore('unknown-user', 'child-1', [child])

      expect(result.canView).toBe(false)
      expect(result.reason).toMatch(/not.*member|unknown/i)
    })

    it('should handle unknown target gracefully', () => {
      const parent = createFamilyMember('parent-1', 'parent')

      const result = canViewTrustScore('parent-1', 'unknown-child', [parent])

      expect(result.canView).toBe(false)
    })

    it('should return empty array for unknown viewer', () => {
      const child = createFamilyMember('child-1', 'child')

      const viewable = getViewableTrustScores('unknown', [child])

      expect(viewable).toEqual([])
    })

    it('should handle empty family members array', () => {
      const result = canViewTrustScore('user-1', 'child-1', [])

      expect(result.canView).toBe(false)
    })
  })

  describe('Role identification', () => {
    it('should correctly identify parent role', () => {
      const parent = createFamilyMember('parent-1', 'parent')
      const child = createFamilyMember('child-1', 'child')

      expect(isParentViewer('parent-1', [parent, child])).toBe(true)
    })

    it('should correctly identify non-parent role', () => {
      const parent = createFamilyMember('parent-1', 'parent')
      const child = createFamilyMember('child-1', 'child')

      expect(isParentViewer('child-1', [parent, child])).toBe(false)
    })

    it('should return false for unknown viewer in isParentViewer', () => {
      const parent = createFamilyMember('parent-1', 'parent')

      expect(isParentViewer('unknown', [parent])).toBe(false)
    })
  })

  describe('Privacy-preserving reasons', () => {
    it('should not reveal target information in denial reason', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')

      const result = canViewTrustScore('child-1', 'child-2', [child1, child2])

      // Reason should not contain the target child's ID
      expect(result.reason).not.toContain('child-2')
    })
  })
})
