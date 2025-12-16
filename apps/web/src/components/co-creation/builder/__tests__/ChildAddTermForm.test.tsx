/**
 * Tests for ChildAddTermForm Component
 *
 * Story 5.3: Child Contribution Capture - Task 2.6
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChildAddTermForm } from '../ChildAddTermForm'

// ============================================
// DEFAULT PROPS
// ============================================

const defaultProps = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('ChildAddTermForm', () => {
  describe('basic rendering', () => {
    it('renders the form component', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      expect(screen.getByTestId('child-add-term-form')).toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      render(<ChildAddTermForm {...defaultProps} data-testid="custom-form" />)
      expect(screen.getByTestId('custom-form')).toBeInTheDocument()
    })

    it('shows child-friendly prompt "I want to say..."', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      expect(screen.getByText(/I want to say/i)).toBeInTheDocument()
    })

    it('renders three simplified type options', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      expect(screen.getByTestId('type-option-rule')).toBeInTheDocument()
      expect(screen.getByTestId('type-option-reward')).toBeInTheDocument()
      expect(screen.getByTestId('type-option-other')).toBeInTheDocument()
    })
  })

  // ============================================
  // TYPE OPTION LABELS TESTS
  // ============================================

  describe('type option labels', () => {
    it('shows "A rule I want" option', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      expect(screen.getByText(/A rule I want/i)).toBeInTheDocument()
    })

    it('shows "A reward I want" option', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      expect(screen.getByText(/A reward I want/i)).toBeInTheDocument()
    })

    it('shows "Something else" option', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      expect(screen.getByText(/Something else/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // TYPE SELECTION TESTS
  // ============================================

  describe('type selection', () => {
    it('selects rule type when clicked', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))

      expect(screen.getByTestId('type-option-rule')).toHaveAttribute('aria-pressed', 'true')
    })

    it('selects reward type when clicked', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-reward'))

      expect(screen.getByTestId('type-option-reward')).toHaveAttribute('aria-pressed', 'true')
    })

    it('selects other type when clicked', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-other'))

      expect(screen.getByTestId('type-option-other')).toHaveAttribute('aria-pressed', 'true')
    })

    it('shows text input after type selection', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))

      expect(screen.getByTestId('child-text-input')).toBeInTheDocument()
    })
  })

  // ============================================
  // TEXT INPUT TESTS
  // ============================================

  describe('text input', () => {
    it('has large font for readability', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))

      const input = screen.getByTestId('child-text-input')
      expect(input.className).toMatch(/text-lg|text-xl/)
    })

    it('has placeholder hint text', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))

      const input = screen.getByTestId('child-text-input')
      expect(input).toHaveAttribute('placeholder')
    })

    it('accepts text input', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))
      await user.type(screen.getByTestId('child-text-input'), 'No phones at dinner')

      expect(screen.getByTestId('child-text-input')).toHaveValue('No phones at dinner')
    })
  })

  // ============================================
  // EMOJI PICKER INTEGRATION TESTS
  // ============================================

  describe('emoji picker integration', () => {
    it('shows emoji button', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))

      expect(screen.getByTestId('emoji-picker-button')).toBeInTheDocument()
    })

    it('emoji button has accessible label', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))

      expect(screen.getByTestId('emoji-picker-button')).toHaveAttribute('aria-label')
    })
  })

  // ============================================
  // SUBMIT TESTS
  // ============================================

  describe('submit', () => {
    it('shows submit button "I\'m done!"', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))

      expect(screen.getByText(/I'm done/i)).toBeInTheDocument()
    })

    it('submit button is disabled when no text entered', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))

      expect(screen.getByTestId('submit-button')).toBeDisabled()
    })

    it('submit button is enabled when text is entered', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))
      await user.type(screen.getByTestId('child-text-input'), 'Test rule')

      expect(screen.getByTestId('submit-button')).not.toBeDisabled()
    })

    it('calls onSubmit with form data when submitted', async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} onSubmit={onSubmit} />)

      await user.click(screen.getByTestId('type-option-rule'))
      await user.type(screen.getByTestId('child-text-input'), 'No phones at dinner')
      await user.click(screen.getByTestId('submit-button'))

      expect(onSubmit).toHaveBeenCalledWith({
        type: 'rule',
        content: { text: 'No phones at dinner' },
      })
    })

    it('maps "other" type to "rule" for submission', async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} onSubmit={onSubmit} />)

      await user.click(screen.getByTestId('type-option-other'))
      await user.type(screen.getByTestId('child-text-input'), 'Something special')
      await user.click(screen.getByTestId('submit-button'))

      expect(onSubmit).toHaveBeenCalledWith({
        type: 'rule',
        content: { text: 'Something special' },
      })
    })
  })

  // ============================================
  // CANCEL TESTS
  // ============================================

  describe('cancel', () => {
    it('shows cancel button', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })

    it('calls onCancel when cancel button clicked', async () => {
      const onCancel = vi.fn()
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} onCancel={onCancel} />)

      await user.click(screen.getByTestId('cancel-button'))

      expect(onCancel).toHaveBeenCalled()
    })
  })

  // ============================================
  // TOUCH TARGET TESTS (NFR49)
  // ============================================

  describe('touch targets (NFR49)', () => {
    it('type options meet minimum touch target size (48px)', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      const ruleOption = screen.getByTestId('type-option-rule')
      expect(ruleOption.className).toMatch(/min-h-\[48px\]|min-h-12/)
    })

    it('submit button meets minimum touch target size', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton.className).toMatch(/min-h-\[48px\]|min-h-12/)
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has form role', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    it('type options have aria-pressed attribute', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      expect(screen.getByTestId('type-option-rule')).toHaveAttribute('aria-pressed')
    })

    it('type options are keyboard accessible', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      const ruleOption = screen.getByTestId('type-option-rule')
      ruleOption.focus()
      expect(document.activeElement).toBe(ruleOption)
    })

    it('pressing Enter on type option selects it', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      const ruleOption = screen.getByTestId('type-option-rule')
      ruleOption.focus()
      fireEvent.keyDown(ruleOption, { key: 'Enter' })
      expect(ruleOption).toHaveAttribute('aria-pressed', 'true')
    })

    it('text input has accessible label', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))

      const input = screen.getByTestId('child-text-input')
      expect(input).toHaveAttribute('aria-label')
    })
  })

  // ============================================
  // VISUAL STYLING TESTS
  // ============================================

  describe('visual styling', () => {
    it('applies selected styling to chosen type', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-rule'))

      expect(screen.getByTestId('type-option-rule').className).toContain('bg-green')
    })

    it('applies reward color for reward type', async () => {
      const user = userEvent.setup()
      render(<ChildAddTermForm {...defaultProps} />)

      await user.click(screen.getByTestId('type-option-reward'))

      expect(screen.getByTestId('type-option-reward').className).toContain('bg-emerald')
    })

    it('has focus-visible ring styles on buttons', () => {
      render(<ChildAddTermForm {...defaultProps} />)
      expect(screen.getByTestId('type-option-rule').className).toContain('focus-visible:ring')
    })
  })
})
