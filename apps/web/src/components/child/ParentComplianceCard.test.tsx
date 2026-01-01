/**
 * ParentComplianceCard Tests - Story 32.4
 *
 * Tests for child-facing parent compliance display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParentComplianceCard } from './ParentComplianceCard'
import { PARENT_COMPLIANCE_MESSAGES } from '@fledgely/shared'

// Mock the hook
const mockByParent = vi.fn()
vi.mock('../../hooks/useParentCompliance', () => ({
  useParentComplianceByParent: () => mockByParent(),
}))

describe('ParentComplianceCard - Story 32.4', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockByParent.mockReturnValue({
      byParent: [],
      loading: false,
      error: null,
    })
  })

  describe('rendering states', () => {
    it('returns null when familyId is not provided', () => {
      const { container } = render(<ParentComplianceCard familyId={null} />)
      expect(container.firstChild).toBeNull()
    })

    it('shows loading state', () => {
      mockByParent.mockReturnValue({
        byParent: [],
        loading: true,
        error: null,
      })

      render(<ParentComplianceCard familyId="family-123" />)
      expect(screen.getByTestId('parent-compliance-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('returns null on error', () => {
      mockByParent.mockReturnValue({
        byParent: [],
        loading: false,
        error: 'Failed to load',
      })

      const { container } = render(<ParentComplianceCard familyId="family-123" />)
      expect(container.firstChild).toBeNull()
    })

    it('shows empty state when no records', () => {
      mockByParent.mockReturnValue({
        byParent: [],
        loading: false,
        error: null,
      })

      render(<ParentComplianceCard familyId="family-123" />)
      expect(screen.getByText('No offline time yet')).toBeInTheDocument()
    })
  })

  describe('AC2: Child Compliance Dashboard', () => {
    it('displays header with family message', () => {
      mockByParent.mockReturnValue({
        byParent: [],
        loading: false,
        error: null,
      })

      render(<ParentComplianceCard familyId="family-123" />)
      expect(screen.getByText(PARENT_COMPLIANCE_MESSAGES.summaryHeader)).toBeInTheDocument()
      expect(screen.getByText(PARENT_COMPLIANCE_MESSAGES.familyCompliance)).toBeInTheDocument()
    })

    it('shows parent compliance records', () => {
      mockByParent.mockReturnValue({
        byParent: [
          {
            parentUid: 'mom-uid',
            parentDisplayName: 'Mom',
            records: [
              {
                familyId: 'family-123',
                parentUid: 'mom-uid',
                deviceId: 'device-1',
                parentDisplayName: 'Mom',
                offlineWindowStart: 1704067200000,
                offlineWindowEnd: 1704110400000,
                wasCompliant: true,
                activityEvents: [],
                createdAt: Date.now(),
              },
            ],
            summary: {
              parentUid: 'mom-uid',
              totalWindows: 1,
              compliantWindows: 1,
              compliancePercentage: 100,
              lastRecordDate: Date.now(),
            },
          },
        ],
        loading: false,
        error: null,
      })

      render(<ParentComplianceCard familyId="family-123" />)
      expect(screen.getByTestId('compliance-records')).toBeInTheDocument()
      expect(screen.getByText('Mom was offline for family time')).toBeInTheDocument()
    })
  })

  describe('AC4: Transparency Without Shaming', () => {
    it('uses factual language for compliant records', () => {
      mockByParent.mockReturnValue({
        byParent: [
          {
            parentUid: 'mom-uid',
            parentDisplayName: 'Mom',
            records: [
              {
                familyId: 'family-123',
                parentUid: 'mom-uid',
                deviceId: 'device-1',
                parentDisplayName: 'Mom',
                wasCompliant: true,
                offlineWindowStart: 1704067200000,
                offlineWindowEnd: 1704110400000,
                activityEvents: [],
                createdAt: Date.now(),
              },
            ],
            summary: {
              parentUid: 'mom-uid',
              totalWindows: 1,
              compliantWindows: 1,
              compliancePercentage: 100,
              lastRecordDate: Date.now(),
            },
          },
        ],
        loading: false,
        error: null,
      })

      render(<ParentComplianceCard familyId="family-123" />)
      const message = screen.getByText('Mom was offline for family time')
      expect(message).toBeInTheDocument()
      // Should NOT contain shaming language
      expect(message.textContent?.toLowerCase()).not.toContain('good')
      expect(message.textContent?.toLowerCase()).not.toContain('bad')
    })

    it('uses factual language for non-compliant records (no shaming)', () => {
      mockByParent.mockReturnValue({
        byParent: [
          {
            parentUid: 'dad-uid',
            parentDisplayName: 'Dad',
            records: [
              {
                familyId: 'family-123',
                parentUid: 'dad-uid',
                deviceId: 'device-2',
                parentDisplayName: 'Dad',
                wasCompliant: false,
                offlineWindowStart: 1704067200000,
                offlineWindowEnd: 1704110400000,
                activityEvents: [{ timestamp: 1704080000000, type: 'navigation' }],
                createdAt: Date.now(),
              },
            ],
            summary: {
              parentUid: 'dad-uid',
              totalWindows: 1,
              compliantWindows: 0,
              compliancePercentage: 0,
              lastRecordDate: Date.now(),
            },
          },
        ],
        loading: false,
        error: null,
      })

      render(<ParentComplianceCard familyId="family-123" />)
      const message = screen.getByText('Dad used the phone during offline time')
      expect(message).toBeInTheDocument()
      // Should NOT contain shaming language
      expect(message.textContent?.toLowerCase()).not.toContain('broke')
      expect(message.textContent?.toLowerCase()).not.toContain('failed')
      expect(message.textContent?.toLowerCase()).not.toContain('bad')
    })

    it('shows encouragement when all parents were compliant', () => {
      mockByParent.mockReturnValue({
        byParent: [
          {
            parentUid: 'mom-uid',
            parentDisplayName: 'Mom',
            records: [
              {
                familyId: 'family-123',
                parentUid: 'mom-uid',
                deviceId: 'device-1',
                parentDisplayName: 'Mom',
                wasCompliant: true,
                offlineWindowStart: 1704067200000,
                offlineWindowEnd: 1704110400000,
                activityEvents: [],
                createdAt: Date.now(),
              },
            ],
            summary: {
              parentUid: 'mom-uid',
              totalWindows: 1,
              compliantWindows: 1,
              compliancePercentage: 100,
              lastRecordDate: Date.now(),
            },
          },
          {
            parentUid: 'dad-uid',
            parentDisplayName: 'Dad',
            records: [
              {
                familyId: 'family-123',
                parentUid: 'dad-uid',
                deviceId: 'device-2',
                parentDisplayName: 'Dad',
                wasCompliant: true,
                offlineWindowStart: 1704067200000,
                offlineWindowEnd: 1704110400000,
                activityEvents: [],
                createdAt: Date.now(),
              },
            ],
            summary: {
              parentUid: 'dad-uid',
              totalWindows: 1,
              compliantWindows: 1,
              compliancePercentage: 100,
              lastRecordDate: Date.now(),
            },
          },
        ],
        loading: false,
        error: null,
      })

      render(<ParentComplianceCard familyId="family-123" />)
      expect(screen.getByTestId('encouragement-message')).toBeInTheDocument()
      expect(screen.getByText(PARENT_COMPLIANCE_MESSAGES.greatJob)).toBeInTheDocument()
    })

    it('does not show encouragement when not all compliant', () => {
      mockByParent.mockReturnValue({
        byParent: [
          {
            parentUid: 'mom-uid',
            parentDisplayName: 'Mom',
            records: [
              {
                familyId: 'family-123',
                parentUid: 'mom-uid',
                deviceId: 'device-1',
                parentDisplayName: 'Mom',
                wasCompliant: true,
                offlineWindowStart: 1704067200000,
                offlineWindowEnd: 1704110400000,
                activityEvents: [],
                createdAt: Date.now(),
              },
            ],
            summary: {
              parentUid: 'mom-uid',
              totalWindows: 1,
              compliantWindows: 1,
              compliancePercentage: 100,
              lastRecordDate: Date.now(),
            },
          },
          {
            parentUid: 'dad-uid',
            parentDisplayName: 'Dad',
            records: [
              {
                familyId: 'family-123',
                parentUid: 'dad-uid',
                deviceId: 'device-2',
                parentDisplayName: 'Dad',
                wasCompliant: false,
                offlineWindowStart: 1704067200000,
                offlineWindowEnd: 1704110400000,
                activityEvents: [{ timestamp: 1704080000000, type: 'navigation' }],
                createdAt: Date.now(),
              },
            ],
            summary: {
              parentUid: 'dad-uid',
              totalWindows: 1,
              compliantWindows: 0,
              compliancePercentage: 0,
              lastRecordDate: Date.now(),
            },
          },
        ],
        loading: false,
        error: null,
      })

      render(<ParentComplianceCard familyId="family-123" />)
      expect(screen.queryByTestId('encouragement-message')).not.toBeInTheDocument()
    })
  })

  describe('date formatting', () => {
    it('shows "Today" for records from today', () => {
      mockByParent.mockReturnValue({
        byParent: [
          {
            parentUid: 'mom-uid',
            parentDisplayName: 'Mom',
            records: [
              {
                familyId: 'family-123',
                parentUid: 'mom-uid',
                deviceId: 'device-1',
                parentDisplayName: 'Mom',
                wasCompliant: true,
                offlineWindowStart: Date.now() - 3600000,
                offlineWindowEnd: Date.now(),
                activityEvents: [],
                createdAt: Date.now(),
              },
            ],
            summary: {
              parentUid: 'mom-uid',
              totalWindows: 1,
              compliantWindows: 1,
              compliancePercentage: 100,
              lastRecordDate: Date.now(),
            },
          },
        ],
        loading: false,
        error: null,
      })

      render(<ParentComplianceCard familyId="family-123" />)
      expect(screen.getByText('Today')).toBeInTheDocument()
    })
  })
})
