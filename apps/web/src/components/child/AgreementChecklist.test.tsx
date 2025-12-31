/**
 * AgreementChecklist Component Tests - Story 19C.3
 *
 * Task 6: Add component tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgreementChecklist } from './AgreementChecklist'

describe('AgreementChecklist', () => {
  const defaultProps = {
    screenshotsEnabled: true,
    appsTracked: true,
    captureFrequency: 'Every 5 minutes',
    retentionPeriod: '30 days',
  }

  describe('Task 6.1: Displays all required items', () => {
    it('should render with correct test id', () => {
      render(<AgreementChecklist {...defaultProps} />)
      expect(screen.getByTestId('agreement-checklist')).toBeInTheDocument()
    })

    it('should display screenshots status item', () => {
      render(<AgreementChecklist {...defaultProps} />)
      expect(screen.getByTestId('checklist-item-screenshots')).toBeInTheDocument()
    })

    it('should display apps tracked status item', () => {
      render(<AgreementChecklist {...defaultProps} />)
      expect(screen.getByTestId('checklist-item-apps')).toBeInTheDocument()
    })

    it('should display frequency item', () => {
      render(<AgreementChecklist {...defaultProps} />)
      expect(screen.getByTestId('checklist-item-frequency')).toBeInTheDocument()
    })

    it('should display duration item', () => {
      render(<AgreementChecklist {...defaultProps} />)
      expect(screen.getByTestId('checklist-item-duration')).toBeInTheDocument()
    })
  })

  describe('Task 6.2: Expand/collapse functionality', () => {
    it('should not show details initially', () => {
      render(<AgreementChecklist {...defaultProps} />)
      expect(screen.queryByTestId('checklist-item-screenshots-details')).not.toBeInTheDocument()
    })

    it('should show details when item is clicked', () => {
      render(<AgreementChecklist {...defaultProps} />)
      const screenshotsItem = screen.getByTestId('checklist-item-screenshots')

      fireEvent.click(screenshotsItem)

      expect(screen.getByTestId('checklist-item-screenshots-details')).toBeInTheDocument()
    })

    it('should hide details when expanded item is clicked again', () => {
      render(<AgreementChecklist {...defaultProps} />)
      const screenshotsItem = screen.getByTestId('checklist-item-screenshots')

      fireEvent.click(screenshotsItem)
      expect(screen.getByTestId('checklist-item-screenshots-details')).toBeInTheDocument()

      fireEvent.click(screenshotsItem)
      expect(screen.queryByTestId('checklist-item-screenshots-details')).not.toBeInTheDocument()
    })

    it('should allow multiple items to be expanded', () => {
      render(<AgreementChecklist {...defaultProps} />)

      fireEvent.click(screen.getByTestId('checklist-item-screenshots'))
      fireEvent.click(screen.getByTestId('checklist-item-apps'))

      expect(screen.getByTestId('checklist-item-screenshots-details')).toBeInTheDocument()
      expect(screen.getByTestId('checklist-item-apps-details')).toBeInTheDocument()
    })
  })

  describe('Task 6.3: Child-friendly language', () => {
    it('should display child-friendly label for screenshots', () => {
      render(<AgreementChecklist {...defaultProps} />)
      expect(screen.getByText(/pictures of your screen/i)).toBeInTheDocument()
    })

    it('should display Yes when screenshots enabled', () => {
      render(<AgreementChecklist {...defaultProps} screenshotsEnabled={true} />)
      const screenshotsItem = screen.getByTestId('checklist-item-screenshots')
      expect(screenshotsItem).toHaveTextContent('Yes')
    })

    it('should display No when screenshots disabled', () => {
      render(<AgreementChecklist {...defaultProps} screenshotsEnabled={false} />)
      const screenshotsItem = screen.getByTestId('checklist-item-screenshots')
      expect(screenshotsItem).toHaveTextContent('No')
    })

    it('should display child-friendly frequency', () => {
      render(<AgreementChecklist {...defaultProps} />)
      expect(screen.getByText(/every 5 minutes/i)).toBeInTheDocument()
    })

    it('should display child-friendly duration', () => {
      render(<AgreementChecklist {...defaultProps} />)
      expect(screen.getByText(/30 days/i)).toBeInTheDocument()
    })
  })

  describe('Task 6.4: Accessibility', () => {
    it('should support keyboard navigation with Enter key', () => {
      render(<AgreementChecklist {...defaultProps} />)
      const screenshotsItem = screen.getByTestId('checklist-item-screenshots')

      screenshotsItem.focus()
      fireEvent.keyDown(screenshotsItem, { key: 'Enter' })

      expect(screen.getByTestId('checklist-item-screenshots-details')).toBeInTheDocument()
    })

    it('should support keyboard navigation with Space key', () => {
      render(<AgreementChecklist {...defaultProps} />)
      const screenshotsItem = screen.getByTestId('checklist-item-screenshots')

      screenshotsItem.focus()
      fireEvent.keyDown(screenshotsItem, { key: ' ' })

      expect(screen.getByTestId('checklist-item-screenshots-details')).toBeInTheDocument()
    })

    it('should have appropriate role for checklist items', () => {
      render(<AgreementChecklist {...defaultProps} />)
      const screenshotsItem = screen.getByTestId('checklist-item-screenshots')

      expect(screenshotsItem).toHaveAttribute('role', 'button')
    })

    it('should have tabIndex for keyboard focus', () => {
      render(<AgreementChecklist {...defaultProps} />)
      const screenshotsItem = screen.getByTestId('checklist-item-screenshots')

      expect(screenshotsItem).toHaveAttribute('tabIndex', '0')
    })

    it('should have aria-expanded attribute', () => {
      render(<AgreementChecklist {...defaultProps} />)
      const screenshotsItem = screen.getByTestId('checklist-item-screenshots')

      expect(screenshotsItem).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(screenshotsItem)

      expect(screenshotsItem).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Task 6.5: Visual indicators', () => {
    it('should show green indicator for Yes state', () => {
      render(<AgreementChecklist {...defaultProps} screenshotsEnabled={true} />)
      const indicator = screen.getByTestId('checklist-indicator-screenshots')
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(34, 197, 94)' })
    })

    it('should show gray indicator for No state', () => {
      render(<AgreementChecklist {...defaultProps} screenshotsEnabled={false} />)
      const indicator = screen.getByTestId('checklist-indicator-screenshots')
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(156, 163, 175)' })
    })

    it('should show checkmark icon for enabled features', () => {
      render(<AgreementChecklist {...defaultProps} screenshotsEnabled={true} />)
      const indicator = screen.getByTestId('checklist-indicator-screenshots')
      expect(indicator).toHaveTextContent('✓')
    })

    it('should show X icon for disabled features', () => {
      render(<AgreementChecklist {...defaultProps} screenshotsEnabled={false} />)
      const indicator = screen.getByTestId('checklist-indicator-screenshots')
      expect(indicator).toHaveTextContent('✗')
    })
  })

  describe('Edge cases', () => {
    it('should handle null captureFrequency', () => {
      render(<AgreementChecklist {...defaultProps} captureFrequency={null} />)
      const frequencyItem = screen.getByTestId('checklist-item-frequency')
      expect(frequencyItem).toHaveTextContent(/not set/i)
    })

    it('should handle null retentionPeriod', () => {
      render(<AgreementChecklist {...defaultProps} retentionPeriod={null} />)
      const durationItem = screen.getByTestId('checklist-item-duration')
      expect(durationItem).toHaveTextContent(/not set/i)
    })
  })
})
