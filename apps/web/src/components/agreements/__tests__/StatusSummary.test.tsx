/**
 * Tests for StatusSummary component.
 *
 * Story 5.8: Child Agreement Viewing - AC6
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StatusSummary } from '../StatusSummary'

describe('StatusSummary', () => {
  const defaultProps = {
    screenTimeUsed: 45,
    screenTimeLimit: 120,
    childName: 'Alex',
  }

  describe('rendering', () => {
    it('should render the status summary', () => {
      render(<StatusSummary {...defaultProps} />)

      expect(screen.getByTestId('status-summary')).toBeInTheDocument()
    })

    it('should display title', () => {
      render(<StatusSummary {...defaultProps} />)

      expect(screen.getByText(/today/i)).toBeInTheDocument()
    })

    it('should display screen time used', () => {
      render(<StatusSummary {...defaultProps} />)

      expect(screen.getByText(/45/)).toBeInTheDocument()
    })

    it('should display screen time limit', () => {
      render(<StatusSummary {...defaultProps} />)

      // Limit is formatted as "2 hours" (120 minutes)
      const container = screen.getByTestId('status-summary')
      expect(container).toHaveTextContent('2 hours')
      expect(container).toHaveTextContent('limit')
    })
  })

  describe('progress display', () => {
    it('should show progress bar', () => {
      render(<StatusSummary {...defaultProps} />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should calculate correct percentage', () => {
      render(<StatusSummary {...defaultProps} />)

      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '38') // 45/120 = 37.5%
    })

    it('should cap progress at 100%', () => {
      render(<StatusSummary {...defaultProps} screenTimeUsed={150} screenTimeLimit={120} />)

      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '100')
    })
  })

  describe('time formatting', () => {
    it('should format minutes correctly', () => {
      render(<StatusSummary {...defaultProps} screenTimeUsed={45} />)

      // The time is displayed in the main display area
      const container = screen.getByTestId('status-summary')
      expect(container).toHaveTextContent('45 minutes')
    })

    it('should format hours and minutes for larger values', () => {
      render(<StatusSummary {...defaultProps} screenTimeUsed={90} screenTimeLimit={180} />)

      // The formatted time appears somewhere in the component
      const container = screen.getByTestId('status-summary')
      expect(container).toHaveTextContent('1 hour 30 minutes')
    })

    it('should handle singular hour', () => {
      render(<StatusSummary {...defaultProps} screenTimeUsed={60} />)

      const container = screen.getByTestId('status-summary')
      expect(container).toHaveTextContent('1 hour')
    })
  })

  describe('status indicators', () => {
    it('should show green when under 50% used', () => {
      render(<StatusSummary {...defaultProps} screenTimeUsed={30} screenTimeLimit={120} />)

      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveClass('bg-green-500')
    })

    it('should show yellow when between 50-75% used', () => {
      render(<StatusSummary {...defaultProps} screenTimeUsed={75} screenTimeLimit={120} />)

      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveClass('bg-yellow-500')
    })

    it('should show orange when between 75-100% used', () => {
      render(<StatusSummary {...defaultProps} screenTimeUsed={100} screenTimeLimit={120} />)

      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveClass('bg-orange-500')
    })

    it('should show red when over limit', () => {
      render(<StatusSummary {...defaultProps} screenTimeUsed={130} screenTimeLimit={120} />)

      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveClass('bg-red-500')
    })
  })

  describe('friendly messages', () => {
    it('should show encouraging message when under limit', () => {
      render(<StatusSummary {...defaultProps} screenTimeUsed={45} screenTimeLimit={120} />)

      expect(screen.getByTestId('status-message')).toHaveTextContent(/great/i)
    })

    it('should show warning when close to limit', () => {
      render(<StatusSummary {...defaultProps} screenTimeUsed={110} screenTimeLimit={120} />)

      expect(screen.getByTestId('status-message')).toHaveTextContent(/almost/i)
    })

    it('should show over limit message', () => {
      render(<StatusSummary {...defaultProps} screenTimeUsed={130} screenTimeLimit={120} />)

      expect(screen.getByTestId('status-message')).toHaveTextContent(/over/i)
    })
  })

  describe('refresh functionality', () => {
    it('should show refresh button', () => {
      render(<StatusSummary {...defaultProps} onRefresh={vi.fn()} />)

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })

    it('should call onRefresh when clicked', () => {
      const onRefresh = vi.fn()
      render(<StatusSummary {...defaultProps} onRefresh={onRefresh} />)

      fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

      expect(onRefresh).toHaveBeenCalled()
    })

    it('should show loading state while refreshing', () => {
      render(<StatusSummary {...defaultProps} onRefresh={vi.fn()} isRefreshing />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  describe('no screen time data', () => {
    it('should show placeholder when no data available', () => {
      render(
        <StatusSummary
          screenTimeUsed={null as unknown as number}
          screenTimeLimit={null as unknown as number}
          childName="Alex"
        />
      )

      expect(screen.getByTestId('no-data-message')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible region', () => {
      render(<StatusSummary {...defaultProps} />)

      expect(screen.getByRole('region', { name: /status/i })).toBeInTheDocument()
    })

    it('should have progress bar with aria labels', () => {
      render(<StatusSummary {...defaultProps} />)

      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuemin', '0')
      expect(progressbar).toHaveAttribute('aria-valuemax', '100')
    })

    it('should have 44px minimum touch targets for buttons', () => {
      render(<StatusSummary {...defaultProps} onRefresh={vi.fn()} />)

      const button = screen.getByRole('button', { name: /refresh/i })
      expect(button).toHaveClass('min-h-[44px]')
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<StatusSummary {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('status-summary')).toHaveClass('custom-class')
    })
  })
})
