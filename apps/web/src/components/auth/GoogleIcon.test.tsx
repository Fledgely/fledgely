import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GoogleIcon } from './GoogleIcon'

describe('GoogleIcon', () => {
  describe('rendering', () => {
    it('renders SVG with correct viewBox', () => {
      const { container } = render(<GoogleIcon />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    })

    it('renders four path elements for Google brand colors', () => {
      const { container } = render(<GoogleIcon />)
      const paths = container.querySelectorAll('path')
      expect(paths).toHaveLength(4)
    })

    it('renders all four Google brand colors', () => {
      const { container } = render(<GoogleIcon />)
      const paths = container.querySelectorAll('path')

      // Verify Google brand colors
      expect(paths[0]).toHaveAttribute('fill', '#4285F4') // Blue
      expect(paths[1]).toHaveAttribute('fill', '#34A853') // Green
      expect(paths[2]).toHaveAttribute('fill', '#FBBC05') // Yellow
      expect(paths[3]).toHaveAttribute('fill', '#EA4335') // Red
    })
  })

  describe('accessibility', () => {
    it('is hidden from screen readers with aria-hidden', () => {
      const { container } = render(<GoogleIcon />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })

    it('uses proper xmlns attribute', () => {
      const { container } = render(<GoogleIcon />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = render(<GoogleIcon className="custom-size h-6 w-6" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('custom-size')
      expect(svg).toHaveClass('h-6')
      expect(svg).toHaveClass('w-6')
    })

    it('renders without className when not provided', () => {
      const { container } = render(<GoogleIcon />)
      const svg = container.querySelector('svg')
      // Should not have class attribute when empty
      expect(svg?.className.baseVal).toBe('')
    })
  })
})
