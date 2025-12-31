/**
 * FlagDetailModal Tests - Story 22.2 & Story 28.4
 *
 * Tests for the flag detail modal component.
 *
 * Story 28.4 - Description Display in Dashboard:
 * - AC1: Description shown below/beside screenshot
 * - AC2: Collapsible for sighted users who prefer images
 * - AC3: Expanded by default when screen reader detected
 * - AC5: "AI Generated" label indicates source
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FlagDetailModal } from './FlagDetailModal'
import type { FlagDocument } from '@fledgely/shared'

// Mock Firebase Storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn(),
  getDownloadURL: vi.fn().mockResolvedValue('https://example.com/screenshot.jpg'),
}))

// Story 28.4: Mock Firestore for accessibility description fetching
const mockGetDoc = vi.fn()
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: () => mockGetDoc(),
}))

vi.mock('../../lib/firebase', () => ({
  getFirebaseApp: vi.fn(() => ({})),
}))

// Story 28.4: Mock window.matchMedia for prefers-reduced-motion detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock flag service
vi.mock('../../services/flagService', () => ({
  takeFlagAction: vi.fn().mockResolvedValue(undefined),
}))

const createMockFlag = (overrides: Partial<FlagDocument> = {}): FlagDocument => ({
  id: 'flag-123',
  childId: 'child-456',
  screenshotId: 'screenshot-789',
  category: 'Violence',
  severity: 'high',
  confidence: 85,
  reasoning: 'This content was flagged because it contains potentially violent imagery.',
  status: 'pending',
  createdAt: Date.now(),
  detectedAt: Date.now(),
  ...overrides,
})

describe('FlagDetailModal', () => {
  const mockOnClose = vi.fn()
  const _mockOnActionComplete = vi.fn() // Prefixed for unused - used for future action complete tests

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal structure', () => {
    it('should render the modal', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      expect(screen.getByTestId('flag-detail-modal')).toBeInTheDocument()
    })

    it('should render with correct ARIA attributes', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      const modal = screen.getByTestId('flag-detail-modal')
      expect(modal).toHaveAttribute('role', 'dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
    })

    it('should display modal title', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      expect(screen.getByText('Flag Details')).toBeInTheDocument()
    })
  })

  describe('AC1: Full screenshot displayed', () => {
    it('should render screenshot container', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      expect(screen.getByTestId('screenshot-container')).toBeInTheDocument()
    })

    it('should show loading state initially', async () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      // Should show loading state
      expect(screen.getByText('Loading screenshot...')).toBeInTheDocument()
    })

    it('should show error state when no screenshot available', async () => {
      const flag = createMockFlag({ screenshotId: undefined })
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      await waitFor(() => {
        expect(screen.getByTestId('screenshot-error')).toBeInTheDocument()
      })
    })
  })

  describe('AC2: AI reasoning panel', () => {
    it('should render AI reasoning panel', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      expect(screen.getByTestId('ai-reasoning-panel')).toBeInTheDocument()
    })

    it('should display the reasoning text', () => {
      const reasoning = 'Content flagged due to violent themes'
      const flag = createMockFlag({ reasoning })
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      expect(screen.getByTestId('reasoning-text')).toHaveTextContent(reasoning)
    })
  })

  describe('AC3 & AC4 & AC5: Flag info panel', () => {
    it('should render flag info panel', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      expect(screen.getByTestId('flag-info-panel')).toBeInTheDocument()
    })

    it('should display category', () => {
      const flag = createMockFlag({ category: 'Bullying' })
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      expect(screen.getByTestId('flag-category')).toHaveTextContent('Bullying')
    })

    it('should display severity', () => {
      const flag = createMockFlag({ severity: 'medium' })
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      expect(screen.getByTestId('flag-severity')).toHaveTextContent('Medium Severity')
    })

    it('should display confidence score', () => {
      const flag = createMockFlag({ confidence: 92 })
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      expect(screen.getByTestId('confidence-value')).toHaveTextContent('92%')
    })

    it('should display child name', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      expect(screen.getByTestId('child-name')).toHaveTextContent('Emma')
    })

    it('should display device name when provided', () => {
      const flag = createMockFlag()
      render(
        <FlagDetailModal
          flag={flag}
          childName="Emma"
          deviceName="iPad Mini"
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('device-name')).toHaveTextContent('iPad Mini')
    })
  })

  describe('AC6: Can close detail view', () => {
    it('should have a close button', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      expect(screen.getByTestId('close-button')).toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      fireEvent.click(screen.getByTestId('close-button'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when Escape key is pressed', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when clicking on the overlay', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      const overlay = screen.getByTestId('flag-detail-modal')
      fireEvent.click(overlay)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should not close when clicking inside the modal', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      const modalContent = screen.getByRole('document')
      fireEvent.click(modalContent)
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Action buttons - Story 22.3', () => {
    it('should not render action buttons when parentId is not provided', () => {
      const flag = createMockFlag()
      render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

      expect(screen.queryByTestId('action-buttons')).not.toBeInTheDocument()
    })

    it('should not render action buttons when parentName is not provided', () => {
      const flag = createMockFlag()
      render(
        <FlagDetailModal flag={flag} childName="Emma" parentId="parent-123" onClose={mockOnClose} />
      )

      expect(screen.queryByTestId('action-buttons')).not.toBeInTheDocument()
    })

    it('should render action buttons when parentId and parentName are provided', () => {
      const flag = createMockFlag()
      render(
        <FlagDetailModal
          flag={flag}
          childName="Emma"
          parentId="parent-123"
          parentName="John"
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('action-buttons')).toBeInTheDocument()
    })

    it('should have dismiss button', () => {
      const flag = createMockFlag()
      render(
        <FlagDetailModal
          flag={flag}
          childName="Emma"
          parentId="parent-123"
          parentName="John"
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('action-dismiss')).toHaveTextContent('Dismiss')
    })

    it('should have discuss button', () => {
      const flag = createMockFlag()
      render(
        <FlagDetailModal
          flag={flag}
          childName="Emma"
          parentId="parent-123"
          parentName="John"
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('action-discuss')).toHaveTextContent('Note for Discussion')
    })

    it('should have escalate button', () => {
      const flag = createMockFlag()
      render(
        <FlagDetailModal
          flag={flag}
          childName="Emma"
          parentId="parent-123"
          parentName="John"
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('action-escalate')).toHaveTextContent('Requires Action')
    })

    it('should open confirmation modal when dismiss button clicked', () => {
      const flag = createMockFlag()
      render(
        <FlagDetailModal
          flag={flag}
          childName="Emma"
          parentId="parent-123"
          parentName="John"
          onClose={mockOnClose}
        />
      )

      fireEvent.click(screen.getByTestId('action-dismiss'))
      expect(screen.getByTestId('flag-action-modal')).toBeInTheDocument()
      // Modal title is "Dismiss Flag"
      expect(screen.getByRole('heading', { name: 'Dismiss Flag' })).toBeInTheDocument()
    })

    it('should open confirmation modal when discuss button clicked', () => {
      const flag = createMockFlag()
      render(
        <FlagDetailModal
          flag={flag}
          childName="Emma"
          parentId="parent-123"
          parentName="John"
          onClose={mockOnClose}
        />
      )

      fireEvent.click(screen.getByTestId('action-discuss'))
      expect(screen.getByTestId('flag-action-modal')).toBeInTheDocument()
      // Modal title - find the h2 heading inside the action modal
      const actionModal = screen.getByTestId('flag-action-modal')
      expect(actionModal.querySelector('h2')).toHaveTextContent('Note for Discussion')
    })

    it('should open confirmation modal when escalate button clicked', () => {
      const flag = createMockFlag()
      render(
        <FlagDetailModal
          flag={flag}
          childName="Emma"
          parentId="parent-123"
          parentName="John"
          onClose={mockOnClose}
        />
      )

      fireEvent.click(screen.getByTestId('action-escalate'))
      expect(screen.getByTestId('flag-action-modal')).toBeInTheDocument()
      // Modal title - find the h2 heading inside the action modal
      const actionModal = screen.getByTestId('flag-action-modal')
      expect(actionModal.querySelector('h2')).toHaveTextContent('Requires Action')
    })

    it('should close confirmation modal when cancel is clicked', () => {
      const flag = createMockFlag()
      render(
        <FlagDetailModal
          flag={flag}
          childName="Emma"
          parentId="parent-123"
          parentName="John"
          onClose={mockOnClose}
        />
      )

      fireEvent.click(screen.getByTestId('action-dismiss'))
      expect(screen.getByTestId('flag-action-modal')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('action-cancel'))
      expect(screen.queryByTestId('flag-action-modal')).not.toBeInTheDocument()
    })
  })

  // Story 28.4: AI Description Display Tests
  describe('Story 28.4 - AI Description Display', () => {
    const mockAccessibilityDescription = {
      status: 'completed',
      description:
        'The screenshot shows a YouTube video player with a Minecraft gaming tutorial. The video is paused at 5:30 showing a player building a castle. Comments are visible below the video.',
      wordCount: 150,
      generatedAt: Date.now(),
      modelVersion: 'gemini-1.5-flash',
    }

    beforeEach(() => {
      // Reset the mock before each test
      mockGetDoc.mockReset()
    })

    describe('AC1: Description shown below screenshot', () => {
      it('should render AI description panel when description is available', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({ accessibilityDescription: mockAccessibilityDescription }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          expect(screen.getByTestId('ai-description-panel')).toBeInTheDocument()
        })
      })

      it('should not render AI description panel when description is not available', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({}),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        // Wait for fetch to complete
        await waitFor(() => {
          expect(mockGetDoc).toHaveBeenCalled()
        })

        expect(screen.queryByTestId('ai-description-panel')).not.toBeInTheDocument()
      })

      it('should not render AI description panel when status is not completed', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({
            accessibilityDescription: { status: 'pending' },
          }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          expect(mockGetDoc).toHaveBeenCalled()
        })

        expect(screen.queryByTestId('ai-description-panel')).not.toBeInTheDocument()
      })

      it('should display the description text when expanded', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({ accessibilityDescription: mockAccessibilityDescription }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          expect(screen.getByTestId('ai-description-panel')).toBeInTheDocument()
        })

        // Expand the description
        fireEvent.click(screen.getByTestId('ai-description-toggle'))

        expect(screen.getByTestId('ai-description-content')).toBeInTheDocument()
        expect(screen.getByText(/YouTube video player/)).toBeInTheDocument()
      })
    })

    describe('AC2: Collapsible for sighted users', () => {
      it('should have a toggle button with aria-expanded attribute', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({ accessibilityDescription: mockAccessibilityDescription }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          expect(screen.getByTestId('ai-description-toggle')).toBeInTheDocument()
        })

        const toggle = screen.getByTestId('ai-description-toggle')
        expect(toggle).toHaveAttribute('aria-expanded')
      })

      it('should toggle description visibility when button clicked', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({ accessibilityDescription: mockAccessibilityDescription }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          expect(screen.getByTestId('ai-description-toggle')).toBeInTheDocument()
        })

        // Initially collapsed (not expanded by default without prefers-reduced-motion)
        const toggle = screen.getByTestId('ai-description-toggle')
        expect(toggle).toHaveAttribute('aria-expanded', 'false')
        expect(screen.queryByTestId('ai-description-content')).not.toBeInTheDocument()

        // Click to expand
        fireEvent.click(toggle)
        expect(toggle).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByTestId('ai-description-content')).toBeInTheDocument()

        // Click to collapse
        fireEvent.click(toggle)
        expect(toggle).toHaveAttribute('aria-expanded', 'false')
        expect(screen.queryByTestId('ai-description-content')).not.toBeInTheDocument()
      })
    })

    describe('AC5: AI Generated label', () => {
      it('should display AI Generated badge', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({ accessibilityDescription: mockAccessibilityDescription }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          expect(screen.getByTestId('ai-generated-badge')).toBeInTheDocument()
        })

        expect(screen.getByTestId('ai-generated-badge')).toHaveTextContent('AI Generated')
      })
    })

    describe('Alt-text accessibility', () => {
      it('should use AI description as alt-text when available', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({ accessibilityDescription: mockAccessibilityDescription }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          const img = screen.getByTestId('screenshot-image')
          expect(img).toHaveAttribute('alt', mockAccessibilityDescription.description)
        })
      })

      it('should use fallback alt-text when no description', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({}),
        })

        const flag = createMockFlag({ category: 'Violence' })
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          const img = screen.getByTestId('screenshot-image')
          expect(img).toHaveAttribute('alt', 'Screenshot flagged for Violence')
        })
      })
    })
  })

  // Story 28.5: Description Generation Failures Tests
  describe('Story 28.5 - Description Generation Failures', () => {
    beforeEach(() => {
      mockGetDoc.mockReset()
    })

    describe('AC1: Fallback text shown when generation fails', () => {
      it('should show "Description unavailable" when status is failed', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({
            accessibilityDescription: {
              status: 'failed',
              error: 'AI service unavailable',
            },
          }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          expect(screen.getByTestId('ai-description-failed')).toBeInTheDocument()
        })

        expect(screen.getByText('Description unavailable')).toBeInTheDocument()
      })
    })

    describe('AC2: Screenshot still accessible', () => {
      it('should display screenshot when description fails', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({
            accessibilityDescription: {
              status: 'failed',
              error: 'AI service unavailable',
            },
          }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          expect(screen.getByTestId('screenshot-image')).toBeInTheDocument()
        })

        // Screenshot should still be visible and have fallback alt
        const img = screen.getByTestId('screenshot-image')
        expect(img).toHaveAttribute('alt', 'Screenshot flagged for Violence')
      })
    })

    describe('AC3: Retry option available', () => {
      it('should show Retry button when description failed', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({
            accessibilityDescription: {
              status: 'failed',
              error: 'AI service unavailable',
            },
          }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          expect(screen.getByTestId('retry-description-button')).toBeInTheDocument()
        })

        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      it('should have accessible label on retry button', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({
            accessibilityDescription: {
              status: 'failed',
              error: 'AI service unavailable',
            },
          }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          const retryButton = screen.getByTestId('retry-description-button')
          expect(retryButton).toHaveAttribute('aria-label', 'Retry generating description')
        })
      })
    })

    describe('AC6: Never blocks screenshot display', () => {
      it('should show pending state without blocking screenshot', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({
            accessibilityDescription: {
              status: 'pending',
            },
          }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          expect(screen.getByTestId('ai-description-pending')).toBeInTheDocument()
        })

        // Screenshot should still be visible
        expect(screen.getByTestId('screenshot-image')).toBeInTheDocument()
        expect(screen.getByText('Description pending...')).toBeInTheDocument()
      })

      it('should show processing state without blocking screenshot', async () => {
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({
            accessibilityDescription: {
              status: 'processing',
            },
          }),
        })

        const flag = createMockFlag()
        render(<FlagDetailModal flag={flag} childName="Emma" onClose={mockOnClose} />)

        await waitFor(() => {
          expect(screen.getByTestId('ai-description-pending')).toBeInTheDocument()
        })

        // Screenshot should still be visible
        expect(screen.getByTestId('screenshot-image')).toBeInTheDocument()
        expect(screen.getByText('Generating description...')).toBeInTheDocument()
      })
    })
  })
})
