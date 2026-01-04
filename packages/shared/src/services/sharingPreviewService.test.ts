/**
 * Sharing Preview Service Tests - Story 52.3 Task 2
 */

import { describe, it, expect } from 'vitest'
import {
  calculateParentVisibility,
  generateSharingPreview,
  validateSharingPreferences,
  isAnythingShared,
  getSharedItemsList,
  type ChildActivityData,
  type ScreenTimeData,
  type FlagData,
  type ScreenshotData,
  type LocationData,
} from './sharingPreviewService'
import {
  type ReverseModeShareingPreferences,
  type ReverseModeSettings,
  DEFAULT_REVERSE_MODE_SHARING,
} from '../contracts/reverseMode'

// ============================================
// Test Fixtures
// ============================================

const createTestScreenTimeData = (overrides?: Partial<ScreenTimeData>): ScreenTimeData => ({
  totalMinutes: 180,
  categoryBreakdown: {
    social: 60,
    gaming: 45,
    education: 30,
    entertainment: 45,
  },
  appBreakdown: {
    Instagram: 30,
    TikTok: 30,
    Minecraft: 45,
    YouTube: 45,
    Duolingo: 30,
  },
  isApproachingLimit: false,
  isLimitReached: false,
  dailyLimit: 240,
  ...overrides,
})

const createTestFlagData = (): FlagData[] => [
  {
    id: 'flag-1',
    category: 'social',
    type: 'content_warning',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    description: 'Inappropriate content detected',
  },
  {
    id: 'flag-2',
    category: 'gaming',
    type: 'time_exceeded',
    timestamp: new Date('2024-01-15T14:00:00Z'),
    description: 'Gaming time exceeded',
  },
  {
    id: 'flag-3',
    category: 'social',
    type: 'new_contact',
    timestamp: new Date('2024-01-15T16:00:00Z'),
    description: 'New contact added',
  },
]

const createTestScreenshotData = (): ScreenshotData[] => [
  {
    id: 'ss-1',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    appName: 'Instagram',
    url: 'https://storage.example.com/ss-1.png',
  },
  {
    id: 'ss-2',
    timestamp: new Date('2024-01-15T14:00:00Z'),
    appName: 'TikTok',
    url: 'https://storage.example.com/ss-2.png',
  },
]

const createTestLocationData = (): LocationData => ({
  lastLocation: {
    latitude: 37.7749,
    longitude: -122.4194,
    timestamp: new Date('2024-01-15T12:00:00Z'),
  },
  history: [
    {
      latitude: 37.7749,
      longitude: -122.4194,
      timestamp: new Date('2024-01-15T12:00:00Z'),
    },
    {
      latitude: 37.7849,
      longitude: -122.4094,
      timestamp: new Date('2024-01-15T08:00:00Z'),
    },
  ],
})

const createTestChildActivityData = (): ChildActivityData => ({
  screenTime: createTestScreenTimeData(),
  flags: createTestFlagData(),
  screenshots: createTestScreenshotData(),
  location: createTestLocationData(),
})

const createActiveReverseModeSettings = (): ReverseModeSettings => ({
  status: 'active',
  activatedAt: new Date('2024-01-01'),
  activatedBy: 'child-123',
  sharingPreferences: { ...DEFAULT_REVERSE_MODE_SHARING },
})

// ============================================
// calculateParentVisibility Tests
// ============================================

