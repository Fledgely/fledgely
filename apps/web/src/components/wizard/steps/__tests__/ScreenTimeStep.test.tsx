/**
 * Tests for ScreenTimeStep component.
 *
 * Story 4.4: Quick Start Wizard - AC2
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScreenTimeStep } from '../ScreenTimeStep'

describe('ScreenTimeStep', () => {
  const mockOnUpdateLimits = vi.fn()
  const defaultLimits = { weekday: 120, weekend: 180 }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render step heading', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      expect(screen.getByText('Set Screen Time Limits')).toBeInTheDocument()
    })

    it('should render weekday section', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      expect(screen.getByText('Weekdays (Mon-Fri)')).toBeInTheDocument()
    })

    it('should render weekend section', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      expect(screen.getByText('Weekends (Sat-Sun)')).toBeInTheDocument()
    })

    it('should render tip about educational content', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      expect(screen.getByText(/Educational content can be excluded/)).toBeInTheDocument()
    })
  })

  describe('time display', () => {
    it('should display weekday time in human-readable format', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      expect(screen.getByText('2 hours')).toBeInTheDocument()
    })

    it('should display weekend time in human-readable format', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      expect(screen.getByText('3 hours')).toBeInTheDocument()
    })

    it('should format minutes correctly', () => {
      render(
        <ScreenTimeStep
          screenTimeLimits={{ weekday: 90, weekend: 150 }}
          onUpdateLimits={mockOnUpdateLimits}
        />
      )

      expect(screen.getByText('1h 30m')).toBeInTheDocument()
      expect(screen.getByText('2h 30m')).toBeInTheDocument()
    })

    it('should display minutes under an hour', () => {
      render(
        <ScreenTimeStep
          screenTimeLimits={{ weekday: 45, weekend: 30 }}
          onUpdateLimits={mockOnUpdateLimits}
        />
      )

      expect(screen.getByText('45 minutes')).toBeInTheDocument()
      expect(screen.getByText('30 minutes')).toBeInTheDocument()
    })
  })

  describe('slider interaction', () => {
    it('should call onUpdateLimits when weekday slider changes', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      const weekdaySlider = screen.getByLabelText('Weekdays (Mon-Fri)')
      fireEvent.change(weekdaySlider, { target: { value: '90' } })

      expect(mockOnUpdateLimits).toHaveBeenCalledWith({ weekday: 90, weekend: 180 })
    })

    it('should call onUpdateLimits when weekend slider changes', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      const weekendSlider = screen.getByLabelText('Weekends (Sat-Sun)')
      fireEvent.change(weekendSlider, { target: { value: '240' } })

      expect(mockOnUpdateLimits).toHaveBeenCalledWith({ weekday: 120, weekend: 240 })
    })

    it('should have correct min/max values on sliders', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      const weekdaySlider = screen.getByLabelText('Weekdays (Mon-Fri)')
      expect(weekdaySlider).toHaveAttribute('min', '30')
      expect(weekdaySlider).toHaveAttribute('max', '300')
    })

    it('should have 15-minute step on sliders', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      const weekdaySlider = screen.getByLabelText('Weekdays (Mon-Fri)')
      expect(weekdaySlider).toHaveAttribute('step', '15')
    })
  })

  describe('template defaults', () => {
    it('should show template default when different from current', () => {
      render(
        <ScreenTimeStep
          screenTimeLimits={{ weekday: 90, weekend: 150 }}
          onUpdateLimits={mockOnUpdateLimits}
          templateDefaults={{ weekday: 120, weekend: 180 }}
        />
      )

      expect(screen.getByText('Template default: 2 hours')).toBeInTheDocument()
      expect(screen.getByText('Template default: 3 hours')).toBeInTheDocument()
    })

    it('should not show template default when same as current', () => {
      render(
        <ScreenTimeStep
          screenTimeLimits={defaultLimits}
          onUpdateLimits={mockOnUpdateLimits}
          templateDefaults={defaultLimits}
        />
      )

      expect(screen.queryByText(/Template default/)).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper labels on sliders', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      expect(screen.getByLabelText('Weekdays (Mon-Fri)')).toBeInTheDocument()
      expect(screen.getByLabelText('Weekends (Sat-Sun)')).toBeInTheDocument()
    })

    it('should have aria-valuetext on sliders', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      const weekdaySlider = screen.getByLabelText('Weekdays (Mon-Fri)')
      expect(weekdaySlider).toHaveAttribute('aria-valuetext', '2 hours')
    })

    it('should show range boundaries', () => {
      render(
        <ScreenTimeStep screenTimeLimits={defaultLimits} onUpdateLimits={mockOnUpdateLimits} />
      )

      expect(screen.getAllByText('30 min')).toHaveLength(2)
      expect(screen.getAllByText('5 hours')).toHaveLength(2)
    })
  })
})
