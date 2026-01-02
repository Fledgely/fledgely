/**
 * Confirmation Content Service Tests - Story 7.5.3 Task 3
 *
 * Tests for child-appropriate confirmation content.
 * AC1: Discrete confirmation display
 * AC5: Emergency 911 message
 * AC6: Child-appropriate language (6th-grade reading level)
 *
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect } from 'vitest'
import {
  // Content generation
  getConfirmationContent,
  getAgeAdjustedContent,
  getOfflineConfirmationContent,
  getJurisdictionContent,
  // Reading level validation
  validateReadingLevel,
  calculateReadingLevel,
  isChildAppropriate,
  containsScaryTerminology,
  // Language customization
  getLocalizedEmergencyText,
  getChildFriendlyText,
  simplifyText,
  // Content constants
  DEFAULT_CONTENT,
  AGE_BRACKETS,
  SCARY_TERMS,
  GRADE_LEVEL_THRESHOLDS,
} from './confirmationContentService'
import { type ConfirmationContent } from '../contracts/signalConfirmation'

describe('Confirmation Content Service', () => {
  // ============================================
  // Content Generation Tests
  // ============================================

  describe('getConfirmationContent', () => {
    it('should return default confirmation content', () => {
      const content = getConfirmationContent()

      expect(content.headerText).toBe('Someone will reach out')
      expect(content.bodyText).toContain('right thing')
      expect(content.emergencyText).toContain('911')
      expect(content.chatPromptText).toBe('Chat with someone now')
      expect(content.dismissButtonText).toBe('Got it')
    })

    it('should return content at 6th grade reading level or below', () => {
      const content = getConfirmationContent()

      expect(validateReadingLevel(content.headerText, 6)).toBe(true)
      expect(validateReadingLevel(content.bodyText, 6)).toBe(true)
      expect(validateReadingLevel(content.emergencyText, 6)).toBe(true)
    })

    it('should allow custom jurisdiction', () => {
      const usContent = getConfirmationContent('US')
      const ukContent = getConfirmationContent('UK')

      expect(usContent.emergencyText).toContain('911')
      expect(ukContent.emergencyText).toContain('999')
    })
  })

  describe('getAgeAdjustedContent', () => {
    it('should return simpler content for younger children (6-8)', () => {
      const content = getAgeAdjustedContent(7, 'US')

      expect(content.headerText.length).toBeLessThanOrEqual(30)
      expect(content.bodyText.split(' ').length).toBeLessThan(15)
    })

    it('should return standard content for middle children (9-12)', () => {
      const content = getAgeAdjustedContent(10, 'US')

      expect(content.headerText).toBe('Someone will reach out')
      expect(content.bodyText).toContain('right thing')
    })

    it('should return slightly more detailed content for teens (13-17)', () => {
      const content = getAgeAdjustedContent(15, 'US')

      expect(content.bodyText.length).toBeGreaterThan(20)
    })

    it('should always be at appropriate reading level regardless of age', () => {
      const ages = [6, 9, 12, 15, 17]

      for (const age of ages) {
        const content = getAgeAdjustedContent(age, 'US')
        // All content should be at 8th grade or below even for older kids
        expect(validateReadingLevel(content.bodyText, 8)).toBe(true)
      }
    })

    it('should include appropriate emergency number for jurisdiction', () => {
      const usContent = getAgeAdjustedContent(10, 'US')
      const ukContent = getAgeAdjustedContent(10, 'UK')
      const auContent = getAgeAdjustedContent(10, 'AU')

      expect(usContent.emergencyText).toContain('911')
      expect(ukContent.emergencyText).toContain('999')
      expect(auContent.emergencyText).toContain('000')
    })
  })

  describe('getOfflineConfirmationContent', () => {
    it('should indicate message is saved', () => {
      const content = getOfflineConfirmationContent()

      expect(content.bodyText.toLowerCase()).toContain('saved')
    })

    it('should mention will be sent when online', () => {
      const content = getOfflineConfirmationContent()

      expect(content.bodyText.toLowerCase()).toContain('online')
    })

    it('should still include emergency message', () => {
      const content = getOfflineConfirmationContent()

      expect(content.emergencyText).toBeTruthy()
      expect(content.emergencyText.length).toBeGreaterThan(0)
    })

    it('should be at appropriate reading level', () => {
      const content = getOfflineConfirmationContent()

      expect(validateReadingLevel(content.headerText, 6)).toBe(true)
      expect(validateReadingLevel(content.bodyText, 6)).toBe(true)
    })
  })

  describe('getJurisdictionContent', () => {
    it('should return US-specific content', () => {
      const content = getJurisdictionContent('US')
      expect(content.emergencyText).toContain('911')
    })

    it('should return UK-specific content', () => {
      const content = getJurisdictionContent('UK')
      expect(content.emergencyText).toContain('999')
    })

    it('should return CA-specific content', () => {
      const content = getJurisdictionContent('CA')
      expect(content.emergencyText).toContain('911')
    })

    it('should return AU-specific content', () => {
      const content = getJurisdictionContent('AU')
      expect(content.emergencyText).toContain('000')
    })

    it('should fall back to generic content for unknown jurisdiction', () => {
      const content = getJurisdictionContent('ZZ')
      expect(content.emergencyText).toBeTruthy()
    })
  })

  // ============================================
  // Reading Level Validation Tests
  // ============================================

  describe('validateReadingLevel', () => {
    it('should accept simple sentences', () => {
      expect(validateReadingLevel('Help is on the way.', 6)).toBe(true)
      expect(validateReadingLevel('Someone will help you soon.', 6)).toBe(true)
    })

    it('should accept empty text', () => {
      expect(validateReadingLevel('', 6)).toBe(true)
    })

    it('should reject complex clinical language', () => {
      const complexText =
        'The psychological intervention necessitates immediate psychotherapeutic evaluation.'
      expect(validateReadingLevel(complexText, 6)).toBe(false)
    })

    it('should handle text with numbers', () => {
      expect(validateReadingLevel('Call 911 if you need help.', 6)).toBe(true)
    })

    it('should accept default content at grade 6', () => {
      expect(validateReadingLevel('Someone will reach out', 6)).toBe(true)
      expect(validateReadingLevel('You did the right thing by asking for help.', 6)).toBe(true)
    })
  })

  describe('calculateReadingLevel', () => {
    it('should return low grade level for simple text', () => {
      const level = calculateReadingLevel('Help is here. You are safe.')
      expect(level).toBeLessThan(6)
    })

    it('should return higher grade level for complex text', () => {
      const level = calculateReadingLevel(
        'The exigent circumstances necessitate immediate psychotherapeutic intervention protocols.'
      )
      expect(level).toBeGreaterThan(8)
    })

    it('should return 0 for empty text', () => {
      const level = calculateReadingLevel('')
      expect(level).toBe(0)
    })

    it('should handle single word', () => {
      const level = calculateReadingLevel('Help')
      expect(level).toBeGreaterThanOrEqual(0)
    })
  })

  describe('isChildAppropriate', () => {
    it('should return true for child-friendly content', () => {
      const content: ConfirmationContent = {
        headerText: 'Someone will reach out',
        bodyText: 'You did the right thing.',
        emergencyText: 'Call 911 if you need help now.',
        chatPromptText: 'Chat with someone now',
        dismissButtonText: 'Got it',
      }

      expect(isChildAppropriate(content)).toBe(true)
    })

    it('should return false if any field contains scary terms', () => {
      const content: ConfirmationContent = {
        headerText: 'Crisis detected',
        bodyText: 'Suicide prevention resources.',
        emergencyText: 'Call 911.',
        chatPromptText: 'Chat now',
        dismissButtonText: 'OK',
      }

      expect(isChildAppropriate(content)).toBe(false)
    })

    it('should return false if reading level is too high', () => {
      const content: ConfirmationContent = {
        headerText: 'Intervention Required',
        bodyText:
          'The psychological manifestation necessitates immediate professional intervention.',
        emergencyText: 'Contact emergency services.',
        chatPromptText: 'Chat',
        dismissButtonText: 'OK',
      }

      expect(isChildAppropriate(content)).toBe(false)
    })
  })

  describe('containsScaryTerminology', () => {
    it('should detect suicide-related terms', () => {
      expect(containsScaryTerminology('suicide prevention')).toBe(true)
      expect(containsScaryTerminology('suicidal thoughts')).toBe(true)
    })

    it('should detect death-related terms', () => {
      expect(containsScaryTerminology('death is imminent')).toBe(true)
      expect(containsScaryTerminology('you might die')).toBe(true)
    })

    it('should detect abuse-related terms', () => {
      expect(containsScaryTerminology('child abuse hotline')).toBe(true)
      expect(containsScaryTerminology('abuser identification')).toBe(true)
    })

    it('should not flag normal help language', () => {
      expect(containsScaryTerminology('Someone will help you.')).toBe(false)
      expect(containsScaryTerminology('You are safe now.')).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(containsScaryTerminology('SUICIDE')).toBe(true)
      expect(containsScaryTerminology('Suicide')).toBe(true)
    })

    it('should not flag words that contain scary terms as substrings incorrectly', () => {
      // 'kill' might be in 'skill' but should not flag
      expect(containsScaryTerminology('That was a great skill!')).toBe(false)
    })
  })

  // ============================================
  // Language Customization Tests
  // ============================================

  describe('getLocalizedEmergencyText', () => {
    it('should return 911 text for US', () => {
      const text = getLocalizedEmergencyText('US')
      expect(text).toContain('911')
    })

    it('should return 999 text for UK', () => {
      const text = getLocalizedEmergencyText('UK')
      expect(text).toContain('999')
    })

    it('should return 000 text for AU', () => {
      const text = getLocalizedEmergencyText('AU')
      expect(text).toContain('000')
    })

    it('should return 112 text for EU countries', () => {
      const text = getLocalizedEmergencyText('DE')
      expect(text).toContain('112')
    })

    it('should be at appropriate reading level', () => {
      const usText = getLocalizedEmergencyText('US')
      expect(validateReadingLevel(usText, 6)).toBe(true)
    })
  })

  describe('getChildFriendlyText', () => {
    it('should replace clinical terms with friendly alternatives', () => {
      const friendly = getChildFriendlyText('crisis intervention')
      expect(friendly.toLowerCase()).not.toContain('crisis')
      expect(friendly.toLowerCase()).not.toContain('intervention')
    })

    it('should keep already-friendly text unchanged', () => {
      const friendly = getChildFriendlyText('Help is on the way.')
      expect(friendly).toBe('Help is on the way.')
    })
  })

  describe('simplifyText', () => {
    it('should simplify complex sentences', () => {
      const complex = 'An individual will contact you momentarily.'
      const simple = simplifyText(complex)
      expect(simple.split(' ').length).toBeLessThanOrEqual(complex.split(' ').length)
    })

    it('should not change already simple text', () => {
      const simple = 'Help is here.'
      const result = simplifyText(simple)
      expect(result).toBe(simple)
    })

    it('should reduce reading level', () => {
      const complex = 'The professional counselor will communicate with you shortly.'
      const simple = simplifyText(complex)

      const complexLevel = calculateReadingLevel(complex)
      const simpleLevel = calculateReadingLevel(simple)

      expect(simpleLevel).toBeLessThanOrEqual(complexLevel)
    })
  })

  // ============================================
  // Constants Tests
  // ============================================

  describe('DEFAULT_CONTENT', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_CONTENT.headerText).toBeTruthy()
      expect(DEFAULT_CONTENT.bodyText).toBeTruthy()
      expect(DEFAULT_CONTENT.emergencyText).toBeTruthy()
      expect(DEFAULT_CONTENT.chatPromptText).toBeTruthy()
      expect(DEFAULT_CONTENT.dismissButtonText).toBeTruthy()
    })

    it('should be at appropriate reading level', () => {
      expect(validateReadingLevel(DEFAULT_CONTENT.headerText, 6)).toBe(true)
      expect(validateReadingLevel(DEFAULT_CONTENT.bodyText, 6)).toBe(true)
    })
  })

  describe('AGE_BRACKETS', () => {
    it('should define young child age range', () => {
      expect(AGE_BRACKETS.YOUNG_CHILD.min).toBe(6)
      expect(AGE_BRACKETS.YOUNG_CHILD.max).toBe(8)
    })

    it('should define middle child age range', () => {
      expect(AGE_BRACKETS.MIDDLE_CHILD.min).toBe(9)
      expect(AGE_BRACKETS.MIDDLE_CHILD.max).toBe(12)
    })

    it('should define teen age range', () => {
      expect(AGE_BRACKETS.TEEN.min).toBe(13)
      expect(AGE_BRACKETS.TEEN.max).toBe(17)
    })
  })

  describe('SCARY_TERMS', () => {
    it('should include critical terms to avoid', () => {
      expect(SCARY_TERMS).toContain('suicide')
      expect(SCARY_TERMS).toContain('death')
      expect(SCARY_TERMS).toContain('abuse')
    })

    it('should not include help-related terms', () => {
      expect(SCARY_TERMS).not.toContain('help')
      expect(SCARY_TERMS).not.toContain('safe')
      expect(SCARY_TERMS).not.toContain('support')
    })
  })

  describe('GRADE_LEVEL_THRESHOLDS', () => {
    it('should define max grade level for child content', () => {
      expect(GRADE_LEVEL_THRESHOLDS.CHILD_MAX).toBe(6)
    })

    it('should define max grade level for teen content', () => {
      expect(GRADE_LEVEL_THRESHOLDS.TEEN_MAX).toBe(8)
    })
  })
})
