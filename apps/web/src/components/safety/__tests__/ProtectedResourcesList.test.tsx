/**
 * Protected Resources List Tests
 *
 * Story 7.3: Child Allowlist Visibility - Task 1.2
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ProtectedResourcesList, getResourceCount } from '../ProtectedResourcesList'
import type { CrisisUrlEntry } from '@fledgely/shared'

// Mock the @fledgely/shared module
vi.mock('@fledgely/shared', () => ({
  getCrisisAllowlist: () => ({
    version: '1.0.0',
    lastUpdated: '2024-01-01T00:00:00Z',
    entries: mockAllResources,
  }),
}))

const mockAllResources: CrisisUrlEntry[] = [
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
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    domain: 'crisistextline.org',
    category: 'crisis',
    aliases: [],
    wildcardPatterns: [],
    name: 'Crisis Text Line',
    description: 'Text HOME to 741741',
    region: 'us',
    contactMethods: ['text'],
    textNumber: '741741',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    domain: 'thetrevorproject.org',
    category: 'lgbtq',
    aliases: [],
    wildcardPatterns: [],
    name: 'The Trevor Project',
    description: 'LGBTQ+ youth support',
    region: 'us',
    contactMethods: ['phone', 'text', 'chat'],
    phoneNumber: '1-866-488-7386',
  },
]

describe('ProtectedResourcesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Privacy Banner Display (AC: 6)', () => {
    it('displays privacy banner at top', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: /these sites are always private/i })
      ).toBeInTheDocument()
    })

    it('privacy banner is first in document order', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      const container = screen.getByRole('banner').closest('div')?.parentElement
      const firstChild = container?.firstElementChild

      expect(firstChild).toContainElement(screen.getByRole('banner'))
    })
  })

  describe('Resource Organization (AC: 1)', () => {
    it('displays resources organized by category', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      // Each category should be a section
      expect(screen.getAllByRole('region')).toHaveLength(3)
    })

    it('displays categories in priority order (crisis first)', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      const regions = screen.getAllByRole('region')

      // First should be crisis
      expect(within(regions[0]).getByRole('heading', { level: 2 }))
        .toHaveTextContent(/emergency help/i)

      // Second should be suicide
      expect(within(regions[1]).getByRole('heading', { level: 2 }))
        .toHaveTextContent(/feeling hopeless/i)
    })

    it('groups resources by their category', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      // Crisis category should contain Crisis Text Line
      const crisisSection = screen.getByRole('region', { name: /emergency help/i })
      expect(within(crisisSection).getByText('Crisis Text Line')).toBeInTheDocument()

      // Suicide category should contain 988 Lifeline
      const suicideSection = screen.getByRole('region', { name: /feeling hopeless/i })
      expect(within(suicideSection).getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument()
    })
  })

  describe('Resource Display (AC: 2)', () => {
    it('displays resource names', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      expect(screen.getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument()
      expect(screen.getByText('Crisis Text Line')).toBeInTheDocument()
      expect(screen.getByText('The Trevor Project')).toBeInTheDocument()
    })

    it('displays resource descriptions', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      expect(screen.getByText(/free, confidential support/i)).toBeInTheDocument()
      expect(screen.getByText(/text home to 741741/i)).toBeInTheDocument()
    })

    it('displays "Always Private" badge for each resource', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      const badges = screen.getAllByText('Always Private')
      expect(badges).toHaveLength(3)
    })
  })

  describe('Clickable Links (AC: 3)', () => {
    it('renders resource names as links', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      // Find the website link (https:// links open in new tab)
      const links = screen.getAllByRole('link')
      const websiteLinks = links.filter((link) => link.getAttribute('href')?.startsWith('https://'))
      expect(websiteLinks.length).toBeGreaterThan(0)
    })

    it('links point to correct domains', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      const links = screen.getAllByRole('link')
      const websiteLink = links.find((link) =>
        link.getAttribute('href') === 'https://988lifeline.org'
      )
      expect(websiteLink).toBeDefined()
    })

    it('links open in new tab', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      const links = screen.getAllByRole('link')
      const websiteLinks = links.filter((link) => link.getAttribute('href')?.startsWith('https://'))
      websiteLinks.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank')
      })
    })
  })

  describe('Child-Friendly Text (AC: 4)', () => {
    it('displays intro text in simple language', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      expect(
        screen.getByText(/these are special websites that can help you/i)
      ).toBeInTheDocument()
    })

    it('uses child-friendly category names', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      // Should use "Emergency Help" not "crisis"
      expect(screen.getByText(/emergency help/i)).toBeInTheDocument()

      // Should use "Feeling Hopeless" not "suicide"
      expect(screen.getByText(/feeling hopeless/i)).toBeInTheDocument()
    })

    it('displays footer reassurance message', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      expect(
        screen.getByText(/visiting any of these sites is always private/i)
      ).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has labeled resource section', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      // Resources section should have accessible label (role removed to avoid nested main landmarks)
      expect(
        screen.getByLabelText(/protected crisis resources/i)
      ).toBeInTheDocument()
    })

    it('footer has note role', () => {
      render(<ProtectedResourcesList resources={mockAllResources} />)

      expect(
        screen.getByRole('note', { name: /privacy reminder/i })
      ).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <ProtectedResourcesList resources={mockAllResources} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Empty State', () => {
    it('renders without crashing when no resources', () => {
      render(<ProtectedResourcesList resources={[]} />)

      // Should still show banner and intro
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('skips categories with no resources', () => {
      const singleResource: CrisisUrlEntry[] = [mockAllResources[0]]
      render(<ProtectedResourcesList resources={singleResource} />)

      // Should only have one category section
      expect(screen.getAllByRole('region')).toHaveLength(1)
    })
  })
})

describe('getResourceCount', () => {
  it('returns the total number of resources', () => {
    const count = getResourceCount()

    expect(count).toBe(mockAllResources.length)
  })
})
