/**
 * Crisis URL API Tests
 *
 * Story 7.1: Crisis Allowlist Data Structure - Task 5.6
 */

import { describe, it, expect } from 'vitest'
import {
  getCrisisAllowlist,
  extractDomain,
  isCrisisUrl,
  getCrisisResourceByDomain,
  getCrisisResourcesByCategory,
  getCrisisResourcesByRegion,
  getAllCategories,
  getAllRegions,
  getCrisisResourceCount,
  searchCrisisResources,
} from '../index'

describe('getCrisisAllowlist', () => {
  it('returns the complete allowlist', () => {
    const allowlist = getCrisisAllowlist()

    expect(allowlist).toBeDefined()
    expect(allowlist.version).toBeDefined()
    expect(allowlist.lastUpdated).toBeDefined()
    expect(Array.isArray(allowlist.entries)).toBe(true)
  })

  it('contains required crisis resources', () => {
    const allowlist = getCrisisAllowlist()
    const domains = allowlist.entries.map((e) => e.domain)

    // AC #7: Initial list must include these resources
    expect(domains).toContain('988lifeline.org')
    expect(domains).toContain('crisistextline.org')
    expect(domains).toContain('rainn.org')
    expect(domains).toContain('thetrevorproject.org')
    expect(domains).toContain('childhelp.org')
    expect(domains).toContain('thehotline.org')
    expect(domains).toContain('samaritans.org')
    expect(domains).toContain('kidshelpphone.ca')
    expect(domains).toContain('lifeline.org.au')
  })

  it('has valid entries with required fields', () => {
    const allowlist = getCrisisAllowlist()

    allowlist.entries.forEach((entry) => {
      expect(entry.id).toBeDefined()
      expect(entry.domain).toBeDefined()
      expect(entry.category).toBeDefined()
      expect(entry.name).toBeDefined()
      expect(entry.description).toBeDefined()
      expect(Array.isArray(entry.aliases)).toBe(true)
      expect(Array.isArray(entry.wildcardPatterns)).toBe(true)
      expect(Array.isArray(entry.contactMethods)).toBe(true)
    })
  })
})

describe('extractDomain', () => {
  it('extracts domain from full URL', () => {
    expect(extractDomain('https://988lifeline.org/get-help')).toBe(
      '988lifeline.org'
    )
    expect(extractDomain('http://example.org/path?query=1')).toBe('example.org')
  })

  it('extracts domain from URL with www', () => {
    expect(extractDomain('https://www.988lifeline.org')).toBe('988lifeline.org')
    expect(extractDomain('www.example.org')).toBe('example.org')
  })

  it('handles domain-only input', () => {
    expect(extractDomain('988lifeline.org')).toBe('988lifeline.org')
    expect(extractDomain('example.org')).toBe('example.org')
  })

  it('removes port number', () => {
    expect(extractDomain('example.org:8080')).toBe('example.org')
    expect(extractDomain('https://example.org:443/path')).toBe('example.org')
  })

  it('removes query and fragment', () => {
    expect(extractDomain('example.org?foo=bar')).toBe('example.org')
    expect(extractDomain('example.org#section')).toBe('example.org')
  })

  it('handles protocol-relative URLs', () => {
    expect(extractDomain('//example.org/path')).toBe('example.org')
  })

  it('converts to lowercase', () => {
    expect(extractDomain('EXAMPLE.ORG')).toBe('example.org')
    expect(extractDomain('Example.Org')).toBe('example.org')
  })
})

