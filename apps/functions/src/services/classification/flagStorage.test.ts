/**
 * Flag Storage Service Tests
 *
 * Story 21.5: Flag Creation and Storage - AC1, AC2, AC3, AC4, AC5, AC6
 *
 * Tests for flag document creation, storage, and querying.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock firebase-admin/firestore
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockGet = vi.fn()
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()
const mockStartAfter = vi.fn()
const mockQueryGet = vi.fn()

// Create a mock that properly chains collection/doc calls
const createMockRef = () => {
  const queryMock = {
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    startAfter: mockStartAfter,
    get: mockQueryGet,
  }

  // Chain methods return the query mock
  mockWhere.mockReturnValue(queryMock)
  mockOrderBy.mockReturnValue(queryMock)
  mockLimit.mockReturnValue(queryMock)
  mockStartAfter.mockReturnValue(queryMock)

  const ref: Record<string, unknown> = {}
  ref.collection = vi.fn().mockReturnValue({
    doc: vi.fn().mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: mockGet,
          set: mockSet,
          update: mockUpdate,
        }),
        ...queryMock,
      }),
    }),
    ...queryMock,
  })
  ref.doc = vi.fn().mockReturnValue({
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: mockGet,
        set: mockSet,
        update: mockUpdate,
      }),
      ...queryMock,
    }),
  })
  ref.get = mockGet
  ref.set = mockSet
  ref.update = mockUpdate
  return ref
}

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => createMockRef()),
  FieldValue: {
    increment: vi.fn((n: number) => ({ _increment: n })),
    arrayUnion: vi.fn((...items: string[]) => ({ _arrayUnion: items })),
  },
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}))

describe('Flag Storage Service (Story 21.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReset()
    mockSet.mockReset()
    mockUpdate.mockReset()
    mockWhere.mockReset()
    mockOrderBy.mockReset()
    mockLimit.mockReset()
    mockStartAfter.mockReset()
    mockQueryGet.mockReset()

    // Re-setup chain return values
    const queryMock = {
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      startAfter: mockStartAfter,
      get: mockQueryGet,
    }
    mockWhere.mockReturnValue(queryMock)
    mockOrderBy.mockReturnValue(queryMock)
    mockLimit.mockReturnValue(queryMock)
    mockStartAfter.mockReturnValue(queryMock)
  })

  describe('generateFlagId', () => {
    it('generates flag ID in correct format (AC1)', async () => {
      const { generateFlagId } = await import('./flagStorage')

      const screenshotId = 'screenshot-123'
      const category = 'Violence'

      const flagId = generateFlagId(screenshotId, category)

      // Format: {screenshotId}_{category}_{timestamp}_{random}
      expect(flagId).toMatch(/^screenshot-123_Violence_\d+_[a-z0-9]+$/)

      // Verify parts can be parsed
      const parts = flagId.split('_')
      expect(parts[0]).toBe('screenshot-123')
      expect(parts[1]).toBe('Violence')
      expect(parseInt(parts[2])).toBeGreaterThan(0)
      expect(parts[3].length).toBeGreaterThanOrEqual(1) // Random suffix
    })

    it('generates unique IDs even at same timestamp', async () => {
      const { generateFlagId } = await import('./flagStorage')

      const id1 = generateFlagId('screenshot-123', 'Violence')
      const id2 = generateFlagId('screenshot-123', 'Violence')

      // IDs should be different due to random suffix
      expect(id1).not.toBe(id2)
    })

    it('handles different categories', async () => {
      const { generateFlagId } = await import('./flagStorage')

      const categories = [
        'Violence',
        'Adult Content',
        'Bullying',
        'Self-Harm Indicators',
        'Explicit Language',
        'Unknown Contacts',
      ] as const

      for (const category of categories) {
        const flagId = generateFlagId('screenshot-123', category)
        expect(flagId).toContain(category)
      }
    })
  })

  describe('generateScreenshotRef', () => {
    it('generates correct screenshot reference path (AC3)', async () => {
      const { generateScreenshotRef } = await import('./flagStorage')

      const childId = 'child-456'
      const screenshotId = 'screenshot-123'

      const ref = generateScreenshotRef(childId, screenshotId)

      expect(ref).toBe('children/child-456/screenshots/screenshot-123')
    })
  })

  describe('createFlag', () => {
    it('creates flag document with all required fields (AC1, AC2)', async () => {
      mockSet.mockResolvedValue(undefined)

      const { createFlag, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const params = {
        childId: 'child-456',
        familyId: 'family-789',
        screenshotId: 'screenshot-123',
        category: 'Violence' as const,
        severity: 'medium' as const,
        confidence: 75,
        reasoning: 'Violent content detected',
      }

      const flag = await createFlag(params)

      expect(flag.id).toMatch(/^screenshot-123_Violence_\d+_[a-z0-9]+$/)
      expect(flag.childId).toBe('child-456')
      expect(flag.familyId).toBe('family-789')
      expect(flag.screenshotRef).toBe('children/child-456/screenshots/screenshot-123')
      expect(flag.screenshotId).toBe('screenshot-123')
      expect(flag.category).toBe('Violence')
      expect(flag.severity).toBe('medium')
      expect(flag.confidence).toBe(75)
      expect(flag.reasoning).toBe('Violent content detected')
      expect(flag.createdAt).toBeGreaterThan(0)
      expect(flag.status).toBe('pending')
      expect(flag.throttled).toBe(false)
    })

    it('writes flag to Firestore (AC1)', async () => {
      mockSet.mockResolvedValue(undefined)

      const { createFlag, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const params = {
        childId: 'child-456',
        familyId: 'family-789',
        screenshotId: 'screenshot-123',
        category: 'Violence' as const,
        severity: 'medium' as const,
        confidence: 75,
        reasoning: 'Violent content detected',
      }

      await createFlag(params)

      // Verify doc.set was called
      expect(mockSet).toHaveBeenCalled()
    })

    it('preserves suppression fields when provided (AC6)', async () => {
      mockSet.mockResolvedValue(undefined)

      const { createFlag, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const releaseTime = Date.now() + 48 * 60 * 60 * 1000
      const params = {
        childId: 'child-456',
        familyId: 'family-789',
        screenshotId: 'screenshot-123',
        category: 'Self-Harm Indicators' as const,
        severity: 'high' as const,
        confidence: 90,
        reasoning: 'Distress signals detected',
        status: 'sensitive_hold' as const,
        suppressionReason: 'self_harm_detected' as const,
        releasableAfter: releaseTime,
      }

      const flag = await createFlag(params)

      expect(flag.status).toBe('sensitive_hold')
      expect(flag.suppressionReason).toBe('self_harm_detected')
      expect(flag.releasableAfter).toBe(releaseTime)
    })

    it('preserves throttle fields when provided (AC5)', async () => {
      mockSet.mockResolvedValue(undefined)

      const { createFlag, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const throttleTime = Date.now() - 1000
      const params = {
        childId: 'child-456',
        familyId: 'family-789',
        screenshotId: 'screenshot-123',
        category: 'Bullying' as const,
        severity: 'medium' as const,
        confidence: 70,
        reasoning: 'Bullying detected',
        throttled: true,
        throttledAt: throttleTime,
      }

      const flag = await createFlag(params)

      expect(flag.throttled).toBe(true)
      expect(flag.throttledAt).toBe(throttleTime)
    })

    it('combines suppression and throttle fields', async () => {
      mockSet.mockResolvedValue(undefined)

      const { createFlag, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const releaseTime = Date.now() + 48 * 60 * 60 * 1000
      const throttleTime = Date.now() - 1000
      const params = {
        childId: 'child-456',
        familyId: 'family-789',
        screenshotId: 'screenshot-123',
        category: 'Self-Harm Indicators' as const,
        severity: 'high' as const,
        confidence: 90,
        reasoning: 'Distress signals detected',
        status: 'sensitive_hold' as const,
        suppressionReason: 'distress_signals' as const,
        releasableAfter: releaseTime,
        throttled: true,
        throttledAt: throttleTime,
      }

      const flag = await createFlag(params)

      expect(flag.suppressionReason).toBe('distress_signals')
      expect(flag.releasableAfter).toBe(releaseTime)
      expect(flag.throttled).toBe(true)
      expect(flag.throttledAt).toBe(throttleTime)
    })
  })

  describe('updateScreenshotFlagIds', () => {
    it('updates screenshot with flag IDs using arrayUnion (AC3)', async () => {
      mockUpdate.mockResolvedValue(undefined)

      const { updateScreenshotFlagIds, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const flagIds = ['flag-1', 'flag-2']

      await updateScreenshotFlagIds('child-456', 'screenshot-123', flagIds)

      expect(mockUpdate).toHaveBeenCalled()
    })

    it('does not update when no flag IDs provided', async () => {
      const { updateScreenshotFlagIds, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      await updateScreenshotFlagIds('child-456', 'screenshot-123', [])

      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('createFlagsFromConcerns', () => {
    it('creates multiple flags and updates screenshot (AC1, AC2, AC3)', async () => {
      mockSet.mockResolvedValue(undefined)
      mockUpdate.mockResolvedValue(undefined)

      const { createFlagsFromConcerns, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const flags = [
        {
          category: 'Violence' as const,
          severity: 'medium' as const,
          confidence: 75,
          reasoning: 'Violent content',
          throttled: false,
        },
        {
          category: 'Bullying' as const,
          severity: 'low' as const,
          confidence: 65,
          reasoning: 'Potential bullying',
          throttled: true,
          throttledAt: Date.now(),
        },
      ]

      const createdFlags = await createFlagsFromConcerns(
        'child-456',
        'family-789',
        'screenshot-123',
        flags
      )

      expect(createdFlags).toHaveLength(2)
      expect(createdFlags[0].category).toBe('Violence')
      expect(createdFlags[1].category).toBe('Bullying')
      expect(createdFlags[1].throttled).toBe(true)

      // Verify flags were written
      expect(mockSet).toHaveBeenCalledTimes(2)
      // Verify screenshot was updated with flag IDs
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('returns empty array when no flags provided', async () => {
      const { createFlagsFromConcerns, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const createdFlags = await createFlagsFromConcerns(
        'child-456',
        'family-789',
        'screenshot-123',
        []
      )

      expect(createdFlags).toHaveLength(0)
      expect(mockSet).not.toHaveBeenCalled()
    })

    it('preserves suppression status from input flags (AC6)', async () => {
      mockSet.mockResolvedValue(undefined)
      mockUpdate.mockResolvedValue(undefined)

      const { createFlagsFromConcerns, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const releaseTime = Date.now() + 48 * 60 * 60 * 1000
      const flags = [
        {
          category: 'Self-Harm Indicators' as const,
          severity: 'high' as const,
          confidence: 85,
          reasoning: 'Self-harm indicators detected',
          status: 'sensitive_hold' as const,
          suppressionReason: 'self_harm_detected' as const,
          releasableAfter: releaseTime,
        },
      ]

      const createdFlags = await createFlagsFromConcerns(
        'child-456',
        'family-789',
        'screenshot-123',
        flags
      )

      expect(createdFlags[0].status).toBe('sensitive_hold')
      expect(createdFlags[0].suppressionReason).toBe('self_harm_detected')
      expect(createdFlags[0].releasableAfter).toBe(releaseTime)
    })
  })

  describe('getFlagsForChild', () => {
    it('queries flags collection with default pagination (AC4)', async () => {
      const mockFlags = [
        { id: 'flag-1', category: 'Violence', status: 'pending' },
        { id: 'flag-2', category: 'Bullying', status: 'pending' },
      ]

      mockQueryGet.mockResolvedValue({
        forEach: (callback: (doc: { data: () => unknown }) => void) => {
          mockFlags.forEach((flag) => callback({ data: () => flag }))
        },
      })

      const { getFlagsForChild, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const flags = await getFlagsForChild('child-456')

      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc')
      expect(mockLimit).toHaveBeenCalledWith(50)
      expect(flags).toHaveLength(2)
    })

    it('applies status filter (AC4)', async () => {
      mockQueryGet.mockResolvedValue({
        forEach: vi.fn(),
      })

      const { getFlagsForChild, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      await getFlagsForChild('child-456', { status: 'pending' })

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'pending')
    })

    it('applies severity filter (AC4)', async () => {
      mockQueryGet.mockResolvedValue({
        forEach: vi.fn(),
      })

      const { getFlagsForChild, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      await getFlagsForChild('child-456', { severity: 'high' })

      expect(mockWhere).toHaveBeenCalledWith('severity', '==', 'high')
    })

    it('applies combined status and severity filters (AC4)', async () => {
      mockQueryGet.mockResolvedValue({
        forEach: vi.fn(),
      })

      const { getFlagsForChild, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      await getFlagsForChild('child-456', { status: 'pending', severity: 'high' })

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'pending')
      expect(mockWhere).toHaveBeenCalledWith('severity', '==', 'high')
    })

    it('applies date range filters (AC4)', async () => {
      mockQueryGet.mockResolvedValue({
        forEach: vi.fn(),
      })

      const { getFlagsForChild, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const startDate = Date.now() - 24 * 60 * 60 * 1000
      const endDate = Date.now()

      await getFlagsForChild('child-456', { startDate, endDate })

      expect(mockWhere).toHaveBeenCalledWith('createdAt', '>=', startDate)
      expect(mockWhere).toHaveBeenCalledWith('createdAt', '<=', endDate)
    })

    it('applies pagination with limit', async () => {
      mockQueryGet.mockResolvedValue({
        forEach: vi.fn(),
      })

      const { getFlagsForChild, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      await getFlagsForChild('child-456', {}, { limit: 10 })

      expect(mockLimit).toHaveBeenCalledWith(10)
    })

    it('applies pagination with startAfter', async () => {
      mockGet.mockResolvedValue({
        exists: true,
      })
      mockQueryGet.mockResolvedValue({
        forEach: vi.fn(),
      })

      const { getFlagsForChild, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      await getFlagsForChild('child-456', {}, { startAfter: 'flag-1' })

      expect(mockStartAfter).toHaveBeenCalled()
    })
  })

  describe('getFlagById', () => {
    it('returns flag document when found', async () => {
      const mockFlag = {
        id: 'flag-123',
        childId: 'child-456',
        category: 'Violence',
        status: 'pending',
      }

      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockFlag,
      })

      const { getFlagById, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const flag = await getFlagById('child-456', 'flag-123')

      expect(flag).toEqual(mockFlag)
    })

    it('returns null when flag not found', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      })

      const { getFlagById, _resetDbForTesting } = await import('./flagStorage')
      _resetDbForTesting()

      const flag = await getFlagById('child-456', 'nonexistent')

      expect(flag).toBeNull()
    })
  })
})
