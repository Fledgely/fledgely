/**
 * Agreement Diff Utility Tests - Story 34.6
 *
 * Tests for computing differences between agreement versions.
 * AC3: Diff view available for any two versions
 */

import { describe, it, expect } from 'vitest'
import {
  computeVersionDiff,
  formatDiffForDisplay,
  hasChanges,
  type DiffEntry,
} from './agreementDiff'
import type { HistoryVersion } from '@fledgely/shared'

describe('Agreement Diff Utility - Story 34.6', () => {
  const baseVersion: HistoryVersion = {
    id: 'v1',
    versionNumber: 1,
    proposerId: 'parent-1',
    proposerName: 'Mom',
    accepterId: 'parent-2',
    accepterName: 'Dad',
    changes: [],
    createdAt: new Date('2024-01-01'),
  }

  const newerVersion: HistoryVersion = {
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

  describe('computeVersionDiff', () => {
    it('should compute diff between two versions', () => {
      const diff = computeVersionDiff(baseVersion, newerVersion)

      expect(diff.fromVersion).toBe(1)
      expect(diff.toVersion).toBe(2)
      expect(diff.entries).toHaveLength(2)
    })

    it('should identify modified fields', () => {
      const diff = computeVersionDiff(baseVersion, newerVersion)
      const modifiedEntry = diff.entries.find((e) => e.type === 'modified')

      expect(modifiedEntry).toBeDefined()
      expect(modifiedEntry?.fieldPath).toBe('screenTime.weekday')
      expect(modifiedEntry?.previousValue).toBe('1 hour')
      expect(modifiedEntry?.newValue).toBe('2 hours')
    })

    it('should identify added fields', () => {
      const diff = computeVersionDiff(baseVersion, newerVersion)
      const addedEntry = diff.entries.find((e) => e.type === 'added')

      expect(addedEntry).toBeDefined()
      expect(addedEntry?.fieldPath).toBe('bedtime.weekday')
      expect(addedEntry?.previousValue).toBeNull()
      expect(addedEntry?.newValue).toBe('9:00 PM')
    })

    it('should identify removed fields', () => {
      const versionWithRemoval: HistoryVersion = {
        ...newerVersion,
        changes: [
          {
            fieldPath: 'chores.oldTask',
            fieldLabel: 'Old Chore',
            previousValue: 'Take out trash',
            newValue: null,
          },
        ],
      }

      const diff = computeVersionDiff(baseVersion, versionWithRemoval)
      const removedEntry = diff.entries.find((e) => e.type === 'removed')

      expect(removedEntry).toBeDefined()
      expect(removedEntry?.previousValue).toBe('Take out trash')
      expect(removedEntry?.newValue).toBeNull()
    })

    it('should handle empty changes', () => {
      const diff = computeVersionDiff(baseVersion, baseVersion)

      expect(diff.entries).toHaveLength(0)
    })

    it('should preserve field labels', () => {
      const diff = computeVersionDiff(baseVersion, newerVersion)

      diff.entries.forEach((entry) => {
        expect(entry.fieldLabel).toBeDefined()
        expect(entry.fieldLabel.length).toBeGreaterThan(0)
      })
    })

    it('should include metadata about the diff', () => {
      const diff = computeVersionDiff(baseVersion, newerVersion)

      expect(diff.fromVersionId).toBe('v1')
      expect(diff.toVersionId).toBe('v2')
      expect(diff.fromDate).toEqual(new Date('2024-01-01'))
      expect(diff.toDate).toEqual(new Date('2024-02-01'))
    })
  })

  describe('formatDiffForDisplay', () => {
    it('should format diff entry for added field', () => {
      const entry: DiffEntry = {
        type: 'added',
        fieldPath: 'bedtime.weekday',
        fieldLabel: 'Weekday Bedtime',
        previousValue: null,
        newValue: '9:00 PM',
      }

      const formatted = formatDiffForDisplay(entry)

      expect(formatted.icon).toBe('+')
      expect(formatted.colorClass).toContain('green')
      expect(formatted.description).toContain('Weekday Bedtime')
      expect(formatted.description).toContain('9:00 PM')
    })

    it('should format diff entry for removed field', () => {
      const entry: DiffEntry = {
        type: 'removed',
        fieldPath: 'chores.oldTask',
        fieldLabel: 'Old Chore',
        previousValue: 'Take out trash',
        newValue: null,
      }

      const formatted = formatDiffForDisplay(entry)

      expect(formatted.icon).toBe('-')
      expect(formatted.colorClass).toContain('red')
      expect(formatted.description).toContain('Old Chore')
    })

    it('should format diff entry for modified field', () => {
      const entry: DiffEntry = {
        type: 'modified',
        fieldPath: 'screenTime.weekday',
        fieldLabel: 'Weekday Screen Time',
        previousValue: '1 hour',
        newValue: '2 hours',
      }

      const formatted = formatDiffForDisplay(entry)

      expect(formatted.icon).toBe('~')
      expect(formatted.colorClass).toContain('amber')
      expect(formatted.description).toContain('1 hour')
      expect(formatted.description).toContain('2 hours')
    })
  })

  describe('hasChanges', () => {
    it('should return true when diff has entries', () => {
      const diff = computeVersionDiff(baseVersion, newerVersion)
      expect(hasChanges(diff)).toBe(true)
    })

    it('should return false when diff has no entries', () => {
      const diff = computeVersionDiff(baseVersion, baseVersion)
      expect(hasChanges(diff)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle versions with same number (no changes)', () => {
      const sameVersion = { ...baseVersion }
      const diff = computeVersionDiff(baseVersion, sameVersion)

      expect(diff.entries).toHaveLength(0)
    })

    it('should handle complex nested field paths', () => {
      const versionWithNested: HistoryVersion = {
        ...newerVersion,
        changes: [
          {
            fieldPath: 'screenTime.devices.tablet.weekend',
            fieldLabel: 'Tablet Weekend Screen Time',
            previousValue: '1 hour',
            newValue: '2 hours',
          },
        ],
      }

      const diff = computeVersionDiff(baseVersion, versionWithNested)

      expect(diff.entries[0].fieldPath).toBe('screenTime.devices.tablet.weekend')
      expect(diff.entries[0].fieldLabel).toBe('Tablet Weekend Screen Time')
    })

    it('should handle empty string values', () => {
      const versionWithEmpty: HistoryVersion = {
        ...newerVersion,
        changes: [
          {
            fieldPath: 'notes.special',
            fieldLabel: 'Special Notes',
            previousValue: 'Some note',
            newValue: '',
          },
        ],
      }

      const diff = computeVersionDiff(baseVersion, versionWithEmpty)

      expect(diff.entries[0].newValue).toBe('')
      expect(diff.entries[0].type).toBe('modified')
    })
  })
})
