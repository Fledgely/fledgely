import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TemplateCardSkeleton, TemplateLibrarySkeleton } from '../TemplateCardSkeleton'

describe('TemplateCardSkeleton', () => {
  it('renders skeleton card', () => {
    const { container } = render(<TemplateCardSkeleton />)

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('has aria-hidden for accessibility', () => {
    const { container } = render(<TemplateCardSkeleton />)

    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('has correct border styling', () => {
    const { container } = render(<TemplateCardSkeleton />)

    expect(container.firstChild).toHaveClass('border-2', 'border-gray-200')
  })

  it('has minimum height matching TemplateCard', () => {
    const { container } = render(<TemplateCardSkeleton />)

    expect(container.firstChild).toHaveClass('min-h-[180px]')
  })
})

describe('TemplateLibrarySkeleton', () => {
  it('renders skeleton library', () => {
    render(<TemplateLibrarySkeleton />)

    expect(screen.getByLabelText('Loading template library')).toBeInTheDocument()
  })

  it('renders multiple skeleton cards', () => {
    const { container } = render(<TemplateLibrarySkeleton />)

    // Should render 6 skeleton cards in the grid
    const skeletonCards = container.querySelectorAll('.min-h-\\[180px\\]')
    expect(skeletonCards.length).toBe(6)
  })

  it('renders skeleton tabs', () => {
    const { container } = render(<TemplateLibrarySkeleton />)

    // Should render 5 tab skeletons (All + 4 age groups)
    const tabSkeletons = container.querySelectorAll('.h-10.w-20')
    expect(tabSkeletons.length).toBe(5)
  })

  it('renders skeleton filter chips', () => {
    const { container } = render(<TemplateLibrarySkeleton />)

    // Should render 5 filter chip skeletons (5 concerns)
    const chipSkeletons = container.querySelectorAll('.h-8.w-20.rounded-full')
    expect(chipSkeletons.length).toBe(5)
  })

  it('renders search input skeleton', () => {
    const { container } = render(<TemplateLibrarySkeleton />)

    // Should have a search input skeleton with height 11 (44px)
    const searchSkeleton = container.querySelector('.h-11.w-full')
    expect(searchSkeleton).toBeInTheDocument()
  })
})
