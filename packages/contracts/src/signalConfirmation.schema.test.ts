/**
 * Signal Confirmation Schema Tests
 *
 * Story 7.5.3: Signal Confirmation & Resources - Task 1
 */

import { describe, it, expect } from 'vitest'
import {
  crisisResourceTypeSchema,
  crisisResourceSchema,
  crisisResourceListSchema,
  signalConfirmationContentSchema,
  confirmationStateSchema,
  DEFAULT_CRISIS_RESOURCES,
  DEFAULT_CONFIRMATION_CONTENT,
  SIGNAL_CONFIRMATION_CONSTANTS,
  getResourcesForJurisdiction,
  getResourceHref,
  createInitialConfirmationState,
  createVisibleConfirmationState,
  safeParseCrisisResource,
  safeParseSignalConfirmationContent,
  isChildAppropriateText,
  estimateReadingLevel,
  validateConfirmationReadingLevel,
  type CrisisResource,
  type SignalConfirmationContent,
} from './signalConfirmation.schema'

// ============================================================================
// Crisis Resource Type Schema Tests
// ============================================================================

describe('crisisResourceTypeSchema', () => {
  it('accepts valid resource types', () => {
    expect(crisisResourceTypeSchema.parse('text')).toBe('text')
    expect(crisisResourceTypeSchema.parse('phone')).toBe('phone')
    expect(crisisResourceTypeSchema.parse('web')).toBe('web')
    expect(crisisResourceTypeSchema.parse('chat')).toBe('chat')
  })

  it('rejects invalid resource types', () => {
    expect(() => crisisResourceTypeSchema.parse('email')).toThrow()
    expect(() => crisisResourceTypeSchema.parse('sms')).toThrow()
    expect(() => crisisResourceTypeSchema.parse('')).toThrow()
  })
})

// ============================================================================
// Crisis Resource Schema Tests
// ============================================================================

describe('crisisResourceSchema', () => {
  const validResource: CrisisResource = {
    id: 'test-resource',
    type: 'phone',
    name: 'Test Hotline',
    contact: '1-800-123-4567',
    action: 'Call 1-800-123-4567',
    description: 'Test description',
    priority: 1,
    jurisdictions: null,
    active: true,
  }

  it('accepts valid crisis resource', () => {
    const result = crisisResourceSchema.safeParse(validResource)
    expect(result.success).toBe(true)
  })

  it('accepts resource with href', () => {
    const withHref = { ...validResource, href: 'tel:+18001234567' }
    const result = crisisResourceSchema.safeParse(withHref)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.href).toBe('tel:+18001234567')
    }
  })

  it('accepts resource with specific jurisdictions', () => {
    const withJurisdictions = { ...validResource, jurisdictions: ['US-CA', 'US-TX'] }
    const result = crisisResourceSchema.safeParse(withJurisdictions)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.jurisdictions).toEqual(['US-CA', 'US-TX'])
    }
  })

  it('rejects resource with empty id', () => {
    const invalid = { ...validResource, id: '' }
    const result = crisisResourceSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects resource with empty name', () => {
    const invalid = { ...validResource, name: '' }
    const result = crisisResourceSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects resource with empty contact', () => {
    const invalid = { ...validResource, contact: '' }
    const result = crisisResourceSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects resource with negative priority', () => {
    const invalid = { ...validResource, priority: -1 }
    const result = crisisResourceSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('defaults priority to 10 if not provided', () => {
    const withoutPriority = {
      id: 'test',
      type: 'phone',
      name: 'Test',
      contact: '123',
      action: 'Call',
      description: 'Desc',
    }
    const result = crisisResourceSchema.safeParse(withoutPriority)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priority).toBe(10)
    }
  })

  it('defaults active to true if not provided', () => {
    const withoutActive = {
      id: 'test',
      type: 'phone',
      name: 'Test',
      contact: '123',
      action: 'Call',
      description: 'Desc',
    }
    const result = crisisResourceSchema.safeParse(withoutActive)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.active).toBe(true)
    }
  })
})

