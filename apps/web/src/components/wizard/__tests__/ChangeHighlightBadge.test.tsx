/**
 * Tests for ChangeHighlightBadge component.
 *
 * Story 4.5: Template Customization Preview - AC2
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChangeHighlightBadge, ValueComparison } from '../ChangeHighlightBadge'

describe('ChangeHighlightBadge', () => {
  describe('rendering', () => {
    it('should render modified badge', () => {
      render(<ChangeHighlightBadge type="modified" />)

      expect(screen.getByText('Modified')).toBeInTheDocument()
    })

    it('should render added badge', () => {
      render(<ChangeHighlightBadge type="added" />)

      expect(screen.getByText('Custom Addition')).toBeInTheDocument()
    })

    it('should render removed badge', () => {
      render(<ChangeHighlightBadge type="removed" />)

      expect(screen.getByText('Removed')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should have yellow styles for modified', () => {
      render(<ChangeHighlightBadge type="modified" />)

      // The outer span has the styling classes
      const badge = screen.getByLabelText('This value has been modified from the original template')
      expect(badge).toHaveClass('bg-yellow-100')
      expect(badge).toHaveClass('text-yellow-800')
    })

    it('should have green styles for added', () => {
      render(<ChangeHighlightBadge type="added" />)

      const badge = screen.getByLabelText('This is a custom rule you added')
      expect(badge).toHaveClass('bg-green-100')
      expect(badge).toHaveClass('text-green-800')
    })

    it('should have red styles for removed', () => {
      render(<ChangeHighlightBadge type="removed" />)

      const badge = screen.getByLabelText('This rule has been removed from the template')
      expect(badge).toHaveClass('bg-red-100')
      expect(badge).toHaveClass('text-red-800')
    })
  })

  describe('accessibility', () => {
    it('should have aria-label for modified', () => {
      render(<ChangeHighlightBadge type="modified" />)

      expect(
        screen.getByLabelText('This value has been modified from the original template')
      ).toBeInTheDocument()
    })

    it('should have aria-label for added', () => {
      render(<ChangeHighlightBadge type="added" />)

      expect(screen.getByLabelText('This is a custom rule you added')).toBeInTheDocument()
    })

    it('should have aria-label for removed', () => {
      render(<ChangeHighlightBadge type="removed" />)

      expect(
        screen.getByLabelText('This rule has been removed from the template')
      ).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(<ChangeHighlightBadge type="modified" className="custom-class" />)

      const badge = screen.getByLabelText('This value has been modified from the original template')
      expect(badge).toHaveClass('custom-class')
    })
  })
})

describe('ValueComparison', () => {
  describe('unchanged values', () => {
    it('should render value without badge when unchanged', () => {
      render(<ValueComparison label="Screen Time" originalValue="2 hours" newValue="2 hours" />)

      expect(screen.getByText('Screen Time:')).toBeInTheDocument()
      expect(screen.getByText('2 hours')).toBeInTheDocument()
      expect(screen.queryByText('Modified')).not.toBeInTheDocument()
    })
  })

  describe('changed values', () => {
    it('should render new value with modified badge', () => {
      render(<ValueComparison label="Screen Time" originalValue="2 hours" newValue="3 hours" />)

      expect(screen.getByText('Screen Time:')).toBeInTheDocument()
      expect(screen.getByText('3 hours')).toBeInTheDocument()
      expect(screen.getByText('Modified')).toBeInTheDocument()
    })

    it('should show original value with strikethrough', () => {
      render(<ValueComparison label="Screen Time" originalValue="2 hours" newValue="3 hours" />)

      expect(screen.getByText('Was:')).toBeInTheDocument()
      const originalValue = screen.getByText('2 hours')
      expect(originalValue).toHaveClass('line-through')
    })
  })

  describe('showBadge prop', () => {
    it('should not show badge when showBadge is false', () => {
      render(
        <ValueComparison
          label="Screen Time"
          originalValue="2 hours"
          newValue="3 hours"
          showBadge={false}
        />
      )

      expect(screen.queryByText('Modified')).not.toBeInTheDocument()
    })
  })
})