describe('calculateParentVisibility', () => {
  describe('when reverse mode is not active', () => {
    it('should return all data when reverse mode is off', () => {
      const childData = createTestChildActivityData()
      const settings: ReverseModeSettings = { status: 'off' }

      const result = calculateParentVisibility(childData, undefined, settings)

      expect(result.hasAnySharedData).toBe(true)
      expect(result.screenTime).toBeDefined()
      expect(result.screenTime?.displayType).toBe('full')
      expect(result.screenTime?.totalMinutes).toBe(180)
      expect(result.screenTime?.categoryBreakdown).toEqual(childData.screenTime.categoryBreakdown)
      expect(result.flags).toHaveLength(3)
      expect(result.screenshots).toHaveLength(2)
      expect(result.location?.lastLocation).toBeDefined()
    })

    it('should return all data when settings are null', () => {
      const childData = createTestChildActivityData()

      const result = calculateParentVisibility(childData, undefined, null)

      expect(result.hasAnySharedData).toBe(true)
      expect(result.screenTime?.displayType).toBe('full')
    })

    it('should return all data when settings are undefined', () => {
      const childData = createTestChildActivityData()

      const result = calculateParentVisibility(childData, undefined, undefined)

      expect(result.hasAnySharedData).toBe(true)
    })
  })

  describe('when reverse mode is active with default preferences (nothing shared)', () => {
    it('should return no data when using default preferences', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()

      const result = calculateParentVisibility(childData, DEFAULT_REVERSE_MODE_SHARING, settings)

      expect(result.hasAnySharedData).toBe(false)
      expect(result.screenTime).toBeNull()
      expect(result.flags).toBeNull()
      expect(result.screenshots).toBeNull()
      expect(result.location).toBeNull()
      expect(result.timeLimitStatus).toBeNull()
    })

    it('should return no data when preferences are undefined', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()

      const result = calculateParentVisibility(childData, undefined, settings)

      expect(result.hasAnySharedData).toBe(false)
    })
  })

  describe('screen time sharing (AC1)', () => {
    it('should share summary only when screenTimeDetail is summary', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        screenTime: true,
        screenTimeDetail: 'summary',
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.screenTime).toBeDefined()
      expect(result.screenTime?.displayType).toBe('summary')
      expect(result.screenTime?.totalMinutes).toBe(180)
      expect(result.screenTime?.categoryBreakdown).toBeUndefined()
      expect(result.screenTime?.appBreakdown).toBeUndefined()
    })

    it('should share full details when screenTimeDetail is full', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        screenTime: true,
        screenTimeDetail: 'full',
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.screenTime).toBeDefined()
      expect(result.screenTime?.displayType).toBe('full')
      expect(result.screenTime?.totalMinutes).toBe(180)
      expect(result.screenTime?.categoryBreakdown).toBeDefined()
      expect(result.screenTime?.appBreakdown).toBeDefined()
    })

    it('should not share screen time when screenTime is false', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        screenTime: false,
        screenTimeDetail: 'full',
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.screenTime).toBeNull()
    })

    it('should not share screen time when screenTimeDetail is none', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        screenTime: true,
        screenTimeDetail: 'none',
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.screenTime).toBeNull()
    })
  })

  describe('category-based sharing (AC2)', () => {
    it('should filter categories when sharedCategories is specified', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        screenTime: true,
        screenTimeDetail: 'full',
        sharedCategories: ['social', 'education'],
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.screenTime?.categoryBreakdown).toEqual({
        social: 60,
        education: 30,
      })
    })

    it('should filter flags by category when sharedCategories is specified', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        flags: true,
        sharedCategories: ['social'],
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.flags).toHaveLength(2)
      expect(result.flags?.every((f) => f.category === 'social')).toBe(true)
    })

    it('should show all flags when no sharedCategories specified', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        flags: true,
        sharedCategories: [],
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.flags).toHaveLength(3)
    })
  })

  describe('time limit status sharing (AC3)', () => {
    it('should share time limit status when enabled', () => {
      const childData = createTestChildActivityData()
      childData.screenTime.isApproachingLimit = true
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        timeLimitStatus: true,
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.timeLimitStatus).toBeDefined()
      expect(result.timeLimitStatus?.status).toBe('approaching_limit')
      expect(result.timeLimitStatus?.message).toBe('Approaching daily limit')
    })

    it('should show limit reached status', () => {
      const childData = createTestChildActivityData()
      childData.screenTime.isLimitReached = true
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        timeLimitStatus: true,
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.timeLimitStatus?.status).toBe('limit_reached')
    })

    it('should show within limit status', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        timeLimitStatus: true,
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.timeLimitStatus?.status).toBe('within_limit')
    })

    it('should not share time limit status when disabled', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        timeLimitStatus: false,
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.timeLimitStatus).toBeNull()
    })
  })

  describe('screenshots sharing', () => {
    it('should share screenshots when enabled', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        screenshots: true,
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.screenshots).toHaveLength(2)
      expect(result.screenshots?.[0].id).toBe('ss-1')
    })

    it('should not share screenshots when disabled', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        screenshots: false,
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.screenshots).toBeNull()
    })
  })

  describe('location sharing', () => {
    it('should share location when enabled', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        location: true,
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.location).toBeDefined()
      expect(result.location?.lastLocation).toBeDefined()
    })

    it('should not share location when disabled', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        location: false,
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.location).toBeNull()
    })
  })

  describe('hasAnySharedData calculation', () => {
    it('should be true when at least one item is shared', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        location: true,
      }

      const result = calculateParentVisibility(childData, prefs, settings)

      expect(result.hasAnySharedData).toBe(true)
    })

    it('should be false when nothing is shared', () => {
      const childData = createTestChildActivityData()
      const settings = createActiveReverseModeSettings()

      const result = calculateParentVisibility(childData, DEFAULT_REVERSE_MODE_SHARING, settings)

      expect(result.hasAnySharedData).toBe(false)
    })
  })
})

