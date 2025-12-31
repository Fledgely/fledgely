/**
 * Confidence Threshold Service Tests
 *
 * Story 21.4: Concern Confidence Thresholds - AC1, AC2, AC4, AC5
 *
 * Tests for confidence threshold configuration and shouldCreateFlag logic.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
const mockGet = vi.fn()

// Create a mock that properly chains collection/doc calls
const createMockRef = () => {
  const ref: Record<string, unknown> = {}
  ref.collection = vi.fn().mockReturnValue(ref)
  ref.doc = vi.fn().mockReturnValue({
    get: mockGet,
    collection: vi.fn().mockReturnValue(ref),
  })
  ref.get = mockGet
  return ref
}

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => createMockRef()),
}))

// Mock logger
vi.mock('firebase-functions/logger', () => ({
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}))

describe('confidenceThreshold (Story 21.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReset()
  })

  describe('getEffectiveThreshold', () => {
    it('returns 75 (balanced) when family not found', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const { getEffectiveThreshold, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      const threshold = await getEffectiveThreshold('family-123', 'Violence')
      expect(threshold).toBe(75)
    })

    it('returns 75 (balanced) when no settings configured', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({}),
      })

      const { getEffectiveThreshold, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      const threshold = await getEffectiveThreshold('family-123', 'Violence')
      expect(threshold).toBe(75)
    })

    it('returns 60 for sensitive threshold level', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ settings: { confidenceThresholdLevel: 'sensitive' } }),
      })

      const { getEffectiveThreshold, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      const threshold = await getEffectiveThreshold('family-123', 'Violence')
      expect(threshold).toBe(60)
    })

    it('returns 75 for balanced threshold level', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ settings: { confidenceThresholdLevel: 'balanced' } }),
      })

      const { getEffectiveThreshold, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      const threshold = await getEffectiveThreshold('family-123', 'Cyberbullying')
      expect(threshold).toBe(75)
    })

    it('returns 90 for relaxed threshold level', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ settings: { confidenceThresholdLevel: 'relaxed' } }),
      })

      const { getEffectiveThreshold, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      const threshold = await getEffectiveThreshold('family-123', 'Violence')
      expect(threshold).toBe(90)
    })

    it('returns category-specific override when configured', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          settings: {
            confidenceThresholdLevel: 'balanced', // 75
            categoryConfidenceThresholds: {
              Violence: 80,
              'Self-Harm Indicators': 50,
            },
          },
        }),
      })

      const { getEffectiveThreshold, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      // Category with override
      const violenceThreshold = await getEffectiveThreshold('family-123', 'Violence')
      expect(violenceThreshold).toBe(80)
    })

    it('returns global threshold for categories without override', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          settings: {
            confidenceThresholdLevel: 'relaxed', // 90
            categoryConfidenceThresholds: {
              Violence: 80,
            },
          },
        }),
      })

      const { getEffectiveThreshold, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      // Category without override uses global threshold
      const bullyingThreshold = await getEffectiveThreshold('family-123', 'Cyberbullying')
      expect(bullyingThreshold).toBe(90)
    })

    it('prioritizes category override over global level', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          settings: {
            confidenceThresholdLevel: 'relaxed', // 90
            categoryConfidenceThresholds: {
              'Self-Harm Indicators': 50, // Lower for safety
            },
          },
        }),
      })

      const { getEffectiveThreshold, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      const threshold = await getEffectiveThreshold('family-123', 'Self-Harm Indicators')
      expect(threshold).toBe(50)
    })

    it('returns default 75 (balanced) when Firestore throws error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      const { getEffectiveThreshold, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      const threshold = await getEffectiveThreshold('family-123', 'Violence')
      expect(threshold).toBe(75)
    })
  })

  describe('shouldCreateFlag', () => {
    describe('AC5: Always flag at 95%+ confidence', () => {
      it('returns true for 95% confidence regardless of threshold', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'relaxed' } }), // 90
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        const result = await shouldCreateFlag(95, 'Violence', 'family-123')
        expect(result).toBe(true)
      })

      it('returns true for 96% confidence', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'relaxed' } }),
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        const result = await shouldCreateFlag(96, 'Cyberbullying', 'family-123')
        expect(result).toBe(true)
      })

      it('returns true for 100% confidence', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'relaxed' } }),
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        const result = await shouldCreateFlag(100, 'Violence', 'family-123')
        expect(result).toBe(true)
      })
    })

    describe('AC1: Threshold-based flagging', () => {
      it('returns true when confidence equals threshold', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'balanced' } }), // 75
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        const result = await shouldCreateFlag(75, 'Violence', 'family-123')
        expect(result).toBe(true)
      })

      it('returns true when confidence exceeds threshold', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'balanced' } }), // 75
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        const result = await shouldCreateFlag(80, 'Violence', 'family-123')
        expect(result).toBe(true)
      })

      it('returns false when confidence below threshold', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'balanced' } }), // 75
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        const result = await shouldCreateFlag(74, 'Violence', 'family-123')
        expect(result).toBe(false)
      })

      it('returns false for 94% with relaxed (90%) threshold', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'relaxed' } }), // 90
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        const result = await shouldCreateFlag(89, 'Violence', 'family-123')
        expect(result).toBe(false)
      })

      it('returns true for 90% with relaxed threshold', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'relaxed' } }), // 90
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        const result = await shouldCreateFlag(90, 'Violence', 'family-123')
        expect(result).toBe(true)
      })
    })

    describe('Boundary value testing', () => {
      it('sensitive (60%): 59% returns false', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'sensitive' } }),
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        expect(await shouldCreateFlag(59, 'Violence', 'family-123')).toBe(false)
      })

      it('sensitive (60%): 60% returns true', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'sensitive' } }),
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        expect(await shouldCreateFlag(60, 'Violence', 'family-123')).toBe(true)
      })

      it('balanced (75%): 74% returns false', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'balanced' } }),
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        expect(await shouldCreateFlag(74, 'Violence', 'family-123')).toBe(false)
      })

      it('balanced (75%): 75% returns true', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'balanced' } }),
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        expect(await shouldCreateFlag(75, 'Violence', 'family-123')).toBe(true)
      })

      it('relaxed (90%): 89% returns false', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'relaxed' } }),
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        expect(await shouldCreateFlag(89, 'Violence', 'family-123')).toBe(false)
      })

      it('relaxed (90%): 90% returns true', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'relaxed' } }),
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        expect(await shouldCreateFlag(90, 'Violence', 'family-123')).toBe(true)
      })

      it('always-flag (95%): 94% uses threshold', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({ settings: { confidenceThresholdLevel: 'relaxed' } }), // 90
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        // 94% is above relaxed (90%) so should flag
        expect(await shouldCreateFlag(94, 'Violence', 'family-123')).toBe(true)
      })

      it('always-flag (95%): 95% always flags', async () => {
        // Even with category override of 96%, 95% should always flag
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({
            settings: {
              confidenceThresholdLevel: 'relaxed',
              categoryConfidenceThresholds: { Violence: 94 }, // Max allowed is 94
            },
          }),
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        expect(await shouldCreateFlag(95, 'Violence', 'family-123')).toBe(true)
      })
    })

    describe('Category override behavior', () => {
      it('uses category override threshold', async () => {
        mockGet.mockResolvedValue({
          exists: true,
          data: () => ({
            settings: {
              confidenceThresholdLevel: 'relaxed', // 90
              categoryConfidenceThresholds: {
                'Self-Harm Indicators': 50,
              },
            },
          }),
        })

        const { shouldCreateFlag, _resetDbForTesting } = await import('./confidenceThreshold')
        _resetDbForTesting()

        // 55% should flag for Self-Harm (threshold 50)
        expect(await shouldCreateFlag(55, 'Self-Harm Indicators', 'family-123')).toBe(true)

        // But 55% should NOT flag for Violence (threshold 90)
        expect(await shouldCreateFlag(55, 'Violence', 'family-123')).toBe(false)
      })
    })
  })

  describe('getFamilyThresholdLevel', () => {
    it('returns balanced when family not found', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const { getFamilyThresholdLevel, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      const level = await getFamilyThresholdLevel('family-123')
      expect(level).toBe('balanced')
    })

    it('returns balanced when no settings configured', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({}),
      })

      const { getFamilyThresholdLevel, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      const level = await getFamilyThresholdLevel('family-123')
      expect(level).toBe('balanced')
    })

    it('returns configured threshold level', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ settings: { confidenceThresholdLevel: 'sensitive' } }),
      })

      const { getFamilyThresholdLevel, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      const level = await getFamilyThresholdLevel('family-123')
      expect(level).toBe('sensitive')
    })

    it('returns balanced for invalid threshold level', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ settings: { confidenceThresholdLevel: 'invalid-level' } }),
      })

      const { getFamilyThresholdLevel, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      const level = await getFamilyThresholdLevel('family-123')
      expect(level).toBe('balanced')
    })

    it('returns balanced when Firestore throws error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      const { getFamilyThresholdLevel, _resetDbForTesting } = await import('./confidenceThreshold')
      _resetDbForTesting()

      const level = await getFamilyThresholdLevel('family-123')
      expect(level).toBe('balanced')
    })
  })
})
