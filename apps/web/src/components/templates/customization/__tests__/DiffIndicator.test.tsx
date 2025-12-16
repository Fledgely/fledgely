/**
 * DiffIndicator Tests
 *
 * Story 4.5: Template Customization Preview - Task 1.4, 1.5
 * AC #2: Changes are highlighted compared to original template
 *
 * Tests:
 * - DiffIndicator rendering
 * - DiffBadge rendering
 * - DiffHighlight styling
 * - Accessibility
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  DiffIndicator,
  DiffBadge,
  DiffHighlight,
  getDiffStyles,
  getDiffLabel,
} from '../DiffIndicator'

describe('DiffIndicator', () => {
  describe('basic rendering', () => {
    it('does not render for original status by default', () => {
      const { container } = render(<DiffIndicator status="original" />)
      expect(container.firstChild).toBeNull()
    })

    it('renders for original status when showLabel is true', () => {
      render(<DiffIndicator status="original" showLabel />)
      expect(screen.getByText('Original')).toBeInTheDocument()
    })

    it('renders for modified status', () => {
      render(<DiffIndicator status="modified" showLabel />)
      expect(screen.getByText('Modified')).toBeInTheDocument()
    })

    it('renders for added status', () => {
      render(<DiffIndicator status="added" showLabel />)
      expect(screen.getByText('Added')).toBeInTheDocument()
    })

    it('renders for removed status', () => {
      render(<DiffIndicator status="removed" showLabel />)
      expect(screen.getByText('Removed')).toBeInTheDocument()
    })
  })

  describe('custom labels', () => {
    it('uses custom label when provided', () => {
      render(<DiffIndicator status="modified" label="Changed" showLabel />)
      expect(screen.getByText('Changed')).toBeInTheDocument()
    })
  })

  describe('sizes', () => {
    it('applies small size class', () => {
      const { container } = render(<DiffIndicator status="modified" size="sm" />)
      const dot = container.querySelector('.h-2.w-2')
      expect(dot).toBeInTheDocument()
    })

    it('applies medium size class by default', () => {
      const { container } = render(<DiffIndicator status="modified" size="md" />)
      const dot = container.querySelector('.h-3.w-3')
      expect(dot).toBeInTheDocument()
    })

    it('applies large size class', () => {
      const { container } = render(<DiffIndicator status="modified" size="lg" />)
      const dot = container.querySelector('.h-4.w-4')
      expect(dot).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has status role', () => {
      render(<DiffIndicator status="modified" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has accessible label', () => {
      render(<DiffIndicator status="modified" />)
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Change status: Modified'
      )
    })

    it('hides dot from screen readers', () => {
      const { container } = render(<DiffIndicator status="modified" />)
      const dot = container.querySelector('[aria-hidden="true"]')
      expect(dot).toBeInTheDocument()
    })
  })
})

describe('DiffBadge', () => {
  describe('basic rendering', () => {
    it('does not render for original status', () => {
      const { container } = render(<DiffBadge status="original" />)
      expect(container.firstChild).toBeNull()
    })

    it('renders for modified status', () => {
      render(<DiffBadge status="modified" />)
      expect(screen.getByText('Modified')).toBeInTheDocument()
    })

    it('renders for added status', () => {
      render(<DiffBadge status="added" />)
      expect(screen.getByText('Added')).toBeInTheDocument()
    })

    it('renders for removed status', () => {
      render(<DiffBadge status="removed" />)
      expect(screen.getByText('Removed')).toBeInTheDocument()
    })
  })

  describe('custom labels', () => {
    it('uses custom label when provided', () => {
      render(<DiffBadge status="modified" label="3 changes" />)
      expect(screen.getByText('3 changes')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has badge styling for modified', () => {
      const { container } = render(<DiffBadge status="modified" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-amber')
    })

    it('has badge styling for added', () => {
      const { container } = render(<DiffBadge status="added" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-green')
    })

    it('has badge styling for removed', () => {
      const { container } = render(<DiffBadge status="removed" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-red')
    })
  })

  describe('accessibility', () => {
    it('has status role', () => {
      render(<DiffBadge status="modified" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has accessible label', () => {
      render(<DiffBadge status="modified" />)
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Change status: Modified'
      )
    })
  })
})

describe('DiffHighlight', () => {
  describe('basic rendering', () => {
    it('renders children', () => {
      render(
        <DiffHighlight status="original">
          <span>Content</span>
        </DiffHighlight>
      )
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('applies no special styling for original', () => {
      const { container } = render(
        <DiffHighlight status="original">
          <span>Content</span>
        </DiffHighlight>
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).not.toContain('bg-amber')
      expect(wrapper.className).not.toContain('bg-green')
      expect(wrapper.className).not.toContain('bg-red')
    })

    it('applies modified styling', () => {
      const { container } = render(
        <DiffHighlight status="modified">
          <span>Content</span>
        </DiffHighlight>
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('bg-amber')
    })

    it('applies added styling', () => {
      const { container } = render(
        <DiffHighlight status="added">
          <span>Content</span>
        </DiffHighlight>
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('bg-green')
    })

    it('applies removed styling with line-through', () => {
      const { container } = render(
        <DiffHighlight status="removed">
          <span>Content</span>
        </DiffHighlight>
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('bg-red')
      expect(wrapper.className).toContain('line-through')
    })
  })

  describe('badge display', () => {
    it('shows badge when showBadge is true and not original', () => {
      render(
        <DiffHighlight status="modified" showBadge>
          <span>Content</span>
        </DiffHighlight>
      )
      expect(screen.getByText('Modified')).toBeInTheDocument()
    })

    it('does not show badge when showBadge is true but status is original', () => {
      render(
        <DiffHighlight status="original" showBadge>
          <span>Content</span>
        </DiffHighlight>
      )
      expect(screen.queryByText('Original')).not.toBeInTheDocument()
    })

    it('does not show badge when showBadge is false', () => {
      render(
        <DiffHighlight status="modified" showBadge={false}>
          <span>Content</span>
        </DiffHighlight>
      )
      expect(screen.queryByText('Modified')).not.toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <DiffHighlight status="modified" className="custom-class">
          <span>Content</span>
        </DiffHighlight>
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('custom-class')
    })
  })
})

describe('getDiffStyles', () => {
  it('returns styles for original', () => {
    const styles = getDiffStyles('original')
    expect(styles.bg).toBe('bg-transparent')
    expect(styles.text).toContain('gray')
  })

  it('returns styles for modified', () => {
    const styles = getDiffStyles('modified')
    expect(styles.bg).toContain('amber')
    expect(styles.text).toContain('amber')
  })

  it('returns styles for added', () => {
    const styles = getDiffStyles('added')
    expect(styles.bg).toContain('green')
    expect(styles.text).toContain('green')
  })

  it('returns styles for removed', () => {
    const styles = getDiffStyles('removed')
    expect(styles.bg).toContain('red')
    expect(styles.text).toContain('red')
  })
})

describe('getDiffLabel', () => {
  it('returns label for original', () => {
    expect(getDiffLabel('original')).toBe('Original')
  })

  it('returns label for modified', () => {
    expect(getDiffLabel('modified')).toBe('Modified')
  })

  it('returns label for added', () => {
    expect(getDiffLabel('added')).toBe('Added')
  })

  it('returns label for removed', () => {
    expect(getDiffLabel('removed')).toBe('Removed')
  })
})