// ============================================
// generateSharingPreview Tests
// ============================================

describe('generateSharingPreview', () => {
  describe('AC4: nothing shared option', () => {
    it('should indicate nothing is shared when using default preferences', () => {
      const result = generateSharingPreview(DEFAULT_REVERSE_MODE_SHARING)

      expect(result.isNothingShared).toBe(true)
      expect(result.summary).toContain('cannot see any')
    })

    it('should indicate nothing is shared when preferences are undefined', () => {
      const result = generateSharingPreview(undefined)

      expect(result.isNothingShared).toBe(true)
    })
  })

  describe('AC5: preview generation', () => {
    it('should show screen time summary in preview', () => {
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        screenTime: true,
        screenTimeDetail: 'summary',
      }

      const result = generateSharingPreview(prefs)

      expect(result.isNothingShared).toBe(false)
      const screenTimeDetail = result.details.find((d) => d.category === 'Screen Time')
      expect(screenTimeDetail?.sharedItems).toContain('Daily total screen time')
      expect(screenTimeDetail?.privateItems).toContain('App breakdown')
    })

    it('should show full screen time in preview', () => {
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        screenTime: true,
        screenTimeDetail: 'full',
      }

      const result = generateSharingPreview(prefs)

      const screenTimeDetail = result.details.find((d) => d.category === 'Screen Time')
      expect(screenTimeDetail?.sharedItems).toContain('App breakdown')
      expect(screenTimeDetail?.sharedItems).toContain('Category breakdown')
    })

    it('should show shared categories in preview', () => {
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        screenTime: true,
        screenTimeDetail: 'full',
        sharedCategories: ['social', 'gaming'],
      }

      const result = generateSharingPreview(prefs)

      const screenTimeDetail = result.details.find((d) => d.category === 'Screen Time')
      expect(screenTimeDetail?.sharedItems.some((i) => i.includes('social'))).toBe(true)
    })

    it('should show flags in preview when enabled', () => {
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        flags: true,
      }

      const result = generateSharingPreview(prefs)

      const flagsDetail = result.details.find((d) => d.category === 'Flags & Alerts')
      expect(flagsDetail?.sharedItems).toContain('All flags')
    })

    it('should show filtered flags in preview when categories specified', () => {
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        flags: true,
        sharedCategories: ['social'],
      }

      const result = generateSharingPreview(prefs)

      const flagsDetail = result.details.find((d) => d.category === 'Flags & Alerts')
      expect(flagsDetail?.sharedItems.some((i) => i.includes('social'))).toBe(true)
    })

    it('should show time limit status in preview when enabled', () => {
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        timeLimitStatus: true,
      }

      const result = generateSharingPreview(prefs)

      const timeLimitDetail = result.details.find((d) => d.category === 'Time Limits')
      expect(timeLimitDetail?.sharedItems.some((i) => i.includes('Time limit status'))).toBe(true)
    })
  })

  describe('summary generation', () => {
    it('should list single shared category', () => {
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        location: true,
      }

      const result = generateSharingPreview(prefs)

      expect(result.summary).toContain('Location')
    })

    it('should list multiple shared categories with "and"', () => {
      const prefs: ReverseModeShareingPreferences = {
        ...DEFAULT_REVERSE_MODE_SHARING,
        location: true,
        screenshots: true,
      }

      const result = generateSharingPreview(prefs)

      expect(result.summary).toContain('and')
    })
  })
})

