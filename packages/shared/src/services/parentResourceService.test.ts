/**
 * Parent Resource Service Tests - Story 38.7 Task 5
 *
 * Tests for parent resources.
 * AC6: Resources for parents: "Supporting your independent teen"
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getParentResources,
  getResourcesByCategory,
  getResourceById,
  markResourceRead,
  getReadResources,
  initializeDefaultResources,
  clearAllResourceData,
  getResourceCount,
} from './parentResourceService'
import { PARENT_RESOURCE_CATEGORIES } from '../contracts/postGraduation'

describe('ParentResourceService', () => {
  beforeEach(() => {
    clearAllResourceData()
    initializeDefaultResources()
  })

  // ============================================
  // Get Resources Tests (AC6)
  // ============================================

  describe('getParentResources (AC6)', () => {
    it('should return all parent resources', () => {
      const resources = getParentResources()

      expect(resources.length).toBeGreaterThan(0)
    })

    it('should return resources with required fields', () => {
      const resources = getParentResources()

      for (const resource of resources) {
        expect(resource.id).toBeDefined()
        expect(resource.category).toBeDefined()
        expect(resource.title).toBeDefined()
        expect(resource.content).toBeDefined()
      }
    })

    it('should return only active resources', () => {
      const resources = getParentResources()

      for (const resource of resources) {
        expect(resource.isActive).toBe(true)
      }
    })
  })

  // ============================================
  // Resources By Category Tests (AC6)
  // ============================================

  describe('getResourcesByCategory (AC6)', () => {
    it('should return resources for supporting_independence category', () => {
      const resources = getResourcesByCategory('supporting_independence')

      expect(resources.length).toBeGreaterThan(0)
      for (const resource of resources) {
        expect(resource.category).toBe('supporting_independence')
      }
    })

    it('should return resources for transition_tips category', () => {
      const resources = getResourcesByCategory('transition_tips')

      expect(resources.length).toBeGreaterThan(0)
      for (const resource of resources) {
        expect(resource.category).toBe('transition_tips')
      }
    })

    it('should return resources for communication category', () => {
      const resources = getResourcesByCategory('communication')

      expect(resources.length).toBeGreaterThan(0)
      for (const resource of resources) {
        expect(resource.category).toBe('communication')
      }
    })

    it('should have resources for all categories', () => {
      for (const category of PARENT_RESOURCE_CATEGORIES) {
        const resources = getResourcesByCategory(category)
        expect(resources.length).toBeGreaterThan(0)
      }
    })
  })

  // ============================================
  // Individual Resource Tests
  // ============================================

  describe('getResourceById', () => {
    it('should retrieve resource by ID', () => {
      const resources = getParentResources()
      const resource = getResourceById(resources[0].id)

      expect(resource).not.toBeNull()
      expect(resource!.id).toBe(resources[0].id)
    })

    it('should return null for non-existent resource', () => {
      const resource = getResourceById('non-existent')
      expect(resource).toBeNull()
    })
  })

  // ============================================
  // Read Tracking Tests
  // ============================================

  describe('markResourceRead', () => {
    it('should mark resource as read', () => {
      const resources = getParentResources()

      const result = markResourceRead('parent-123', resources[0].id)

      expect(result).toBe(true)
    })

    it('should not duplicate read entries', () => {
      const resources = getParentResources()

      markResourceRead('parent-123', resources[0].id)
      markResourceRead('parent-123', resources[0].id)

      const readResources = getReadResources('parent-123')
      expect(readResources).toHaveLength(1)
    })
  })

  describe('getReadResources', () => {
    it('should return empty array initially', () => {
      const read = getReadResources('parent-123')

      expect(read).toHaveLength(0)
    })

    it('should return read resource IDs', () => {
      const resources = getParentResources()
      markResourceRead('parent-123', resources[0].id)
      markResourceRead('parent-123', resources[1].id)

      const read = getReadResources('parent-123')

      expect(read).toHaveLength(2)
    })
  })

  // ============================================
  // Testing Utilities
  // ============================================

  describe('Testing Utilities', () => {
    it('should initialize default resources', () => {
      clearAllResourceData()
      expect(getResourceCount()).toBe(0)

      initializeDefaultResources()
      expect(getResourceCount()).toBeGreaterThan(0)
    })

    it('should clear all data', () => {
      markResourceRead('parent-123', 'resource-1')

      clearAllResourceData()

      expect(getReadResources('parent-123')).toHaveLength(0)
    })
  })
})
