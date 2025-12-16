/**
 * Resource Category Tests
 *
 * Story 7.3: Child Allowlist Visibility - Task 2
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ResourceCategory,
  categoryDisplayNames,
  categoryDescriptions,
  groupResourcesByCategory,
  getCategoryDisplayOrder,
} from '../ResourceCategory'
import type { CrisisUrlEntry, CrisisResourceCategory } from '@fledgely/shared'

const mockResources: CrisisUrlEntry[] = [
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
]

describe('ResourceCategory', () => {
  describe('Display (AC: 1, 2)', () => {
    it('displays category name as heading', () => {
      render(
        <ResourceCategory
          category="suicide"
          resources={mockResources.filter((r) => r.category === 'suicide')}
        />
      )

      expect(
        screen.getByRole('heading', { level: 2 })
      ).toHaveTextContent(categoryDisplayNames.suicide)
    })

    it('displays category description', () => {
      render(
        <ResourceCategory
          category="suicide"
          resources={mockResources.filter((r) => r.category === 'suicide')}
        />
      )

      expect(
        screen.getByText(categoryDescriptions.suicide)
      ).toBeInTheDocument()
    })

    it('renders resource cards for each resource', () => {
      const suicideResources = mockResources.filter(
        (r) => r.category === 'suicide'
      )
      render(<ResourceCategory category="suicide" resources={suicideResources} />)

      expect(
        screen.getByText('988 Suicide & Crisis Lifeline')
      ).toBeInTheDocument()
    })

    it('returns null when no resources', () => {
      const { container } = render(
        <ResourceCategory category="substance_abuse" resources={[]} />
      )

      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('Accessibility', () => {
    it('section is labeled by category heading', () => {
      render(
        <ResourceCategory
          category="crisis"
          resources={mockResources.filter((r) => r.category === 'crisis')}
        />
      )

      const section = screen.getByRole('region', { name: categoryDisplayNames.crisis })
      expect(section).toBeInTheDocument()
    })

    it('resources list has accessible label', () => {
      render(
        <ResourceCategory
          category="crisis"
          resources={mockResources.filter((r) => r.category === 'crisis')}
        />
      )

      expect(
        screen.getByRole('list', { name: /emergency help resources/i })
      ).toBeInTheDocument()
    })

    it('each resource is a list item', () => {
      render(
        <ResourceCategory
          category="crisis"
          resources={mockResources.filter((r) => r.category === 'crisis')}
        />
      )

      expect(screen.getAllByRole('listitem')).toHaveLength(1)
    })
  })
})

describe('categoryDisplayNames', () => {
  it('has child-friendly names for all categories', () => {
    const categories: CrisisResourceCategory[] = [
      'suicide',
      'abuse',
      'crisis',
      'lgbtq',
      'mental_health',
      'domestic_violence',
      'child_abuse',
      'eating_disorder',
      'substance_abuse',
    ]

    for (const category of categories) {
      expect(categoryDisplayNames[category]).toBeDefined()
      expect(typeof categoryDisplayNames[category]).toBe('string')
      expect(categoryDisplayNames[category].length).toBeGreaterThan(0)
    }
  })

  it('uses simple language for suicide category', () => {
    expect(categoryDisplayNames.suicide.toLowerCase()).toContain('feeling')
    expect(categoryDisplayNames.suicide.toLowerCase()).not.toContain('suicidal')
  })

  it('uses direct language for abuse categories', () => {
    expect(categoryDisplayNames.abuse.toLowerCase()).toContain('hurting')
    expect(categoryDisplayNames.child_abuse.toLowerCase()).toContain('adults')
  })
})

describe('categoryDescriptions', () => {
  it('has descriptions for all categories', () => {
    const categories: CrisisResourceCategory[] = [
      'suicide',
      'abuse',
      'crisis',
      'lgbtq',
      'mental_health',
      'domestic_violence',
      'child_abuse',
      'eating_disorder',
      'substance_abuse',
    ]

    for (const category of categories) {
      expect(categoryDescriptions[category]).toBeDefined()
      expect(typeof categoryDescriptions[category]).toBe('string')
      expect(categoryDescriptions[category].length).toBeGreaterThan(0)
    }
  })

  it('descriptions use reassuring language', () => {
    expect(categoryDescriptions.suicide.toLowerCase()).toContain('help')
    expect(categoryDescriptions.mental_health.toLowerCase()).toContain('help')
  })
})

describe('groupResourcesByCategory', () => {
  it('groups resources by their category', () => {
    const grouped = groupResourcesByCategory(mockResources)

    expect(grouped.get('suicide')).toHaveLength(1)
    expect(grouped.get('crisis')).toHaveLength(1)
  })

  it('returns empty map for empty input', () => {
    const grouped = groupResourcesByCategory([])

    expect(grouped.size).toBe(0)
  })

  it('handles multiple resources in same category', () => {
    const resources: CrisisUrlEntry[] = [
      { ...mockResources[0], id: 'id1' },
      { ...mockResources[0], id: 'id2', name: 'Another Resource' },
    ]

    const grouped = groupResourcesByCategory(resources)

    expect(grouped.get('suicide')).toHaveLength(2)
  })
})

describe('getCategoryDisplayOrder', () => {
  it('returns all categories', () => {
    const order = getCategoryDisplayOrder()

    expect(order).toHaveLength(9)
  })

  it('puts crisis first (most urgent)', () => {
    const order = getCategoryDisplayOrder()

    expect(order[0]).toBe('crisis')
  })

  it('puts suicide second (high priority)', () => {
    const order = getCategoryDisplayOrder()

    expect(order[1]).toBe('suicide')
  })

  it('includes all crisis categories', () => {
    const order = getCategoryDisplayOrder()

    expect(order).toContain('abuse')
    expect(order).toContain('child_abuse')
    expect(order).toContain('domestic_violence')
    expect(order).toContain('mental_health')
    expect(order).toContain('lgbtq')
    expect(order).toContain('eating_disorder')
    expect(order).toContain('substance_abuse')
  })
})
