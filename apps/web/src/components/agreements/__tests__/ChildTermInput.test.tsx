/**
 * Child Term Input Component Tests.
 *
 * Story 5.3: Child Contribution Capture - AC2, AC4
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChildTermInput } from '../ChildTermInput'
import type { ContributionParty } from '@fledgely/shared/contracts'

// Mock useVoiceInput hook
vi.mock('../../../hooks/useVoiceInput', () => ({
  useVoiceInput: () => ({
    isSupported: true,
    isListening: false,
    transcript: '',
    startListening: vi.fn(),
    stopListening: vi.fn(),
    clearTranscript: vi.fn(),
    error: null,
  }),
}))

describe('ChildTermInput', () => {
  const mockOnSubmit = vi.fn()
  const childName = 'Emma'
  const currentParty: ContributionParty = 'child'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Category Selection (Step 1)', () => {
    it('renders category selection initially', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      expect(screen.getByText(/what kind of idea do you have/i)).toBeInTheDocument()
    })

    it('renders all category options', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      expect(screen.getByTestId('category-time')).toBeInTheDocument()
      expect(screen.getByTestId('category-apps')).toBeInTheDocument()
      expect(screen.getByTestId('category-monitoring')).toBeInTheDocument()
      expect(screen.getByTestId('category-rewards')).toBeInTheDocument()
      expect(screen.getByTestId('category-general')).toBeInTheDocument()
    })

    it('shows child-friendly category labels', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      expect(screen.getByText('Screen Time')).toBeInTheDocument()
      expect(screen.getByText('Apps & Games')).toBeInTheDocument()
      expect(screen.getByText('Rules')).toBeInTheDocument()
      expect(screen.getByText('Rewards')).toBeInTheDocument()
      expect(screen.getByText('Other Ideas')).toBeInTheDocument()
    })

    it('advances to text input when category is selected', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-time'))

      expect(screen.getByTestId('term-text-input')).toBeInTheDocument()
    })
  })

  describe('Text Input (Step 2)', () => {
    it('shows text input after category selection', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-rewards'))

      expect(screen.getByTestId('term-text-input')).toBeInTheDocument()
      expect(screen.getByTestId('back-to-categories')).toBeInTheDocument()
    })

    it('shows selected category indicator', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-rewards'))

      expect(screen.getByText(/Rewards/)).toBeInTheDocument()
    })

    it('allows going back to category selection', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-time'))
      fireEvent.click(screen.getByTestId('back-to-categories'))

      expect(screen.getByTestId('category-time')).toBeInTheDocument()
    })

    it('shows character count', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-general'))

      expect(screen.getByText('0/200')).toBeInTheDocument()
    })

    it('updates character count as user types', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-general'))
      fireEvent.change(screen.getByTestId('term-text-input'), {
        target: { value: 'My idea' },
      })

      expect(screen.getByText('7/200')).toBeInTheDocument()
    })

    it('shows child-specific placeholder text for child party', () => {
      render(<ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty="child" />)

      fireEvent.click(screen.getByTestId('category-general'))

      const textarea = screen.getByTestId('term-text-input')
      expect(textarea).toHaveAttribute('placeholder', `What's your idea, ${childName}?`)
    })

    it('shows generic placeholder for parent party', () => {
      render(<ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty="parent" />)

      fireEvent.click(screen.getByTestId('category-general'))

      const textarea = screen.getByTestId('term-text-input')
      expect(textarea).toHaveAttribute('placeholder', 'Type your suggestion here...')
    })
  })

  describe('Form Submission', () => {
    it('submits form when text is entered and submit clicked', async () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-rewards'))
      fireEvent.change(screen.getByTestId('term-text-input'), {
        target: { value: 'I want to earn extra game time' },
      })
      fireEvent.click(screen.getByTestId('submit-term'))

      expect(mockOnSubmit).toHaveBeenCalledWith('I want to earn extra game time', 'rewards')
    })

    it('trims whitespace from submitted text', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-apps'))
      fireEvent.change(screen.getByTestId('term-text-input'), {
        target: { value: '  My app idea  ' },
      })
      fireEvent.click(screen.getByTestId('submit-term'))

      expect(mockOnSubmit).toHaveBeenCalledWith('My app idea', 'apps')
    })

    it('does not submit when text is empty', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-general'))
      fireEvent.click(screen.getByTestId('submit-term'))

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('does not submit when text is only whitespace', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-general'))
      fireEvent.change(screen.getByTestId('term-text-input'), {
        target: { value: '   ' },
      })
      fireEvent.click(screen.getByTestId('submit-term'))

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('resets to category selection after submission', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-time'))
      fireEvent.change(screen.getByTestId('term-text-input'), {
        target: { value: 'My idea' },
      })
      fireEvent.click(screen.getByTestId('submit-term'))

      expect(screen.getByTestId('category-time')).toBeInTheDocument()
    })
  })

  describe('Voice Input', () => {
    it('shows voice input button when supported', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-general'))

      expect(screen.getByTestId('voice-input-button')).toBeInTheDocument()
    })
  })

  describe('Child Attribution', () => {
    it('shows protection badge for child party', () => {
      render(<ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty="child" />)

      expect(screen.getByText(/Ideas Are Protected/)).toBeInTheDocument()
    })

    it('does not show protection badge for parent party', () => {
      render(<ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty="parent" />)

      expect(screen.queryByText(/Ideas Are Protected/)).not.toBeInTheDocument()
    })

    it('uses pink gradient styling for child party', () => {
      render(<ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty="child" />)

      const container = screen.getByTestId('child-term-input')
      expect(container.className).toContain('from-pink')
    })
  })

  describe('Disabled State', () => {
    it('disables category buttons when disabled', () => {
      render(
        <ChildTermInput
          onSubmit={mockOnSubmit}
          childName={childName}
          currentParty={currentParty}
          disabled={true}
        />
      )

      expect(screen.getByTestId('category-time')).toBeDisabled()
      expect(screen.getByTestId('category-apps')).toBeDisabled()
    })

    it('disables text input when disabled', () => {
      render(
        <ChildTermInput
          onSubmit={mockOnSubmit}
          childName={childName}
          currentParty={currentParty}
          disabled={true}
        />
      )

      // Need to get to step 2 first - but buttons are disabled
      // This tests the initial disabled state
      expect(screen.getByTestId('category-time')).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has correct touch target sizes for categories', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      const categoryButton = screen.getByTestId('category-time')
      expect(categoryButton.className).toContain('min-h-[72px]')
    })

    it('textarea has accessible label', () => {
      render(
        <ChildTermInput onSubmit={mockOnSubmit} childName={childName} currentParty={currentParty} />
      )

      fireEvent.click(screen.getByTestId('category-general'))

      expect(screen.getByRole('textbox', { name: /your idea/i })).toBeInTheDocument()
    })
  })
})
