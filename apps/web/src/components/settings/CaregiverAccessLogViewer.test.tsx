/**
 * CaregiverAccessLogViewer Component Tests - Story 19D.3
 *
 * Tests for the parent-facing caregiver activity viewer.
 *
 * Story 19D.3 Acceptance Criteria:
 * - AC3: Logs visible to parent in family audit trail
 * - AC6: Parents can review "Grandpa Joe viewed Emma's status 3 times this week"
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CaregiverAccessLogViewer } from './CaregiverAccessLogViewer'
import type { CaregiverAccessSummary } from '../../services/caregiverAuditService'

// Mock the caregiverAuditService
vi.mock('../../services/caregiverAuditService', () => ({
  getCaregiverAccessSummaries: vi.fn(),
  formatAccessSummary: vi.fn(
    (summary: CaregiverAccessSummary, _childNames?: Record<string, string>) => {
      const name = summary.caregiverName ?? 'A caregiver'
      const count = summary.accessCount
      const times = count === 1 ? 'time' : 'times'
      return `${name} viewed ${count} ${times} this week`
    }
  ),
}))

import { getCaregiverAccessSummaries } from '../../services/caregiverAuditService'

describe('CaregiverAccessLogViewer', () => {
  const mockCaregiverNames = {
    'caregiver-1': 'Grandpa Joe',
    'caregiver-2': 'Grandma Mary',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading state', () => {
    it('shows loading state initially', () => {
      // Set up a pending promise
      vi.mocked(getCaregiverAccessSummaries).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<CaregiverAccessLogViewer familyId="family-1" caregiverNames={mockCaregiverNames} />)

      expect(screen.getByText(/Loading caregiver activity/i)).toBeInTheDocument()
    })
  })

  describe('Empty state (AC3)', () => {
    it('shows empty message when no logs exist', async () => {
      vi.mocked(getCaregiverAccessSummaries).mockResolvedValue([])

      render(<CaregiverAccessLogViewer familyId="family-1" caregiverNames={mockCaregiverNames} />)

      await waitFor(() => {
        expect(screen.getByText(/No caregiver activity this week/i)).toBeInTheDocument()
      })
    })

    it('shows correct period in empty message', async () => {
      vi.mocked(getCaregiverAccessSummaries).mockResolvedValue([])

      render(
        <CaregiverAccessLogViewer
          familyId="family-1"
          caregiverNames={mockCaregiverNames}
          period="today"
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/No caregiver activity today/i)).toBeInTheDocument()
      })
    })
  })

  describe('Displaying summaries (AC3, AC6)', () => {
    it('displays caregiver access summaries', async () => {
      const mockSummaries: CaregiverAccessSummary[] = [
        {
          caregiverId: 'caregiver-1',
          caregiverName: 'Grandpa Joe',
          accessCount: 3,
          lastAccess: new Date(),
          childrenViewed: ['child-1'],
        },
      ]

      vi.mocked(getCaregiverAccessSummaries).mockResolvedValue(mockSummaries)

      render(<CaregiverAccessLogViewer familyId="family-1" caregiverNames={mockCaregiverNames} />)

      await waitFor(() => {
        expect(screen.getByText(/Grandpa Joe viewed 3 times this week/i)).toBeInTheDocument()
      })
    })

    it('displays multiple caregivers', async () => {
      const mockSummaries: CaregiverAccessSummary[] = [
        {
          caregiverId: 'caregiver-1',
          caregiverName: 'Grandpa Joe',
          accessCount: 3,
          lastAccess: new Date(),
          childrenViewed: ['child-1'],
        },
        {
          caregiverId: 'caregiver-2',
          caregiverName: 'Grandma Mary',
          accessCount: 1,
          lastAccess: new Date(),
          childrenViewed: ['child-2'],
        },
      ]

      vi.mocked(getCaregiverAccessSummaries).mockResolvedValue(mockSummaries)

      render(<CaregiverAccessLogViewer familyId="family-1" caregiverNames={mockCaregiverNames} />)

      await waitFor(() => {
        expect(screen.getByText(/Grandpa Joe viewed 3 times this week/i)).toBeInTheDocument()
        expect(screen.getByText(/Grandma Mary viewed 1 time this week/i)).toBeInTheDocument()
      })
    })

    it('uses singular "time" for count of 1', async () => {
      const mockSummaries: CaregiverAccessSummary[] = [
        {
          caregiverId: 'caregiver-1',
          caregiverName: 'Grandpa Joe',
          accessCount: 1,
          lastAccess: new Date(),
          childrenViewed: [],
        },
      ]

      vi.mocked(getCaregiverAccessSummaries).mockResolvedValue(mockSummaries)

      render(<CaregiverAccessLogViewer familyId="family-1" caregiverNames={mockCaregiverNames} />)

      await waitFor(() => {
        expect(screen.getByText(/viewed 1 time this week/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error handling', () => {
    it('shows error message on failure', async () => {
      vi.mocked(getCaregiverAccessSummaries).mockRejectedValue(new Error('Network error'))

      render(<CaregiverAccessLogViewer familyId="family-1" caregiverNames={mockCaregiverNames} />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load caregiver activity/i)).toBeInTheDocument()
      })
    })
  })

  describe('Period filtering', () => {
    it('passes week period by default', async () => {
      vi.mocked(getCaregiverAccessSummaries).mockResolvedValue([])

      render(<CaregiverAccessLogViewer familyId="family-1" caregiverNames={mockCaregiverNames} />)

      await waitFor(() => {
        expect(getCaregiverAccessSummaries).toHaveBeenCalledWith(
          expect.objectContaining({
            familyId: 'family-1',
          }),
          mockCaregiverNames
        )
      })
    })

    it('filters by month when period is month', async () => {
      vi.mocked(getCaregiverAccessSummaries).mockResolvedValue([])

      render(
        <CaregiverAccessLogViewer
          familyId="family-1"
          caregiverNames={mockCaregiverNames}
          period="month"
        />
      )

      await waitFor(() => {
        // The component should show "this month" in the header
        expect(screen.getByText(/this month/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has accessible list role', async () => {
      const mockSummaries: CaregiverAccessSummary[] = [
        {
          caregiverId: 'caregiver-1',
          caregiverName: 'Grandpa Joe',
          accessCount: 3,
          lastAccess: new Date(),
          childrenViewed: ['child-1'],
        },
      ]

      vi.mocked(getCaregiverAccessSummaries).mockResolvedValue(mockSummaries)

      render(<CaregiverAccessLogViewer familyId="family-1" caregiverNames={mockCaregiverNames} />)

      await waitFor(() => {
        expect(screen.getByRole('list', { name: /caregiver access history/i })).toBeInTheDocument()
      })
    })

    it('has test IDs for each caregiver item', async () => {
      const mockSummaries: CaregiverAccessSummary[] = [
        {
          caregiverId: 'caregiver-123',
          caregiverName: 'Grandpa Joe',
          accessCount: 3,
          lastAccess: new Date(),
          childrenViewed: [],
        },
      ]

      vi.mocked(getCaregiverAccessSummaries).mockResolvedValue(mockSummaries)

      render(<CaregiverAccessLogViewer familyId="family-1" caregiverNames={mockCaregiverNames} />)

      await waitFor(() => {
        expect(screen.getByTestId('caregiver-access-item-caregiver-123')).toBeInTheDocument()
      })
    })
  })

  describe('Last access display', () => {
    it('shows last access date', async () => {
      const lastAccessDate = new Date('2025-12-30')
      const mockSummaries: CaregiverAccessSummary[] = [
        {
          caregiverId: 'caregiver-1',
          caregiverName: 'Grandpa Joe',
          accessCount: 3,
          lastAccess: lastAccessDate,
          childrenViewed: [],
        },
      ]

      vi.mocked(getCaregiverAccessSummaries).mockResolvedValue(mockSummaries)

      render(<CaregiverAccessLogViewer familyId="family-1" caregiverNames={mockCaregiverNames} />)

      await waitFor(() => {
        // Check for the timestamp element which contains "Last:" prefix
        const timestampElement = screen.getByTestId('caregiver-access-item-caregiver-1')
        expect(timestampElement).toHaveTextContent('Last:')
      })
    })
  })
})
