/**
 * TrustScoreImprovement Component Tests - Story 36.3 Task 4
 *
 * Tests for component showing improvement tips.
 * AC5: Tips: "To improve: stick to time limits for 2 weeks"
 * AC4: Language is encouraging, not punitive
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustScoreImprovement } from './TrustScoreImprovement'

describe('TrustScoreImprovement - Story 36.3 Task 4', () => {
  describe('AC5: Tips display', () => {
    it('should display tips when provided', () => {
      const tips = ['To improve: stick to time limits for 2 weeks']

      render(<TrustScoreImprovement tips={tips} />)

      expect(screen.getByTestId('improvement-tip-0')).toHaveTextContent(
        'To improve: stick to time limits for 2 weeks'
      )
    })

    it('should display multiple tips', () => {
      const tips = [
        'To improve: avoid trying to get around the rules',
        'To improve: keep monitoring enabled',
      ]

      render(<TrustScoreImprovement tips={tips} />)

      expect(screen.getByTestId('improvement-tip-0')).toHaveTextContent(
        'avoid trying to get around the rules'
      )
      expect(screen.getByTestId('improvement-tip-1')).toHaveTextContent('keep monitoring enabled')
    })

    it('should not render when no tips and no encouragement', () => {
      render(<TrustScoreImprovement tips={[]} />)

      expect(screen.queryByTestId('improvement-tips')).not.toBeInTheDocument()
    })

    it('should show encouragement when tips are empty but doing well', () => {
      render(<TrustScoreImprovement tips={[]} showEncouragementWhenEmpty />)

      expect(screen.getByTestId('improvement-encouragement')).toBeInTheDocument()
      expect(screen.getByTestId('improvement-encouragement')).toHaveTextContent(
        'Keep up the good work'
      )
    })
  })

  describe('AC4: Encouraging language', () => {
    it('should use encouraging header', () => {
      const tips = ['To improve: stick to time limits']

      render(<TrustScoreImprovement tips={tips} />)

      expect(screen.getByTestId('improvement-header')).toHaveTextContent('Tips to improve')
    })

    it('should not use punitive language in tips', () => {
      const tips = ['To improve: stick to time limits for 2 weeks']

      render(<TrustScoreImprovement tips={tips} />)

      const container = screen.getByTestId('trust-score-improvement')
      const text = container.textContent?.toLowerCase() || ''
      expect(text).not.toContain('punishment')
      expect(text).not.toContain('failure')
      expect(text).not.toContain('must')
      expect(text).not.toContain('you have to')
    })

    it('should frame tips as opportunities', () => {
      const tips = ['To improve: stick to time limits']

      render(<TrustScoreImprovement tips={tips} />)

      const tip = screen.getByTestId('improvement-tip-0')
      expect(tip.textContent).toMatch(/to improve/i)
    })
  })

  describe('Rendering', () => {
    it('should render the improvement container', () => {
      const tips = ['Keep up the good work!']

      render(<TrustScoreImprovement tips={tips} />)

      expect(screen.getByTestId('trust-score-improvement')).toBeInTheDocument()
    })

    it('should have accessible list structure', () => {
      const tips = ['Tip 1', 'Tip 2']

      render(<TrustScoreImprovement tips={tips} />)

      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()
    })

    it('should mark each tip as list item', () => {
      const tips = ['Tip 1', 'Tip 2']

      render(<TrustScoreImprovement tips={tips} />)

      const items = screen.getAllByRole('listitem')
      expect(items).toHaveLength(2)
    })
  })

  describe('Tip icons', () => {
    it('should show lightbulb icon for tips', () => {
      const tips = ['To improve: stick to time limits']

      render(<TrustScoreImprovement tips={tips} />)

      expect(screen.getByTestId('tip-icon-0')).toBeInTheDocument()
    })

    it('should use encouraging icon styling', () => {
      const tips = ['To improve: stick to time limits']

      render(<TrustScoreImprovement tips={tips} />)

      const icon = screen.getByTestId('tip-icon-0')
      expect(icon).toHaveAttribute('data-type', 'tip')
    })
  })

  describe('Limit display', () => {
    it('should show only first 3 tips by default', () => {
      const tips = ['Tip 1', 'Tip 2', 'Tip 3', 'Tip 4', 'Tip 5']

      render(<TrustScoreImprovement tips={tips} />)

      expect(screen.getByTestId('improvement-tip-0')).toBeInTheDocument()
      expect(screen.getByTestId('improvement-tip-1')).toBeInTheDocument()
      expect(screen.getByTestId('improvement-tip-2')).toBeInTheDocument()
      expect(screen.queryByTestId('improvement-tip-3')).not.toBeInTheDocument()
    })

    it('should show all tips when limit is set to higher value', () => {
      const tips = ['Tip 1', 'Tip 2', 'Tip 3', 'Tip 4']

      render(<TrustScoreImprovement tips={tips} limit={5} />)

      expect(screen.getByTestId('improvement-tip-3')).toBeInTheDocument()
    })

    it('should show more tips indicator when truncated', () => {
      const tips = ['Tip 1', 'Tip 2', 'Tip 3', 'Tip 4']

      render(<TrustScoreImprovement tips={tips} />)

      expect(screen.getByTestId('more-tips-indicator')).toHaveTextContent('+1 more')
    })

    it('should not show more indicator when all tips visible', () => {
      const tips = ['Tip 1', 'Tip 2']

      render(<TrustScoreImprovement tips={tips} />)

      expect(screen.queryByTestId('more-tips-indicator')).not.toBeInTheDocument()
    })
  })

  describe('Priority styling', () => {
    it('should highlight first tip as primary', () => {
      const tips = ['Primary tip', 'Secondary tip']

      render(<TrustScoreImprovement tips={tips} />)

      expect(screen.getByTestId('improvement-tip-0')).toHaveAttribute('data-priority', 'primary')
    })

    it('should style subsequent tips as secondary', () => {
      const tips = ['Primary tip', 'Secondary tip']

      render(<TrustScoreImprovement tips={tips} />)

      expect(screen.getByTestId('improvement-tip-1')).toHaveAttribute('data-priority', 'secondary')
    })
  })
})
