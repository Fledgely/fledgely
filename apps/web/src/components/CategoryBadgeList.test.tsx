/**
 * CategoryBadgeList Component Tests
 *
 * Story 20.4: Multi-Label Classification - AC4, AC5
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CategoryBadgeList, { CategoryBadge } from './CategoryBadgeList'

describe('CategoryBadgeList', () => {
  // Story 20.4 AC4: Gallery view shows only primary category
  describe('gallery variant', () => {
    it('renders only primary category', () => {
      render(
        <CategoryBadgeList
          primaryCategory="Gaming"
          primaryConfidence={85}
          secondaryCategories={[{ category: 'Entertainment', confidence: 60 }]}
          variant="gallery"
        />
      )

      expect(screen.getByText('Gaming')).toBeInTheDocument()
      expect(screen.queryByText('Entertainment')).not.toBeInTheDocument()
    })

    it('does not show confidence percentage', () => {
      render(
        <CategoryBadgeList primaryCategory="Educational" primaryConfidence={75} variant="gallery" />
      )

      expect(screen.getByText('Educational')).toBeInTheDocument()
      expect(screen.queryByText('(75%)')).not.toBeInTheDocument()
    })

    it('has accessible aria-label', () => {
      render(
        <CategoryBadgeList primaryCategory="Homework" primaryConfidence={90} variant="gallery" />
      )

      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('aria-label', 'Category: Homework')
    })

    it('applies category color classes', () => {
      render(
        <CategoryBadgeList
          primaryCategory="Social Media"
          primaryConfidence={80}
          variant="gallery"
        />
      )

      const badge = screen.getByRole('status')
      // Social Media uses pink color classes
      expect(badge.className).toContain('bg-pink-100')
    })
  })

  // Story 20.4 AC5: Detail view shows all categories with confidence
  describe('detail variant', () => {
    it('renders primary category with confidence', () => {
      render(
        <CategoryBadgeList primaryCategory="Educational" primaryConfidence={75} variant="detail" />
      )

      expect(screen.getByText('Educational')).toBeInTheDocument()
      expect(screen.getByText('(75%)')).toBeInTheDocument()
    })

    it('renders secondary categories with confidence', () => {
      render(
        <CategoryBadgeList
          primaryCategory="Educational"
          primaryConfidence={75}
          secondaryCategories={[
            { category: 'Entertainment', confidence: 60 },
            { category: 'Gaming', confidence: 55 },
          ]}
          variant="detail"
        />
      )

      // Primary
      expect(screen.getByText('Educational')).toBeInTheDocument()
      expect(screen.getByText('(75%)')).toBeInTheDocument()

      // Secondary categories
      expect(screen.getByText('Entertainment')).toBeInTheDocument()
      expect(screen.getByText('(60%)')).toBeInTheDocument()
      expect(screen.getByText('Gaming')).toBeInTheDocument()
      expect(screen.getByText('(55%)')).toBeInTheDocument()
    })

    it('handles empty secondary categories', () => {
      render(
        <CategoryBadgeList
          primaryCategory="Gaming"
          primaryConfidence={90}
          secondaryCategories={[]}
          variant="detail"
        />
      )

      expect(screen.getByText('Gaming')).toBeInTheDocument()
      expect(screen.getAllByRole('status')).toHaveLength(1)
    })

    it('handles undefined secondary categories', () => {
      render(<CategoryBadgeList primaryCategory="Gaming" primaryConfidence={90} variant="detail" />)

      expect(screen.getByText('Gaming')).toBeInTheDocument()
      expect(screen.getAllByRole('status')).toHaveLength(1)
    })

    it('has accessible aria-labels for all categories', () => {
      render(
        <CategoryBadgeList
          primaryCategory="Educational"
          primaryConfidence={75}
          secondaryCategories={[{ category: 'Entertainment', confidence: 60 }]}
          variant="detail"
        />
      )

      const badges = screen.getAllByRole('status')
      expect(badges).toHaveLength(2)
      expect(badges[0]).toHaveAttribute(
        'aria-label',
        'Primary category: Educational, 75% confidence'
      )
      expect(badges[1]).toHaveAttribute(
        'aria-label',
        'Secondary category: Entertainment, 60% confidence'
      )
    })
  })

  // Story 20.4 AC3: Maximum 3 categories (handled by geminiClient, but verify display)
  describe('multiple secondary categories', () => {
    it('renders up to 2 secondary categories', () => {
      render(
        <CategoryBadgeList
          primaryCategory="Educational"
          primaryConfidence={80}
          secondaryCategories={[
            { category: 'Entertainment', confidence: 65 },
            { category: 'Gaming', confidence: 55 },
          ]}
          variant="detail"
        />
      )

      const badges = screen.getAllByRole('status')
      expect(badges).toHaveLength(3) // 1 primary + 2 secondary
    })
  })

  describe('className prop', () => {
    it('applies className to gallery variant', () => {
      const { container } = render(
        <CategoryBadgeList
          primaryCategory="Gaming"
          primaryConfidence={85}
          variant="gallery"
          className="custom-class"
        />
      )

      const badge = container.querySelector('.custom-class')
      expect(badge).toBeInTheDocument()
    })

    it('applies className to detail variant container', () => {
      const { container } = render(
        <CategoryBadgeList
          primaryCategory="Gaming"
          primaryConfidence={85}
          variant="detail"
          className="custom-class"
        />
      )

      const wrapper = container.querySelector('.custom-class')
      expect(wrapper).toBeInTheDocument()
    })
  })
})

describe('CategoryBadge', () => {
  it('renders a simple category badge', () => {
    render(<CategoryBadge category="Gaming" />)

    expect(screen.getByText('Gaming')).toBeInTheDocument()
  })

  it('uses gallery variant internally', () => {
    render(<CategoryBadge category="Entertainment" />)

    // Should not show confidence percentage (gallery variant)
    expect(screen.queryByText('%')).not.toBeInTheDocument()
  })

  it('applies className', () => {
    const { container } = render(<CategoryBadge category="Gaming" className="test-class" />)

    const badge = container.querySelector('.test-class')
    expect(badge).toBeInTheDocument()
  })

  it('provides backward compatibility for single-category display', () => {
    render(<CategoryBadge category="Homework" />)

    const badge = screen.getByRole('status')
    expect(badge).toHaveAttribute('aria-label', 'Category: Homework')
  })
})
