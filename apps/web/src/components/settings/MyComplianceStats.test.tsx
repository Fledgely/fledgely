/**
 * MyComplianceStats Tests - Story 32.4
 *
 * Tests for parent self-view compliance display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComplianceStats } from './MyComplianceStats'
import { PARENT_COMPLIANCE_MESSAGES } from '@fledgely/shared'

// Mock the hook
const mockUseParentCompliance = vi.fn()
vi.mock('../../hooks/useParentCompliance', () => ({
  useParentCompliance: () => mockUseParentCompliance(),
}))

describe('MyComplianceStats - Story 32.4', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParentCompliance.mockReturnValue({
      records: [],
      summary: null,
      loading: false,
      error: null,
      getDisplayMessage: vi.fn(),
      messages: PARENT_COMPLIANCE_MESSAGES,
    })
  })

  describe('rendering states', () => {
    it('returns null when familyId is not provided', () => {
      const { container } = render(<MyComplianceStats familyId={null} parentUid="parent-123" />)
      expect(container.firstChild).toBeNull()
    })

    it('returns null when parentUid is not provided', () => {
      const { container } = render(<MyComplianceStats familyId="family-123" parentUid={null} />)
      expect(container.firstChild).toBeNull()
    })

    it('shows loading state', () => {
      mockUseParentCompliance.mockReturnValue({
        records: [],
        summary: null,
        loading: true,
        error: null,
        getDisplayMessage: vi.fn(),
        messages: PARENT_COMPLIANCE_MESSAGES,
      })

      render(<MyComplianceStats familyId="family-123" parentUid="parent-123" />)
      expect(screen.getByTestId('my-compliance-stats-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('returns null on error', () => {
      mockUseParentCompliance.mockReturnValue({
        records: [],
        summary: null,
        loading: false,
        error: 'Failed to load',
        getDisplayMessage: vi.fn(),
        messages: PARENT_COMPLIANCE_MESSAGES,
      })

      const { container } = render(
        <MyComplianceStats familyId="family-123" parentUid="parent-123" />
      )
      expect(container.firstChild).toBeNull()
    })

    it('shows empty state when no records', () => {
      mockUseParentCompliance.mockReturnValue({
        records: [],
        summary: {
          parentUid: 'parent-123',
          totalWindows: 0,
          compliantWindows: 0,
          compliancePercentage: 0,
          lastRecordDate: null,
        },
        loading: false,
        error: null,
        getDisplayMessage: vi.fn(),
        messages: PARENT_COMPLIANCE_MESSAGES,
      })

      render(<MyComplianceStats familyId="family-123" parentUid="parent-123" />)
      expect(screen.getByTestId('my-compliance-stats-empty')).toBeInTheDocument()
      expect(screen.getByText('No offline time recorded yet')).toBeInTheDocument()
    })
  })

  describe('AC3: Parent Self-View', () => {
    it('displays compliance percentage', () => {
      mockUseParentCompliance.mockReturnValue({
        records: [],
        summary: {
          parentUid: 'parent-123',
          totalWindows: 10,
          compliantWindows: 8,
          compliancePercentage: 80,
          lastRecordDate: Date.now(),
        },
        loading: false,
        error: null,
        getDisplayMessage: vi.fn(),
        messages: PARENT_COMPLIANCE_MESSAGES,
      })

      render(<MyComplianceStats familyId="family-123" parentUid="parent-123" />)
      expect(screen.getByTestId('compliance-percentage')).toHaveTextContent('80%')
    })

    it('displays window count', () => {
      mockUseParentCompliance.mockReturnValue({
        records: [],
        summary: {
          parentUid: 'parent-123',
          totalWindows: 10,
          compliantWindows: 8,
          compliancePercentage: 80,
          lastRecordDate: Date.now(),
        },
        loading: false,
        error: null,
        getDisplayMessage: vi.fn(),
        messages: PARENT_COMPLIANCE_MESSAGES,
      })

      render(<MyComplianceStats familyId="family-123" parentUid="parent-123" />)
      expect(screen.getByTestId('window-count')).toHaveTextContent('8/10')
    })

    it('displays progress bar', () => {
      mockUseParentCompliance.mockReturnValue({
        records: [],
        summary: {
          parentUid: 'parent-123',
          totalWindows: 10,
          compliantWindows: 8,
          compliancePercentage: 80,
          lastRecordDate: Date.now(),
        },
        loading: false,
        error: null,
        getDisplayMessage: vi.fn(),
        messages: PARENT_COMPLIANCE_MESSAGES,
      })

      render(<MyComplianceStats familyId="family-123" parentUid="parent-123" />)
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '80')
    })
  })

  describe('AC4: Transparency Without Shaming - encouragement', () => {
    it('shows greatJob message for 90%+ compliance', () => {
      mockUseParentCompliance.mockReturnValue({
        records: [],
        summary: {
          parentUid: 'parent-123',
          totalWindows: 10,
          compliantWindows: 9,
          compliancePercentage: 90,
          lastRecordDate: Date.now(),
        },
        loading: false,
        error: null,
        getDisplayMessage: vi.fn(),
        messages: PARENT_COMPLIANCE_MESSAGES,
      })

      render(<MyComplianceStats familyId="family-123" parentUid="parent-123" />)
      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        PARENT_COMPLIANCE_MESSAGES.greatJob
      )
    })

    it('shows progress message for 70%+ compliance', () => {
      mockUseParentCompliance.mockReturnValue({
        records: [],
        summary: {
          parentUid: 'parent-123',
          totalWindows: 10,
          compliantWindows: 7,
          compliancePercentage: 70,
          lastRecordDate: Date.now(),
        },
        loading: false,
        error: null,
        getDisplayMessage: vi.fn(),
        messages: PARENT_COMPLIANCE_MESSAGES,
      })

      render(<MyComplianceStats familyId="family-123" parentUid="parent-123" />)
      expect(screen.getByTestId('encouragement-message')).toHaveTextContent('Good progress')
    })

    it('shows encouragement message for 50%+ compliance', () => {
      mockUseParentCompliance.mockReturnValue({
        records: [],
        summary: {
          parentUid: 'parent-123',
          totalWindows: 10,
          compliantWindows: 5,
          compliancePercentage: 50,
          lastRecordDate: Date.now(),
        },
        loading: false,
        error: null,
        getDisplayMessage: vi.fn(),
        messages: PARENT_COMPLIANCE_MESSAGES,
      })

      render(<MyComplianceStats familyId="family-123" parentUid="parent-123" />)
      expect(screen.getByTestId('encouragement-message')).toHaveTextContent(
        PARENT_COMPLIANCE_MESSAGES.encouragement
      )
    })

    it('shows supportive message for low compliance', () => {
      mockUseParentCompliance.mockReturnValue({
        records: [],
        summary: {
          parentUid: 'parent-123',
          totalWindows: 10,
          compliantWindows: 3,
          compliancePercentage: 30,
          lastRecordDate: Date.now(),
        },
        loading: false,
        error: null,
        getDisplayMessage: vi.fn(),
        messages: PARENT_COMPLIANCE_MESSAGES,
      })

      render(<MyComplianceStats familyId="family-123" parentUid="parent-123" />)
      expect(screen.getByTestId('encouragement-message')).toHaveTextContent('every effort counts')
    })

    it('never uses shaming language', () => {
      mockUseParentCompliance.mockReturnValue({
        records: [],
        summary: {
          parentUid: 'parent-123',
          totalWindows: 10,
          compliantWindows: 0,
          compliancePercentage: 0,
          lastRecordDate: Date.now(),
        },
        loading: false,
        error: null,
        getDisplayMessage: vi.fn(),
        messages: PARENT_COMPLIANCE_MESSAGES,
      })

      render(<MyComplianceStats familyId="family-123" parentUid="parent-123" />)
      const message = screen.getByTestId('encouragement-message')
      // Should NOT contain shaming language
      expect(message.textContent?.toLowerCase()).not.toContain('bad')
      expect(message.textContent?.toLowerCase()).not.toContain('failed')
      expect(message.textContent?.toLowerCase()).not.toContain('poor')
      expect(message.textContent?.toLowerCase()).not.toContain('disappointing')
    })
  })
})
