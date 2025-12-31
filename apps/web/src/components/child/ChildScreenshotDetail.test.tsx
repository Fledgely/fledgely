/**
 * ChildScreenshotDetail Tests - Story 19B.1 & 19B.3 & 19B.6
 *
 * Story 19B.1: Basic modal functionality
 * Story 19B.3: Pinch-to-zoom and swipe-to-dismiss gestures
 * Story 19B.6: Child view audit logging (bilateral transparency)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildScreenshotDetail } from './ChildScreenshotDetail'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'
import * as auditService from '../../services/dataViewAuditService'

// Mock the audit service
vi.mock('../../services/dataViewAuditService', () => ({
  logDataViewNonBlocking: vi.fn(),
}))

describe('ChildScreenshotDetail', () => {
  const mockScreenshots: ChildScreenshot[] = [
    {
      id: 'ss-1',
      imageUrl: 'https://example.com/1.png',
      timestamp: new Date('2024-01-01T14:30:00').getTime(),
      url: 'https://youtube.com/watch',
      title: 'Watching Videos',
      deviceId: 'tablet-1',
    },
    {
      id: 'ss-2',
      imageUrl: 'https://example.com/2.png',
      timestamp: new Date('2024-01-01T15:00:00').getTime(),
      url: 'https://google.com',
      title: 'Searching',
      deviceId: 'tablet-1',
    },
    {
      id: 'ss-3',
      imageUrl: 'https://example.com/3.png',
      timestamp: new Date('2024-01-01T16:00:00').getTime(),
      url: 'https://roblox.com',
      title: 'Playing Roblox',
      deviceId: 'tablet-1',
    },
  ]

  const defaultProps = {
    screenshot: mockScreenshots[1], // Middle screenshot for nav testing
    screenshots: mockScreenshots,
    onClose: vi.fn(),
    onNavigate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render modal with correct test id', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    expect(screen.getByTestId('screenshot-detail-modal')).toBeInTheDocument()
  })

  it('should display screenshot title', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    expect(screen.getByTestId('detail-title')).toHaveTextContent('Searching')
  })

  it('should display timestamp', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    expect(screen.getByTestId('detail-timestamp')).toBeInTheDocument()
  })

  it('should display transparency label (AC5.4)', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    expect(screen.getByTestId('transparency-label')).toBeInTheDocument()
    expect(screen.getByText('This is what your parent can see. No secrets!')).toBeInTheDocument()
  })

  it('should display device info', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    expect(screen.getByTestId('detail-device')).toHaveTextContent('tablet-1')
  })

  it('should display website/URL info', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    expect(screen.getByTestId('detail-url')).toHaveTextContent('google.com')
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<ChildScreenshotDetail {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('close-button'))

    expect(onClose).toHaveBeenCalled()
  })

  it('should call onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    render(<ChildScreenshotDetail {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('screenshot-detail-modal'))

    expect(onClose).toHaveBeenCalled()
  })

  it('should call onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<ChildScreenshotDetail {...defaultProps} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('should navigate to previous screenshot when prev button is clicked', () => {
    const onNavigate = vi.fn()
    render(<ChildScreenshotDetail {...defaultProps} onNavigate={onNavigate} />)

    fireEvent.click(screen.getByTestId('prev-button'))

    expect(onNavigate).toHaveBeenCalledWith(mockScreenshots[0])
  })

  it('should navigate to next screenshot when next button is clicked', () => {
    const onNavigate = vi.fn()
    render(<ChildScreenshotDetail {...defaultProps} onNavigate={onNavigate} />)

    fireEvent.click(screen.getByTestId('next-button'))

    expect(onNavigate).toHaveBeenCalledWith(mockScreenshots[2])
  })

  it('should navigate with arrow keys', () => {
    const onNavigate = vi.fn()
    render(<ChildScreenshotDetail {...defaultProps} onNavigate={onNavigate} />)

    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(onNavigate).toHaveBeenCalledWith(mockScreenshots[0])

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(onNavigate).toHaveBeenCalledWith(mockScreenshots[2])
  })

  it('should disable prev button on first screenshot', () => {
    render(<ChildScreenshotDetail {...defaultProps} screenshot={mockScreenshots[0]} />)

    const prevButton = screen.getByTestId('prev-button')
    expect(prevButton).toBeDisabled()
  })

  it('should disable next button on last screenshot', () => {
    render(<ChildScreenshotDetail {...defaultProps} screenshot={mockScreenshots[2]} />)

    const nextButton = screen.getByTestId('next-button')
    expect(nextButton).toBeDisabled()
  })

  it('should have dialog role and aria-modal', () => {
    render(<ChildScreenshotDetail {...defaultProps} />)

    const modal = screen.getByTestId('screenshot-detail-modal')
    expect(modal).toHaveAttribute('role', 'dialog')
    expect(modal).toHaveAttribute('aria-modal', 'true')
  })

  it('should show placeholder when image URL is empty', () => {
    render(
      <ChildScreenshotDetail
        {...defaultProps}
        screenshot={{ ...mockScreenshots[1], imageUrl: '' }}
      />
    )

    expect(screen.getByTestId('detail-placeholder')).toBeInTheDocument()
    expect(screen.getByText('Picture not available')).toBeInTheDocument()
  })

  // Story 19B.3 - Zoom Controls Tests (AC: #5)
  describe('Zoom Controls', () => {
    it('should render zoom controls when image is displayed', () => {
      render(<ChildScreenshotDetail {...defaultProps} />)

      expect(screen.getByTestId('zoom-controls')).toBeInTheDocument()
      expect(screen.getByTestId('zoom-in-button')).toBeInTheDocument()
      expect(screen.getByTestId('zoom-out-button')).toBeInTheDocument()
      expect(screen.getByTestId('zoom-level')).toBeInTheDocument()
    })

    it('should display initial zoom level at 100%', () => {
      render(<ChildScreenshotDetail {...defaultProps} />)

      expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%')
    })

    it('should increase zoom when zoom in button is clicked', () => {
      render(<ChildScreenshotDetail {...defaultProps} />)

      fireEvent.click(screen.getByTestId('zoom-in-button'))

      expect(screen.getByTestId('zoom-level')).toHaveTextContent('150%')
    })

    it('should decrease zoom when zoom out button is clicked', () => {
      render(<ChildScreenshotDetail {...defaultProps} />)

      // First zoom in
      fireEvent.click(screen.getByTestId('zoom-in-button'))
      expect(screen.getByTestId('zoom-level')).toHaveTextContent('150%')

      // Then zoom out
      fireEvent.click(screen.getByTestId('zoom-out-button'))
      expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%')
    })

    it('should not allow zoom below 100%', () => {
      render(<ChildScreenshotDetail {...defaultProps} />)

      // Try to zoom out at minimum
      fireEvent.click(screen.getByTestId('zoom-out-button'))

      expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%')
    })

    it('should show reset zoom button when zoomed in', () => {
      render(<ChildScreenshotDetail {...defaultProps} />)

      // Initially no reset button
      expect(screen.queryByTestId('reset-zoom-button')).not.toBeInTheDocument()

      // Zoom in
      fireEvent.click(screen.getByTestId('zoom-in-button'))

      // Reset button should appear
      expect(screen.getByTestId('reset-zoom-button')).toBeInTheDocument()
    })

    it('should reset zoom to 100% when reset button is clicked', () => {
      render(<ChildScreenshotDetail {...defaultProps} />)

      // Zoom in
      fireEvent.click(screen.getByTestId('zoom-in-button'))
      fireEvent.click(screen.getByTestId('zoom-in-button'))
      expect(screen.getByTestId('zoom-level')).toHaveTextContent('200%')

      // Click reset
      fireEvent.click(screen.getByTestId('reset-zoom-button'))
      expect(screen.getByTestId('zoom-level')).toHaveTextContent('100%')
    })

    it('should have accessible labels on zoom buttons', () => {
      render(<ChildScreenshotDetail {...defaultProps} />)

      expect(screen.getByTestId('zoom-in-button')).toHaveAttribute('aria-label', 'Zoom in')
      expect(screen.getByTestId('zoom-out-button')).toHaveAttribute('aria-label', 'Zoom out')
    })

    it('should not render zoom controls when showing placeholder', () => {
      render(
        <ChildScreenshotDetail
          {...defaultProps}
          screenshot={{ ...mockScreenshots[1], imageUrl: '' }}
        />
      )

      expect(screen.queryByTestId('zoom-controls')).not.toBeInTheDocument()
    })
  })

  // Story 19B.3 - Image Container Tests
  describe('Image Container', () => {
    it('should render image container with touch handlers', () => {
      render(<ChildScreenshotDetail {...defaultProps} />)

      expect(screen.getByTestId('image-container')).toBeInTheDocument()
    })

    it('should render image with draggable=false for touch support', () => {
      render(<ChildScreenshotDetail {...defaultProps} />)

      const image = screen.getByTestId('detail-image')
      expect(image).toHaveAttribute('draggable', 'false')
    })
  })

  // Story 19B.6 - Audit Logging Tests (Bilateral Transparency)
  describe('Audit Logging (Story 19B.6)', () => {
    const propsWithAudit = {
      ...defaultProps,
      childId: 'child-123',
      familyId: 'family-456',
    }

    it('should log child view when childId and familyId are provided (AC4)', () => {
      render(<ChildScreenshotDetail {...propsWithAudit} />)

      expect(auditService.logDataViewNonBlocking).toHaveBeenCalledWith({
        viewerUid: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        dataType: 'child_own_screenshot',
        metadata: { screenshotId: 'ss-2' },
      })
    })

    it('should NOT log when childId is missing', () => {
      render(<ChildScreenshotDetail {...defaultProps} familyId="family-456" />)

      expect(auditService.logDataViewNonBlocking).not.toHaveBeenCalled()
    })

    it('should NOT log when familyId is missing', () => {
      render(<ChildScreenshotDetail {...defaultProps} childId="child-123" />)

      expect(auditService.logDataViewNonBlocking).not.toHaveBeenCalled()
    })

    it('should log again when screenshot changes', () => {
      const { rerender } = render(<ChildScreenshotDetail {...propsWithAudit} />)

      expect(auditService.logDataViewNonBlocking).toHaveBeenCalledTimes(1)

      // Navigate to a different screenshot
      rerender(<ChildScreenshotDetail {...propsWithAudit} screenshot={mockScreenshots[0]} />)

      expect(auditService.logDataViewNonBlocking).toHaveBeenCalledTimes(2)
      expect(auditService.logDataViewNonBlocking).toHaveBeenLastCalledWith({
        viewerUid: 'child-123',
        childId: 'child-123',
        familyId: 'family-456',
        dataType: 'child_own_screenshot',
        metadata: { screenshotId: 'ss-1' },
      })
    })

    it('should use correct dataType for child_own_screenshot', () => {
      render(<ChildScreenshotDetail {...propsWithAudit} />)

      const call = vi.mocked(auditService.logDataViewNonBlocking).mock.calls[0][0]
      expect(call.dataType).toBe('child_own_screenshot')
    })
  })
})
