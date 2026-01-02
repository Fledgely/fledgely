/**
 * Graduation Conversation Template Service Tests - Story 38.2 Task 4
 *
 * Tests for conversation template generation.
 * AC5: Conversation template provided with discussion points
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_GRADUATION_TEMPLATE,
  getDefaultTemplate,
  getTemplateById,
  getDiscussionPointsForViewer,
  getRequiredDiscussionPoints,
  getOptionalDiscussionPoints,
  getSuggestedQuestions,
  getResources,
  getIntroduction,
  getClosingMessage,
  getDiscussionPointByTopic,
  getDiscussionPointCount,
  getTemplateSummary,
  formatAsChecklist,
  getPrintableTemplate,
} from './graduationConversationTemplateService'

describe('GraduationConversationTemplateService - Story 38.2 Task 4', () => {
  describe('DEFAULT_GRADUATION_TEMPLATE', () => {
    it('should have valid structure', () => {
      expect(DEFAULT_GRADUATION_TEMPLATE.id).toBe('default')
      expect(DEFAULT_GRADUATION_TEMPLATE.title).toBeDefined()
      expect(DEFAULT_GRADUATION_TEMPLATE.introduction).toBeDefined()
      expect(DEFAULT_GRADUATION_TEMPLATE.discussionPoints.length).toBeGreaterThan(0)
      expect(DEFAULT_GRADUATION_TEMPLATE.suggestedQuestions.length).toBeGreaterThan(0)
      expect(DEFAULT_GRADUATION_TEMPLATE.resources.length).toBeGreaterThan(0)
    })

    it('should have discussion points with both child and parent prompts', () => {
      DEFAULT_GRADUATION_TEMPLATE.discussionPoints.forEach((point) => {
        expect(point.topic).toBeDefined()
        expect(point.forChild).toBeDefined()
        expect(point.forParent).toBeDefined()
        expect(typeof point.optional).toBe('boolean')
      })
    })

    it('should have resources with required fields', () => {
      DEFAULT_GRADUATION_TEMPLATE.resources.forEach((resource) => {
        expect(resource.title).toBeDefined()
        expect(resource.url).toBeDefined()
      })
    })
  })

  describe('getDefaultTemplate', () => {
    it('should return the default template', () => {
      const template = getDefaultTemplate()

      expect(template.id).toBe('default')
      expect(template).toEqual(DEFAULT_GRADUATION_TEMPLATE)
    })
  })

  describe('getTemplateById', () => {
    it('should return default template', () => {
      const template = getTemplateById('default')

      expect(template).not.toBeNull()
      expect(template?.id).toBe('default')
    })

    it('should return null for unknown template', () => {
      const template = getTemplateById('unknown')

      expect(template).toBeNull()
    })
  })

  describe('getDiscussionPointsForViewer', () => {
    it('should return child prompts for child viewer', () => {
      const template = getDefaultTemplate()
      const points = getDiscussionPointsForViewer(template, 'child')

      expect(points.length).toBeGreaterThan(0)
      points.forEach((point) => {
        expect(point.prompt).toBeTruthy()
        expect(point.topic).toBeTruthy()
      })

      // Check first point uses child prompt
      const firstOriginal = template.discussionPoints[0]
      const firstFormatted = points[0]
      expect(firstFormatted.prompt).toBe(firstOriginal.forChild)
    })

    it('should return parent prompts for parent viewer', () => {
      const template = getDefaultTemplate()
      const points = getDiscussionPointsForViewer(template, 'parent')

      // Check first point uses parent prompt
      const firstOriginal = template.discussionPoints[0]
      const firstFormatted = points[0]
      expect(firstFormatted.prompt).toBe(firstOriginal.forParent)
    })

    it('should preserve optional flag', () => {
      const template = getDefaultTemplate()
      const points = getDiscussionPointsForViewer(template, 'child')

      const optionalPoints = points.filter((p) => p.optional)
      const requiredPoints = points.filter((p) => !p.optional)

      expect(optionalPoints.length).toBeGreaterThan(0)
      expect(requiredPoints.length).toBeGreaterThan(0)
    })
  })

  describe('getRequiredDiscussionPoints', () => {
    it('should return only required points', () => {
      const template = getDefaultTemplate()
      const required = getRequiredDiscussionPoints(template)

      expect(required.length).toBeGreaterThan(0)
      required.forEach((point) => {
        expect(point.optional).toBe(false)
      })
    })
  })

  describe('getOptionalDiscussionPoints', () => {
    it('should return only optional points', () => {
      const template = getDefaultTemplate()
      const optional = getOptionalDiscussionPoints(template)

      expect(optional.length).toBeGreaterThan(0)
      optional.forEach((point) => {
        expect(point.optional).toBe(true)
      })
    })
  })

  describe('getSuggestedQuestions', () => {
    it('should return suggested questions', () => {
      const template = getDefaultTemplate()
      const questions = getSuggestedQuestions(template)

      expect(questions.length).toBeGreaterThan(0)
      questions.forEach((q) => {
        expect(typeof q).toBe('string')
        expect(q.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getResources', () => {
    it('should return resources', () => {
      const template = getDefaultTemplate()
      const resources = getResources(template)

      expect(resources.length).toBeGreaterThan(0)
      resources.forEach((r) => {
        expect(r.title).toBeTruthy()
        expect(r.url).toBeTruthy()
      })
    })
  })

  describe('getIntroduction', () => {
    it('should return introduction for child', () => {
      const template = getDefaultTemplate()
      const intro = getIntroduction(template, 'child')

      expect(intro).toBe(template.introduction)
    })

    it('should personalize introduction for parent with child name', () => {
      const template = getDefaultTemplate()
      const intro = getIntroduction(template, 'parent', 'Emma')

      expect(intro).toContain('Emma')
    })

    it('should return default for parent without child name', () => {
      const template = getDefaultTemplate()
      const intro = getIntroduction(template, 'parent')

      expect(intro).toBe(template.introduction)
    })
  })

  describe('getClosingMessage', () => {
    it('should return closing message for child', () => {
      const template = getDefaultTemplate()
      const closing = getClosingMessage(template, 'child')

      expect(closing).toBe(template.closingMessage)
    })

    it('should personalize closing for parent with child name', () => {
      const template = getDefaultTemplate()
      const closing = getClosingMessage(template, 'parent', 'Emma')

      expect(closing).toContain('Emma')
    })
  })

  describe('getDiscussionPointByTopic', () => {
    it('should find point by exact topic', () => {
      const template = getDefaultTemplate()
      const point = getDiscussionPointByTopic(template, 'Celebrating Achievement')

      expect(point).not.toBeNull()
      expect(point?.topic).toBe('Celebrating Achievement')
    })

    it('should find point case-insensitively', () => {
      const template = getDefaultTemplate()
      const point = getDiscussionPointByTopic(template, 'celebrating achievement')

      expect(point).not.toBeNull()
    })

    it('should return null for unknown topic', () => {
      const template = getDefaultTemplate()
      const point = getDiscussionPointByTopic(template, 'Unknown Topic')

      expect(point).toBeNull()
    })
  })

  describe('getDiscussionPointCount', () => {
    it('should return correct counts', () => {
      const template = getDefaultTemplate()
      const counts = getDiscussionPointCount(template)

      expect(counts.total).toBe(template.discussionPoints.length)
      expect(counts.required + counts.optional).toBe(counts.total)
      expect(counts.required).toBeGreaterThan(0)
    })
  })

  describe('getTemplateSummary', () => {
    it('should return summary for child', () => {
      const template = getDefaultTemplate()
      const summary = getTemplateSummary(template, 'child')

      expect(summary.title).toBe(template.title)
      expect(summary.introduction).toBe(template.introduction)
      expect(summary.pointCount).toBe(template.discussionPoints.length)
      expect(summary.questionCount).toBe(template.suggestedQuestions.length)
      expect(summary.resourceCount).toBe(template.resources.length)
    })

    it('should personalize summary for parent with child name', () => {
      const template = getDefaultTemplate()
      const summary = getTemplateSummary(template, 'parent', 'Emma')

      expect(summary.introduction).toContain('Emma')
    })
  })

  describe('formatAsChecklist', () => {
    it('should format for child viewer', () => {
      const template = getDefaultTemplate()
      const checklist = formatAsChecklist(template, 'child')

      expect(checklist.length).toBe(template.discussionPoints.length)
      checklist.forEach((item) => {
        expect(item.topic).toBeTruthy()
        expect(item.prompt).toBeTruthy()
        expect(typeof item.isRequired).toBe('boolean')
      })
    })

    it('should use child prompts for child viewer', () => {
      const template = getDefaultTemplate()
      const checklist = formatAsChecklist(template, 'child')

      expect(checklist[0].prompt).toBe(template.discussionPoints[0].forChild)
    })

    it('should use parent prompts for parent viewer', () => {
      const template = getDefaultTemplate()
      const checklist = formatAsChecklist(template, 'parent')

      expect(checklist[0].prompt).toBe(template.discussionPoints[0].forParent)
    })
  })

  describe('getPrintableTemplate', () => {
    it('should generate printable markdown', () => {
      const template = getDefaultTemplate()
      const printable = getPrintableTemplate(template, 'Emma')

      expect(printable).toContain('# Graduation Conversation Guide')
      expect(printable).toContain('Emma')
      expect(printable).toContain('Discussion Points')
      expect(printable).toContain('Suggested Questions')
      expect(printable).toContain('Resources')
    })

    it('should include all discussion points', () => {
      const template = getDefaultTemplate()
      const printable = getPrintableTemplate(template, 'Emma')

      template.discussionPoints.forEach((point) => {
        expect(printable).toContain(point.topic)
      })
    })

    it('should mark required and optional points', () => {
      const template = getDefaultTemplate()
      const printable = getPrintableTemplate(template, 'Emma')

      expect(printable).toContain('(Required)')
      expect(printable).toContain('(Optional)')
    })

    it('should include suggested questions', () => {
      const template = getDefaultTemplate()
      const printable = getPrintableTemplate(template, 'Emma')

      template.suggestedQuestions.forEach((q) => {
        expect(printable).toContain(q)
      })
    })
  })

  describe('AC Verification', () => {
    describe('AC5: Conversation template provided with discussion points', () => {
      it('should have meaningful discussion points', () => {
        const template = getDefaultTemplate()

        // Should cover key topics
        const topics = template.discussionPoints.map((p) => p.topic.toLowerCase())
        expect(topics.some((t) => t.includes('achievement') || t.includes('celebrat'))).toBe(true)
        expect(topics.some((t) => t.includes('independence') || t.includes('readiness'))).toBe(true)
        expect(topics.some((t) => t.includes('support'))).toBe(true)
      })

      it('should have different prompts for child vs parent', () => {
        const template = getDefaultTemplate()

        template.discussionPoints.forEach((point) => {
          // Prompts should be different
          expect(point.forChild).not.toBe(point.forParent)
        })
      })

      it('should have suggested questions', () => {
        const template = getDefaultTemplate()

        expect(template.suggestedQuestions.length).toBeGreaterThanOrEqual(5)
      })

      it('should have resources for post-graduation', () => {
        const template = getDefaultTemplate()

        const hasIndependenceResource = template.resources.some(
          (r) =>
            r.title.toLowerCase().includes('independence') ||
            r.url.toLowerCase().includes('independence')
        )
        expect(hasIndependenceResource).toBe(true)
      })
    })

    describe('Template Content Quality', () => {
      it('should use positive, celebratory language', () => {
        const template = getDefaultTemplate()
        const celebratingPoint = getDiscussionPointByTopic(template, 'Celebrating Achievement')

        expect(celebratingPoint).not.toBeNull()
        expect(celebratingPoint?.forChild).toContain('proud')
        expect(celebratingPoint?.forParent).toContain('pride')
      })

      it('should focus on growth and future', () => {
        const template = getDefaultTemplate()

        expect(template.closingMessage).toContain('beginning')
        expect(template.closingMessage).toContain('new chapter')
      })

      it('should not use punitive language', () => {
        const template = getDefaultTemplate()
        const allText =
          template.introduction +
          template.closingMessage +
          template.discussionPoints.map((p) => p.forChild + p.forParent).join(' ')

        expect(allText.toLowerCase()).not.toContain('punishment')
        expect(allText.toLowerCase()).not.toContain('failed')
        expect(allText.toLowerCase()).not.toContain('must')
      })
    })
  })
})
