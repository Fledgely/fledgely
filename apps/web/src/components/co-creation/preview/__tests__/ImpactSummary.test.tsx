/**
 * Tests for ImpactSummary Component
 *
 * Story 5.5: Agreement Preview & Summary - Task 4.7
 *
 * Tests for the impact summary display component.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImpactSummary } from '../ImpactSummary'
import type { ImpactEstimate } from '@fledgely/contracts'

// ============================================
// TEST FIXTURES
// ============================================

const createMockImpact = (
  overrides: Partial<ImpactEstimate> = {}
): ImpactEstimate => ({
  screenTime: {
    daily: 120,
    weekly: 840,
    description: '2 hours per day',
  },
  bedtime: {
    weekday: '9:00 PM',
    weekend: '10:00 PM',
  },
  monitoring: {
    level: 'moderate',
    description: 'Regular check-ins with weekly reviews',
  },
  ...overrides,
})

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('ImpactSummary', () => {
  describe('basic rendering', () => {
    it('renders the component', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByTestId('impact-summary')).toBeInTheDocument()
    })

    it('renders custom data-testid', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} data-testid="custom-impact" />)
      expect(screen.getByTestId('custom-impact')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} className="custom-class" />)
      expect(screen.getByTestId('impact-summary')).toHaveClass('custom-class')
    })

    it('shows header', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('Daily & Weekly Impact')).toBeInTheDocument()
    })
  })

  // ============================================
  // EMPTY STATE TESTS
  // ============================================

  describe('empty state', () => {
    it('shows empty message when no impact data', () => {
      render(<ImpactSummary impact={{}} />)
      expect(screen.getByText('No impact estimates available.')).toBeInTheDocument()
    })

    it('has status role for empty state', () => {
      render(<ImpactSummary impact={{}} />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  // ============================================
  // SCREEN TIME CARD TESTS (AC #4)
  // ============================================

  describe('screen time card (AC #4)', () => {
    it('renders screen time card', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByTestId('impact-screen-time')).toBeInTheDocument()
    })

    it('shows screen time title', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('Screen Time')).toBeInTheDocument()
    })

    it('shows formatted time', () => {
      const impact = createMockImpact({
        screenTime: { daily: 120, weekly: 840, description: '2 hours per day' },
      })
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('2h')).toBeInTheDocument()
      expect(screen.getByText('per day')).toBeInTheDocument()
    })

    it('shows description', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('2 hours per day')).toBeInTheDocument()
    })

    it('shows weekly total', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText(/14 hours each week/)).toBeInTheDocument()
    })

    it('shows hours and minutes together', () => {
      const impact = createMockImpact({
        screenTime: { daily: 90, weekly: 630, description: '1.5 hours per day' },
      })
      render(<ImpactSummary impact={impact} />)
      // Hours and minutes are rendered in the same span
      const screenTimeCard = screen.getByTestId('impact-screen-time')
      expect(screenTimeCard.textContent).toContain('1h')
      expect(screenTimeCard.textContent).toContain('30m')
    })

    it('shows only minutes when less than 60', () => {
      const impact = createMockImpact({
        screenTime: { daily: 45, weekly: 315, description: '45 minutes per day' },
      })
      render(<ImpactSummary impact={impact} />)
      const screenTimeCard = screen.getByTestId('impact-screen-time')
      expect(screenTimeCard.textContent).toContain('45m')
    })

    it('does not render when screenTime is missing', () => {
      const impact = createMockImpact({
        screenTime: undefined,
        bedtime: { weekday: '9:00 PM' },
      })
      render(<ImpactSummary impact={impact} />)
      expect(screen.queryByTestId('impact-screen-time')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // BEDTIME CARD TESTS
  // ============================================

  describe('bedtime card', () => {
    it('renders bedtime card', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByTestId('impact-bedtime')).toBeInTheDocument()
    })

    it('shows bedtime title', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('Device Bedtime')).toBeInTheDocument()
    })

    it('shows weekday time', () => {
      const impact = createMockImpact({
        bedtime: { weekday: '9:00 PM', weekend: '10:00 PM' },
      })
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('9:00 PM')).toBeInTheDocument()
    })

    it('shows different weekend time', () => {
      const impact = createMockImpact({
        bedtime: { weekday: '9:00 PM', weekend: '10:00 PM' },
      })
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('10:00 PM')).toBeInTheDocument()
      expect(screen.getByText('weekends')).toBeInTheDocument()
    })

    it('shows every night when same weekday/weekend', () => {
      const impact = createMockImpact({
        bedtime: { weekday: '9:00 PM', weekend: '9:00 PM' },
      })
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('every night')).toBeInTheDocument()
    })

    it('does not render when bedtime is missing', () => {
      const impact = createMockImpact({
        bedtime: undefined,
        screenTime: { daily: 120, weekly: 840, description: '2 hours' },
      })
      render(<ImpactSummary impact={impact} />)
      expect(screen.queryByTestId('impact-bedtime')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // MONITORING CARD TESTS
  // ============================================

  describe('monitoring card', () => {
    it('renders monitoring card', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByTestId('impact-monitoring')).toBeInTheDocument()
    })

    it('shows monitoring title', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('Monitoring Level')).toBeInTheDocument()
    })

    it('shows monitoring level label', () => {
      const impact = createMockImpact({
        monitoring: { level: 'moderate', description: 'Regular check-ins' },
      })
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('Regular')).toBeInTheDocument()
    })

    it('shows level indicator bars', () => {
      const impact = createMockImpact({
        monitoring: { level: 'moderate', description: 'Check-ins' },
      })
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByLabelText('2 of 3 bars')).toBeInTheDocument()
    })

    it('shows description', () => {
      const impact = createMockImpact({
        monitoring: { level: 'moderate', description: 'Regular check-ins' },
      })
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('Regular check-ins')).toBeInTheDocument()
    })

    it('handles minimal level', () => {
      const impact = createMockImpact({
        monitoring: { level: 'minimal', description: 'Light monitoring' },
      })
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('Light')).toBeInTheDocument()
      expect(screen.getByLabelText('1 of 3 bars')).toBeInTheDocument()
    })

    it('handles active level', () => {
      const impact = createMockImpact({
        monitoring: { level: 'active', description: 'Active monitoring' },
      })
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByText('Close')).toBeInTheDocument()
      expect(screen.getByLabelText('3 of 3 bars')).toBeInTheDocument()
    })

    it('does not render when monitoring is missing', () => {
      const impact = createMockImpact({
        monitoring: undefined,
        screenTime: { daily: 120, weekly: 840, description: '2 hours' },
      })
      render(<ImpactSummary impact={impact} />)
      expect(screen.queryByTestId('impact-monitoring')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // SIMPLIFIED MODE TESTS (NFR65)
  // ============================================

  describe('simplified mode (NFR65)', () => {
    it('uses simplified header when enabled', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} simplifiedMode={true} />)
      expect(screen.getByText('What This Means For You')).toBeInTheDocument()
    })

    it('uses simplified description when enabled', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} simplifiedMode={true} />)
      expect(screen.getByText('Here is what you agreed to do each day.')).toBeInTheDocument()
    })

    it('uses Safety Checks for monitoring in simplified mode', () => {
      const impact = createMockImpact({
        monitoring: { level: 'moderate', description: 'Check-ins' },
      })
      render(<ImpactSummary impact={impact} simplifiedMode={true} />)
      expect(screen.getByText('Safety Checks')).toBeInTheDocument()
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has region role with label', () => {
      const impact = createMockImpact()
      render(<ImpactSummary impact={impact} />)
      expect(
        screen.getByRole('region', { name: 'Impact Summary' })
      ).toBeInTheDocument()
    })

    it('has screen reader summary', () => {
      const impact = createMockImpact()
      const { container } = render(<ImpactSummary impact={impact} />)
      // The sr-only content should be present in a sr-only wrapper
      const srOnlyDiv = container.querySelector('.sr-only')
      expect(srOnlyDiv).toBeInTheDocument()
      expect(srOnlyDiv?.textContent).toContain('Impact Summary')
    })

    it('has icon aria-hidden attributes', () => {
      const impact = createMockImpact()
      const { container } = render(<ImpactSummary impact={impact} />)
      const svgs = container.querySelectorAll('svg[aria-hidden="true"]')
      expect(svgs.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================
  // PARTIAL IMPACT TESTS
  // ============================================

  describe('partial impact', () => {
    it('renders only screen time when others missing', () => {
      const impact: ImpactEstimate = {
        screenTime: { daily: 120, weekly: 840, description: '2 hours' },
      }
      render(<ImpactSummary impact={impact} />)
      expect(screen.getByTestId('impact-screen-time')).toBeInTheDocument()
      expect(screen.queryByTestId('impact-bedtime')).not.toBeInTheDocument()
      expect(screen.queryByTestId('impact-monitoring')).not.toBeInTheDocument()
    })

    it('renders only bedtime when others missing', () => {
      const impact: ImpactEstimate = {
        bedtime: { weekday: '9:00 PM' },
      }
      render(<ImpactSummary impact={impact} />)
      expect(screen.queryByTestId('impact-screen-time')).not.toBeInTheDocument()
      expect(screen.getByTestId('impact-bedtime')).toBeInTheDocument()
      expect(screen.queryByTestId('impact-monitoring')).not.toBeInTheDocument()
    })

    it('renders only monitoring when others missing', () => {
      const impact: ImpactEstimate = {
        monitoring: { level: 'moderate', description: 'Check-ins' },
      }
      render(<ImpactSummary impact={impact} />)
      expect(screen.queryByTestId('impact-screen-time')).not.toBeInTheDocument()
      expect(screen.queryByTestId('impact-bedtime')).not.toBeInTheDocument()
      expect(screen.getByTestId('impact-monitoring')).toBeInTheDocument()
    })
  })
})