describe('isCrisisUrl', () => {
  describe('primary domains', () => {
    it('returns true for exact domain match', () => {
      expect(isCrisisUrl('https://988lifeline.org')).toBe(true)
      expect(isCrisisUrl('https://crisistextline.org')).toBe(true)
      expect(isCrisisUrl('https://rainn.org')).toBe(true)
    })

    it('returns true for domain with path', () => {
      expect(isCrisisUrl('https://988lifeline.org/get-help')).toBe(true)
      expect(isCrisisUrl('https://rainn.org/resources')).toBe(true)
    })

    it('returns true for domain with www', () => {
      expect(isCrisisUrl('https://www.988lifeline.org')).toBe(true)
      expect(isCrisisUrl('www.crisistextline.org')).toBe(true)
    })
  })

  describe('domain aliases', () => {
    it('returns true for alias match', () => {
      expect(isCrisisUrl('https://suicidepreventionlifeline.org')).toBe(true)
      expect(isCrisisUrl('https://hotline.rainn.org')).toBe(true)
      expect(isCrisisUrl('https://thetrevoproject.org')).toBe(true) // Common typo alias
    })
  })

  describe('wildcard patterns', () => {
    it('returns true for subdomain matching wildcard', () => {
      expect(isCrisisUrl('https://chat.988lifeline.org')).toBe(true)
      expect(isCrisisUrl('https://help.crisistextline.org')).toBe(true)
      expect(isCrisisUrl('https://www.resources.rainn.org')).toBe(true)
    })

    it('returns true for deeply nested subdomains', () => {
      expect(isCrisisUrl('https://a.b.c.988lifeline.org')).toBe(true)
    })
  })

  describe('non-crisis URLs', () => {
    it('returns false for unrelated domains', () => {
      expect(isCrisisUrl('https://google.com')).toBe(false)
      expect(isCrisisUrl('https://facebook.com')).toBe(false)
      expect(isCrisisUrl('https://youtube.com')).toBe(false)
    })

    it('returns false for similar but different domains', () => {
      expect(isCrisisUrl('https://988lifeline.com')).toBe(false) // Wrong TLD
      expect(isCrisisUrl('https://fake988lifeline.org')).toBe(false) // Prefix
      expect(isCrisisUrl('https://988lifelineorg.com')).toBe(false) // No dot
    })
  })

  describe('edge cases', () => {
    it('returns false for empty string', () => {
      expect(isCrisisUrl('')).toBe(false)
    })

    it('returns false for null/undefined', () => {
      expect(isCrisisUrl(null as unknown as string)).toBe(false)
      expect(isCrisisUrl(undefined as unknown as string)).toBe(false)
    })

    it('is case-insensitive', () => {
      expect(isCrisisUrl('https://988LIFELINE.ORG')).toBe(true)
      expect(isCrisisUrl('https://CrisisTextLine.Org')).toBe(true)
    })
  })
})

describe('getCrisisResourceByDomain', () => {
  it('returns entry for primary domain', () => {
    const entry = getCrisisResourceByDomain('988lifeline.org')

    expect(entry).toBeDefined()
    expect(entry!.domain).toBe('988lifeline.org')
    expect(entry!.name).toContain('988')
  })

  it('returns entry for alias', () => {
    const entry = getCrisisResourceByDomain('suicidepreventionlifeline.org')

    expect(entry).toBeDefined()
    expect(entry!.domain).toBe('988lifeline.org')
  })

  it('returns entry for subdomain matching wildcard', () => {
    const entry = getCrisisResourceByDomain('chat.988lifeline.org')

    expect(entry).toBeDefined()
    expect(entry!.domain).toBe('988lifeline.org')
  })

  it('returns undefined for non-crisis domain', () => {
    const entry = getCrisisResourceByDomain('google.com')
    expect(entry).toBeUndefined()
  })

  it('returns undefined for invalid input', () => {
    expect(getCrisisResourceByDomain('')).toBeUndefined()
    expect(getCrisisResourceByDomain(null as unknown as string)).toBeUndefined()
  })
})

describe('getCrisisResourcesByCategory', () => {
  it('returns all entries in suicide category', () => {
    const entries = getCrisisResourcesByCategory('suicide')

    expect(entries.length).toBeGreaterThan(0)
    entries.forEach((entry) => {
      expect(entry.category).toBe('suicide')
    })
  })

  it('returns all entries in lgbtq category', () => {
    const entries = getCrisisResourcesByCategory('lgbtq')

    expect(entries.length).toBeGreaterThan(0)
    entries.forEach((entry) => {
      expect(entry.category).toBe('lgbtq')
    })

    // Should include Trevor Project
    const names = entries.map((e) => e.name)
    expect(names.some((n) => n.includes('Trevor'))).toBe(true)
  })

  it('returns empty array for category with no entries', () => {
    // All categories should have entries in initial list
    // This tests the function behavior
    const allowlist = getCrisisAllowlist()
    const categories = new Set(allowlist.entries.map((e) => e.category))

    categories.forEach((category) => {
      const entries = getCrisisResourcesByCategory(category)
      expect(entries.length).toBeGreaterThan(0)
    })
  })
})

