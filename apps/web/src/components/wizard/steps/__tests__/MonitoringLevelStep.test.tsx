/**
 * Tests for MonitoringLevelStep component.
 *
 * Story 4.4: Quick Start Wizard - AC2
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MonitoringLevelStep } from '../MonitoringLevelStep'

describe('MonitoringLevelStep', () => {
  const mockOnSelectLevel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render step heading', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      expect(screen.getByText('Choose Monitoring Level')).toBeInTheDocument()
    })

    it('should render all three monitoring levels', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      expect(screen.getByText('High Monitoring')).toBeInTheDocument()
      expect(screen.getByText('Medium Monitoring')).toBeInTheDocument()
      expect(screen.getByText('Light Monitoring')).toBeInTheDocument()
    })

    it('should render descriptions for each level', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      expect(screen.getByText(/Regular screenshot reviews/)).toBeInTheDocument()
      expect(screen.getByText(/Periodic check-ins/)).toBeInTheDocument()
      expect(screen.getByText(/Minimal monitoring/)).toBeInTheDocument()
    })

    it('should render features for each level', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      expect(screen.getByText('Frequent screenshot capture')).toBeInTheDocument()
      expect(screen.getByText('Weekly activity summary')).toBeInTheDocument()
      expect(screen.getByText('Monthly reviews')).toBeInTheDocument()
    })

    it('should render reminder about adjusting level', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      expect(screen.getByText(/You can adjust the monitoring level/)).toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('should call onSelectLevel when high is clicked', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      fireEvent.click(screen.getByText('High Monitoring'))

      expect(mockOnSelectLevel).toHaveBeenCalledWith('high')
    })

    it('should call onSelectLevel when medium is clicked', () => {
      render(<MonitoringLevelStep monitoringLevel="high" onSelectLevel={mockOnSelectLevel} />)

      fireEvent.click(screen.getByText('Medium Monitoring'))

      expect(mockOnSelectLevel).toHaveBeenCalledWith('medium')
    })

    it('should call onSelectLevel when low is clicked', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      fireEvent.click(screen.getByText('Light Monitoring'))

      expect(mockOnSelectLevel).toHaveBeenCalledWith('low')
    })

    it('should highlight selected level', () => {
      render(<MonitoringLevelStep monitoringLevel="high" onSelectLevel={mockOnSelectLevel} />)

      const selectedButton = screen.getByRole('button', { name: /Select High Monitoring/ })
      expect(selectedButton).toHaveClass('border-primary')
    })

    it('should show checkmark on selected option', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      const selectedButton = screen.getByRole('button', { name: /Select Medium Monitoring/ })
      const checkmark = selectedButton.querySelector('svg[fill="currentColor"]')
      expect(checkmark).toBeInTheDocument()
    })
  })

  describe('recommended badge', () => {
    it('should show Recommended badge for template default', () => {
      render(
        <MonitoringLevelStep
          monitoringLevel="high"
          onSelectLevel={mockOnSelectLevel}
          templateDefault="medium"
        />
      )

      expect(screen.getByText('Recommended')).toBeInTheDocument()
    })

    it('should not show Recommended badge without template default', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      expect(screen.queryByText('Recommended')).not.toBeInTheDocument()
    })

    it('should show Recommended badge on correct level', () => {
      render(
        <MonitoringLevelStep
          monitoringLevel="medium"
          onSelectLevel={mockOnSelectLevel}
          templateDefault="high"
        />
      )

      // The badge should be near "High Monitoring"
      const highButton = screen.getByRole('button', { name: /Select High Monitoring/ })
      expect(highButton).toHaveTextContent('Recommended')
    })
  })

  describe('accessibility', () => {
    it('should have radiogroup role', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('should have aria-label on radiogroup', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      expect(screen.getByRole('radiogroup')).toHaveAttribute(
        'aria-label',
        'Select monitoring level'
      )
    })

    it('should have aria-pressed on buttons', () => {
      render(<MonitoringLevelStep monitoringLevel="low" onSelectLevel={mockOnSelectLevel} />)

      const selectedButton = screen.getByRole('button', { name: /Select Light Monitoring/ })
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true')

      const unselectedButton = screen.getByRole('button', { name: /Select High Monitoring/ })
      expect(unselectedButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should have aria-label on each option', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      expect(screen.getByRole('button', { name: /Select High Monitoring/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Select Medium Monitoring/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Select Light Monitoring/ })).toBeInTheDocument()
    })
  })

  describe('icons and colors', () => {
    it('should render icon for each level', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      // Each level should have an icon (SVG)
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.querySelector('svg')).toBeInTheDocument()
      })
    })

    it('should have appropriate color classes for each level', () => {
      render(<MonitoringLevelStep monitoringLevel="medium" onSelectLevel={mockOnSelectLevel} />)

      // High - red colors
      const highButton = screen.getByRole('button', { name: /Select High Monitoring/ })
      expect(highButton.innerHTML).toContain('red')

      // Medium - yellow colors
      const mediumButton = screen.getByRole('button', { name: /Select Medium Monitoring/ })
      expect(mediumButton.innerHTML).toContain('yellow')

      // Low - green colors
      const lowButton = screen.getByRole('button', { name: /Select Light Monitoring/ })
      expect(lowButton.innerHTML).toContain('green')
    })
  })
})
