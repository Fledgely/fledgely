/**
 * Tests for MonitoringCapabilitiesCard Component
 *
 * Story 8.8: Encrypted Traffic Display
 *
 * Tests transparency messaging and honest limitations display.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MonitoringCapabilitiesCard } from './MonitoringCapabilitiesCard'
import { DeviceHealthMetrics } from '../../hooks/useDevices'

const createMockMetrics = (overrides: Partial<DeviceHealthMetrics> = {}): DeviceHealthMetrics => ({
  captureSuccessRate24h: 95,
  uploadQueueSize: 0,
  networkStatus: 'online',
  batteryLevel: 80,
  batteryCharging: false,
  appVersion: '1.0.0',
  updateAvailable: false,
  collectedAt: Date.now(),
  lastHealthSync: new Date(),
  encryptedTrafficPercent: 92,
  ...overrides,
})

describe('MonitoringCapabilitiesCard (Story 8.8)', () => {
  describe('AC1: Capability Explanation', () => {
    it('should display what monitoring captures', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      expect(screen.getByTestId('what-we-capture')).toBeInTheDocument()
      expect(screen.getByText(/Screenshots at regular intervals/)).toBeInTheDocument()
      expect(screen.getByText(/Time spent in apps and websites/)).toBeInTheDocument()
      expect(screen.getByText(/Device activity status/)).toBeInTheDocument()
    })

    it('should explain screenshots clearly', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      expect(screen.getByText(/shows what's on screen/)).toBeInTheDocument()
    })
  })

  describe('AC2: Limitation Transparency', () => {
    it('should display what monitoring cannot see', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      expect(screen.getByTestId('what-we-cannot-see')).toBeInTheDocument()
      expect(screen.getByText(/Encrypted message content/)).toBeInTheDocument()
      expect(screen.getByText(/Passwords or login inputs/)).toBeInTheDocument()
      expect(screen.getByText(/Private or incognito browsing content/)).toBeInTheDocument()
      expect(screen.getByText(/End-to-end encrypted apps/)).toBeInTheDocument()
    })

    it('should mention specific encrypted apps', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      expect(screen.getByText(/Signal, WhatsApp/)).toBeInTheDocument()
    })
  })

  describe('AC3: Honest Messaging', () => {
    it('should use honest language about limitations', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      // Should NOT contain surveillance-type language
      const content = screen.getByTestId('monitoring-capabilities-card').textContent || ''

      expect(content).not.toContain('monitors everything')
      expect(content).not.toContain('complete visibility')
      expect(content).not.toContain('surveillance system')
      expect(content).not.toContain('spy')
    })

    it('should explain encryption honestly', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      expect(screen.getByText(/can see which sites are visited/)).toBeInTheDocument()
      // The component uses "actual page content is encrypted in transit" or
      // "specific content typed or read" depending on which text block
      expect(
        screen.getByText(/actual page content is encrypted/) ||
          screen.getByText(/content typed or read/)
      ).toBeTruthy()
    })
  })

  describe('AC4: HTTPS Indicator', () => {
    it('should display encrypted traffic percentage when available', () => {
      const metrics = createMockMetrics({ encryptedTrafficPercent: 92 })
      render(<MonitoringCapabilitiesCard healthMetrics={metrics} defaultExpanded={true} />)

      expect(screen.getByTestId('encryption-percent')).toHaveTextContent('92% HTTPS')
    })

    it('should show typical percentage when metrics unavailable', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      expect(screen.getByTestId('encryption-percent-unavailable')).toHaveTextContent(
        '~95% HTTPS (typical)'
      )
    })

    it('should handle zero encryption percentage', () => {
      const metrics = createMockMetrics({ encryptedTrafficPercent: 0 })
      render(<MonitoringCapabilitiesCard healthMetrics={metrics} defaultExpanded={true} />)

      expect(screen.getByTestId('encryption-percent')).toHaveTextContent('0% HTTPS')
    })

    it('should handle null encryption percentage', () => {
      const metrics = createMockMetrics({ encryptedTrafficPercent: null })
      render(<MonitoringCapabilitiesCard healthMetrics={metrics} defaultExpanded={true} />)

      expect(screen.getByTestId('encryption-percent-unavailable')).toBeInTheDocument()
    })
  })

  describe('AC5: Purpose Framing', () => {
    it('should explain purpose as conversation-starter', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      expect(screen.getByTestId('purpose-section')).toBeInTheDocument()
      expect(screen.getByText(/helps start conversations/)).toBeInTheDocument()
      expect(screen.getByText(/not replace them/)).toBeInTheDocument()
    })

    it('should frame as tool for discussion', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      expect(screen.getByText(/tool for discussion and awareness/)).toBeInTheDocument()
    })

    it('should emphasize trust-building, not surveillance', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      expect(screen.getByText(/support trust-building/)).toBeInTheDocument()
      expect(screen.getByText(/not surveillance/)).toBeInTheDocument()
    })
  })

  describe('Expandable Behavior', () => {
    it('should be collapsed by default', () => {
      render(<MonitoringCapabilitiesCard />)

      // Header should be visible
      expect(screen.getByText('About Monitoring')).toBeInTheDocument()

      // Content should be hidden (aria-hidden)
      const content = screen.getByTestId('what-we-capture').parentElement
      expect(content).toHaveAttribute('aria-hidden', 'true')
    })

    it('should expand when header is clicked', () => {
      render(<MonitoringCapabilitiesCard />)

      const header = screen.getByTestId('capabilities-header')
      fireEvent.click(header)

      // Content should now be visible
      const content = screen.getByTestId('what-we-capture').parentElement
      expect(content).toHaveAttribute('aria-hidden', 'false')
    })

    it('should collapse when expanded header is clicked', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      const header = screen.getByTestId('capabilities-header')
      fireEvent.click(header)

      const content = screen.getByTestId('what-we-capture').parentElement
      expect(content).toHaveAttribute('aria-hidden', 'true')
    })

    it('should be expanded by default when defaultExpanded is true', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      const content = screen.getByTestId('what-we-capture').parentElement
      expect(content).toHaveAttribute('aria-hidden', 'false')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<MonitoringCapabilitiesCard />)

      const header = screen.getByTestId('capabilities-header')
      expect(header).toHaveAttribute('role', 'button')
      expect(header).toHaveAttribute('aria-expanded', 'false')
      expect(header).toHaveAttribute('aria-label')
      expect(header).toHaveAttribute('tabIndex', '0')
    })

    it('should toggle with keyboard', () => {
      render(<MonitoringCapabilitiesCard />)

      const header = screen.getByTestId('capabilities-header')
      fireEvent.keyDown(header, { key: 'Enter' })

      const content = screen.getByTestId('what-we-capture').parentElement
      expect(content).toHaveAttribute('aria-hidden', 'false')
    })

    it('should toggle with Space key', () => {
      render(<MonitoringCapabilitiesCard />)

      const header = screen.getByTestId('capabilities-header')
      fireEvent.keyDown(header, { key: ' ' })

      const content = screen.getByTestId('what-we-capture').parentElement
      expect(content).toHaveAttribute('aria-hidden', 'false')
    })

    it('should have role="list" for capability lists', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      const lists = screen.getAllByRole('list')
      expect(lists.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Non-Accusatory Language Verification', () => {
    it('should NOT contain words like "spy", "track", or "monitor everything"', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      const content = screen.getByTestId('monitoring-capabilities-card').textContent || ''
      const lowerContent = content.toLowerCase()

      expect(lowerContent).not.toContain('spy')
      expect(lowerContent).not.toContain('track everything')
      expect(lowerContent).not.toContain('monitor everything')
      expect(lowerContent).not.toContain('complete control')
    })

    it('should use positive framing words', () => {
      render(<MonitoringCapabilitiesCard defaultExpanded={true} />)

      expect(screen.getByText(/conversation/)).toBeInTheDocument()
      expect(screen.getByText(/trust/)).toBeInTheDocument()
      expect(screen.getByText(/discussion/)).toBeInTheDocument()
      expect(screen.getByText(/awareness/)).toBeInTheDocument()
    })
  })
})
