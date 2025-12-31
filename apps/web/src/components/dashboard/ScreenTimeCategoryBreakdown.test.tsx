/**
 * ScreenTimeCategoryBreakdown Component Tests - Story 29.4
 *
 * Tests for the category breakdown component.
 * Covers AC3: Breakdown by category
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScreenTimeCategoryBreakdown } from './ScreenTimeCategoryBreakdown'
import type { CategoryTimeEntry } from '@fledgely/shared'

describe('ScreenTimeCategoryBreakdown - Story 29.4', () => {
  describe('AC3: Breakdown by category', () => {
    it('should render category rows', () => {
      const categories: CategoryTimeEntry[] = [
        { category: 'education', minutes: 60 },
        { category: 'gaming', minutes: 30 },
        { category: 'entertainment', minutes: 30 },
      ]

      render(<ScreenTimeCategoryBreakdown categories={categories} totalMinutes={120} />)

      expect(screen.getByTestId('category-breakdown')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-education')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-gaming')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-entertainment')).toBeInTheDocument()
    })

    it('should sort categories by minutes descending', () => {
      const categories: CategoryTimeEntry[] = [
        { category: 'gaming', minutes: 30 },
        { category: 'education', minutes: 60 },
        { category: 'entertainment', minutes: 15 },
      ]

      render(<ScreenTimeCategoryBreakdown categories={categories} totalMinutes={105} />)

      const rows = screen.getAllByTestId(/^category-row-/)
      expect(rows[0]).toHaveAttribute('data-testid', 'category-row-education')
      expect(rows[1]).toHaveAttribute('data-testid', 'category-row-gaming')
      expect(rows[2]).toHaveAttribute('data-testid', 'category-row-entertainment')
    })

    it('should display formatted duration for each category', () => {
      const categories: CategoryTimeEntry[] = [
        { category: 'education', minutes: 90 },
        { category: 'gaming', minutes: 45 },
      ]

      render(<ScreenTimeCategoryBreakdown categories={categories} totalMinutes={135} />)

      expect(screen.getByTestId('category-row-education')).toHaveTextContent('1h 30m')
      expect(screen.getByTestId('category-row-gaming')).toHaveTextContent('45m')
    })

    it('should display category labels', () => {
      const categories: CategoryTimeEntry[] = [
        { category: 'education', minutes: 60 },
        { category: 'social_media', minutes: 30 },
      ]

      render(<ScreenTimeCategoryBreakdown categories={categories} totalMinutes={90} />)

      expect(screen.getByTestId('category-row-education')).toHaveTextContent('Education')
      expect(screen.getByTestId('category-row-social_media')).toHaveTextContent('Social Media')
    })

    it('should have progress bar with correct aria attributes', () => {
      const categories: CategoryTimeEntry[] = [{ category: 'education', minutes: 60 }]

      render(<ScreenTimeCategoryBreakdown categories={categories} totalMinutes={120} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })

  describe('Edge cases', () => {
    it('should return null when no categories', () => {
      const { container } = render(<ScreenTimeCategoryBreakdown categories={[]} totalMinutes={0} />)

      expect(container.firstChild).toBeNull()
    })

    it('should handle zero total minutes', () => {
      const categories: CategoryTimeEntry[] = [{ category: 'education', minutes: 0 }]

      render(<ScreenTimeCategoryBreakdown categories={categories} totalMinutes={0} />)

      // Should still render but with 0% progress
      expect(screen.getByTestId('category-breakdown')).toBeInTheDocument()
    })

    it('should handle all screen time categories', () => {
      const categories: CategoryTimeEntry[] = [
        { category: 'education', minutes: 10 },
        { category: 'productivity', minutes: 10 },
        { category: 'entertainment', minutes: 10 },
        { category: 'social_media', minutes: 10 },
        { category: 'gaming', minutes: 10 },
        { category: 'communication', minutes: 10 },
        { category: 'news', minutes: 10 },
        { category: 'shopping', minutes: 10 },
        { category: 'other', minutes: 10 },
      ]

      render(<ScreenTimeCategoryBreakdown categories={categories} totalMinutes={90} />)

      expect(screen.getByTestId('category-row-education')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-productivity')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-entertainment')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-social_media')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-gaming')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-communication')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-news')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-shopping')).toBeInTheDocument()
      expect(screen.getByTestId('category-row-other')).toBeInTheDocument()
    })
  })
})
