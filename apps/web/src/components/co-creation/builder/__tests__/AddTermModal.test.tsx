/**
 * Tests for AddTermModal Component
 *
 * Story 5.2: Visual Agreement Builder - Task 7.6
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionTerm } from '@fledgely/contracts'
import { AddTermModal } from '../AddTermModal'

// ============================================
// TEST HELPERS
// ============================================

const createMockTerm = (overrides: Partial<SessionTerm> = {}): SessionTerm => ({
  id: 'term-123',
  type: 'screen_time',
  content: { minutes: 60 },
  addedBy: 'parent',
  status: 'accepted',
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
  contributor: 'parent' as const,
}

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('AddTermModal', () => {
  describe('basic rendering', () => {
    it('renders when isOpen is true', () => {
      render(<AddTermModal {...defaultProps} />)
      expect(screen.getByTestId('add-term-modal')).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      render(<AddTermModal {...defaultProps} isOpen={false} />)
      expect(screen.queryByTestId('add-term-modal')).not.toBeInTheDocument()
    })

    it('renders custom data-testid when provided', () => {
      render(<AddTermModal {...defaultProps} data-testid="custom-modal" />)
      expect(screen.getByTestId('custom-modal')).toBeInTheDocument()
    })

    it('shows Add New Term title when not editing', () => {
      render(<AddTermModal {...defaultProps} />)
      expect(screen.getByText('Add New Term')).toBeInTheDocument()
    })

    it('shows Edit Term title when editing', () => {
      const term = createMockTerm()
      render(<AddTermModal {...defaultProps} editingTerm={term} />)
      expect(screen.getByText('Edit Term')).toBeInTheDocument()
    })

    it('shows contributor in description', () => {
      render(<AddTermModal {...defaultProps} contributor="child" />)
      expect(screen.getByText(/Child is adding/)).toBeInTheDocument()
    })
  })

  // ============================================
  // TYPE SELECTION TESTS
  // ============================================

  describe('type selection', () => {
    it('shows all 6 term type options', () => {
      render(<AddTermModal {...defaultProps} />)
      expect(screen.getByTestId('term-type-screen_time')).toBeInTheDocument()
      expect(screen.getByTestId('term-type-bedtime')).toBeInTheDocument()
      expect(screen.getByTestId('term-type-monitoring')).toBeInTheDocument()
      expect(screen.getByTestId('term-type-rule')).toBeInTheDocument()
      expect(screen.getByTestId('term-type-consequence')).toBeInTheDocument()
      expect(screen.getByTestId('term-type-reward')).toBeInTheDocument()
    })

    it('shows type label and explanation', () => {
      render(<AddTermModal {...defaultProps} />)
      expect(screen.getByText('Screen Time')).toBeInTheDocument()
      expect(screen.getByText(/How much time you can use screens/)).toBeInTheDocument()
    })

    it('advances to content form when type is selected', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-screen_time'))

      expect(screen.getByTestId('input-minutes')).toBeInTheDocument()
    })

    it('skips type selection when initialType provided', () => {
      render(<AddTermModal {...defaultProps} initialType="bedtime" />)
      expect(screen.getByTestId('input-time')).toBeInTheDocument()
    })

    it('skips type selection when editing', () => {
      const term = createMockTerm({ type: 'rule', content: { text: 'Test rule' } })
      render(<AddTermModal {...defaultProps} editingTerm={term} />)
      expect(screen.getByTestId('input-text')).toBeInTheDocument()
    })
  })

  // ============================================
  // SCREEN TIME FORM TESTS
  // ============================================

  describe('screen_time form', () => {
    it('renders minutes input', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-screen_time'))

      expect(screen.getByTestId('input-minutes')).toBeInTheDocument()
    })

    it('shows validation error when minutes empty', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-screen_time'))
      await user.click(screen.getByText('Add Term'))

      expect(screen.getByText(/Please enter a valid number/)).toBeInTheDocument()
    })

    it('saves with valid minutes', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} onSave={onSave} />)

      await user.click(screen.getByTestId('term-type-screen_time'))
      await user.type(screen.getByTestId('input-minutes'), '90')
      await user.click(screen.getByText('Add Term'))

      expect(onSave).toHaveBeenCalledWith({
        type: 'screen_time',
        content: { minutes: 90 },
      })
    })
  })

  // ============================================
  // BEDTIME FORM TESTS
  // ============================================

  describe('bedtime form', () => {
    it('renders time input', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-bedtime'))

      expect(screen.getByTestId('input-time')).toBeInTheDocument()
    })

    it('shows validation error when time empty', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-bedtime'))
      await user.click(screen.getByText('Add Term'))

      expect(screen.getByText(/Please select a bedtime/)).toBeInTheDocument()
    })

    it('saves with valid time', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} onSave={onSave} />)

      await user.click(screen.getByTestId('term-type-bedtime'))

      const timeInput = screen.getByTestId('input-time')
      fireEvent.change(timeInput, { target: { value: '20:00' } })

      await user.click(screen.getByText('Add Term'))

      expect(onSave).toHaveBeenCalledWith({
        type: 'bedtime',
        content: { time: '20:00' },
      })
    })
  })

  // ============================================
  // MONITORING FORM TESTS
  // ============================================

  describe('monitoring form', () => {
    it('renders monitoring level options', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-monitoring'))

      expect(screen.getByTestId('input-level-light')).toBeInTheDocument()
      expect(screen.getByTestId('input-level-moderate')).toBeInTheDocument()
      expect(screen.getByTestId('input-level-comprehensive')).toBeInTheDocument()
    })

    it('shows validation error when level not selected', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-monitoring'))
      await user.click(screen.getByText('Add Term'))

      expect(screen.getByText(/Please select a monitoring level/)).toBeInTheDocument()
    })

    it('saves with selected level', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} onSave={onSave} />)

      await user.click(screen.getByTestId('term-type-monitoring'))
      await user.click(screen.getByTestId('input-level-moderate'))
      await user.click(screen.getByText('Add Term'))

      expect(onSave).toHaveBeenCalledWith({
        type: 'monitoring',
        content: { level: 'moderate' },
      })
    })
  })

  // ============================================
  // RULE FORM TESTS
  // ============================================

  describe('rule form', () => {
    it('renders text input', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-rule'))

      expect(screen.getByTestId('input-text')).toBeInTheDocument()
    })

    it('shows validation error when text empty', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-rule'))
      await user.click(screen.getByText('Add Term'))

      expect(screen.getByText(/Please enter a description/)).toBeInTheDocument()
    })

    it('saves with valid text', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} onSave={onSave} />)

      await user.click(screen.getByTestId('term-type-rule'))
      await user.type(screen.getByTestId('input-text'), 'No phones at dinner')
      await user.click(screen.getByText('Add Term'))

      expect(onSave).toHaveBeenCalledWith({
        type: 'rule',
        content: { text: 'No phones at dinner' },
      })
    })
  })

  // ============================================
  // CONSEQUENCE FORM TESTS
  // ============================================

  describe('consequence form', () => {
    it('renders text input for consequence', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-consequence'))

      expect(screen.getByTestId('input-text')).toBeInTheDocument()
      expect(screen.getByText(/What happens if the rules are not followed/)).toBeInTheDocument()
    })
  })

  // ============================================
  // REWARD FORM TESTS
  // ============================================

  describe('reward form', () => {
    it('renders text input for reward', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-reward'))

      expect(screen.getByTestId('input-text')).toBeInTheDocument()
      expect(screen.getByText(/What reward for following the rules/)).toBeInTheDocument()
    })
  })

  // ============================================
  // EDITING TESTS
  // ============================================

  describe('editing', () => {
    it('pre-fills form with existing term content', () => {
      const term = createMockTerm({ type: 'screen_time', content: { minutes: 120 } })
      render(<AddTermModal {...defaultProps} editingTerm={term} />)

      expect(screen.getByTestId('input-minutes')).toHaveValue(120)
    })

    it('shows Save Changes button when editing', () => {
      const term = createMockTerm()
      render(<AddTermModal {...defaultProps} editingTerm={term} />)

      expect(screen.getByText('Save Changes')).toBeInTheDocument()
    })

    it('does not show Change type button when editing', () => {
      const term = createMockTerm()
      render(<AddTermModal {...defaultProps} editingTerm={term} />)

      expect(screen.queryByText('Change')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // CLOSE/CANCEL TESTS
  // ============================================

  describe('close/cancel', () => {
    it('calls onClose when cancel clicked', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} onClose={onClose} />)

      await user.click(screen.getByText('Cancel'))

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when X button clicked', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} onClose={onClose} />)

      await user.click(screen.getByRole('button', { name: /close modal/i }))

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose on Escape key', () => {
      const onClose = vi.fn()
      render(<AddTermModal {...defaultProps} onClose={onClose} />)

      fireEvent.keyDown(screen.getByTestId('add-term-modal'), { key: 'Escape' })

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when clicking backdrop', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      const { container } = render(<AddTermModal {...defaultProps} onClose={onClose} />)

      // Click the backdrop (fixed inset-0 element)
      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50')
      if (backdrop) {
        await user.click(backdrop)
      }

      expect(onClose).toHaveBeenCalled()
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has role="dialog"', () => {
      render(<AddTermModal {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-modal="true"', () => {
      render(<AddTermModal {...defaultProps} />)
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('has aria-labelledby for title', () => {
      render(<AddTermModal {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('has aria-describedby for description', () => {
      render(<AddTermModal {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-describedby')
    })

    it('close button has aria-label', () => {
      render(<AddTermModal {...defaultProps} />)
      expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument()
    })

    it('buttons meet touch target size (NFR49)', () => {
      render(<AddTermModal {...defaultProps} />)
      const closeButton = screen.getByRole('button', { name: /close modal/i })
      expect(closeButton.className).toContain('min-h-[44px]')
      expect(closeButton.className).toContain('min-w-[44px]')
    })

    it('validation errors have role="alert"', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-screen_time'))
      await user.click(screen.getByText('Add Term'))

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  // ============================================
  // CHANGE TYPE TESTS
  // ============================================

  describe('change type', () => {
    it('shows Change button after selecting type', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-screen_time'))

      expect(screen.getByText('Change')).toBeInTheDocument()
    })

    it('returns to type selection when Change clicked', async () => {
      const user = userEvent.setup()
      render(<AddTermModal {...defaultProps} />)

      await user.click(screen.getByTestId('term-type-screen_time'))
      await user.click(screen.getByText('Change'))

      expect(screen.getByTestId('term-type-screen_time')).toBeInTheDocument()
      expect(screen.queryByTestId('input-minutes')).not.toBeInTheDocument()
    })
  })
})
