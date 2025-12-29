/**
 * Unit tests for CrisisResourceCard component.
 *
 * Story 7.3: Child Allowlist Visibility - AC2, AC3, AC7
 * Tests the crisis resource card display and functionality.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CrisisResourceCard } from '../CrisisResourceCard'
import type { CrisisResource } from '@fledgely/shared'

describe('CrisisResourceCard', () => {
  const mockResource: CrisisResource = {
    id: 'test-resource',
    domain: 'testresource.org',
    pattern: '*.testresource.org',
    category: 'crisis_general',
    name: 'Test Resource',
    description: 'A test crisis resource for helping people.',
    phone: '1-800-555-1234',
    text: 'Text HELP to 12345',
    aliases: [],
    regional: false,
  }

  describe('resource information display (AC2)', () => {
    it('displays the resource name', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      expect(screen.getByRole('heading', { name: 'Test Resource' })).toBeInTheDocument()
    })

    it('displays the resource description', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      expect(screen.getByText('A test crisis resource for helping people.')).toBeInTheDocument()
    })

    it('displays "Always Private" badge', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      expect(screen.getByText('Always Private')).toBeInTheDocument()
    })

    it('has accessible label for privacy badge', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      expect(screen.getByLabelText('This resource is always private')).toBeInTheDocument()
    })
  })

  describe('phone and text options (AC2)', () => {
    it('displays phone link when phone is available', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      const phoneLink = screen.getByRole('link', { name: /call test resource/i })
      expect(phoneLink).toBeInTheDocument()
      expect(phoneLink).toHaveAttribute('href', 'tel:18005551234')
    })

    it('displays text option when text is available', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      expect(screen.getByText('Text HELP to 12345')).toBeInTheDocument()
    })

    it('does not display phone link when phone is null', () => {
      const resourceWithoutPhone: CrisisResource = {
        ...mockResource,
        phone: null,
      }

      render(<CrisisResourceCard resource={resourceWithoutPhone} />)

      expect(screen.queryByRole('link', { name: /call/i })).not.toBeInTheDocument()
    })

    it('does not display text option when text is null', () => {
      const resourceWithoutText: CrisisResource = {
        ...mockResource,
        text: null,
      }

      render(<CrisisResourceCard resource={resourceWithoutText} />)

      expect(screen.queryByText(/Text.*to/i)).not.toBeInTheDocument()
    })

    it('does not display contact info section when both phone and text are null', () => {
      const resourceWithoutContact: CrisisResource = {
        ...mockResource,
        phone: null,
        text: null,
      }

      render(<CrisisResourceCard resource={resourceWithoutContact} />)

      expect(screen.queryByRole('group', { name: 'Contact options' })).not.toBeInTheDocument()
    })
  })

  describe('clickable links (AC3)', () => {
    it('has a visit website link', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      const visitLink = screen.getByRole('link', { name: /visit test resource website/i })
      expect(visitLink).toBeInTheDocument()
    })

    it('website link has correct href', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      const visitLink = screen.getByRole('link', { name: /visit test resource website/i })
      expect(visitLink).toHaveAttribute('href', 'https://testresource.org')
    })

    it('website link opens in new tab', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      const visitLink = screen.getByRole('link', { name: /visit test resource website/i })
      expect(visitLink).toHaveAttribute('target', '_blank')
    })

    it('website link has noopener noreferrer for security', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      const visitLink = screen.getByRole('link', { name: /visit test resource website/i })
      expect(visitLink).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('accessibility (AC7)', () => {
    it('renders as an article element', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('article is labelled by the resource name', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      const article = screen.getByRole('article')
      expect(article).toHaveAttribute('aria-labelledby', 'resource-test-resource')
    })

    it('heading has correct id for labelling', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      const heading = screen.getByRole('heading', { name: 'Test Resource' })
      expect(heading).toHaveAttribute('id', 'resource-test-resource')
    })

    it('phone link has accessible label', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      const phoneLink = screen.getByRole('link', { name: /call test resource at 1-800-555-1234/i })
      expect(phoneLink).toBeInTheDocument()
    })

    it('text option has accessible label', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      expect(screen.getByLabelText(/text option: text help to 12345/i)).toBeInTheDocument()
    })

    it('visit link has accessible label mentioning new tab', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      expect(
        screen.getByRole('link', { name: /visit test resource website \(opens in new tab\)/i })
      ).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('applies custom className when provided', () => {
      const { container } = render(
        <CrisisResourceCard resource={mockResource} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass('crisis-resource-card')
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('security (URL injection prevention)', () => {
    it('rejects javascript: protocol in domain', () => {
      const maliciousResource: CrisisResource = {
        ...mockResource,
        domain: 'javascript:alert("xss")',
      }

      render(<CrisisResourceCard resource={maliciousResource} />)

      // Should not render as a link
      expect(screen.queryByRole('link', { name: /visit.*website/i })).not.toBeInTheDocument()
      // Should show unavailable message
      expect(screen.getByText('Website Unavailable')).toBeInTheDocument()
    })

    it('rejects data: protocol in domain', () => {
      const maliciousResource: CrisisResource = {
        ...mockResource,
        domain: 'data:text/html,<script>alert("xss")</script>',
      }

      render(<CrisisResourceCard resource={maliciousResource} />)

      expect(screen.queryByRole('link', { name: /visit.*website/i })).not.toBeInTheDocument()
      expect(screen.getByText('Website Unavailable')).toBeInTheDocument()
    })

    it('rejects domain with HTML injection attempts', () => {
      const maliciousResource: CrisisResource = {
        ...mockResource,
        domain: '<script>alert("xss")</script>.com',
      }

      render(<CrisisResourceCard resource={maliciousResource} />)

      expect(screen.queryByRole('link', { name: /visit.*website/i })).not.toBeInTheDocument()
    })

    it('accepts valid domain format', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      const visitLink = screen.getByRole('link', { name: /visit.*website/i })
      expect(visitLink).toHaveAttribute('href', 'https://testresource.org')
    })

    it('accepts domain with subdomains', () => {
      const subdomainResource: CrisisResource = {
        ...mockResource,
        domain: 'help.crisis.org',
      }

      render(<CrisisResourceCard resource={subdomainResource} />)

      const visitLink = screen.getByRole('link', { name: /visit.*website/i })
      expect(visitLink).toHaveAttribute('href', 'https://help.crisis.org')
    })
  })

  describe('security (phone number validation)', () => {
    it('sanitizes phone number with special characters', () => {
      render(<CrisisResourceCard resource={mockResource} />)

      const phoneLink = screen.getByRole('link', { name: /call/i })
      // Original: 1-800-555-1234 should become tel:18005551234
      expect(phoneLink).toHaveAttribute('href', 'tel:18005551234')
    })

    it('does not render phone link for invalid short phone', () => {
      const shortPhoneResource: CrisisResource = {
        ...mockResource,
        phone: '12', // Too short (< 3 digits)
      }

      render(<CrisisResourceCard resource={shortPhoneResource} />)

      expect(screen.queryByRole('link', { name: /call/i })).not.toBeInTheDocument()
    })

    it('renders short emergency numbers like 988', () => {
      const emergencyResource: CrisisResource = {
        ...mockResource,
        phone: '988',
      }

      render(<CrisisResourceCard resource={emergencyResource} />)

      const phoneLink = screen.getByRole('link', { name: /call/i })
      expect(phoneLink).toHaveAttribute('href', 'tel:988')
    })

    it('does not render phone link for excessively long number', () => {
      const longPhoneResource: CrisisResource = {
        ...mockResource,
        phone: '12345678901234567890', // 20 digits > 15
      }

      render(<CrisisResourceCard resource={longPhoneResource} />)

      expect(screen.queryByRole('link', { name: /call/i })).not.toBeInTheDocument()
    })
  })
})
