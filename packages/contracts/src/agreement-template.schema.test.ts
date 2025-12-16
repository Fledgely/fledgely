import { describe, it, expect } from 'vitest'
import {
  // Schemas
  ageGroupSchema,
  templateVariationSchema,
  templateConcernSchema,
  monitoringLevelSchema,
  templateSummarySchema,
  templateSectionSchema,
  templateSectionTypeSchema,
  agreementTemplateSchema,
  filterByAgeGroupInputSchema,
  filterByConcernsInputSchema,
  searchTemplatesInputSchema,
  templateLibraryResponseSchema,
  // Constants
  AGE_GROUP_LABELS,
  TEMPLATE_VARIATION_LABELS,
  TEMPLATE_VARIATION_DESCRIPTIONS,
  TEMPLATE_CONCERN_LABELS,
  TEMPLATE_CONCERN_DESCRIPTIONS,
  MONITORING_LEVEL_LABELS,
  MONITORING_LEVEL_DESCRIPTIONS,
  TEMPLATE_FIELD_LIMITS,
  TEMPLATE_ARRAY_LIMITS,
  TEMPLATE_ERROR_MESSAGES,
  // Helper functions
  getAgeGroupLabel,
  getTemplateVariationLabel,
  getTemplateVariationDescription,
  getTemplateConcernLabel,
  getTemplateConcernDescription,
  getMonitoringLevelLabel,
  getMonitoringLevelDescription,
  safeParseAgreementTemplate,
  validateAgreementTemplate,
  safeParseTemplateSection,
  safeParseTemplateSummary,
  calculateAgeGroupFromBirthDate,
  templateMatchesConcerns,
  templateMatchesSearch,
  sortTemplatesByVariation,
  groupTemplatesByAgeGroup,
  getDefaultMonitoringLevel,
  getRecommendedScreenTimeRange,
  getTemplateErrorMessage,
  // Types
  type AgeGroup,
  type TemplateVariation,
  type TemplateConcern,
  type MonitoringLevel,
  type AgreementTemplate,
  type TemplateSection,
  type TemplateSummary,
} from './agreement-template.schema'

// ============================================
// TEST FIXTURES
// ============================================

const validTemplateSummary: TemplateSummary = {
  screenTimeLimit: '2 hours on school days, 4 hours on weekends',
  monitoringLevel: 'moderate',
  keyRules: [
    'Homework must be done before screen time',
    'No screens after 9 PM',
    'Ask before downloading new apps',
  ],
}

const validTemplateSection: TemplateSection = {
  id: 'section-screen-time-001',
  type: 'screen_time',
  title: 'Screen Time Limits',
  description: 'How much time you can spend on screens each day',
  defaultValue:
    'You can use screens for 2 hours on school days. On weekends, you can use screens for 4 hours.',
  customizable: true,
  order: 0,
}

const validAgreementTemplate: AgreementTemplate = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Balanced Digital Agreement for Tweens',
  description: 'A fair balance of screen time and responsibilities for kids aged 11-13',
  ageGroup: '11-13',
  variation: 'balanced',
  concerns: ['screen_time', 'homework', 'safety'],
  summary: validTemplateSummary,
  sections: [validTemplateSection],
  createdAt: '2024-01-15T10:30:00.000Z',
  updatedAt: '2024-01-15T10:30:00.000Z',
}

// ============================================
// AGE GROUP SCHEMA TESTS
// ============================================

