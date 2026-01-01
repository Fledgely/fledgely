/**
 * Agreement Export Service Tests - Story 34.6
 *
 * Tests for exporting agreement history to various formats.
 * AC6: Export available for records
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  exportHistoryAsJson,
  exportHistoryAsText,
  formatVersionForText,
  downloadExport,
  ExportFormat,
} from './agreementExportService'
import type { AgreementVersion } from '@fledgely/shared'

// Mock Blob and URL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
})

describe('Agreement Export Service - Story 34.6', () => {
  const mockVersions: AgreementVersion[] = [
    {
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
      ],
      createdAt: new Date('2024-02-01'),
    },
    {
      id: 'v1',
      versionNumber: 1,
      proposerId: 'parent-1',
      proposerName: 'Mom',
      accepterId: 'parent-2',
      accepterName: 'Dad',
      changes: [],
      createdAt: new Date('2024-01-01'),
      note: 'Initial agreement',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportHistoryAsJson', () => {
    it('should export versions as JSON string', () => {
      const result = exportHistoryAsJson(mockVersions, 'Test Family')

      const parsed = JSON.parse(result)
      expect(parsed.familyName).toBe('Test Family')
      expect(parsed.versions).toHaveLength(2)
    })

    it('should include export metadata', () => {
      const result = exportHistoryAsJson(mockVersions, 'Test Family')

      const parsed = JSON.parse(result)
      expect(parsed.exportedAt).toBeDefined()
      expect(parsed.totalVersions).toBe(2)
      expect(parsed.totalUpdates).toBe(1)
    })

    it('should include all version details', () => {
      const result = exportHistoryAsJson(mockVersions, 'Test Family')

      const parsed = JSON.parse(result)
      const version2 = parsed.versions[0]

      expect(version2.versionNumber).toBe(2)
      expect(version2.proposerName).toBe('Dad')
      expect(version2.accepterName).toBe('Mom')
      expect(version2.changes).toHaveLength(1)
    })

    it('should format dates as ISO strings', () => {
      const result = exportHistoryAsJson(mockVersions, 'Test Family')

      const parsed = JSON.parse(result)
      expect(parsed.versions[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/)
    })

    it('should handle empty versions array', () => {
      const result = exportHistoryAsJson([], 'Test Family')

      const parsed = JSON.parse(result)
      expect(parsed.versions).toHaveLength(0)
      expect(parsed.totalVersions).toBe(0)
    })
  })

  describe('exportHistoryAsText', () => {
    it('should export versions as readable text', () => {
      const result = exportHistoryAsText(mockVersions, 'Test Family')

      expect(result).toContain('Test Family')
      expect(result).toContain('Agreement History')
    })

    it('should include version headers', () => {
      const result = exportHistoryAsText(mockVersions, 'Test Family')

      expect(result).toContain('Version 2')
      expect(result).toContain('Version 1')
    })

    it('should include proposer and accepter info', () => {
      const result = exportHistoryAsText(mockVersions, 'Test Family')

      expect(result).toContain('Dad')
      expect(result).toContain('Mom')
      expect(result).toContain('Proposed by')
      expect(result).toContain('Accepted by')
    })

    it('should include changes', () => {
      const result = exportHistoryAsText(mockVersions, 'Test Family')

      expect(result).toContain('Weekday Screen Time')
      expect(result).toContain('1 hour')
      expect(result).toContain('2 hours')
    })

    it('should include version notes', () => {
      const result = exportHistoryAsText(mockVersions, 'Test Family')

      expect(result).toContain('Initial agreement')
    })

    it('should include dates', () => {
      const result = exportHistoryAsText(mockVersions, 'Test Family')

      expect(result).toContain('2024')
    })

    it('should handle empty versions array', () => {
      const result = exportHistoryAsText([], 'Test Family')

      expect(result).toContain('Test Family')
      expect(result).toContain('No versions')
    })
  })

  describe('formatVersionForText', () => {
    it('should format a single version for text output', () => {
      const result = formatVersionForText(mockVersions[0])

      expect(result).toContain('Version 2')
      expect(result).toContain('Dad')
      expect(result).toContain('Mom')
    })

    it('should format changes with arrows', () => {
      const result = formatVersionForText(mockVersions[0])

      expect(result).toContain('→')
    })

    it('should handle version with no changes', () => {
      const result = formatVersionForText(mockVersions[1])

      expect(result).toContain('Version 1')
      expect(result).toContain('Initial version')
    })
  })

  describe('downloadExport', () => {
    it('should create a download link for JSON', () => {
      const mockClick = vi.fn()
      const mockLink = {
        href: '',
        download: '',
        click: mockClick,
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement)

      downloadExport(mockVersions, 'Test Family', 'json')

      expect(mockLink.download).toContain('agreement-history')
      expect(mockLink.download).toContain('.json')
      expect(mockClick).toHaveBeenCalled()
    })

    it('should create a download link for text', () => {
      const mockClick = vi.fn()
      const mockLink = {
        href: '',
        download: '',
        click: mockClick,
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement)

      downloadExport(mockVersions, 'Test Family', 'text')

      expect(mockLink.download).toContain('agreement-history')
      expect(mockLink.download).toContain('.txt')
      expect(mockClick).toHaveBeenCalled()
    })

    it('should clean up blob URL after download', () => {
      const mockClick = vi.fn()
      const mockLink = {
        href: '',
        download: '',
        click: mockClick,
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement)

      downloadExport(mockVersions, 'Test Family', 'json')

      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })
  })

  describe('ExportFormat', () => {
    it('should have json format', () => {
      const format: ExportFormat = 'json'
      expect(format).toBe('json')
    })

    it('should have text format', () => {
      const format: ExportFormat = 'text'
      expect(format).toBe('text')
    })
  })
})
