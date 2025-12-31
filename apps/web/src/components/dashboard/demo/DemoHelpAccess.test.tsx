/**
 * Tests for DemoHelpAccess Component
 *
 * Story 8.5.5: Demo-to-Real Transition
 * AC5: Demo Re-access - parent can re-access demo from help section
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DemoHelpAccess } from './DemoHelpAccess'

describe('DemoHelpAccess', () => {
  const mockOnReactivateDemo = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('conditional rendering', () => {
    it('should render when demoArchived is true', () => {
      render(<DemoHelpAccess demoArchived={true} onReactivateDemo={mockOnReactivateDemo} />)

      expect(screen.getByTestId('demo-help-access')).toBeInTheDocument()
      expect(screen.getByTestId('demo-archived-banner')).toBeInTheDocument()
    })

    it('should NOT render when demoArchived is false', () => {
      render(<DemoHelpAccess demoArchived={false} onReactivateDemo={mockOnReactivateDemo} />)

      expect(screen.queryByTestId('demo-help-access')).not.toBeInTheDocument()
      expect(screen.queryByTestId('demo-archived-banner')).not.toBeInTheDocument()
    })
  })

  describe('banner content', () => {
    it('should show "Demo Mode Available" title when archived', () => {
      render(<DemoHelpAccess demoArchived={true} onReactivateDemo={mockOnReactivateDemo} />)

      expect(screen.getByTestId('banner-title')).toHaveTextContent('Demo Mode Available')
    })

    it('should show "View Demo Mode" button when archived', () => {
      render(<DemoHelpAccess demoArchived={true} onReactivateDemo={mockOnReactivateDemo} />)

      expect(screen.getByTestId('reactivate-demo-button')).toHaveTextContent('View Demo Mode')
    })
  })

  describe('reactivate interaction', () => {
    it('should call onReactivateDemo when button clicked (AC5)', () => {
      render(<DemoHelpAccess demoArchived={true} onReactivateDemo={mockOnReactivateDemo} />)

      fireEvent.click(screen.getByTestId('reactivate-demo-button'))

      expect(mockOnReactivateDemo).toHaveBeenCalledTimes(1)
    })
  })

  describe('reactivating state', () => {
    it('should show "Loading Demo..." when reactivating', () => {
      render(
        <DemoHelpAccess
          demoArchived={true}
          onReactivateDemo={mockOnReactivateDemo}
          reactivating={true}
        />
      )

      expect(screen.getByTestId('reactivate-demo-button')).toHaveTextContent('Loading Demo...')
    })

    it('should disable button when reactivating', () => {
      render(
        <DemoHelpAccess
          demoArchived={true}
          onReactivateDemo={mockOnReactivateDemo}
          reactivating={true}
        />
      )

      expect(screen.getByTestId('reactivate-demo-button')).toBeDisabled()
    })

    it('should default reactivating to false', () => {
      render(<DemoHelpAccess demoArchived={true} onReactivateDemo={mockOnReactivateDemo} />)

      // Button should be enabled (not disabled)
      expect(screen.getByTestId('reactivate-demo-button')).not.toBeDisabled()
    })
  })
})
