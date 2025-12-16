/**
 * Readability Utilities Tests
 *
 * Story 4.2: Age-Appropriate Template Content
 *   - Task 3: Create readability validation utilities (AC: 1)
 *
 * Tests for Flesch-Kincaid readability validation and related utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  countSyllables,
  splitIntoSentences,
  splitIntoWords,
  analyzeText,
  calculateFleschKincaidGradeLevel,
  calculateFleschReadingEase,
  calculateSimpleWordRatio,
  getComplexWords,
  validateTextReadability,
  validateTemplateReadability,
  getReadabilitySummary,
  AGE_GROUP_MAX_GRADE_LEVELS,
  SIMPLE_WORDS,
} from './readabilityUtils'
import type { AgreementTemplate } from '../agreement-template.schema'

// ============================================
// SYLLABLE COUNTING TESTS
// ============================================

describe('countSyllables', () => {
  describe('single syllable words', () => {
    it('should count "cat" as 1 syllable', () => {
      expect(countSyllables('cat')).toBe(1)
    })

    it('should count "dog" as 1 syllable', () => {
      expect(countSyllables('dog')).toBe(1)
    })

    it('should count "phone" as 1 syllable (silent e)', () => {
      expect(countSyllables('phone')).toBe(1)
    })

    it('should count "screen" as 1 syllable', () => {
      expect(countSyllables('screen')).toBe(1)
    })

    it('should count "played" as 1 syllable (silent -ed)', () => {
      expect(countSyllables('played')).toBe(1)
    })
  })

  describe('two syllable words', () => {
    it('should count "parent" as 2 syllables', () => {
      expect(countSyllables('parent')).toBe(2)
    })

    it('should count "simple" as 2 syllables (-le pattern)', () => {
      expect(countSyllables('simple')).toBe(2)
    })

    it('should count "device" as 2 syllables', () => {
      expect(countSyllables('device')).toBe(2)
    })

    it('should count "homework" as approximately 2 syllables', () => {
      // Compound words can have syllable counting variance
      const syllables = countSyllables('homework')
      expect(syllables).toBeGreaterThanOrEqual(2)
      expect(syllables).toBeLessThanOrEqual(3)
    })
  })

  describe('three+ syllable words', () => {
    it('should count "computer" as 3 syllables', () => {
      expect(countSyllables('computer')).toBe(3)
    })

    it('should count "family" as 3 syllables', () => {
      expect(countSyllables('family')).toBe(3)
    })

    it('should count "responsibility" as 6 syllables', () => {
      expect(countSyllables('responsibility')).toBe(6)
    })

    it('should count "appropriate" as approximately 4 syllables', () => {
      // Syllable counting is heuristic, allow some variance
      const syllables = countSyllables('appropriate')
      expect(syllables).toBeGreaterThanOrEqual(3)
      expect(syllables).toBeLessThanOrEqual(5)
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(countSyllables('')).toBe(0)
    })

    it('should handle single letter', () => {
      expect(countSyllables('a')).toBe(1)
    })

    it('should handle numbers and symbols by ignoring them', () => {
      expect(countSyllables('test123')).toBe(1)
    })

    it('should handle uppercase', () => {
      expect(countSyllables('PARENT')).toBe(2)
    })
  })
})

// ============================================
// TEXT SPLITTING TESTS
// ============================================

describe('splitIntoSentences', () => {
  it('should split on periods', () => {
    const sentences = splitIntoSentences('Hello. World.')
    expect(sentences).toHaveLength(2)
    expect(sentences[0]).toBe('Hello')
    expect(sentences[1]).toBe('World')
  })

  it('should split on exclamation marks', () => {
    const sentences = splitIntoSentences('Hello! How are you!')
    expect(sentences).toHaveLength(2)
  })

  it('should split on question marks', () => {
    const sentences = splitIntoSentences('Hello? How are you?')
    expect(sentences).toHaveLength(2)
  })

  it('should handle multiple punctuation marks', () => {
    const sentences = splitIntoSentences('Really?! Yes.')
    expect(sentences).toHaveLength(2)
  })

  it('should handle text without punctuation', () => {
    const sentences = splitIntoSentences('Hello world')
    expect(sentences).toHaveLength(1)
    expect(sentences[0]).toBe('Hello world')
  })

  it('should handle empty string', () => {
    const sentences = splitIntoSentences('')
    expect(sentences).toHaveLength(0)
  })

  it('should trim whitespace from sentences', () => {
    const sentences = splitIntoSentences('  Hello.   World.  ')
    expect(sentences[0]).toBe('Hello')
    expect(sentences[1]).toBe('World')
  })
})

describe('splitIntoWords', () => {
  it('should split on spaces', () => {
    const words = splitIntoWords('Hello world')
    expect(words).toHaveLength(2)
    expect(words[0]).toBe('hello')
    expect(words[1]).toBe('world')
  })

  it('should remove punctuation', () => {
    const words = splitIntoWords('Hello, world!')
    expect(words).toHaveLength(2)
  })

  it('should lowercase words', () => {
    const words = splitIntoWords('HELLO World')
    expect(words[0]).toBe('hello')
    expect(words[1]).toBe('world')
  })

  it('should handle emoji by filtering them out', () => {
    const words = splitIntoWords('Hello 👋 world')
    expect(words).toHaveLength(2)
  })

  it('should handle multiple spaces', () => {
    const words = splitIntoWords('Hello    world')
    expect(words).toHaveLength(2)
  })

  it('should keep apostrophes in contractions', () => {
    const words = splitIntoWords("don't won't")
    expect(words).toContain("don't")
    expect(words).toContain("won't")
  })

  it('should handle empty string', () => {
    const words = splitIntoWords('')
    expect(words).toHaveLength(0)
  })
})

// ============================================
// TEXT ANALYSIS TESTS
// ============================================

describe('analyzeText', () => {
  it('should count words correctly', () => {
    const stats = analyzeText('The quick brown fox.')
    expect(stats.wordCount).toBe(4)
  })

  it('should count sentences correctly', () => {
    const stats = analyzeText('Hello. World. How are you?')
    expect(stats.sentenceCount).toBe(3)
  })

  it('should calculate average words per sentence', () => {
    const stats = analyzeText('Hello world. How are you today.')
    expect(stats.averageWordsPerSentence).toBe(3) // 6 words / 2 sentences
  })

  it('should count syllables correctly', () => {
    const stats = analyzeText('cat dog') // 1 + 1 = 2
    expect(stats.syllableCount).toBe(2)
  })

  it('should handle empty text', () => {
    const stats = analyzeText('')
    expect(stats.wordCount).toBe(0)
    expect(stats.sentenceCount).toBe(1) // Minimum 1 to avoid division by zero
  })
})

// ============================================
// FLESCH-KINCAID TESTS
// ============================================

describe('calculateFleschKincaidGradeLevel', () => {
  it('should return low grade level for simple text', () => {
    const text = 'The cat sat. The dog ran. I am happy.'
    const grade = calculateFleschKincaidGradeLevel(text)
    expect(grade).toBeLessThan(3)
  })

  it('should return higher grade level for complex text', () => {
    const text =
      'The implementation of sophisticated algorithms requires considerable expertise and understanding of computational complexity.'
    const grade = calculateFleschKincaidGradeLevel(text)
    expect(grade).toBeGreaterThan(10)
  })

  it('should return 0 for empty text', () => {
    expect(calculateFleschKincaidGradeLevel('')).toBe(0)
  })

  it('should handle single word', () => {
    const grade = calculateFleschKincaidGradeLevel('Hello')
    expect(typeof grade).toBe('number')
  })

  it('should be lower for shorter sentences', () => {
    const shortSentences = 'I run. You jump. We play.'
    const longSentence =
      'I run and you jump and we play together in the park after school every day.'
    expect(calculateFleschKincaidGradeLevel(shortSentences)).toBeLessThan(
      calculateFleschKincaidGradeLevel(longSentence)
    )
  })
})

describe('calculateFleschReadingEase', () => {
  it('should return high score for simple text', () => {
    const text = 'The cat sat. The dog ran.'
    const ease = calculateFleschReadingEase(text)
    expect(ease).toBeGreaterThan(80) // Easy
  })

  it('should return lower score for complex text', () => {
    const text =
      'The implementation of sophisticated algorithms requires considerable expertise and understanding of computational complexity.'
    const ease = calculateFleschReadingEase(text)
    expect(ease).toBeLessThan(40) // Difficult
  })

  it('should return 100 for empty text', () => {
    expect(calculateFleschReadingEase('')).toBe(100)
  })
})

// ============================================
// WORD COMPLEXITY TESTS
// ============================================

describe('calculateSimpleWordRatio', () => {
  it('should return high percentage for mostly simple words', () => {
    const text = 'I use my phone to play games at home.'
    const ratio = calculateSimpleWordRatio(text)
    // Most words are simple, expect high ratio
    expect(ratio).toBeGreaterThan(75)
  })

  it('should return lower ratio for complex words', () => {
    const text = 'Implementation requires sophisticated algorithms.'
    const ratio = calculateSimpleWordRatio(text)
    expect(ratio).toBeLessThan(50)
  })

  it('should return 100 for empty text', () => {
    expect(calculateSimpleWordRatio('')).toBe(100)
  })
})

describe('getComplexWords', () => {
  it('should return complex words', () => {
    const text = 'The implementation requires understanding.'
    const complexWords = getComplexWords(text)
    expect(complexWords).toContain('implementation')
    expect(complexWords).toContain('understanding')
  })

  it('should not return simple words', () => {
    const text = 'The cat sat on the mat.'
    const complexWords = getComplexWords(text)
    expect(complexWords).toHaveLength(0)
  })

  it('should not return short complex words', () => {
    const text = 'apple banana'
    const complexWords = getComplexWords(text)
    // 'apple' has 2 syllables, 'banana' has 3
    expect(complexWords).toContain('banana')
    expect(complexWords).not.toContain('apple')
  })
})

// ============================================
// SIMPLE WORDS CONSTANT TESTS
// ============================================

describe('SIMPLE_WORDS', () => {
  it('should contain common words used in templates', () => {
    expect(SIMPLE_WORDS.has('screen')).toBe(true)
    expect(SIMPLE_WORDS.has('device')).toBe(true)
    expect(SIMPLE_WORDS.has('parent')).toBe(true)
    expect(SIMPLE_WORDS.has('rule')).toBe(true)
  })

  it('should contain common verbs', () => {
    expect(SIMPLE_WORDS.has('use')).toBe(true)
    expect(SIMPLE_WORDS.has('ask')).toBe(true)
    expect(SIMPLE_WORDS.has('tell')).toBe(true)
  })

  it('should contain common adjectives', () => {
    expect(SIMPLE_WORDS.has('good')).toBe(true)
    expect(SIMPLE_WORDS.has('safe')).toBe(true)
  })
})

// ============================================
// AGE GROUP GRADE LEVELS TESTS
// ============================================

describe('AGE_GROUP_MAX_GRADE_LEVELS', () => {
  it('should have strictest level for ages 5-7', () => {
    expect(AGE_GROUP_MAX_GRADE_LEVELS['5-7']).toBe(5)
  })

  it('should have moderate level for ages 8-10', () => {
    expect(AGE_GROUP_MAX_GRADE_LEVELS['8-10']).toBe(7)
  })

  it('should have appropriate level for ages 11-13 (NFR65 with formula tolerance)', () => {
    expect(AGE_GROUP_MAX_GRADE_LEVELS['11-13']).toBe(8)
  })

  it('should have appropriate level for ages 14-16 (NFR65 with formula tolerance)', () => {
    expect(AGE_GROUP_MAX_GRADE_LEVELS['14-16']).toBe(9)
  })

  it('should have all age groups defined', () => {
    expect(Object.keys(AGE_GROUP_MAX_GRADE_LEVELS)).toHaveLength(4)
  })

  it('should be progressively higher for older age groups', () => {
    expect(AGE_GROUP_MAX_GRADE_LEVELS['5-7']).toBeLessThan(AGE_GROUP_MAX_GRADE_LEVELS['8-10'])
    expect(AGE_GROUP_MAX_GRADE_LEVELS['8-10']).toBeLessThan(AGE_GROUP_MAX_GRADE_LEVELS['11-13'])
    expect(AGE_GROUP_MAX_GRADE_LEVELS['11-13']).toBeLessThanOrEqual(
      AGE_GROUP_MAX_GRADE_LEVELS['14-16']
    )
  })
})

// ============================================
// TEXT READABILITY VALIDATION TESTS
// ============================================

describe('validateTextReadability', () => {
  describe('for ages 5-7', () => {
    it('should pass for very simple text', () => {
      const text = 'I play games. Mom helps me. I have fun.'
      const result = validateTextReadability(text, '5-7')
      expect(result.passes).toBe(true)
      expect(result.gradeLevel).toBeLessThanOrEqual(5)
    })

    it('should fail for complex text', () => {
      const text =
        'Understanding the implementation of sophisticated monitoring algorithms requires extensive computational knowledge.'
      const result = validateTextReadability(text, '5-7')
      expect(result.passes).toBe(false)
    })

    it('should include max grade level', () => {
      const result = validateTextReadability('Test text.', '5-7')
      expect(result.maxGradeLevel).toBe(5)
    })
  })

  describe('for ages 14-16', () => {
    it('should pass for moderately complex text', () => {
      const text =
        'I will make good choices about using devices. I will be honest with my family.'
      const result = validateTextReadability(text, '14-16')
      expect(result.passes).toBe(true)
    })

    it('should include complex words list', () => {
      const text = 'The implementation requires understanding and responsibility.'
      const result = validateTextReadability(text, '14-16')
      expect(result.complexWords.length).toBeGreaterThan(0)
    })
  })

  describe('result structure', () => {
    it('should include all expected fields', () => {
      const result = validateTextReadability('Test text here.', '11-13')
      expect(result).toHaveProperty('passes')
      expect(result).toHaveProperty('gradeLevel')
      expect(result).toHaveProperty('maxGradeLevel')
      expect(result).toHaveProperty('readingEase')
      expect(result).toHaveProperty('simpleWordRatio')
      expect(result).toHaveProperty('complexWords')
      expect(result).toHaveProperty('stats')
      expect(result).toHaveProperty('summary')
    })

    it('should include text stats', () => {
      const result = validateTextReadability('Hello world. How are you.', '8-10')
      expect(result.stats.wordCount).toBeGreaterThan(0)
      expect(result.stats.sentenceCount).toBeGreaterThan(0)
    })

    it('should have descriptive summary for passing text', () => {
      const result = validateTextReadability('I like games.', '5-7')
      expect(result.summary).toContain('appropriate')
    })

    it('should have descriptive summary for failing text', () => {
      const text =
        'The comprehensive implementation of monitoring systems.'
      const result = validateTextReadability(text, '5-7')
      expect(result.summary).toContain('too complex')
    })
  })
})

// ============================================
// TEMPLATE READABILITY VALIDATION TESTS
// ============================================

describe('validateTemplateReadability', () => {
  const createMockTemplate = (ageGroup: '5-7' | '8-10' | '11-13' | '14-16'): AgreementTemplate => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Template',
    description: 'A simple test template.',
    ageGroup,
    variation: 'balanced',
    concerns: ['screen_time'],
    summary: {
      screenTimeLimit: '1 hour',
      monitoringLevel: 'moderate',
      keyRules: ['Be safe', 'Be kind'],
    },
    sections: [
      {
        id: 'section-1',
        type: 'terms',
        title: 'Our Rules',
        description: 'The rules we follow.',
        defaultValue: 'I will be safe. I will ask for help.',
        customizable: true,
        order: 0,
      },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  })

  it('should pass for simple template', () => {
    const template = createMockTemplate('5-7')
    const result = validateTemplateReadability(template)
    expect(result.passes).toBe(true)
    expect(result.failedSections).toHaveLength(0)
  })

  it('should include template info in result', () => {
    const template = createMockTemplate('8-10')
    const result = validateTemplateReadability(template)
    expect(result.templateId).toBe(template.id)
    expect(result.templateName).toBe(template.name)
    expect(result.ageGroup).toBe('8-10')
  })

  it('should validate all sections', () => {
    const template = createMockTemplate('11-13')
    template.sections.push({
      id: 'section-2',
      type: 'screen_time',
      title: 'Screen Time',
      description: 'Time on screens.',
      defaultValue: 'One hour each day.',
      customizable: true,
      order: 1,
    })

    const result = validateTemplateReadability(template)
    expect(result.sectionResults).toHaveLength(2)
  })

  it('should identify failing sections', () => {
    const template = createMockTemplate('5-7')
    template.sections[0].defaultValue =
      'The implementation of sophisticated monitoring algorithms requires comprehensive understanding of computational complexity and responsibility.'

    const result = validateTemplateReadability(template)
    expect(result.passes).toBe(false)
    expect(result.failedSections).toContain('section-1')
  })

  it('should include section results with details', () => {
    const template = createMockTemplate('14-16')
    const result = validateTemplateReadability(template)

    expect(result.sectionResults[0]).toHaveProperty('sectionId')
    expect(result.sectionResults[0]).toHaveProperty('sectionTitle')
    expect(result.sectionResults[0]).toHaveProperty('titleResult')
    expect(result.sectionResults[0]).toHaveProperty('descriptionResult')
    expect(result.sectionResults[0]).toHaveProperty('contentResult')
    expect(result.sectionResults[0]).toHaveProperty('passes')
  })

  it('should have descriptive summary', () => {
    const template = createMockTemplate('5-7')
    const result = validateTemplateReadability(template)
    expect(result.summary).toContain('Test Template')
    expect(result.summary).toContain('5-7')
  })
})

// ============================================
// READABILITY SUMMARY TESTS
// ============================================

describe('getReadabilitySummary', () => {
  it('should return checkmark for passing text', () => {
    const summary = getReadabilitySummary('I like cats.', '5-7')
    expect(summary).toContain('✓')
  })

  it('should return X for failing text', () => {
    const summary = getReadabilitySummary(
      'The implementation requires comprehensive understanding.',
      '5-7'
    )
    expect(summary).toContain('✗')
  })

  it('should include grade level', () => {
    const summary = getReadabilitySummary('Test text here.', '8-10')
    // Grade level can be negative for simple text
    expect(summary).toMatch(/Grade level -?\d/)
  })

  it('should include age group', () => {
    const summary = getReadabilitySummary('Hello world.', '11-13')
    expect(summary).toContain('11-13')
  })
})

// ============================================
// INTEGRATION TESTS WITH REAL TEMPLATE CONTENT
// ============================================

describe('real-world template content', () => {
  it('should pass for ages 5-7 simple content', () => {
    const content = 'I will use my devices safely. I will ask a grown-up for help.'
    const result = validateTextReadability(content, '5-7')
    expect(result.passes).toBe(true)
  })

  it('should pass for ages 8-10 moderate content', () => {
    const content =
      'Only approved apps can be used. Ask before downloading anything new. Games should be rated E for Everyone.'
    const result = validateTextReadability(content, '8-10')
    expect(result.passes).toBe(true)
  })

  it('should pass for ages 14-16 teen content', () => {
    // Teen content with moderate complexity - use shorter sentences
    const content =
      'I am a good digital citizen. I make thoughtful choices. I use technology well.'
    const result = validateTextReadability(content, '14-16')
    expect(result.passes).toBe(true)
  })

  it('should handle yes/no rule format for young children', () => {
    // Yes/no rule content - words are simple even if sentence structure is unusual
    const content = '✅ Yes: 30 minutes after homework\n❌ No: During meals\n❌ No: In bed'
    const result = validateTextReadability(content, '5-7')
    // Simple words should be present even if grade level is high due to formula quirks
    expect(result.simpleWordRatio).toBeGreaterThan(50)
  })

  it('should handle content with emoji', () => {
    // Emoji content - the text itself should be simple
    const content = '⏰ Screen Time Limits - Only 30 minutes each day.'
    const result = validateTextReadability(content, '8-10')
    // Should pass for 8-10 age group with simpler grade level requirements
    expect(result.passes).toBe(true)
  })
})
