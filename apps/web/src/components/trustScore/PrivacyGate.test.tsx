/**
 * PrivacyGate Component Tests - Story 36.6 Task 2
 *
 * Tests for trust score visibility gating.
 * AC1: Each child sees only their own score
 * AC2: Parents see each child's score separately
 * AC3: Siblings cannot compare scores
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrivacyGate } from './PrivacyGate'
import { type FamilyMember } from '@fledgely/shared'

const createFamilyMember = (
  id: string,
  role: 'parent' | 'child',
  familyId: string = 'family-123'
): FamilyMember => ({
  id,
  role,
  familyId,
})

describe('PrivacyGate - Story 36.6 Task 2', () => {
  describe('AC1: Child sees only their own score', () => {
    it('should render children when child views own score', () => {
      const child = createFamilyMember('child-1', 'child')

      render(
        <PrivacyGate viewerId="child-1" targetChildId="child-1" familyMembers={[child]}>
          <div data-testid="protected-content">Trust Score: 85</div>
        </PrivacyGate>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should block content when child views sibling score', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')

      render(
        <PrivacyGate viewerId="child-1" targetChildId="child-2" familyMembers={[child1, child2]}>
          <div data-testid="protected-content">Trust Score: 85</div>
        </PrivacyGate>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should show access denied message', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')

      render(
        <PrivacyGate viewerId="child-1" targetChildId="child-2" familyMembers={[child1, child2]}>
          <div>Protected Content</div>
        </PrivacyGate>
      )

      expect(screen.getByTestId('access-denied')).toBeInTheDocument()
    })
  })

  describe('AC2: Parents see each child score separately', () => {
    it('should allow parent to view any child score', () => {
      const parent = createFamilyMember('parent-1', 'parent')
      const child = createFamilyMember('child-1', 'child')

      render(
        <PrivacyGate viewerId="parent-1" targetChildId="child-1" familyMembers={[parent, child]}>
          <div data-testid="protected-content">Trust Score: 85</div>
        </PrivacyGate>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should allow parent to view multiple children', () => {
      const parent = createFamilyMember('parent-1', 'parent')
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')
      const members = [parent, child1, child2]

      const { rerender } = render(
        <PrivacyGate viewerId="parent-1" targetChildId="child-1" familyMembers={members}>
          <div data-testid="child-1-score">Score</div>
        </PrivacyGate>
      )

      expect(screen.getByTestId('child-1-score')).toBeInTheDocument()

      rerender(
        <PrivacyGate viewerId="parent-1" targetChildId="child-2" familyMembers={members}>
          <div data-testid="child-2-score">Score</div>
        </PrivacyGate>
      )

      expect(screen.getByTestId('child-2-score')).toBeInTheDocument()
    })
  })

  describe('AC3: Siblings cannot compare scores', () => {
    it('should block sibling from viewing other sibling', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')

      render(
        <PrivacyGate viewerId="child-1" targetChildId="child-2" familyMembers={[child1, child2]}>
          <div data-testid="sibling-score">Score</div>
        </PrivacyGate>
      )

      expect(screen.queryByTestId('sibling-score')).not.toBeInTheDocument()
      expect(screen.getByTestId('access-denied')).toBeInTheDocument()
    })
  })

  describe('Access denied message', () => {
    it('should show privacy-friendly message', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')

      render(
        <PrivacyGate viewerId="child-1" targetChildId="child-2" familyMembers={[child1, child2]}>
          <div>Content</div>
        </PrivacyGate>
      )

      expect(screen.getByTestId('privacy-message')).toBeInTheDocument()
      expect(screen.getByTestId('privacy-message').textContent).toMatch(/privacy|your own/i)
    })

    it('should not reveal target information', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')

      render(
        <PrivacyGate viewerId="child-1" targetChildId="child-2" familyMembers={[child1, child2]}>
          <div>Content</div>
        </PrivacyGate>
      )

      const message = screen.getByTestId('access-denied')
      expect(message.textContent).not.toContain('child-2')
    })
  })

  describe('Custom fallback', () => {
    it('should allow custom access denied component', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')

      render(
        <PrivacyGate
          viewerId="child-1"
          targetChildId="child-2"
          familyMembers={[child1, child2]}
          fallback={<div data-testid="custom-fallback">Custom Message</div>}
        >
          <div>Content</div>
        </PrivacyGate>
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should handle unknown viewer', () => {
      const child = createFamilyMember('child-1', 'child')

      render(
        <PrivacyGate viewerId="unknown" targetChildId="child-1" familyMembers={[child]}>
          <div data-testid="protected">Content</div>
        </PrivacyGate>
      )

      expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
    })

    it('should handle empty family members', () => {
      render(
        <PrivacyGate viewerId="child-1" targetChildId="child-1" familyMembers={[]}>
          <div data-testid="protected">Content</div>
        </PrivacyGate>
      )

      expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible denied message', () => {
      const child1 = createFamilyMember('child-1', 'child')
      const child2 = createFamilyMember('child-2', 'child')

      render(
        <PrivacyGate viewerId="child-1" targetChildId="child-2" familyMembers={[child1, child2]}>
          <div>Content</div>
        </PrivacyGate>
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
