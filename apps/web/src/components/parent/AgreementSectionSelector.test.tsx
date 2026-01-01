/**
 * AgreementSectionSelector Component Tests - Story 34.1
 *
 * Tests for section selection UI in agreement proposal flow.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgreementSectionSelector } from './AgreementSectionSelector'

describe('AgreementSectionSelector - Story 34.1', () => {
  const mockSections = [
    { id: 'time-limits', name: 'Time Limits', description: 'Daily screen time limits' },
    {
      id: 'app-restrictions',
      name: 'App Restrictions',
      description: 'Blocked and limited apps',
    },
    {
      id: 'monitoring',
      name: 'Monitoring Settings',
      description: 'Usage tracking preferences',
    },
    { id: 'bedtime', name: 'Bedtime Rules', description: 'Device curfew settings' },
  ]

  const defaultProps = {
    sections: mockSections,
    selectedIds: [] as string[],
    onSelectionChange: vi.fn(),
  }

  describe('section display', () => {
    it('should display all sections', () => {
      render(<AgreementSectionSelector {...defaultProps} />)

      expect(screen.getByText('Time Limits')).toBeInTheDocument()
      expect(screen.getByText('App Restrictions')).toBeInTheDocument()
      expect(screen.getByText('Monitoring Settings')).toBeInTheDocument()
      expect(screen.getByText('Bedtime Rules')).toBeInTheDocument()
    })

    it('should display section descriptions', () => {
      render(<AgreementSectionSelector {...defaultProps} />)

      expect(screen.getByText('Daily screen time limits')).toBeInTheDocument()
      expect(screen.getByText('Blocked and limited apps')).toBeInTheDocument()
    })

    it('should render checkboxes for each section', () => {
      render(<AgreementSectionSelector {...defaultProps} />)

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(4)
    })
  })

  describe('selection behavior', () => {
    it('should call onSelectionChange when section is selected', () => {
      const onSelectionChange = vi.fn()
      render(<AgreementSectionSelector {...defaultProps} onSelectionChange={onSelectionChange} />)

      const timeLimitsCheckbox = screen.getByLabelText('Time Limits')
      fireEvent.click(timeLimitsCheckbox)

      expect(onSelectionChange).toHaveBeenCalledWith(['time-limits'])
    })

    it('should call onSelectionChange when section is deselected', () => {
      const onSelectionChange = vi.fn()
      render(
        <AgreementSectionSelector
          {...defaultProps}
          selectedIds={['time-limits']}
          onSelectionChange={onSelectionChange}
        />
      )

      const timeLimitsCheckbox = screen.getByLabelText('Time Limits')
      fireEvent.click(timeLimitsCheckbox)

      expect(onSelectionChange).toHaveBeenCalledWith([])
    })

    it('should allow multiple selections', () => {
      const onSelectionChange = vi.fn()
      render(
        <AgreementSectionSelector
          {...defaultProps}
          selectedIds={['time-limits']}
          onSelectionChange={onSelectionChange}
        />
      )

      const appRestrictionsCheckbox = screen.getByLabelText('App Restrictions')
      fireEvent.click(appRestrictionsCheckbox)

      expect(onSelectionChange).toHaveBeenCalledWith(['time-limits', 'app-restrictions'])
    })

    it('should show checkboxes as checked for selected sections', () => {
      render(
        <AgreementSectionSelector {...defaultProps} selectedIds={['time-limits', 'bedtime']} />
      )

      const timeLimitsCheckbox = screen.getByLabelText('Time Limits') as HTMLInputElement
      const bedtimeCheckbox = screen.getByLabelText('Bedtime Rules') as HTMLInputElement
      const appRestrictionsCheckbox = screen.getByLabelText('App Restrictions') as HTMLInputElement

      expect(timeLimitsCheckbox.checked).toBe(true)
      expect(bedtimeCheckbox.checked).toBe(true)
      expect(appRestrictionsCheckbox.checked).toBe(false)
    })
  })

  describe('empty state', () => {
    it('should show message when no sections available', () => {
      render(<AgreementSectionSelector {...defaultProps} sections={[]} />)

      expect(screen.getByText(/no sections available/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible labels for checkboxes', () => {
      render(<AgreementSectionSelector {...defaultProps} />)

      mockSections.forEach((section) => {
        expect(screen.getByLabelText(section.name)).toBeInTheDocument()
      })
    })

    it('should have a group role for the section list', () => {
      render(<AgreementSectionSelector {...defaultProps} />)

      expect(screen.getByRole('group')).toBeInTheDocument()
    })
  })
})
