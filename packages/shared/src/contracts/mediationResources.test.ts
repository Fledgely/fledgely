/**
 * Mediation Resources Schema Tests - Story 34.5.2 Task 1
 *
 * Tests for mediation resource data structures.
 * AC2: Link to Family Communication Resources
 * AC3: Family Meeting Template Access
 * AC4: Age-Appropriate Negotiation Tips
 */

import { describe, it, expect } from 'vitest'
import {
  ageTierSchema,
  resourceTypeSchema,
  mediationResourceSchema,
  familyMeetingTemplateSchema,
  negotiationTipSchema,
  type AgeTier,
  type MediationResource,
  type FamilyMeetingTemplate,
  type NegotiationTip,
} from './mediationResources'

describe('mediationResources schemas - Story 34.5.2', () => {
  // ============================================
  // Age Tier Schema Tests
  // ============================================

  describe('ageTierSchema', () => {
    it('should accept child-8-11 tier', () => {
      const result = ageTierSchema.safeParse('child-8-11')
      expect(result.success).toBe(true)
      expect(result.data).toBe('child-8-11')
    })

    it('should accept tween-12-14 tier', () => {
      const result = ageTierSchema.safeParse('tween-12-14')
      expect(result.success).toBe(true)
      expect(result.data).toBe('tween-12-14')
    })

    it('should accept teen-15-17 tier', () => {
      const result = ageTierSchema.safeParse('teen-15-17')
      expect(result.success).toBe(true)
      expect(result.data).toBe('teen-15-17')
    })

    it('should reject invalid age tier', () => {
      const result = ageTierSchema.safeParse('adult')
      expect(result.success).toBe(false)
    })

    it('should reject empty string', () => {
      const result = ageTierSchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('should reject null', () => {
      const result = ageTierSchema.safeParse(null)
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Resource Type Schema Tests
  // ============================================

  describe('resourceTypeSchema', () => {
    it('should accept family-meeting-template type', () => {
      const result = resourceTypeSchema.safeParse('family-meeting-template')
      expect(result.success).toBe(true)
    })

    it('should accept negotiation-tips type', () => {
      const result = resourceTypeSchema.safeParse('negotiation-tips')
      expect(result.success).toBe(true)
    })

    it('should accept communication-guide type', () => {
      const result = resourceTypeSchema.safeParse('communication-guide')
      expect(result.success).toBe(true)
    })

    it('should accept external-resource type', () => {
      const result = resourceTypeSchema.safeParse('external-resource')
      expect(result.success).toBe(true)
    })

    it('should reject invalid resource type', () => {
      const result = resourceTypeSchema.safeParse('invalid-type')
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Mediation Resource Schema Tests
  // ============================================

  describe('mediationResourceSchema', () => {
    const validResource: MediationResource = {
      id: 'resource-1',
      type: 'negotiation-tips',
      title: 'How to Ask for More Time',
      description: 'Tips for negotiating screen time with parents',
      content: '## Tips\n\n1. Be respectful...',
      ageTier: 'tween-12-14',
      externalUrl: null,
      isPrintable: true,
      order: 1,
    }

    it('should accept valid mediation resource', () => {
      const result = mediationResourceSchema.safeParse(validResource)
      expect(result.success).toBe(true)
    })

    it('should accept resource with external URL', () => {
      const resourceWithUrl = {
        ...validResource,
        externalUrl: 'https://example.com/resource',
      }
      const result = mediationResourceSchema.safeParse(resourceWithUrl)
      expect(result.success).toBe(true)
    })

    it('should accept resource with order 0', () => {
      const resourceWithZeroOrder = {
        ...validResource,
        order: 0,
      }
      const result = mediationResourceSchema.safeParse(resourceWithZeroOrder)
      expect(result.success).toBe(true)
    })

    it('should reject resource with missing id', () => {
      const { id: _id, ...withoutId } = validResource
      const result = mediationResourceSchema.safeParse(withoutId)
      expect(result.success).toBe(false)
    })

    it('should reject resource with invalid type', () => {
      const invalidResource = {
        ...validResource,
        type: 'invalid',
      }
      const result = mediationResourceSchema.safeParse(invalidResource)
      expect(result.success).toBe(false)
    })

    it('should reject resource with invalid age tier', () => {
      const invalidResource = {
        ...validResource,
        ageTier: 'invalid-tier',
      }
      const result = mediationResourceSchema.safeParse(invalidResource)
      expect(result.success).toBe(false)
    })

    it('should reject resource with negative order', () => {
      const invalidResource = {
        ...validResource,
        order: -1,
      }
      const result = mediationResourceSchema.safeParse(invalidResource)
      expect(result.success).toBe(false)
    })

    it('should reject resource with invalid URL format', () => {
      const invalidResource = {
        ...validResource,
        externalUrl: 'not-a-url',
      }
      const result = mediationResourceSchema.safeParse(invalidResource)
      expect(result.success).toBe(false)
    })

    it('should accept resource for each age tier', () => {
      const tiers: AgeTier[] = ['child-8-11', 'tween-12-14', 'teen-15-17']
      for (const tier of tiers) {
        const resource = { ...validResource, ageTier: tier }
        const result = mediationResourceSchema.safeParse(resource)
        expect(result.success).toBe(true)
      }
    })
  })

  // ============================================
  // Family Meeting Template Schema Tests
  // ============================================

  describe('familyMeetingTemplateSchema', () => {
    const validTemplate: FamilyMeetingTemplate = {
      id: 'template-1',
      title: 'Family Agreement Discussion',
      introduction: "Let's have a calm conversation about our family agreement.",
      parentSection: {
        heading: 'Parent Concerns',
        prompts: [
          'What concerns do you have about the current agreement?',
          'What is most important to you?',
        ],
      },
      childSection: {
        heading: 'Child Concerns',
        prompts: ['What feels unfair about the current rules?', 'What would you like to change?'],
      },
      jointSection: {
        heading: 'Finding Common Ground',
        prompts: [
          'What compromises might work for both of you?',
          'What are you both willing to try?',
        ],
      },
      closingNotes: 'Remember, the goal is understanding, not winning.',
      ageTier: 'tween-12-14',
    }

    it('should accept valid family meeting template', () => {
      const result = familyMeetingTemplateSchema.safeParse(validTemplate)
      expect(result.success).toBe(true)
    })

    it('should accept template with empty prompts arrays', () => {
      const templateWithEmptyPrompts = {
        ...validTemplate,
        parentSection: {
          heading: 'Parent Concerns',
          prompts: [],
        },
      }
      const result = familyMeetingTemplateSchema.safeParse(templateWithEmptyPrompts)
      expect(result.success).toBe(true)
    })

    it('should accept template for child-8-11 tier', () => {
      const childTemplate = {
        ...validTemplate,
        ageTier: 'child-8-11',
      }
      const result = familyMeetingTemplateSchema.safeParse(childTemplate)
      expect(result.success).toBe(true)
    })

    it('should accept template for teen-15-17 tier', () => {
      const teenTemplate = {
        ...validTemplate,
        ageTier: 'teen-15-17',
      }
      const result = familyMeetingTemplateSchema.safeParse(teenTemplate)
      expect(result.success).toBe(true)
    })

    it('should reject template with missing parent section', () => {
      const { parentSection: _parentSection, ...withoutParentSection } = validTemplate
      const result = familyMeetingTemplateSchema.safeParse(withoutParentSection)
      expect(result.success).toBe(false)
    })

    it('should reject template with missing child section', () => {
      const { childSection: _childSection, ...withoutChildSection } = validTemplate
      const result = familyMeetingTemplateSchema.safeParse(withoutChildSection)
      expect(result.success).toBe(false)
    })

    it('should reject template with missing joint section', () => {
      const { jointSection: _jointSection, ...withoutJointSection } = validTemplate
      const result = familyMeetingTemplateSchema.safeParse(withoutJointSection)
      expect(result.success).toBe(false)
    })

    it('should reject template with invalid age tier', () => {
      const invalidTemplate = {
        ...validTemplate,
        ageTier: 'invalid',
      }
      const result = familyMeetingTemplateSchema.safeParse(invalidTemplate)
      expect(result.success).toBe(false)
    })

    it('should reject template with missing heading in section', () => {
      const invalidTemplate = {
        ...validTemplate,
        parentSection: {
          prompts: ['Some prompt'],
        },
      }
      const result = familyMeetingTemplateSchema.safeParse(invalidTemplate)
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Negotiation Tip Schema Tests
  // ============================================

  describe('negotiationTipSchema', () => {
    const validTip: NegotiationTip = {
      id: 'tip-1',
      title: 'Pick the Right Time',
      shortDescription: 'Wait for a calm moment to talk',
      fullContent: "Don't ask for changes when your parents are busy or stressed.",
      ageTier: 'child-8-11',
      order: 1,
    }

    it('should accept valid negotiation tip', () => {
      const result = negotiationTipSchema.safeParse(validTip)
      expect(result.success).toBe(true)
    })

    it('should accept tip for tween tier', () => {
      const tweenTip = {
        ...validTip,
        ageTier: 'tween-12-14',
      }
      const result = negotiationTipSchema.safeParse(tweenTip)
      expect(result.success).toBe(true)
    })

    it('should accept tip for teen tier', () => {
      const teenTip = {
        ...validTip,
        ageTier: 'teen-15-17',
      }
      const result = negotiationTipSchema.safeParse(teenTip)
      expect(result.success).toBe(true)
    })

    it('should accept tip with order 0', () => {
      const tipWithZeroOrder = {
        ...validTip,
        order: 0,
      }
      const result = negotiationTipSchema.safeParse(tipWithZeroOrder)
      expect(result.success).toBe(true)
    })

    it('should reject tip with missing title', () => {
      const { title: _title, ...withoutTitle } = validTip
      const result = negotiationTipSchema.safeParse(withoutTitle)
      expect(result.success).toBe(false)
    })

    it('should reject tip with negative order', () => {
      const invalidTip = {
        ...validTip,
        order: -1,
      }
      const result = negotiationTipSchema.safeParse(invalidTip)
      expect(result.success).toBe(false)
    })

    it('should reject tip with invalid age tier', () => {
      const invalidTip = {
        ...validTip,
        ageTier: 'adult',
      }
      const result = negotiationTipSchema.safeParse(invalidTip)
      expect(result.success).toBe(false)
    })
  })
})
