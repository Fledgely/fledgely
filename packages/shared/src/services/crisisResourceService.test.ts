/**
 * Crisis Resource Service Tests - Story 7.5.3 Task 2
 *
 * Tests for managing and retrieving crisis resources.
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  // Resource management
  getResourcesForJurisdiction,
  getUniversalResources,
  getChatResources,
  isChatAvailable,
  getEmergencyNumber,
  getAllCrisisResources,
  getResourceById,
  addResourceToCache,
  clearResourceCache,
  // Resource cache management
  getCachedResources,
  setCachedResources,
  isCacheValid,
  refreshResourceCache,
  getCacheExpiryTime,
  CACHE_EXPIRY_MS,
  // Resource prioritization
  getPrioritizedResources,
  getTopNResources,
} from './crisisResourceService'
import {
  createCrisisResource,
  createDefaultUSResources,
  createDefaultUKResources,
  createDefaultCAResources,
  createDefaultAUResources,
} from '../contracts/signalConfirmation'

describe('Crisis Resource Service', () => {
  beforeEach(() => {
    clearResourceCache()
  })

  afterEach(() => {
    clearResourceCache()
  })

  // ============================================
  // Resource Retrieval Tests
  // ============================================

  describe('getResourcesForJurisdiction', () => {
    it('should return US resources for US jurisdiction', () => {
      const resources = getResourcesForJurisdiction('US')
      expect(resources.length).toBeGreaterThan(0)
      expect(resources.some((r) => r.name.includes('988'))).toBe(true)
    })

    it('should return UK resources for UK jurisdiction', () => {
      const resources = getResourcesForJurisdiction('UK')
      expect(resources.length).toBeGreaterThan(0)
      expect(resources.some((r) => r.name.includes('Childline'))).toBe(true)
    })

    it('should return CA resources for CA jurisdiction', () => {
      const resources = getResourcesForJurisdiction('CA')
      expect(resources.length).toBeGreaterThan(0)
      expect(resources.some((r) => r.name.includes('Kids Help Phone'))).toBe(true)
    })

    it('should return AU resources for AU jurisdiction', () => {
      const resources = getResourcesForJurisdiction('AU')
      expect(resources.length).toBeGreaterThan(0)
      expect(resources.some((r) => r.name.includes('Kids Helpline'))).toBe(true)
    })

    it('should include universal resources in all jurisdictions', () => {
      // Start with default resources
      refreshResourceCache()

      // Add a universal resource
      const universalResource = createCrisisResource(
        'Universal Crisis Line',
        'Help available everywhere',
        'phone',
        '1234567890',
        100,
        [], // Empty = universal
        true,
        false
      )
      addResourceToCache(universalResource)

      const usResources = getResourcesForJurisdiction('US')
      const ukResources = getResourcesForJurisdiction('UK')

      expect(usResources.some((r) => r.name === 'Universal Crisis Line')).toBe(true)
      expect(ukResources.some((r) => r.name === 'Universal Crisis Line')).toBe(true)
    })

    it('should match state-level jurisdiction to country', () => {
      const resources = getResourcesForJurisdiction('US-CA')
      expect(resources.length).toBeGreaterThan(0)
      expect(resources.some((r) => r.jurisdictions.includes('US'))).toBe(true)
    })

    it('should fallback to universal resources for unknown jurisdiction', () => {
      // Start with default resources
      refreshResourceCache()

      // Add a universal resource
      const universalResource = createCrisisResource(
        'Global Support',
        'Available globally',
        'website',
        'https://support.example.com',
        1,
        [],
        true,
        false
      )
      addResourceToCache(universalResource)

      const resources = getResourcesForJurisdiction('ZZ') // Unknown jurisdiction
      expect(resources.length).toBeGreaterThan(0)
      expect(resources.some((r) => r.jurisdictions.length === 0)).toBe(true)
    })

    it('should return resources sorted by priority', () => {
      const resources = getResourcesForJurisdiction('US')
      for (let i = 1; i < resources.length; i++) {
        expect(resources[i].priority).toBeGreaterThanOrEqual(resources[i - 1].priority)
      }
    })
  })

  describe('getUniversalResources', () => {
    it('should return only resources with empty jurisdictions', () => {
      const universalResource = createCrisisResource(
        'Universal Resource',
        'Available everywhere',
        'phone',
        '1234567890',
        1,
        [],
        true,
        false
      )
      const usOnlyResource = createCrisisResource(
        'US Only Resource',
        'US only',
        'phone',
        '0987654321',
        2,
        ['US'],
        true,
        false
      )
      addResourceToCache(universalResource)
      addResourceToCache(usOnlyResource)

      const universalResources = getUniversalResources()
      expect(universalResources.every((r) => r.jurisdictions.length === 0)).toBe(true)
      expect(universalResources.some((r) => r.name === 'Universal Resource')).toBe(true)
    })
  })

  describe('getChatResources', () => {
    it('should return only resources with chatAvailable true', () => {
      const chatResource = createCrisisResource(
        'Chat Resource',
        'Has chat',
        'chat',
        'https://chat.example.com',
        1,
        ['US'],
        true,
        true
      )
      const phoneResource = createCrisisResource(
        'Phone Resource',
        'No chat',
        'phone',
        '1234567890',
        2,
        ['US'],
        true,
        false
      )
      addResourceToCache(chatResource)
      addResourceToCache(phoneResource)

      const chatResources = getChatResources()
      expect(chatResources.every((r) => r.chatAvailable)).toBe(true)
      expect(chatResources.some((r) => r.name === 'Chat Resource')).toBe(true)
      expect(chatResources.some((r) => r.name === 'Phone Resource')).toBe(false)
    })

    it('should filter by jurisdiction when provided', () => {
      const usChatResource = createCrisisResource(
        'US Chat',
        'US chat',
        'chat',
        'https://chat-us.example.com',
        1,
        ['US'],
        true,
        true
      )
      const ukChatResource = createCrisisResource(
        'UK Chat',
        'UK chat',
        'chat',
        'https://chat-uk.example.com',
        2,
        ['UK'],
        true,
        true
      )
      addResourceToCache(usChatResource)
      addResourceToCache(ukChatResource)

      const usChatResources = getChatResources('US')
      expect(usChatResources.some((r) => r.name === 'US Chat')).toBe(true)
      expect(usChatResources.some((r) => r.name === 'UK Chat')).toBe(false)
    })
  })

  describe('isChatAvailable', () => {
    it('should return true if chat resources exist for jurisdiction', () => {
      const chatResource = createCrisisResource(
        'Chat Resource',
        'Has chat',
        'chat',
        'https://chat.example.com',
        1,
        ['US'],
        true,
        true
      )
      addResourceToCache(chatResource)

      expect(isChatAvailable('US')).toBe(true)
    })

    it('should return false if no chat resources for jurisdiction', () => {
      clearResourceCache()
      expect(isChatAvailable('ZZ')).toBe(false)
    })

    it('should check universal chat resources', () => {
      const universalChat = createCrisisResource(
        'Universal Chat',
        'Global chat',
        'chat',
        'https://global-chat.example.com',
        1,
        [],
        true,
        true
      )
      addResourceToCache(universalChat)

      expect(isChatAvailable('ZZ')).toBe(true) // Unknown jurisdiction should get universal
    })
  })

  describe('getEmergencyNumber', () => {
    it('should return 911 for US jurisdiction', () => {
      expect(getEmergencyNumber('US')).toBe('911')
    })

    it('should return 911 for US state jurisdictions', () => {
      expect(getEmergencyNumber('US-CA')).toBe('911')
      expect(getEmergencyNumber('US-NY')).toBe('911')
    })

    it('should return 999 for UK jurisdiction', () => {
      expect(getEmergencyNumber('UK')).toBe('999')
    })

    it('should return 911 for CA jurisdiction', () => {
      expect(getEmergencyNumber('CA')).toBe('911')
    })

    it('should return 000 for AU jurisdiction', () => {
      expect(getEmergencyNumber('AU')).toBe('000')
    })

    it('should return 112 as default for EU countries', () => {
      expect(getEmergencyNumber('DE')).toBe('112')
      expect(getEmergencyNumber('FR')).toBe('112')
    })

    it('should return 112 for unknown jurisdiction (international standard)', () => {
      expect(getEmergencyNumber('ZZ')).toBe('112')
    })
  })

  // ============================================
  // Resource Management Tests
  // ============================================

  describe('getAllCrisisResources', () => {
    it('should return all cached resources', () => {
      const resource1 = createCrisisResource('R1', 'Desc1', 'phone', '111', 1, [], true, false)
      const resource2 = createCrisisResource('R2', 'Desc2', 'text', '222', 2, [], true, false)
      addResourceToCache(resource1)
      addResourceToCache(resource2)

      const allResources = getAllCrisisResources()
      expect(allResources).toHaveLength(2)
    })

    it('should return empty array when cache is empty', () => {
      clearResourceCache()
      const allResources = getAllCrisisResources()
      expect(allResources).toHaveLength(0)
    })
  })

  describe('getResourceById', () => {
    it('should return resource by ID', () => {
      const resource = createCrisisResource('Test', 'Desc', 'phone', '111', 1, [], true, false)
      addResourceToCache(resource)

      const found = getResourceById(resource.id)
      expect(found).toBeDefined()
      expect(found?.name).toBe('Test')
    })

    it('should return undefined for non-existent ID', () => {
      const found = getResourceById('non_existent_id')
      expect(found).toBeUndefined()
    })
  })

  describe('addResourceToCache', () => {
    it('should add resource to cache', () => {
      const resource = createCrisisResource(
        'New',
        'New resource',
        'phone',
        '111',
        1,
        [],
        true,
        false
      )
      addResourceToCache(resource)

      const found = getResourceById(resource.id)
      expect(found).toBeDefined()
    })

    it('should update existing resource with same ID', () => {
      const resource = createCrisisResource('Original', 'Desc', 'phone', '111', 1, [], true, false)
      addResourceToCache(resource)

      // Modify and re-add
      const updated = { ...resource, name: 'Updated' }
      addResourceToCache(updated)

      const found = getResourceById(resource.id)
      expect(found?.name).toBe('Updated')
    })
  })

  // ============================================
  // Cache Management Tests
  // ============================================

  describe('getCachedResources', () => {
    it('should return cached resources', () => {
      const resources = createDefaultUSResources()
      setCachedResources(resources)

      const cached = getCachedResources()
      expect(cached).toHaveLength(resources.length)
    })
  })

  describe('setCachedResources', () => {
    it('should replace all cached resources', () => {
      const initial = createDefaultUSResources()
      setCachedResources(initial)

      const newResources = createDefaultUKResources()
      setCachedResources(newResources)

      const cached = getCachedResources()
      expect(cached).toHaveLength(newResources.length)
      expect(cached.some((r) => r.name.includes('Childline'))).toBe(true)
    })

    it('should update cache expiry time', () => {
      const resources = createDefaultUSResources()
      const beforeSet = Date.now()
      setCachedResources(resources)
      const expiryTime = getCacheExpiryTime()

      expect(expiryTime).toBeGreaterThan(beforeSet)
      expect(expiryTime).toBeLessThanOrEqual(beforeSet + CACHE_EXPIRY_MS + 100)
    })
  })

  describe('isCacheValid', () => {
    it('should return true when cache is fresh', () => {
      setCachedResources(createDefaultUSResources())
      expect(isCacheValid()).toBe(true)
    })

    it('should return false when cache is empty', () => {
      clearResourceCache()
      expect(isCacheValid()).toBe(false)
    })

    it('should return false when cache is expired', () => {
      setCachedResources(createDefaultUSResources())

      // Fast-forward time past expiry
      vi.useFakeTimers()
      vi.advanceTimersByTime(CACHE_EXPIRY_MS + 1000)

      expect(isCacheValid()).toBe(false)

      vi.useRealTimers()
    })
  })

  describe('refreshResourceCache', () => {
    it('should repopulate cache with default resources', () => {
      clearResourceCache()
      expect(getCachedResources()).toHaveLength(0)

      refreshResourceCache()

      const cached = getCachedResources()
      expect(cached.length).toBeGreaterThan(0)
    })

    it('should include resources from all jurisdictions', () => {
      refreshResourceCache()
      const cached = getCachedResources()

      // Check for US resources
      expect(cached.some((r) => r.jurisdictions.includes('US'))).toBe(true)
      // Check for UK resources
      expect(cached.some((r) => r.jurisdictions.includes('UK'))).toBe(true)
    })
  })

  // ============================================
  // Resource Prioritization Tests
  // ============================================

  describe('getPrioritizedResources', () => {
    it('should return resources sorted by priority', () => {
      // Use a jurisdiction with no default resources
      const lowPriority = createCrisisResource(
        'Low',
        'Desc',
        'phone',
        '111',
        10,
        ['XX'],
        true,
        false
      )
      const highPriority = createCrisisResource(
        'High',
        'Desc',
        'phone',
        '222',
        1,
        ['XX'],
        true,
        false
      )
      const medPriority = createCrisisResource(
        'Med',
        'Desc',
        'phone',
        '333',
        5,
        ['XX'],
        true,
        false
      )

      // Populate cache first to prevent auto-refresh
      refreshResourceCache()

      addResourceToCache(lowPriority)
      addResourceToCache(highPriority)
      addResourceToCache(medPriority)

      const prioritized = getPrioritizedResources('XX')
      expect(prioritized[0].name).toBe('High')
      expect(prioritized[1].name).toBe('Med')
      expect(prioritized[2].name).toBe('Low')
    })

    it('should handle empty jurisdiction', () => {
      const prioritized = getPrioritizedResources('ZZ')
      // Should still return universal resources if any
      expect(Array.isArray(prioritized)).toBe(true)
    })
  })

  describe('getTopNResources', () => {
    it('should return top N resources by priority', () => {
      // Use a jurisdiction with no default resources
      const r1 = createCrisisResource('R1', 'Desc', 'phone', '111', 1, ['YY'], true, false)
      const r2 = createCrisisResource('R2', 'Desc', 'phone', '222', 2, ['YY'], true, false)
      const r3 = createCrisisResource('R3', 'Desc', 'phone', '333', 3, ['YY'], true, false)
      const r4 = createCrisisResource('R4', 'Desc', 'phone', '444', 4, ['YY'], true, false)

      // Populate cache first to prevent auto-refresh
      refreshResourceCache()

      addResourceToCache(r1)
      addResourceToCache(r2)
      addResourceToCache(r3)
      addResourceToCache(r4)

      const top2 = getTopNResources('YY', 2)
      expect(top2).toHaveLength(2)
      expect(top2[0].name).toBe('R1')
      expect(top2[1].name).toBe('R2')
    })

    it('should return all resources if N exceeds count', () => {
      // Use a jurisdiction with no default resources
      const r1 = createCrisisResource('R1', 'Desc', 'phone', '111', 1, ['ZY'], true, false)

      // Populate cache first to prevent auto-refresh
      refreshResourceCache()

      addResourceToCache(r1)

      const top10 = getTopNResources('ZY', 10)
      expect(top10).toHaveLength(1)
    })

    it('should return empty array if no resources', () => {
      clearResourceCache()
      const top5 = getTopNResources('ZZ', 5)
      expect(top5).toHaveLength(0)
    })
  })

  // ============================================
  // Default Resources Tests
  // ============================================

  describe('Default Resources', () => {
    it('should include 988 for US', () => {
      const usResources = createDefaultUSResources()
      const line988 = usResources.find((r) => r.value === '988')
      expect(line988).toBeDefined()
      expect(line988?.type).toBe('phone')
      expect(line988?.available24x7).toBe(true)
      expect(line988?.chatAvailable).toBe(true)
    })

    it('should include Crisis Text Line for US', () => {
      const usResources = createDefaultUSResources()
      const textLine = usResources.find((r) => r.value === '741741')
      expect(textLine).toBeDefined()
      expect(textLine?.type).toBe('text')
    })

    it('should include Childhelp for US', () => {
      const usResources = createDefaultUSResources()
      const childhelp = usResources.find((r) => r.name.includes('Childhelp'))
      expect(childhelp).toBeDefined()
    })

    it('should include National DV Hotline for US', () => {
      const usResources = createDefaultUSResources()
      const dvHotline = usResources.find((r) => r.name.includes('Domestic Violence'))
      expect(dvHotline).toBeDefined()
    })

    it('should include Childline for UK', () => {
      const ukResources = createDefaultUKResources()
      const childline = ukResources.find((r) => r.name.includes('Childline'))
      expect(childline).toBeDefined()
      expect(childline?.value).toBe('0800 1111')
    })

    it('should include 999 emergency for UK', () => {
      const ukResources = createDefaultUKResources()
      const emergency = ukResources.find((r) => r.value === '999')
      expect(emergency).toBeDefined()
    })

    it('should include Kids Help Phone for CA', () => {
      const caResources = createDefaultCAResources()
      const kidsHelp = caResources.find((r) => r.name.includes('Kids Help Phone'))
      expect(kidsHelp).toBeDefined()
    })

    it('should include Kids Helpline for AU', () => {
      const auResources = createDefaultAUResources()
      const kidsHelpline = auResources.find((r) => r.name.includes('Kids Helpline'))
      expect(kidsHelpline).toBeDefined()
    })

    it('should include 000 emergency for AU', () => {
      const auResources = createDefaultAUResources()
      const emergency = auResources.find((r) => r.value === '000')
      expect(emergency).toBeDefined()
    })
  })
})
