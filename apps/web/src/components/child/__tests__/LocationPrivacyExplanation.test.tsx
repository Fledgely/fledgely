/**
 * Tests for LocationPrivacyExplanation Component.
 *
 * Story 40.5: Location Privacy Controls
 * - AC1: Clear Privacy Explanation
 * - AC4: Data Sharing Limits
 * - AC5: Data Deletion at 18
 *
 * NFR Requirements:
 * - NFR65: Child-friendly language (6th-grade reading level)
 * - NFR49: 44x44px minimum touch targets
 * - NFR45: 4.5:1 contrast ratio
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationPrivacyExplanation } from '../LocationPrivacyExplanation'

describe('LocationPrivacyExplanation', () => {
  describe('Rendering', () => {
    it('renders the component', () => {
      render(<LocationPrivacyExplanation />)

      expect(screen.getByTestId('location-privacy-explanation')).toBeInTheDocument()
    })

    it('displays title', () => {
      render(<LocationPrivacyExplanation />)

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'How your location is used'
      )
    })

    it('has accessible region role', () => {
      render(<LocationPrivacyExplanation />)

      expect(screen.getByRole('region', { name: /location privacy/i })).toBeInTheDocument()
    })
  })

  describe('Privacy Sections (AC1)', () => {
    it('displays what we collect section', () => {
      render(<LocationPrivacyExplanation />)

      expect(screen.getByTestId('section-collect')).toBeInTheDocument()
      expect(screen.getByText('What we check')).toBeInTheDocument()
    })

    it('displays family-only section (AC4)', () => {
      render(<LocationPrivacyExplanation />)

      expect(screen.getByTestId('section-family')).toBeInTheDocument()
      expect(screen.getByText('Who can see it')).toBeInTheDocument()
    })

    it('displays age 18 section (AC5)', () => {
      render(<LocationPrivacyExplanation />)

      expect(screen.getByTestId('section-eighteen')).toBeInTheDocument()
      expect(screen.getByText('When you turn 18')).toBeInTheDocument()
    })

    it('displays your rights section', () => {
      render(<LocationPrivacyExplanation />)

      expect(screen.getByTestId('section-rights')).toBeInTheDocument()
      expect(screen.getByText('Your choice')).toBeInTheDocument()
    })
  })

  describe('Child-Friendly Content (NFR65)', () => {
    it('uses simple language for data collection', () => {
      render(<LocationPrivacyExplanation />)

      // Check content mentions zones, not complex tracking
      const collectSection = screen.getByTestId('section-collect')
      expect(collectSection.textContent).toContain('zone')
      expect(collectSection.textContent).not.toContain('coordinates')
    })

    it('explains family-only access clearly', () => {
      render(<LocationPrivacyExplanation />)

      const familySection = screen.getByTestId('section-family')
      expect(familySection.textContent).toContain('Only your family')
      expect(familySection.textContent).toContain('never share')
    })

    it('explains 18-year-old deletion', () => {
      render(<LocationPrivacyExplanation />)

      const eighteenSection = screen.getByTestId('section-eighteen')
      expect(eighteenSection.textContent).toContain('18')
      expect(eighteenSection.textContent).toContain('deleted')
    })
  })

  describe('Request Disable Link', () => {
    it('shows request disable button by default', () => {
      render(<LocationPrivacyExplanation />)

      expect(screen.getByTestId('request-disable-link')).toBeInTheDocument()
    })

    it('hides request disable button when disabled', () => {
      render(<LocationPrivacyExplanation showRequestDisable={false} />)

      expect(screen.queryByTestId('request-disable-link')).not.toBeInTheDocument()
    })

    it('calls onRequestDisable when clicked', () => {
      const handleClick = vi.fn()
      render(<LocationPrivacyExplanation onRequestDisable={handleClick} />)

      fireEvent.click(screen.getByTestId('request-disable-link'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('has accessible label for the button', () => {
      render(<LocationPrivacyExplanation />)

      expect(screen.getByRole('button', { name: /turn off location/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('icons have aria-hidden', () => {
      render(<LocationPrivacyExplanation />)

      const sections = screen.getAllByTestId(/^section-/)
      sections.forEach((section) => {
        const icon = section.querySelector('[aria-hidden="true"]')
        expect(icon).toBeInTheDocument()
      })
    })

    it('uses semantic heading structure', () => {
      render(<LocationPrivacyExplanation />)

      // Main title is h2
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      // Section titles are h3
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4)
    })
  })
})