describe('agreement-template.schema', () => {
  describe('ageGroupSchema', () => {
    it('accepts valid age group: 5-7', () => {
      expect(ageGroupSchema.parse('5-7')).toBe('5-7')
    })

    it('accepts valid age group: 8-10', () => {
      expect(ageGroupSchema.parse('8-10')).toBe('8-10')
    })

    it('accepts valid age group: 11-13', () => {
      expect(ageGroupSchema.parse('11-13')).toBe('11-13')
    })

    it('accepts valid age group: 14-16', () => {
      expect(ageGroupSchema.parse('14-16')).toBe('14-16')
    })

    it('rejects invalid age group', () => {
      expect(() => ageGroupSchema.parse('17-19')).toThrow()
    })

    it('rejects empty string', () => {
      expect(() => ageGroupSchema.parse('')).toThrow()
    })

    it('rejects number', () => {
      expect(() => ageGroupSchema.parse(5)).toThrow()
    })

    it('rejects null', () => {
      expect(() => ageGroupSchema.parse(null)).toThrow()
    })

    it('rejects undefined', () => {
      expect(() => ageGroupSchema.parse(undefined)).toThrow()
    })
  })

  describe('getAgeGroupLabel', () => {
    it('returns correct label for 5-7', () => {
      expect(getAgeGroupLabel('5-7')).toBe('Early Childhood (5-7 years)')
    })

    it('returns correct label for 8-10', () => {
      expect(getAgeGroupLabel('8-10')).toBe('Middle Childhood (8-10 years)')
    })

    it('returns correct label for 11-13', () => {
      expect(getAgeGroupLabel('11-13')).toBe('Early Adolescence (11-13 years)')
    })

    it('returns correct label for 14-16', () => {
      expect(getAgeGroupLabel('14-16')).toBe('Late Adolescence (14-16 years)')
    })

    it('AGE_GROUP_LABELS has all age groups', () => {
      expect(Object.keys(AGE_GROUP_LABELS)).toHaveLength(4)
    })
  })

  // ============================================
  // TEMPLATE VARIATION SCHEMA TESTS
  // ============================================

  describe('templateVariationSchema', () => {
    it('accepts valid variation: strict', () => {
      expect(templateVariationSchema.parse('strict')).toBe('strict')
    })

    it('accepts valid variation: balanced', () => {
      expect(templateVariationSchema.parse('balanced')).toBe('balanced')
    })

    it('accepts valid variation: permissive', () => {
      expect(templateVariationSchema.parse('permissive')).toBe('permissive')
    })

    it('rejects invalid variation', () => {
      expect(() => templateVariationSchema.parse('moderate')).toThrow()
    })

    it('rejects empty string', () => {
      expect(() => templateVariationSchema.parse('')).toThrow()
    })
  })

  describe('getTemplateVariationLabel', () => {
    it('returns correct label for strict', () => {
      expect(getTemplateVariationLabel('strict')).toBe('Strict')
    })

    it('returns correct label for balanced', () => {
      expect(getTemplateVariationLabel('balanced')).toBe('Balanced')
    })

    it('returns correct label for permissive', () => {
      expect(getTemplateVariationLabel('permissive')).toBe('Permissive')
    })

    it('TEMPLATE_VARIATION_LABELS has all variations', () => {
      expect(Object.keys(TEMPLATE_VARIATION_LABELS)).toHaveLength(3)
    })
  })

  describe('getTemplateVariationDescription', () => {
    it('returns description for strict', () => {
      expect(getTemplateVariationDescription('strict')).toContain('More rules')
    })

    it('returns description for balanced', () => {
      expect(getTemplateVariationDescription('balanced')).toContain('mix')
    })

    it('returns description for permissive', () => {
      expect(getTemplateVariationDescription('permissive')).toContain('freedom')
    })

    it('TEMPLATE_VARIATION_DESCRIPTIONS has all variations', () => {
      expect(Object.keys(TEMPLATE_VARIATION_DESCRIPTIONS)).toHaveLength(3)
    })
  })

  // ============================================
  // TEMPLATE CONCERN SCHEMA TESTS
  // ============================================

  describe('templateConcernSchema', () => {
    it('accepts valid concern: gaming', () => {
      expect(templateConcernSchema.parse('gaming')).toBe('gaming')
    })

    it('accepts valid concern: social_media', () => {
      expect(templateConcernSchema.parse('social_media')).toBe('social_media')
    })

    it('accepts valid concern: homework', () => {
      expect(templateConcernSchema.parse('homework')).toBe('homework')
    })

    it('accepts valid concern: screen_time', () => {
      expect(templateConcernSchema.parse('screen_time')).toBe('screen_time')
    })

    it('accepts valid concern: safety', () => {
      expect(templateConcernSchema.parse('safety')).toBe('safety')
    })

    it('rejects invalid concern', () => {
      expect(() => templateConcernSchema.parse('music')).toThrow()
    })

    it('rejects empty string', () => {
      expect(() => templateConcernSchema.parse('')).toThrow()
    })
  })

  describe('getTemplateConcernLabel', () => {
    it('returns correct label for gaming', () => {
      expect(getTemplateConcernLabel('gaming')).toBe('Gaming')
    })

    it('returns correct label for social_media', () => {
      expect(getTemplateConcernLabel('social_media')).toBe('Social Media')
    })

    it('returns correct label for homework', () => {
      expect(getTemplateConcernLabel('homework')).toBe('Homework')
    })

    it('returns correct label for screen_time', () => {
      expect(getTemplateConcernLabel('screen_time')).toBe('Screen Time')
    })

    it('returns correct label for safety', () => {
      expect(getTemplateConcernLabel('safety')).toBe('Online Safety')
    })

    it('TEMPLATE_CONCERN_LABELS has all concerns', () => {
      expect(Object.keys(TEMPLATE_CONCERN_LABELS)).toHaveLength(5)
    })
  })

  describe('getTemplateConcernDescription', () => {
    it('returns description for gaming', () => {
      expect(getTemplateConcernDescription('gaming')).toContain('video games')
    })

    it('returns description for social_media', () => {
      expect(getTemplateConcernDescription('social_media')).toContain('TikTok')
    })

    it('returns description for safety', () => {
      expect(getTemplateConcernDescription('safety')).toContain('safe online')
    })

    it('TEMPLATE_CONCERN_DESCRIPTIONS has all concerns', () => {
      expect(Object.keys(TEMPLATE_CONCERN_DESCRIPTIONS)).toHaveLength(5)
    })
  })

  // ============================================
  // MONITORING LEVEL SCHEMA TESTS
  // ============================================

  describe('monitoringLevelSchema', () => {
    it('accepts valid level: light', () => {
      expect(monitoringLevelSchema.parse('light')).toBe('light')
    })

    it('accepts valid level: moderate', () => {
      expect(monitoringLevelSchema.parse('moderate')).toBe('moderate')
    })

    it('accepts valid level: comprehensive', () => {
      expect(monitoringLevelSchema.parse('comprehensive')).toBe('comprehensive')
    })

    it('rejects invalid level', () => {
      expect(() => monitoringLevelSchema.parse('extreme')).toThrow()
    })

    it('rejects empty string', () => {
      expect(() => monitoringLevelSchema.parse('')).toThrow()
    })
  })

  describe('getMonitoringLevelLabel', () => {
    it('returns correct label for light', () => {
      expect(getMonitoringLevelLabel('light')).toBe('Light')
    })

    it('returns correct label for moderate', () => {
      expect(getMonitoringLevelLabel('moderate')).toBe('Moderate')
    })

    it('returns correct label for comprehensive', () => {
      expect(getMonitoringLevelLabel('comprehensive')).toBe('Comprehensive')
    })

    it('MONITORING_LEVEL_LABELS has all levels', () => {
      expect(Object.keys(MONITORING_LEVEL_LABELS)).toHaveLength(3)
    })
  })

  describe('getMonitoringLevelDescription', () => {
    it('returns description for light', () => {
      expect(getMonitoringLevelDescription('light')).toContain('privacy')
    })

    it('returns description for moderate', () => {
      expect(getMonitoringLevelDescription('moderate')).toContain('regularly')
    })

    it('returns description for comprehensive', () => {
      expect(getMonitoringLevelDescription('comprehensive')).toContain('closely')
    })

    it('MONITORING_LEVEL_DESCRIPTIONS has all levels', () => {
      expect(Object.keys(MONITORING_LEVEL_DESCRIPTIONS)).toHaveLength(3)
    })
  })

  // ============================================
  // TEMPLATE SUMMARY SCHEMA TESTS
  // ============================================

  describe('templateSummarySchema', () => {
    it('accepts valid template summary', () => {
      const result = templateSummarySchema.parse(validTemplateSummary)
      expect(result.screenTimeLimit).toBe('2 hours on school days, 4 hours on weekends')
      expect(result.monitoringLevel).toBe('moderate')
      expect(result.keyRules).toHaveLength(3)
    })

    it('accepts summary with single key rule', () => {
      const summary = { ...validTemplateSummary, keyRules: ['One rule'] }
      const result = templateSummarySchema.parse(summary)
      expect(result.keyRules).toHaveLength(1)
    })

    it('accepts summary with max key rules (5)', () => {
      const summary = {
        ...validTemplateSummary,
        keyRules: ['Rule 1', 'Rule 2', 'Rule 3', 'Rule 4', 'Rule 5'],
      }
      const result = templateSummarySchema.parse(summary)
      expect(result.keyRules).toHaveLength(5)
    })

    it('rejects summary with more than 5 key rules', () => {
      const summary = {
        ...validTemplateSummary,
        keyRules: ['Rule 1', 'Rule 2', 'Rule 3', 'Rule 4', 'Rule 5', 'Rule 6'],
      }
      expect(() => templateSummarySchema.parse(summary)).toThrow()
    })

    it('rejects summary with empty key rules array', () => {
      const summary = { ...validTemplateSummary, keyRules: [] }
      expect(() => templateSummarySchema.parse(summary)).toThrow()
    })

    it('rejects summary with empty screen time limit', () => {
      const summary = { ...validTemplateSummary, screenTimeLimit: '' }
      expect(() => templateSummarySchema.parse(summary)).toThrow()
    })

    it('rejects summary with invalid monitoring level', () => {
      const summary = { ...validTemplateSummary, monitoringLevel: 'invalid' }
      expect(() => templateSummarySchema.parse(summary)).toThrow()
    })

    it('rejects summary with screen time limit exceeding max length', () => {
      const summary = {
        ...validTemplateSummary,
        screenTimeLimit: 'x'.repeat(TEMPLATE_FIELD_LIMITS.screenTimeLimitText + 1),
      }
      expect(() => templateSummarySchema.parse(summary)).toThrow()
    })
  })

  describe('safeParseTemplateSummary', () => {
    it('returns parsed summary for valid input', () => {
      const result = safeParseTemplateSummary(validTemplateSummary)
      expect(result).not.toBeNull()
      expect(result?.monitoringLevel).toBe('moderate')
    })

    it('returns null for invalid input', () => {
      const result = safeParseTemplateSummary({ invalid: 'data' })
      expect(result).toBeNull()
    })
  })

  // ============================================
  // TEMPLATE SECTION SCHEMA TESTS
  // ============================================

  describe('templateSectionTypeSchema', () => {
    it('accepts valid section type: terms', () => {
      expect(templateSectionTypeSchema.parse('terms')).toBe('terms')
    })

    it('accepts valid section type: monitoring_rules', () => {
      expect(templateSectionTypeSchema.parse('monitoring_rules')).toBe('monitoring_rules')
    })

    it('accepts valid section type: screen_time', () => {
      expect(templateSectionTypeSchema.parse('screen_time')).toBe('screen_time')
    })

    it('accepts valid section type: bedtime_schedule', () => {
      expect(templateSectionTypeSchema.parse('bedtime_schedule')).toBe('bedtime_schedule')
    })

    it('accepts valid section type: app_restrictions', () => {
      expect(templateSectionTypeSchema.parse('app_restrictions')).toBe('app_restrictions')
    })

    it('accepts valid section type: content_filters', () => {
      expect(templateSectionTypeSchema.parse('content_filters')).toBe('content_filters')
    })

    it('accepts valid section type: consequences', () => {
      expect(templateSectionTypeSchema.parse('consequences')).toBe('consequences')
    })

    it('accepts valid section type: rewards', () => {
      expect(templateSectionTypeSchema.parse('rewards')).toBe('rewards')
    })

    it('rejects invalid section type', () => {
      expect(() => templateSectionTypeSchema.parse('invalid_type')).toThrow()
    })
  })

  describe('templateSectionSchema', () => {
    it('accepts valid template section', () => {
      const result = templateSectionSchema.parse(validTemplateSection)
      expect(result.id).toBe('section-screen-time-001')
      expect(result.type).toBe('screen_time')
      expect(result.title).toBe('Screen Time Limits')
      expect(result.customizable).toBe(true)
      expect(result.order).toBe(0)
    })

    it('accepts section with customizable false', () => {
      const section = { ...validTemplateSection, customizable: false }
      const result = templateSectionSchema.parse(section)
      expect(result.customizable).toBe(false)
    })

    it('accepts section with order 99', () => {
      const section = { ...validTemplateSection, order: 99 }
      const result = templateSectionSchema.parse(section)
      expect(result.order).toBe(99)
    })

    it('rejects section with empty id', () => {
      const section = { ...validTemplateSection, id: '' }
      expect(() => templateSectionSchema.parse(section)).toThrow()
    })

    it('rejects section with empty title', () => {
      const section = { ...validTemplateSection, title: '' }
      expect(() => templateSectionSchema.parse(section)).toThrow()
    })

    it('rejects section with empty description', () => {
      const section = { ...validTemplateSection, description: '' }
      expect(() => templateSectionSchema.parse(section)).toThrow()
    })

    it('rejects section with empty defaultValue', () => {
      const section = { ...validTemplateSection, defaultValue: '' }
      expect(() => templateSectionSchema.parse(section)).toThrow()
    })

    it('rejects section with negative order', () => {
      const section = { ...validTemplateSection, order: -1 }
      expect(() => templateSectionSchema.parse(section)).toThrow()
    })

    it('rejects section with order > 99', () => {
      const section = { ...validTemplateSection, order: 100 }
      expect(() => templateSectionSchema.parse(section)).toThrow()
    })

    it('rejects section with title exceeding max length', () => {
      const section = {
        ...validTemplateSection,
        title: 'x'.repeat(TEMPLATE_FIELD_LIMITS.sectionTitle + 1),
      }
      expect(() => templateSectionSchema.parse(section)).toThrow()
    })
  })

  describe('safeParseTemplateSection', () => {
    it('returns parsed section for valid input', () => {
      const result = safeParseTemplateSection(validTemplateSection)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('screen_time')
    })

    it('returns null for invalid input', () => {
      const result = safeParseTemplateSection({ invalid: 'data' })
      expect(result).toBeNull()
    })
  })

  // ============================================
  // AGREEMENT TEMPLATE SCHEMA TESTS
  // ============================================

  describe('agreementTemplateSchema', () => {
    it('accepts valid agreement template', () => {
      const result = agreementTemplateSchema.parse(validAgreementTemplate)
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result.name).toBe('Balanced Digital Agreement for Tweens')
      expect(result.ageGroup).toBe('11-13')
      expect(result.variation).toBe('balanced')
      expect(result.concerns).toHaveLength(3)
      expect(result.sections).toHaveLength(1)
    })

    it('accepts template with single concern', () => {
      const template = { ...validAgreementTemplate, concerns: ['gaming'] as TemplateConcern[] }
      const result = agreementTemplateSchema.parse(template)
      expect(result.concerns).toHaveLength(1)
    })

    it('accepts template with max concerns (5)', () => {
      const template = {
        ...validAgreementTemplate,
        concerns: ['gaming', 'social_media', 'homework', 'screen_time', 'safety'] as TemplateConcern[],
      }
      const result = agreementTemplateSchema.parse(template)
      expect(result.concerns).toHaveLength(5)
    })

    it('rejects template with more than 5 concerns', () => {
      const template = {
        ...validAgreementTemplate,
        concerns: ['gaming', 'social_media', 'homework', 'screen_time', 'safety', 'gaming'],
      }
      expect(() => agreementTemplateSchema.parse(template)).toThrow()
    })

    it('rejects template with empty concerns array', () => {
      const template = { ...validAgreementTemplate, concerns: [] }
      expect(() => agreementTemplateSchema.parse(template)).toThrow()
    })

    it('rejects template with empty sections array', () => {
      const template = { ...validAgreementTemplate, sections: [] }
      expect(() => agreementTemplateSchema.parse(template)).toThrow()
    })

    it('rejects template with invalid UUID', () => {
      const template = { ...validAgreementTemplate, id: 'not-a-uuid' }
      expect(() => agreementTemplateSchema.parse(template)).toThrow()
    })

    it('rejects template with empty name', () => {
      const template = { ...validAgreementTemplate, name: '' }
      expect(() => agreementTemplateSchema.parse(template)).toThrow()
    })

    it('rejects template with name exceeding max length', () => {
      const template = {
        ...validAgreementTemplate,
        name: 'x'.repeat(TEMPLATE_FIELD_LIMITS.name + 1),
      }
      expect(() => agreementTemplateSchema.parse(template)).toThrow()
    })

    it('rejects template with empty description', () => {
      const template = { ...validAgreementTemplate, description: '' }
      expect(() => agreementTemplateSchema.parse(template)).toThrow()
    })

    it('rejects template with invalid age group', () => {
      const template = { ...validAgreementTemplate, ageGroup: '17-18' }
      expect(() => agreementTemplateSchema.parse(template)).toThrow()
    })

    it('rejects template with invalid variation', () => {
      const template = { ...validAgreementTemplate, variation: 'invalid' }
      expect(() => agreementTemplateSchema.parse(template)).toThrow()
    })

    it('rejects template with invalid createdAt format', () => {
      const template = { ...validAgreementTemplate, createdAt: 'not-a-date' }
      expect(() => agreementTemplateSchema.parse(template)).toThrow()
    })

    it('rejects template with invalid updatedAt format', () => {
      const template = { ...validAgreementTemplate, updatedAt: 'not-a-date' }
      expect(() => agreementTemplateSchema.parse(template)).toThrow()
    })

    it('accepts template with many sections', () => {
      const sections = Array.from({ length: 10 }, (_, i) => ({
        ...validTemplateSection,
        id: `section-${i}`,
        order: i,
      }))
      const template = { ...validAgreementTemplate, sections }
      const result = agreementTemplateSchema.parse(template)
      expect(result.sections).toHaveLength(10)
    })

    it('rejects template with more than max sections', () => {
      const sections = Array.from({ length: TEMPLATE_ARRAY_LIMITS.maxSections + 1 }, (_, i) => ({
        ...validTemplateSection,
        id: `section-${i}`,
        order: i % 100,
      }))
      const template = { ...validAgreementTemplate, sections }
      expect(() => agreementTemplateSchema.parse(template)).toThrow()
    })
  })

  describe('safeParseAgreementTemplate', () => {
    it('returns parsed template for valid input', () => {
      const result = safeParseAgreementTemplate(validAgreementTemplate)
      expect(result).not.toBeNull()
      expect(result?.name).toBe('Balanced Digital Agreement for Tweens')
    })

    it('returns null for invalid input', () => {
      const result = safeParseAgreementTemplate({ invalid: 'data' })
      expect(result).toBeNull()
    })

    it('returns null for missing required field', () => {
      const { name: _name, ...templateWithoutName } = validAgreementTemplate
      const result = safeParseAgreementTemplate(templateWithoutName)
      expect(result).toBeNull()
    })
  })

  describe('validateAgreementTemplate', () => {
    it('returns parsed template for valid input', () => {
      const result = validateAgreementTemplate(validAgreementTemplate)
      expect(result.name).toBe('Balanced Digital Agreement for Tweens')
    })

    it('throws for invalid input', () => {
      expect(() => validateAgreementTemplate({ invalid: 'data' })).toThrow()
    })
  })

  // ============================================
  // INPUT SCHEMA TESTS
  // ============================================

  describe('filterByAgeGroupInputSchema', () => {
    it('accepts valid age group input', () => {
      const result = filterByAgeGroupInputSchema.parse({ ageGroup: '11-13' })
      expect(result.ageGroup).toBe('11-13')
    })

    it('rejects invalid age group', () => {
      expect(() => filterByAgeGroupInputSchema.parse({ ageGroup: 'invalid' })).toThrow()
    })

    it('rejects missing age group', () => {
      expect(() => filterByAgeGroupInputSchema.parse({})).toThrow()
    })
  })

  describe('filterByConcernsInputSchema', () => {
    it('accepts valid concerns input', () => {
      const result = filterByConcernsInputSchema.parse({ concerns: ['gaming', 'safety'] })
      expect(result.concerns).toHaveLength(2)
    })

    it('accepts single concern', () => {
      const result = filterByConcernsInputSchema.parse({ concerns: ['gaming'] })
      expect(result.concerns).toHaveLength(1)
    })

    it('rejects empty concerns array', () => {
      expect(() => filterByConcernsInputSchema.parse({ concerns: [] })).toThrow()
    })

    it('rejects invalid concern', () => {
      expect(() => filterByConcernsInputSchema.parse({ concerns: ['invalid'] })).toThrow()
    })
  })

  describe('searchTemplatesInputSchema', () => {
    it('accepts valid search input with query only', () => {
      const result = searchTemplatesInputSchema.parse({ query: 'balanced' })
      expect(result.query).toBe('balanced')
      expect(result.ageGroup).toBeUndefined()
      expect(result.concerns).toBeUndefined()
    })

    it('accepts search input with age group filter', () => {
      const result = searchTemplatesInputSchema.parse({ query: 'test', ageGroup: '11-13' })
      expect(result.ageGroup).toBe('11-13')
    })

    it('accepts search input with concerns filter', () => {
      const result = searchTemplatesInputSchema.parse({
        query: 'test',
        concerns: ['gaming'],
      })
      expect(result.concerns).toHaveLength(1)
    })

    it('rejects empty query', () => {
      expect(() => searchTemplatesInputSchema.parse({ query: '' })).toThrow()
    })

    it('rejects query exceeding max length', () => {
      expect(() => searchTemplatesInputSchema.parse({ query: 'x'.repeat(101) })).toThrow()
    })
  })

  describe('templateLibraryResponseSchema', () => {
    it('accepts valid response', () => {
      const response = {
        templates: [validAgreementTemplate],
        totalCount: 12,
        filteredCount: 1,
      }
      const result = templateLibraryResponseSchema.parse(response)
      expect(result.templates).toHaveLength(1)
      expect(result.totalCount).toBe(12)
      expect(result.filteredCount).toBe(1)
    })

    it('accepts empty templates array', () => {
      const response = {
        templates: [],
        totalCount: 0,
        filteredCount: 0,
      }
      const result = templateLibraryResponseSchema.parse(response)
      expect(result.templates).toHaveLength(0)
    })

    it('rejects negative totalCount', () => {
      const response = {
        templates: [],
        totalCount: -1,
        filteredCount: 0,
      }
      expect(() => templateLibraryResponseSchema.parse(response)).toThrow()
    })
  })

  // ============================================
  // HELPER FUNCTION TESTS
  // ============================================

  describe('calculateAgeGroupFromBirthDate', () => {
    it('returns 5-7 for 5 year old', () => {
      const birthDate = new Date('2019-06-15')
      const referenceDate = new Date('2024-06-15')
      expect(calculateAgeGroupFromBirthDate(birthDate, referenceDate)).toBe('5-7')
    })

    it('returns 5-7 for 7 year old', () => {
      const birthDate = new Date('2017-06-15')
      const referenceDate = new Date('2024-06-15')
      expect(calculateAgeGroupFromBirthDate(birthDate, referenceDate)).toBe('5-7')
    })

    it('returns 8-10 for 8 year old', () => {
      const birthDate = new Date('2016-06-15')
      const referenceDate = new Date('2024-06-15')
      expect(calculateAgeGroupFromBirthDate(birthDate, referenceDate)).toBe('8-10')
    })

    it('returns 8-10 for 10 year old', () => {
      const birthDate = new Date('2014-06-15')
      const referenceDate = new Date('2024-06-15')
      expect(calculateAgeGroupFromBirthDate(birthDate, referenceDate)).toBe('8-10')
    })

    it('returns 11-13 for 11 year old', () => {
      const birthDate = new Date('2013-06-15')
      const referenceDate = new Date('2024-06-15')
      expect(calculateAgeGroupFromBirthDate(birthDate, referenceDate)).toBe('11-13')
    })

    it('returns 11-13 for 13 year old', () => {
      const birthDate = new Date('2011-06-15')
      const referenceDate = new Date('2024-06-15')
      expect(calculateAgeGroupFromBirthDate(birthDate, referenceDate)).toBe('11-13')
    })

    it('returns 14-16 for 14 year old', () => {
      const birthDate = new Date('2010-06-15')
      const referenceDate = new Date('2024-06-15')
      expect(calculateAgeGroupFromBirthDate(birthDate, referenceDate)).toBe('14-16')
    })

    it('returns 14-16 for 16 year old', () => {
      const birthDate = new Date('2008-06-15')
      const referenceDate = new Date('2024-06-15')
      expect(calculateAgeGroupFromBirthDate(birthDate, referenceDate)).toBe('14-16')
    })

    it('returns null for 4 year old (too young)', () => {
      const birthDate = new Date('2020-06-15')
      const referenceDate = new Date('2024-06-15')
      expect(calculateAgeGroupFromBirthDate(birthDate, referenceDate)).toBeNull()
    })

    it('returns null for 17 year old (too old)', () => {
      const birthDate = new Date('2007-06-15')
      const referenceDate = new Date('2024-06-15')
      expect(calculateAgeGroupFromBirthDate(birthDate, referenceDate)).toBeNull()
    })
  })

  describe('templateMatchesConcerns', () => {
    it('returns true when template has matching concern', () => {
      expect(templateMatchesConcerns(validAgreementTemplate, ['screen_time'])).toBe(true)
    })

    it('returns true when template has at least one matching concern', () => {
      expect(templateMatchesConcerns(validAgreementTemplate, ['gaming', 'screen_time'])).toBe(true)
    })

    it('returns false when template has no matching concerns', () => {
      expect(templateMatchesConcerns(validAgreementTemplate, ['gaming'])).toBe(false)
    })

    it('returns true for empty concerns filter', () => {
      expect(templateMatchesConcerns(validAgreementTemplate, [])).toBe(true)
    })
  })

  describe('templateMatchesSearch', () => {
    it('returns true when query matches name', () => {
      expect(templateMatchesSearch(validAgreementTemplate, 'Balanced')).toBe(true)
    })

    it('returns true when query matches description', () => {
      expect(templateMatchesSearch(validAgreementTemplate, 'fair balance')).toBe(true)
    })

    it('returns true for case-insensitive match', () => {
      expect(templateMatchesSearch(validAgreementTemplate, 'BALANCED')).toBe(true)
    })

    it('returns false when query does not match', () => {
      expect(templateMatchesSearch(validAgreementTemplate, 'nonexistent')).toBe(false)
    })

    it('returns true for empty query', () => {
      expect(templateMatchesSearch(validAgreementTemplate, '')).toBe(true)
    })

    it('returns true for whitespace-only query', () => {
      expect(templateMatchesSearch(validAgreementTemplate, '   ')).toBe(true)
    })
  })

  describe('sortTemplatesByVariation', () => {
    it('sorts templates by variation order (strict, balanced, permissive)', () => {
      const templates: AgreementTemplate[] = [
        { ...validAgreementTemplate, id: '550e8400-e29b-41d4-a716-446655440001', variation: 'permissive' },
        { ...validAgreementTemplate, id: '550e8400-e29b-41d4-a716-446655440002', variation: 'strict' },
        { ...validAgreementTemplate, id: '550e8400-e29b-41d4-a716-446655440003', variation: 'balanced' },
      ]
      const sorted = sortTemplatesByVariation(templates)
      expect(sorted[0].variation).toBe('strict')
      expect(sorted[1].variation).toBe('balanced')
      expect(sorted[2].variation).toBe('permissive')
    })

    it('does not mutate original array', () => {
      const templates: AgreementTemplate[] = [
        { ...validAgreementTemplate, id: '550e8400-e29b-41d4-a716-446655440001', variation: 'permissive' },
        { ...validAgreementTemplate, id: '550e8400-e29b-41d4-a716-446655440002', variation: 'strict' },
      ]
      sortTemplatesByVariation(templates)
      expect(templates[0].variation).toBe('permissive')
    })

    it('handles empty array', () => {
      expect(sortTemplatesByVariation([])).toEqual([])
    })
  })

  describe('groupTemplatesByAgeGroup', () => {
    it('groups templates by age group', () => {
      const templates: AgreementTemplate[] = [
        { ...validAgreementTemplate, id: '550e8400-e29b-41d4-a716-446655440001', ageGroup: '5-7' },
        { ...validAgreementTemplate, id: '550e8400-e29b-41d4-a716-446655440002', ageGroup: '11-13' },
        { ...validAgreementTemplate, id: '550e8400-e29b-41d4-a716-446655440003', ageGroup: '5-7' },
      ]
      const grouped = groupTemplatesByAgeGroup(templates)
      expect(grouped['5-7']).toHaveLength(2)
      expect(grouped['8-10']).toHaveLength(0)
      expect(grouped['11-13']).toHaveLength(1)
      expect(grouped['14-16']).toHaveLength(0)
    })

    it('returns empty arrays for all groups when no templates', () => {
      const grouped = groupTemplatesByAgeGroup([])
      expect(grouped['5-7']).toHaveLength(0)
      expect(grouped['8-10']).toHaveLength(0)
      expect(grouped['11-13']).toHaveLength(0)
      expect(grouped['14-16']).toHaveLength(0)
    })
  })

  describe('getDefaultMonitoringLevel', () => {
    it('returns comprehensive for 5-7', () => {
      expect(getDefaultMonitoringLevel('5-7')).toBe('comprehensive')
    })

    it('returns comprehensive for 8-10', () => {
      expect(getDefaultMonitoringLevel('8-10')).toBe('comprehensive')
    })

    it('returns moderate for 11-13', () => {
      expect(getDefaultMonitoringLevel('11-13')).toBe('moderate')
    })

    it('returns light for 14-16', () => {
      expect(getDefaultMonitoringLevel('14-16')).toBe('light')
    })
  })

  describe('getRecommendedScreenTimeRange', () => {
    it('returns 30-60 minutes for 5-7', () => {
      expect(getRecommendedScreenTimeRange('5-7')).toEqual({ min: 30, max: 60 })
    })

    it('returns 60-120 minutes for 8-10', () => {
      expect(getRecommendedScreenTimeRange('8-10')).toEqual({ min: 60, max: 120 })
    })

    it('returns 120-180 minutes for 11-13', () => {
      expect(getRecommendedScreenTimeRange('11-13')).toEqual({ min: 120, max: 180 })
    })

    it('returns 180-240 minutes for 14-16', () => {
      expect(getRecommendedScreenTimeRange('14-16')).toEqual({ min: 180, max: 240 })
    })
  })

  // ============================================
  // ERROR MESSAGE TESTS
  // ============================================

  describe('getTemplateErrorMessage', () => {
    it('returns message for known error code', () => {
      expect(getTemplateErrorMessage('not-found')).toBe('Could not find that template.')
    })

    it('returns message for invalid-age-group', () => {
      expect(getTemplateErrorMessage('invalid-age-group')).toContain('age group')
    })

    it('returns message for no-templates', () => {
      expect(getTemplateErrorMessage('no-templates')).toContain('No templates')
    })

    it('returns unknown message for unknown error code', () => {
      expect(getTemplateErrorMessage('some-random-error')).toBe('Something went wrong. Please try again.')
    })

    it('TEMPLATE_ERROR_MESSAGES has expected keys', () => {
      expect(TEMPLATE_ERROR_MESSAGES).toHaveProperty('not-found')
      expect(TEMPLATE_ERROR_MESSAGES).toHaveProperty('invalid-age-group')
      expect(TEMPLATE_ERROR_MESSAGES).toHaveProperty('invalid-variation')
      expect(TEMPLATE_ERROR_MESSAGES).toHaveProperty('invalid-concern')
      expect(TEMPLATE_ERROR_MESSAGES).toHaveProperty('no-templates')
      expect(TEMPLATE_ERROR_MESSAGES).toHaveProperty('load-failed')
      expect(TEMPLATE_ERROR_MESSAGES).toHaveProperty('invalid-template')
      expect(TEMPLATE_ERROR_MESSAGES).toHaveProperty('unknown')
    })
  })

  // ============================================
  // CONSTANTS TESTS
  // ============================================

  describe('TEMPLATE_FIELD_LIMITS', () => {
    it('has reasonable limits defined', () => {
      expect(TEMPLATE_FIELD_LIMITS.id).toBe(128)
      expect(TEMPLATE_FIELD_LIMITS.name).toBe(100)
      expect(TEMPLATE_FIELD_LIMITS.description).toBe(500)
      expect(TEMPLATE_FIELD_LIMITS.sectionTitle).toBe(100)
      expect(TEMPLATE_FIELD_LIMITS.sectionDescription).toBe(1000)
      expect(TEMPLATE_FIELD_LIMITS.sectionDefaultValue).toBe(5000)
      expect(TEMPLATE_FIELD_LIMITS.keyRuleText).toBe(200)
      expect(TEMPLATE_FIELD_LIMITS.screenTimeLimitText).toBe(100)
    })
  })

  describe('TEMPLATE_ARRAY_LIMITS', () => {
    it('has reasonable array limits defined', () => {
      expect(TEMPLATE_ARRAY_LIMITS.maxSections).toBe(20)
      expect(TEMPLATE_ARRAY_LIMITS.maxKeyRules).toBe(5)
      expect(TEMPLATE_ARRAY_LIMITS.maxConcerns).toBe(5)
    })
  })
})
