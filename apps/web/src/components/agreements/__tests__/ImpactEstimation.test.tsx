/**
 * Tests for ImpactEstimation component.
 *
 * Story 5.5: Agreement Preview & Summary - AC3
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { ImpactEstimation } from '../ImpactEstimation'
import type { AgreementTerm } from '@fledgely/shared/contracts'

describe('ImpactEstimation', () => {
  const createTerm = (overrides: Partial<AgreementTerm>): AgreementTerm => ({
    id: `term-${Math.random()}`,
    text: 'Test term',
    category: 'general',
    party: 'parent',
    order: 0,
    explanation: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  describe('rendering', () => {
    it('should render when time-related terms exist', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time daily' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('impact-estimation')).toBeInTheDocument()
    })

    it('should display header with child name', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByText('What This Means for Alex')).toBeInTheDocument()
    })

    it('should return null when no time-related terms', () => {
      const terms = [createTerm({ category: 'general', text: 'Be respectful' })]
      const { container } = render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(container.firstChild).toBeNull()
    })

    it('should return null when terms have no time values', () => {
      const terms = [createTerm({ category: 'time', text: 'Limit screen time' })]
      const { container } = render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('time parsing', () => {
    it('should parse hours', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      // May appear in both weekday and weekend columns
      const hourTexts = screen.getAllByText('2 hours')
      expect(hourTexts.length).toBeGreaterThan(0)
    })

    it('should parse fractional hours', () => {
      const terms = [createTerm({ category: 'time', text: '1.5 hours gaming' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      // May appear in both weekday and weekend columns
      const timeTexts = screen.getAllByText('1h 30m')
      expect(timeTexts.length).toBeGreaterThan(0)
    })

    it('should parse minutes', () => {
      const terms = [createTerm({ category: 'time', text: '30 minutes of video' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      // May appear in both weekday and weekend columns
      const minTexts = screen.getAllByText('30 minutes')
      expect(minTexts.length).toBeGreaterThan(0)
    })

    it('should parse "1 hour" singular', () => {
      const terms = [createTerm({ category: 'time', text: '1 hour screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      // May appear in both weekday and weekend columns
      const hourTexts = screen.getAllByText('1 hour')
      expect(hourTexts.length).toBeGreaterThan(0)
    })

    it('should parse "mins" abbreviation', () => {
      const terms = [createTerm({ category: 'time', text: '45 mins gaming' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      // May appear in both weekday and weekend columns
      const minTexts = screen.getAllByText('45 minutes')
      expect(minTexts.length).toBeGreaterThan(0)
    })
  })

  describe('category detection', () => {
    it('should detect time category terms', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours daily' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('impact-estimation')).toBeInTheDocument()
    })

    it('should detect screen-related terms', () => {
      const terms = [createTerm({ category: 'general', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('impact-estimation')).toBeInTheDocument()
    })

    it('should detect device terms', () => {
      const terms = [createTerm({ category: 'general', text: '1 hour on devices' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('impact-estimation')).toBeInTheDocument()
    })

    it('should detect phone terms', () => {
      const terms = [createTerm({ category: 'general', text: '30 minutes phone use' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('impact-estimation')).toBeInTheDocument()
    })

    it('should detect gaming terms', () => {
      const terms = [createTerm({ category: 'general', text: '1 hour gaming' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('impact-estimation')).toBeInTheDocument()
    })

    it('should detect video terms', () => {
      const terms = [createTerm({ category: 'general', text: '2 hours video watching' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('impact-estimation')).toBeInTheDocument()
    })

    it('should detect TV terms', () => {
      const terms = [createTerm({ category: 'general', text: '1 hour TV' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('impact-estimation')).toBeInTheDocument()
    })
  })

  describe('weekday/weekend context', () => {
    it('should detect weekday terms', () => {
      const terms = [createTerm({ category: 'time', text: '1 hour on weekdays' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('weekday-impact')).toBeInTheDocument()
      expect(screen.queryByTestId('weekend-impact')).not.toBeInTheDocument()
    })

    it('should detect school day terms', () => {
      const terms = [createTerm({ category: 'time', text: '1 hour on school days' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('weekday-impact')).toBeInTheDocument()
    })

    it('should detect weekend terms', () => {
      const terms = [createTerm({ category: 'time', text: '3 hours on weekends' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('weekend-impact')).toBeInTheDocument()
      expect(screen.queryByTestId('weekday-impact')).not.toBeInTheDocument()
    })

    it('should detect Saturday terms as weekend', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours on Saturday' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('weekend-impact')).toBeInTheDocument()
    })

    it('should treat generic terms as both weekday and weekend', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('weekday-impact')).toBeInTheDocument()
      expect(screen.getByTestId('weekend-impact')).toBeInTheDocument()
    })
  })

  describe('weekly total calculation', () => {
    it('should calculate weekly total from daily amounts', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      // 2 hours * 7 days = 14 hours
      expect(screen.getByTestId('weekly-impact')).toBeInTheDocument()
      expect(screen.getByText('14 hours')).toBeInTheDocument()
    })

    it('should calculate weekly total with different weekday/weekend amounts', () => {
      const terms = [
        createTerm({ id: '1', category: 'time', text: '1 hour on weekdays' }),
        createTerm({ id: '2', category: 'time', text: '3 hours on weekends' }),
      ]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      // 1 hour * 5 weekdays + 3 hours * 2 weekend days = 11 hours
      expect(screen.getByText('11 hours')).toBeInTheDocument()
    })
  })

  describe('details breakdown', () => {
    it('should have expandable details section', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('impact-details-toggle')).toBeInTheDocument()
    })

    it('should show breakdown when details expanded', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      fireEvent.click(screen.getByTestId('impact-details-toggle'))

      expect(screen.getByTestId('impact-breakdown')).toBeInTheDocument()
    })

    it('should show time context in breakdown', () => {
      const terms = [createTerm({ category: 'time', text: '1 hour on weekdays' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      fireEvent.click(screen.getByTestId('impact-details-toggle'))

      expect(screen.getByText('1 hour on school days')).toBeInTheDocument()
    })

    it('should show both contexts for generic terms', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      fireEvent.click(screen.getByTestId('impact-details-toggle'))

      expect(screen.getByText(/2 hours \(weekdays\) \/ 2 hours \(weekends\)/)).toBeInTheDocument()
    })
  })

  describe('encouraging note', () => {
    it('should display encouraging message', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(
        screen.getByText(/balance between screen time and other activities/)
      ).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have region role', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('should have aria-label on container', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Time impact estimation')
    })

    it('should meet minimum touch target for toggle', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('impact-details-toggle')).toHaveClass('min-h-[44px]')
    })
  })

  describe('multiple terms', () => {
    it('should aggregate multiple time terms', () => {
      const terms = [
        createTerm({ id: '1', category: 'time', text: '1 hour gaming' }),
        createTerm({ id: '2', category: 'time', text: '1 hour video' }),
      ]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      // Total: 2 hours weekday, 2 hours weekend
      expect(screen.getByTestId('weekday-impact')).toHaveTextContent('2 hours')
    })

    it('should handle mix of weekday and weekend terms', () => {
      const terms = [
        createTerm({ id: '1', category: 'time', text: '30 minutes on weekdays' }),
        createTerm({ id: '2', category: 'time', text: '2 hours on weekends' }),
      ]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      expect(screen.getByTestId('weekday-impact')).toHaveTextContent('30 minutes')
      expect(screen.getByTestId('weekend-impact')).toHaveTextContent('2 hours')
    })
  })

  describe('styling', () => {
    it('should use amber color scheme', () => {
      const terms = [createTerm({ category: 'time', text: '2 hours screen time' })]
      render(<ImpactEstimation terms={terms} childName="Alex" />)

      const container = screen.getByTestId('impact-estimation')
      expect(container).toHaveClass('bg-amber-50')
    })
  })
})
