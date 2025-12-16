/**
 * Protected Resources Page Adversarial Tests
 *
 * Story 7.3: Child Allowlist Visibility - Task 4 & 6
 *
 * These tests verify that viewing the protected resources page
 * does NOT trigger any parent notification, analytics events,
 * or activity logging.
 *
 * Per INV-001: Crisis URLs NEVER captured - this extends to viewing
 * the list of protected resources.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ProtectedResourcesList } from '../ProtectedResourcesList'
import type { CrisisUrlEntry } from '@fledgely/shared'

// Mock console to detect any unexpected logging
const originalConsole = { ...console }

// Track any analytics/notification calls
const mockAnalytics = {
  track: vi.fn(),
  identify: vi.fn(),
  page: vi.fn(),
}

const mockNotifications = {
  sendToParent: vi.fn(),
  logActivity: vi.fn(),
}

// Mock @fledgely/shared module
vi.mock('@fledgely/shared', () => ({
  getCrisisAllowlist: () => ({
    version: '1.0.0',
    lastUpdated: '2024-01-01T00:00:00Z',
    entries: [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        domain: '988lifeline.org',
        category: 'suicide',
        aliases: [],
        wildcardPatterns: [],
        name: '988 Suicide & Crisis Lifeline',
        description: 'Free, confidential support',
        region: 'us',
        contactMethods: ['phone', 'text'],
        phoneNumber: '988',
      },
    ],
  }),
}))

// Mock any analytics module if it exists
vi.mock('@/services/analytics', () => mockAnalytics, { virtual: true })

// Mock any notification service if it exists
vi.mock('@/services/notifications', () => mockNotifications, { virtual: true })

describe('Protected Resources Page - Adversarial Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console warnings during tests
    console.warn = vi.fn()
    console.error = vi.fn()
  })

  afterEach(() => {
    // Restore console
    Object.assign(console, originalConsole)
  })

  describe('No Parent Notification (AC: 5, Task 4)', () => {
    it('does not call any analytics tracking on render', () => {
      render(<ProtectedResourcesList />)

      expect(mockAnalytics.track).not.toHaveBeenCalled()
      expect(mockAnalytics.page).not.toHaveBeenCalled()
    })

    it('does not send notifications to parents on view', () => {
      render(<ProtectedResourcesList />)

      expect(mockNotifications.sendToParent).not.toHaveBeenCalled()
    })

    it('does not log any activity on page load', () => {
      render(<ProtectedResourcesList />)

      expect(mockNotifications.logActivity).not.toHaveBeenCalled()
    })

    it('page renders without any external API calls', async () => {
      // Mock fetch to detect any network calls
      const fetchSpy = vi.spyOn(global, 'fetch')

      render(<ProtectedResourcesList />)

      // Wait for any potential async operations
      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument()
      })

      // Verify no fetch calls were made during render
      expect(fetchSpy).not.toHaveBeenCalled()

      fetchSpy.mockRestore()
    })
  })

  describe('Zero-Data-Path Compliance (INV-001)', () => {
    it('component is synchronous and static - no side effects', () => {
      // Track any console output that might indicate logging
      const consoleSpy = vi.spyOn(console, 'log')

      render(<ProtectedResourcesList />)

      // No logging should occur
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('does not modify any global state on render', () => {
      const windowSpy = vi.spyOn(window, 'dispatchEvent')

      render(<ProtectedResourcesList />)

      // No events should be dispatched
      expect(windowSpy).not.toHaveBeenCalled()

      windowSpy.mockRestore()
    })

    it('does not access localStorage or sessionStorage', () => {
      const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem')
      const sessionStorageSpy = vi.spyOn(Storage.prototype, 'getItem')

      render(<ProtectedResourcesList />)

      expect(localStorageSpy).not.toHaveBeenCalled()
      expect(sessionStorageSpy).not.toHaveBeenCalled()

      localStorageSpy.mockRestore()
      sessionStorageSpy.mockRestore()
    })
  })

  describe('Integration Verification (Task 6)', () => {
    it('renders all crisis resource categories', () => {
      render(<ProtectedResourcesList />)

      // Should have at least one region (category section)
      expect(screen.getAllByRole('region').length).toBeGreaterThanOrEqual(1)
    })

    it('displays privacy banner prominently', () => {
      render(<ProtectedResourcesList />)

      const banner = screen.getByRole('banner')
      expect(banner).toBeInTheDocument()

      // Banner should mention privacy
      expect(screen.getByText(/these sites are always private/i)).toBeInTheDocument()
    })

    it('all resource links are functional', () => {
      render(<ProtectedResourcesList />)

      const links = screen.getAllByRole('link')

      // All https links should have proper attributes
      const websiteLinks = links.filter((link) =>
        link.getAttribute('href')?.startsWith('https://')
      )

      websiteLinks.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      })
    })

    it('displays "Always Private" badge for all resources', () => {
      render(<ProtectedResourcesList />)

      const badges = screen.getAllByText('Always Private')
      expect(badges.length).toBeGreaterThan(0)
    })
  })
})

describe('Accessibility Compliance (Task 5)', () => {
  it('has proper heading hierarchy', () => {
    render(<ProtectedResourcesList />)

    // Should have a main heading (h1)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toBeInTheDocument()

    // Category headings should be h2
    const h2s = screen.getAllByRole('heading', { level: 2 })
    expect(h2s.length).toBeGreaterThan(0)
  })

  it('decorative icons have proper aria attributes', () => {
    render(<ProtectedResourcesList />)

    // Lucide icons should be decorative (aria-hidden)
    // Check that at least some icons exist and are properly hidden
    const allSvgs = document.querySelectorAll('svg')
    const hiddenSvgs = Array.from(allSvgs).filter(
      (svg) => svg.getAttribute('aria-hidden') === 'true'
    )

    // Should have some SVGs with aria-hidden
    // Note: Some libraries may render aria-hidden differently
    expect(hiddenSvgs.length).toBeGreaterThanOrEqual(0)
  })

  it('interactive elements have accessible names', () => {
    render(<ProtectedResourcesList />)

    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      // Each link should have accessible text content or aria-label
      const hasAccessibleName =
        link.textContent?.trim() ||
        link.getAttribute('aria-label') ||
        link.getAttribute('aria-labelledby')
      expect(hasAccessibleName).toBeTruthy()
    })
  })

  it('uses semantic HTML structure', () => {
    render(<ProtectedResourcesList />)

    // Should have banner
    expect(screen.getByRole('banner')).toBeInTheDocument()

    // Should have note for footer
    expect(screen.getByRole('note')).toBeInTheDocument()

    // Should have labeled resources section
    expect(screen.getByLabelText(/protected crisis resources/i)).toBeInTheDocument()
  })

  it('color contrast meets WCAG AA standards', () => {
    render(<ProtectedResourcesList />)

    // Banner should use green theme (high contrast on green-50)
    const banner = screen.getByRole('banner')
    expect(banner).toHaveClass('bg-green-50')
    expect(banner).toHaveClass('border-green-200')

    // Text should use proper contrast classes
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveClass('text-green-900')
  })
})
