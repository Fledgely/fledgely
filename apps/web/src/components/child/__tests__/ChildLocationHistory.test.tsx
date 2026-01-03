/**
 * Tests for ChildLocationHistory Component.
 *
 * Story 40.5: Location Privacy Controls
 * - AC3: Location History Access (bilateral transparency)
 *
 * NFR Requirements:
 * - NFR65: Child-friendly language
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildLocationHistory, type ChildLocationHistoryProps } from '../ChildLocationHistory'
import type { ChildLocationHistoryItem } from '@fledgely/shared'

describe('ChildLocationHistory', () => {
  const mockHistory: ChildLocationHistoryItem[] = [
    {
      id: 'trans-1',
      fromZoneName: 'Home',
      toZoneName: 'School',
      detectedAt: new Date(),
      durationMinutes: 45,
      timeDescription: '2 hours ago',
    },
    {
      id: 'trans-2',
      fromZoneName: null,
      toZoneName: 'Home',
      detectedAt: new Date(),
      durationMinutes: null,
      timeDescription: 'yesterday',
    },
  ]

  const defaultProps: ChildLocationHistoryProps = {
    history: mockHistory,
    totalCount: 2,
    currentPage: 1,
    hasMore: false,
  }

  describe('Rendering', () => {
    it('renders the component', () => {
      render(<ChildLocationHistory {...defaultProps} />)

      expect(screen.getByTestId('child-location-history')).toBeInTheDocument()
    })

    it('displays title', () => {
      render(<ChildLocationHistory {...defaultProps} />)

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent("Where you've been")
    })

    it('displays total count', () => {
      render(<ChildLocationHistory {...defaultProps} />)

      expect(screen.getByText('2 places')).toBeInTheDocument()
    })
  })

  describe('Transparency Note (AC3)', () => {
    it('displays transparency note', () => {
      render(<ChildLocationHistory {...defaultProps} />)

      expect(screen.getByTestId('transparency-note')).toBeInTheDocument()
    })

    it('mentions parents can see same data', () => {
      render(<ChildLocationHistory {...defaultProps} />)

      const note = screen.getByTestId('transparency-note')
      expect(note.textContent).toContain('same')
      expect(note.textContent).toContain('parents')
    })
  })

  describe('History Items', () => {
    it('displays history items', () => {
      render(<ChildLocationHistory {...defaultProps} />)

      expect(screen.getAllByTestId('history-item')).toHaveLength(2)
    })

    it('formats transition with from and to zones', () => {
      render(<ChildLocationHistory {...defaultProps} />)

      expect(screen.getByText('Moved from Home to School')).toBeInTheDocument()
    })

    it('formats arrival without from zone', () => {
      render(<ChildLocationHistory {...defaultProps} />)

      expect(screen.getByText('Arrived at Home')).toBeInTheDocument()
    })

    it('shows time description', () => {
      render(<ChildLocationHistory {...defaultProps} />)

      expect(screen.getByText(/2 hours ago/)).toBeInTheDocument()
      expect(screen.getByText(/yesterday/)).toBeInTheDocument()
    })

    it('shows duration when available', () => {
      render(<ChildLocationHistory {...defaultProps} />)

      expect(screen.getByText(/45 min/)).toBeInTheDocument()
    })

    it('formats hours correctly', () => {
      const historyWithHours: ChildLocationHistoryItem[] = [
        {
          id: 'trans-1',
          fromZoneName: 'Home',
          toZoneName: 'School',
          detectedAt: new Date(),
          durationMinutes: 120,
          timeDescription: 'today',
        },
      ]

      render(<ChildLocationHistory {...defaultProps} history={historyWithHours} totalCount={1} />)

      expect(screen.getByText(/2h/)).toBeInTheDocument()
    })

    it('formats leaving zone', () => {
      const historyLeaving: ChildLocationHistoryItem[] = [
        {
          id: 'trans-1',
          fromZoneName: 'School',
          toZoneName: null,
          detectedAt: new Date(),
          durationMinutes: 60,
          timeDescription: 'today',
        },
      ]

      render(<ChildLocationHistory {...defaultProps} history={historyLeaving} totalCount={1} />)

      expect(screen.getByText('Left School')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no history', () => {
      render(<ChildLocationHistory {...defaultProps} history={[]} totalCount={0} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No location history yet')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading when loading and no data', () => {
      render(
        <ChildLocationHistory {...defaultProps} history={[]} totalCount={0} isLoading={true} />
      )

      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
      expect(screen.getByText('Loading your history...')).toBeInTheDocument()
    })

    it('does not hide data while loading more', () => {
      render(<ChildLocationHistory {...defaultProps} isLoading={true} />)

      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument()
      expect(screen.getAllByTestId('history-item')).toHaveLength(2)
    })
  })

  describe('Error State', () => {
    it('shows error message', () => {
      render(<ChildLocationHistory {...defaultProps} error="Something went wrong" />)

      expect(screen.getByTestId('error-state')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('error has alert role for accessibility', () => {
      render(<ChildLocationHistory {...defaultProps} error="Error" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  describe('Pagination', () => {
    it('shows load more button when hasMore is true', () => {
      render(<ChildLocationHistory {...defaultProps} hasMore={true} />)

      expect(screen.getByTestId('load-more-button')).toBeInTheDocument()
    })

    it('hides load more button when hasMore is false', () => {
      render(<ChildLocationHistory {...defaultProps} hasMore={false} />)

      expect(screen.queryByTestId('load-more-button')).not.toBeInTheDocument()
    })

    it('calls onLoadMore when button clicked', () => {
      const handleLoadMore = vi.fn()
      render(<ChildLocationHistory {...defaultProps} hasMore={true} onLoadMore={handleLoadMore} />)

      fireEvent.click(screen.getByTestId('load-more-button'))

      expect(handleLoadMore).toHaveBeenCalledTimes(1)
    })

    it('disables button when loading', () => {
      render(<ChildLocationHistory {...defaultProps} hasMore={true} isLoading={true} />)

      expect(screen.getByTestId('load-more-button')).toBeDisabled()
    })

    it('shows loading text on button when loading', () => {
      render(<ChildLocationHistory {...defaultProps} hasMore={true} isLoading={true} />)

      expect(screen.getByTestId('load-more-button')).toHaveTextContent('Loading...')
    })
  })

  describe('Accessibility', () => {
    it('has accessible list', () => {
      render(<ChildLocationHistory {...defaultProps} />)

      expect(screen.getByRole('list', { name: /location history/i })).toBeInTheDocument()
    })

    it('icons have aria-hidden', () => {
      render(<ChildLocationHistory {...defaultProps} />)

      const items = screen.getAllByTestId('history-item')
      items.forEach((item) => {
        const icon = item.querySelector('[aria-hidden="true"]')
        expect(icon).toBeInTheDocument()
      })
    })
  })
})
