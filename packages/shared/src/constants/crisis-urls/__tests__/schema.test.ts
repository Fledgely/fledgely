/**
 * Crisis URL Schema Tests
 *
 * Story 7.1: Crisis Allowlist Data Structure - Task 2.6
 */

import { describe, it, expect } from 'vitest'
import {
  crisisResourceCategorySchema,
  crisisUrlEntrySchema,
  crisisAllowlistSchema,
  allowlistVersionSchema,
  parseAllowlistVersion,
  createAllowlistVersion,
  type CrisisResourceCategory,
  type CrisisUrlEntry,
} from '../schema'

describe('crisisResourceCategorySchema', () => {
  const validCategories: CrisisResourceCategory[] = [
    'suicide',
    'abuse',
    'crisis',
    'lgbtq',
    'mental_health',
    'domestic_violence',
    'child_abuse',
    'eating_disorder',
    'substance_abuse',
  ]

  it.each(validCategories)('accepts valid category: %s', (category) => {
    expect(crisisResourceCategorySchema.parse(category)).toBe(category)
  })

  it('rejects invalid category', () => {
    expect(() => crisisResourceCategorySchema.parse('invalid')).toThrow()
  })

  it('rejects empty string', () => {
    expect(() => crisisResourceCategorySchema.parse('')).toThrow()
  })
})

describe('crisisUrlEntrySchema', () => {
  const validEntry: CrisisUrlEntry = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    domain: '988lifeline.org',
    category: 'suicide',
    aliases: ['suicidepreventionlifeline.org'],
    wildcardPatterns: ['*.988lifeline.org'],
    name: '988 Suicide & Crisis Lifeline',
    description: 'Free, confidential support 24/7',
    region: 'us',
    contactMethods: ['phone', 'text', 'chat'],
    phoneNumber: '988',
    textNumber: '988',
  }

  it('accepts valid entry with all fields', () => {
    const result = crisisUrlEntrySchema.parse(validEntry)
    expect(result).toEqual(validEntry)
  })

  it('accepts minimal valid entry with defaults', () => {
    const minimalEntry = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      domain: '988lifeline.org',
      category: 'suicide',
      name: '988 Lifeline',
      description: 'Crisis support',
    }

    const result = crisisUrlEntrySchema.parse(minimalEntry)

    expect(result.aliases).toEqual([])
    expect(result.wildcardPatterns).toEqual([])
    expect(result.region).toBe('us')
    expect(result.contactMethods).toEqual(['web'])
  })

  it('rejects entry with invalid UUID', () => {
    const invalidEntry = { ...validEntry, id: 'not-a-uuid' }
    expect(() => crisisUrlEntrySchema.parse(invalidEntry)).toThrow()
  })

  it('rejects entry with empty domain', () => {
    const invalidEntry = { ...validEntry, domain: '' }
    expect(() => crisisUrlEntrySchema.parse(invalidEntry)).toThrow()
  })

  it('rejects entry with invalid category', () => {
    const invalidEntry = { ...validEntry, category: 'invalid' }
    expect(() => crisisUrlEntrySchema.parse(invalidEntry)).toThrow()
  })

  it('rejects entry with empty name', () => {
    const invalidEntry = { ...validEntry, name: '' }
    expect(() => crisisUrlEntrySchema.parse(invalidEntry)).toThrow()
  })

  it('rejects entry with empty description', () => {
    const invalidEntry = { ...validEntry, description: '' }
    expect(() => crisisUrlEntrySchema.parse(invalidEntry)).toThrow()
  })

  describe('wildcard patterns', () => {
    it('accepts valid wildcard pattern starting with *.', () => {
      const entry = {
        ...validEntry,
        wildcardPatterns: ['*.example.org', '*.sub.example.org'],
      }
      const result = crisisUrlEntrySchema.parse(entry)
      expect(result.wildcardPatterns).toEqual([
        '*.example.org',
        '*.sub.example.org',
      ])
    })

    it('rejects wildcard pattern not starting with *.', () => {
      const entry = { ...validEntry, wildcardPatterns: ['example.org'] }
      expect(() => crisisUrlEntrySchema.parse(entry)).toThrow(
        'Wildcard patterns must start with *.'
      )
    })

    it('rejects wildcard pattern with just *', () => {
      const entry = { ...validEntry, wildcardPatterns: ['*'] }
      expect(() => crisisUrlEntrySchema.parse(entry)).toThrow()
    })
  })

  describe('contact methods', () => {
    it('accepts valid contact methods', () => {
      const entry = {
        ...validEntry,
        contactMethods: ['phone', 'text', 'chat', 'web'],
      }
      const result = crisisUrlEntrySchema.parse(entry)
      expect(result.contactMethods).toEqual(['phone', 'text', 'chat', 'web'])
    })

    it('rejects invalid contact method', () => {
      const entry = { ...validEntry, contactMethods: ['email'] }
      expect(() => crisisUrlEntrySchema.parse(entry)).toThrow()
    })
  })
})

