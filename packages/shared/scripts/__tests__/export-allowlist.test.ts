/**
 * Tests for Crisis Allowlist Export Script
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 7.6
 *
 * Tests the platform-specific JSON export functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Mock fs module before importing the script
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs')
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  }
})

// Import after mocking
import {
  Platform,
  ExportResult,
  getPlatformDir,
  exportForPlatform,
  exportAllPlatforms,
} from '../export-allowlist'
import { getCrisisAllowlist } from '../../src/constants/crisis-urls'

describe('Export Allowlist Script', () => {
  const mockFs = vi.mocked(fs)

  beforeEach(() => {
    vi.clearAllMocks()
    // Default: directories don't exist
    mockFs.existsSync.mockReturnValue(false)
    // Suppress console.log during tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getPlatformDir', () => {
    it('returns correct directory for web platform', () => {
      const dir = getPlatformDir('web')
      expect(dir).toContain('dist')
      expect(dir).toContain('web')
    })

    it('returns correct directory for android platform', () => {
      const dir = getPlatformDir('android')
      expect(dir).toContain('dist')
      expect(dir).toContain('android')
    })

    it('returns correct directory for ios platform', () => {
      const dir = getPlatformDir('ios')
      expect(dir).toContain('dist')
      expect(dir).toContain('ios')
    })

    it('returns correct directory for chrome-extension platform', () => {
      const dir = getPlatformDir('chrome-extension')
      expect(dir).toContain('dist')
      expect(dir).toContain('chrome-extension')
    })
  })

  describe('exportForPlatform', () => {
    it('creates directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false)

      exportForPlatform('android')

      expect(mockFs.mkdirSync).toHaveBeenCalled()
    })

    it('does not create directory if it exists', () => {
      mockFs.existsSync.mockReturnValue(true)

      exportForPlatform('android')

      expect(mockFs.mkdirSync).not.toHaveBeenCalled()
    })

    it('writes JSON file for platform', () => {
      exportForPlatform('android')

      expect(mockFs.writeFileSync).toHaveBeenCalled()
      const [outputPath, content] = mockFs.writeFileSync.mock.calls[0] as [
        string,
        string,
        string
      ]
      expect(outputPath).toContain('android')
      expect(outputPath).toContain('crisis-allowlist.json')
      expect(() => JSON.parse(content)).not.toThrow()
    })

    it('returns correct export result', () => {
      const result = exportForPlatform('ios')

      expect(result.platform).toBe('ios')
      expect(result.outputPath).toContain('ios')
      expect(result.outputPath).toContain('crisis-allowlist.json')
      expect(typeof result.version).toBe('string')
      expect(result.version.length).toBeGreaterThan(0)
      expect(result.entryCount).toBeGreaterThan(0)
    })

    it('exports valid JSON that matches bundled allowlist', () => {
      exportForPlatform('web')

      const [, content] = mockFs.writeFileSync.mock.calls[0] as [
        string,
        string,
        string
      ]
      const exported = JSON.parse(content)
      const bundled = getCrisisAllowlist()

      expect(exported.version).toBe(bundled.version)
      expect(exported.lastUpdated).toBe(bundled.lastUpdated)
      expect(exported.entries.length).toBe(bundled.entries.length)
    })

    it('exports human-readable formatted JSON', () => {
      exportForPlatform('chrome-extension')

      const [, content] = mockFs.writeFileSync.mock.calls[0] as [
        string,
        string,
        string
      ]
      // Formatted JSON has newlines and indentation
      expect(content).toContain('\n')
      expect(content).toContain('  ')
    })
  })

  describe('exportAllPlatforms', () => {
    it('exports for all four platforms', () => {
      const results = exportAllPlatforms()

      expect(results).toHaveLength(4)
      expect(results.map((r) => r.platform)).toEqual([
        'web',
        'android',
        'ios',
        'chrome-extension',
      ])
    })

    it('creates all four JSON files', () => {
      exportAllPlatforms()

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(4)
    })

    it('all exports have same version and entry count', () => {
      const results = exportAllPlatforms()

      const versions = new Set(results.map((r) => r.version))
      const counts = new Set(results.map((r) => r.entryCount))

      expect(versions.size).toBe(1)
      expect(counts.size).toBe(1)
    })
  })

  describe('Exported JSON Structure', () => {
    it('contains required top-level fields', () => {
      exportForPlatform('android')

      const [, content] = mockFs.writeFileSync.mock.calls[0] as [
        string,
        string,
        string
      ]
      const exported = JSON.parse(content)

      expect(exported).toHaveProperty('version')
      expect(exported).toHaveProperty('lastUpdated')
      expect(exported).toHaveProperty('entries')
      expect(Array.isArray(exported.entries)).toBe(true)
    })

    it('entries have required fields', () => {
      exportForPlatform('ios')

      const [, content] = mockFs.writeFileSync.mock.calls[0] as [
        string,
        string,
        string
      ]
      const exported = JSON.parse(content)

      expect(exported.entries.length).toBeGreaterThan(0)
      const entry = exported.entries[0]

      expect(entry).toHaveProperty('id')
      expect(entry).toHaveProperty('domain')
      expect(entry).toHaveProperty('category')
      expect(entry).toHaveProperty('name')
      expect(entry).toHaveProperty('description')
      expect(entry).toHaveProperty('region')
      expect(entry).toHaveProperty('contactMethods')
      expect(entry).toHaveProperty('aliases')
      expect(entry).toHaveProperty('wildcardPatterns')
    })

    it('entries have valid category values', () => {
      exportForPlatform('chrome-extension')

      const [, content] = mockFs.writeFileSync.mock.calls[0] as [
        string,
        string,
        string
      ]
      const exported = JSON.parse(content)

      const validCategories = [
        'suicide',
        'crisis',
        'mental_health',
        'substance_abuse',
        'domestic_violence',
        'child_abuse',
        'abuse',
        'eating_disorder',
        'lgbtq',
        'other',
      ]

      for (const entry of exported.entries) {
        expect(validCategories).toContain(entry.category)
      }
    })
  })
})
