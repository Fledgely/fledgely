/**
 * DisagreementNotification Tests - Story 38.4 Task 8
 *
 * Tests for surfacing disagreements for family conversation.
 * AC6: Disagreement surfaces for family conversation
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DisagreementNotification, {
  type DisagreementNotificationProps,
} from './DisagreementNotification'
import type { DisagreementRecord } from '@fledgely/shared'

describe('DisagreementNotification', () => {
  const mockDisagreement: DisagreementRecord = {
    id: 'disagree-123',
    checkId: 'check-456',
    familyId: 'family-789',
    childId: 'child-012',
    childResponse: 'graduate',
    parentResponses: [{ parentId: 'parent-1', response: 'appropriate' }],
    disagreementType: 'child_wants_less',
    surfacedAt: new Date(),
    resolvedAt: null,
    resolution: null,
  }

  const defaultProps: DisagreementNotificationProps = {
    disagreement: mockDisagreement,
    viewerType: 'parent',
    childName: 'Alex',
    onDismiss: vi.fn(),
    onScheduleConversation: vi.fn(),
  }

  // ============================================
  // Display Tests (AC6)
  // ============================================

  describe('Display notification (AC6)', () => {
    it('should display neutral title', () => {
      render(<DisagreementNotification {...defaultProps} />)

      expect(screen.getByText('Different Perspectives Noticed')).toBeInTheDocument()
    })

    it('should display non-blaming message', () => {
      render(<DisagreementNotification {...defaultProps} />)

      expect(screen.getByText(/Family members have different views/i)).toBeInTheDocument()
    })

    it('should have alert role for accessibility', () => {
      render(<DisagreementNotification {...defaultProps} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should display discussion topics', () => {
      render(<DisagreementNotification {...defaultProps} />)

      expect(screen.getByText(/Topics to discuss together/i)).toBeInTheDocument()
      expect(screen.getByText(/What is working well/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Disagreement Type Tests
  // ============================================

  describe('Disagreement types', () => {
    it('should show child_wants_less message', () => {
      render(<DisagreementNotification {...defaultProps} />)

      expect(screen.getByText('Different Perspectives Noticed')).toBeInTheDocument()
    })

    it('should show parent_wants_more message', () => {
      const parentWantsMore: DisagreementRecord = {
        ...mockDisagreement,
        disagreementType: 'parent_wants_more',
        childResponse: 'appropriate',
        parentResponses: [{ parentId: 'parent-1', response: 'increase' }],
      }
      render(<DisagreementNotification {...defaultProps} disagreement={parentWantsMore} />)

      expect(screen.getByText('Time for a Family Discussion')).toBeInTheDocument()
    })

    it('should show mixed message', () => {
      const mixed: DisagreementRecord = {
        ...mockDisagreement,
        disagreementType: 'mixed',
        parentResponses: [
          { parentId: 'parent-1', response: 'reduce' },
          { parentId: 'parent-2', response: 'increase' },
        ],
      }
      render(<DisagreementNotification {...defaultProps} disagreement={mixed} />)

      expect(screen.getByText('Various Viewpoints')).toBeInTheDocument()
    })
  })

  // ============================================
  // Viewer Type Tests
  // ============================================

  describe('Viewer-specific content', () => {
    it('should show parent-specific topics', () => {
      render(<DisagreementNotification {...defaultProps} />)

      expect(screen.getByText(/What would help you feel comfortable/i)).toBeInTheDocument()
    })

    it('should show child-specific topics', () => {
      render(<DisagreementNotification {...defaultProps} viewerType="child" />)

      expect(
        screen.getByText(/How can I show I.*m ready for more independence/i)
      ).toBeInTheDocument()
    })
  })

  // ============================================
  // Privacy Tests
  // ============================================

  describe('Privacy (AC6)', () => {
    it('should not reveal specific responses', () => {
      render(<DisagreementNotification {...defaultProps} />)

      // Should not show specific choices like "graduate" or "appropriate"
      expect(screen.queryByText(/graduate/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/appropriate/i)).not.toBeInTheDocument()
    })

    it('should not reveal who disagreed', () => {
      render(<DisagreementNotification {...defaultProps} />)

      // Should not mention child or parent specifically in disagreement
      expect(screen.queryByText(/Alex wants/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/parent disagrees/i)).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Action Button Tests
  // ============================================

  describe('Action buttons', () => {
    it('should show schedule conversation button', () => {
      render(<DisagreementNotification {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Schedule a Conversation/i })).toBeInTheDocument()
    })

    it('should show dismiss button', () => {
      render(<DisagreementNotification {...defaultProps} />)

      expect(screen.getByRole('button', { name: /We've Talked About This/i })).toBeInTheDocument()
    })

    it('should call onScheduleConversation when clicked', () => {
      const onScheduleConversation = vi.fn()
      render(
        <DisagreementNotification
          {...defaultProps}
          onScheduleConversation={onScheduleConversation}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Schedule a Conversation/i }))

      expect(onScheduleConversation).toHaveBeenCalled()
    })

    it('should call onDismiss when clicked', () => {
      const onDismiss = vi.fn()
      render(<DisagreementNotification {...defaultProps} onDismiss={onDismiss} />)

      fireEvent.click(screen.getByRole('button', { name: /We've Talked/i }))

      expect(onDismiss).toHaveBeenCalled()
    })

    it('should hide schedule button when not provided', () => {
      render(<DisagreementNotification {...defaultProps} onScheduleConversation={undefined} />)

      expect(
        screen.queryByRole('button', { name: /Schedule a Conversation/i })
      ).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Resource Link Tests
  // ============================================

  describe('Resource links', () => {
    it('should show communication resource link', () => {
      render(<DisagreementNotification {...defaultProps} />)

      expect(
        screen.getByRole('link', { name: /Tips for productive family conversations/i })
      ).toHaveAttribute('href', '/resources/family-communication')
    })
  })
})
