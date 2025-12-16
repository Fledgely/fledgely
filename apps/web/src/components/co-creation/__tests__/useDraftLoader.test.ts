/**
 * Unit tests for useDraftLoader Hook
 *
 * Story 5.1: Co-Creation Session Initiation - Task 7.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import {
  loadWizardDraft,
  loadTemplateDraft,
  clearWizardDraft,
  clearTemplateDraft,
  useDraftLoader,
  transformDraftToTerms,
  buildDraftUrl,
  type WizardDraft,
  type TemplateDraft,
  type DraftSource,
} from '../useDraftLoader'
import type { AgreementTemplate } from '@fledgely/contracts'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}))

import { useSearchParams } from 'next/navigation'
const mockUseSearchParams = vi.mocked(useSearchParams)

describe('useDraftLoader', () => {
  const mockWizardDraft: WizardDraft = {
    childAge: '10',
    templateId: 'template-123',
    customizations: {
      screenTimeMinutes: 60,
      bedtimeCutoff: '20:00',
      monitoringLevel: 'moderate',
      selectedRules: ['rule-1', 'rule-2'],
    },
    createdAt: '2024-01-15T10:00:00Z',
  }

  const mockTemplate: AgreementTemplate = {
    id: 'template-123',
    name: 'Test Template',
    description: 'A test template',
    ageRange: { min: 8, max: 12 },
    sections: [
      {
        id: 'section-1',
        title: 'Screen Time Rules',
        description: 'Rules about screen time',
        content: [],
        order: 1,
      },
      {
        id: 'section-2',
        title: 'Bedtime Rules',
        description: 'Rules about bedtime',
        content: [],
        order: 2,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    popularity: 100,
    isRecommended: true,
  }

  const mockTemplateDraft: TemplateDraft = {
    templateId: 'template-123',
    childId: 'child-456',
    originalTemplate: mockTemplate,
    customizations: {
      screenTimeMinutes: 90,
      weekendScreenTimeMinutes: 120,
      bedtimeCutoff: '21:00',
      monitoringLevel: 'light',
      rules: {
        enabled: ['section-1'],
        disabled: ['section-2'],
        custom: [
          {
            id: 'custom-1',
            title: 'No phones at dinner',
            description: 'Put phones away during meals',
            category: 'time',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ],
      },
    },
    modifiedAt: '2024-01-15T11:00:00Z',
    createdAt: '2024-01-15T10:00:00Z',
  }

  // Mock search params
  let mockSearchParams: Map<string, string>

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    mockSearchParams = new Map()
    mockUseSearchParams.mockReturnValue({
      get: (key: string) => mockSearchParams.get(key) ?? null,
    } as ReturnType<typeof useSearchParams>)
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  // ============================================
  // LOAD WIZARD DRAFT TESTS
  // ============================================
  describe('loadWizardDraft', () => {
    it('returns null when no draft in storage', () => {
      const result = loadWizardDraft()
      expect(result).toBeNull()
    })

    it('loads valid wizard draft from storage', () => {
      sessionStorage.setItem('quick-start-wizard', JSON.stringify(mockWizardDraft))

      const result = loadWizardDraft()

      expect(result).toEqual(mockWizardDraft)
    })

    it('returns null for invalid JSON', () => {
      sessionStorage.setItem('quick-start-wizard', 'invalid-json')

      const result = loadWizardDraft()

      expect(result).toBeNull()
    })

    it('returns null for draft missing templateId', () => {
      const invalidDraft = { ...mockWizardDraft, templateId: undefined }
      sessionStorage.setItem('quick-start-wizard', JSON.stringify(invalidDraft))

      const result = loadWizardDraft()

      expect(result).toBeNull()
    })

    it('returns null for draft missing customizations', () => {
      const invalidDraft = { ...mockWizardDraft, customizations: undefined }
      sessionStorage.setItem('quick-start-wizard', JSON.stringify(invalidDraft))

      const result = loadWizardDraft()

      expect(result).toBeNull()
    })
  })

  // ============================================
  // LOAD TEMPLATE DRAFT TESTS
  // ============================================
  describe('loadTemplateDraft', () => {
    it('returns null when no draft in storage', () => {
      const result = loadTemplateDraft('child-456')
      expect(result).toBeNull()
    })

    it('loads valid template draft from storage', () => {
      sessionStorage.setItem('template-draft-child-456', JSON.stringify(mockTemplateDraft))

      const result = loadTemplateDraft('child-456')

      expect(result).toEqual(mockTemplateDraft)
    })

    it('returns null for invalid JSON', () => {
      sessionStorage.setItem('template-draft-child-456', 'invalid-json')

      const result = loadTemplateDraft('child-456')

      expect(result).toBeNull()
    })

    it('returns null for draft missing templateId', () => {
      const invalidDraft = { ...mockTemplateDraft, templateId: undefined }
      sessionStorage.setItem('template-draft-child-456', JSON.stringify(invalidDraft))

      const result = loadTemplateDraft('child-456')

      expect(result).toBeNull()
    })

    it('returns null for draft missing originalTemplate', () => {
      const invalidDraft = { ...mockTemplateDraft, originalTemplate: undefined }
      sessionStorage.setItem('template-draft-child-456', JSON.stringify(invalidDraft))

      const result = loadTemplateDraft('child-456')

      expect(result).toBeNull()
    })

    it('loads correct draft for specific child', () => {
      sessionStorage.setItem('template-draft-child-A', JSON.stringify({ ...mockTemplateDraft, childId: 'child-A' }))
      sessionStorage.setItem('template-draft-child-B', JSON.stringify({ ...mockTemplateDraft, childId: 'child-B' }))

      const result = loadTemplateDraft('child-A')

      expect(result?.childId).toBe('child-A')
    })
  })

  // ============================================
  // CLEAR DRAFT TESTS
  // ============================================
  describe('clearWizardDraft', () => {
    it('removes wizard draft from storage', () => {
      sessionStorage.setItem('quick-start-wizard', JSON.stringify(mockWizardDraft))

      clearWizardDraft()

      expect(sessionStorage.getItem('quick-start-wizard')).toBeNull()
    })

    it('handles missing draft gracefully', () => {
      expect(() => clearWizardDraft()).not.toThrow()
    })
  })

  describe('clearTemplateDraft', () => {
    it('removes template draft from storage', () => {
      sessionStorage.setItem('template-draft-child-456', JSON.stringify(mockTemplateDraft))

      clearTemplateDraft('child-456')

      expect(sessionStorage.getItem('template-draft-child-456')).toBeNull()
    })

    it('only removes draft for specified child', () => {
      sessionStorage.setItem('template-draft-child-A', JSON.stringify(mockTemplateDraft))
      sessionStorage.setItem('template-draft-child-B', JSON.stringify(mockTemplateDraft))

      clearTemplateDraft('child-A')

      expect(sessionStorage.getItem('template-draft-child-A')).toBeNull()
      expect(sessionStorage.getItem('template-draft-child-B')).not.toBeNull()
    })
  })

  // ============================================
  // USE DRAFT LOADER HOOK TESTS
  // ============================================
  describe('useDraftLoader hook', () => {
    it('returns blank when no draft available', async () => {
      const { result } = renderHook(() => useDraftLoader('child-456'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.draftSource.type).toBe('blank')
      expect(result.current.error).toBeNull()
    })

    it('loads wizard draft from storage', async () => {
      sessionStorage.setItem('quick-start-wizard', JSON.stringify(mockWizardDraft))

      const { result } = renderHook(() => useDraftLoader('child-456'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.draftSource.type).toBe('wizard')
      if (result.current.draftSource.type === 'wizard') {
        expect(result.current.draftSource.draft).toEqual(mockWizardDraft)
      }
    })

    it('prioritizes template draft over wizard draft', async () => {
      sessionStorage.setItem('quick-start-wizard', JSON.stringify(mockWizardDraft))
      sessionStorage.setItem('template-draft-child-456', JSON.stringify(mockTemplateDraft))

      const { result } = renderHook(() => useDraftLoader('child-456'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Template draft for specific child should take priority
      expect(result.current.draftSource.type).toBe('template_customization')
    })

    it('loads wizard draft from URL params', async () => {
      mockSearchParams.set('draftType', 'wizard')
      sessionStorage.setItem('quick-start-wizard', JSON.stringify(mockWizardDraft))

      const { result } = renderHook(() => useDraftLoader('child-456'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.draftSource.type).toBe('wizard')
    })

    it('loads template draft from URL params', async () => {
      mockSearchParams.set('draftType', 'template')
      mockSearchParams.set('draftId', 'child-456')
      sessionStorage.setItem('template-draft-child-456', JSON.stringify(mockTemplateDraft))

      const { result } = renderHook(() => useDraftLoader('child-456'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.draftSource.type).toBe('template_customization')
    })

    it('sets error when URL-requested wizard draft not found', async () => {
      mockSearchParams.set('draftType', 'wizard')
      // No wizard draft in storage

      const { result } = renderHook(() => useDraftLoader('child-456'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toContain('not found')
      expect(result.current.draftSource.type).toBe('blank')
    })

    it('clearDraft removes wizard draft', async () => {
      sessionStorage.setItem('quick-start-wizard', JSON.stringify(mockWizardDraft))

      const { result } = renderHook(() => useDraftLoader('child-456'))

      await waitFor(() => {
        expect(result.current.draftSource.type).toBe('wizard')
      })

      act(() => {
        result.current.clearDraft()
      })

      expect(result.current.draftSource.type).toBe('blank')
      expect(sessionStorage.getItem('quick-start-wizard')).toBeNull()
    })

    it('clearDraft removes template draft', async () => {
      sessionStorage.setItem('template-draft-child-456', JSON.stringify(mockTemplateDraft))

      const { result } = renderHook(() => useDraftLoader('child-456'))

      await waitFor(() => {
        expect(result.current.draftSource.type).toBe('template_customization')
      })

      act(() => {
        result.current.clearDraft()
      })

      expect(result.current.draftSource.type).toBe('blank')
      expect(sessionStorage.getItem('template-draft-child-456')).toBeNull()
    })

    it('refresh reloads draft data', async () => {
      const { result } = renderHook(() => useDraftLoader('child-456'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.draftSource.type).toBe('blank')

      // Add draft to storage
      sessionStorage.setItem('quick-start-wizard', JSON.stringify(mockWizardDraft))

      // Refresh
      act(() => {
        result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.draftSource.type).toBe('wizard')
      })
    })
  })

  // ============================================
  // TRANSFORM DRAFT TO TERMS TESTS
  // ============================================
  describe('transformDraftToTerms', () => {
    it('returns empty array for blank draft', () => {
      const result = transformDraftToTerms({ type: 'blank' })
      expect(result).toEqual([])
    })

    it('transforms wizard draft screen time', () => {
      const draftSource: DraftSource = { type: 'wizard', draft: mockWizardDraft }

      const result = transformDraftToTerms(draftSource)

      const screenTimeTerm = result.find((t) => t.type === 'screen_time')
      expect(screenTimeTerm).toBeDefined()
      expect(screenTimeTerm?.content.weekdayMinutes).toBe(60)
      expect(screenTimeTerm?.addedBy).toBe('parent')
    })

    it('transforms wizard draft bedtime', () => {
      const draftSource: DraftSource = { type: 'wizard', draft: mockWizardDraft }

      const result = transformDraftToTerms(draftSource)

      const bedtimeTerm = result.find((t) => t.type === 'bedtime')
      expect(bedtimeTerm).toBeDefined()
      expect(bedtimeTerm?.content.time).toBe('20:00')
    })

    it('transforms wizard draft monitoring level', () => {
      const draftSource: DraftSource = { type: 'wizard', draft: mockWizardDraft }

      const result = transformDraftToTerms(draftSource)

      const monitoringTerm = result.find((t) => t.type === 'monitoring')
      expect(monitoringTerm).toBeDefined()
      expect(monitoringTerm?.content.level).toBe('moderate')
    })

    it('transforms wizard draft rules', () => {
      const draftSource: DraftSource = { type: 'wizard', draft: mockWizardDraft }

      const result = transformDraftToTerms(draftSource)

      const ruleterms = result.filter((t) => t.type === 'rule')
      expect(ruleterms).toHaveLength(2)
      expect(ruleterms[0].content.ruleId).toBe('rule-1')
      expect(ruleterms[1].content.ruleId).toBe('rule-2')
    })

    it('transforms template draft with customizations', () => {
      const draftSource: DraftSource = { type: 'template_customization', draft: mockTemplateDraft }

      const result = transformDraftToTerms(draftSource)

      const screenTimeTerm = result.find((t) => t.type === 'screen_time')
      expect(screenTimeTerm?.content.weekdayMinutes).toBe(90)
      expect(screenTimeTerm?.content.weekendMinutes).toBe(120)
    })

    it('transforms template draft custom rules', () => {
      const draftSource: DraftSource = { type: 'template_customization', draft: mockTemplateDraft }

      const result = transformDraftToTerms(draftSource)

      const customRule = result.find(
        (t) => t.type === 'rule' && t.content.fromTemplate === false
      )
      expect(customRule).toBeDefined()
      expect(customRule?.content.title).toBe('No phones at dinner')
    })

    it('includes template section info for enabled rules', () => {
      const draftSource: DraftSource = { type: 'template_customization', draft: mockTemplateDraft }

      const result = transformDraftToTerms(draftSource)

      const templateRule = result.find(
        (t) => t.type === 'rule' && t.content.fromTemplate === true
      )
      expect(templateRule).toBeDefined()
      expect(templateRule?.content.title).toBe('Screen Time Rules')
    })
  })

  // ============================================
  // BUILD DRAFT URL TESTS
  // ============================================
  describe('buildDraftUrl', () => {
    it('builds wizard draft URL', () => {
      const url = buildDraftUrl('/agreements/create/child-123', 'wizard')

      expect(url).toBe('/agreements/create/child-123?draftType=wizard')
    })

    it('builds template draft URL with draftId', () => {
      const url = buildDraftUrl('/agreements/create/child-123', 'template', 'child-456')

      expect(url).toBe('/agreements/create/child-123?draftType=template&draftId=child-456')
    })

    it('preserves base path', () => {
      const url = buildDraftUrl('/some/nested/path', 'wizard')

      expect(url).toContain('/some/nested/path')
    })
  })
})
