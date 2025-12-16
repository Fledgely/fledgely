/**
 * CrisisResourceSuggestions Component Tests
 *
 * Story 7.6: Crisis Search Redirection - Task 6
 *
 * Tests for the crisis resource suggestions component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  CrisisResourceSuggestions,
  getResourceInfo,
  getResourcesForCategoryUI,
  CRISIS_RESOURCE_DATABASE,
} from '../CrisisResourceSuggestions'

// Mock window.open
const mockOpen = vi.fn()
const originalOpen = window.open

beforeEach(() => {
  window.open = mockOpen
  mockOpen.mockClear()
})

afterEach(() => {
  window.open = originalOpen
})

describe('CrisisResourceSuggestions', () => {
  describe('getResourceInfo', () => {
    it('returns resource info for known domain', () => {
      const info = getResourceInfo('988lifeline.org')

      expect(info.name).toBe('988 Suicide & Crisis Lifeline')
      expect(info.phone).toBe('988')
      expect(info.text).toBe('988')
    })

    it('returns placeholder for unknown domain', () => {
      const info = getResourceInfo('unknown-domain.org')

      expect(info.name).toBe('unknown-domain.org')
      expect(info.domain).toBe('unknown-domain.org')
      expect(info.description).toBe('Crisis support resource')
    })
  })

  describe('getResourcesForCategoryUI', () => {
    it('returns suicide resources for suicide category', () => {
      const resources = getResourcesForCategoryUI('suicide')

      expect(resources.length).toBeGreaterThan(0)
      expect(resources.some((r) => r.domain === '988lifeline.org')).toBe(true)
    })

    it('returns self-harm resources for self_harm category', () => {
      const resources = getResourcesForCategoryUI('self_harm')

      expect(resources.length).toBeGreaterThan(0)
    })

    it('returns abuse resources for abuse category', () => {
      const resources = getResourcesForCategoryUI('abuse')

      expect(resources.length).toBeGreaterThan(0)
      expect(resources.some((r) => r.domain === 'rainn.org' || r.domain === 'childhelp.org')).toBe(
        true
      )
    })

    it('returns help resources for help category', () => {
      const resources = getResourcesForCategoryUI('help')

      expect(resources.length).toBeGreaterThan(0)
    })
  })

  describe('CRISIS_RESOURCE_DATABASE', () => {
    it('contains 988 Lifeline', () => {
      expect(CRISIS_RESOURCE_DATABASE['988lifeline.org']).toBeDefined()
      expect(CRISIS_RESOURCE_DATABASE['988lifeline.org'].phone).toBe('988')
    })

    it('contains Crisis Text Line', () => {
      expect(CRISIS_RESOURCE_DATABASE['crisistextline.org']).toBeDefined()
      expect(CRISIS_RESOURCE_DATABASE['crisistextline.org'].text).toBe('HOME to 741741')
    })

    it('contains RAINN', () => {
      expect(CRISIS_RESOURCE_DATABASE['rainn.org']).toBeDefined()
      expect(CRISIS_RESOURCE_DATABASE['rainn.org'].phone).toBe('1-800-656-4673')
    })

    it('contains Childhelp', () => {
      expect(CRISIS_RESOURCE_DATABASE['childhelp.org']).toBeDefined()
    })
  })

  describe('Component Rendering', () => {
    it('renders resources for specified category', () => {
      render(<CrisisResourceSuggestions category="suicide" />)

      expect(screen.getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument()
    })

    it('renders resources from specific domains', () => {
      render(<CrisisResourceSuggestions resourceDomains={['rainn.org', 'childhelp.org']} />)

      expect(screen.getByText('RAINN')).toBeInTheDocument()
      expect(screen.getByText('Childhelp National Hotline')).toBeInTheDocument()
    })

    it('limits resources to maxResources', () => {
      render(
        <CrisisResourceSuggestions
          resourceDomains={[
            '988lifeline.org',
            'crisistextline.org',
            'rainn.org',
            'childhelp.org',
          ]}
          maxResources={2}
        />
      )

      expect(screen.getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument()
      expect(screen.getByText('Crisis Text Line')).toBeInTheDocument()
      expect(screen.queryByText('RAINN')).not.toBeInTheDocument()
    })

    it('defaults to help category when no category specified', () => {
      render(<CrisisResourceSuggestions />)

      // Should show at least one resource
      expect(screen.getByRole('region', { name: 'Crisis resources' })).toBeInTheDocument()
    })

    it('always shows 988 Lifeline as fallback', () => {
      render(<CrisisResourceSuggestions resourceDomains={[]} />)

      expect(screen.getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument()
    })

    it('renders resource descriptions', () => {
      render(<CrisisResourceSuggestions category="suicide" />)

      expect(screen.getByText('Free, confidential support available 24/7')).toBeInTheDocument()
    })
  })

  describe('Quick Action Buttons', () => {
    it('renders phone button with tel: link', () => {
      render(<CrisisResourceSuggestions resourceDomains={['988lifeline.org']} />)

      const phoneLink = screen.getByRole('link', { name: /Call 988/i })
      expect(phoneLink).toHaveAttribute('href', 'tel:988')
    })

    it('renders text button with sms: link', () => {
      render(<CrisisResourceSuggestions resourceDomains={['crisistextline.org']} />)

      const textLink = screen.getByRole('link', { name: /Text HOME to 741741/i })
      expect(textLink).toHaveAttribute('href', expect.stringContaining('sms:'))
    })

    it('renders chat button with external link', () => {
      render(<CrisisResourceSuggestions resourceDomains={['988lifeline.org']} />)

      const chatLink = screen.getByRole('link', { name: /Chat/i })
      expect(chatLink).toHaveAttribute('href', 'https://988lifeline.org/chat')
      expect(chatLink).toHaveAttribute('target', '_blank')
      expect(chatLink).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('External Links', () => {
    it('opens resource website in new tab on click', () => {
      render(<CrisisResourceSuggestions resourceDomains={['988lifeline.org']} />)

      const resourceButton = screen.getByRole('button', {
        name: /988 Suicide & Crisis Lifeline/i,
      })
      fireEvent.click(resourceButton)

      expect(mockOpen).toHaveBeenCalledWith(
        'https://988lifeline.org',
        '_blank',
        'noopener,noreferrer'
      )
    })

    it('calls onResourceClick callback when resource clicked', () => {
      const onResourceClick = vi.fn()
      render(
        <CrisisResourceSuggestions
          resourceDomains={['rainn.org']}
          onResourceClick={onResourceClick}
        />
      )

      const resourceButton = screen.getByRole('button', { name: /RAINN/i })
      fireEvent.click(resourceButton)

      expect(onResourceClick).toHaveBeenCalledWith('rainn.org')
    })

    it('all external links have noopener noreferrer', () => {
      render(<CrisisResourceSuggestions resourceDomains={['988lifeline.org']} />)

      const chatLink = screen.getByRole('link', { name: /Chat/i })
      expect(chatLink).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('Accessibility', () => {
    it('has region role with label', () => {
      render(<CrisisResourceSuggestions category="suicide" />)

      expect(screen.getByRole('region', { name: 'Crisis resources' })).toBeInTheDocument()
    })

    it('resource cards have article role', () => {
      render(<CrisisResourceSuggestions resourceDomains={['988lifeline.org']} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('buttons are keyboard accessible', () => {
      render(<CrisisResourceSuggestions resourceDomains={['988lifeline.org']} />)

      const button = screen.getByRole('button', { name: /988 Suicide & Crisis Lifeline/i })
      expect(button).toHaveClass('focus:ring-2')
    })

    it('links have visible focus styles', () => {
      render(<CrisisResourceSuggestions resourceDomains={['988lifeline.org']} />)

      const phoneLink = screen.getByRole('link', { name: /Call 988/i })
      expect(phoneLink).toHaveClass('focus:outline-none', 'focus:ring-2')
    })
  })

  describe('Compact Mode', () => {
    it('renders with reduced spacing in compact mode', () => {
      render(<CrisisResourceSuggestions resourceDomains={['988lifeline.org']} compact />)

      const card = screen.getByRole('article')
      expect(card).toHaveClass('p-3')
    })

    it('renders with normal spacing when not compact', () => {
      render(<CrisisResourceSuggestions resourceDomains={['988lifeline.org']} compact={false} />)

      const card = screen.getByRole('article')
      expect(card).toHaveClass('p-4')
    })
  })

  describe('Zero-Data-Path Compliance', () => {
    it('does not make any network calls', () => {
      const fetchSpy = vi.spyOn(global, 'fetch')

      render(<CrisisResourceSuggestions category="suicide" />)

      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()
    })

    it('does not log any data', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      render(<CrisisResourceSuggestions category="abuse" />)

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
