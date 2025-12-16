/**
 * useTemplateDraft Tests
 *
 * Story 4.5: Template Customization Preview - Task 5
 * AC #5: Customized template is saved as "draft" for this child
 * AC #6: Draft persists until co-creation begins
 * AC #7: Parent can revert to original template at any time
 *
 * Tests:
 * - Draft initialization
 * - sessionStorage persistence
 * - Field modifications
 * - Rule management
 * - Revert functionality
 * - Diff status tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTemplateDraft } from '../useTemplateDraft'
import type { AgreementTemplate, MonitoringLevel } from '@fledgely/contracts'

const STORAGE_KEY_PREFIX = 'template-draft-'

// Mock template
const mockTemplate: AgreementTemplate = {
  id: 'template-8-10-balanced',
  name: 'Balanced Agreement (Ages 8-10)',
  description: 'A balanced approach to digital wellness',
  ageGroup: '8-10',
  philosophy: 'balanced',
  monitoringLevel: 'moderate',
  sections: [
    {
      id: 'rule-1',
      title: 'Screen Time Limits',
      description: 'Daily screen time rules',
      category: 'time',
      content: '60 minutes on school days',
    },
    {
      id: 'rule-2',
      title: 'Bedtime Rules',
      description: 'No screens before bed',
      category: 'time',
      content: 'No screens after 8:00 PM',
    },
    {
      id: 'rule-3',
      title: 'App Categories',
      description: 'Allowed app types',
      category: 'apps',
      content: 'Educational and entertainment apps',
    },
  ],
  version: '1.0',
  createdAt: '2024-01-01',
}

const mockChildId = 'child-123'

describe('useTemplateDraft', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('starts with null draft when no childId provided', () => {
      const { result } = renderHook(() => useTemplateDraft())
      expect(result.current.draft).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })

    it('loads existing draft from sessionStorage', () => {
      const existingDraft = {
        templateId: mockTemplate.id,
        childId: mockChildId,
        originalTemplate: mockTemplate,
        customizations: {
          screenTimeMinutes: 90,
          weekendScreenTimeMinutes: null,
          bedtimeCutoff: null,
          monitoringLevel: null,
          rules: {
            enabled: ['rule-1', 'rule-2', 'rule-3'],
            disabled: [],
            custom: [],
          },
        },
        modifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
      sessionStorage.setItem(
        `${STORAGE_KEY_PREFIX}${mockChildId}`,
        JSON.stringify(existingDraft)
      )

      const { result } = renderHook(() => useTemplateDraft(mockChildId))

      expect(result.current.draft).not.toBeNull()
      expect(result.current.draft?.customizations.screenTimeMinutes).toBe(90)
    })

    it('handles corrupted sessionStorage data gracefully', () => {
      sessionStorage.setItem(
        `${STORAGE_KEY_PREFIX}${mockChildId}`,
        'invalid json'
      )

      const { result } = renderHook(() => useTemplateDraft(mockChildId))

      expect(result.current.draft).toBeNull()
    })
  })

  describe('initializeDraft', () => {
    it('creates a new draft from template', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      expect(result.current.draft).not.toBeNull()
      expect(result.current.draft?.templateId).toBe(mockTemplate.id)
      expect(result.current.draft?.childId).toBe(mockChildId)
    })

    it('enables all template rules by default', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      expect(result.current.draft?.customizations.rules.enabled).toEqual([
        'rule-1',
        'rule-2',
        'rule-3',
      ])
      expect(result.current.draft?.customizations.rules.disabled).toEqual([])
    })

    it('saves draft to sessionStorage immediately', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      const stored = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${mockChildId}`)
      expect(stored).not.toBeNull()
    })
  })

  describe('screen time modifications', () => {
    it('updates weekday screen time', async () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.setScreenTime(120)
      })

      expect(result.current.draft?.customizations.screenTimeMinutes).toBe(120)
    })

    it('updates weekend screen time', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.setWeekendScreenTime(180)
      })

      expect(result.current.draft?.customizations.weekendScreenTimeMinutes).toBe(180)
    })

    it('marks draft as dirty after screen time change', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      // isDirty should be false after init (save clears it)
      act(() => {
        vi.advanceTimersByTime(600) // Past debounce
      })

      act(() => {
        result.current.setScreenTime(120)
      })

      expect(result.current.isDirty).toBe(true)
    })
  })

  describe('bedtime modifications', () => {
    it('updates bedtime cutoff', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.setBedtimeCutoff('21:30')
      })

      expect(result.current.draft?.customizations.bedtimeCutoff).toBe('21:30')
    })
  })

  describe('monitoring level modifications', () => {
    it('updates monitoring level', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.setMonitoringLevel('comprehensive')
      })

      expect(result.current.draft?.customizations.monitoringLevel).toBe('comprehensive')
    })
  })

  describe('rule management', () => {
    it('disables a template rule', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.disableRule('rule-2')
      })

      expect(result.current.draft?.customizations.rules.disabled).toContain('rule-2')
      expect(result.current.draft?.customizations.rules.enabled).not.toContain('rule-2')
    })

    it('re-enables a disabled rule', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.disableRule('rule-2')
      })

      act(() => {
        result.current.enableRule('rule-2')
      })

      expect(result.current.draft?.customizations.rules.enabled).toContain('rule-2')
      expect(result.current.draft?.customizations.rules.disabled).not.toContain('rule-2')
    })

    it('adds a custom rule', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.addCustomRule({
          title: 'No phones during meals',
          description: 'Keep family meals device-free',
          category: 'time',
        })
      })

      const customRules = result.current.draft?.customizations.rules.custom
      expect(customRules).toHaveLength(1)
      expect(customRules?.[0].title).toBe('No phones during meals')
      expect(customRules?.[0].id).toBeDefined()
      expect(customRules?.[0].createdAt).toBeDefined()
    })

    it('removes a custom rule', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.addCustomRule({
          title: 'Test rule',
          description: 'Test description',
          category: 'other',
        })
      })

      const ruleId = result.current.draft?.customizations.rules.custom[0].id

      act(() => {
        result.current.removeCustomRule(ruleId!)
      })

      expect(result.current.draft?.customizations.rules.custom).toHaveLength(0)
    })

    it('updates a custom rule', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.addCustomRule({
          title: 'Original title',
          description: 'Original description',
          category: 'time',
        })
      })

      const ruleId = result.current.draft?.customizations.rules.custom[0].id

      act(() => {
        result.current.updateCustomRule(ruleId!, { title: 'Updated title' })
      })

      expect(result.current.draft?.customizations.rules.custom[0].title).toBe('Updated title')
      expect(result.current.draft?.customizations.rules.custom[0].description).toBe('Original description')
    })
  })

  describe('revert functionality (AC #7)', () => {
    it('reverts all customizations to original', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      // Make various customizations
      act(() => {
        result.current.setScreenTime(120)
        result.current.setMonitoringLevel('comprehensive')
        result.current.disableRule('rule-1')
        result.current.addCustomRule({
          title: 'Custom rule',
          description: 'Test',
          category: 'other',
        })
      })

      // Revert
      act(() => {
        result.current.revertToOriginal()
      })

      expect(result.current.draft?.customizations.screenTimeMinutes).toBeNull()
      expect(result.current.draft?.customizations.monitoringLevel).toBeNull()
      expect(result.current.draft?.customizations.rules.disabled).toHaveLength(0)
      expect(result.current.draft?.customizations.rules.custom).toHaveLength(0)
    })

    it('re-enables all template rules on revert', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.disableRule('rule-1')
        result.current.disableRule('rule-2')
      })

      act(() => {
        result.current.revertToOriginal()
      })

      expect(result.current.draft?.customizations.rules.enabled).toEqual([
        'rule-1',
        'rule-2',
        'rule-3',
      ])
    })
  })

  describe('clearDraft', () => {
    it('removes draft from state and storage', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.clearDraft()
      })

      expect(result.current.draft).toBeNull()
      expect(sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${mockChildId}`)).toBeNull()
    })
  })

  describe('getDiffStatus', () => {
    it('returns original for unmodified fields', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      expect(result.current.getDiffStatus('screenTimeMinutes')).toBe('original')
      expect(result.current.getDiffStatus('monitoringLevel')).toBe('original')
    })

    it('returns modified for changed fields', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.setScreenTime(120)
      })

      expect(result.current.getDiffStatus('screenTimeMinutes')).toBe('modified')
    })

    it('returns added for custom rules', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      expect(result.current.getDiffStatus('custom-rule-123')).toBe('added')
    })

    it('returns removed for disabled rules', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.disableRule('rule-1')
      })

      expect(result.current.getDiffStatus('rule-rule-1')).toBe('removed')
    })
  })

  describe('getChangeCount', () => {
    it('returns 0 for no changes', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      expect(result.current.getChangeCount()).toBe(0)
    })

    it('counts modified scalar fields', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.setScreenTime(120)
        result.current.setMonitoringLevel('light')
      })

      expect(result.current.getChangeCount()).toBe(2)
    })

    it('counts disabled rules', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.disableRule('rule-1')
        result.current.disableRule('rule-2')
      })

      expect(result.current.getChangeCount()).toBe(2)
    })

    it('counts custom rules', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.addCustomRule({
          title: 'Rule 1',
          description: 'Desc',
          category: 'other',
        })
        result.current.addCustomRule({
          title: 'Rule 2',
          description: 'Desc',
          category: 'other',
        })
      })

      expect(result.current.getChangeCount()).toBe(2)
    })

    it('counts all change types together', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.setScreenTime(120) // +1
        result.current.setMonitoringLevel('light') // +1
        result.current.disableRule('rule-1') // +1
        result.current.addCustomRule({
          title: 'Custom',
          description: 'Test',
          category: 'other',
        }) // +1
      })

      expect(result.current.getChangeCount()).toBe(4)
    })
  })

  describe('auto-save behavior (AC #5)', () => {
    it('sets isDirty to true when changes are made', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      // After init + debounce, isDirty should be false
      act(() => {
        vi.advanceTimersByTime(600)
      })

      act(() => {
        result.current.setScreenTime(120)
      })

      expect(result.current.isDirty).toBe(true)
    })

    it('clears isDirty after debounced save completes', () => {
      const { result } = renderHook(() => useTemplateDraft())

      act(() => {
        result.current.initializeDraft(mockTemplate, mockChildId)
      })

      act(() => {
        result.current.setScreenTime(120)
      })

      expect(result.current.isDirty).toBe(true)

      // After debounce, should save and clear dirty flag
      act(() => {
        vi.advanceTimersByTime(600)
      })

      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('loadDraft', () => {
    it('returns draft from storage', () => {
      const existingDraft = {
        templateId: mockTemplate.id,
        childId: mockChildId,
        originalTemplate: mockTemplate,
        customizations: {
          screenTimeMinutes: 90,
          weekendScreenTimeMinutes: null,
          bedtimeCutoff: null,
          monitoringLevel: null,
          rules: {
            enabled: ['rule-1', 'rule-2', 'rule-3'],
            disabled: [],
            custom: [],
          },
        },
        modifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
      sessionStorage.setItem(
        `${STORAGE_KEY_PREFIX}${mockChildId}`,
        JSON.stringify(existingDraft)
      )

      const { result } = renderHook(() => useTemplateDraft())

      let loaded
      act(() => {
        loaded = result.current.loadDraft(mockChildId)
      })

      expect(loaded).not.toBeNull()
      expect(loaded?.customizations.screenTimeMinutes).toBe(90)
    })

    it('returns null when no draft exists', () => {
      const { result } = renderHook(() => useTemplateDraft())

      let loaded
      act(() => {
        loaded = result.current.loadDraft('nonexistent-child')
      })

      expect(loaded).toBeNull()
    })
  })
})