// ============================================================================
// Signal Confirmation Content Schema Tests
// ============================================================================

describe('signalConfirmationContentSchema', () => {
  it('accepts valid confirmation content', () => {
    const result = signalConfirmationContentSchema.safeParse(DEFAULT_CONFIRMATION_CONTENT)
    expect(result.success).toBe(true)
  })

  it('accepts minimal valid content', () => {
    const minimal = {
      message: 'Help is coming',
      offlineMessage: 'Saved for later',
      emergencyMessage: 'Call 911 if in danger',
      emergencyContact: '911',
      resources: [],
    }
    const result = signalConfirmationContentSchema.safeParse(minimal)
    expect(result.success).toBe(true)
  })

  it('rejects content with empty message', () => {
    const invalid = {
      ...DEFAULT_CONFIRMATION_CONTENT,
      message: '',
    }
    const result = signalConfirmationContentSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects content with empty offlineMessage', () => {
    const invalid = {
      ...DEFAULT_CONFIRMATION_CONTENT,
      offlineMessage: '',
    }
    const result = signalConfirmationContentSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects content with empty emergencyMessage', () => {
    const invalid = {
      ...DEFAULT_CONFIRMATION_CONTENT,
      emergencyMessage: '',
    }
    const result = signalConfirmationContentSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects content with dismissTimeout less than 1000ms', () => {
    const invalid = {
      ...DEFAULT_CONFIRMATION_CONTENT,
      dismissTimeout: 500,
    }
    const result = signalConfirmationContentSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('applies default dismissTimeout', () => {
    const withoutTimeout = {
      message: 'Help',
      offlineMessage: 'Saved',
      emergencyMessage: 'Call 911',
      emergencyContact: '911',
      resources: [],
    }
    const result = signalConfirmationContentSchema.safeParse(withoutTimeout)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.dismissTimeout).toBe(SIGNAL_CONFIRMATION_CONSTANTS.DEFAULT_DISPLAY_MS)
    }
  })
})

// ============================================================================
// Confirmation State Schema Tests
// ============================================================================

