/**
 * Tests for SaveButton Component
 *
 * Story 5.7: Draft Saving & Version History - Task 3
 *
 * Tests for manual save button with status display and keyboard shortcuts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SaveButton } from '../SaveButton'
import type { SaveStatus } from '../../../../hooks/useAutoSave'

describe('SaveButton', () => {
  const defaultProps = {
    status: 'idle' as SaveStatus,
    lastSaved: null,
    timeSinceLastSave: '',
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render save button', () => {
      render(<SaveButton {...defaultProps} />)
      expect(screen.getByTestId('save-button')).toBeInTheDocument()
    })

    it('should render save button trigger', () => {
      render(<SaveButton {...defaultProps} />)
      expect(screen.getByTestId('save-button-trigger')).toBeInTheDocument()
    })

    it('should show "Not saved yet" when lastSaved is null', () => {
      render(<SaveButton {...defaultProps} />)
      expect(screen.getByText('Not saved yet')).toBeInTheDocument()
    })

    it('should show time since last save when lastSaved is set', () => {
      render(
        <SaveButton
          {...defaultProps}
          lastSaved={new Date()}
          timeSinceLastSave="Just now"
        />
      )
      expect(screen.getByText('Just now')).toBeInTheDocument()
    })
  })

  describe('status display', () => {
    it('should show "Save" text in idle state', () => {
      render(<SaveButton {...defaultProps} status="idle" />)
      expect(screen.getByText('Save')).toBeInTheDocument()
    })

    it('should show "Saving..." text in saving state', () => {
      render(<SaveButton {...defaultProps} status="saving" />)
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    it('should show "Save failed" message in error state', () => {
      render(<SaveButton {...defaultProps} status="error" />)
      expect(screen.getByText('Save failed')).toBeInTheDocument()
    })

    it('should have correct aria-label in idle state', () => {
      render(<SaveButton {...defaultProps} status="idle" />)
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Save your agreement'
      )
    })

    it('should have correct aria-label in saving state', () => {
      render(<SaveButton {...defaultProps} status="saving" />)
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Saving your agreement...'
      )
    })

    it('should have correct aria-label in saved state', () => {
      render(<SaveButton {...defaultProps} status="saved" />)
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Agreement saved. Click to save again.'
      )
    })

    it('should have correct aria-label in error state', () => {
      render(<SaveButton {...defaultProps} status="error" />)
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Save failed. Click to try again.'
      )
    })
  })

  describe('click behavior', () => {
    it('should call onSave when clicked', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()
      render(<SaveButton {...defaultProps} onSave={onSave} />)

      await user.click(screen.getByTestId('save-button-trigger'))

      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it('should not call onSave when disabled', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()
      render(<SaveButton {...defaultProps} onSave={onSave} disabled />)

      await user.click(screen.getByTestId('save-button-trigger'))

      expect(onSave).not.toHaveBeenCalled()
    })

    it('should not call onSave when in saving state', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()
      render(<SaveButton {...defaultProps} onSave={onSave} status="saving" />)

      await user.click(screen.getByTestId('save-button-trigger'))

      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('keyboard shortcut', () => {
    it('should call onSave on Ctrl+S', () => {
      const onSave = vi.fn()
      render(<SaveButton {...defaultProps} onSave={onSave} />)

      fireEvent.keyDown(document, { key: 's', ctrlKey: true })

      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it('should call onSave on Cmd+S (Mac)', () => {
      const onSave = vi.fn()
      render(<SaveButton {...defaultProps} onSave={onSave} />)

      fireEvent.keyDown(document, { key: 's', metaKey: true })

      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it('should prevent default on Ctrl+S', () => {
      const onSave = vi.fn()
      render(<SaveButton {...defaultProps} onSave={onSave} />)

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should not call onSave on Ctrl+S when disabled', () => {
      const onSave = vi.fn()
      render(<SaveButton {...defaultProps} onSave={onSave} disabled />)

      fireEvent.keyDown(document, { key: 's', ctrlKey: true })

      expect(onSave).not.toHaveBeenCalled()
    })

    it('should not call onSave on Ctrl+S when saving', () => {
      const onSave = vi.fn()
      render(<SaveButton {...defaultProps} onSave={onSave} status="saving" />)

      fireEvent.keyDown(document, { key: 's', ctrlKey: true })

      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have minimum 44x44px touch target (NFR49)', () => {
      render(<SaveButton {...defaultProps} />)
      const button = screen.getByTestId('save-button-trigger')
      expect(button).toHaveClass('min-w-[44px]', 'min-h-[44px]')
    })

    it('should have aria-live region for status announcements (NFR42)', () => {
      render(<SaveButton {...defaultProps} />)
      const statusRegion = screen.getByRole('status', { hidden: true }) ||
        document.querySelector('[aria-live="polite"]')
      expect(statusRegion).toBeInTheDocument()
    })

    it('should have alert role for error state', () => {
      render(<SaveButton {...defaultProps} status="error" />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should be keyboard focusable', () => {
      render(<SaveButton {...defaultProps} />)
      const button = screen.getByTestId('save-button-trigger')
      button.focus()
      expect(document.activeElement).toBe(button)
    })
  })

  describe('disabled state', () => {
    it('should have disabled attribute when disabled', () => {
      render(<SaveButton {...defaultProps} disabled />)
      expect(screen.getByTestId('save-button-trigger')).toBeDisabled()
    })

    it('should have disabled attribute when saving', () => {
      render(<SaveButton {...defaultProps} status="saving" />)
      expect(screen.getByTestId('save-button-trigger')).toBeDisabled()
    })

    it('should have cursor-not-allowed class when disabled', () => {
      render(<SaveButton {...defaultProps} disabled />)
      expect(screen.getByTestId('save-button-trigger')).toHaveClass('cursor-not-allowed')
    })
  })

  describe('custom props', () => {
    it('should apply custom className', () => {
      render(<SaveButton {...defaultProps} className="custom-class" />)
      expect(screen.getByTestId('save-button')).toHaveClass('custom-class')
    })

    it('should use custom data-testid', () => {
      render(<SaveButton {...defaultProps} data-testid="custom-save" />)
      expect(screen.getByTestId('custom-save')).toBeInTheDocument()
    })
  })
})
