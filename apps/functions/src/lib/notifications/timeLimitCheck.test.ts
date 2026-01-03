/**
 * Tests for Time Limit Check Service
 *
 * Story 41.3: Time Limit Notifications - Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock timeLimitNotificationService
const mockSendTimeLimitWarningNotification = vi.fn()
const mockSendLimitReachedNotification = vi.fn()

vi.mock('./timeLimitNotificationService', () => ({
  sendTimeLimitWarningNotification: (...args: unknown[]) =>
    mockSendTimeLimitWarningNotification(...args),
  sendLimitReachedNotification: (...args: unknown[]) => mockSendLimitReachedNotification(...args),
}))

// Mock childTimeLimitNotification
const mockSendChildTimeLimitWarning = vi.fn()
const mockSendChildLimitReachedNotification = vi.fn()

vi.mock('./childTimeLimitNotification', () => ({
  sendChildTimeLimitWarning: (...args: unknown[]) => mockSendChildTimeLimitWarning(...args),
  sendChildLimitReachedNotification: (...args: unknown[]) =>
    mockSendChildLimitReachedNotification(...args),
}))

// Mock firebase-admin/firestore
const mockDocGet = vi.fn()
const mockDocSet = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: mockDocGet,
        set: mockDocSet,
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: mockDocGet,
            set: mockDocSet,
            collection: vi.fn(() => ({
              doc: vi.fn(() => ({
                get: mockDocGet,
                set: mockDocSet,
              })),
            })),
          })),
        })),
      })),
    })),
  }),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

// Import after mocks
import { checkTimeLimitsAndNotify, _resetDbForTesting } from './timeLimitCheck'

describe('timeLimitCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()

    // Default: notification services return success
    mockSendTimeLimitWarningNotification.mockResolvedValue({
      notificationGenerated: true,
      parentsNotified: ['parent-1'],
      parentsSkipped: [],
      delayedForQuietHours: false,
    })
    mockSendLimitReachedNotification.mockResolvedValue({
      notificationGenerated: true,
      parentsNotified: ['parent-1'],
      parentsSkipped: [],
      delayedForQuietHours: false,
    })
    mockSendChildTimeLimitWarning.mockResolvedValue({
      sent: true,
      successCount: 1,
      childId: 'child-123',
    })
    mockSendChildLimitReachedNotification.mockResolvedValue({
      sent: true,
      successCount: 1,
      childId: 'child-123',
    })
  })

  it('returns no notification when time limits not configured', async () => {
    // Mock: No time limit config
    mockDocGet.mockResolvedValueOnce({ exists: false })

    const result = await checkTimeLimitsAndNotify('family-123', 'child-456')

    expect(result.notificationsTriggered).toBe(false)
    expect(result.limitReached).toBe(false)
  })

  it('returns no notification when time limits disabled', async () => {
    // Mock: Time limits disabled
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ dailyLimitMinutes: 120, enabled: false }),
    })

    const result = await checkTimeLimitsAndNotify('family-123', 'child-456')

    expect(result.notificationsTriggered).toBe(false)
  })

  it('sends limit reached notification when limit exceeded', async () => {
    // Mock: Time limit config
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ dailyLimitMinutes: 120, enabled: true }),
    })
    // Mock: Current screen time (at or over limit)
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ totalMinutes: 125 }),
    })
    // Mock: Child name
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ displayName: 'Emma' }),
    })
    // Mock: Limit reached not sent today
    mockDocGet.mockResolvedValueOnce({ exists: false })

    mockDocSet.mockResolvedValue(undefined)

    const result = await checkTimeLimitsAndNotify('family-123', 'child-456')

    expect(result.notificationsTriggered).toBe(true)
    expect(result.notificationType).toBe('limit_reached')
    expect(result.limitReached).toBe(true)
    expect(mockSendLimitReachedNotification).toHaveBeenCalled()
    expect(mockSendChildLimitReachedNotification).toHaveBeenCalled()
  })

  it('does not send duplicate limit reached notification', async () => {
    // Mock: Time limit config
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ dailyLimitMinutes: 120, enabled: true }),
    })
    // Mock: Current screen time (at limit)
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ totalMinutes: 120 }),
    })
    // Mock: Child name
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ displayName: 'Emma' }),
    })
    // Mock: Limit reached already sent today
    mockDocGet.mockResolvedValueOnce({ exists: true })

    const result = await checkTimeLimitsAndNotify('family-123', 'child-456')

    expect(result.notificationsTriggered).toBe(false)
    expect(result.limitReached).toBe(true)
    expect(mockSendLimitReachedNotification).not.toHaveBeenCalled()
  })

  it('sends warning notification at 15 minute threshold', async () => {
    // Mock: Time limit config
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ dailyLimitMinutes: 120, enabled: true }),
    })
    // Mock: Current screen time (15 minutes remaining)
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ totalMinutes: 105 }),
    })
    // Mock: Child name
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ displayName: 'Emma' }),
    })
    // Mock: No warning sent yet
    mockDocGet.mockResolvedValueOnce({ exists: false })

    mockDocSet.mockResolvedValue(undefined)

    const result = await checkTimeLimitsAndNotify('family-123', 'child-456')

    expect(result.notificationsTriggered).toBe(true)
    expect(result.notificationType).toBe('warning')
    expect(result.remainingMinutes).toBe(15)
    expect(result.limitReached).toBe(false)
    expect(mockSendTimeLimitWarningNotification).toHaveBeenCalled()
    expect(mockSendChildTimeLimitWarning).toHaveBeenCalledWith('child-456', 15)
  })

  it('sends warning at 5 minute threshold after 15 minute warning', async () => {
    // Mock: Time limit config
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ dailyLimitMinutes: 120, enabled: true }),
    })
    // Mock: Current screen time (5 minutes remaining)
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ totalMinutes: 115 }),
    })
    // Mock: Child name
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ displayName: 'Emma' }),
    })
    // Mock: 15 minute warning already sent (need to return this from the warning doc)
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ lastWarningThreshold: 15 }),
    })

    mockDocSet.mockResolvedValue(undefined)

    const result = await checkTimeLimitsAndNotify('family-123', 'child-456')

    // 5 < 15, so threshold 5 is lower than last warning of 15 - should send
    expect(result.notificationsTriggered).toBe(true)
    expect(result.notificationType).toBe('warning')
    expect(result.remainingMinutes).toBe(5)
    expect(mockSendChildTimeLimitWarning).toHaveBeenCalledWith('child-456', 5)
  })

  it('does not send duplicate warning at same threshold', async () => {
    // Mock: Time limit config
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ dailyLimitMinutes: 120, enabled: true }),
    })
    // Mock: Current screen time (5 minutes remaining)
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ totalMinutes: 115 }),
    })
    // Mock: Child name
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ displayName: 'Emma' }),
    })
    // Mock: 5 minute warning already sent
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ lastWarningThreshold: 5 }),
    })

    const result = await checkTimeLimitsAndNotify('family-123', 'child-456')

    expect(result.notificationsTriggered).toBe(false)
    expect(mockSendTimeLimitWarningNotification).not.toHaveBeenCalled()
  })

  it('includes bonus time in limit calculation', async () => {
    const today = new Date().toISOString().split('T')[0]

    // Mock: Time limit config with bonus
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        dailyLimitMinutes: 120,
        enabled: true,
        dailyBonusMinutes: { [today]: 30 }, // 30 minute bonus
      }),
    })
    // Mock: Current screen time - 140 used of 150 limit (10 min remaining)
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ totalMinutes: 140 }),
    })
    // Mock: Child name
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ displayName: 'Emma' }),
    })
    // Mock: No warning sent yet
    mockDocGet.mockResolvedValueOnce({ exists: false })

    mockDocSet.mockResolvedValue(undefined)

    const result = await checkTimeLimitsAndNotify('family-123', 'child-456')

    // 10 minutes remaining (150 - 140) - should trigger warning at 10 threshold
    expect(result.notificationsTriggered).toBe(true)
    expect(result.notificationType).toBe('warning')
    expect(result.remainingMinutes).toBe(10)
  })

  it('returns no notification when plenty of time remaining', async () => {
    // Mock: Time limit config
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ dailyLimitMinutes: 120, enabled: true }),
    })
    // Mock: Current screen time (lots remaining)
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ totalMinutes: 30 }),
    })
    // Mock: Child name
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ displayName: 'Emma' }),
    })
    // Mock: No warning sent
    mockDocGet.mockResolvedValueOnce({ exists: false })

    const result = await checkTimeLimitsAndNotify('family-123', 'child-456')

    expect(result.notificationsTriggered).toBe(false)
    expect(result.limitReached).toBe(false)
    expect(mockSendTimeLimitWarningNotification).not.toHaveBeenCalled()
  })
})