describe('allowlistVersionSchema', () => {
  it('accepts valid version format', () => {
    const validVersions = [
      '1.0.0-2025-12-16T12:00:00Z',
      '2.1.3-2024-01-01T00:00:00Z',
      '10.20.30-2030-06-15T23:59:59Z',
    ]

    validVersions.forEach((version) => {
      expect(allowlistVersionSchema.parse(version)).toBe(version)
    })
  })

  it('rejects version without timestamp', () => {
    expect(() => allowlistVersionSchema.parse('1.0.0')).toThrow()
  })

  it('rejects version with invalid timestamp format', () => {
    expect(() => allowlistVersionSchema.parse('1.0.0-2025-12-16')).toThrow()
    expect(() =>
      allowlistVersionSchema.parse('1.0.0-2025-12-16T12:00:00')
    ).toThrow()
  })

  it('rejects version with invalid semver', () => {
    expect(() =>
      allowlistVersionSchema.parse('1.0-2025-12-16T12:00:00Z')
    ).toThrow()
    expect(() =>
      allowlistVersionSchema.parse('v1.0.0-2025-12-16T12:00:00Z')
    ).toThrow()
  })
})

describe('crisisAllowlistSchema', () => {
  const validAllowlist = {
    version: '1.0.0-2025-12-16T12:00:00Z',
    lastUpdated: '2025-12-16T12:00:00Z',
    entries: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        domain: '988lifeline.org',
        category: 'suicide',
        name: '988 Lifeline',
        description: 'Crisis support',
      },
    ],
  }

  it('accepts valid allowlist', () => {
    const result = crisisAllowlistSchema.parse(validAllowlist)
    expect(result.version).toBe(validAllowlist.version)
    expect(result.entries.length).toBe(1)
  })

  it('rejects allowlist with empty entries', () => {
    const invalidAllowlist = { ...validAllowlist, entries: [] }
    expect(() => crisisAllowlistSchema.parse(invalidAllowlist)).toThrow()
  })

  it('rejects allowlist with invalid version', () => {
    const invalidAllowlist = { ...validAllowlist, version: '1.0.0' }
    expect(() => crisisAllowlistSchema.parse(invalidAllowlist)).toThrow()
  })

  it('rejects allowlist with invalid lastUpdated', () => {
    const invalidAllowlist = { ...validAllowlist, lastUpdated: 'not-a-date' }
    expect(() => crisisAllowlistSchema.parse(invalidAllowlist)).toThrow()
  })
})

describe('parseAllowlistVersion', () => {
  it('parses valid version string', () => {
    const result = parseAllowlistVersion('1.2.3-2025-12-16T12:00:00Z')

    expect(result).not.toBeNull()
    expect(result!.major).toBe(1)
    expect(result!.minor).toBe(2)
    expect(result!.patch).toBe(3)
    expect(result!.timestamp.toISOString()).toBe('2025-12-16T12:00:00.000Z')
  })

  it('returns null for invalid version', () => {
    expect(parseAllowlistVersion('invalid')).toBeNull()
    expect(parseAllowlistVersion('1.0.0')).toBeNull()
    expect(parseAllowlistVersion('')).toBeNull()
  })
})

describe('createAllowlistVersion', () => {
  it('creates valid version string', () => {
    const timestamp = new Date('2025-12-16T12:00:00Z')
    const result = createAllowlistVersion(1, 2, 3, timestamp)

    expect(result).toBe('1.2.3-2025-12-16T12:00:00Z')
    expect(allowlistVersionSchema.parse(result)).toBe(result)
  })

  it('uses current date when timestamp not provided', () => {
    const result = createAllowlistVersion(1, 0, 0)

    expect(result).toMatch(/^1\.0\.0-\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    expect(allowlistVersionSchema.parse(result)).toBe(result)
  })
})
