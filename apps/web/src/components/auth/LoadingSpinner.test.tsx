import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LoadingSpinner } from './LoadingSpinner'

// Mock the cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

describe('LoadingSpinner', () => {
  describe('rendering', () => {
    it('renders with default sr-only text', () => {
      render(<LoadingSpinner />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('renders with custom sr-only text', () => {
      render(<LoadingSpinner srText="Signing in..." />)
      expect(screen.getByText('Signing in...')).toBeInTheDocument()
    })

    it('renders SVG spinner', () => {
      const { container } = render(<LoadingSpinner />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders spinner with circle and path elements', () => {
      const { container } = render(<LoadingSpinner />)
      const circle = container.querySelector('circle')
      const path = container.querySelector('path')
      expect(circle).toBeInTheDocument()
      expect(path).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has role="status" for screen readers', () => {
      render(<LoadingSpinner />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has aria-live="polite" for announcements', () => {
      const { container } = render(<LoadingSpinner />)
      const statusDiv = container.querySelector('[role="status"]')
      expect(statusDiv).toHaveAttribute('aria-live', 'polite')
    })

    it('hides SVG from screen readers with aria-hidden', () => {
      const { container } = render(<LoadingSpinner />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })

    it('has sr-only class on text for visual hiding', () => {
      const { container } = render(<LoadingSpinner />)
      const srSpan = container.querySelector('.sr-only')
      expect(srSpan).toBeInTheDocument()
      expect(srSpan).toHaveTextContent('Loading...')
    })
  })

  describe('animation', () => {
    it('applies animate-spin class for rotation', () => {
      const { container } = render(<LoadingSpinner />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('animate-spin')
    })

    it('has opacity-25 class on background circle', () => {
      const { container } = render(<LoadingSpinner />)
      const circle = container.querySelector('circle')
      expect(circle).toHaveClass('opacity-25')
    })

    it('has opacity-75 class on foreground path', () => {
      const { container } = render(<LoadingSpinner />)
      const path = container.querySelector('path')
      expect(path).toHaveClass('opacity-75')
    })
  })

  describe('styling', () => {
    it('applies custom className to SVG', () => {
      const { container } = render(<LoadingSpinner className="h-8 w-8 text-blue-500" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-8')
      expect(svg).toHaveClass('w-8')
      expect(svg).toHaveClass('text-blue-500')
    })

    it('combines animate-spin with custom className', () => {
      const { container } = render(<LoadingSpinner className="h-4 w-4" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('animate-spin')
      expect(svg).toHaveClass('h-4')
      expect(svg).toHaveClass('w-4')
    })

    it('uses currentColor for stroke and fill', () => {
      const { container } = render(<LoadingSpinner />)
      const circle = container.querySelector('circle')
      const path = container.querySelector('path')
      expect(circle).toHaveAttribute('stroke', 'currentColor')
      expect(path).toHaveAttribute('fill', 'currentColor')
    })

    it('uses proper viewBox for 24x24 icon', () => {
      const { container } = render(<LoadingSpinner />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    })
  })
})
