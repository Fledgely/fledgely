/**
 * Trust Score Privacy Integration Tests - Story 36.6 Task 6
 *
 * Integration tests for the complete privacy system.
 * Tests all acceptance criteria working together:
 * - AC1: Children only see their own score
 * - AC2: Parents see all children scores
 * - AC3: Children cannot see sibling scores
 * - AC4: No family-wide leaderboard
 * - AC5: Trust score not shared outside family
 * - AC6: Privacy maintains dignity
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  canViewTrustScore,
  getViewableTrustScores,
  isParentViewer,
  type FamilyMember,
} from '@fledgely/shared'
import { PrivacyGate } from '../PrivacyGate'
import { FamilyTrustOverview } from '../FamilyTrustOverview'
import { ExternalShareGuard } from '../ExternalShareGuard'
import { DignitySafeDisplay } from '../DignitySafeDisplay'

// ============================================================================
// Test Data
// ============================================================================

const createFamilyMembers = (): FamilyMember[] => [
  { id: 'parent-1', role: 'parent', familyId: 'family-1' },
  { id: 'child-1', role: 'child', familyId: 'family-1' },
  { id: 'child-2', role: 'child', familyId: 'family-1' },
  { id: 'child-3', role: 'child', familyId: 'family-1' },
]

// ============================================================================
// Integration Tests
// ============================================================================

describe('Trust Score Privacy Integration - Story 36.6', () => {
  describe('Complete privacy flow for child viewer', () => {
    it('should allow child to view only their own score through full flow', () => {
      const familyMembers = createFamilyMembers()

      // Step 1: Service validates access
      const access = canViewTrustScore('child-1', 'child-1', familyMembers)
      expect(access.canView).toBe(true)

      // Step 2: Get viewable scores list
      const viewable = getViewableTrustScores('child-1', familyMembers)
      expect(viewable).toEqual(['child-1'])

      // Step 3: Render through PrivacyGate
      render(
        <PrivacyGate viewerId="child-1" targetChildId="child-1" familyMembers={familyMembers}>
          <DignitySafeDisplay score={75} />
        </PrivacyGate>
      )

      expect(screen.getByTestId('dignity-safe-display')).toBeInTheDocument()
      expect(screen.getByTestId('score-value')).toHaveTextContent('75')
    })

    it('should block child from viewing sibling score through full flow', () => {
      const familyMembers = createFamilyMembers()

      // Step 1: Service denies access
      const access = canViewTrustScore('child-1', 'child-2', familyMembers)
      expect(access.canView).toBe(false)

      // Step 2: Render shows access denied
      render(
        <PrivacyGate viewerId="child-1" targetChildId="child-2" familyMembers={familyMembers}>
          <DignitySafeDisplay score={85} />
        </PrivacyGate>
      )

      expect(screen.queryByTestId('dignity-safe-display')).not.toBeInTheDocument()
      expect(screen.getByTestId('access-denied')).toBeInTheDocument()
    })
  })

  describe('Complete privacy flow for parent viewer', () => {
    it('should allow parent to view all children scores', () => {
      const familyMembers = createFamilyMembers()

      // Step 1: Verify parent role
      expect(isParentViewer('parent-1', familyMembers)).toBe(true)

      // Step 2: Get all viewable scores
      const viewable = getViewableTrustScores('parent-1', familyMembers)
      expect(viewable).toEqual(['child-1', 'child-2', 'child-3'])

      // Step 3: Each child score is viewable
      viewable.forEach((childId) => {
        const access = canViewTrustScore('parent-1', childId, familyMembers)
        expect(access.canView).toBe(true)
      })
    })

    it('should render family overview without leaderboard', () => {
      const childData = [
        { id: 'child-1', name: 'Alex', score: 95 },
        { id: 'child-2', name: 'Jordan', score: 45 },
        { id: 'child-3', name: 'Morgan', score: 75 },
      ]

      render(<FamilyTrustOverview childData={childData} />)

      const overview = screen.getByTestId('family-trust-overview')

      // No ranking or competition indicators
      expect(overview.textContent).not.toMatch(/#\d|rank|best|worst|winner|loser/i)

      // All children displayed equally
      const cards = screen.getAllByTestId('child-card')
      expect(cards).toHaveLength(3)
    })
  })

  describe('Privacy protection across components', () => {
    it('should prevent external sharing through ExternalShareGuard', () => {
      render(
        <ExternalShareGuard showNotice>
          <DignitySafeDisplay score={80} />
        </ExternalShareGuard>
      )

      // Privacy notice displayed
      expect(screen.getByTestId('privacy-notice')).toBeInTheDocument()

      // Score visible inside guard
      expect(screen.getByTestId('score-value')).toHaveTextContent('80')

      // No share functionality
      expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument()
    })

    it('should maintain dignity with low scores through all components', () => {
      const lowScore = 25

      // Render through protected path
      render(
        <ExternalShareGuard>
          <DignitySafeDisplay score={lowScore} showPrivateContext />
        </ExternalShareGuard>
      )

      const display = screen.getByTestId('dignity-safe-display')

      // No shame language
      expect(display.textContent).not.toMatch(/bad|poor|fail|shame|worst/i)

      // Growth messaging present
      expect(screen.getByTestId('score-message').textContent).toMatch(/grow|build|opportunity/i)

      // Private encouragement shown
      expect(screen.getByTestId('private-context')).toBeInTheDocument()
    })
  })

  describe('Cross-family isolation', () => {
    it('should block access from different family member', () => {
      const familyMembers = createFamilyMembers()

      // Outsider trying to view
      const outsiderAccess = canViewTrustScore('outsider-1', 'child-1', familyMembers)
      expect(outsiderAccess.canView).toBe(false)
      expect(outsiderAccess.reason).toMatch(/not.*member|family/i)
    })

    it('should render access denied for outsider', () => {
      const familyMembers = createFamilyMembers()

      render(
        <PrivacyGate viewerId="outsider-1" targetChildId="child-1" familyMembers={familyMembers}>
          <DignitySafeDisplay score={75} />
        </PrivacyGate>
      )

      expect(screen.queryByTestId('dignity-safe-display')).not.toBeInTheDocument()
      expect(screen.getByTestId('access-denied')).toBeInTheDocument()
    })
  })

  describe('Combined parent view scenario', () => {
    it('should show parent complete family overview with dignity', () => {
      const familyMembers = createFamilyMembers()
      const childData = [
        { id: 'child-1', name: 'Alex', score: 90 },
        { id: 'child-2', name: 'Jordan', score: 35 }, // Low score
        { id: 'child-3', name: 'Morgan', score: 65 },
      ]

      // Verify parent can access all
      expect(isParentViewer('parent-1', familyMembers)).toBe(true)

      render(
        <ExternalShareGuard showNotice>
          <FamilyTrustOverview childData={childData} />
        </ExternalShareGuard>
      )

      // Privacy protected
      expect(screen.getByTestId('privacy-notice')).toBeInTheDocument()

      // All children shown
      expect(screen.getAllByTestId('child-card')).toHaveLength(3)

      // No rankings
      const overview = screen.getByTestId('family-trust-overview')
      expect(overview.textContent).not.toMatch(/rank|#\d|best|worst/i)

      // Low score child gets dignity treatment
      const cards = screen.getAllByTestId('child-card')
      cards.forEach((card) => {
        expect(card.textContent).not.toMatch(/poor|bad|fail/i)
      })
    })
  })

  describe('Child self-view scenario', () => {
    it('should show child their own score with dignity and privacy', () => {
      const familyMembers = createFamilyMembers()
      const childScore = 40 // Low score

      // Verify access to own score
      const access = canViewTrustScore('child-1', 'child-1', familyMembers)
      expect(access.canView).toBe(true)

      render(
        <PrivacyGate viewerId="child-1" targetChildId="child-1" familyMembers={familyMembers}>
          <ExternalShareGuard>
            <DignitySafeDisplay score={childScore} showPrivateContext />
          </ExternalShareGuard>
        </PrivacyGate>
      )

      // Score visible
      expect(screen.getByTestId('score-value')).toHaveTextContent('40')

      // Dignity preserved
      const display = screen.getByTestId('dignity-safe-display')
      expect(display.textContent).not.toMatch(/bad|poor|fail|shame/i)

      // Private encouragement
      expect(screen.getByTestId('private-context')).toBeInTheDocument()

      // No external sharing
      expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
    })
  })

  describe('Service and UI consistency', () => {
    it('should have consistent access rules between service and components', () => {
      const familyMembers = createFamilyMembers()

      // Test each child viewing themselves
      const children = ['child-1', 'child-2', 'child-3']
      children.forEach((childId) => {
        const access = canViewTrustScore(childId, childId, familyMembers)
        expect(access.canView).toBe(true)

        // Verify siblings are blocked
        children
          .filter((id) => id !== childId)
          .forEach((siblingId) => {
            const siblingAccess = canViewTrustScore(childId, siblingId, familyMembers)
            expect(siblingAccess.canView).toBe(false)
          })
      })
    })

    it('should have consistent viewable list between service and UI', () => {
      const familyMembers = createFamilyMembers()

      // Parent sees all children
      const parentViewable = getViewableTrustScores('parent-1', familyMembers)
      expect(parentViewable).toHaveLength(3)

      // Each child sees only themselves
      const child1Viewable = getViewableTrustScores('child-1', familyMembers)
      expect(child1Viewable).toHaveLength(1)
      expect(child1Viewable).toEqual(['child-1'])
    })
  })

  describe('Edge cases', () => {
    it('should handle empty family gracefully', () => {
      const emptyFamily: FamilyMember[] = []

      const access = canViewTrustScore('child-1', 'child-1', emptyFamily)
      expect(access.canView).toBe(false)

      render(<FamilyTrustOverview childData={[]} />)
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('should handle single child family', () => {
      const singleChildFamily: FamilyMember[] = [
        { id: 'parent-1', role: 'parent', familyId: 'family-1' },
        { id: 'child-1', role: 'child', familyId: 'family-1' },
      ]

      const viewable = getViewableTrustScores('child-1', singleChildFamily)
      expect(viewable).toEqual(['child-1'])

      render(<FamilyTrustOverview childData={[{ id: 'child-1', name: 'Alex', score: 75 }]} />)
      expect(screen.getAllByTestId('child-card')).toHaveLength(1)
    })
  })
})
