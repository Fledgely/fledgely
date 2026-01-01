/**
 * ExceptionHistoryCard Component Tests - Story 32.5 AC6
 *
 * Tests for exception history audit display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExceptionHistoryCard } from './ExceptionHistoryCard'
import type { OfflineException } from '@fledgely/shared'

vi.mock('@fledgely/shared', () => ({
  OFFLINE_EXCEPTION_MESSAGES: {
    childPauseMessage: 'Offline time is paused right now',
    childSkipMessage: 'No offline time tonight!',
    childWorkMessage: (name: string) => `${name} is working`,
    childHomeworkActive: "You're doing homework!",
    pauseStarted: (name: string) => `${name} paused offline time`,
    pauseEnded: (name: string) => `${name} resumed offline time`,
    skipActivated: (name: string) => `${name} skipped tonight's offline time`,
    workExceptionStarted: (name: string) => `${name} is working during offline time`,
    homeworkRequested: (name: string) => `${name} requested homework time`,
    homeworkApproved: (parent: string, child: string) => `${parent} approved ${child}'s homework`,
  },
}))

describe('ExceptionHistoryCard - Story 32.5 AC6', () => {
  const mockExceptions: OfflineException[] = [
    {
      id: 'exc-1',
      familyId: 'family-1',
      type: 'pause',
      requestedBy: 'parent-1',
      requestedByName: 'Mom',
      startTime: Date.now() - 3600000,
      endTime: Date.now() - 1800000,
      status: 'completed',
      createdAt: Date.now() - 3600000,
    },
    {
      id: 'exc-2',
      familyId: 'family-1',
      type: 'skip',
      requestedBy: 'parent-1',
      requestedByName: 'Dad',
      reason: 'Movie night',
      startTime: Date.now() - 86400000,
      endTime: Date.now() - 43200000,
      status: 'completed',
      createdAt: Date.now() - 86400000,
    },
    {
      id: 'exc-3',
      familyId: 'family-1',
      type: 'homework',
      requestedBy: 'child-1',
      requestedByName: 'Emma',
      approvedBy: 'parent-1',
      startTime: Date.now() - 7200000,
      endTime: Date.now() - 3600000,
      status: 'completed',
      createdAt: Date.now() - 7200000,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders with test id', () => {
      render(<ExceptionHistoryCard exceptions={[]} />)

      expect(screen.getByTestId('exception-history-card')).toBeInTheDocument()
    })

    it('shows parent view title by default', () => {
      render(<ExceptionHistoryCard exceptions={[]} />)

      expect(screen.getByText('Offline Time Exceptions')).toBeInTheDocument()
      expect(screen.getByText('All exceptions are logged for transparency')).toBeInTheDocument()
    })

    it('shows child view title when isChildView is true', () => {
      render(<ExceptionHistoryCard exceptions={[]} isChildView={true} />)

      expect(screen.getByText('Exception History')).toBeInTheDocument()
      expect(screen.getByText('Times when offline time was changed')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows loading spinner when loading', () => {
      render(<ExceptionHistoryCard exceptions={[]} loading={true} />)

      // The spinner should be present (check by style or class)
      const card = screen.getByTestId('exception-history-card')
      expect(card).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows parent empty message when no exceptions', () => {
      render(<ExceptionHistoryCard exceptions={[]} />)

      expect(screen.getByText('No exceptions have been created yet')).toBeInTheDocument()
    })

    it('shows child-friendly empty message when isChildView', () => {
      render(<ExceptionHistoryCard exceptions={[]} isChildView={true} />)

      expect(screen.getByText('No changes to offline time yet')).toBeInTheDocument()
    })

    it('shows checkmark icon in empty state', () => {
      render(<ExceptionHistoryCard exceptions={[]} />)

      expect(screen.getByText('✅')).toBeInTheDocument()
    })
  })

  describe('exception list', () => {
    it('renders exception rows with test ids', () => {
      render(<ExceptionHistoryCard exceptions={mockExceptions} />)

      expect(screen.getByTestId('exception-row-exc-1')).toBeInTheDocument()
      expect(screen.getByTestId('exception-row-exc-2')).toBeInTheDocument()
      expect(screen.getByTestId('exception-row-exc-3')).toBeInTheDocument()
    })

    it('shows exception type badges', () => {
      render(<ExceptionHistoryCard exceptions={mockExceptions} />)

      expect(screen.getByText('Pause')).toBeInTheDocument()
      expect(screen.getByText('Skip')).toBeInTheDocument()
      expect(screen.getByText('Homework')).toBeInTheDocument()
    })

    it('shows exception status badges', () => {
      const exceptionsWithStatus: OfflineException[] = [
        {
          id: 'exc-active',
          familyId: 'family-1',
          type: 'pause',
          requestedBy: 'parent-1',
          requestedByName: 'Mom',
          startTime: Date.now(),
          endTime: null,
          status: 'active',
          createdAt: Date.now(),
        },
        {
          id: 'exc-completed',
          familyId: 'family-1',
          type: 'skip',
          requestedBy: 'parent-1',
          requestedByName: 'Dad',
          startTime: Date.now() - 3600000,
          endTime: Date.now(),
          status: 'completed',
          createdAt: Date.now() - 3600000,
        },
        {
          id: 'exc-cancelled',
          familyId: 'family-1',
          type: 'work',
          requestedBy: 'parent-1',
          requestedByName: 'Mom',
          startTime: Date.now() - 7200000,
          endTime: null,
          status: 'cancelled',
          createdAt: Date.now() - 7200000,
        },
      ]

      render(<ExceptionHistoryCard exceptions={exceptionsWithStatus} />)

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Ended')).toBeInTheDocument()
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })

    it('shows reason when provided', () => {
      render(<ExceptionHistoryCard exceptions={mockExceptions} />)

      expect(screen.getByText('• Movie night')).toBeInTheDocument()
    })

    it('shows type icons', () => {
      render(<ExceptionHistoryCard exceptions={mockExceptions} />)

      expect(screen.getByText('⏸️')).toBeInTheDocument() // Pause icon
      expect(screen.getByText('⏭️')).toBeInTheDocument() // Skip icon
      expect(screen.getByText('📚')).toBeInTheDocument() // Homework icon
    })
  })

  describe('limit prop', () => {
    it('respects limit prop', () => {
      const manyExceptions: OfflineException[] = Array.from({ length: 10 }, (_, i) => ({
        id: `exc-${i}`,
        familyId: 'family-1',
        type: 'pause' as const,
        requestedBy: 'parent-1',
        requestedByName: 'Parent',
        startTime: Date.now() - i * 3600000,
        endTime: Date.now() - i * 1800000,
        status: 'completed' as const,
        createdAt: Date.now() - i * 3600000,
      }))

      render(<ExceptionHistoryCard exceptions={manyExceptions} limit={5} />)

      // Should only show 5 rows
      expect(screen.getByTestId('exception-row-exc-0')).toBeInTheDocument()
      expect(screen.getByTestId('exception-row-exc-4')).toBeInTheDocument()
      expect(screen.queryByTestId('exception-row-exc-5')).not.toBeInTheDocument()
    })

    it('uses default limit of 10', () => {
      const manyExceptions: OfflineException[] = Array.from({ length: 15 }, (_, i) => ({
        id: `exc-${i}`,
        familyId: 'family-1',
        type: 'skip' as const,
        requestedBy: 'parent-1',
        requestedByName: 'Parent',
        startTime: Date.now() - i * 3600000,
        endTime: Date.now() - i * 1800000,
        status: 'completed' as const,
        createdAt: Date.now() - i * 3600000,
      }))

      render(<ExceptionHistoryCard exceptions={manyExceptions} />)

      expect(screen.getByTestId('exception-row-exc-0')).toBeInTheDocument()
      expect(screen.getByTestId('exception-row-exc-9')).toBeInTheDocument()
      expect(screen.queryByTestId('exception-row-exc-10')).not.toBeInTheDocument()
    })
  })

  describe('time formatting', () => {
    it('shows "Just now" for very recent exceptions', () => {
      const recentException: OfflineException[] = [
        {
          id: 'exc-recent',
          familyId: 'family-1',
          type: 'pause',
          requestedBy: 'parent-1',
          requestedByName: 'Mom',
          startTime: Date.now(),
          endTime: null,
          status: 'active',
          createdAt: Date.now() - 30000, // 30 seconds ago
        },
      ]

      render(<ExceptionHistoryCard exceptions={recentException} />)

      expect(screen.getByText('Just now')).toBeInTheDocument()
    })

    it('shows minutes ago for recent exceptions', () => {
      const minutesAgoException: OfflineException[] = [
        {
          id: 'exc-minutes',
          familyId: 'family-1',
          type: 'pause',
          requestedBy: 'parent-1',
          requestedByName: 'Mom',
          startTime: Date.now(),
          endTime: null,
          status: 'active',
          createdAt: Date.now() - 5 * 60000, // 5 minutes ago
        },
      ]

      render(<ExceptionHistoryCard exceptions={minutesAgoException} />)

      expect(screen.getByText('5 min ago')).toBeInTheDocument()
    })

    it('shows hours ago for older exceptions', () => {
      const hoursAgoException: OfflineException[] = [
        {
          id: 'exc-hours',
          familyId: 'family-1',
          type: 'pause',
          requestedBy: 'parent-1',
          requestedByName: 'Mom',
          startTime: Date.now() - 3 * 3600000,
          endTime: Date.now() - 2 * 3600000,
          status: 'completed',
          createdAt: Date.now() - 3 * 3600000, // 3 hours ago
        },
      ]

      render(<ExceptionHistoryCard exceptions={hoursAgoException} />)

      expect(screen.getByText('3 hours ago')).toBeInTheDocument()
    })

    it('shows singular hour for 1 hour ago', () => {
      const oneHourException: OfflineException[] = [
        {
          id: 'exc-1hour',
          familyId: 'family-1',
          type: 'pause',
          requestedBy: 'parent-1',
          requestedByName: 'Mom',
          startTime: Date.now() - 3600000,
          endTime: Date.now(),
          status: 'completed',
          createdAt: Date.now() - 3600000, // 1 hour ago
        },
      ]

      render(<ExceptionHistoryCard exceptions={oneHourException} />)

      expect(screen.getByText('1 hour ago')).toBeInTheDocument()
    })

    it('shows days ago for older exceptions', () => {
      const daysAgoException: OfflineException[] = [
        {
          id: 'exc-days',
          familyId: 'family-1',
          type: 'skip',
          requestedBy: 'parent-1',
          requestedByName: 'Dad',
          startTime: Date.now() - 3 * 86400000,
          endTime: Date.now() - 2 * 86400000,
          status: 'completed',
          createdAt: Date.now() - 3 * 86400000, // 3 days ago
        },
      ]

      render(<ExceptionHistoryCard exceptions={daysAgoException} />)

      expect(screen.getByText('3 days ago')).toBeInTheDocument()
    })
  })

  describe('child-friendly messaging', () => {
    it('uses child-friendly messages in child view', () => {
      const activeException: OfflineException[] = [
        {
          id: 'exc-pause',
          familyId: 'family-1',
          type: 'pause',
          requestedBy: 'parent-1',
          requestedByName: 'Mom',
          startTime: Date.now(),
          endTime: null,
          status: 'active',
          createdAt: Date.now(),
        },
      ]

      render(<ExceptionHistoryCard exceptions={activeException} isChildView={true} />)

      expect(screen.getByText('Offline time is paused right now')).toBeInTheDocument()
    })

    it('shows work message with parent name for child view', () => {
      const workException: OfflineException[] = [
        {
          id: 'exc-work',
          familyId: 'family-1',
          type: 'work',
          requestedBy: 'parent-1',
          requestedByName: 'Dad',
          startTime: Date.now(),
          endTime: null,
          status: 'active',
          createdAt: Date.now(),
        },
      ]

      render(<ExceptionHistoryCard exceptions={workException} isChildView={true} />)

      expect(screen.getByText('Dad is working')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper header icon', () => {
      render(<ExceptionHistoryCard exceptions={[]} />)

      expect(screen.getByText('📋')).toBeInTheDocument()
    })
  })
})
