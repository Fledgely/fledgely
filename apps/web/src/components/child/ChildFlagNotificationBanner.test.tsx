/**
 * ChildFlagNotificationBanner Tests - Story 23.1
 *
 * Tests for the child notification banner component.
 * Verifies gentle messaging (AC2), timer display (AC5), and link to annotation (AC3).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ChildFlagNotificationBanner } from './ChildFlagNotificationBanner'
import type { FlagDocument } from '@fledgely/shared'

// Mock the service
vi.mock('../../services/childFlagNotificationService', () => ({
  getRemainingTime: vi.fn((deadline: number) => Math.max(0, deadline - Date.now())),
  formatRemainingTime: vi.fn((ms: number) => {
    if (ms <= 0) return 'Time expired'
    const minutes = Math.ceil(ms / 60000)
    return `${minutes} minutes to add your explanation`
  }),
  isWaitingForAnnotation: vi.fn((flag: FlagDocument) => {
    return (
      flag.childNotificationStatus === 'notified' &&
      !!flag.annotationDeadline &&
      flag.annotationDeadline > Date.now()
    )
  }),
}))

const createMockFlag = (overrides: Partial<FlagDocument> = {}): FlagDocument => ({
  id: 'flag-123',
  childId: 'child-456',
  familyId: 'family-789',
  screenshotRef: 'children/child-456/screenshots/ss-123',
  screenshotId: 'ss-123',
  category: 'Violence',
  severity: 'medium',
  confidence: 75,
  reasoning: 'Test reasoning',
  status: 'pending',
  createdAt: Date.now(),
  throttled: false,
  childNotificationStatus: 'notified',
  childNotifiedAt: Date.now(),
  annotationDeadline: Date.now() + 25 * 60 * 1000, // 25 minutes from now
  ...overrides,
})

describe('ChildFlagNotificationBanner', () => {
  const mockOnAddContext = vi.fn()
  const mockOnDismiss = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('AC2: Gentle, non-alarming messaging', () => {
    it('should display gentle title text', () => {
      const flag = createMockFlag()
      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      expect(screen.getByText('Something was flagged - add context?')).toBeInTheDocument()
    })

    it('should display supportive message text', () => {
      const flag = createMockFlag()
      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      expect(
        screen.getByText(
          'We want your side of the story. Take a moment to explain what happened if you want.'
        )
      ).toBeInTheDocument()
    })

    it('should use friendly icon (speech bubble)', () => {
      const flag = createMockFlag()
      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      // Uses speech bubble emoji for friendly appearance
      expect(screen.getByText('💬')).toBeInTheDocument()
    })

    it('should NOT use alarming language', () => {
      const flag = createMockFlag()
      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      const bannerText = screen.getByTestId('child-flag-notification-banner').textContent

      // Verify no alarming words are used
      expect(bannerText).not.toContain('trouble')
      expect(bannerText).not.toContain('inappropriate')
      expect(bannerText).not.toContain('warning')
      expect(bannerText).not.toContain('alert')
      expect(bannerText).not.toContain('violation')
    })
  })

  describe('AC3: Direct link to annotation', () => {
    it('should have "Add your side" button', () => {
      const flag = createMockFlag()
      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      expect(screen.getByTestId('add-context-button')).toHaveTextContent('Add your side')
    })

    it('should call onAddContext with flagId when button clicked', () => {
      const flag = createMockFlag({ id: 'test-flag-789' })
      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      fireEvent.click(screen.getByTestId('add-context-button'))

      expect(mockOnAddContext).toHaveBeenCalledWith('test-flag-789')
    })

    it('should have skip button when onDismiss provided', () => {
      const flag = createMockFlag()
      render(
        <ChildFlagNotificationBanner
          flag={flag}
          onAddContext={mockOnAddContext}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByTestId('skip-button')).toBeInTheDocument()
    })

    it('should call onDismiss when skip button clicked', () => {
      const flag = createMockFlag()
      render(
        <ChildFlagNotificationBanner
          flag={flag}
          onAddContext={mockOnAddContext}
          onDismiss={mockOnDismiss}
        />
      )

      fireEvent.click(screen.getByTestId('skip-button'))

      expect(mockOnDismiss).toHaveBeenCalled()
    })

    it('should not show skip button when onDismiss not provided', () => {
      const flag = createMockFlag()
      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      expect(screen.queryByTestId('skip-button')).not.toBeInTheDocument()
    })
  })

  describe('AC5: Timer visibility', () => {
    it('should display timer with remaining time', () => {
      const flag = createMockFlag()
      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      expect(screen.getByTestId('notification-timer')).toBeInTheDocument()
    })

    it('should display timer icon', () => {
      const flag = createMockFlag()
      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      expect(screen.getByText('⏱️')).toBeInTheDocument()
    })

    it('should update timer periodically', () => {
      const flag = createMockFlag({
        annotationDeadline: Date.now() + 25 * 60 * 1000,
      })

      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      // Initial render
      expect(screen.getByTestId('notification-timer')).toBeInTheDocument()

      // Advance time by 1 minute
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      // Timer should still be visible (24 minutes remaining)
      expect(screen.getByTestId('notification-timer')).toBeInTheDocument()
    })
  })

  describe('Expired state', () => {
    it('should show different message when time expired', async () => {
      // Mock the service functions to indicate expired
      const { isWaitingForAnnotation, getRemainingTime } = vi.mocked(
        await import('../../services/childFlagNotificationService')
      )
      isWaitingForAnnotation.mockReturnValue(false)
      getRemainingTime.mockReturnValue(0)

      const flag = createMockFlag({
        annotationDeadline: Date.now() - 5 * 60 * 1000, // 5 minutes ago
      })

      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      expect(screen.getByText('Time to add context has passed')).toBeInTheDocument()
    })

    it('should show "Add your thoughts" button when expired', async () => {
      const { isWaitingForAnnotation, getRemainingTime } = vi.mocked(
        await import('../../services/childFlagNotificationService')
      )
      isWaitingForAnnotation.mockReturnValue(false)
      getRemainingTime.mockReturnValue(0)

      const flag = createMockFlag({
        annotationDeadline: Date.now() - 5 * 60 * 1000,
      })

      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      expect(screen.getByTestId('add-context-button')).toHaveTextContent('Add your thoughts')
    })

    it('should not show timer when expired', async () => {
      const { isWaitingForAnnotation, getRemainingTime } = vi.mocked(
        await import('../../services/childFlagNotificationService')
      )
      isWaitingForAnnotation.mockReturnValue(false)
      getRemainingTime.mockReturnValue(0)

      const flag = createMockFlag({
        annotationDeadline: Date.now() - 5 * 60 * 1000,
      })

      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      expect(screen.queryByTestId('notification-timer')).not.toBeInTheDocument()
    })

    it('should not show skip button when expired', async () => {
      const { isWaitingForAnnotation, getRemainingTime } = vi.mocked(
        await import('../../services/childFlagNotificationService')
      )
      isWaitingForAnnotation.mockReturnValue(false)
      getRemainingTime.mockReturnValue(0)

      const flag = createMockFlag({
        annotationDeadline: Date.now() - 5 * 60 * 1000,
      })

      render(
        <ChildFlagNotificationBanner
          flag={flag}
          onAddContext={mockOnAddContext}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.queryByTestId('skip-button')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have role="alert" for screen readers', () => {
      const flag = createMockFlag()
      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should have aria-live="polite" for non-urgent updates', () => {
      const flag = createMockFlag()
      render(<ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />)

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Edge cases', () => {
    it('should not render when notification status is pending', async () => {
      const { isWaitingForAnnotation } = vi.mocked(
        await import('../../services/childFlagNotificationService')
      )
      isWaitingForAnnotation.mockReturnValue(false)

      const flag = createMockFlag({
        childNotificationStatus: 'pending',
        annotationDeadline: undefined,
      })

      const { container } = render(
        <ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render when notification was skipped', async () => {
      const { isWaitingForAnnotation } = vi.mocked(
        await import('../../services/childFlagNotificationService')
      )
      isWaitingForAnnotation.mockReturnValue(false)

      const flag = createMockFlag({
        childNotificationStatus: 'skipped',
      })

      const { container } = render(
        <ChildFlagNotificationBanner flag={flag} onAddContext={mockOnAddContext} />
      )

      expect(container.firstChild).toBeNull()
    })
  })
})
