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
  // Screen time validation (Story 4.2)
  screenTimeRangeSchema,
  parseScreenTimeText,
  validateScreenTimeForAge,
  validateScreenTimeTextForAge,
  getScreenTimeRangeText,
  // Monitoring validation (Story 4.2)
  MONITORING_INTENSITY_VALUES,
  getAllowedMonitoringLevels,
  validateMonitoringLevelForAge,
  isMonitoringProgressionValid,
  // Age-relevant examples (Story 4.2)
  AGE_RELEVANT_EXAMPLES,
  getAgeRelevantExamples,
  getExamplesByCategory,
  formatExampleList,
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

  // ============================================
  // SCREEN TIME VALIDATION TESTS (Story 4.2 - Task 4)
  // ============================================

  describe('screenTimeRangeSchema', () => {
    it('accepts valid screen time range with minutes', () => {
      const result = screenTimeRangeSchema.safeParse({
        minMinutes: 30,
        maxMinutes: 60,
        unit: 'minutes',
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid screen time range with hours', () => {
      const result = screenTimeRangeSchema.safeParse({
        minMinutes: 120,
        maxMinutes: 180,
        unit: 'hours',
      })
      expect(result.success).toBe(true)
    })

    it('defaults unit to minutes', () => {
      const result = screenTimeRangeSchema.parse({
        minMinutes: 30,
        maxMinutes: 60,
      })
      expect(result.unit).toBe('minutes')
    })

    it('rejects negative minutes', () => {
      const result = screenTimeRangeSchema.safeParse({
        minMinutes: -10,
        maxMinutes: 60,
      })
      expect(result.success).toBe(false)
    })

    it('rejects minutes over 480', () => {
      const result = screenTimeRangeSchema.safeParse({
        minMinutes: 30,
        maxMinutes: 500,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('parseScreenTimeText', () => {
    it('parses "30 minutes"', () => {
      expect(parseScreenTimeText('30 minutes')).toBe(30)
    })

    it('parses "45 min"', () => {
      expect(parseScreenTimeText('45 min')).toBe(45)
    })

    it('parses "1 hour"', () => {
      expect(parseScreenTimeText('1 hour')).toBe(60)
    })

    it('parses "2 hours"', () => {
      expect(parseScreenTimeText('2 hours')).toBe(120)
    })

    it('parses "1.5 hours"', () => {
      expect(parseScreenTimeText('1.5 hours')).toBe(90)
    })

    it('parses "2.5 hrs"', () => {
      expect(parseScreenTimeText('2.5 hrs')).toBe(150)
    })

    it('parses text with context like "1 hour on school days"', () => {
      expect(parseScreenTimeText('1 hour on school days')).toBe(60)
    })

    it('parses "30 minutes after homework"', () => {
      expect(parseScreenTimeText('30 minutes after homework')).toBe(30)
    })

    it('returns null for unparseable text', () => {
      expect(parseScreenTimeText('unlimited')).toBeNull()
    })

    it('returns null for empty text', () => {
      expect(parseScreenTimeText('')).toBeNull()
    })

    it('is case insensitive for "HOUR"', () => {
      expect(parseScreenTimeText('2 HOURS')).toBe(120)
    })

    it('is case insensitive for "MINUTE"', () => {
      expect(parseScreenTimeText('30 MINUTES')).toBe(30)
    })
  })

  describe('validateScreenTimeForAge', () => {
    describe('ages 5-7 (30-60 min range)', () => {
      it('passes for 30 minutes', () => {
        const result = validateScreenTimeForAge(30, '5-7')
        expect(result.isWithinRange).toBe(true)
        expect(result.warning).toBe('')
      })

      it('passes for 45 minutes', () => {
        const result = validateScreenTimeForAge(45, '5-7')
        expect(result.isWithinRange).toBe(true)
      })

      it('passes for 60 minutes', () => {
        const result = validateScreenTimeForAge(60, '5-7')
        expect(result.isWithinRange).toBe(true)
      })

      it('warns for 20 minutes (below minimum)', () => {
        const result = validateScreenTimeForAge(20, '5-7')
        expect(result.isWithinRange).toBe(false)
        expect(result.warning).toContain('below')
        expect(result.warning).toContain('30 minutes')
      })

      it('warns for 90 minutes (above maximum)', () => {
        const result = validateScreenTimeForAge(90, '5-7')
        expect(result.isWithinRange).toBe(false)
        expect(result.warning).toContain('exceeds')
        expect(result.warning).toContain('60 minutes')
      })
    })

    describe('ages 8-10 (60-120 min range)', () => {
      it('passes for 60 minutes', () => {
        const result = validateScreenTimeForAge(60, '8-10')
        expect(result.isWithinRange).toBe(true)
      })

      it('passes for 90 minutes', () => {
        const result = validateScreenTimeForAge(90, '8-10')
        expect(result.isWithinRange).toBe(true)
      })

      it('passes for 120 minutes', () => {
        const result = validateScreenTimeForAge(120, '8-10')
        expect(result.isWithinRange).toBe(true)
      })

      it('warns for 150 minutes (above maximum)', () => {
        const result = validateScreenTimeForAge(150, '8-10')
        expect(result.isWithinRange).toBe(false)
        expect(result.warning).toContain('exceeds')
      })
    })

    describe('ages 11-13 (120-180 min range)', () => {
      it('passes for 120 minutes', () => {
        const result = validateScreenTimeForAge(120, '11-13')
        expect(result.isWithinRange).toBe(true)
      })

      it('passes for 150 minutes', () => {
        const result = validateScreenTimeForAge(150, '11-13')
        expect(result.isWithinRange).toBe(true)
      })

      it('warns for 200 minutes (above maximum)', () => {
        const result = validateScreenTimeForAge(200, '11-13')
        expect(result.isWithinRange).toBe(false)
        expect(result.warning).toContain('180 minutes')
      })
    })

    describe('ages 14-16 (180-240 min range)', () => {
      it('passes for 180 minutes', () => {
        const result = validateScreenTimeForAge(180, '14-16')
        expect(result.isWithinRange).toBe(true)
      })

      it('passes for 210 minutes', () => {
        const result = validateScreenTimeForAge(210, '14-16')
        expect(result.isWithinRange).toBe(true)
      })

      it('passes for 240 minutes', () => {
        const result = validateScreenTimeForAge(240, '14-16')
        expect(result.isWithinRange).toBe(true)
      })

      it('warns for 300 minutes (above maximum)', () => {
        const result = validateScreenTimeForAge(300, '14-16')
        expect(result.isWithinRange).toBe(false)
        expect(result.warning).toContain('exceeds')
        expect(result.warning).toContain('240 minutes')
      })
    })

    it('includes correct range values in result', () => {
      const result = validateScreenTimeForAge(90, '8-10')
      expect(result.valueMinutes).toBe(90)
      expect(result.recommendedMin).toBe(60)
      expect(result.recommendedMax).toBe(120)
    })
  })

  describe('validateScreenTimeTextForAge', () => {
    it('validates "30 minutes" for 5-7 as passing', () => {
      const result = validateScreenTimeTextForAge('30 minutes', '5-7')
      expect(result).not.toBeNull()
      expect(result?.isWithinRange).toBe(true)
    })

    it('validates "2 hours" for 8-10 as passing', () => {
      const result = validateScreenTimeTextForAge('2 hours', '8-10')
      expect(result).not.toBeNull()
      expect(result?.isWithinRange).toBe(true)
    })

    it('validates "3 hours" for 11-13 as passing', () => {
      const result = validateScreenTimeTextForAge('3 hours', '11-13')
      expect(result).not.toBeNull()
      expect(result?.isWithinRange).toBe(true)
    })

    it('returns null for unparseable text', () => {
      const result = validateScreenTimeTextForAge('unlimited screen time', '5-7')
      expect(result).toBeNull()
    })

    it('validates "1 hour on school days" context text', () => {
      const result = validateScreenTimeTextForAge('1 hour on school days', '8-10')
      expect(result).not.toBeNull()
      expect(result?.isWithinRange).toBe(true)
    })
  })

  describe('getScreenTimeRangeText', () => {
    it('returns "30-60 minutes" for ages 5-7', () => {
      expect(getScreenTimeRangeText('5-7')).toContain('30')
      expect(getScreenTimeRangeText('5-7')).toContain('60')
    })

    it('returns hours format for ages 8-10', () => {
      const text = getScreenTimeRangeText('8-10')
      expect(text).toContain('1')
      expect(text).toContain('2')
      expect(text).toContain('hour')
    })

    it('returns hours format for ages 11-13', () => {
      const text = getScreenTimeRangeText('11-13')
      expect(text).toContain('2')
      expect(text).toContain('3')
      expect(text).toContain('hour')
    })

    it('returns hours format for ages 14-16', () => {
      const text = getScreenTimeRangeText('14-16')
      expect(text).toContain('3')
      expect(text).toContain('4')
      expect(text).toContain('hour')
    })
  })

  describe('screen time progression by age', () => {
    it('recommended max increases with age', () => {
      const range57 = getRecommendedScreenTimeRange('5-7')
      const range810 = getRecommendedScreenTimeRange('8-10')
      const range1113 = getRecommendedScreenTimeRange('11-13')
      const range1416 = getRecommendedScreenTimeRange('14-16')

      expect(range57.max).toBeLessThan(range810.max)
      expect(range810.max).toBeLessThan(range1113.max)
      expect(range1113.max).toBeLessThan(range1416.max)
    })

    it('recommended min increases with age', () => {
      const range57 = getRecommendedScreenTimeRange('5-7')
      const range810 = getRecommendedScreenTimeRange('8-10')
      const range1113 = getRecommendedScreenTimeRange('11-13')
      const range1416 = getRecommendedScreenTimeRange('14-16')

      expect(range57.min).toBeLessThan(range810.min)
      expect(range810.min).toBeLessThan(range1113.min)
      expect(range1113.min).toBeLessThan(range1416.min)
    })

    it('younger age groups have narrower ranges', () => {
      const range57 = getRecommendedScreenTimeRange('5-7')
      const range1416 = getRecommendedScreenTimeRange('14-16')

      const range57Width = range57.max - range57.min
      const range1416Width = range1416.max - range1416.min

      expect(range57Width).toBeLessThanOrEqual(range1416Width)
    })
  })

  // ============================================
  // MONITORING VALIDATION TESTS (Story 4.2 - Task 5)
  // ============================================

  describe('MONITORING_INTENSITY_VALUES', () => {
    it('assigns correct intensity values', () => {
      expect(MONITORING_INTENSITY_VALUES.light).toBe(1)
      expect(MONITORING_INTENSITY_VALUES.moderate).toBe(2)
      expect(MONITORING_INTENSITY_VALUES.comprehensive).toBe(3)
    })

    it('comprehensive is more intensive than moderate', () => {
      expect(MONITORING_INTENSITY_VALUES.comprehensive).toBeGreaterThan(
        MONITORING_INTENSITY_VALUES.moderate
      )
    })

    it('moderate is more intensive than light', () => {
      expect(MONITORING_INTENSITY_VALUES.moderate).toBeGreaterThan(MONITORING_INTENSITY_VALUES.light)
    })
  })

  describe('getAllowedMonitoringLevels', () => {
    it('returns comprehensive only for ages 5-7', () => {
      expect(getAllowedMonitoringLevels('5-7')).toEqual(['comprehensive'])
    })

    it('returns comprehensive and moderate for ages 8-10', () => {
      const levels = getAllowedMonitoringLevels('8-10')
      expect(levels).toContain('comprehensive')
      expect(levels).toContain('moderate')
      expect(levels).not.toContain('light')
    })

    it('returns moderate and light for ages 11-13', () => {
      const levels = getAllowedMonitoringLevels('11-13')
      expect(levels).toContain('moderate')
      expect(levels).toContain('light')
      expect(levels).not.toContain('comprehensive')
    })

    it('returns light and moderate for ages 14-16', () => {
      const levels = getAllowedMonitoringLevels('14-16')
      expect(levels).toContain('light')
      expect(levels).toContain('moderate')
      expect(levels).not.toContain('comprehensive')
    })
  })

  describe('validateMonitoringLevelForAge', () => {
    describe('ages 5-7', () => {
      it('approves comprehensive monitoring', () => {
        const result = validateMonitoringLevelForAge('comprehensive', '5-7')
        expect(result.isAppropriate).toBe(true)
        expect(result.warning).toBe('')
      })

      it('warns for moderate monitoring (too light)', () => {
        const result = validateMonitoringLevelForAge('moderate', '5-7')
        expect(result.isAppropriate).toBe(false)
        expect(result.warning).toContain('may not provide enough oversight')
      })

      it('warns for light monitoring (too light)', () => {
        const result = validateMonitoringLevelForAge('light', '5-7')
        expect(result.isAppropriate).toBe(false)
        expect(result.warning).toContain('may not provide enough oversight')
      })
    })

    describe('ages 8-10', () => {
      it('approves comprehensive monitoring', () => {
        const result = validateMonitoringLevelForAge('comprehensive', '8-10')
        expect(result.isAppropriate).toBe(true)
      })

      it('approves moderate monitoring', () => {
        const result = validateMonitoringLevelForAge('moderate', '8-10')
        expect(result.isAppropriate).toBe(true)
      })

      it('warns for light monitoring', () => {
        const result = validateMonitoringLevelForAge('light', '8-10')
        expect(result.isAppropriate).toBe(false)
        expect(result.warning).toContain('may not provide enough oversight')
      })
    })

    describe('ages 11-13', () => {
      it('approves moderate monitoring', () => {
        const result = validateMonitoringLevelForAge('moderate', '11-13')
        expect(result.isAppropriate).toBe(true)
      })

      it('approves light monitoring', () => {
        const result = validateMonitoringLevelForAge('light', '11-13')
        expect(result.isAppropriate).toBe(true)
      })

      it('warns for comprehensive monitoring (too restrictive)', () => {
        const result = validateMonitoringLevelForAge('comprehensive', '11-13')
        expect(result.isAppropriate).toBe(false)
        expect(result.warning).toContain('too restrictive')
      })
    })

    describe('ages 14-16', () => {
      it('approves light monitoring', () => {
        const result = validateMonitoringLevelForAge('light', '14-16')
        expect(result.isAppropriate).toBe(true)
      })

      it('approves moderate monitoring', () => {
        const result = validateMonitoringLevelForAge('moderate', '14-16')
        expect(result.isAppropriate).toBe(true)
      })

      it('warns for comprehensive monitoring (too restrictive)', () => {
        const result = validateMonitoringLevelForAge('comprehensive', '14-16')
        expect(result.isAppropriate).toBe(false)
        expect(result.warning).toContain('too restrictive')
      })
    })

    it('includes correct values in result', () => {
      const result = validateMonitoringLevelForAge('moderate', '8-10')
      expect(result.level).toBe('moderate')
      expect(result.recommendedLevel).toBe('comprehensive')
      expect(result.allowedLevels).toContain('moderate')
    })
  })

  describe('isMonitoringProgressionValid', () => {
    it('returns true when older has same level as younger', () => {
      expect(isMonitoringProgressionValid('comprehensive', 'comprehensive')).toBe(true)
      expect(isMonitoringProgressionValid('moderate', 'moderate')).toBe(true)
      expect(isMonitoringProgressionValid('light', 'light')).toBe(true)
    })

    it('returns true when older has less intensive monitoring', () => {
      expect(isMonitoringProgressionValid('comprehensive', 'moderate')).toBe(true)
      expect(isMonitoringProgressionValid('comprehensive', 'light')).toBe(true)
      expect(isMonitoringProgressionValid('moderate', 'light')).toBe(true)
    })

    it('returns false when older has more intensive monitoring', () => {
      expect(isMonitoringProgressionValid('light', 'moderate')).toBe(false)
      expect(isMonitoringProgressionValid('light', 'comprehensive')).toBe(false)
      expect(isMonitoringProgressionValid('moderate', 'comprehensive')).toBe(false)
    })
  })

  describe('monitoring progression by age', () => {
    it('default monitoring decreases with age', () => {
      const level57 = getDefaultMonitoringLevel('5-7')
      const level810 = getDefaultMonitoringLevel('8-10')
      const level1113 = getDefaultMonitoringLevel('11-13')
      const level1416 = getDefaultMonitoringLevel('14-16')

      const intensity57 = MONITORING_INTENSITY_VALUES[level57]
      const intensity810 = MONITORING_INTENSITY_VALUES[level810]
      const intensity1113 = MONITORING_INTENSITY_VALUES[level1113]
      const intensity1416 = MONITORING_INTENSITY_VALUES[level1416]

      expect(intensity57).toBeGreaterThanOrEqual(intensity810)
      expect(intensity810).toBeGreaterThanOrEqual(intensity1113)
      expect(intensity1113).toBeGreaterThanOrEqual(intensity1416)
    })

    it('allowed levels expand as children age', () => {
      const levels57 = getAllowedMonitoringLevels('5-7')
      const levels810 = getAllowedMonitoringLevels('8-10')
      const levels1113 = getAllowedMonitoringLevels('11-13')
      const levels1416 = getAllowedMonitoringLevels('14-16')

      // 5-7 only allows comprehensive
      expect(levels57.length).toBe(1)
      // 8-10 allows more options
      expect(levels810.length).toBeGreaterThanOrEqual(levels57.length)
      // Older groups have more choices
      expect(levels1113.length).toBeGreaterThanOrEqual(1)
      expect(levels1416.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================
  // AGE-RELEVANT EXAMPLES TESTS (Story 4.2 - Task 6)
  // ============================================

  describe('AGE_RELEVANT_EXAMPLES', () => {
    it('has examples for all age groups', () => {
      expect(AGE_RELEVANT_EXAMPLES['5-7']).toBeDefined()
      expect(AGE_RELEVANT_EXAMPLES['8-10']).toBeDefined()
      expect(AGE_RELEVANT_EXAMPLES['11-13']).toBeDefined()
      expect(AGE_RELEVANT_EXAMPLES['14-16']).toBeDefined()
    })

    it('has all required categories for each age group', () => {
      const categories = ['activities', 'apps_games', 'content', 'social', 'safety', 'rewards']
      const ageGroups: AgeGroup[] = ['5-7', '8-10', '11-13', '14-16']

      for (const ageGroup of ageGroups) {
        for (const category of categories) {
          expect(AGE_RELEVANT_EXAMPLES[ageGroup]).toHaveProperty(category)
          expect(Array.isArray(AGE_RELEVANT_EXAMPLES[ageGroup][category as keyof typeof AGE_RELEVANT_EXAMPLES['5-7']])).toBe(true)
        }
      }
    })

    it('5-7 examples include age-appropriate content', () => {
      const examples = AGE_RELEVANT_EXAMPLES['5-7']
      expect(examples.activities.some((a) => a.includes('cartoon') || a.includes('playground'))).toBe(true)
      expect(examples.content.some((c) => c.includes('cartoon') || c.includes('bedtime'))).toBe(true)
    })

    it('8-10 examples include Minecraft and Roblox', () => {
      const examples = AGE_RELEVANT_EXAMPLES['8-10']
      expect(examples.apps_games.some((a) => a.includes('Minecraft'))).toBe(true)
      expect(examples.apps_games.some((a) => a.includes('Roblox'))).toBe(true)
    })

    it('11-13 examples include social and streaming content', () => {
      const examples = AGE_RELEVANT_EXAMPLES['11-13']
      expect(examples.activities.some((a) => a.includes('streaming') || a.includes('group'))).toBe(true)
      expect(examples.social.some((s) => s.includes('chat') || s.includes('gaming'))).toBe(true)
    })

    it('14-16 examples include career and social media content', () => {
      const examples = AGE_RELEVANT_EXAMPLES['14-16']
      expect(examples.activities.some((a) => a.includes('college') || a.includes('job'))).toBe(true)
      expect(examples.apps_games.some((a) => a.includes('Instagram') || a.includes('LinkedIn'))).toBe(true)
    })
  })

  describe('getAgeRelevantExamples', () => {
    it('returns examples for 5-7', () => {
      const examples = getAgeRelevantExamples('5-7')
      expect(examples.activities.length).toBeGreaterThan(0)
      expect(examples.apps_games.length).toBeGreaterThan(0)
    })

    it('returns examples for 8-10', () => {
      const examples = getAgeRelevantExamples('8-10')
      expect(examples.activities.length).toBeGreaterThan(0)
    })

    it('returns examples for 11-13', () => {
      const examples = getAgeRelevantExamples('11-13')
      expect(examples.activities.length).toBeGreaterThan(0)
    })

    it('returns examples for 14-16', () => {
      const examples = getAgeRelevantExamples('14-16')
      expect(examples.activities.length).toBeGreaterThan(0)
    })
  })

  describe('getExamplesByCategory', () => {
    it('returns activities for 5-7', () => {
      const activities = getExamplesByCategory('5-7', 'activities')
      expect(activities.length).toBeGreaterThan(0)
      expect(activities.some((a) => a.includes('playground') || a.includes('cartoon'))).toBe(true)
    })

    it('returns apps_games for 8-10', () => {
      const apps = getExamplesByCategory('8-10', 'apps_games')
      expect(apps.some((a) => a.includes('Minecraft'))).toBe(true)
    })

    it('returns safety examples for 11-13', () => {
      const safety = getExamplesByCategory('11-13', 'safety')
      expect(safety.some((s) => s.includes('cyberbullying'))).toBe(true)
    })

    it('returns rewards for 14-16', () => {
      const rewards = getExamplesByCategory('14-16', 'rewards')
      expect(rewards.some((r) => r.includes('self-managed') || r.includes('private'))).toBe(true)
    })
  })

  describe('formatExampleList', () => {
    it('returns empty string for empty array', () => {
      expect(formatExampleList([])).toBe('')
    })

    it('returns single item as-is', () => {
      expect(formatExampleList(['Minecraft'])).toBe('Minecraft')
    })

    it('joins two items with "and"', () => {
      expect(formatExampleList(['Minecraft', 'Roblox'])).toBe('Minecraft and Roblox')
    })

    it('joins three items with commas and "and"', () => {
      expect(formatExampleList(['Minecraft', 'Roblox', 'YouTube'])).toBe(
        'Minecraft, Roblox, and YouTube'
      )
    })

    it('limits to maxExamples', () => {
      const result = formatExampleList(['a', 'b', 'c', 'd', 'e'], 2)
      expect(result).toBe('a and b')
    })

    it('handles maxExamples of 3 (default)', () => {
      const result = formatExampleList(['a', 'b', 'c', 'd', 'e'])
      expect(result).toBe('a, b, and c')
    })
  })

  describe('example progression by age', () => {
    it('examples become more mature with age', () => {
      const young = getAgeRelevantExamples('5-7')
      const teen = getAgeRelevantExamples('14-16')

      // Young examples should have simple content
      expect(young.content.some((c) => c.includes('cartoon') || c.includes('stories'))).toBe(true)
      // Teen examples should have mature content
      expect(teen.content.some((c) => c.includes('career') || c.includes('college'))).toBe(true)
    })

    it('social examples increase in complexity with age', () => {
      const young = getAgeRelevantExamples('5-7')
      const teen = getAgeRelevantExamples('14-16')

      // Young: family-focused
      expect(young.social.some((s) => s.includes('family') || s.includes('grandparents'))).toBe(true)
      // Teen: networking-focused
      expect(teen.social.some((s) => s.includes('networking') || s.includes('reputation'))).toBe(true)
    })
  })
})