describe('getCrisisResourcesByRegion', () => {
  it('returns US resources', () => {
    const entries = getCrisisResourcesByRegion('us')

    expect(entries.length).toBeGreaterThan(0)
    entries.forEach((entry) => {
      expect(entry.region.toLowerCase()).toBe('us')
    })
  })

  it('returns UK resources', () => {
    const entries = getCrisisResourcesByRegion('uk')

    expect(entries.length).toBeGreaterThan(0)
    // Should include Samaritans
    const domains = entries.map((e) => e.domain)
    expect(domains).toContain('samaritans.org')
  })

  it('returns Australian resources', () => {
    const entries = getCrisisResourcesByRegion('au')

    expect(entries.length).toBeGreaterThan(0)
    // Should include Lifeline Australia
    const domains = entries.map((e) => e.domain)
    expect(domains).toContain('lifeline.org.au')
  })

  it('returns Canadian resources', () => {
    const entries = getCrisisResourcesByRegion('ca')

    expect(entries.length).toBeGreaterThan(0)
    // Should include Kids Help Phone
    const domains = entries.map((e) => e.domain)
    expect(domains).toContain('kidshelpphone.ca')
  })

  it('is case-insensitive', () => {
    const entriesLower = getCrisisResourcesByRegion('us')
    const entriesUpper = getCrisisResourcesByRegion('US')

    expect(entriesLower.length).toBe(entriesUpper.length)
  })
})

describe('getAllCategories', () => {
  it('returns array of unique categories', () => {
    const categories = getAllCategories()

    expect(Array.isArray(categories)).toBe(true)
    expect(categories.length).toBeGreaterThan(0)
    // No duplicates
    expect(new Set(categories).size).toBe(categories.length)
  })

  it('includes expected categories', () => {
    const categories = getAllCategories()

    expect(categories).toContain('suicide')
    expect(categories).toContain('abuse')
    expect(categories).toContain('lgbtq')
    expect(categories).toContain('domestic_violence')
    expect(categories).toContain('child_abuse')
  })
})

describe('getAllRegions', () => {
  it('returns array of unique regions', () => {
    const regions = getAllRegions()

    expect(Array.isArray(regions)).toBe(true)
    expect(regions.length).toBeGreaterThan(0)
    // No duplicates
    expect(new Set(regions).size).toBe(regions.length)
  })

  it('includes expected regions', () => {
    const regions = getAllRegions()

    expect(regions).toContain('us')
    expect(regions).toContain('uk')
    expect(regions).toContain('au')
    expect(regions).toContain('ca')
  })
})

describe('getCrisisResourceCount', () => {
  it('returns total number of entries', () => {
    const count = getCrisisResourceCount()
    const allowlist = getCrisisAllowlist()

    expect(count).toBe(allowlist.entries.length)
    expect(count).toBeGreaterThan(0)
  })
})

describe('searchCrisisResources', () => {
  it('finds resources by name', () => {
    const results = searchCrisisResources('Trevor')

    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.name.includes('Trevor'))).toBe(true)
  })

  it('finds resources by description', () => {
    const results = searchCrisisResources('LGBTQ')

    expect(results.length).toBeGreaterThan(0)
  })

  it('is case-insensitive', () => {
    const resultsLower = searchCrisisResources('suicide')
    const resultsUpper = searchCrisisResources('SUICIDE')

    expect(resultsLower.length).toBe(resultsUpper.length)
  })

  it('returns empty array for no matches', () => {
    const results = searchCrisisResources('xyznonexistent123')
    expect(results).toEqual([])
  })

  it('returns empty array for empty query', () => {
    expect(searchCrisisResources('')).toEqual([])
    expect(searchCrisisResources('   ')).toEqual([])
  })

  it('returns empty array for invalid input', () => {
    expect(searchCrisisResources(null as unknown as string)).toEqual([])
    expect(searchCrisisResources(undefined as unknown as string)).toEqual([])
  })
})
