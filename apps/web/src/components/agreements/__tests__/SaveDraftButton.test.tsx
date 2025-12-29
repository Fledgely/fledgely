/**
 * Tests for SaveDraftButton component.
 *
 * Story 5.7: Draft Saving & Version History - AC2
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SaveDraftButton } from '../SaveDraftButton'

describe('SaveDraftButton', () => {
  describe('rendering', () => {
    it('should render save draft button', () => {
      render(<SaveDraftButton onSave={vi.fn()} status="saved" isDirty={true} />)

      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument()
    })

    it('should display save icon', () => {
      render(<SaveDraftButton onSave={vi.fn()} status="saved" isDirty={true} />)

      expect(screen.getByText('💾')).toBeInTheDocument()
    })

    it('should have test ID', () => {
      render(<SaveDraftButton onSave={vi.fn()} status="saved" isDirty={true} />)

      expect(screen.getByTestId('save-draft-button')).toBeInTheDocument()
    })
  })

  describe('disabled states', () => {
    it('should be disabled when not dirty', () => {
      render(<SaveDraftButton onSave={vi.fn()} status="saved" isDirty={false} />)

      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should be disabled when saving', () => {
      render(<SaveDraftButton onSave={vi.fn()} status="saving" isDirty={true} />)

      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should be disabled when disabled prop is true', () => {
      render(<SaveDraftButton onSave={vi.fn()} status="saved" isDirty={true} disabled={true} />)

      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should be enabled when dirty and not saving', () => {
      render(<SaveDraftButton onSave={vi.fn()} status="unsaved" isDirty={true} />)

      expect(screen.getByRole('button')).not.toBeDisabled()
    })
  })

  describe('saving state', () => {
    it('should show saving text when saving', () => {
      render(<SaveDraftButton onSave={vi.fn()} status="saving" isDirty={true} />)

      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    it('should show spinning icon when saving', () => {
      render(<SaveDraftButton onSave={vi.fn()} status="saving" isDirty={true} />)

      expect(screen.getByText('↻')).toBeInTheDocument()
    })

    it('should have accessible label when saving', () => {
      render(<SaveDraftButton onSave={vi.fn()} status="saving" isDirty={true} />)

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Saving draft...')
    })
  })

  describe('click handling', () => {
    it('should call onSave when clicked', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      render(<SaveDraftButton onSave={onSave} status="unsaved" isDirty={true} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button'))
      })

      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it('should not call onSave when disabled', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      render(<SaveDraftButton onSave={onSave} status="saved" isDirty={false} />)

      fireEvent.click(screen.getByRole('button'))

      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('confirmation toast', () => {
    it('should show confirmation after save completes', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      render(<SaveDraftButton onSave={onSave} status="unsaved" isDirty={true} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button'))
        // Allow promise to resolve
        await Promise.resolve()
      })

      expect(screen.getByTestId('save-confirmation')).toBeInTheDocument()
      expect(screen.getByText(/draft saved successfully/i)).toBeInTheDocument()
    })

    it('should have alert role for confirmation', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      render(<SaveDraftButton onSave={onSave} status="unsaved" isDirty={true} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button'))
        await Promise.resolve()
      })

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should meet minimum touch target size', () => {
      render(<SaveDraftButton onSave={vi.fn()} status="saved" isDirty={true} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('min-h-[44px]')
    })

    it('should have accessible name', () => {
      render(<SaveDraftButton onSave={vi.fn()} status="saved" isDirty={true} />)

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Save draft')
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(
        <SaveDraftButton onSave={vi.fn()} status="saved" isDirty={true} className="custom-class" />
      )

      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })
  })
})
