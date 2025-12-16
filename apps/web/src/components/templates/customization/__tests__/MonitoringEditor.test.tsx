/**
 * MonitoringEditor Tests
 *
 * Story 4.5: Template Customization Preview - Task 4
 * AC #1: Parent can modify monitoring level
 * AC #2: Changes are highlighted compared to original template
 *
 * Tests:
 * - Basic rendering
 * - Level selection
 * - Feature list display
 * - Privacy notes
 * - Diff highlighting
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonitoringEditor } from '../MonitoringEditor'

describe('MonitoringEditor', () => {
  const defaultProps = {
    level: 'moderate' as const,
    onChange: vi.fn(),
  }

  describe('basic rendering', () => {
    it('renders section heading', () => {
      render(<MonitoringEditor {...defaultProps} />)
      expect(screen.getByText(/monitoring level/i)).toBeInTheDocument()
    })

    it('renders section description', () => {
      render(<MonitoringEditor {...defaultProps} />)
      expect(screen.getByText(/choose how much oversight/i)).toBeInTheDocument()
    })

    it('renders all three level options', () => {
      render(<MonitoringEditor {...defaultProps} />)
      expect(screen.getByRole('radio', { name: /light/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /moderate/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /comprehensive/i })).toBeInTheDocument()
    })
  })

  describe('level selection', () => {
    it('marks current level as selected', () => {
      render(<MonitoringEditor {...defaultProps} level="moderate" />)
      expect(screen.getByRole('radio', { name: /moderate/i })).toHaveAttribute(
        'aria-checked',
        'true'
      )
    })

    it('calls onChange when level is clicked', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<MonitoringEditor {...defaultProps} onChange={onChange} />)

      await user.click(screen.getByRole('radio', { name: /light/i }))

      expect(onChange).toHaveBeenCalledWith('light')
    })

    it('marks clicked level as selected', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const { rerender } = render(<MonitoringEditor {...defaultProps} onChange={onChange} />)

      await user.click(screen.getByRole('radio', { name: /light/i }))

      rerender(<MonitoringEditor {...defaultProps} level="light" onChange={onChange} />)

      expect(screen.getByRole('radio', { name: /light/i })).toHaveAttribute(
        'aria-checked',
        'true'
      )
    })
  })

  describe('level descriptions', () => {
    it('shows Light level description', () => {
      render(<MonitoringEditor {...defaultProps} level="light" />)
      expect(screen.getByText(/trust-based monitoring/i)).toBeInTheDocument()
    })

    it('shows Moderate level description', () => {
      render(<MonitoringEditor {...defaultProps} level="moderate" />)
      expect(screen.getByText(/balanced approach/i)).toBeInTheDocument()
    })

    it('shows Comprehensive level description', () => {
      render(<MonitoringEditor {...defaultProps} level="comprehensive" />)
      expect(screen.getByText(/detailed oversight/i)).toBeInTheDocument()
    })
  })

  describe('feature list display', () => {
    it('shows features for selected Light level', () => {
      render(<MonitoringEditor {...defaultProps} level="light" />)
      expect(screen.getByText(/daily screen time summary/i)).toBeInTheDocument()
      expect(screen.getByText(/no real-time tracking/i)).toBeInTheDocument()
    })

    it('shows features for selected Moderate level', () => {
      render(<MonitoringEditor {...defaultProps} level="moderate" />)
      expect(screen.getByText(/real-time screen time tracking/i)).toBeInTheDocument()
      expect(screen.getByText(/app usage categories/i)).toBeInTheDocument()
    })

    it('shows features for selected Comprehensive level', () => {
      render(<MonitoringEditor {...defaultProps} level="comprehensive" />)
      expect(screen.getByText(/individual app usage tracking/i)).toBeInTheDocument()
      expect(screen.getByText(/content category insights/i)).toBeInTheDocument()
    })

    it('only shows features for selected level', () => {
      render(<MonitoringEditor {...defaultProps} level="light" />)
      // Comprehensive-only features should not be visible
      expect(screen.queryByText(/content category insights/i)).not.toBeInTheDocument()
    })
  })

  describe('privacy notes', () => {
    it('shows privacy note for Light level', () => {
      render(<MonitoringEditor {...defaultProps} level="light" />)
      expect(screen.getByText(/maximum privacy/i)).toBeInTheDocument()
    })

    it('shows privacy note for Moderate level', () => {
      render(<MonitoringEditor {...defaultProps} level="moderate" />)
      expect(screen.getByText(/balanced.*app categories tracked/i)).toBeInTheDocument()
    })

    it('shows privacy note for Comprehensive level', () => {
      render(<MonitoringEditor {...defaultProps} level="comprehensive" />)
      expect(screen.getByText(/detailed tracking.*recommended for ages 5-10/i)).toBeInTheDocument()
    })
  })

  describe('diff highlighting', () => {
    it('shows modified badge when level differs from original', () => {
      render(
        <MonitoringEditor
          {...defaultProps}
          level="comprehensive"
          originalLevel="moderate"
        />
      )
      expect(screen.getByText('Modified')).toBeInTheDocument()
    })

    it('shows "Original" tag on original level when different is selected', () => {
      render(
        <MonitoringEditor
          {...defaultProps}
          level="comprehensive"
          originalLevel="moderate"
        />
      )
      expect(screen.getByText('Original')).toBeInTheDocument()
    })

    it('shows "Changed" tag on newly selected level', () => {
      render(
        <MonitoringEditor
          {...defaultProps}
          level="comprehensive"
          originalLevel="moderate"
        />
      )
      expect(screen.getByText('Changed')).toBeInTheDocument()
    })

    it('shows comparison note when level changed', () => {
      const { container } = render(
        <MonitoringEditor
          {...defaultProps}
          level="comprehensive"
          originalLevel="moderate"
        />
      )
      // The comparison note has border-amber-200 class which is unique to it
      const comparisonNote = container.querySelector('.border-amber-200.p-3')
      expect(comparisonNote).toBeInTheDocument()
      expect(comparisonNote).toHaveTextContent(/Changed from/)
      expect(comparisonNote).toHaveTextContent(/Moderate/)
      expect(comparisonNote).toHaveTextContent(/Comprehensive/)
    })

    it('does not show modified badge when level matches original', () => {
      render(
        <MonitoringEditor
          {...defaultProps}
          level="moderate"
          originalLevel="moderate"
        />
      )
      expect(screen.queryByText('Modified')).not.toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('disables level buttons when disabled', () => {
      render(<MonitoringEditor {...defaultProps} disabled />)
      expect(screen.getByRole('radio', { name: /light/i })).toBeDisabled()
      expect(screen.getByRole('radio', { name: /moderate/i })).toBeDisabled()
      expect(screen.getByRole('radio', { name: /comprehensive/i })).toBeDisabled()
    })

    it('does not call onChange when disabled', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<MonitoringEditor {...defaultProps} onChange={onChange} disabled />)

      await user.click(screen.getByRole('radio', { name: /light/i }))

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has radiogroup role', () => {
      render(<MonitoringEditor {...defaultProps} />)
      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('radiogroup has accessible label', () => {
      render(<MonitoringEditor {...defaultProps} />)
      expect(screen.getByRole('radiogroup')).toHaveAttribute(
        'aria-label',
        'Monitoring level selection'
      )
    })

    it('level buttons have radio role', () => {
      render(<MonitoringEditor {...defaultProps} />)
      const radios = screen.getAllByRole('radio')
      expect(radios).toHaveLength(3)
    })

    it('selected level has aria-checked true', () => {
      render(<MonitoringEditor {...defaultProps} level="moderate" />)
      expect(screen.getByRole('radio', { name: /moderate/i })).toHaveAttribute(
        'aria-checked',
        'true'
      )
    })

    it('unselected levels have aria-checked false', () => {
      render(<MonitoringEditor {...defaultProps} level="moderate" />)
      expect(screen.getByRole('radio', { name: /light/i })).toHaveAttribute(
        'aria-checked',
        'false'
      )
    })

    it('buttons meet minimum touch target (44px)', () => {
      render(<MonitoringEditor {...defaultProps} />)
      const button = screen.getByRole('radio', { name: /moderate/i })
      expect(button.className).toContain('min-h-[44px]')
    })

    it('emojis are hidden from screen readers', () => {
      const { container } = render(<MonitoringEditor {...defaultProps} />)
      const hiddenEmojis = container.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenEmojis.length).toBeGreaterThan(0)
    })
  })

  describe('visual styling', () => {
    it('applies selected styling to current level', () => {
      render(<MonitoringEditor {...defaultProps} level="moderate" />)
      const button = screen.getByRole('radio', { name: /moderate/i })
      expect(button.className).toContain('border-blue')
    })

    it('applies modified styling when level changed', () => {
      render(
        <MonitoringEditor
          {...defaultProps}
          level="comprehensive"
          originalLevel="moderate"
        />
      )
      const button = screen.getByRole('radio', { name: /comprehensive/i })
      expect(button.className).toContain('border-amber')
    })
  })
})
