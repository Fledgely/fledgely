/**
 * TrustScoreFactors Component Tests - Story 36.3 Task 3
 *
 * Tests for component showing factor breakdown.
 * AC3: Factors breakdown: "Following time limits: +10"
 * AC4: Language is encouraging, not punitive
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustScoreFactors } from './TrustScoreFactors'
import { type TrustFactor } from '@fledgely/shared'

const createFactor = (
  type: TrustFactor['type'],
  category: TrustFactor['category'],
  value: number,
  description: string
): TrustFactor => ({
  type,
  category,
  value,
  description,
  occurredAt: new Date(),
})

describe('TrustScoreFactors - Story 36.3 Task 3', () => {
  describe('AC3: Factors breakdown display', () => {
    it('should display positive factor with + sign', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.getByTestId('factor-0')).toHaveTextContent('Following time limits: +10')
    })

    it('should display negative factor without extra sign', () => {
      const factors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -5, 'Bypass attempt detected'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.getByTestId('factor-0')).toHaveTextContent('Bypass attempt detected: -5')
    })

    it('should display zero value factor', () => {
      const factors: TrustFactor[] = [
        createFactor('normal-app-usage', 'neutral', 0, 'Normal app usage'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.getByTestId('factor-0')).toHaveTextContent('Normal app usage: +0')
    })

    it('should display multiple factors', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
        createFactor('focus-mode-usage', 'positive', 5, 'Using focus mode'),
        createFactor('bypass-attempt', 'concerning', -3, 'Bypass attempt'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.getByTestId('factor-0')).toHaveTextContent('Following time limits: +10')
      expect(screen.getByTestId('factor-1')).toHaveTextContent('Using focus mode: +5')
      expect(screen.getByTestId('factor-2')).toHaveTextContent('Bypass attempt: -3')
    })

    it('should show empty state when no factors', () => {
      render(<TrustScoreFactors factors={[]} />)

      expect(screen.getByTestId('factors-empty')).toBeInTheDocument()
    })
  })

  describe('Factor grouping by category', () => {
    it('should group positive factors together', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
        createFactor('focus-mode-usage', 'positive', 5, 'Using focus mode'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.getByTestId('positive-factors')).toBeInTheDocument()
    })

    it('should group concerning factors together', () => {
      const factors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -5, 'Bypass attempt'),
        createFactor('monitoring-disabled', 'concerning', -3, 'Monitoring disabled'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.getByTestId('concerning-factors')).toBeInTheDocument()
    })

    it('should show positive section only when positive factors exist', () => {
      const factors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -5, 'Bypass attempt'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.queryByTestId('positive-factors')).not.toBeInTheDocument()
      expect(screen.getByTestId('concerning-factors')).toBeInTheDocument()
    })

    it('should show concerning section only when concerning factors exist', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.getByTestId('positive-factors')).toBeInTheDocument()
      expect(screen.queryByTestId('concerning-factors')).not.toBeInTheDocument()
    })
  })

  describe('AC4: Child-friendly labels', () => {
    it('should use encouraging header for positive factors', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.getByTestId('positive-factors-header')).toHaveTextContent(
        "What's helping your score"
      )
    })

    it('should use non-punitive header for concerning factors', () => {
      const factors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -5, 'Bypass attempt'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.getByTestId('concerning-factors-header')).toHaveTextContent('Things to work on')
    })

    it('should not use punitive language', () => {
      const factors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -5, 'Bypass attempt'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      const container = screen.getByTestId('trust-score-factors')
      const text = container.textContent?.toLowerCase() || ''
      expect(text).not.toContain('punishment')
      expect(text).not.toContain('failure')
      expect(text).not.toContain('bad behavior')
      expect(text).not.toContain('violations')
    })
  })

  describe('Rendering', () => {
    it('should render the factors container', () => {
      render(<TrustScoreFactors factors={[]} />)

      expect(screen.getByTestId('trust-score-factors')).toBeInTheDocument()
    })

    it('should have accessible structure', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      const container = screen.getByTestId('trust-score-factors')
      expect(container).toHaveAttribute('role', 'list')
    })

    it('should mark each factor as list item', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
        createFactor('focus-mode-usage', 'positive', 5, 'Using focus mode'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      const items = screen.getAllByRole('listitem')
      expect(items).toHaveLength(2)
    })
  })

  describe('Factor styling', () => {
    it('should mark positive factors as positive', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.getByTestId('factor-0')).toHaveAttribute('data-category', 'positive')
    })

    it('should mark concerning factors as concerning', () => {
      const factors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -5, 'Bypass attempt'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.getByTestId('factor-0')).toHaveAttribute('data-category', 'concerning')
    })

    it('should mark neutral factors as neutral', () => {
      const factors: TrustFactor[] = [
        createFactor('normal-app-usage', 'neutral', 0, 'Normal app usage'),
      ]

      render(<TrustScoreFactors factors={factors} />)

      expect(screen.getByTestId('factor-0')).toHaveAttribute('data-category', 'neutral')
    })
  })

  describe('Compact mode', () => {
    it('should show abbreviated format in compact mode', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
        createFactor('focus-mode-usage', 'positive', 5, 'Using focus mode'),
        createFactor('bypass-attempt', 'concerning', -3, 'Bypass attempt'),
      ]

      render(<TrustScoreFactors factors={factors} compact />)

      // In compact mode, shows summary instead of all factors
      expect(screen.getByTestId('factors-summary')).toBeInTheDocument()
    })

    it('should show count of positive and concerning in compact mode', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 'Following time limits'),
        createFactor('focus-mode-usage', 'positive', 5, 'Using focus mode'),
        createFactor('bypass-attempt', 'concerning', -3, 'Bypass attempt'),
      ]

      render(<TrustScoreFactors factors={factors} compact />)

      expect(screen.getByTestId('factors-summary')).toHaveTextContent('2 helping')
      expect(screen.getByTestId('factors-summary')).toHaveTextContent('1 to work on')
    })
  })
})
