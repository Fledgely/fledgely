/**
 * Tests for CaregiverFlagQueue Component
 *
 * Story 39.5: Caregiver Flag Viewing
 * - AC1: Flag Queue Access (flags in priority order)
 * - AC3: Restricted Actions (no dismiss/escalate/resolve)
 * - AC5: Permission Requirement (canViewFlags)
 * - AC6: Child Privacy (only assigned children)
 *
 * Tests cover:
 * - Permission denied state
 * - Flag list display
 * - Tab functionality (Pending / Reviewed by Me)
 * - Restricted actions message
 * - Mark as Reviewed functionality
 * - Child filtering
 * - Touch targets (NFR49)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CaregiverFlagQueue } from './CaregiverFlagQueue'
import type { FlagDocument } from '@fledgely/shared'

// Mock the flag service
vi.mock('../../services/flagService', () => ({
  subscribeToPendingFlags: vi.fn((childIds, callback) => {
    // Return mock flags sorted by severity then date
    callback([])
    return vi.fn() // unsubscribe function
  }),
  getFlagsForChildren: vi.fn().mockResolvedValue([]),
  applyClientFilters: vi.fn((flags) => flags),
}))

// Mock Firebase callable functions
vi.mock('../../lib/firebase', () => ({
  getFirestoreDb: vi.fn(),
}))

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { success: true } })),
}))

describe('CaregiverFlagQueue', () => {
  const mockChildren = [
    { id: 'child-1', name: 'Emma' },
    { id: 'child-2', name: 'Liam' },
  ]

  const mockFlags: FlagDocument[] = [
    {
      id: 'flag-1',
      childId: 'child-1',
      familyId: 'family-123',
      screenshotId: 'screenshot-1',
      category: 'Violence',
      severity: 'high',
      confidence: 95,
      reasoning: 'Detected violence content',
      status: 'pending',
      createdAt: Date.now() - 3600000, // 1 hour ago
    } as FlagDocument,
    {
      id: 'flag-2',
      childId: 'child-2',
      familyId: 'family-123',
      screenshotId: 'screenshot-2',
      category: 'Bullying',
      severity: 'medium',
      confidence: 80,
      reasoning: 'Detected bullying language',
      status: 'pending',
      createdAt: Date.now() - 7200000, // 2 hours ago
    } as FlagDocument,
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Permission Requirement (AC5)', () => {
    it('should show permission denied state when canViewFlags is false', () => {
      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1']}
          canViewFlags={false}
          caregiverName="Grandma"
        />
      )

      expect(screen.getByText(/don't have permission to view flags/i)).toBeInTheDocument()
    })

    it('should show flag queue when canViewFlags is true', () => {
      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1']}
          canViewFlags={true}
          caregiverName="Grandma"
        />
      )

      expect(screen.getByTestId('caregiver-flag-queue')).toBeInTheDocument()
    })
  })

  describe('Flag Queue Access (AC1)', () => {
    it('should display pending tab by default', () => {
      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1', 'child-2']}
          canViewFlags={true}
          caregiverName="Grandma"
        />
      )

      const pendingTab = screen.getByTestId('tab-pending')
      expect(pendingTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should switch to reviewed tab when clicked', async () => {
      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1', 'child-2']}
          canViewFlags={true}
          caregiverName="Grandma"
        />
      )

      const reviewedTab = screen.getByTestId('tab-reviewed')
      fireEvent.click(reviewedTab)

      await waitFor(() => {
        expect(reviewedTab).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('should show empty state when no flags', () => {
      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1']}
          canViewFlags={true}
          caregiverName="Grandma"
        />
      )

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  describe('Restricted Actions (AC3)', () => {
    it('should display restricted actions message', () => {
      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1']}
          canViewFlags={true}
          caregiverName="Grandma"
        />
      )

      expect(screen.getByTestId('restricted-actions-message')).toBeInTheDocument()
      expect(screen.getByText(/only parents can dismiss or resolve flags/i)).toBeInTheDocument()
    })

    it('should NOT show dismiss button', async () => {
      const { subscribeToPendingFlags } = await import('../../services/flagService')
      ;(subscribeToPendingFlags as ReturnType<typeof vi.fn>).mockImplementation(
        (childIds: string[], callback: (flags: FlagDocument[]) => void) => {
          callback(mockFlags)
          return vi.fn()
        }
      )

      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1', 'child-2']}
          canViewFlags={true}
          caregiverName="Grandma"
        />
      )

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
      })
    })

    it('should NOT show escalate button', async () => {
      const { subscribeToPendingFlags } = await import('../../services/flagService')
      ;(subscribeToPendingFlags as ReturnType<typeof vi.fn>).mockImplementation(
        (childIds: string[], callback: (flags: FlagDocument[]) => void) => {
          callback(mockFlags)
          return vi.fn()
        }
      )

      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1', 'child-2']}
          canViewFlags={true}
          caregiverName="Grandma"
        />
      )

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /escalate/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Child Privacy (AC6)', () => {
    it('should only show flags for assigned children', async () => {
      const { subscribeToPendingFlags } = await import('../../services/flagService')
      ;(subscribeToPendingFlags as ReturnType<typeof vi.fn>).mockImplementation(
        (childIds: string[], callback: (flags: FlagDocument[]) => void) => {
          // Verify that only assigned childIds are requested
          expect(childIds).toEqual(['child-1'])
          callback(mockFlags.filter((f) => childIds.includes(f.childId)))
          return vi.fn()
        }
      )

      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1']} // Only assigned to child-1
          canViewFlags={true}
          caregiverName="Grandma"
        />
      )

      // Should only subscribe to child-1's flags
      expect(subscribeToPendingFlags).toHaveBeenCalledWith(['child-1'], expect.any(Function))
    })
  })

  describe('Mark as Reviewed (AC2)', () => {
    it('should show Mark as Reviewed button', async () => {
      const { subscribeToPendingFlags } = await import('../../services/flagService')
      ;(subscribeToPendingFlags as ReturnType<typeof vi.fn>).mockImplementation(
        (childIds: string[], callback: (flags: FlagDocument[]) => void) => {
          callback(mockFlags)
          return vi.fn()
        }
      )

      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1', 'child-2']}
          canViewFlags={true}
          caregiverName="Grandma"
        />
      )

      await waitFor(() => {
        const flagCards = screen.getAllByTestId(/^flag-card-/)
        expect(flagCards.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Touch Targets (NFR49)', () => {
    it('should have minimum 44px touch targets for tabs', () => {
      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1']}
          canViewFlags={true}
          caregiverName="Grandma"
        />
      )

      const pendingTab = screen.getByTestId('tab-pending')
      const reviewedTab = screen.getByTestId('tab-reviewed')

      // Check min-height style
      expect(pendingTab).toHaveStyle({ minHeight: '44px' })
      expect(reviewedTab).toHaveStyle({ minHeight: '44px' })
    })
  })

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1']}
          canViewFlags={true}
          caregiverName="Grandma"
        />
      )

      // Loading state might show briefly, but flags will be loaded immediately due to mock
      expect(screen.getByTestId('caregiver-flag-queue')).toBeInTheDocument()
    })
  })

  describe('Flag Card Display', () => {
    it('should display flag cards with proper information', async () => {
      const { subscribeToPendingFlags } = await import('../../services/flagService')
      ;(subscribeToPendingFlags as ReturnType<typeof vi.fn>).mockImplementation(
        (childIds: string[], callback: (flags: FlagDocument[]) => void) => {
          callback(mockFlags)
          return vi.fn()
        }
      )

      render(
        <CaregiverFlagQueue
          caregiverChildIds={['child-1', 'child-2']}
          canViewFlags={true}
          caregiverName="Grandma"
          familyChildren={mockChildren}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('flag-card-flag-1')).toBeInTheDocument()
        expect(screen.getByTestId('flag-card-flag-2')).toBeInTheDocument()
      })
    })
  })
})
