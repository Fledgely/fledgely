/**
 * Tests for CaregiverFlagDetailView Component
 *
 * Story 39.5: Caregiver Flag Viewing
 * - AC1: Flag details display (screenshot, category, severity, AI reasoning, timestamp)
 * - AC2: Reviewed Flag Marking (Mark as Reviewed button)
 * - AC3: Restricted Actions (no dismiss/escalate/resolve)
 * - AC4: Flag viewing logged on mount
 *
 * Tests cover:
 * - Flag details display
 * - Mark as Reviewed button
 * - Restricted actions hidden
 * - Contact parent note
 * - View logging on mount
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CaregiverFlagDetailView } from './CaregiverFlagDetailView'
import type { FlagDocument } from '@fledgely/shared'

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { success: true } })),
}))

// Mock Firebase Storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  getDownloadURL: vi.fn().mockResolvedValue('https://example.com/screenshot.png'),
}))

// Mock lib/firebase
vi.mock('../../lib/firebase', () => ({
  getFirestoreDb: vi.fn(),
  getFirebaseApp: vi.fn(() => ({})),
}))

describe('CaregiverFlagDetailView', () => {
  const mockFlag: FlagDocument = {
    id: 'flag-123',
    childId: 'child-1',
    familyId: 'family-123',
    screenshotId: 'screenshot-1',
    category: 'Violence',
    severity: 'high',
    confidence: 95,
    reasoning: 'Detected violence content in the screenshot',
    status: 'pending',
    createdAt: Date.now() - 3600000, // 1 hour ago
  } as FlagDocument

  const defaultProps = {
    flag: mockFlag,
    familyId: 'family-123',
    childName: 'Emma',
    caregiverName: 'Grandma',
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Flag Details Display (AC1)', () => {
    it('should display flag info panel', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      expect(screen.getByTestId('flag-info-panel')).toBeInTheDocument()
    })

    it('should display AI reasoning panel', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      expect(screen.getByTestId('ai-reasoning-panel')).toBeInTheDocument()
    })

    it('should display child name', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      expect(screen.getByText('Emma')).toBeInTheDocument()
    })

    it('should display category badge', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      expect(screen.getByTestId('flag-category')).toBeInTheDocument()
      expect(screen.getByText('Violence')).toBeInTheDocument()
    })

    it('should display severity badge', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      expect(screen.getByTestId('flag-severity')).toBeInTheDocument()
    })
  })

  describe('Mark as Reviewed (AC2)', () => {
    it('should display Mark as Reviewed button', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      expect(screen.getByRole('button', { name: /mark as reviewed/i })).toBeInTheDocument()
    })

    it('should have 44px minimum touch target for button', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      const button = screen.getByRole('button', { name: /mark as reviewed/i })
      expect(button).toHaveStyle({ minHeight: '44px' })
    })

    it('should call markFlagReviewedByCaregiver when button clicked', async () => {
      const { httpsCallable } = await import('firebase/functions')
      const mockMarkReviewed = vi.fn().mockResolvedValue({ data: { success: true } })
      ;(httpsCallable as ReturnType<typeof vi.fn>).mockReturnValue(mockMarkReviewed)

      render(<CaregiverFlagDetailView {...defaultProps} />)

      const button = screen.getByRole('button', { name: /mark as reviewed/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(httpsCallable).toHaveBeenCalled()
      })
    })
  })

  describe('Restricted Actions (AC3)', () => {
    it('should NOT display dismiss button', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
    })

    it('should NOT display escalate button', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      expect(screen.queryByRole('button', { name: /escalate/i })).not.toBeInTheDocument()
    })

    it('should NOT display resolve button', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      expect(screen.queryByRole('button', { name: /resolve/i })).not.toBeInTheDocument()
    })

    it('should display contact parent note', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      expect(screen.getByTestId('contact-parent-note')).toBeInTheDocument()
      expect(screen.getByText(/contact parent/i)).toBeInTheDocument()
    })
  })

  describe('View Logging (AC4)', () => {
    it('should log view on mount', async () => {
      const { httpsCallable } = await import('firebase/functions')
      const mockLogView = vi.fn().mockResolvedValue({ data: { success: true } })
      ;(httpsCallable as ReturnType<typeof vi.fn>).mockReturnValue(mockLogView)

      render(<CaregiverFlagDetailView {...defaultProps} />)

      await waitFor(() => {
        expect(httpsCallable).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      expect(screen.getByRole('heading', { name: /flag details/i })).toBeInTheDocument()
    })

    it('should have close button with accessible label', () => {
      render(<CaregiverFlagDetailView {...defaultProps} />)

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    })

    it('should call onClose when close button clicked', () => {
      const onClose = vi.fn()
      render(<CaregiverFlagDetailView {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByRole('button', { name: /close/i }))

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Loading and Error States', () => {
    it('should show loading state for Mark as Reviewed button', async () => {
      const { httpsCallable } = await import('firebase/functions')
      let resolvePromise: () => void
      const mockMarkReviewed = vi.fn(
        () =>
          new Promise((resolve) => {
            resolvePromise = () => resolve({ data: { success: true } })
          })
      )
      ;(httpsCallable as ReturnType<typeof vi.fn>).mockReturnValue(mockMarkReviewed)

      render(<CaregiverFlagDetailView {...defaultProps} />)

      const button = screen.getByRole('button', { name: /mark as reviewed/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/marking/i)).toBeInTheDocument()
      })

      resolvePromise!()
    })
  })
})
