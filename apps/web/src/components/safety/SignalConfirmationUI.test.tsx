/**
 * SignalConfirmationUI Tests - Story 7.5.3 Task 4
 *
 * Tests for the signal confirmation UI component.
 * AC1: Discrete confirmation display
 * AC6: Child-appropriate language (6th-grade reading level)
 * AC7: Analytics for improvement
 *
 * CRITICAL: This component displays to children in crisis.
 * All text must be reassuring, not clinical.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SignalConfirmationUI from './SignalConfirmationUI'
import type { ConfirmationContent, SignalCrisisResource } from '@fledgely/shared'

// Mock analytics
vi.mock('@fledgely/shared', async () => {
  const actual = await vi.importActual('@fledgely/shared')
  return {
    ...actual,
    trackConfirmationDisplayed: vi.fn(),
    trackConfirmationDismissed: vi.fn(),
  }
})

const mockContent: ConfirmationContent = {
  headerText: 'Someone will reach out',
  bodyText:
    'You did the right thing by asking for help. Someone who can help will contact you soon.',
  emergencyText: 'If you are in danger right now, call 911',
  chatPromptText: 'Chat with someone now',
  dismissButtonText: 'Got it',
}

const mockResources: SignalCrisisResource[] = [
  {
    id: '988-lifeline',
    name: '988 Suicide & Crisis Lifeline',
    description: 'Free, confidential support 24/7',
    type: 'hotline',
    value: '988',
    priority: 1,
    jurisdictions: ['US'],
    available24x7: true,
    chatAvailable: true,
  },
  {
    id: 'crisis-text',
    name: 'Crisis Text Line',
    description: 'Text HOME to 741741',
    type: 'text',
    value: '741741',
    priority: 2,
    jurisdictions: ['US'],
    available24x7: true,
    chatAvailable: false,
  },
]

describe('SignalConfirmationUI', () => {
  let onDismiss: ReturnType<typeof vi.fn>
  let onResourceClick: ReturnType<typeof vi.fn>
  let onChatClick: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onDismiss = vi.fn()
    onResourceClick = vi.fn()
    onChatClick = vi.fn()
  })

  // ============================================
  // Rendering Tests
  // ============================================

  describe('Rendering', () => {
    it('should render header text', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByText('Someone will reach out')).toBeInTheDocument()
    })

    it('should render body text', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByText(/right thing by asking for help/i)).toBeInTheDocument()
    })

    it('should render emergency text', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByText(/call 911/i)).toBeInTheDocument()
    })

    it('should render dismiss button', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByRole('button', { name: /got it/i })).toBeInTheDocument()
    })

    it('should render chat prompt when chat available', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
          showChatOption={true}
        />
      )

      expect(screen.getByText(/chat with someone now/i)).toBeInTheDocument()
    })

    it('should not render chat prompt when chat not available', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
          showChatOption={false}
        />
      )

      expect(screen.queryByText(/chat with someone now/i)).not.toBeInTheDocument()
    })

    it('should render crisis resources', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument()
      expect(screen.getByText('Crisis Text Line')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
          isOpen={false}
        />
      )

      expect(screen.queryByText('Someone will reach out')).not.toBeInTheDocument()
    })

    it('should render when isOpen is true', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
          isOpen={true}
        />
      )

      expect(screen.getByText('Someone will reach out')).toBeInTheDocument()
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have accessible role for modal', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-labelledby for header', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('should have aria-describedby for body', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-describedby')
    })

    it('should focus dismiss button on open', async () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /got it/i })).toHaveFocus()
      })
    })

    it('should trap focus within modal', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })
  })

  // ============================================
  // Interaction Tests
  // ============================================

  describe('Interactions', () => {
    it('should call onDismiss when dismiss button clicked', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /got it/i }))

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('should call onResourceClick when resource clicked', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
          onResourceClick={onResourceClick}
        />
      )

      const resourceButton = screen.getByText('988 Suicide & Crisis Lifeline')
      fireEvent.click(resourceButton)

      expect(onResourceClick).toHaveBeenCalledWith(mockResources[0])
    })

    it('should call onChatClick when chat button clicked', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
          onChatClick={onChatClick}
          showChatOption={true}
        />
      )

      fireEvent.click(screen.getByText(/chat with someone now/i))

      expect(onChatClick).toHaveBeenCalledTimes(1)
    })

    it('should dismiss on Escape key', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('should NOT dismiss on backdrop click (prevents accidental dismissal)', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      // The modal backdrop should not dismiss on click for safety
      const dialog = screen.getByRole('dialog')
      fireEvent.click(dialog.parentElement!)

      expect(onDismiss).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Child-Appropriate Content Tests
  // ============================================

  describe('Child-Appropriate Content', () => {
    it('should display reassuring header', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      // Header should be positive and reassuring
      const header = screen.getByRole('heading')
      expect(header.textContent).not.toContain('crisis')
      expect(header.textContent).not.toContain('suicide')
      expect(header.textContent).not.toContain('emergency')
    })

    it('should use child-friendly dismiss button text', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      // Button should be simple and clear
      const button = screen.getByRole('button', { name: /got it/i })
      expect(button).toBeInTheDocument()
    })

    it('should display emergency number prominently', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      // Emergency number should be clearly visible
      expect(screen.getByText(/911/)).toBeInTheDocument()
    })
  })

  // ============================================
  // Offline Mode Tests
  // ============================================

  describe('Offline Mode', () => {
    const offlineContent: ConfirmationContent = {
      headerText: 'Message saved',
      bodyText: 'Your message is saved. It will be sent when you are back online.',
      emergencyText: 'If you are in danger right now, call 911',
      chatPromptText: 'Chat with someone now',
      dismissButtonText: 'Got it',
    }

    it('should display offline-specific header', () => {
      render(
        <SignalConfirmationUI
          content={offlineContent}
          resources={[]}
          onDismiss={onDismiss}
          isOffline={true}
        />
      )

      expect(screen.getByText('Message saved')).toBeInTheDocument()
    })

    it('should show offline indicator', () => {
      render(
        <SignalConfirmationUI
          content={offlineContent}
          resources={[]}
          onDismiss={onDismiss}
          isOffline={true}
        />
      )

      expect(screen.getByText(/currently offline/i)).toBeInTheDocument()
    })

    it('should still show emergency number offline', () => {
      render(
        <SignalConfirmationUI
          content={offlineContent}
          resources={[]}
          onDismiss={onDismiss}
          isOffline={true}
        />
      )

      expect(screen.getByText(/call 911/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Visual Style Tests
  // ============================================

  describe('Visual Style', () => {
    it('should have calming background color', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('bg-white')
    })

    it('should apply custom className if provided', () => {
      render(
        <SignalConfirmationUI
          content={mockContent}
          resources={mockResources}
          onDismiss={onDismiss}
          className="custom-class"
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('custom-class')
    })
  })
})
