/**
 * ViewToggle Tests - Story 19B.2
 *
 * Task 5.5: Create unit tests for view toggle
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ViewToggle } from './ViewToggle'
import type { ViewMode } from './ViewToggle'

describe('ViewToggle', () => {
  const defaultProps = {
    currentView: 'grid' as ViewMode,
    onViewChange: vi.fn(),
  }

  it('should render toggle with correct test id', () => {
    render(<ViewToggle {...defaultProps} />)

    expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
  })

  it('should render grid and timeline buttons', () => {
    render(<ViewToggle {...defaultProps} />)

    expect(screen.getByTestId('view-toggle-grid')).toBeInTheDocument()
    expect(screen.getByTestId('view-toggle-timeline')).toBeInTheDocument()
  })

  it('should mark grid button as checked when currentView is grid', () => {
    render(<ViewToggle {...defaultProps} currentView="grid" />)

    const gridButton = screen.getByTestId('view-toggle-grid')
    const timelineButton = screen.getByTestId('view-toggle-timeline')

    expect(gridButton).toHaveAttribute('aria-checked', 'true')
    expect(timelineButton).toHaveAttribute('aria-checked', 'false')
  })

  it('should mark timeline button as checked when currentView is timeline', () => {
    render(<ViewToggle {...defaultProps} currentView="timeline" />)

    const gridButton = screen.getByTestId('view-toggle-grid')
    const timelineButton = screen.getByTestId('view-toggle-timeline')

    expect(gridButton).toHaveAttribute('aria-checked', 'false')
    expect(timelineButton).toHaveAttribute('aria-checked', 'true')
  })

  it('should call onViewChange with grid when grid button is clicked', () => {
    const onViewChange = vi.fn()
    render(<ViewToggle {...defaultProps} currentView="timeline" onViewChange={onViewChange} />)

    fireEvent.click(screen.getByTestId('view-toggle-grid'))

    expect(onViewChange).toHaveBeenCalledWith('grid')
  })

  it('should call onViewChange with timeline when timeline button is clicked', () => {
    const onViewChange = vi.fn()
    render(<ViewToggle {...defaultProps} currentView="grid" onViewChange={onViewChange} />)

    fireEvent.click(screen.getByTestId('view-toggle-timeline'))

    expect(onViewChange).toHaveBeenCalledWith('timeline')
  })

  it('should have accessible radiogroup role', () => {
    render(<ViewToggle {...defaultProps} />)

    const toggle = screen.getByTestId('view-toggle')
    expect(toggle).toHaveAttribute('role', 'radiogroup')
    expect(toggle).toHaveAttribute('aria-label', 'View mode')
  })

  it('should have radio role on buttons', () => {
    render(<ViewToggle {...defaultProps} />)

    const gridButton = screen.getByTestId('view-toggle-grid')
    const timelineButton = screen.getByTestId('view-toggle-timeline')

    expect(gridButton).toHaveAttribute('role', 'radio')
    expect(timelineButton).toHaveAttribute('role', 'radio')
  })

  it('should have accessible labels on buttons', () => {
    render(<ViewToggle {...defaultProps} />)

    const gridButton = screen.getByTestId('view-toggle-grid')
    const timelineButton = screen.getByTestId('view-toggle-timeline')

    expect(gridButton).toHaveAttribute('aria-label', 'Grid view')
    expect(timelineButton).toHaveAttribute('aria-label', 'Timeline view')
  })

  it('should have button type to prevent form submission', () => {
    render(<ViewToggle {...defaultProps} />)

    const gridButton = screen.getByTestId('view-toggle-grid')
    const timelineButton = screen.getByTestId('view-toggle-timeline')

    expect(gridButton).toHaveAttribute('type', 'button')
    expect(timelineButton).toHaveAttribute('type', 'button')
  })
})
