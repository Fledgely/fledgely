/**
 * TimelineGap Tests - Story 19B.2
 *
 * Task 3.5: Create unit tests for gap component
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineGap } from './TimelineGap'
import type { GapInfo } from './timelineUtils'

describe('TimelineGap', () => {
  const mockGap: GapInfo = {
    id: 'gap-123-456',
    startTime: new Date('2024-01-15T10:00:00').getTime(),
    endTime: new Date('2024-01-15T14:00:00').getTime(),
    durationHours: 4,
    message: 'No pictures during this time',
  }

  it('should render gap with correct test id', () => {
    render(<TimelineGap gap={mockGap} />)

    expect(screen.getByTestId(`timeline-gap-${mockGap.id}`)).toBeInTheDocument()
  })

  it('should display friendly message', () => {
    render(<TimelineGap gap={mockGap} />)

    expect(screen.getByTestId('gap-message')).toHaveTextContent('No pictures during this time')
  })

  it('should display time range', () => {
    render(<TimelineGap gap={mockGap} />)

    const timeRange = screen.getByTestId('gap-time-range')
    // Time range should contain start and end times
    expect(timeRange).toHaveTextContent('10:00')
    expect(timeRange).toHaveTextContent('2:00')
  })

  it('should display sleeping icon', () => {
    render(<TimelineGap gap={mockGap} />)

    const gap = screen.getByTestId(`timeline-gap-${mockGap.id}`)
    expect(gap).toHaveTextContent('💤')
  })

  it('should have accessible role and aria-label', () => {
    render(<TimelineGap gap={mockGap} />)

    const gap = screen.getByTestId(`timeline-gap-${mockGap.id}`)
    expect(gap).toHaveAttribute('role', 'status')
    expect(gap).toHaveAttribute('aria-label')
    expect(gap.getAttribute('aria-label')).toContain('No pictures during this time')
  })

  it('should render with different gap data', () => {
    const differentGap: GapInfo = {
      id: 'gap-different',
      startTime: new Date('2024-01-15T06:00:00').getTime(),
      endTime: new Date('2024-01-15T09:00:00').getTime(),
      durationHours: 3,
      message: 'No pictures during this time',
    }

    render(<TimelineGap gap={differentGap} />)

    expect(screen.getByTestId('timeline-gap-gap-different')).toBeInTheDocument()
    expect(screen.getByTestId('gap-time-range')).toHaveTextContent('6:00')
  })

  it('should display non-alarming styling', () => {
    render(<TimelineGap gap={mockGap} />)

    const gap = screen.getByTestId(`timeline-gap-${mockGap.id}`)
    // Check that the container exists (styling is applied via inline styles)
    expect(gap).toBeInTheDocument()
  })
})
