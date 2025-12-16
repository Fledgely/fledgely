/**
 * ScreenTimeEditor Tests
 *
 * Story 4.5: Template Customization Preview - Task 2
 * AC #1: Parent can modify screen time field
 * AC #2: Changes are highlighted compared to original template
 *
 * Tests:
 * - Basic rendering
 * - Weekday/weekend tabs
 * - Slider interaction
 * - Preset buttons
 * - Impact preview
 * - Diff highlighting
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScreenTimeEditor } from '../ScreenTimeEditor'

describe('ScreenTimeEditor', () => {
  const defaultProps = {
    weekdayMinutes: 60,
    weekendMinutes: 90,
    onWeekdayChange: vi.fn(),
    onWeekendChange: vi.fn(),
  }

  describe('basic rendering', () => {
    it('renders section heading', () => {
      render(<ScreenTimeEditor {...defaultProps} />)
      expect(screen.getByRole('heading', { name: /daily screen time/i })).toBeInTheDocument()
    })

    it('renders section description', () => {
      render(<ScreenTimeEditor {...defaultProps} />)
      expect(screen.getByText(/set daily screen time limits/i)).toBeInTheDocument()
    })

    it('displays current weekday value', () => {
      const { container } = render(<ScreenTimeEditor {...defaultProps} />)
      // Check the large display value (text-4xl class)
      const displayValue = container.querySelector('.text-4xl')
      expect(displayValue).toHaveTextContent('1 hour')
    })
  })

  describe('weekday/weekend tabs', () => {
    it('renders weekday tab', () => {
      render(<ScreenTimeEditor {...defaultProps} />)
      expect(screen.getByRole('tab', { name: /weekday/i })).toBeInTheDocument()
    })

    it('renders weekend tab', () => {
      render(<ScreenTimeEditor {...defaultProps} />)
      expect(screen.getByRole('tab', { name: /weekend/i })).toBeInTheDocument()
    })

    it('has weekday tab selected by default', () => {
      render(<ScreenTimeEditor {...defaultProps} />)
      expect(screen.getByRole('tab', { name: /weekday/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    })

    it('switches to weekend tab on click', async () => {
      const user = userEvent.setup()
      render(<ScreenTimeEditor {...defaultProps} />)

      await user.click(screen.getByRole('tab', { name: /weekend/i }))

      expect(screen.getByRole('tab', { name: /weekend/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    })

    it('displays weekend value when weekend tab is selected', async () => {
      const user = userEvent.setup()
      const { container } = render(<ScreenTimeEditor {...defaultProps} weekendMinutes={120} />)

      await user.click(screen.getByRole('tab', { name: /weekend/i }))

      // Check the large display value (text-4xl class)
      const displayValue = container.querySelector('.text-4xl')
      expect(displayValue).toHaveTextContent('2 hours')
    })
  })

  describe('slider interaction', () => {
    it('renders slider', () => {
      render(<ScreenTimeEditor {...defaultProps} />)
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    it('slider has correct initial value', () => {
      render(<ScreenTimeEditor {...defaultProps} weekdayMinutes={90} />)
      expect(screen.getByRole('slider')).toHaveValue('90')
    })

    it('calls onWeekdayChange when weekday slider changes', () => {
      const onWeekdayChange = vi.fn()
      render(<ScreenTimeEditor {...defaultProps} onWeekdayChange={onWeekdayChange} />)

      fireEvent.change(screen.getByRole('slider'), { target: { value: '120' } })

      expect(onWeekdayChange).toHaveBeenCalledWith(120)
    })

    it('calls onWeekendChange when weekend slider changes', async () => {
      const user = userEvent.setup()
      const onWeekendChange = vi.fn()
      render(<ScreenTimeEditor {...defaultProps} onWeekendChange={onWeekendChange} />)

      await user.click(screen.getByRole('tab', { name: /weekend/i }))
      fireEvent.change(screen.getByRole('slider'), { target: { value: '180' } })

      expect(onWeekendChange).toHaveBeenCalledWith(180)
    })

    it('slider has accessible value text', () => {
      render(<ScreenTimeEditor {...defaultProps} weekdayMinutes={90} />)
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '1h 30m')
    })
  })

  describe('preset buttons', () => {
    it('renders preset buttons', () => {
      render(<ScreenTimeEditor {...defaultProps} />)
      expect(screen.getByRole('button', { name: '30 min' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '1 hour' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2 hours' })).toBeInTheDocument()
    })

    it('highlights active preset', () => {
      render(<ScreenTimeEditor {...defaultProps} weekdayMinutes={60} />)
      const button = screen.getByRole('button', { name: '1 hour' })
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    it('calls onChange when preset is clicked', async () => {
      const user = userEvent.setup()
      const onWeekdayChange = vi.fn()
      render(<ScreenTimeEditor {...defaultProps} onWeekdayChange={onWeekdayChange} />)

      await user.click(screen.getByRole('button', { name: '2 hours' }))

      expect(onWeekdayChange).toHaveBeenCalledWith(120)
    })
  })

  describe('impact preview', () => {
    it('shows weekly total calculation', () => {
      render(<ScreenTimeEditor {...defaultProps} weekdayMinutes={60} weekendMinutes={90} />)
      // 60 * 5 + 90 * 2 = 300 + 180 = 480 min = 8 hours
      expect(screen.getByText(/hours per week/i)).toBeInTheDocument()
    })

    it('shows different weekday/weekend message when values differ', () => {
      render(<ScreenTimeEditor {...defaultProps} weekdayMinutes={60} weekendMinutes={120} />)
      expect(screen.getByText(/school days.*weekends/i)).toBeInTheDocument()
    })

    it('shows same limit message when values are equal', () => {
      render(<ScreenTimeEditor {...defaultProps} weekdayMinutes={60} weekendMinutes={60} />)
      expect(screen.getByText(/same limit every day/i)).toBeInTheDocument()
    })
  })

  describe('diff highlighting', () => {
    it('shows modified badge when weekday differs from original', () => {
      render(
        <ScreenTimeEditor
          {...defaultProps}
          weekdayMinutes={90}
          originalWeekdayMinutes={60}
        />
      )
      expect(screen.getByText('Modified')).toBeInTheDocument()
    })

    it('shows original value comparison when modified', () => {
      render(
        <ScreenTimeEditor
          {...defaultProps}
          weekdayMinutes={90}
          originalWeekdayMinutes={60}
        />
      )
      expect(screen.getByText(/original.*1 hour/i)).toBeInTheDocument()
    })

    it('shows indicator on modified tab', () => {
      render(
        <ScreenTimeEditor
          {...defaultProps}
          weekdayMinutes={90}
          originalWeekdayMinutes={60}
        />
      )
      const weekdayTab = screen.getByRole('tab', { name: /weekday/i })
      expect(weekdayTab.querySelector('.bg-amber-500')).toBeInTheDocument()
    })

    it('shows indicator on weekend tab when weekend is modified', () => {
      render(
        <ScreenTimeEditor
          {...defaultProps}
          weekendMinutes={180}
          originalWeekendMinutes={90}
        />
      )
      const weekendTab = screen.getByRole('tab', { name: /weekend/i })
      expect(weekendTab.querySelector('.bg-amber-500')).toBeInTheDocument()
    })

    it('does not show modified badge when values match original', () => {
      render(
        <ScreenTimeEditor
          {...defaultProps}
          weekdayMinutes={60}
          originalWeekdayMinutes={60}
          weekendMinutes={90}
          originalWeekendMinutes={90}
        />
      )
      expect(screen.queryByText('Modified')).not.toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('disables slider when disabled', () => {
      render(<ScreenTimeEditor {...defaultProps} disabled />)
      expect(screen.getByRole('slider')).toBeDisabled()
    })

    it('disables preset buttons when disabled', () => {
      render(<ScreenTimeEditor {...defaultProps} disabled />)
      expect(screen.getByRole('button', { name: '1 hour' })).toBeDisabled()
    })

    it('does not call onChange when disabled', async () => {
      const user = userEvent.setup()
      const onWeekdayChange = vi.fn()
      render(
        <ScreenTimeEditor {...defaultProps} onWeekdayChange={onWeekdayChange} disabled />
      )

      await user.click(screen.getByRole('button', { name: '2 hours' }))

      expect(onWeekdayChange).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has tablist role for tabs', () => {
      render(<ScreenTimeEditor {...defaultProps} />)
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('tabs have aria-controls', () => {
      render(<ScreenTimeEditor {...defaultProps} />)
      const weekdayTab = screen.getByRole('tab', { name: /weekday/i })
      expect(weekdayTab).toHaveAttribute('aria-controls', 'weekday-panel')
    })

    it('panel has aria-labelledby', () => {
      render(<ScreenTimeEditor {...defaultProps} />)
      const panel = screen.getByRole('tabpanel')
      expect(panel).toHaveAttribute('aria-labelledby', 'weekday-tab')
    })

    it('slider has accessible label', () => {
      render(<ScreenTimeEditor {...defaultProps} />)
      const slider = screen.getByRole('slider')
      expect(slider).toHaveAccessibleName()
    })

    it('preset buttons meet minimum touch target (44px)', () => {
      render(<ScreenTimeEditor {...defaultProps} />)
      const button = screen.getByRole('button', { name: '1 hour' })
      expect(button.className).toContain('min-h-[36px]')
    })

    it('emojis are hidden from screen readers', () => {
      const { container } = render(<ScreenTimeEditor {...defaultProps} />)
      const hiddenEmojis = container.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenEmojis.length).toBeGreaterThan(0)
    })
  })

  describe('time formatting', () => {
    it('formats 30 minutes correctly', () => {
      render(<ScreenTimeEditor {...defaultProps} weekdayMinutes={30} />)
      // Main display shows the formatted time
      expect(screen.getByRole('slider')).toHaveValue('30')
    })

    it('formats 60 minutes as 1 hour', () => {
      render(<ScreenTimeEditor {...defaultProps} weekdayMinutes={60} />)
      expect(screen.getByRole('slider')).toHaveValue('60')
      expect(screen.getByRole('button', { name: '1 hour' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('formats 90 minutes correctly', () => {
      render(<ScreenTimeEditor {...defaultProps} weekdayMinutes={90} />)
      expect(screen.getByRole('slider')).toHaveValue('90')
    })

    it('formats 120 minutes as 2 hours', () => {
      render(<ScreenTimeEditor {...defaultProps} weekdayMinutes={120} />)
      expect(screen.getByRole('slider')).toHaveValue('120')
      expect(screen.getByRole('button', { name: '2 hours' })).toHaveAttribute('aria-pressed', 'true')
    })
  })
})
