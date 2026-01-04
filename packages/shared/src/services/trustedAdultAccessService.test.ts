/**
 * Trusted Adult Access Service Tests - Story 52.5
 *
 * Tests for trusted adult data access validation and filtering.
 */

import { describe, it, expect } from 'vitest'
import {
  validateTrustedAdultAccess,
  findActiveTrustedAdultByUserId,
  getChildrenForTrustedAdult,
  getSharedDataFilter,
  hasAnySharedData,
  getSharedCategoriesList,
  createAccessEvent,
  getSharedByLabel,
  getNoDataSharedMessage,
  getRevokedAccessMessage,
  getLastAccessText,
  isAuditEventHiddenFromParents,
  filterAuditEventsForParent,
} from './trustedAdultAccessService'
import type { TrustedAdult } from '../contracts/trustedAdult'
import { TrustedAdultStatus } from '../contracts/trustedAdult'
import type { ReverseModeSettings } from '../contracts/reverseMode'

// Helper to create test trusted adults
function createTestTrustedAdult(overrides: Partial<TrustedAdult> = {}): TrustedAdult {
  return {
    id: 'ta-1',
    email: 'adult@example.com',
    name: 'Trusted Adult',
    status: TrustedAdultStatus.ACTIVE,
    childId: 'child-1',
    familyId: 'family-1',
    invitedBy: 'parent-1',
    invitedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    userId: 'user-ta-1',
    ...overrides,
  }
}