// ============================================
// validateSharingPreferences Tests
// ============================================

describe('validateSharingPreferences', () => {
  it('should return valid for correct preferences', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      screenTime: true,
      screenTimeDetail: 'summary',
    }

    const result = validateSharingPreferences(prefs)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should return error when screenTime is true but detail is none', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      screenTime: true,
      screenTimeDetail: 'none',
    }

    const result = validateSharingPreferences(prefs)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Screen time is enabled but detail level is none')
  })

  it('should return error for invalid category names', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      sharedCategories: ['valid', '', '  '],
    }

    const result = validateSharingPreferences(prefs)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Some shared categories are invalid')
  })

  it('should return valid for empty sharedCategories', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      sharedCategories: [],
    }

    const result = validateSharingPreferences(prefs)

    expect(result.valid).toBe(true)
  })
})

// ============================================
// isAnythingShared Tests
// ============================================

describe('isAnythingShared', () => {
  it('should return false for undefined preferences', () => {
    expect(isAnythingShared(undefined)).toBe(false)
  })

  it('should return false for default preferences', () => {
    expect(isAnythingShared(DEFAULT_REVERSE_MODE_SHARING)).toBe(false)
  })

  it('should return true when screen time is shared', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      screenTime: true,
      screenTimeDetail: 'summary',
    }
    expect(isAnythingShared(prefs)).toBe(true)
  })

  it('should return false when screen time is true but detail is none', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      screenTime: true,
      screenTimeDetail: 'none',
    }
    expect(isAnythingShared(prefs)).toBe(false)
  })

  it('should return true when flags is shared', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      flags: true,
    }
    expect(isAnythingShared(prefs)).toBe(true)
  })

  it('should return true when screenshots is shared', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      screenshots: true,
    }
    expect(isAnythingShared(prefs)).toBe(true)
  })

  it('should return true when location is shared', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      location: true,
    }
    expect(isAnythingShared(prefs)).toBe(true)
  })

  it('should return true when timeLimitStatus is shared', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      timeLimitStatus: true,
    }
    expect(isAnythingShared(prefs)).toBe(true)
  })
})

// ============================================
// getSharedItemsList Tests
// ============================================

describe('getSharedItemsList', () => {
  it('should return empty array for undefined preferences', () => {
    expect(getSharedItemsList(undefined)).toEqual([])
  })

  it('should return empty array for default preferences', () => {
    expect(getSharedItemsList(DEFAULT_REVERSE_MODE_SHARING)).toEqual([])
  })

  it('should list screen time summary', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      screenTime: true,
      screenTimeDetail: 'summary',
    }
    const result = getSharedItemsList(prefs)
    expect(result).toContain('Screen time (summary)')
  })

  it('should list screen time full', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      screenTime: true,
      screenTimeDetail: 'full',
    }
    const result = getSharedItemsList(prefs)
    expect(result).toContain('Screen time (full)')
  })

  it('should list all shared items', () => {
    const prefs: ReverseModeShareingPreferences = {
      ...DEFAULT_REVERSE_MODE_SHARING,
      screenTime: true,
      screenTimeDetail: 'full',
      flags: true,
      screenshots: true,
      location: true,
      timeLimitStatus: true,
    }
    const result = getSharedItemsList(prefs)
    expect(result).toHaveLength(5)
    expect(result).toContain('Screen time (full)')
    expect(result).toContain('Flags')
    expect(result).toContain('Screenshots')
    expect(result).toContain('Location')
    expect(result).toContain('Time limit status')
  })
})
