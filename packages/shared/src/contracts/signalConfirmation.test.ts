/**
 * Signal Confirmation Contracts Tests - Story 7.5.3 Task 1
 *
 * Tests for confirmation and crisis resource data models.
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  RESOURCE_TYPE,
  CONFIRMATION_DEFAULTS,
  // Schemas
  resourceTypeSchema,
  crisisResourceSchema,
  signalConfirmationSchema,
  confirmationContentSchema,
  confirmationDisplayEventSchema,
  // Types
  CrisisResource,
  SignalConfirmation,
  ConfirmationContent,
  ConfirmationDisplayEvent,
  // ID Generators
  generateResourceId,
  generateConfirmationId,
  generateDisplayEventId,
  // Factory Functions
  createCrisisResource,
  createSignalConfirmation,
  createConfirmationContent,
  createConfirmationDisplayEvent,
  createDefaultUSResources,
  createDefaultUKResources,
  createDefaultCAResources,
  createDefaultAUResources,
  // Validation Functions
  validateCrisisResource,
  validateSignalConfirmation,
  validateConfirmationContent,
  isCrisisResource,
  isSignalConfirmation,
  // Utility Functions
  validateReadingLevel,
  getResourcesByType,
  getResourcesByJurisdiction,
  sortResourcesByPriority,
  filterChatResources,
} from './signalConfirmation'

// ============================================
// Constants Tests
// ============================================

describe('Signal Confirmation Constants', () => {
  describe('RESOURCE_TYPE', () => {
    it('should have all required resource types', () => {
      expect(RESOURCE_TYPE.PHONE).toBe('phone')
      expect(RESOURCE_TYPE.TEXT).toBe('text')
      expect(RESOURCE_TYPE.CHAT).toBe('chat')
      expect(RESOURCE_TYPE.WEBSITE).toBe('website')
    })
  })

  describe('CONFIRMATION_DEFAULTS', () => {
    it('should have default auto-dismiss time of 30 seconds', () => {
      expect(CONFIRMATION_DEFAULTS.AUTO_DISMISS_MS).toBe(30000)
    })

    it('should have default max reading level of 6th grade', () => {
      expect(CONFIRMATION_DEFAULTS.MAX_READING_LEVEL).toBe(6)
    })
  })
})

// ============================================
// Schema Tests
// ============================================

describe('Resource Type Schema', () => {
  it('should accept valid resource types', () => {
    expect(resourceTypeSchema.safeParse('phone').success).toBe(true)
    expect(resourceTypeSchema.safeParse('text').success).toBe(true)
    expect(resourceTypeSchema.safeParse('chat').success).toBe(true)
    expect(resourceTypeSchema.safeParse('website').success).toBe(true)
  })

  it('should reject invalid resource types', () => {
    expect(resourceTypeSchema.safeParse('email').success).toBe(false)
    expect(resourceTypeSchema.safeParse('fax').success).toBe(false)
    expect(resourceTypeSchema.safeParse('').success).toBe(false)
  })
})

describe('Crisis Resource Schema', () => {
  const validResource: CrisisResource = {
    id: 'res_123',
    name: 'Crisis Text Line',
    description: 'Text HOME to 741741 for help',
    type: 'text',
    value: '741741',
    priority: 2,
    jurisdictions: ['US'],
    available24x7: true,
    chatAvailable: false,
  }

  it('should accept valid crisis resource', () => {
    expect(crisisResourceSchema.safeParse(validResource).success).toBe(true)
  })

  it('should require all required fields', () => {
    const incomplete = { id: 'res_123', name: 'Test' }
    expect(crisisResourceSchema.safeParse(incomplete).success).toBe(false)
  })

  it('should require non-empty id', () => {
    const result = crisisResourceSchema.safeParse({ ...validResource, id: '' })
    expect(result.success).toBe(false)
  })

  it('should require non-empty name', () => {
    const result = crisisResourceSchema.safeParse({ ...validResource, name: '' })
    expect(result.success).toBe(false)
  })

  it('should require non-empty value', () => {
    const result = crisisResourceSchema.safeParse({ ...validResource, value: '' })
    expect(result.success).toBe(false)
  })

  it('should require non-negative priority', () => {
    const result = crisisResourceSchema.safeParse({ ...validResource, priority: -1 })
    expect(result.success).toBe(false)
  })

  it('should allow empty jurisdictions array for universal resources', () => {
    const universal = { ...validResource, jurisdictions: [] }
    expect(crisisResourceSchema.safeParse(universal).success).toBe(true)
  })

  it('should require jurisdictions to be strings', () => {
    const result = crisisResourceSchema.safeParse({
      ...validResource,
      jurisdictions: [123],
    })
    expect(result.success).toBe(false)
  })
})

describe('Signal Confirmation Schema', () => {
  const validConfirmation: SignalConfirmation = {
    id: 'conf_123',
    signalId: 'sig_123',
    displayedAt: new Date(),
    dismissedAt: null,
    autoDismissedAt: null,
    resources: [],
    emergencyMessageShown: true,
    autoDismissAfterMs: 30000,
    jurisdiction: 'US',
    childAge: 12,
    isOffline: false,
  }

  it('should accept valid signal confirmation', () => {
    expect(signalConfirmationSchema.safeParse(validConfirmation).success).toBe(true)
  })

  it('should allow null dismissedAt', () => {
    const result = signalConfirmationSchema.safeParse({
      ...validConfirmation,
      dismissedAt: null,
    })
    expect(result.success).toBe(true)
  })

  it('should accept dismissedAt as Date', () => {
    const result = signalConfirmationSchema.safeParse({
      ...validConfirmation,
      dismissedAt: new Date(),
    })
    expect(result.success).toBe(true)
  })

  it('should allow null autoDismissedAt', () => {
    const result = signalConfirmationSchema.safeParse({
      ...validConfirmation,
      autoDismissedAt: null,
    })
    expect(result.success).toBe(true)
  })

  it('should require valid child age (0-17)', () => {
    expect(signalConfirmationSchema.safeParse({ ...validConfirmation, childAge: -1 }).success).toBe(
      false
    )
    expect(signalConfirmationSchema.safeParse({ ...validConfirmation, childAge: 18 }).success).toBe(
      false
    )
    expect(signalConfirmationSchema.safeParse({ ...validConfirmation, childAge: 0 }).success).toBe(
      true
    )
    expect(signalConfirmationSchema.safeParse({ ...validConfirmation, childAge: 17 }).success).toBe(
      true
    )
  })

  it('should require positive autoDismissAfterMs', () => {
    const result = signalConfirmationSchema.safeParse({
      ...validConfirmation,
      autoDismissAfterMs: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('Confirmation Content Schema', () => {
  const validContent: ConfirmationContent = {
    headerText: 'Someone will reach out',
    bodyText: 'You did the right thing by asking for help.',
    emergencyText: 'If you are in danger right now, call 911',
    chatPromptText: 'Chat with someone now',
    dismissButtonText: 'Got it',
  }

  it('should accept valid confirmation content', () => {
    expect(confirmationContentSchema.safeParse(validContent).success).toBe(true)
  })

  it('should require non-empty headerText', () => {
    const result = confirmationContentSchema.safeParse({ ...validContent, headerText: '' })
    expect(result.success).toBe(false)
  })

  it('should require non-empty bodyText', () => {
    const result = confirmationContentSchema.safeParse({ ...validContent, bodyText: '' })
    expect(result.success).toBe(false)
  })

  it('should require non-empty emergencyText', () => {
    const result = confirmationContentSchema.safeParse({ ...validContent, emergencyText: '' })
    expect(result.success).toBe(false)
  })
})

describe('Confirmation Display Event Schema', () => {
  const validEvent: ConfirmationDisplayEvent = {
    id: 'evt_123',
    confirmationId: 'conf_123',
    signalId: 'sig_123',
    eventType: 'displayed',
    resourceId: null,
    timestamp: new Date(),
    durationMs: null,
  }

  it('should accept valid display event', () => {
    expect(confirmationDisplayEventSchema.safeParse(validEvent).success).toBe(true)
  })

  it('should accept all event types', () => {
    const types = ['displayed', 'dismissed', 'auto_dismissed', 'resource_clicked']
    types.forEach((type) => {
      const result = confirmationDisplayEventSchema.safeParse({
        ...validEvent,
        eventType: type,
      })
      expect(result.success).toBe(true)
    })
  })

  it('should allow resourceId for resource_clicked event', () => {
    const result = confirmationDisplayEventSchema.safeParse({
      ...validEvent,
      eventType: 'resource_clicked',
      resourceId: 'res_123',
    })
    expect(result.success).toBe(true)
  })

  it('should allow durationMs for dismissed events', () => {
    const result = confirmationDisplayEventSchema.safeParse({
      ...validEvent,
      eventType: 'dismissed',
      durationMs: 5000,
    })
    expect(result.success).toBe(true)
  })
})

// ============================================
// ID Generator Tests
// ============================================

describe('ID Generators', () => {
  describe('generateResourceId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateResourceId()
      const id2 = generateResourceId()
      expect(id1).not.toBe(id2)
    })

    it('should start with res_ prefix', () => {
      const id = generateResourceId()
      expect(id.startsWith('res_')).toBe(true)
    })
  })

  describe('generateConfirmationId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateConfirmationId()
      const id2 = generateConfirmationId()
      expect(id1).not.toBe(id2)
    })

    it('should start with conf_ prefix', () => {
      const id = generateConfirmationId()
      expect(id.startsWith('conf_')).toBe(true)
    })
  })

  describe('generateDisplayEventId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateDisplayEventId()
      const id2 = generateDisplayEventId()
      expect(id1).not.toBe(id2)
    })

    it('should start with devt_ prefix', () => {
      const id = generateDisplayEventId()
      expect(id.startsWith('devt_')).toBe(true)
    })
  })
})

// ============================================
// Factory Function Tests
// ============================================

describe('Factory Functions', () => {
  describe('createCrisisResource', () => {
    it('should create valid crisis resource', () => {
      const resource = createCrisisResource(
        '988 Suicide & Crisis Lifeline',
        'Call or text 988 for help',
        'phone',
        '988',
        1,
        ['US'],
        true,
        true
      )

      expect(resource.id).toBeTruthy()
      expect(resource.name).toBe('988 Suicide & Crisis Lifeline')
      expect(resource.description).toBe('Call or text 988 for help')
      expect(resource.type).toBe('phone')
      expect(resource.value).toBe('988')
      expect(resource.priority).toBe(1)
      expect(resource.jurisdictions).toEqual(['US'])
      expect(resource.available24x7).toBe(true)
      expect(resource.chatAvailable).toBe(true)
    })

    it('should create universal resource with empty jurisdictions', () => {
      const resource = createCrisisResource(
        'Test Resource',
        'Description',
        'website',
        'https://example.com',
        10,
        [],
        false,
        false
      )

      expect(resource.jurisdictions).toEqual([])
    })
  })

  describe('createSignalConfirmation', () => {
    it('should create valid signal confirmation', () => {
      const resources: CrisisResource[] = []
      const confirmation = createSignalConfirmation('sig_123', resources, 'US', 12, false)

      expect(confirmation.id).toBeTruthy()
      expect(confirmation.signalId).toBe('sig_123')
      expect(confirmation.displayedAt).toBeInstanceOf(Date)
      expect(confirmation.dismissedAt).toBeNull()
      expect(confirmation.autoDismissedAt).toBeNull()
      expect(confirmation.resources).toEqual([])
      expect(confirmation.emergencyMessageShown).toBe(true)
      expect(confirmation.autoDismissAfterMs).toBe(30000)
      expect(confirmation.jurisdiction).toBe('US')
      expect(confirmation.childAge).toBe(12)
      expect(confirmation.isOffline).toBe(false)
    })

    it('should set isOffline correctly', () => {
      const confirmation = createSignalConfirmation('sig_123', [], 'US', 10, true)
      expect(confirmation.isOffline).toBe(true)
    })

    it('should include provided resources', () => {
      const resource = createCrisisResource('Test', 'Desc', 'phone', '123', 1, ['US'], true, false)
      const confirmation = createSignalConfirmation('sig_123', [resource], 'US', 10, false)
      expect(confirmation.resources).toHaveLength(1)
      expect(confirmation.resources[0].name).toBe('Test')
    })
  })

  describe('createConfirmationContent', () => {
    it('should create default content with child-appropriate language', () => {
      const content = createConfirmationContent()

      expect(content.headerText).toBe('Someone will reach out')
      expect(content.bodyText).toContain('right thing')
      expect(content.emergencyText).toContain('911')
      expect(content.chatPromptText).toBe('Chat with someone now')
      expect(content.dismissButtonText).toBe('Got it')
    })

    it('should allow custom content', () => {
      const content = createConfirmationContent(
        'Custom Header',
        'Custom Body',
        'Custom Emergency',
        'Custom Chat',
        'OK'
      )

      expect(content.headerText).toBe('Custom Header')
      expect(content.bodyText).toBe('Custom Body')
      expect(content.dismissButtonText).toBe('OK')
    })
  })

  describe('createConfirmationDisplayEvent', () => {
    it('should create displayed event', () => {
      const event = createConfirmationDisplayEvent('conf_123', 'sig_123', 'displayed')

      expect(event.id).toBeTruthy()
      expect(event.confirmationId).toBe('conf_123')
      expect(event.signalId).toBe('sig_123')
      expect(event.eventType).toBe('displayed')
      expect(event.resourceId).toBeNull()
      expect(event.timestamp).toBeInstanceOf(Date)
      expect(event.durationMs).toBeNull()
    })

    it('should create resource_clicked event with resourceId', () => {
      const event = createConfirmationDisplayEvent(
        'conf_123',
        'sig_123',
        'resource_clicked',
        'res_456'
      )

      expect(event.eventType).toBe('resource_clicked')
      expect(event.resourceId).toBe('res_456')
    })

    it('should create dismissed event with duration', () => {
      const event = createConfirmationDisplayEvent('conf_123', 'sig_123', 'dismissed', null, 5000)

      expect(event.eventType).toBe('dismissed')
      expect(event.durationMs).toBe(5000)
    })
  })
})

// ============================================
// Default Resources Tests
// ============================================

describe('Default Crisis Resources', () => {
  describe('createDefaultUSResources', () => {
    it('should include 988 Suicide & Crisis Lifeline', () => {
      const resources = createDefaultUSResources()
      const line988 = resources.find((r) => r.value === '988')
      expect(line988).toBeDefined()
      expect(line988?.type).toBe('phone')
      expect(line988?.available24x7).toBe(true)
    })

    it('should include Crisis Text Line', () => {
      const resources = createDefaultUSResources()
      const textLine = resources.find((r) => r.value === '741741')
      expect(textLine).toBeDefined()
      expect(textLine?.type).toBe('text')
    })

    it('should include Childhelp', () => {
      const resources = createDefaultUSResources()
      const childhelp = resources.find((r) => r.name.includes('Childhelp'))
      expect(childhelp).toBeDefined()
    })

    it('should have resources sorted by priority', () => {
      const resources = createDefaultUSResources()
      for (let i = 1; i < resources.length; i++) {
        expect(resources[i].priority).toBeGreaterThanOrEqual(resources[i - 1].priority)
      }
    })

    it('should have all US jurisdiction resources', () => {
      const resources = createDefaultUSResources()
      resources.forEach((r) => {
        expect(r.jurisdictions.includes('US') || r.jurisdictions.length === 0).toBe(true)
      })
    })
  })

  describe('createDefaultUKResources', () => {
    it('should include Childline UK', () => {
      const resources = createDefaultUKResources()
      const childline = resources.find((r) => r.name.includes('Childline'))
      expect(childline).toBeDefined()
    })

    it('should include 999 emergency', () => {
      const resources = createDefaultUKResources()
      const emergency = resources.find((r) => r.value === '999')
      expect(emergency).toBeDefined()
    })
  })

  describe('createDefaultCAResources', () => {
    it('should include Kids Help Phone', () => {
      const resources = createDefaultCAResources()
      const kidsHelp = resources.find((r) => r.name.includes('Kids Help Phone'))
      expect(kidsHelp).toBeDefined()
    })
  })

  describe('createDefaultAUResources', () => {
    it('should include Kids Helpline', () => {
      const resources = createDefaultAUResources()
      const kidsHelpline = resources.find((r) => r.name.includes('Kids Helpline'))
      expect(kidsHelpline).toBeDefined()
    })
  })
})

// ============================================
// Validation Function Tests
// ============================================

describe('Validation Functions', () => {
  describe('validateCrisisResource', () => {
    it('should return valid resource', () => {
      const input = {
        id: 'res_123',
        name: 'Test',
        description: 'Test description',
        type: 'phone',
        value: '123',
        priority: 1,
        jurisdictions: ['US'],
        available24x7: true,
        chatAvailable: false,
      }
      const result = validateCrisisResource(input)
      expect(result.id).toBe('res_123')
    })

    it('should throw on invalid input', () => {
      expect(() => validateCrisisResource({ invalid: true })).toThrow()
    })
  })

  describe('validateSignalConfirmation', () => {
    it('should return valid confirmation', () => {
      const input = {
        id: 'conf_123',
        signalId: 'sig_123',
        displayedAt: new Date(),
        dismissedAt: null,
        autoDismissedAt: null,
        resources: [],
        emergencyMessageShown: true,
        autoDismissAfterMs: 30000,
        jurisdiction: 'US',
        childAge: 12,
        isOffline: false,
      }
      const result = validateSignalConfirmation(input)
      expect(result.id).toBe('conf_123')
    })

    it('should throw on invalid input', () => {
      expect(() => validateSignalConfirmation({ invalid: true })).toThrow()
    })
  })

  describe('validateConfirmationContent', () => {
    it('should return valid content', () => {
      const input = {
        headerText: 'Header',
        bodyText: 'Body',
        emergencyText: 'Emergency',
        chatPromptText: 'Chat',
        dismissButtonText: 'OK',
      }
      const result = validateConfirmationContent(input)
      expect(result.headerText).toBe('Header')
    })
  })

  describe('isCrisisResource', () => {
    it('should return true for valid resource', () => {
      const resource = createCrisisResource('Test', 'Desc', 'phone', '123', 1, [], true, false)
      expect(isCrisisResource(resource)).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isCrisisResource({ invalid: true })).toBe(false)
      expect(isCrisisResource(null)).toBe(false)
      expect(isCrisisResource(undefined)).toBe(false)
    })
  })

  describe('isSignalConfirmation', () => {
    it('should return true for valid confirmation', () => {
      const confirmation = createSignalConfirmation('sig_123', [], 'US', 12, false)
      expect(isSignalConfirmation(confirmation)).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isSignalConfirmation({ invalid: true })).toBe(false)
    })
  })
})

// ============================================
// Utility Function Tests
// ============================================

describe('Utility Functions', () => {
  describe('validateReadingLevel', () => {
    it('should accept simple text at 6th grade level', () => {
      const text = 'Someone will reach out. You did the right thing.'
      expect(validateReadingLevel(text, 6)).toBe(true)
    })

    it('should accept empty text', () => {
      expect(validateReadingLevel('', 6)).toBe(true)
    })

    it('should reject complex clinical language', () => {
      const complexText =
        'The exigent circumstances necessitate immediate psychotherapeutic intervention.'
      expect(validateReadingLevel(complexText, 6)).toBe(false)
    })

    it('should accept simple sentences', () => {
      expect(validateReadingLevel('Help is on the way.', 6)).toBe(true)
      expect(validateReadingLevel('Call 911 if you are in danger.', 6)).toBe(true)
    })
  })

  describe('getResourcesByType', () => {
    const resources = [
      createCrisisResource('Phone 1', 'Desc', 'phone', '111', 1, [], true, false),
      createCrisisResource('Phone 2', 'Desc', 'phone', '222', 2, [], true, false),
      createCrisisResource('Text 1', 'Desc', 'text', '333', 1, [], true, false),
      createCrisisResource('Chat 1', 'Desc', 'chat', 'https://chat.example.com', 1, [], true, true),
    ]

    it('should filter resources by type', () => {
      const phones = getResourcesByType(resources, 'phone')
      expect(phones).toHaveLength(2)
      phones.forEach((r) => expect(r.type).toBe('phone'))
    })

    it('should return empty array if no matches', () => {
      const websites = getResourcesByType(resources, 'website')
      expect(websites).toHaveLength(0)
    })
  })

  describe('getResourcesByJurisdiction', () => {
    const resources = [
      createCrisisResource('US Only', 'Desc', 'phone', '111', 1, ['US'], true, false),
      createCrisisResource('US-CA Only', 'Desc', 'phone', '222', 2, ['US-CA'], true, false),
      createCrisisResource('Universal', 'Desc', 'phone', '333', 3, [], true, false),
      createCrisisResource('UK Only', 'Desc', 'phone', '444', 4, ['UK'], true, false),
    ]

    it('should return matching jurisdiction resources', () => {
      const usResources = getResourcesByJurisdiction(resources, 'US')
      expect(usResources.some((r) => r.name === 'US Only')).toBe(true)
    })

    it('should include universal resources (empty jurisdictions)', () => {
      const usResources = getResourcesByJurisdiction(resources, 'US')
      expect(usResources.some((r) => r.name === 'Universal')).toBe(true)
    })

    it('should match state-level jurisdiction to country', () => {
      const caResources = getResourcesByJurisdiction(resources, 'US-CA')
      expect(caResources.some((r) => r.name === 'US Only')).toBe(true)
      expect(caResources.some((r) => r.name === 'US-CA Only')).toBe(true)
    })

    it('should not include unrelated jurisdictions', () => {
      const usResources = getResourcesByJurisdiction(resources, 'US')
      expect(usResources.some((r) => r.name === 'UK Only')).toBe(false)
    })
  })

  describe('sortResourcesByPriority', () => {
    it('should sort resources by priority ascending', () => {
      const resources = [
        createCrisisResource('Low Priority', 'Desc', 'phone', '111', 10, [], true, false),
        createCrisisResource('High Priority', 'Desc', 'phone', '222', 1, [], true, false),
        createCrisisResource('Medium Priority', 'Desc', 'phone', '333', 5, [], true, false),
      ]

      const sorted = sortResourcesByPriority(resources)
      expect(sorted[0].priority).toBe(1)
      expect(sorted[1].priority).toBe(5)
      expect(sorted[2].priority).toBe(10)
    })

    it('should not mutate original array', () => {
      const resources = [
        createCrisisResource('Low', 'Desc', 'phone', '111', 10, [], true, false),
        createCrisisResource('High', 'Desc', 'phone', '222', 1, [], true, false),
      ]

      const sorted = sortResourcesByPriority(resources)
      expect(resources[0].priority).toBe(10) // Original unchanged
      expect(sorted[0].priority).toBe(1)
    })
  })

  describe('filterChatResources', () => {
    it('should return only resources with chatAvailable true', () => {
      const resources = [
        createCrisisResource('With Chat', 'Desc', 'phone', '111', 1, [], true, true),
        createCrisisResource('No Chat', 'Desc', 'phone', '222', 2, [], true, false),
        createCrisisResource(
          'Also Chat',
          'Desc',
          'chat',
          'https://chat.example.com',
          3,
          [],
          true,
          true
        ),
      ]

      const chatResources = filterChatResources(resources)
      expect(chatResources).toHaveLength(2)
      chatResources.forEach((r) => expect(r.chatAvailable).toBe(true))
    })
  })
})

// ============================================
// Child-Appropriate Language Tests (AC6)
// ============================================

describe('Child-Appropriate Language (AC6)', () => {
  it('should have default content at 6th grade reading level', () => {
    const content = createConfirmationContent()

    expect(validateReadingLevel(content.headerText, 6)).toBe(true)
    expect(validateReadingLevel(content.bodyText, 6)).toBe(true)
    expect(validateReadingLevel(content.emergencyText, 6)).toBe(true)
    expect(validateReadingLevel(content.chatPromptText, 6)).toBe(true)
    expect(validateReadingLevel(content.dismissButtonText, 6)).toBe(true)
  })

  it('should use reassuring language', () => {
    const content = createConfirmationContent()

    // Check for reassuring words
    expect(content.bodyText.toLowerCase()).toContain('right thing')
    expect(content.bodyText.toLowerCase()).toContain('help')
  })

  it('should not use clinical or scary terminology', () => {
    const content = createConfirmationContent()
    const allText = `${content.headerText} ${content.bodyText} ${content.emergencyText}`

    // Ensure no scary/clinical words
    const scaryWords = ['suicide', 'death', 'die', 'kill', 'abuse', 'trauma', 'crisis', 'emergency']
    scaryWords.forEach((word) => {
      // Allow 'crisis' in resource names but not in child-facing content
      if (word !== 'crisis') {
        expect(allText.toLowerCase()).not.toContain(word)
      }
    })
  })
})
