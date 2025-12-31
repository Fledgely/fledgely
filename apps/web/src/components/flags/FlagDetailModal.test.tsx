/**
 * FlagDetailModal Tests - Story 22.2
 *
 * Tests for the flag detail modal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FlagDetailModal } from './FlagDetailModal'
import type { FlagDocument } from '@fledgely/shared'

// Mock Firebase Storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn(),
  getDownloadURL: vi.fn(),
}))

vi.mock('../../lib/firebase', () => ({
  getFirebaseApp: vi.fn(() => ({})),
}))

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
})
