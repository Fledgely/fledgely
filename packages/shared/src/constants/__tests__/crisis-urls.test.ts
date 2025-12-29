/**
 * Tests for Crisis Allowlist Data
 *
 * Story 7.1: Crisis Allowlist Data Structure
 */

import { describe, it, expect } from 'vitest'
import {
  CRISIS_ALLOWLIST,
  CRISIS_ALLOWLIST_VERSION,
  CRISIS_RESOURCES,
  getResourcesByCategory,
  getAllProtectedDomains,
} from '../crisis-urls'
import {
  crisisAllowlistSchema,
  crisisResourceSchema,
  matchesCrisisUrl,
  isCrisisUrl,
  type CrisisAllowlist,
} from '../../contracts'

describe('Crisis Allowlist Data', () => {
  describe('CRISIS_ALLOWLIST_VERSION', () => {
    it('should be a valid semantic version', () => {
      expect(CRISIS_ALLOWLIST_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    })
  })

  describe('CRISIS_ALLOWLIST', () => {
    it('should validate against crisisAllowlistSchema', () => {
      const result = crisisAllowlistSchema.safeParse(CRISIS_ALLOWLIST)
      expect(result.success).toBe(true)
    })

    it('should have the correct version', () => {
      expect(CRISIS_ALLOWLIST.version).toBe(CRISIS_ALLOWLIST_VERSION)
    })

    it('should have a valid lastUpdated timestamp', () => {
      expect(CRISIS_ALLOWLIST.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should contain resources', () => {
      expect(CRISIS_ALLOWLIST.resources.length).toBeGreaterThan(0)
    })
  })

  describe('CRISIS_RESOURCES', () => {
    it('should contain at least 10 resources', () => {
      expect(CRISIS_RESOURCES.length).toBeGreaterThanOrEqual(10)
    })

    it('should have unique IDs', () => {
      const ids = CRISIS_RESOURCES.map((r) => r.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have unique primary domains', () => {
      const domains = CRISIS_RESOURCES.map((r) => r.domain.toLowerCase())
      const uniqueDomains = new Set(domains)
      expect(uniqueDomains.size).toBe(domains.length)
    })

    describe('each resource', () => {
      it('should validate against crisisResourceSchema', () => {
        for (const resource of CRISIS_RESOURCES) {
          const result = crisisResourceSchema.safeParse(resource)
          expect(result.success, `Resource ${resource.id} should be valid`).toBe(true)
        }
      })

      it('should have a non-empty name', () => {
        for (const resource of CRISIS_RESOURCES) {
          expect(
            resource.name.length,
            `Resource ${resource.id} should have a name`
          ).toBeGreaterThan(0)
        }
      })

      it('should have a non-empty description', () => {
        for (const resource of CRISIS_RESOURCES) {
          expect(
            resource.description.length,
            `Resource ${resource.id} should have a description`
          ).toBeGreaterThan(0)
        }
      })

      it('should have descriptions under 200 characters (6th-grade readable)', () => {
        for (const resource of CRISIS_RESOURCES) {
          expect(
            resource.description.length,
            `Resource ${resource.id} description too long`
          ).toBeLessThanOrEqual(200)
        }
      })
    })
  })

  describe('Required Resources (AC7)', () => {
    it('should include 988 Suicide & Crisis Lifeline', () => {
      const resource = CRISIS_RESOURCES.find((r) => r.domain === '988lifeline.org')
      expect(resource).toBeDefined()
      expect(resource?.category).toBe('suicide_prevention')
    })

    it('should include Crisis Text Line', () => {
      const resource = CRISIS_RESOURCES.find((r) => r.domain === 'crisistextline.org')
      expect(resource).toBeDefined()
      expect(resource?.category).toBe('crisis_general')
    })

    it('should include RAINN', () => {
      const resource = CRISIS_RESOURCES.find((r) => r.domain === 'rainn.org')
      expect(resource).toBeDefined()
      expect(resource?.category).toBe('sexual_assault')
    })

    it('should include The Trevor Project', () => {
      const resource = CRISIS_RESOURCES.find((r) => r.domain === 'thetrevorproject.org')
      expect(resource).toBeDefined()
      expect(resource?.category).toBe('lgbtq_support')
    })

    it('should include Childhelp', () => {
      const resource = CRISIS_RESOURCES.find((r) => r.domain === 'childhelp.org')
      expect(resource).toBeDefined()
      expect(resource?.category).toBe('child_abuse')
    })

    it('should include National Domestic Violence Hotline', () => {
      const resource = CRISIS_RESOURCES.find((r) => r.domain === 'thehotline.org')
      expect(resource).toBeDefined()
      expect(resource?.category).toBe('domestic_violence')
    })
  })

  describe('Category Coverage', () => {
    it('should have suicide_prevention resources', () => {
      const resources = getResourcesByCategory('suicide_prevention')
      expect(resources.length).toBeGreaterThan(0)
    })

    it('should have crisis_general resources', () => {
      const resources = getResourcesByCategory('crisis_general')
      expect(resources.length).toBeGreaterThan(0)
    })

    it('should have domestic_violence resources', () => {
      const resources = getResourcesByCategory('domestic_violence')
      expect(resources.length).toBeGreaterThan(0)
    })

    it('should have child_abuse resources', () => {
      const resources = getResourcesByCategory('child_abuse')
      expect(resources.length).toBeGreaterThan(0)
    })

    it('should have sexual_assault resources', () => {
      const resources = getResourcesByCategory('sexual_assault')
      expect(resources.length).toBeGreaterThan(0)
    })

    it('should have lgbtq_support resources', () => {
      const resources = getResourcesByCategory('lgbtq_support')
      expect(resources.length).toBeGreaterThan(0)
    })

    it('should have eating_disorder resources', () => {
      const resources = getResourcesByCategory('eating_disorder')
      expect(resources.length).toBeGreaterThan(0)
    })

    it('should have mental_health resources', () => {
      const resources = getResourcesByCategory('mental_health')
      expect(resources.length).toBeGreaterThan(0)
    })

    it('should have substance_abuse resources', () => {
      const resources = getResourcesByCategory('substance_abuse')
      expect(resources.length).toBeGreaterThan(0)
    })
  })

  describe('getResourcesByCategory', () => {
    it('should return only resources of the specified category', () => {
      const suicideResources = getResourcesByCategory('suicide_prevention')
      for (const resource of suicideResources) {
        expect(resource.category).toBe('suicide_prevention')
      }
    })

    it('should return empty array for invalid category', () => {
      // @ts-expect-error Testing invalid category
      const resources = getResourcesByCategory('invalid_category')
      expect(resources).toEqual([])
    })
  })

  describe('getAllProtectedDomains', () => {
    it('should return a Set', () => {
      const domains = getAllProtectedDomains()
      expect(domains).toBeInstanceOf(Set)
    })

    it('should include primary domains', () => {
      const domains = getAllProtectedDomains()
      expect(domains.has('988lifeline.org')).toBe(true)
      expect(domains.has('rainn.org')).toBe(true)
    })

    it('should include aliases', () => {
      const domains = getAllProtectedDomains()
      expect(domains.has('trevorproject.org')).toBe(true) // Alias of thetrevorproject.org
    })

    it('should have lowercase domains', () => {
      const domains = getAllProtectedDomains()
      for (const domain of domains) {
        expect(domain).toBe(domain.toLowerCase())
      }
    })
  })
})

describe('matchesCrisisUrl', () => {
  describe('exact domain matching', () => {
    it('should match exact domain', () => {
      const result = matchesCrisisUrl('https://988lifeline.org', CRISIS_ALLOWLIST)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('suicide-988-lifeline')
    })

    it('should match domain with www prefix', () => {
      const result = matchesCrisisUrl('https://www.988lifeline.org', CRISIS_ALLOWLIST)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('suicide-988-lifeline')
    })

    it('should match domain with path', () => {
      const result = matchesCrisisUrl('https://988lifeline.org/help/resources', CRISIS_ALLOWLIST)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('suicide-988-lifeline')
    })

    it('should match domain case-insensitively', () => {
      const result = matchesCrisisUrl('https://988LIFELINE.ORG', CRISIS_ALLOWLIST)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('suicide-988-lifeline')
    })
  })

  describe('wildcard pattern matching', () => {
    it('should match subdomain when pattern exists', () => {
      const result = matchesCrisisUrl('https://help.988lifeline.org', CRISIS_ALLOWLIST)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('suicide-988-lifeline')
    })

    it('should match deeply nested subdomain', () => {
      const result = matchesCrisisUrl('https://chat.help.988lifeline.org', CRISIS_ALLOWLIST)
      expect(result).not.toBeNull()
    })
  })

  describe('alias matching', () => {
    it('should match known aliases', () => {
      // suicidepreventionlifeline.org is an alias of 988lifeline.org
      const result = matchesCrisisUrl('https://suicidepreventionlifeline.org', CRISIS_ALLOWLIST)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('suicide-988-lifeline')
    })

    it('should match alias with www prefix', () => {
      const result = matchesCrisisUrl('https://www.trevorproject.org', CRISIS_ALLOWLIST)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('lgbtq-trevor')
    })

    it('should match Trevor Project typo alias', () => {
      // thetrevoproject.org (missing 'r') is an alias
      const result = matchesCrisisUrl('https://thetrevoproject.org', CRISIS_ALLOWLIST)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('lgbtq-trevor')
    })
  })

  describe('non-matching URLs', () => {
    it('should return null for unrelated domains', () => {
      const result = matchesCrisisUrl('https://google.com', CRISIS_ALLOWLIST)
      expect(result).toBeNull()
    })

    it('should return null for similar but non-matching domains', () => {
      const result = matchesCrisisUrl('https://fake988lifeline.org', CRISIS_ALLOWLIST)
      expect(result).toBeNull()
    })

    it('should return null for domain suffix matches', () => {
      // Should not match notacrisis-988lifeline.org
      const result = matchesCrisisUrl('https://notacrisis-988lifeline.org', CRISIS_ALLOWLIST)
      expect(result).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle invalid URLs gracefully', () => {
      const result = matchesCrisisUrl('not-a-url', CRISIS_ALLOWLIST)
      // Should try to parse as hostname directly
      expect(result).toBeNull()
    })

    it('should handle hostname-only input', () => {
      const result = matchesCrisisUrl('988lifeline.org', CRISIS_ALLOWLIST)
      expect(result).not.toBeNull()
    })

    it('should handle empty string', () => {
      const result = matchesCrisisUrl('', CRISIS_ALLOWLIST)
      expect(result).toBeNull()
    })

    it('should handle URL with query parameters', () => {
      const result = matchesCrisisUrl(
        'https://988lifeline.org/help?lang=es&topic=suicide',
        CRISIS_ALLOWLIST
      )
      expect(result).not.toBeNull()
      expect(result?.id).toBe('suicide-988-lifeline')
    })

    it('should handle URL with port number', () => {
      const result = matchesCrisisUrl('https://988lifeline.org:443/resources', CRISIS_ALLOWLIST)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('suicide-988-lifeline')
    })

    it('should handle URL with hash fragment', () => {
      const result = matchesCrisisUrl('https://rainn.org/get-help#chat', CRISIS_ALLOWLIST)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('sa-rainn')
    })

    it('should return null for empty allowlist', () => {
      const emptyAllowlist: CrisisAllowlist = {
        version: '1.0.0',
        lastUpdated: '2025-12-29T00:00:00.000Z',
        resources: [],
      }
      const result = matchesCrisisUrl('https://988lifeline.org', emptyAllowlist)
      expect(result).toBeNull()
    })
  })
})

describe('isCrisisUrl', () => {
  it('should return true for matching URLs', () => {
    expect(isCrisisUrl('https://988lifeline.org', CRISIS_ALLOWLIST)).toBe(true)
    expect(isCrisisUrl('https://rainn.org/help', CRISIS_ALLOWLIST)).toBe(true)
    expect(isCrisisUrl('https://www.thetrevorproject.org', CRISIS_ALLOWLIST)).toBe(true)
  })

  it('should return false for non-matching URLs', () => {
    expect(isCrisisUrl('https://google.com', CRISIS_ALLOWLIST)).toBe(false)
    expect(isCrisisUrl('https://facebook.com', CRISIS_ALLOWLIST)).toBe(false)
    expect(isCrisisUrl('https://amazon.com', CRISIS_ALLOWLIST)).toBe(false)
  })
})
