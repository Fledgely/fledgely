/**
 * Tests for Location Abuse Resources Component
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC5: Conflict resolution resources
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationAbuseResources } from '../LocationAbuseResources'
import { LOCATION_ABUSE_RESOURCES } from '@fledgely/shared'

describe('LocationAbuseResources', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders container', () => {
      render(<LocationAbuseResources />)

      expect(screen.getByTestId('location-abuse-resources')).toBeInTheDocument()
    })

    it('displays title', () => {
      render(<LocationAbuseResources />)

      expect(screen.getByText(LOCATION_ABUSE_RESOURCES.title)).toBeInTheDocument()
    })

    it('displays intro text', () => {
      render(<LocationAbuseResources />)

      expect(screen.getByText(LOCATION_ABUSE_RESOURCES.intro)).toBeInTheDocument()
    })

    it('displays all resources', () => {
      render(<LocationAbuseResources />)

      for (const resource of LOCATION_ABUSE_RESOURCES.resources) {
        expect(screen.getByText(resource.name)).toBeInTheDocument()
        expect(screen.getByText(resource.description)).toBeInTheDocument()
      }
    })

    it('displays footer disclaimer', () => {
      render(<LocationAbuseResources />)

      expect(screen.getByText(/These resources are provided/i)).toBeInTheDocument()
    })
  })

  describe('Resource Links', () => {
    it('renders resource links with correct href', () => {
      render(<LocationAbuseResources />)

      for (const resource of LOCATION_ABUSE_RESOURCES.resources) {
        const link = screen.getByTestId(`resource-link-${resource.id}`)
        expect(link).toHaveAttribute('href', resource.url)
      }
    })

    it('links open in new tab', () => {
      render(<LocationAbuseResources />)

      for (const resource of LOCATION_ABUSE_RESOURCES.resources) {
        const link = screen.getByTestId(`resource-link-${resource.id}`)
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      }
    })

    it('calls onResourceClick when link clicked', () => {
      const onResourceClick = vi.fn()
      render(<LocationAbuseResources onResourceClick={onResourceClick} />)

      const firstResource = LOCATION_ABUSE_RESOURCES.resources[0]
      fireEvent.click(screen.getByTestId(`resource-link-${firstResource.id}`))

      expect(onResourceClick).toHaveBeenCalledWith(firstResource.id)
    })
  })

  describe('Modal Mode', () => {
    it('renders modal overlay when isModal true', () => {
      render(<LocationAbuseResources isModal={true} onClose={() => {}} />)

      expect(screen.getByTestId('modal-overlay')).toBeInTheDocument()
    })

    it('shows close button in modal mode', () => {
      render(<LocationAbuseResources isModal={true} onClose={() => {}} />)

      expect(screen.getByTestId('close-button')).toBeInTheDocument()
    })

    it('hides close button when not modal', () => {
      render(<LocationAbuseResources />)

      expect(screen.queryByTestId('close-button')).not.toBeInTheDocument()
    })

    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn()
      render(<LocationAbuseResources isModal={true} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('close-button'))

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when overlay clicked', () => {
      const onClose = vi.fn()
      render(<LocationAbuseResources isModal={true} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('modal-overlay'))

      expect(onClose).toHaveBeenCalled()
    })

    it('does not call onClose when content clicked', () => {
      const onClose = vi.fn()
      render(<LocationAbuseResources isModal={true} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('location-abuse-resources'))

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has role="dialog"', () => {
      render(<LocationAbuseResources />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-labelledby on container', () => {
      render(<LocationAbuseResources />)

      const container = screen.getByTestId('location-abuse-resources')
      expect(container).toHaveAttribute('aria-labelledby', 'resources-title')
    })

    it('resource list has role="list"', () => {
      render(<LocationAbuseResources />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('resource list has aria-label', () => {
      render(<LocationAbuseResources />)

      expect(screen.getByLabelText('Conflict resolution resources')).toBeInTheDocument()
    })

    it('close button has aria-label', () => {
      render(<LocationAbuseResources isModal={true} onClose={() => {}} />)

      expect(screen.getByLabelText('Close resources dialog')).toBeInTheDocument()
    })

    it('external link icon has aria-hidden', () => {
      render(<LocationAbuseResources />)

      const container = screen.getByTestId('location-abuse-resources')
      const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenIcons.length).toBeGreaterThan(0)
    })
  })

  describe('Touch targets', () => {
    it('close button meets 44x44px minimum', () => {
      render(<LocationAbuseResources isModal={true} onClose={() => {}} />)

      const closeButton = screen.getByTestId('close-button')
      expect(closeButton).toHaveStyle({ minHeight: '44px', minWidth: '44px' })
    })

    it('resource links meet 44px minimum height', () => {
      render(<LocationAbuseResources />)

      const firstResource = LOCATION_ABUSE_RESOURCES.resources[0]
      const link = screen.getByTestId(`resource-link-${firstResource.id}`)
      expect(link).toHaveStyle({ minHeight: '44px' })
    })
  })

  describe('Neutral tone', () => {
    it('intro does not contain blaming language', () => {
      render(<LocationAbuseResources />)

      const intro = LOCATION_ABUSE_RESOURCES.intro.toLowerCase()
      expect(intro).not.toContain('fault')
      expect(intro).not.toContain('blame')
      expect(intro).not.toContain('abuser')
    })

    it('footer disclaimer is neutral', () => {
      render(<LocationAbuseResources />)

      const footerText = screen.getByText(/These resources are provided/i)
      const text = footerText.textContent?.toLowerCase() || ''

      expect(text).toContain('unique')
      expect(text).toContain('professional')
    })
  })
})
