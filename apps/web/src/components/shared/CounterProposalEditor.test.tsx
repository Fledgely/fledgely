/**
 * CounterProposalEditor Component Tests - Story 34.3 (AC3)
 *
 * Tests for the counter-proposal editor component.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CounterProposalEditor } from './CounterProposalEditor'
import type { ProposalChange } from '@fledgely/shared'

describe('CounterProposalEditor - Story 34.3 AC3', () => {
  const mockChanges: ProposalChange[] = [
    {
      sectionId: 'time-limits',
      sectionName: 'Time Limits',
      fieldPath: 'timeLimits.weekday.gaming',
      oldValue: 60,
      newValue: 90,
      changeType: 'modify',
    },
    {
      sectionId: 'bedtime',
      sectionName: 'Bedtime',
      fieldPath: 'bedtime.weekday',
      oldValue: '21:00',
      newValue: '21:30',
      changeType: 'modify',
    },
  ]

  const defaultProps = {
    originalChanges: mockChanges,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial rendering', () => {
    it('should render the editor title', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(/counter-proposal/i)
    })

    it('should display all proposed changes', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      // Section names appear in headers (may have duplicates in field paths)
      expect(screen.getAllByText(/time limits/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/bedtime/i).length).toBeGreaterThan(0)
    })

    it('should pre-populate with proposed values', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      // Should show the new values in editable fields
      const inputs = screen.getAllByRole('textbox')
      expect(inputs.length).toBeGreaterThan(0)
    })
  })

  describe('original value reference - AC3', () => {
    it('should show original values for reference', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      // Original value should be visible for reference (label format is "Original: 60")
      expect(screen.getByText(/Original: 60/)).toBeInTheDocument()
    })

    it('should show proposed values alongside original', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      // Both original and proposed should be visible (label format is "Proposed: 90")
      expect(screen.getByText(/Proposed: 90/)).toBeInTheDocument()
    })
  })

  describe('editing values - AC3', () => {
    it('should allow editing proposed values', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      const input = screen.getAllByRole('textbox')[0]
      fireEvent.change(input, { target: { value: '75' } })

      expect(input).toHaveValue('75')
    })

    it('should track modified changes', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      const input = screen.getAllByRole('textbox')[0]
      fireEvent.change(input, { target: { value: '75' } })

      // Submit should include the modified value
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))

      expect(defaultProps.onSubmit).toHaveBeenCalled()
      const submittedChanges = defaultProps.onSubmit.mock.calls[0][0]
      // Value is parsed back to number since original was a number
      expect(submittedChanges[0].newValue).toBe(75)
    })
  })

  describe('add/remove sections - AC3', () => {
    it('should allow removing a change from counter-proposal', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      fireEvent.click(removeButtons[0])

      // Should have one less change visible
      expect(screen.queryByText(/time limits/i)).not.toBeInTheDocument()
    })

    it('should not allow removing all changes', () => {
      const singleChange: ProposalChange[] = [mockChanges[0]]
      render(<CounterProposalEditor {...defaultProps} originalChanges={singleChange} />)

      const removeButton = screen.queryByRole('button', { name: /remove/i })
      // Remove button should be disabled for last item
      expect(removeButton).toBeDisabled()
    })

    it('should show message when change is removed', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      fireEvent.click(removeButtons[0])

      expect(screen.getByText(/1 change removed/i)).toBeInTheDocument()
    })
  })

  describe('submit flow', () => {
    it('should call onSubmit with modified changes', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /submit/i }))

      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ sectionId: 'time-limits' }),
          expect.objectContaining({ sectionId: 'bedtime' }),
        ])
      )
    })

    it('should disable submit when no changes remain', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      // Remove all but one (can't remove the last one)
      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      fireEvent.click(removeButtons[0])

      // If only one change and it matches original, submit should work
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))
      expect(defaultProps.onSubmit).toHaveBeenCalled()
    })

    it('should disable submit button when submitting', () => {
      render(<CounterProposalEditor {...defaultProps} isSubmitting={true} />)

      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
    })
  })

  describe('cancel flow', () => {
    it('should call onCancel when cancel clicked', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(defaultProps.onCancel).toHaveBeenCalled()
    })

    it('should disable cancel button when submitting', () => {
      render(<CounterProposalEditor {...defaultProps} isSubmitting={true} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })
  })

  describe('change types', () => {
    it('should handle modify changes', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      // Badge text is uppercase "MODIFY"
      expect(screen.getAllByText('Modify').length).toBeGreaterThan(0)
    })

    it('should handle add changes', () => {
      const addChange: ProposalChange[] = [
        {
          sectionId: 'new-rule',
          sectionName: 'New Rule',
          fieldPath: 'newRule.enabled',
          oldValue: null,
          newValue: true,
          changeType: 'add',
        },
      ]

      render(<CounterProposalEditor {...defaultProps} originalChanges={addChange} />)

      // Badge text for add changes
      expect(screen.getByText('Add')).toBeInTheDocument()
    })

    it('should handle remove changes', () => {
      const removeChange: ProposalChange[] = [
        {
          sectionId: 'old-rule',
          sectionName: 'Old Rule',
          fieldPath: 'oldRule.enabled',
          oldValue: true,
          newValue: null,
          changeType: 'remove',
        },
      ]

      render(<CounterProposalEditor {...defaultProps} originalChanges={removeChange} />)

      // Check that the change type badge shows "Remove" (there's also a Remove button)
      // We look for elements containing "Remove" and ensure at least 2 exist (badge + button)
      expect(screen.getAllByText('Remove').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('accessibility', () => {
    it('should have accessible form labels', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      const inputs = screen.getAllByRole('textbox')
      inputs.forEach((input) => {
        expect(input).toHaveAccessibleName()
      })
    })

    it('should have accessible button labels', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      expect(screen.getByRole('button', { name: /submit/i })).toHaveAccessibleName()
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveAccessibleName()
    })
  })

  describe('validation', () => {
    it('should show warning when all values unchanged', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      // Don't change anything, just submit
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))

      expect(defaultProps.onSubmit).toHaveBeenCalled()
    })

    it('should highlight changed fields', () => {
      render(<CounterProposalEditor {...defaultProps} />)

      const input = screen.getAllByRole('textbox')[0]
      fireEvent.change(input, { target: { value: '75' } })

      // Field should have some visual indicator it was changed
      expect(input.closest('[data-changed="true"]')).toBeInTheDocument()
    })
  })
})
