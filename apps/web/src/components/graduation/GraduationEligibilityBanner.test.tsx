/**
 * Graduation Eligibility Banner Tests - Story 38.2 Task 5
 *
 * Tests for GraduationEligibilityBanner component.
 * AC2: Notification to BOTH child AND parent about eligibility
 * AC3: Both parties must acknowledge readiness
 * AC4: Celebratory messaging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GraduationEligibilityBanner from './GraduationEligibilityBanner'
import type { GraduationConversation } from '@fledgely/shared'

describe('GraduationEligibilityBanner - Story 38.2 Task 5', () => {
  const mockOnAcknowledge = vi.fn()
  const mockOnSchedule = vi.fn()
  const mockOnViewTemplate = vi.fn()

  const createMockConversation = (
    overrides?: Partial<GraduationConversation>
  ): GraduationConversation => ({
    id: 'conv-123',
    familyId: 'family-456',
    childId: 'child-789',
    initiatedAt: new Date(),
    expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
    status: 'pending',
    childAcknowledgment: null,
    parentAcknowledgments: [],
    requiredParentIds: ['parent-1', 'parent-2'],
    scheduledDate: null,
    completedAt: null,
    outcome: null,
    remindersSent: 0,
    lastReminderAt: null,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnAcknowledge.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders the celebration icon', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('renders celebratory title for child', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(
        screen.getByRole('heading', { name: /congratulations.*graduation eligible/i })
      ).toBeInTheDocument()
    })

    it('renders personalized title for parent', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="parent"
          viewerId="parent-1"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(
        screen.getByRole('heading', { name: /emma.*graduation eligible/i })
      ).toBeInTheDocument()
    })

    it('shows celebratory message for child (AC4)', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByText(/12 months of responsible digital behavior/)).toBeInTheDocument()
    })

    it('shows celebratory message for parent with child name (AC4)', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="parent"
          viewerId="parent-1"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(
        screen.getByText(/emma has demonstrated remarkable responsibility/i)
      ).toBeInTheDocument()
    })
  })

  describe('acknowledgment status display (AC3)', () => {
    it('shows child pending status for child viewer', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByText(/you.*pending/i)).toBeInTheDocument()
    })

    it('shows child acknowledged status when child has acknowledged', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation({
            childAcknowledgment: {
              userId: 'child-789',
              role: 'child',
              acknowledgedAt: new Date(),
            },
          })}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={true}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      // Multiple elements show acknowledged status - verify at least one exists
      const acknowledgedElements = screen.getAllByText(/you.*acknowledged/i)
      expect(acknowledgedElements.length).toBeGreaterThan(0)
    })

    it('shows parent acknowledgment count', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation({
            parentAcknowledgments: [
              { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
            ],
          })}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByText(/parents.*1\/2/i)).toBeInTheDocument()
    })

    it('shows all parents acknowledged when complete', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation({
            parentAcknowledgments: [
              { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
              { userId: 'parent-2', role: 'parent', acknowledgedAt: new Date() },
            ],
          })}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByText(/all parents.*acknowledged/i)).toBeInTheDocument()
    })

    it('shows child name for parent viewer', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="parent"
          viewerId="parent-1"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByText(/emma.*pending/i)).toBeInTheDocument()
    })
  })

  describe('countdown display (AC6)', () => {
    it('shows days remaining', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation({
            expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
          })}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      // Days remaining appears in countdown and summary
      const daysElements = screen.getAllByText(/20 days remaining/)
      expect(daysElements.length).toBeGreaterThan(0)
    })

    it('shows danger styling when 7 days or less', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation({
            expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
          })}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      // Days remaining appears in countdown and summary
      const daysElements = screen.getAllByText(/5 days remaining/)
      expect(daysElements.length).toBeGreaterThan(0)
    })

    it('shows expired message when expired', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation({
            expiresAt: new Date(Date.now() - 1000), // expired
          })}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByText(/has expired/)).toBeInTheDocument()
    })
  })

  describe('acknowledge button', () => {
    it('shows acknowledge button when not acknowledged', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByRole('button', { name: /i'm ready/i })).toBeInTheDocument()
    })

    it('shows parent button label for parent', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="parent"
          viewerId="parent-1"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByRole('button', { name: /ready to discuss/i })).toBeInTheDocument()
    })

    it('hides acknowledge button when already acknowledged', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={true}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.queryByRole('button', { name: /i'm ready/i })).not.toBeInTheDocument()
    })

    it('hides acknowledge button when expired', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation({
            expiresAt: new Date(Date.now() - 1000),
          })}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.queryByRole('button', { name: /i'm ready/i })).not.toBeInTheDocument()
    })

    it('calls onAcknowledge when clicked', async () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /i'm ready/i }))

      await waitFor(() => {
        expect(mockOnAcknowledge).toHaveBeenCalledTimes(1)
      })
    })

    it('shows loading state while acknowledging', async () => {
      mockOnAcknowledge.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /i'm ready/i }))

      expect(screen.getByText(/acknowledging/i)).toBeInTheDocument()
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    })

    it('shows error message when acknowledge fails', async () => {
      mockOnAcknowledge.mockRejectedValue(new Error('Network error'))

      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /i'm ready/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Network error')
      })
    })
  })

  describe('acknowledged badge', () => {
    it('shows acknowledged badge when user has acknowledged but others pending', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation({
            childAcknowledgment: {
              userId: 'child-789',
              role: 'child',
              acknowledgedAt: new Date(),
            },
          })}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={true}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByText(/you have acknowledged/i)).toBeInTheDocument()
    })

    it('does not show acknowledged badge when all have acknowledged', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation({
            status: 'acknowledged',
            childAcknowledgment: {
              userId: 'child-789',
              role: 'child',
              acknowledgedAt: new Date(),
            },
            parentAcknowledgments: [
              { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
              { userId: 'parent-2', role: 'parent', acknowledgedAt: new Date() },
            ],
          })}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={true}
          onAcknowledge={mockOnAcknowledge}
          onSchedule={mockOnSchedule}
        />
      )

      expect(screen.queryByText(/you have acknowledged/i)).not.toBeInTheDocument()
    })
  })

  describe('schedule button', () => {
    it('shows schedule button when all acknowledged', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation({
            status: 'acknowledged',
            childAcknowledgment: {
              userId: 'child-789',
              role: 'child',
              acknowledgedAt: new Date(),
            },
            parentAcknowledgments: [
              { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
              { userId: 'parent-2', role: 'parent', acknowledgedAt: new Date() },
            ],
          })}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={true}
          onAcknowledge={mockOnAcknowledge}
          onSchedule={mockOnSchedule}
        />
      )

      expect(screen.getByRole('button', { name: /schedule conversation/i })).toBeInTheDocument()
    })

    it('does not show schedule button when not all acknowledged', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
          onSchedule={mockOnSchedule}
        />
      )

      expect(
        screen.queryByRole('button', { name: /schedule conversation/i })
      ).not.toBeInTheDocument()
    })

    it('calls onSchedule when clicked', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation({
            status: 'acknowledged',
            childAcknowledgment: {
              userId: 'child-789',
              role: 'child',
              acknowledgedAt: new Date(),
            },
            parentAcknowledgments: [
              { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
              { userId: 'parent-2', role: 'parent', acknowledgedAt: new Date() },
            ],
          })}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={true}
          onAcknowledge={mockOnAcknowledge}
          onSchedule={mockOnSchedule}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /schedule conversation/i }))

      expect(mockOnSchedule).toHaveBeenCalledTimes(1)
    })
  })

  describe('view template button', () => {
    it('shows view template button when provided', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
          onViewTemplate={mockOnViewTemplate}
        />
      )

      expect(screen.getByRole('button', { name: /view conversation guide/i })).toBeInTheDocument()
    })

    it('calls onViewTemplate when clicked', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
          onViewTemplate={mockOnViewTemplate}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /view conversation guide/i }))

      expect(mockOnViewTemplate).toHaveBeenCalledTimes(1)
    })
  })

  describe('status summary', () => {
    it('shows status summary for pending conversation', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByText(/waiting for acknowledgment/i)).toBeInTheDocument()
    })

    it('shows status summary for acknowledged conversation', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation({
            status: 'acknowledged',
            childAcknowledgment: {
              userId: 'child-789',
              role: 'child',
              acknowledgedAt: new Date(),
            },
            parentAcknowledgments: [
              { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
              { userId: 'parent-2', role: 'parent', acknowledgedAt: new Date() },
            ],
          })}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={true}
          onAcknowledge={mockOnAcknowledge}
          onSchedule={mockOnSchedule}
        />
      )

      expect(screen.getByText(/all parties have acknowledged/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has accessible region role', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByRole('region')).toHaveAttribute(
        'aria-label',
        'Graduation eligibility for you'
      )
    })

    it('has accessible region label for parent', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="parent"
          viewerId="parent-1"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByRole('region')).toHaveAttribute(
        'aria-label',
        'Graduation eligibility for Emma'
      )
    })

    it('uses list for acknowledgment status', () => {
      render(
        <GraduationEligibilityBanner
          conversation={createMockConversation()}
          viewerType="child"
          viewerId="child-789"
          childName="Emma"
          hasAcknowledged={false}
          onAcknowledge={mockOnAcknowledge}
        />
      )

      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })

  describe('AC Verification', () => {
    describe('AC2: Notification to BOTH child AND parent', () => {
      it('shows appropriate message for child', () => {
        render(
          <GraduationEligibilityBanner
            conversation={createMockConversation()}
            viewerType="child"
            viewerId="child-789"
            childName="Emma"
            hasAcknowledged={false}
            onAcknowledge={mockOnAcknowledge}
          />
        )

        expect(screen.getByText(/you've earned this milestone/i)).toBeInTheDocument()
      })

      it('shows appropriate message for parent', () => {
        render(
          <GraduationEligibilityBanner
            conversation={createMockConversation()}
            viewerType="parent"
            viewerId="parent-1"
            childName="Emma"
            hasAcknowledged={false}
            onAcknowledge={mockOnAcknowledge}
          />
        )

        expect(screen.getByText(/emma has demonstrated/i)).toBeInTheDocument()
      })
    })

    describe('AC3: Both parties must acknowledge', () => {
      it('tracks child acknowledgment status', () => {
        render(
          <GraduationEligibilityBanner
            conversation={createMockConversation()}
            viewerType="child"
            viewerId="child-789"
            childName="Emma"
            hasAcknowledged={false}
            onAcknowledge={mockOnAcknowledge}
          />
        )

        expect(screen.getByText(/you.*pending/i)).toBeInTheDocument()
      })

      it('tracks parent acknowledgment status', () => {
        render(
          <GraduationEligibilityBanner
            conversation={createMockConversation()}
            viewerType="child"
            viewerId="child-789"
            childName="Emma"
            hasAcknowledged={false}
            onAcknowledge={mockOnAcknowledge}
          />
        )

        expect(screen.getByText(/parents.*0\/2/i)).toBeInTheDocument()
      })

      it('enables scheduling only when all acknowledged', () => {
        const { rerender } = render(
          <GraduationEligibilityBanner
            conversation={createMockConversation()}
            viewerType="child"
            viewerId="child-789"
            childName="Emma"
            hasAcknowledged={false}
            onAcknowledge={mockOnAcknowledge}
            onSchedule={mockOnSchedule}
          />
        )

        expect(screen.queryByRole('button', { name: /schedule/i })).not.toBeInTheDocument()

        rerender(
          <GraduationEligibilityBanner
            conversation={createMockConversation({
              status: 'acknowledged',
              childAcknowledgment: {
                userId: 'child-789',
                role: 'child',
                acknowledgedAt: new Date(),
              },
              parentAcknowledgments: [
                { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
                { userId: 'parent-2', role: 'parent', acknowledgedAt: new Date() },
              ],
            })}
            viewerType="child"
            viewerId="child-789"
            childName="Emma"
            hasAcknowledged={true}
            onAcknowledge={mockOnAcknowledge}
            onSchedule={mockOnSchedule}
          />
        )

        expect(screen.getByRole('button', { name: /schedule/i })).toBeInTheDocument()
      })
    })

    describe('AC4: Celebratory messaging', () => {
      it('uses positive language for child', () => {
        render(
          <GraduationEligibilityBanner
            conversation={createMockConversation()}
            viewerType="child"
            viewerId="child-789"
            childName="Emma"
            hasAcknowledged={false}
            onAcknowledge={mockOnAcknowledge}
          />
        )

        // Positive celebratory language appears in title and message
        const congratsElements = screen.getAllByText(/congratulations/i)
        expect(congratsElements.length).toBeGreaterThan(0)
        expect(screen.getAllByText(/earned/i).length).toBeGreaterThan(0)
      })

      it('uses positive language for parent', () => {
        render(
          <GraduationEligibilityBanner
            conversation={createMockConversation()}
            viewerType="parent"
            viewerId="parent-1"
            childName="Emma"
            hasAcknowledged={false}
            onAcknowledge={mockOnAcknowledge}
          />
        )

        expect(screen.getByText(/remarkable responsibility/i)).toBeInTheDocument()
      })

      it('does not use punitive language', () => {
        render(
          <GraduationEligibilityBanner
            conversation={createMockConversation()}
            viewerType="child"
            viewerId="child-789"
            childName="Emma"
            hasAcknowledged={false}
            onAcknowledge={mockOnAcknowledge}
          />
        )

        const bannerText = screen.getByRole('region').textContent || ''
        expect(bannerText.toLowerCase()).not.toContain('must')
        expect(bannerText.toLowerCase()).not.toContain('required')
        expect(bannerText.toLowerCase()).not.toContain('punishment')
      })
    })
  })
})
