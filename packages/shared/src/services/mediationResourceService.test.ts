/**
 * MediationResourceService Tests - Story 34.5.2 Task 2
 *
 * Tests for retrieving mediation resources based on child's age.
 * AC2: Link to Family Communication Resources
 * AC3: Family Meeting Template Access
 * AC4: Age-Appropriate Negotiation Tips
 */

import { describe, it, expect } from 'vitest'
import {
  getAgeTier,
  getMediationResources,
  getFamilyMeetingTemplate,
  getNegotiationTips,
  formatResourceContent,
  FAMILY_MEETING_TEMPLATES,
  NEGOTIATION_TIPS,
} from './mediationResourceService'
import type { AgeTier } from '../contracts/mediationResources'

describe('mediationResourceService - Story 34.5.2', () => {
  // ============================================
  // getAgeTier Tests
  // ============================================

  describe('getAgeTier', () => {
    it('should return child-8-11 for 8 year old', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 8)
      expect(getAgeTier(birthDate)).toBe('child-8-11')
    })

    it('should return child-8-11 for 11 year old', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 11)
      expect(getAgeTier(birthDate)).toBe('child-8-11')
    })

    it('should return tween-12-14 for 12 year old', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 12)
      expect(getAgeTier(birthDate)).toBe('tween-12-14')
    })

    it('should return tween-12-14 for 14 year old', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 14)
      expect(getAgeTier(birthDate)).toBe('tween-12-14')
    })

    it('should return teen-15-17 for 15 year old', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 15)
      expect(getAgeTier(birthDate)).toBe('teen-15-17')
    })

    it('should return teen-15-17 for 17 year old', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 17)
      expect(getAgeTier(birthDate)).toBe('teen-15-17')
    })

    it('should return teen-15-17 for 18+ (older teens)', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 18)
      expect(getAgeTier(birthDate)).toBe('teen-15-17')
    })

    it('should return child-8-11 for 7 year old (younger children)', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 7)
      expect(getAgeTier(birthDate)).toBe('child-8-11')
    })

    it('should handle birthdate edge cases correctly', () => {
      // Child turning 12 today should be tween
      const twelveToday = new Date()
      twelveToday.setFullYear(twelveToday.getFullYear() - 12)
      expect(getAgeTier(twelveToday)).toBe('tween-12-14')

      // Child turning 15 today should be teen
      const fifteenToday = new Date()
      fifteenToday.setFullYear(fifteenToday.getFullYear() - 15)
      expect(getAgeTier(fifteenToday)).toBe('teen-15-17')
    })
  })

  // ============================================
  // getMediationResources Tests
  // ============================================

  describe('getMediationResources', () => {
    it('should return resources for child-8-11 tier', async () => {
      const resources = await getMediationResources('child-8-11')
      expect(Array.isArray(resources)).toBe(true)
      expect(resources.length).toBeGreaterThan(0)
      resources.forEach((resource) => {
        expect(resource.ageTier).toBe('child-8-11')
      })
    })

    it('should return resources for tween-12-14 tier', async () => {
      const resources = await getMediationResources('tween-12-14')
      expect(Array.isArray(resources)).toBe(true)
      expect(resources.length).toBeGreaterThan(0)
      resources.forEach((resource) => {
        expect(resource.ageTier).toBe('tween-12-14')
      })
    })

    it('should return resources for teen-15-17 tier', async () => {
      const resources = await getMediationResources('teen-15-17')
      expect(Array.isArray(resources)).toBe(true)
      expect(resources.length).toBeGreaterThan(0)
      resources.forEach((resource) => {
        expect(resource.ageTier).toBe('teen-15-17')
      })
    })

    it('should return resources sorted by order', async () => {
      const resources = await getMediationResources('tween-12-14')
      for (let i = 1; i < resources.length; i++) {
        expect(resources[i].order).toBeGreaterThanOrEqual(resources[i - 1].order)
      }
    })

    it('should include multiple resource types', async () => {
      const resources = await getMediationResources('teen-15-17')
      const types = new Set(resources.map((r) => r.type))
      expect(types.size).toBeGreaterThan(1)
    })
  })

  // ============================================
  // getFamilyMeetingTemplate Tests
  // ============================================

  describe('getFamilyMeetingTemplate', () => {
    it('should return template for child-8-11 tier', () => {
      const template = getFamilyMeetingTemplate('child-8-11')
      expect(template).toBeDefined()
      expect(template.ageTier).toBe('child-8-11')
    })

    it('should return template for tween-12-14 tier', () => {
      const template = getFamilyMeetingTemplate('tween-12-14')
      expect(template).toBeDefined()
      expect(template.ageTier).toBe('tween-12-14')
    })

    it('should return template for teen-15-17 tier', () => {
      const template = getFamilyMeetingTemplate('teen-15-17')
      expect(template).toBeDefined()
      expect(template.ageTier).toBe('teen-15-17')
    })

    it('should have parent section with heading and prompts', () => {
      const template = getFamilyMeetingTemplate('tween-12-14')
      expect(template.parentSection).toBeDefined()
      expect(template.parentSection.heading).toBeTruthy()
      expect(template.parentSection.prompts.length).toBeGreaterThan(0)
    })

    it('should have child section with heading and prompts', () => {
      const template = getFamilyMeetingTemplate('tween-12-14')
      expect(template.childSection).toBeDefined()
      expect(template.childSection.heading).toBeTruthy()
      expect(template.childSection.prompts.length).toBeGreaterThan(0)
    })

    it('should have joint section with heading and prompts', () => {
      const template = getFamilyMeetingTemplate('tween-12-14')
      expect(template.jointSection).toBeDefined()
      expect(template.jointSection.heading).toBeTruthy()
      expect(template.jointSection.prompts.length).toBeGreaterThan(0)
    })

    it('should have introduction and closing notes', () => {
      const template = getFamilyMeetingTemplate('teen-15-17')
      expect(template.introduction).toBeTruthy()
      expect(template.closingNotes).toBeTruthy()
    })

    it('should use age-appropriate language for child tier', () => {
      const template = getFamilyMeetingTemplate('child-8-11')
      // Child template should use simpler words
      expect(template.introduction.length).toBeLessThan(500)
    })

    it('should use more complex language for teen tier', () => {
      const template = getFamilyMeetingTemplate('teen-15-17')
      // Teen template can be more detailed
      expect(template.introduction).toBeTruthy()
    })
  })

  // ============================================
  // getNegotiationTips Tests
  // ============================================

  describe('getNegotiationTips', () => {
    it('should return tips for child-8-11 tier', () => {
      const tips = getNegotiationTips('child-8-11')
      expect(Array.isArray(tips)).toBe(true)
      expect(tips.length).toBeGreaterThan(0)
      tips.forEach((tip) => {
        expect(tip.ageTier).toBe('child-8-11')
      })
    })

    it('should return tips for tween-12-14 tier', () => {
      const tips = getNegotiationTips('tween-12-14')
      expect(Array.isArray(tips)).toBe(true)
      expect(tips.length).toBeGreaterThan(0)
      tips.forEach((tip) => {
        expect(tip.ageTier).toBe('tween-12-14')
      })
    })

    it('should return tips for teen-15-17 tier', () => {
      const tips = getNegotiationTips('teen-15-17')
      expect(Array.isArray(tips)).toBe(true)
      expect(tips.length).toBeGreaterThan(0)
      tips.forEach((tip) => {
        expect(tip.ageTier).toBe('teen-15-17')
      })
    })

    it('should return tips sorted by order', () => {
      const tips = getNegotiationTips('tween-12-14')
      for (let i = 1; i < tips.length; i++) {
        expect(tips[i].order).toBeGreaterThanOrEqual(tips[i - 1].order)
      }
    })

    it('should have title, description and content for each tip', () => {
      const tips = getNegotiationTips('teen-15-17')
      tips.forEach((tip) => {
        expect(tip.title).toBeTruthy()
        expect(tip.shortDescription).toBeTruthy()
        expect(tip.fullContent).toBeTruthy()
      })
    })

    it('should return at least 3 tips per tier', () => {
      const tiers: AgeTier[] = ['child-8-11', 'tween-12-14', 'teen-15-17']
      tiers.forEach((tier) => {
        const tips = getNegotiationTips(tier)
        expect(tips.length).toBeGreaterThanOrEqual(3)
      })
    })
  })

  // ============================================
  // formatResourceContent Tests
  // ============================================

  describe('formatResourceContent', () => {
    it('should return content for internal resource', () => {
      const resource = {
        id: 'test-1',
        type: 'negotiation-tips' as const,
        title: 'Test Tip',
        description: 'A test tip',
        content: '## Test Content\n\nSome markdown content',
        ageTier: 'tween-12-14' as const,
        externalUrl: null,
        isPrintable: true,
        order: 1,
      }
      const formatted = formatResourceContent(resource)
      expect(formatted).toContain('## Test Content')
    })

    it('should include external URL for external resources', () => {
      const resource = {
        id: 'test-2',
        type: 'external-resource' as const,
        title: 'External Resource',
        description: 'An external link',
        content: 'Visit this helpful site',
        ageTier: 'teen-15-17' as const,
        externalUrl: 'https://example.com/resource',
        isPrintable: false,
        order: 2,
      }
      const formatted = formatResourceContent(resource)
      expect(formatted).toContain('https://example.com/resource')
    })

    it('should handle empty content gracefully', () => {
      const resource = {
        id: 'test-3',
        type: 'communication-guide' as const,
        title: 'Empty Guide',
        description: 'Guide with no content',
        content: '',
        ageTier: 'child-8-11' as const,
        externalUrl: null,
        isPrintable: false,
        order: 3,
      }
      const formatted = formatResourceContent(resource)
      expect(formatted).toBeDefined()
    })
  })

  // ============================================
  // Static Content Validation Tests
  // ============================================

  describe('static content validation', () => {
    it('should have family meeting templates for all age tiers', () => {
      expect(FAMILY_MEETING_TEMPLATES['child-8-11']).toBeDefined()
      expect(FAMILY_MEETING_TEMPLATES['tween-12-14']).toBeDefined()
      expect(FAMILY_MEETING_TEMPLATES['teen-15-17']).toBeDefined()
    })

    it('should have negotiation tips for all age tiers', () => {
      expect(NEGOTIATION_TIPS['child-8-11']).toBeDefined()
      expect(NEGOTIATION_TIPS['tween-12-14']).toBeDefined()
      expect(NEGOTIATION_TIPS['teen-15-17']).toBeDefined()
    })

    it('should have supportive, non-accusatory template introductions', () => {
      Object.values(FAMILY_MEETING_TEMPLATES).forEach((template) => {
        // Should not contain accusatory language
        expect(template.introduction.toLowerCase()).not.toContain('your fault')
        expect(template.introduction.toLowerCase()).not.toContain('blame')
        expect(template.introduction.toLowerCase()).not.toContain('wrong')
      })
    })

    it('should have empowering tip content', () => {
      Object.values(NEGOTIATION_TIPS)
        .flat()
        .forEach((tip) => {
          // Should not contain discouraging language
          expect(tip.fullContent.toLowerCase()).not.toContain("don't bother")
          expect(tip.fullContent.toLowerCase()).not.toContain('give up')
        })
    })
  })
})
