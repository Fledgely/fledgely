/**
 * MediationResourcesModal Component Tests - Story 34.5.2 Task 4
 *
 * Tests for the mediation resources modal component.
 * AC2: Link to Family Communication Resources
 * AC3: Family Meeting Template Access
 * AC4: Age-Appropriate Negotiation Tips
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MediationResourcesModal } from './MediationResourcesModal'
import type { AgeTier } from '@fledgely/shared/contracts/mediationResources'

// Mock the meeting reminder hook
vi.mock('../../hooks/useMeetingReminder', () => ({
  useMeetingReminder: vi.fn(() => ({
    pendingReminder: null,
    loading: false,
    error: null,
    scheduleReminder: vi.fn().mockResolvedValue(undefined),
    cancelReminder: vi.fn().mockResolvedValue(undefined),
    isScheduling: false,
  })),
}))

describe('MediationResourcesModal - Story 34.5.2', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    ageTier: 'tween-12-14' as AgeTier,
    childName: 'Emma',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Modal Visibility Tests
  // ============================================

  describe('Modal Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      expect(screen.getByTestId('mediation-resources-modal')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<MediationResourcesModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByTestId('mediation-resources-modal')).not.toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('modal-close-button'))

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when backdrop is clicked', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('modal-backdrop'))

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // AC2: Link to Family Communication Resources
  // ============================================

  describe('AC2: Link to Family Communication Resources', () => {
    it('should display a communication guide section', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      expect(screen.getByTestId('tab-negotiation-tips')).toBeInTheDocument()
    })

    it('should show resources curated for age tier', () => {
      render(<MediationResourcesModal {...defaultProps} ageTier="child-8-11" />)

      const content = screen.getByTestId('resources-content')
      expect(content).toBeInTheDocument()
    })
  })

  // ============================================
  // AC3: Family Meeting Template Access
  // ============================================

  describe('AC3: Family Meeting Template Access', () => {
    it('should display family meeting template tab', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      expect(screen.getByTestId('tab-family-meeting')).toBeInTheDocument()
    })

    it('should show family meeting content when tab is clicked', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('family-meeting-content')).toBeInTheDocument()
    })

    it('should show parent section in family meeting template', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('parent-section')).toBeInTheDocument()
    })

    it('should show child section in family meeting template', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('child-section')).toBeInTheDocument()
    })

    it('should show joint section in family meeting template', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('joint-section')).toBeInTheDocument()
    })

    it('should have printable option for family meeting template', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('print-button')).toBeInTheDocument()
    })
  })

  // ============================================
  // AC4: Age-Appropriate Negotiation Tips
  // ============================================

  describe('AC4: Age-Appropriate Negotiation Tips', () => {
    it('should display negotiation tips tab', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      expect(screen.getByTestId('tab-negotiation-tips')).toBeInTheDocument()
    })

    it('should show negotiation tips content by default', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      expect(screen.getByTestId('negotiation-tips-content')).toBeInTheDocument()
    })

    it('should show multiple tips', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      const tips = screen.getAllByTestId(/^tip-/)
      expect(tips.length).toBeGreaterThanOrEqual(3)
    })

    it('should show different tips for child tier', () => {
      render(<MediationResourcesModal {...defaultProps} ageTier="child-8-11" />)

      const content = screen.getByTestId('negotiation-tips-content')
      expect(content).toBeInTheDocument()
    })

    it('should show different tips for teen tier', () => {
      render(<MediationResourcesModal {...defaultProps} ageTier="teen-15-17" />)

      const content = screen.getByTestId('negotiation-tips-content')
      expect(content).toBeInTheDocument()
    })

    it('should show tip title and description', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      const firstTip = screen.getByTestId('tip-0')
      expect(firstTip.querySelector('[data-testid="tip-title"]')).toBeInTheDocument()
      expect(firstTip.querySelector('[data-testid="tip-description"]')).toBeInTheDocument()
    })

    it('should expand tip to show full content', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tip-0'))

      expect(screen.getByTestId('tip-full-content-0')).toBeInTheDocument()
    })
  })

  // ============================================
  // Tab Navigation Tests
  // ============================================

  describe('Tab Navigation', () => {
    it('should highlight active tab', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      const activeTab = screen.getByTestId('tab-negotiation-tips')
      expect(activeTab.className).toContain('active')
    })

    it('should switch to family meeting tab when clicked', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('tab-family-meeting').className).toContain('active')
      expect(screen.getByTestId('tab-negotiation-tips').className).not.toContain('active')
    })

    it('should have at least 2 tabs', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      expect(screen.getByTestId('tab-negotiation-tips')).toBeInTheDocument()
      expect(screen.getByTestId('tab-family-meeting')).toBeInTheDocument()
    })
  })

  // ============================================
  // Personalization Tests
  // ============================================

  describe('Personalization', () => {
    it('should display child name in header', () => {
      render(<MediationResourcesModal {...defaultProps} childName="Emma" />)

      const header = screen.getByTestId('modal-header')
      expect(header.textContent).toContain('Emma')
    })
  })

  // ============================================
  // Story 34.5.4: Share/Copy to Clipboard (AC3)
  // ============================================

  describe('AC3: Share/Copy to Clipboard - Story 34.5.4', () => {
    beforeEach(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      })
    })

    it('should display copy button in family meeting tab', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('copy-button')).toBeInTheDocument()
    })

    it('should call clipboard API when copy button is clicked', async () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))
      await act(async () => {
        fireEvent.click(screen.getByTestId('copy-button'))
        await Promise.resolve()
      })

      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })

    it('should show success message after successful copy', async () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))
      fireEvent.click(screen.getByTestId('copy-button'))

      // Wait for success message to appear
      await screen.findByText(/copied/i)
    })

    it('should include template title in copied content', async () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))
      await act(async () => {
        fireEvent.click(screen.getByTestId('copy-button'))
        await Promise.resolve()
      })

      const copiedText = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock
        .calls[0][0]
      expect(copiedText).toContain('Family')
    })

    it('should include parent section in copied content', async () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))
      await act(async () => {
        fireEvent.click(screen.getByTestId('copy-button'))
        await Promise.resolve()
      })

      const copiedText = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock
        .calls[0][0]
      expect(copiedText).toContain('Parent')
    })

    it('should include child section in copied content', async () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))
      await act(async () => {
        fireEvent.click(screen.getByTestId('copy-button'))
        await Promise.resolve()
      })

      const copiedText = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock
        .calls[0][0]
      expect(copiedText).toContain('Your') // Child section heading varies by age
    })

    it('should have accessible aria-label on copy button', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      const copyButton = screen.getByTestId('copy-button')
      expect(copyButton.getAttribute('aria-label')).toBeTruthy()
    })

    it('should reset copy success message after timeout', async () => {
      vi.useFakeTimers()
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      // Click copy button and wait for the async clipboard operation
      await act(async () => {
        fireEvent.click(screen.getByTestId('copy-button'))
        // Flush microtask queue for the Promise
        await Promise.resolve()
      })

      // Success message should appear
      expect(screen.getByText(/copied/i)).toBeInTheDocument()

      // Fast forward 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      // Button should return to normal state
      expect(screen.getByTestId('copy-button').textContent).toContain('Copy')
      expect(screen.queryByText(/copied/i)).not.toBeInTheDocument()

      vi.useRealTimers()
    })
  })

  // ============================================
  // Story 34.5.4: Schedule Meeting Reminder (AC4)
  // ============================================

  describe('AC4: Schedule Meeting Reminder - Story 34.5.4', () => {
    const propsWithScheduling = {
      ...defaultProps,
      familyId: 'family-123',
      childId: 'child-456',
    }

    it('should display schedule button when familyId and childId provided', () => {
      render(<MediationResourcesModal {...propsWithScheduling} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.getByTestId('schedule-reminder-button')).toBeInTheDocument()
    })

    it('should not display schedule button when familyId missing', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      expect(screen.queryByTestId('schedule-reminder-button')).not.toBeInTheDocument()
    })

    it('should show supportive text on schedule button', () => {
      render(<MediationResourcesModal {...propsWithScheduling} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))

      const button = screen.getByTestId('schedule-reminder-button')
      expect(button.textContent).toMatch(/schedule|meeting|family/i)
    })

    it('should open schedule modal when button clicked', () => {
      render(<MediationResourcesModal {...propsWithScheduling} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))
      fireEvent.click(screen.getByTestId('schedule-reminder-button'))

      expect(screen.getByTestId('schedule-reminder-modal')).toBeInTheDocument()
    })

    it('should close schedule modal when cancel clicked', () => {
      render(<MediationResourcesModal {...propsWithScheduling} />)

      fireEvent.click(screen.getByTestId('tab-family-meeting'))
      fireEvent.click(screen.getByTestId('schedule-reminder-button'))
      fireEvent.click(screen.getByTestId('schedule-cancel-button'))

      expect(screen.queryByTestId('schedule-reminder-modal')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have proper modal role', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      const modal = screen.getByTestId('mediation-resources-modal')
      expect(modal.getAttribute('role')).toBe('dialog')
    })

    it('should have aria-labelledby for modal title', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      const modal = screen.getByTestId('mediation-resources-modal')
      expect(modal.getAttribute('aria-labelledby')).toBeTruthy()
    })

    it('should trap focus within modal', () => {
      render(<MediationResourcesModal {...defaultProps} />)

      const modal = screen.getByTestId('mediation-resources-modal')
      expect(modal.getAttribute('aria-modal')).toBe('true')
    })
  })
})
