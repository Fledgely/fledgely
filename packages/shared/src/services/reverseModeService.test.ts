/**
 * Reverse Mode Service Tests - Story 52.2 Task 2
 *
 * Tests for reverse mode eligibility, status checks, and audit events.
 */

import { describe, it, expect } from 'vitest'
import {
  canActivateReverseMode,
  canActivateWithSettings,
  isReverseModeActiveStatus,
  isReverseModePendingStatus,
  getReverseModeStatus,
  wasEverActivated,
  getReverseModeConfirmationContent,
  createActivationSettings,
  createDeactivationSettings,
  getDefaultReverseModeSettings,
  createActivationEvent,
  createDeactivationEvent,
  createConfirmationStartedEvent,
  createConfirmationCancelledEvent,
  validateConfirmationAcknowledged,
  validateReverseModeAction,
} from './reverseModeService'
import type { ReverseModeSettings } from '../contracts/reverseMode'

// Helper to create birthdates
function createBirthdate(yearsAgo: number): Date {
  const date = new Date()
  date.setFullYear(date.getFullYear() - yearsAgo)
  return date
}

describe('reverseModeService', () => {
  describe('canActivateReverseMode', () => {
    it('returns true for child who is exactly 16 (AC1)', () => {
      const birthdate = createBirthdate(16)
      expect(canActivateReverseMode(birthdate)).toBe(true)
    })

    it('returns true for child who is 17', () => {
      const birthdate = createBirthdate(17)
      expect(canActivateReverseMode(birthdate)).toBe(true)
    })

    it('returns false for child who is 15', () => {
      const birthdate = createBirthdate(15)
      expect(canActivateReverseMode(birthdate)).toBe(false)
    })

    it('returns false for child who is 14', () => {
      const birthdate = createBirthdate(14)
      expect(canActivateReverseMode(birthdate)).toBe(false)
    })

    it('accepts reference date parameter', () => {
      const birthdate = new Date('2010-01-15')
      const referenceDate = new Date('2026-01-20') // Child is 16
      expect(canActivateReverseMode(birthdate, referenceDate)).toBe(true)
    })
  })

  describe('canActivateWithSettings', () => {
    it('returns true for 16+ child with null settings', () => {
      const birthdate = createBirthdate(16)
      expect(canActivateWithSettings(birthdate, null)).toBe(true)
    })

    it('returns true for 16+ child with off status', () => {
      const birthdate = createBirthdate(16)
      const settings: ReverseModeSettings = { status: 'off' }
      expect(canActivateWithSettings(birthdate, settings)).toBe(true)
    })

    it('returns false for 16+ child with active status', () => {
      const birthdate = createBirthdate(16)
      const settings: ReverseModeSettings = {
        status: 'active',
        activatedAt: new Date(),
        activatedBy: 'child-1',
      }
      expect(canActivateWithSettings(birthdate, settings)).toBe(false)
    })

    it('returns false for 15 year old', () => {
      const birthdate = createBirthdate(15)
      expect(canActivateWithSettings(birthdate, null)).toBe(false)
    })
  })

  describe('isReverseModeActiveStatus', () => {
    it('returns true for active status (AC3)', () => {
      const settings: ReverseModeSettings = {
        status: 'active',
        activatedAt: new Date(),
        activatedBy: 'child-1',
      }
      expect(isReverseModeActiveStatus(settings)).toBe(true)
    })

    it('returns false for off status', () => {
      const settings: ReverseModeSettings = { status: 'off' }
      expect(isReverseModeActiveStatus(settings)).toBe(false)
    })

    it('returns false for pending_confirmation status', () => {
      const settings: ReverseModeSettings = { status: 'pending_confirmation' }
      expect(isReverseModeActiveStatus(settings)).toBe(false)
    })

    it('returns false for null settings', () => {
      expect(isReverseModeActiveStatus(null)).toBe(false)
    })

    it('returns false for undefined settings', () => {
      expect(isReverseModeActiveStatus(undefined)).toBe(false)
    })
  })

  describe('isReverseModePendingStatus', () => {
    it('returns true for pending_confirmation status', () => {
      const settings: ReverseModeSettings = { status: 'pending_confirmation' }
      expect(isReverseModePendingStatus(settings)).toBe(true)
    })

    it('returns false for active status', () => {
      const settings: ReverseModeSettings = {
        status: 'active',
        activatedAt: new Date(),
        activatedBy: 'child-1',
      }
      expect(isReverseModePendingStatus(settings)).toBe(false)
    })

    it('returns false for off status', () => {
      const settings: ReverseModeSettings = { status: 'off' }
      expect(isReverseModePendingStatus(settings)).toBe(false)
    })
  })

  describe('getReverseModeStatus', () => {
    it('returns off for null settings', () => {
      expect(getReverseModeStatus(null)).toBe('off')
    })

    it('returns off for undefined settings', () => {
      expect(getReverseModeStatus(undefined)).toBe('off')
    })

    it('returns status from settings', () => {
      const settings: ReverseModeSettings = {
        status: 'active',
        activatedAt: new Date(),
        activatedBy: 'child-1',
      }
      expect(getReverseModeStatus(settings)).toBe('active')
    })
  })

  describe('wasEverActivated', () => {
    it('returns false for null settings', () => {
      expect(wasEverActivated(null)).toBe(false)
    })

    it('returns false for settings without activatedAt', () => {
      const settings: ReverseModeSettings = { status: 'off' }
      expect(wasEverActivated(settings)).toBe(false)
    })

    it('returns true for settings with activatedAt', () => {
      const settings: ReverseModeSettings = {
        status: 'off',
        activatedAt: new Date(),
        activatedBy: 'child-1',
        deactivatedAt: new Date(),
      }
      expect(wasEverActivated(settings)).toBe(true)
    })
  })

  describe('getReverseModeConfirmationContent (AC2)', () => {
    it('returns confirmation content with title', () => {
      const content = getReverseModeConfirmationContent()
      expect(content.title).toBe('Activate Reverse Mode')
    })

    it('returns confirmation content with introduction', () => {
      const content = getReverseModeConfirmationContent()
      expect(content.introduction).toContain('Reverse Mode puts you in control')
    })

    it('returns confirmation content with 3 steps', () => {
      const content = getReverseModeConfirmationContent()
      expect(content.steps).toHaveLength(3)
    })

    it('step 1 explains parent visibility control', () => {
      const content = getReverseModeConfirmationContent()
      expect(content.steps[0].title).toBe('You Control What Parents See')
    })

    it('step 2 explains default nothing shared (AC3)', () => {
      const content = getReverseModeConfirmationContent()
      expect(content.steps[1].title).toBe('Default: Nothing Shared')
      expect(content.steps[1].description).toContain('hidden from parents')
    })

    it('step 3 explains deactivation option (AC5)', () => {
      const content = getReverseModeConfirmationContent()
      expect(content.steps[2].title).toBe('You Can Turn It Off Anytime')
    })

    it('has confirmation label for acknowledgment', () => {
      const content = getReverseModeConfirmationContent()
      expect(content.confirmationLabel).toContain('I understand')
    })

    it('has confirm and cancel button text', () => {
      const content = getReverseModeConfirmationContent()
      expect(content.confirmButtonText).toBe('Activate Reverse Mode')
      expect(content.cancelButtonText).toBe('Cancel')
    })
  })

  describe('createActivationSettings', () => {
    it('creates settings with active status', () => {
      const settings = createActivationSettings('child-1')
      expect(settings.status).toBe('active')
    })

    it('sets activatedAt to current date', () => {
      const before = new Date()
      const settings = createActivationSettings('child-1')
      const after = new Date()

      expect(settings.activatedAt).toBeDefined()
      expect(settings.activatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(settings.activatedAt!.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('sets activatedBy to child ID', () => {
      const settings = createActivationSettings('child-123')
      expect(settings.activatedBy).toBe('child-123')
    })

    it('sets default sharing preferences with nothing shared (AC3)', () => {
      const settings = createActivationSettings('child-1')
      expect(settings.sharingPreferences).toBeDefined()
      expect(settings.sharingPreferences!.screenTime).toBe(false)
      expect(settings.sharingPreferences!.flags).toBe(false)
      expect(settings.sharingPreferences!.screenshots).toBe(false)
      expect(settings.sharingPreferences!.location).toBe(false)
    })
  })

  describe('createDeactivationSettings', () => {
    it('creates settings with off status (AC5)', () => {
      const previousSettings: ReverseModeSettings = {
        status: 'active',
        activatedAt: new Date('2026-01-01'),
        activatedBy: 'child-1',
        sharingPreferences: { screenTime: true, flags: false, screenshots: false, location: false },
      }
      const settings = createDeactivationSettings(previousSettings)
      expect(settings.status).toBe('off')
    })

    it('preserves activatedAt from previous settings', () => {
      const activatedAt = new Date('2026-01-01')
      const previousSettings: ReverseModeSettings = {
        status: 'active',
        activatedAt,
        activatedBy: 'child-1',
      }
      const settings = createDeactivationSettings(previousSettings)
      expect(settings.activatedAt).toEqual(activatedAt)
    })

    it('preserves activatedBy from previous settings', () => {
      const previousSettings: ReverseModeSettings = {
        status: 'active',
        activatedAt: new Date(),
        activatedBy: 'child-123',
      }
      const settings = createDeactivationSettings(previousSettings)
      expect(settings.activatedBy).toBe('child-123')
    })

    it('sets deactivatedAt to current date', () => {
      const before = new Date()
      const previousSettings: ReverseModeSettings = {
        status: 'active',
        activatedAt: new Date('2026-01-01'),
        activatedBy: 'child-1',
      }
      const settings = createDeactivationSettings(previousSettings)
      const after = new Date()

      expect(settings.deactivatedAt).toBeDefined()
      expect(settings.deactivatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(settings.deactivatedAt!.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('clears sharing preferences', () => {
      const previousSettings: ReverseModeSettings = {
        status: 'active',
        activatedAt: new Date(),
        activatedBy: 'child-1',
        sharingPreferences: { screenTime: true, flags: true, screenshots: false, location: false },
      }
      const settings = createDeactivationSettings(previousSettings)
      expect(settings.sharingPreferences).toBeUndefined()
    })
  })

  describe('getDefaultReverseModeSettings', () => {
    it('returns settings with off status', () => {
      const settings = getDefaultReverseModeSettings()
      expect(settings.status).toBe('off')
    })

    it('returns a new object each time', () => {
      const settings1 = getDefaultReverseModeSettings()
      const settings2 = getDefaultReverseModeSettings()
      expect(settings1).not.toBe(settings2)
    })
  })

  describe('createActivationEvent (AC6)', () => {
    it('creates event with activated change type', () => {
      const event = createActivationEvent('child-1', 'family-1')
      expect(event.changeType).toBe('activated')
    })

    it('creates event with childId and familyId', () => {
      const event = createActivationEvent('child-123', 'family-456')
      expect(event.childId).toBe('child-123')
      expect(event.familyId).toBe('family-456')
    })

    it('creates event with previous status off and new status active', () => {
      const event = createActivationEvent('child-1', 'family-1')
      expect(event.previousStatus).toBe('off')
      expect(event.newStatus).toBe('active')
    })

    it('accepts custom previous status', () => {
      const event = createActivationEvent('child-1', 'family-1', 'pending_confirmation')
      expect(event.previousStatus).toBe('pending_confirmation')
    })

    it('includes IP address when provided', () => {
      const event = createActivationEvent('child-1', 'family-1', 'off', '192.168.1.1')
      expect(event.ipAddress).toBe('192.168.1.1')
    })

    it('includes user agent when provided', () => {
      const event = createActivationEvent('child-1', 'family-1', 'off', undefined, 'Mozilla/5.0')
      expect(event.userAgent).toBe('Mozilla/5.0')
    })

    it('generates unique event ID', () => {
      const event1 = createActivationEvent('child-1', 'family-1')
      const event2 = createActivationEvent('child-1', 'family-1')
      expect(event1.id).not.toBe(event2.id)
    })

    it('sets timestamp to current date', () => {
      const before = new Date()
      const event = createActivationEvent('child-1', 'family-1')
      const after = new Date()

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('createDeactivationEvent (AC6)', () => {
    it('creates event with deactivated change type', () => {
      const event = createDeactivationEvent('child-1', 'family-1')
      expect(event.changeType).toBe('deactivated')
    })

    it('creates event with previous status active and new status off', () => {
      const event = createDeactivationEvent('child-1', 'family-1')
      expect(event.previousStatus).toBe('active')
      expect(event.newStatus).toBe('off')
    })

    it('includes audit metadata when provided', () => {
      const event = createDeactivationEvent('child-1', 'family-1', '10.0.0.1', 'Chrome/100')
      expect(event.ipAddress).toBe('10.0.0.1')
      expect(event.userAgent).toBe('Chrome/100')
    })
  })

  describe('createConfirmationStartedEvent', () => {
    it('creates event with confirmation_started change type', () => {
      const event = createConfirmationStartedEvent('child-1', 'family-1')
      expect(event.changeType).toBe('confirmation_started')
    })

    it('creates event with previous status off and new status pending_confirmation', () => {
      const event = createConfirmationStartedEvent('child-1', 'family-1')
      expect(event.previousStatus).toBe('off')
      expect(event.newStatus).toBe('pending_confirmation')
    })
  })

  describe('createConfirmationCancelledEvent', () => {
    it('creates event with confirmation_cancelled change type', () => {
      const event = createConfirmationCancelledEvent('child-1', 'family-1')
      expect(event.changeType).toBe('confirmation_cancelled')
    })

    it('creates event with previous status pending_confirmation and new status off', () => {
      const event = createConfirmationCancelledEvent('child-1', 'family-1')
      expect(event.previousStatus).toBe('pending_confirmation')
      expect(event.newStatus).toBe('off')
    })
  })

  describe('validateConfirmationAcknowledged (AC2)', () => {
    it('returns valid for acknowledged confirmation', () => {
      const result = validateConfirmationAcknowledged(true)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('returns invalid for unacknowledged confirmation', () => {
      const result = validateConfirmationAcknowledged(false)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('acknowledge')
    })
  })

  describe('validateReverseModeAction', () => {
    it('returns valid for 16+ child activation', () => {
      const birthdate = createBirthdate(16)
      const result = validateReverseModeAction(birthdate, 'activate')
      expect(result.valid).toBe(true)
    })

    it('returns valid for 16+ child deactivation', () => {
      const birthdate = createBirthdate(17)
      const result = validateReverseModeAction(birthdate, 'deactivate')
      expect(result.valid).toBe(true)
    })

    it('returns invalid for 15 year old', () => {
      const birthdate = createBirthdate(15)
      const result = validateReverseModeAction(birthdate, 'activate')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('16 years or older')
    })
  })
})
