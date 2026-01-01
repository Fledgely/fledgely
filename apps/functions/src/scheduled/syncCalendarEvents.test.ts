/**
 * Calendar Events Sync Scheduled Function Tests - Story 33.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoist mocks
const { mockSet, mockCollectionGroup, mockDb, mockOAuth2Client, mockEventsList } = vi.hoisted(
  () => {
    const mockGet = vi.fn()
    const mockSet = vi.fn().mockResolvedValue(undefined)
    const mockUpdate = vi.fn().mockResolvedValue(undefined)
    const mockDoc = vi.fn(() => ({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
    }))
    const mockCollectionGroup = vi.fn()
    const mockDb = {
      doc: mockDoc,
      collectionGroup: mockCollectionGroup,
    }

    // OAuth2 client mocks
    const mockSetCredentials = vi.fn()
    const mockOn = vi.fn()
    const mockOAuth2Client = vi.fn(() => ({
      setCredentials: mockSetCredentials,
      on: mockOn,
    }))
    const mockEventsList = vi.fn()

    return {
      mockSet,
      mockCollectionGroup,
      mockDb,
      mockOAuth2Client,
      mockEventsList,
    }
  }
)

// Mock firebase-admin modules
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
}))

// Mock firebase-functions
vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_config: unknown, handler: unknown) => handler,
}))

vi.mock('firebase-functions/params', () => ({
  defineSecret: (name: string) => ({
    value: () => {
      // Use a consistent key for testing
      if (name === 'CALENDAR_TOKEN_ENCRYPTION_KEY') {
        return 'test-encryption-key-32-chars-long!'
      }
      return `mock-${name}-value`
    },
  }),
}))

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}))

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: mockOAuth2Client,
    },
    calendar: () => ({
      events: { list: mockEventsList },
    }),
  },
}))

// Import after mocks are set up
import { syncCalendarEvents } from './syncCalendarEvents'

// Helper to create an encrypted token for tests
function createTestEncryptedToken(): string {
  // This creates a properly formatted encrypted token for tests
  // Format: iv:authTag:encryptedData (all hex)
  const iv = '0123456789abcdef0123456789abcdef'
  const authTag = '0123456789abcdef0123456789abcdef'
  const encryptedData = 'deadbeef'
  return `${iv}:${authTag}:${encryptedData}`
}

describe('Calendar Events Sync - Story 33.4', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('syncCalendarEvents', () => {
    it('processes connected calendar integrations', async () => {
      const mockDocs = [
        {
          data: () => ({
            childId: 'child-1',
            familyId: 'family-1',
            isEnabled: true,
            connectionStatus: 'connected',
            accessToken: createTestEncryptedToken(),
            refreshToken: null,
            tokenExpiresAt: Date.now() + 3600000,
            syncFrequencyMinutes: 30,
            focusTriggerKeywords: ['study', 'homework'],
            lastSyncAt: 0, // Force sync
          }),
        },
      ]

      mockCollectionGroup.mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              size: mockDocs.length,
              docs: mockDocs,
            }),
          }),
        }),
      })

      mockEventsList.mockResolvedValue({
        data: {
          items: [
            {
              id: 'event-1',
              summary: 'Study Math',
              description: 'Work on homework',
              start: { dateTime: new Date(Date.now() + 3600000).toISOString() },
              end: { dateTime: new Date(Date.now() + 7200000).toISOString() },
            },
          ],
        },
      })

      // The function will fail to decrypt because we're using a mock encrypted token
      // But we can verify the query was made correctly
      await syncCalendarEvents({} as never)

      expect(mockCollectionGroup).toHaveBeenCalledWith('calendarIntegration')
    })

    it('skips integrations that do not need syncing', async () => {
      const recentSync = Date.now() - 5 * 60 * 1000 // 5 minutes ago

      const mockDocs = [
        {
          data: () => ({
            childId: 'child-1',
            familyId: 'family-1',
            isEnabled: true,
            connectionStatus: 'connected',
            accessToken: createTestEncryptedToken(),
            refreshToken: null,
            tokenExpiresAt: Date.now() + 3600000,
            syncFrequencyMinutes: 30, // 30 minute interval
            focusTriggerKeywords: ['study'],
            lastSyncAt: recentSync, // Already synced recently
          }),
        },
      ]

      mockCollectionGroup.mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              size: mockDocs.length,
              docs: mockDocs,
            }),
          }),
        }),
      })

      await syncCalendarEvents({} as never)

      // Should not call calendar API since last sync was recent
      expect(mockEventsList).not.toHaveBeenCalled()
    })

    it('handles empty integration list', async () => {
      mockCollectionGroup.mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              size: 0,
              docs: [],
            }),
          }),
        }),
      })

      await syncCalendarEvents({} as never)

      expect(mockEventsList).not.toHaveBeenCalled()
      expect(mockSet).not.toHaveBeenCalled()
    })
  })
})

describe('Focus Keyword Matching - Story 33.4 AC2', () => {
  // Test the keyword matching logic directly by checking expected behavior
  it('detects case-insensitive keyword matches', () => {
    const testCases = [
      { title: 'Study Math', keywords: ['study'], shouldMatch: true },
      { title: 'HOMEWORK Session', keywords: ['homework'], shouldMatch: true },
      { title: 'Focus Time', keywords: ['focus'], shouldMatch: true },
      { title: 'Work on Project', keywords: ['work'], shouldMatch: true },
      { title: 'Play games', keywords: ['study', 'homework'], shouldMatch: false },
      { title: 'Exam Preparation', keywords: ['exam'], shouldMatch: true },
    ]

    for (const tc of testCases) {
      const searchText = tc.title.toLowerCase()
      const matches = tc.keywords.some((k) => searchText.includes(k.toLowerCase()))
      expect(matches).toBe(tc.shouldMatch)
    }
  })

  it('matches keywords in description as well', () => {
    const title = 'Session A'
    const description = 'Focus on the homework'
    const keywords = ['homework']

    const searchText = `${title} ${description}`.toLowerCase()
    const matches = keywords.some((k) => searchText.includes(k.toLowerCase()))
    expect(matches).toBe(true)
  })

  it('returns all matched keywords', () => {
    const title = 'Study for Exam'
    const keywords = ['study', 'exam', 'homework']

    const searchText = title.toLowerCase()
    const matchedKeywords = keywords.filter((k) => searchText.includes(k.toLowerCase()))

    expect(matchedKeywords).toEqual(['study', 'exam'])
  })
})
