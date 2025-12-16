import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoManagedIndicator } from './CoManagedIndicator'

/**
 * CoManagedIndicator Component Tests
 *
 * Story 3.4: Equal Access Verification - AC4: Co-Managed Indicator Display
 *
 * Tests verify:
 * - Displays other guardian names correctly
 * - Handles single co-parent: "Co-managed with [name]"
 * - Handles multiple co-parents: "Co-managed with [name1] and [name2]"
 * - Returns null when no other guardians
 * - Styled as secondary/subtle UI element
 * - Color contrast compliance (NFR45)
 * - Screen reader accessibility with aria-label
 */

describe('CoManagedIndicator', () => {

  // ============================================================================
  // Rendering States
  // ============================================================================

  describe('rendering states', () => {
    it('returns null when no other guardians exist', () => {
      const { container } = render(
        <CoManagedIndicator
          otherGuardianNames={[]}
          isLoading={false}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('returns null when loading', () => {
      const { container } = render(
        <CoManagedIndicator
          otherGuardianNames={['Jane Smith']}
          isLoading={true}
        />
      )

      // Should show loading skeleton or nothing, not the text
      expect(screen.queryByText(/co-managed with/i)).not.toBeInTheDocument()
    })

    it('displays single co-parent name', () => {
      render(
        <CoManagedIndicator
          otherGuardianNames={['Jane Smith']}
          isLoading={false}
        />
      )

      expect(screen.getByText('Co-managed with Jane Smith')).toBeInTheDocument()
    })

    it('displays two co-parent names with "and"', () => {
      render(
        <CoManagedIndicator
          otherGuardianNames={['Jane Smith', 'Bob Johnson']}
          isLoading={false}
        />
      )

      expect(screen.getByText('Co-managed with Jane Smith and Bob Johnson')).toBeInTheDocument()
    })

    it('displays three+ co-parent names with commas and "and"', () => {
      render(
        <CoManagedIndicator
          otherGuardianNames={['Jane Smith', 'Bob Johnson', 'Alice Williams']}
          isLoading={false}
        />
      )

      expect(
        screen.getByText('Co-managed with Jane Smith, Bob Johnson and Alice Williams')
      ).toBeInTheDocument()
    })

    it('uses "Co-parent" fallback for empty names', () => {
      render(
        <CoManagedIndicator
          otherGuardianNames={['']}
          isLoading={false}
        />
      )

      expect(screen.getByText('Co-managed with Co-parent')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Styling (NFR45 - Color Contrast)
  // ============================================================================

  describe('styling', () => {
    it('has muted/secondary text styling', () => {
      render(
        <CoManagedIndicator
          otherGuardianNames={['Jane Smith']}
          isLoading={false}
        />
      )

      const element = screen.getByText('Co-managed with Jane Smith')
      expect(element).toHaveClass('text-muted-foreground')
    })

    it('has small text size for subtle display', () => {
      render(
        <CoManagedIndicator
          otherGuardianNames={['Jane Smith']}
          isLoading={false}
        />
      )

      const element = screen.getByText('Co-managed with Jane Smith')
      expect(element).toHaveClass('text-sm')
    })
  })

  // ============================================================================
  // Accessibility (NFR43, NFR45)
  // ============================================================================

  describe('accessibility', () => {
    it('has aria-label for screen readers', () => {
      render(
        <CoManagedIndicator
          otherGuardianNames={['Jane Smith']}
          isLoading={false}
        />
      )

      const element = screen.getByLabelText('Co-managed with Jane Smith')
      expect(element).toBeInTheDocument()
    })

    it('announces multiple guardians correctly', () => {
      render(
        <CoManagedIndicator
          otherGuardianNames={['Jane Smith', 'Bob Johnson']}
          isLoading={false}
        />
      )

      const element = screen.getByLabelText('Co-managed with Jane Smith and Bob Johnson')
      expect(element).toBeInTheDocument()
    })

    it('shows loading skeleton with appropriate aria attributes', () => {
      render(
        <CoManagedIndicator
          otherGuardianNames={['Jane Smith']}
          isLoading={true}
        />
      )

      // Loading skeleton should have aria-busy and accessible label
      const skeleton = screen.getByRole('status')
      expect(skeleton).toHaveAttribute('aria-busy', 'true')
      expect(skeleton).toHaveAttribute('aria-label', 'Loading co-parent information')
    })
  })

  // ============================================================================
  // Custom className
  // ============================================================================

  describe('custom className', () => {
    it('accepts custom className prop', () => {
      render(
        <CoManagedIndicator
          otherGuardianNames={['Jane Smith']}
          isLoading={false}
          className="custom-class"
        />
      )

      const element = screen.getByText('Co-managed with Jane Smith')
      expect(element).toHaveClass('custom-class')
    })
  })
})