describe('confirmationStateSchema', () => {
  it('accepts valid confirmation state', () => {
    const state = {
      visible: true,
      isOffline: false,
      shownAt: Date.now(),
      userInteracted: false,
      fading: false,
    }
    const result = confirmationStateSchema.safeParse(state)
    expect(result.success).toBe(true)
  })

  it('accepts state with null shownAt', () => {
    const state = {
      visible: false,
      isOffline: false,
      shownAt: null,
      userInteracted: false,
      fading: false,
    }
    const result = confirmationStateSchema.safeParse(state)
    expect(result.success).toBe(true)
  })

  it('rejects state missing required fields', () => {
    const invalid = {
      visible: true,
    }
    const result = confirmationStateSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// Default Content Tests
// ============================================================================

describe('DEFAULT_CRISIS_RESOURCES', () => {
  it('contains expected number of resources', () => {
    expect(DEFAULT_CRISIS_RESOURCES.length).toBeGreaterThanOrEqual(3)
  })

  it('includes Crisis Text Line', () => {
    const textLine = DEFAULT_CRISIS_RESOURCES.find((r) => r.id === 'crisis-text-line')
    expect(textLine).toBeDefined()
    expect(textLine?.type).toBe('text')
    expect(textLine?.contact).toBe('741741')
  })

  it('includes 988 Lifeline', () => {
    const lifeline = DEFAULT_CRISIS_RESOURCES.find((r) => r.id === '988-lifeline')
    expect(lifeline).toBeDefined()
    expect(lifeline?.type).toBe('phone')
    expect(lifeline?.contact).toBe('988')
  })

  it('includes Childhelp Hotline', () => {
    const childhelp = DEFAULT_CRISIS_RESOURCES.find((r) => r.id === 'childhelp-hotline')
    expect(childhelp).toBeDefined()
    expect(childhelp?.type).toBe('phone')
  })

  it('all resources are valid', () => {
    DEFAULT_CRISIS_RESOURCES.forEach((resource) => {
      const result = crisisResourceSchema.safeParse(resource)
      expect(result.success).toBe(true)
    })
  })

  it('all resources have href', () => {
    DEFAULT_CRISIS_RESOURCES.forEach((resource) => {
      expect(resource.href).toBeDefined()
      expect(resource.href?.length).toBeGreaterThan(0)
    })
  })

  it('resources are sorted by priority', () => {
    const priorities = DEFAULT_CRISIS_RESOURCES.map((r) => r.priority)
    const sorted = [...priorities].sort((a, b) => a - b)
    expect(priorities).toEqual(sorted)
  })
})

describe('DEFAULT_CONFIRMATION_CONTENT', () => {
  it('is valid confirmation content', () => {
    const result = signalConfirmationContentSchema.safeParse(DEFAULT_CONFIRMATION_CONTENT)
    expect(result.success).toBe(true)
  })

  it('uses child-appropriate language', () => {
    const validation = validateConfirmationReadingLevel(DEFAULT_CONFIRMATION_CONTENT)
    expect(validation.valid).toBe(true)
  })

  it('has calming message', () => {
    expect(DEFAULT_CONFIRMATION_CONTENT.message).toBe('Someone will reach out')
    expect(DEFAULT_CONFIRMATION_CONTENT.message).not.toContain('emergency')
    expect(DEFAULT_CONFIRMATION_CONTENT.message).not.toContain('urgent')
  })

  it('has emergency information', () => {
    expect(DEFAULT_CONFIRMATION_CONTENT.emergencyContact).toBe('911')
    expect(DEFAULT_CONFIRMATION_CONTENT.emergencyMessage).toContain('911')
  })

  it('has offline message', () => {
    expect(DEFAULT_CONFIRMATION_CONTENT.offlineMessage).toBeDefined()
    expect(DEFAULT_CONFIRMATION_CONTENT.offlineMessage.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('getResourcesForJurisdiction', () => {
  const globalResource: CrisisResource = {
    id: 'global',
    type: 'phone',
    name: 'Global',
    contact: '123',
    action: 'Call',
    description: 'Desc',
    priority: 1,
    jurisdictions: null,
    active: true,
  }

  const caResource: CrisisResource = {
    id: 'california',
    type: 'phone',
    name: 'California',
    contact: '456',
    action: 'Call',
    description: 'Desc',
    priority: 2,
    jurisdictions: ['US-CA'],
    active: true,
  }

  const inactiveResource: CrisisResource = {
    id: 'inactive',
    type: 'phone',
    name: 'Inactive',
    contact: '789',
    action: 'Call',
    description: 'Desc',
    priority: 3,
    jurisdictions: null,
    active: false,
  }

  const resources = [globalResource, caResource, inactiveResource]

  it('returns global resources for any jurisdiction', () => {
    const result = getResourcesForJurisdiction(resources, 'US-TX')
    expect(result).toContainEqual(globalResource)
    expect(result).not.toContainEqual(caResource)
  })

  it('returns jurisdiction-specific resources', () => {
    const result = getResourcesForJurisdiction(resources, 'US-CA')
    expect(result).toContainEqual(globalResource)
    expect(result).toContainEqual(caResource)
  })

  it('filters out inactive resources', () => {
    const result = getResourcesForJurisdiction(resources, 'US-CA')
    expect(result).not.toContainEqual(inactiveResource)
  })

  it('sorts by priority', () => {
    const result = getResourcesForJurisdiction(resources, 'US-CA')
    expect(result[0].id).toBe('global')
    expect(result[1].id).toBe('california')
  })

  it('handles null jurisdiction', () => {
    const result = getResourcesForJurisdiction(resources, null)
    expect(result).toContainEqual(globalResource)
    expect(result).not.toContainEqual(caResource)
  })
})

describe('getResourceHref', () => {
  it('returns existing href if present', () => {
    const resource: CrisisResource = {
      id: 'test',
      type: 'phone',
      name: 'Test',
      contact: '123',
      action: 'Call',
      description: 'Desc',
      priority: 1,
      jurisdictions: null,
      active: true,
      href: 'tel:+1234567890',
    }
    expect(getResourceHref(resource)).toBe('tel:+1234567890')
  })

  it('generates tel: href for phone type', () => {
    const resource: CrisisResource = {
      id: 'test',
      type: 'phone',
      name: 'Test',
      contact: '1-800-123-4567',
      action: 'Call',
      description: 'Desc',
      priority: 1,
      jurisdictions: null,
      active: true,
    }
    expect(getResourceHref(resource)).toBe('tel:18001234567')
  })

  it('generates sms: href for text type', () => {
    const resource: CrisisResource = {
      id: 'test',
      type: 'text',
      name: 'Test',
      contact: '741741',
      action: 'Text',
      description: 'Desc',
      priority: 1,
      jurisdictions: null,
      active: true,
    }
    expect(getResourceHref(resource)).toBe('sms:741741?body=HOME')
  })

  it('generates https: href for web type without protocol', () => {
    const resource: CrisisResource = {
      id: 'test',
      type: 'web',
      name: 'Test',
      contact: 'example.org',
      action: 'Visit',
      description: 'Desc',
      priority: 1,
      jurisdictions: null,
      active: true,
    }
    expect(getResourceHref(resource)).toBe('https://example.org')
  })

  it('preserves https: href for web type with protocol', () => {
    const resource: CrisisResource = {
      id: 'test',
      type: 'web',
      name: 'Test',
      contact: 'https://example.org/help',
      action: 'Visit',
      description: 'Desc',
      priority: 1,
      jurisdictions: null,
      active: true,
    }
    expect(getResourceHref(resource)).toBe('https://example.org/help')
  })
})

describe('createInitialConfirmationState', () => {
  it('creates initial state with correct defaults', () => {
    const state = createInitialConfirmationState()
    expect(state.visible).toBe(false)
    expect(state.isOffline).toBe(false)
    expect(state.shownAt).toBeNull()
    expect(state.userInteracted).toBe(false)
    expect(state.fading).toBe(false)
  })
})

describe('createVisibleConfirmationState', () => {
  it('creates visible state for online', () => {
    const state = createVisibleConfirmationState(false)
    expect(state.visible).toBe(true)
    expect(state.isOffline).toBe(false)
    expect(state.shownAt).toBeDefined()
    expect(state.shownAt).toBeGreaterThan(0)
  })

  it('creates visible state for offline', () => {
    const state = createVisibleConfirmationState(true)
    expect(state.visible).toBe(true)
    expect(state.isOffline).toBe(true)
  })
})

describe('safeParseCrisisResource', () => {
  it('returns resource for valid input', () => {
    const valid = {
      id: 'test',
      type: 'phone',
      name: 'Test',
      contact: '123',
      action: 'Call',
      description: 'Desc',
    }
    const result = safeParseCrisisResource(valid)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('test')
  })

  it('returns null for invalid input', () => {
    const invalid = { id: '' }
    expect(safeParseCrisisResource(invalid)).toBeNull()
  })
})

describe('safeParseSignalConfirmationContent', () => {
  it('returns content for valid input', () => {
    const result = safeParseSignalConfirmationContent(DEFAULT_CONFIRMATION_CONTENT)
    expect(result).not.toBeNull()
  })

  it('returns null for invalid input', () => {
    const invalid = { message: '' }
    expect(safeParseSignalConfirmationContent(invalid)).toBeNull()
  })
})

// ============================================================================
// Reading Level Validation Tests
// ============================================================================

describe('isChildAppropriateText', () => {
  it('accepts short sentences', () => {
    expect(isChildAppropriateText('Help is coming.')).toBe(true)
    expect(isChildAppropriateText('You can get help now.')).toBe(true)
  })

  it('accepts multiple short sentences', () => {
    expect(isChildAppropriateText('Help is coming. You are not alone.')).toBe(true)
  })

  it('rejects very long sentences', () => {
    const longSentence =
      'This is a very long sentence that contains more than fifteen words and should be rejected by the validator.'
    expect(isChildAppropriateText(longSentence)).toBe(false)
  })

  it('handles empty text', () => {
    expect(isChildAppropriateText('')).toBe(true)
  })
})

describe('estimateReadingLevel', () => {
  it('returns low grade for simple text', () => {
    const level = estimateReadingLevel('Help is coming.')
    expect(level).toBeLessThanOrEqual(6)
  })

  it('returns higher grade for complex text', () => {
    const complex =
      'The comprehensive implementation necessitates sophisticated architectural considerations.'
    const level = estimateReadingLevel(complex)
    expect(level).toBeGreaterThan(6)
  })

  it('returns 0 for empty text', () => {
    expect(estimateReadingLevel('')).toBe(0)
  })
})

describe('validateConfirmationReadingLevel', () => {
  it('validates default content passes', () => {
    const result = validateConfirmationReadingLevel(DEFAULT_CONFIRMATION_CONTENT)
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('reports issues for complex text', () => {
    const complexContent: SignalConfirmationContent = {
      ...DEFAULT_CONFIRMATION_CONTENT,
      message:
        'The comprehensive implementation necessitates sophisticated architectural considerations for your immediate assistance.',
    }
    const result = validateConfirmationReadingLevel(complexContent)
    expect(result.valid).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues.some((i) => i.includes('message'))).toBe(true)
  })

  it('checks resource descriptions', () => {
    const complexResources: SignalConfirmationContent = {
      ...DEFAULT_CONFIRMATION_CONTENT,
      resources: [
        {
          id: 'test',
          type: 'phone',
          name: 'Test',
          contact: '123',
          action: 'Call for immediate comprehensive professional psychological assistance',
          description:
            'This comprehensive service provides sophisticated psychological intervention methodologies.',
          priority: 1,
          jurisdictions: null,
          active: true,
        },
      ],
    }
    const result = validateConfirmationReadingLevel(complexResources)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.includes('resources'))).toBe(true)
  })
})

// ============================================================================
// Constants Tests
// ============================================================================

describe('SIGNAL_CONFIRMATION_CONSTANTS', () => {
  it('has reasonable display timeout', () => {
    expect(SIGNAL_CONFIRMATION_CONSTANTS.DEFAULT_DISPLAY_MS).toBeGreaterThanOrEqual(5000)
    expect(SIGNAL_CONFIRMATION_CONSTANTS.DEFAULT_DISPLAY_MS).toBeLessThanOrEqual(30000)
  })

  it('has extended timeout longer than default', () => {
    expect(SIGNAL_CONFIRMATION_CONSTANTS.EXTENDED_DISPLAY_MS).toBeGreaterThan(
      SIGNAL_CONFIRMATION_CONSTANTS.DEFAULT_DISPLAY_MS
    )
  })

  it('has appropriate max reading level', () => {
    expect(SIGNAL_CONFIRMATION_CONSTANTS.MAX_READING_LEVEL).toBeLessThanOrEqual(8)
  })

  it('has reasonable sentence length limit', () => {
    expect(SIGNAL_CONFIRMATION_CONSTANTS.MAX_WORDS_PER_SENTENCE).toBeLessThanOrEqual(20)
    expect(SIGNAL_CONFIRMATION_CONSTANTS.MAX_WORDS_PER_SENTENCE).toBeGreaterThanOrEqual(10)
  })
})