describe('trustedAdultAccessService', () => {
  describe('validateTrustedAdultAccess', () => {
    it('returns hasAccess true for active trusted adult (AC1)', () => {
      const ta = createTestTrustedAdult({ status: TrustedAdultStatus.ACTIVE })
      const result = validateTrustedAdultAccess(ta)
      expect(result.hasAccess).toBe(true)
      expect(result.trustedAdult).toBe(ta)
    })

    it('returns hasAccess false for null trusted adult', () => {
      const result = validateTrustedAdultAccess(null)
      expect(result.hasAccess).toBe(false)
      expect(result.accessDeniedReason).toBe('Trusted adult relationship not found')
    })

    it('returns hasAccess false for undefined trusted adult', () => {
      const result = validateTrustedAdultAccess(undefined)
      expect(result.hasAccess).toBe(false)
      expect(result.accessDeniedReason).toBe('Trusted adult relationship not found')
    })

    it('returns clear message for revoked access (AC6)', () => {
      const ta = createTestTrustedAdult({ status: TrustedAdultStatus.REVOKED })
      const result = validateTrustedAdultAccess(ta)
      expect(result.hasAccess).toBe(false)
      expect(result.accessDeniedReason).toBe('Access has been revoked')
      expect(result.trustedAdult).toBe(ta)
    })

    it('returns hasAccess false for expired invitation', () => {
      const ta = createTestTrustedAdult({ status: TrustedAdultStatus.EXPIRED })
      const result = validateTrustedAdultAccess(ta)
      expect(result.hasAccess).toBe(false)
      expect(result.accessDeniedReason).toBe('Invitation has expired')
    })

    it('returns hasAccess false for pending invitation', () => {
      const ta = createTestTrustedAdult({
        status: TrustedAdultStatus.PENDING_INVITATION,
      })
      const result = validateTrustedAdultAccess(ta)
      expect(result.hasAccess).toBe(false)
      expect(result.accessDeniedReason).toBe('Please accept the invitation first')
    })

    it('returns hasAccess false for pending teen approval', () => {
      const ta = createTestTrustedAdult({
        status: TrustedAdultStatus.PENDING_TEEN_APPROVAL,
      })
      const result = validateTrustedAdultAccess(ta)
      expect(result.hasAccess).toBe(false)
      expect(result.accessDeniedReason).toBe('Waiting for teen approval')
    })
  })

  describe('findActiveTrustedAdultByUserId', () => {
    it('finds active trusted adult by user ID', () => {
      const trustedAdults = [
        createTestTrustedAdult({ id: 'ta-1', userId: 'user-1', status: TrustedAdultStatus.ACTIVE }),
        createTestTrustedAdult({ id: 'ta-2', userId: 'user-2', status: TrustedAdultStatus.ACTIVE }),
      ]
      const result = findActiveTrustedAdultByUserId('user-1', trustedAdults)
      expect(result).toBeDefined()
      expect(result?.id).toBe('ta-1')
    })

    it('returns null if user ID not found', () => {
      const trustedAdults = [createTestTrustedAdult({ userId: 'user-1' })]
      const result = findActiveTrustedAdultByUserId('user-999', trustedAdults)
      expect(result).toBeNull()
    })

    it('returns null if trusted adult is not active', () => {
      const trustedAdults = [
        createTestTrustedAdult({ userId: 'user-1', status: TrustedAdultStatus.REVOKED }),
      ]
      const result = findActiveTrustedAdultByUserId('user-1', trustedAdults)
      expect(result).toBeNull()
    })
  })

  describe('getChildrenForTrustedAdult', () => {
    it('returns child IDs for active trusted adult relationships', () => {
      const trustedAdults = [
        createTestTrustedAdult({
          userId: 'user-1',
          childId: 'child-1',
          status: TrustedAdultStatus.ACTIVE,
        }),
        createTestTrustedAdult({
          userId: 'user-1',
          childId: 'child-2',
          status: TrustedAdultStatus.ACTIVE,
        }),
        createTestTrustedAdult({
          userId: 'user-2',
          childId: 'child-3',
          status: TrustedAdultStatus.ACTIVE,
        }),
      ]
      const result = getChildrenForTrustedAdult('user-1', trustedAdults)
      expect(result).toHaveLength(2)
      expect(result).toContain('child-1')
      expect(result).toContain('child-2')
    })

    it('excludes inactive relationships', () => {
      const trustedAdults = [
        createTestTrustedAdult({
          userId: 'user-1',
          childId: 'child-1',
          status: TrustedAdultStatus.ACTIVE,
        }),
        createTestTrustedAdult({
          userId: 'user-1',
          childId: 'child-2',
          status: TrustedAdultStatus.REVOKED,
        }),
      ]
      const result = getChildrenForTrustedAdult('user-1', trustedAdults)
      expect(result).toHaveLength(1)
      expect(result).toContain('child-1')
    })
  })

  describe('getSharedDataFilter', () => {
    it('returns full access when reverse mode is off (AC3)', () => {
      const settings: ReverseModeSettings = { status: 'off' }
      const filter = getSharedDataFilter(settings)
      expect(filter.screenTime).toBe(true)
      expect(filter.screenTimeDetail).toBe('full')
      expect(filter.flags).toBe(true)
      expect(filter.screenshots).toBe(true)
      expect(filter.location).toBe(true)
      expect(filter.timeLimitStatus).toBe(true)
      expect(filter.sharedCategories).toContain('all')
    })

    it('returns full access when settings are null', () => {
      const filter = getSharedDataFilter(null)
      expect(filter.screenTime).toBe(true)
      expect(filter.flags).toBe(true)
    })

    it('returns full access when settings are undefined', () => {
      const filter = getSharedDataFilter(undefined)
      expect(filter.screenTime).toBe(true)
      expect(filter.flags).toBe(true)
    })

    it('applies sharing preferences when reverse mode is active (AC3)', () => {
      const settings: ReverseModeSettings = {
        status: 'active',
        activatedAt: new Date(),
        activatedBy: 'child-1',
        sharingPreferences: {
          screenTime: true,
          screenTimeDetail: 'summary',
          flags: false,
          screenshots: false,
          location: false,
          timeLimitStatus: true,
          sharedCategories: ['games'],
        },
      }
      const filter = getSharedDataFilter(settings)
      expect(filter.screenTime).toBe(true)
      expect(filter.screenTimeDetail).toBe('summary')
      expect(filter.flags).toBe(false)
      expect(filter.screenshots).toBe(false)
      expect(filter.location).toBe(false)
      expect(filter.timeLimitStatus).toBe(true)
      expect(filter.sharedCategories).toContain('games')
    })

    it('returns nothing shared with default preferences (AC3)', () => {
      const settings: ReverseModeSettings = {
        status: 'active',
        activatedAt: new Date(),
        activatedBy: 'child-1',
      }
      const filter = getSharedDataFilter(settings)
      expect(filter.screenTime).toBe(false)
      expect(filter.flags).toBe(false)
      expect(filter.screenshots).toBe(false)
      expect(filter.location).toBe(false)
    })
  })

  describe('hasAnySharedData', () => {
    it('returns true if screen time is shared', () => {
      const filter = {
        screenTime: true,
        screenTimeDetail: 'none' as const,
        flags: false,
        screenshots: false,
        location: false,
        timeLimitStatus: false,
        sharedCategories: [],
      }
      expect(hasAnySharedData(filter)).toBe(true)
    })

    it('returns true if flags are shared', () => {
      const filter = {
        screenTime: false,
        screenTimeDetail: 'none' as const,
        flags: true,
        screenshots: false,
        location: false,
        timeLimitStatus: false,
        sharedCategories: [],
      }
      expect(hasAnySharedData(filter)).toBe(true)
    })

    it('returns true if categories are shared', () => {
      const filter = {
        screenTime: false,
        screenTimeDetail: 'none' as const,
        flags: false,
        screenshots: false,
        location: false,
        timeLimitStatus: false,
        sharedCategories: ['games'],
      }
      expect(hasAnySharedData(filter)).toBe(true)
    })

    it('returns false if nothing is shared', () => {
      const filter = {
        screenTime: false,
        screenTimeDetail: 'none' as const,
        flags: false,
        screenshots: false,
        location: false,
        timeLimitStatus: false,
        sharedCategories: [],
      }
      expect(hasAnySharedData(filter)).toBe(false)
    })
  })

  describe('getSharedCategoriesList', () => {
    it('returns list of shared categories', () => {
      const filter = {
        screenTime: true,
        screenTimeDetail: 'summary' as const,
        flags: true,
        screenshots: false,
        location: false,
        timeLimitStatus: false,
        sharedCategories: [],
      }
      const list = getSharedCategoriesList(filter)
      expect(list).toContain('Screen Time (Summary)')
      expect(list).toContain('Flagged Content')
      expect(list).toHaveLength(2)
    })

    it('returns full screen time label', () => {
      const filter = {
        screenTime: true,
        screenTimeDetail: 'full' as const,
        flags: false,
        screenshots: false,
        location: false,
        timeLimitStatus: false,
        sharedCategories: [],
      }
      const list = getSharedCategoriesList(filter)
      expect(list).toContain('Screen Time (Full)')
    })

    it('returns empty list if nothing shared', () => {
      const filter = {
        screenTime: false,
        screenTimeDetail: 'none' as const,
        flags: false,
        screenshots: false,
        location: false,
        timeLimitStatus: false,
        sharedCategories: [],
      }
      const list = getSharedCategoriesList(filter)
      expect(list).toHaveLength(0)
    })
  })

  describe('createAccessEvent (AC5)', () => {
    it('creates access event with all fields', () => {
      const event = createAccessEvent(
        'ta-1',
        'child-1',
        'family-1',
        'dashboard_view',
        ['screen_time', 'flags'],
        '192.168.1.1',
        'Mozilla/5.0'
      )
      expect(event.id).toMatch(/^ta-access-/)
      expect(event.trustedAdultId).toBe('ta-1')
      expect(event.childId).toBe('child-1')
      expect(event.familyId).toBe('family-1')
      expect(event.accessType).toBe('dashboard_view')
      expect(event.dataCategories).toContain('screen_time')
      expect(event.dataCategories).toContain('flags')
      expect(event.ipAddress).toBe('192.168.1.1')
      expect(event.userAgent).toBe('Mozilla/5.0')
      expect(event.timestamp).toBeInstanceOf(Date)
    })

    it('creates unique event IDs', () => {
      const event1 = createAccessEvent('ta-1', 'child-1', 'family-1', 'dashboard_view')
      const event2 = createAccessEvent('ta-1', 'child-1', 'family-1', 'dashboard_view')
      expect(event1.id).not.toBe(event2.id)
    })
  })

  describe('getSharedByLabel (AC1)', () => {
    it('returns formatted label with teen name', () => {
      const label = getSharedByLabel('Emma')
      expect(label).toBe('Shared by Emma')
    })
  })

  describe('getNoDataSharedMessage', () => {
    it('returns message with teen name', () => {
      const message = getNoDataSharedMessage('Emma')
      expect(message).toContain('Emma')
      expect(message).toContain('share any data')
    })
  })

  describe('getRevokedAccessMessage (AC6)', () => {
    it('returns clear revocation message', () => {
      const message = getRevokedAccessMessage()
      expect(message).toContain('revoked')
      expect(message).toContain('no longer have access')
    })
  })

  describe('getLastAccessText (AC5)', () => {
    it('returns "Never accessed" for null', () => {
      expect(getLastAccessText(null)).toBe('Never accessed')
    })

    it('returns "Never accessed" for undefined', () => {
      expect(getLastAccessText(undefined)).toBe('Never accessed')
    })

    it('returns "Just now" for recent access', () => {
      const now = new Date()
      expect(getLastAccessText(now)).toBe('Just now')
    })

    it('returns minutes ago for access within hour', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      expect(getLastAccessText(fiveMinutesAgo)).toBe('5 minutes ago')
    })

    it('returns hours ago for access within day', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      expect(getLastAccessText(twoHoursAgo)).toBe('2 hours ago')
    })

    it('returns days ago for access within week', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      expect(getLastAccessText(threeDaysAgo)).toBe('3 days ago')
    })

    it('returns formatted date for older access', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      const result = getLastAccessText(twoWeeksAgo)
      // Should be a date string, not relative time
      expect(result).not.toContain('ago')
    })
  })

  // Story 52.6: Audit Privacy Tests (AC7)
  describe('isAuditEventHiddenFromParents (AC7)', () => {
    it('hides REVOKED_BY_TEEN events from parents', () => {
      expect(isAuditEventHiddenFromParents('REVOKED_BY_TEEN')).toBe(true)
    })

    it('hides trusted_adult_removed by teen from parents', () => {
      expect(isAuditEventHiddenFromParents('trusted_adult_removed', 'teen')).toBe(true)
    })

    it('shows REVOKED_BY_PARENT events to parents', () => {
      expect(isAuditEventHiddenFromParents('REVOKED_BY_PARENT')).toBe(false)
    })

    it('shows trusted_adult_removed by parent to parents', () => {
      expect(isAuditEventHiddenFromParents('trusted_adult_removed', 'parent')).toBe(false)
    })

    it('shows other events to parents', () => {
      expect(isAuditEventHiddenFromParents('INVITED')).toBe(false)
      expect(isAuditEventHiddenFromParents('TEEN_APPROVED')).toBe(false)
      expect(isAuditEventHiddenFromParents('dashboard_view')).toBe(false)
    })
  })

  describe('filterAuditEventsForParent (AC7)', () => {
    it('filters out teen-initiated revocation events', () => {
      const events = [
        { changeType: 'INVITED', actorRole: 'parent' },
        { changeType: 'REVOKED_BY_TEEN', actorRole: 'teen' },
        { changeType: 'TEEN_APPROVED', actorRole: 'teen' },
      ]
      const filtered = filterAuditEventsForParent(events)
      expect(filtered).toHaveLength(2)
      expect(
        filtered.find((e: { changeType: string }) => e.changeType === 'REVOKED_BY_TEEN')
      ).toBeUndefined()
    })

    it('keeps parent-initiated revocation events', () => {
      const events = [{ changeType: 'REVOKED_BY_PARENT', actorRole: 'parent' }]
      const filtered = filterAuditEventsForParent(events)
      expect(filtered).toHaveLength(1)
    })

    it('returns empty array for all teen-private events', () => {
      const events = [{ changeType: 'REVOKED_BY_TEEN', actorRole: 'teen' }]
      const filtered = filterAuditEventsForParent(events)
      expect(filtered).toHaveLength(0)
    })
  })
})
