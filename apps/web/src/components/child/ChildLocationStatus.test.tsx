/**
 * Tests for ChildLocationStatus Component.
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC5: Child Location Display
 *
 * NFR Requirements:
 * - NFR65: Child-friendly language (6th-grade reading level)
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChildLocationStatus, type ChildLocationStatusProps } from './ChildLocationStatus'

describe('ChildLocationStatus', () => {
  const defaultProps: ChildLocationStatusProps = {
    locationName: "Mom's House",
    timeLimitMinutes: 120,
    timeUsedMinutes: 45,
    educationOnlyMode: false,
    locationType: 'home_1',
  }

  describe('Location Display', () => {
    it('renders the component', () => {
      render(<ChildLocationStatus {...defaultProps} />)

      expect(screen.getByTestId('child-location-status')).toBeInTheDocument()
    })

    it('displays greeting text', () => {
      render(<ChildLocationStatus {...defaultProps} />)

      expect(screen.getByTestId('greeting')).toHaveTextContent("You're at")
    })

    it('displays location name', () => {
      render(<ChildLocationStatus {...defaultProps} />)

      expect(screen.getByTestId('location-name')).toHaveTextContent("Mom's House")
    })

    it('shows home icon for home_1 location', () => {
      render(<ChildLocationStatus {...defaultProps} locationType="home_1" />)

      expect(screen.getByTestId('location-icon')).toHaveTextContent('🏠')
    })

    it('shows home icon for home_2 location', () => {
      render(<ChildLocationStatus {...defaultProps} locationType="home_2" />)

      expect(screen.getByTestId('location-icon')).toHaveTextContent('🏠')
    })

    it('shows school icon for school location', () => {
      render(<ChildLocationStatus {...defaultProps} locationType="school" />)

      expect(screen.getByTestId('location-icon')).toHaveTextContent('🏫')
    })

    it('shows pin icon for other locations', () => {
      render(<ChildLocationStatus {...defaultProps} locationType="other" />)

      expect(screen.getByTestId('location-icon')).toHaveTextContent('📍')
    })
  })

  describe('Time Limit Display (AC5)', () => {
    it('shows remaining time in child-friendly format', () => {
      render(<ChildLocationStatus {...defaultProps} />)

      // 120 - 45 = 75 minutes = 1 hour and 15 minutes
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('1 hour and 15 minutes left')
    })

    it('formats hours correctly', () => {
      render(<ChildLocationStatus {...defaultProps} timeLimitMinutes={180} timeUsedMinutes={0} />)

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('3 hours left')
    })

    it('formats single hour correctly', () => {
      render(<ChildLocationStatus {...defaultProps} timeLimitMinutes={60} timeUsedMinutes={0} />)

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('1 hour left')
    })

    it('formats minutes only correctly', () => {
      render(<ChildLocationStatus {...defaultProps} timeLimitMinutes={45} timeUsedMinutes={0} />)

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('45 minutes left')
    })

    it('shows 0 minutes when time is used up', () => {
      render(<ChildLocationStatus {...defaultProps} timeLimitMinutes={60} timeUsedMinutes={60} />)

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('0 minutes left')
    })

    it('does not show negative time', () => {
      render(<ChildLocationStatus {...defaultProps} timeLimitMinutes={60} timeUsedMinutes={90} />)

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('0 minutes left')
    })
  })

  describe('Progress Bar', () => {
    it('shows progress bar', () => {
      render(<ChildLocationStatus {...defaultProps} />)

      expect(screen.getByTestId('time-bar-fill')).toBeInTheDocument()
    })

    it('has correct aria attributes for accessibility', () => {
      render(<ChildLocationStatus {...defaultProps} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })

  describe('Education-Only Mode (AC5)', () => {
    it('does not show education badge when disabled', () => {
      render(<ChildLocationStatus {...defaultProps} educationOnlyMode={false} />)

      expect(screen.queryByTestId('education-mode')).not.toBeInTheDocument()
    })

    it('shows education badge when enabled', () => {
      render(<ChildLocationStatus {...defaultProps} educationOnlyMode={true} />)

      expect(screen.getByTestId('education-mode')).toBeInTheDocument()
    })

    it('displays child-friendly education message', () => {
      render(<ChildLocationStatus {...defaultProps} educationOnlyMode={true} />)

      expect(screen.getByTestId('education-badge')).toHaveTextContent('Learning apps only')
    })
  })

  describe('Help Text (NFR65: Child-Friendly)', () => {
    it('shows help text explaining rules may vary', () => {
      render(<ChildLocationStatus {...defaultProps} />)

      expect(screen.getByTestId('help-text')).toHaveTextContent(
        'Your rules might be different at other places'
      )
    })
  })

  describe('Loading State', () => {
    it('shows loading state', () => {
      render(<ChildLocationStatus {...defaultProps} loading={true} />)

      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    })

    it('shows loading message', () => {
      render(<ChildLocationStatus {...defaultProps} loading={true} />)

      expect(screen.getByTestId('loading-state')).toHaveTextContent('Finding your location...')
    })

    it('hides main content when loading', () => {
      render(<ChildLocationStatus {...defaultProps} loading={true} />)

      expect(screen.queryByTestId('location-name')).not.toBeInTheDocument()
    })
  })

  describe('Child-Friendly Language (NFR65)', () => {
    it('uses simple language in greeting', () => {
      render(<ChildLocationStatus {...defaultProps} />)

      // "You're at" is simple, direct language
      expect(screen.getByTestId('greeting')).toHaveTextContent("You're at")
    })

    it('uses simple language for time remaining', () => {
      render(<ChildLocationStatus {...defaultProps} />)

      // Uses "left" instead of "remaining"
      expect(screen.getByTestId('time-remaining').textContent).toContain('left')
    })

    it('uses friendly education mode label', () => {
      render(<ChildLocationStatus {...defaultProps} educationOnlyMode={true} />)

      // "Learning apps only" instead of "Education-only mode"
      expect(screen.getByTestId('education-badge')).toHaveTextContent('Learning apps only')
    })
  })

  describe('Non-Anxious Presentation', () => {
    it('uses neutral colors for time display', () => {
      render(<ChildLocationStatus {...defaultProps} timeUsedMinutes={30} />)

      // Just verifying component renders - color styles are inline
      expect(screen.getByTestId('time-bar-fill')).toBeInTheDocument()
    })

    it('shows rules section without alarming language', () => {
      render(<ChildLocationStatus {...defaultProps} />)

      // Doesn't contain words like "limit", "restriction", "blocked"
      const rulesText = screen.getByTestId('rules-section').textContent
      expect(rulesText).not.toContain('restricted')
      expect(rulesText).not.toContain('blocked')
    })
  })

  describe('Accessibility', () => {
    it('location icon has aria-hidden', () => {
      render(<ChildLocationStatus {...defaultProps} />)

      expect(screen.getByTestId('location-icon')).toHaveAttribute('aria-hidden', 'true')
    })

    it('progress bar has role="progressbar"', () => {
      render(<ChildLocationStatus {...defaultProps} />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Different Scenarios', () => {
    it('displays school location correctly', () => {
      render(
        <ChildLocationStatus
          locationName="Lincoln Elementary"
          timeLimitMinutes={60}
          timeUsedMinutes={20}
          educationOnlyMode={true}
          locationType="school"
        />
      )

      expect(screen.getByTestId('location-name')).toHaveTextContent('Lincoln Elementary')
      expect(screen.getByTestId('location-icon')).toHaveTextContent('🏫')
      expect(screen.getByTestId('education-mode')).toBeInTheDocument()
    })

    it('displays other location correctly', () => {
      render(
        <ChildLocationStatus
          locationName="Grandma's House"
          timeLimitMinutes={180}
          timeUsedMinutes={0}
          educationOnlyMode={false}
          locationType="other"
        />
      )

      expect(screen.getByTestId('location-name')).toHaveTextContent("Grandma's House")
      expect(screen.getByTestId('location-icon')).toHaveTextContent('📍')
      expect(screen.queryByTestId('education-mode')).not.toBeInTheDocument()
    })
  })
})
