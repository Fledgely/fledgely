/**
 * AgreementVersionDiff Tests - Story 34.6
 *
 * Tests for the version diff comparison component.
 * AC3: Diff view available for any two versions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgreementVersionDiff } from './AgreementVersionDiff'
import type { AgreementVersion } from '@fledgely/shared'

// Mock shared package
vi.mock('@fledgely/shared', () => ({
  HISTORY_MESSAGES: {
    diff: {
      header: 'Compare Versions',
      previous: 'Previous',
      current: 'Current',
      noChanges: 'No differences found between these versions.',
      selectVersions: 'Select two versions to compare.',
    },
  },
}))

describe('AgreementVersionDiff - Story 34.6', () => {
  const fromVersion: AgreementVersion = {
    id: 'v1',
    versionNumber: 1,
    proposerId: 'parent-1',
    proposerName: 'Mom',
    accepterId: 'parent-2',
    accepterName: 'Dad',
    changes: [],
    createdAt: new Date('2024-01-01'),
  }

  const toVersion: AgreementVersion = {
    id: 'v2',
    versionNumber: 2,
    proposerId: 'parent-2',
    proposerName: 'Dad',
    accepterId: 'parent-1',
    accepterName: 'Mom',
    changes: [
      {
        fieldPath: 'screenTime.weekday',
        fieldLabel: 'Weekday Screen Time',
        previousValue: '1 hour',
        newValue: '2 hours',
      },
      {
        fieldPath: 'bedtime.weekday',
        fieldLabel: 'Weekday Bedtime',
        previousValue: null,
        newValue: '9:00 PM',
      },
    ],
    createdAt: new Date('2024-02-01'),
  }

  const defaultProps = {
    fromVersion,
    toVersion,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render diff header (AC3)', () => {
      render(<AgreementVersionDiff {...defaultProps} />)

      expect(screen.getByText('Compare Versions')).toBeInTheDocument()
    })

    it('should show version numbers being compared', () => {
      render(<AgreementVersionDiff {...defaultProps} />)

      expect(screen.getByText(/Version 1/)).toBeInTheDocument()
      expect(screen.getByText(/Version 2/)).toBeInTheDocument()
    })

    it('should show dates for both versions', () => {
      render(<AgreementVersionDiff {...defaultProps} />)

      expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/Feb 1, 2024/)).toBeInTheDocument()
    })

    it('should display all changes (AC3)', () => {
      render(<AgreementVersionDiff {...defaultProps} />)

      expect(screen.getByText(/Weekday Screen Time/)).toBeInTheDocument()
      expect(screen.getByText(/Weekday Bedtime/)).toBeInTheDocument()
    })
  })

  describe('diff entries', () => {
    it('should show modified field with before and after values', () => {
      render(<AgreementVersionDiff {...defaultProps} />)

      expect(screen.getByText(/1 hour/)).toBeInTheDocument()
      expect(screen.getByText(/2 hours/)).toBeInTheDocument()
    })

    it('should show added field indicator', () => {
      render(<AgreementVersionDiff {...defaultProps} />)

      // Added field should show + icon
      const addedIcon = screen.getByText('+')
      expect(addedIcon).toBeInTheDocument()
    })

    it('should show modified field indicator', () => {
      render(<AgreementVersionDiff {...defaultProps} />)

      // Modified field should show ~ icon
      const modifiedIcon = screen.getByText('~')
      expect(modifiedIcon).toBeInTheDocument()
    })

    it('should show removed field indicator when present', () => {
      const versionWithRemoval: AgreementVersion = {
        ...toVersion,
        changes: [
          {
            fieldPath: 'chores.oldTask',
            fieldLabel: 'Old Chore',
            previousValue: 'Take out trash',
            newValue: null,
          },
        ],
      }

      render(<AgreementVersionDiff {...defaultProps} toVersion={versionWithRemoval} />)

      const removedIcon = screen.getByText('-')
      expect(removedIcon).toBeInTheDocument()
    })
  })

  describe('color coding', () => {
    it('should have green styling for added fields', () => {
      render(<AgreementVersionDiff {...defaultProps} />)

      // Check for green styling on added entry - the li element has the class
      const addedEntry = screen.getByText('Weekday Bedtime').closest('li')
      expect(addedEntry).toHaveClass('bg-green-50')
    })

    it('should have amber styling for modified fields', () => {
      render(<AgreementVersionDiff {...defaultProps} />)

      // Check for amber styling on modified entry - the li element has the class
      const modifiedEntry = screen.getByText('Weekday Screen Time').closest('li')
      expect(modifiedEntry).toHaveClass('bg-amber-50')
    })
  })

  describe('empty states', () => {
    it('should show message when no changes between versions', () => {
      render(<AgreementVersionDiff fromVersion={fromVersion} toVersion={fromVersion} />)

      expect(screen.getByText(/No differences found/i)).toBeInTheDocument()
    })

    it('should show select message when versions not provided', () => {
      render(<AgreementVersionDiff fromVersion={null} toVersion={null} />)

      expect(screen.getByText(/Select two versions/i)).toBeInTheDocument()
    })
  })

  describe('swap versions', () => {
    it('should provide swap button when onSwap is provided', () => {
      const onSwap = vi.fn()
      render(<AgreementVersionDiff {...defaultProps} onSwap={onSwap} />)

      const swapButton = screen.getByRole('button', { name: /swap/i })
      expect(swapButton).toBeInTheDocument()
    })

    it('should call onSwap when swap button is clicked', () => {
      const onSwap = vi.fn()
      render(<AgreementVersionDiff {...defaultProps} onSwap={onSwap} />)

      fireEvent.click(screen.getByRole('button', { name: /swap/i }))

      expect(onSwap).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have accessible structure', () => {
      render(<AgreementVersionDiff {...defaultProps} />)

      // Should have heading
      expect(screen.getByRole('heading', { name: /Compare Versions/i })).toBeInTheDocument()
    })

    it('should have list for diff entries', () => {
      render(<AgreementVersionDiff {...defaultProps} />)

      expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0)
    })
  })
})
