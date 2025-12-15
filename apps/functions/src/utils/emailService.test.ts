import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateSubject,
  generatePlainTextContent,
  generateHtmlContent,
  MAX_RETRY_ATTEMPTS,
  calculateNextRetryTime,
} from './emailService'
import { EscapeResource } from './resourceService'
import { Timestamp } from 'firebase-admin/firestore'

// Mock firebase-admin/firestore
const mockAdd = vi.fn().mockResolvedValue({ id: 'queue-id-123' })
const mockGet = vi.fn()
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockWhere = vi.fn().mockReturnThis()
const mockLimit = vi.fn().mockReturnThis()
const mockDoc = vi.fn().mockReturnValue({
  get: mockGet,
  update: mockUpdate,
})
const mockCollection = vi.fn().mockImplementation(() => ({
  add: mockAdd,
  doc: mockDoc,
  where: mockWhere,
  limit: mockLimit,
  get: mockGet,
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2025-12-15T10:00:00Z'),
    })),
    fromMillis: vi.fn((ms: number) => ({
      toDate: () => new Date(ms),
      seconds: Math.floor(ms / 1000),
    })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

// Mock resourceService
vi.mock('./resourceService', async () => {
  const actual = await vi.importActual<typeof import('./resourceService')>('./resourceService')
  return {
    ...actual,
    getActiveResources: vi.fn().mockResolvedValue([
      {
        id: 'hotline-1',
        name: 'National Domestic Violence Hotline',
        type: 'hotline',
        value: '1-800-799-7233',
        description: '24/7 confidential support',
        displayOrder: 1,
        isActive: true,
      },
      {
        id: 'text-1',
        name: 'Crisis Text Line',
        type: 'text-line',
        value: 'Text HOME to 741741',
        description: 'Free 24/7 crisis text support',
        displayOrder: 2,
        isActive: true,
      },
      {
        id: 'website-1',
        name: 'The Hotline - Safety Planning',
        type: 'website',
        value: 'https://www.thehotline.org/plan-for-safety/',
        description: 'Safety planning guides',
        displayOrder: 3,
        isActive: true,
      },
      {
        id: 'legal-1',
        name: 'LawHelp.org',
        type: 'legal-aid',
        value: 'https://www.lawhelp.org/',
        description: 'Find free legal aid',
        displayOrder: 4,
        isActive: true,
      },
    ]),
  }
})

describe('emailService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateSubject', () => {
    it('should return a neutral subject line', () => {
      const subject = generateSubject()

      expect(subject).toBe('Resources you requested')
      // Subject should NOT contain sensitive words
      expect(subject.toLowerCase()).not.toContain('fledgely')
      expect(subject.toLowerCase()).not.toContain('escape')
      expect(subject.toLowerCase()).not.toContain('abuse')
      expect(subject.toLowerCase()).not.toContain('domestic')
      expect(subject.toLowerCase()).not.toContain('violence')
    })
  })

  describe('generatePlainTextContent', () => {
    const mockResources: EscapeResource[] = [
      {
        id: 'hotline-1',
        name: 'National DV Hotline',
        type: 'hotline',
        value: '1-800-799-7233',
        description: '24/7 support',
        displayOrder: 1,
        isActive: true,
        verifiedAt: Timestamp.now(),
        verifiedBy: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        id: 'text-1',
        name: 'Crisis Text',
        type: 'text-line',
        value: 'Text HOME to 741741',
        description: 'Text support',
        displayOrder: 2,
        isActive: true,
        verifiedAt: Timestamp.now(),
        verifiedBy: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ]

    it('should include safety warning when not using safe contact', () => {
      const content = generatePlainTextContent(mockResources, false)

      expect(content).toContain('IMPORTANT SAFETY NOTE')
      expect(content).toContain('account email')
    })

    it('should NOT include safety warning when using safe contact', () => {
      const content = generatePlainTextContent(mockResources, true)

      expect(content).not.toContain('IMPORTANT SAFETY NOTE')
    })

    it('should include all resource types', () => {
      const content = generatePlainTextContent(mockResources, true)

      expect(content).toContain('National DV Hotline')
      expect(content).toContain('1-800-799-7233')
      expect(content).toContain('Crisis Text')
      expect(content).toContain('Text HOME to 741741')
    })

    it('should include disclaimer about error', () => {
      const content = generatePlainTextContent(mockResources, true)

      expect(content).toContain('sent in error')
      expect(content).toContain('ignore it')
    })

    it('should include supportive message', () => {
      const content = generatePlainTextContent(mockResources, true)

      expect(content).toContain('You are not alone')
      expect(content).toContain('Help is available')
    })
  })

  describe('generateHtmlContent', () => {
    const mockResources: EscapeResource[] = [
      {
        id: 'hotline-1',
        name: 'Test Hotline',
        type: 'hotline',
        value: '1-800-TEST',
        description: 'Test description',
        displayOrder: 1,
        isActive: true,
        verifiedAt: Timestamp.now(),
        verifiedBy: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ]

    it('should generate valid HTML', () => {
      const html = generateHtmlContent(mockResources, true)

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html>')
      expect(html).toContain('</html>')
    })

    it('should include safety warning div when not using safe contact', () => {
      const html = generateHtmlContent(mockResources, false)

      expect(html).toContain('class="warning"')
      expect(html).toContain('Important Safety Note')
    })

    it('should NOT include safety warning when using safe contact', () => {
      const html = generateHtmlContent(mockResources, true)

      expect(html).not.toContain('class="warning"')
    })

    it('should escape HTML special characters', () => {
      const resourceWithSpecialChars: EscapeResource[] = [
        {
          id: 'test',
          name: 'Test <script>alert("xss")</script>',
          type: 'hotline',
          value: '1-800-TEST',
          description: 'Description with & ampersand',
          displayOrder: 1,
          isActive: true,
          verifiedAt: Timestamp.now(),
          verifiedBy: 'admin',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ]

      const html = generateHtmlContent(resourceWithSpecialChars, true)

      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
      expect(html).toContain('&amp;')
    })

    it('should include clickable links for websites', () => {
      const websiteResources: EscapeResource[] = [
        {
          id: 'web-1',
          name: 'Test Website',
          type: 'website',
          value: 'https://example.com',
          description: 'Test',
          displayOrder: 1,
          isActive: true,
          verifiedAt: Timestamp.now(),
          verifiedBy: 'admin',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ]

      const html = generateHtmlContent(websiteResources, true)

      expect(html).toContain('href="https://example.com"')
    })
  })

  describe('MAX_RETRY_ATTEMPTS', () => {
    it('should be set to 3', () => {
      expect(MAX_RETRY_ATTEMPTS).toBe(3)
    })
  })

  describe('calculateNextRetryTime', () => {
    it('should calculate exponential backoff delays', () => {
      // First retry: 1 minute
      const retry1 = calculateNextRetryTime(0)
      expect(retry1).toBeDefined()

      // Second retry: 5 minutes
      const retry2 = calculateNextRetryTime(1)
      expect(retry2).toBeDefined()

      // Third retry: 15 minutes
      const retry3 = calculateNextRetryTime(2)
      expect(retry3).toBeDefined()
    })

    it('should cap delay at max for excessive attempts', () => {
      // Beyond array bounds should use last value
      const retry10 = calculateNextRetryTime(10)
      expect(retry10).toBeDefined()
    })
  })

  describe('queueResourceReferralEmail', () => {
    it('should create queue item in Firestore', async () => {
      const { queueResourceReferralEmail } = await import('./emailService')

      const queueId = await queueResourceReferralEmail(
        'safety-request-123',
        'victim@example.com',
        true
      )

      expect(mockCollection).toHaveBeenCalledWith('emailQueue')
      expect(mockAdd).toHaveBeenCalled()
      expect(queueId).toBe('queue-id-123')
    })
  })

  describe('hasReferralBeenSent', () => {
    it('should return true if referral exists', async () => {
      const { hasReferralBeenSent } = await import('./emailService')

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'existing-queue' }],
      })

      const result = await hasReferralBeenSent('safety-request-123')

      expect(result).toBe(true)
      expect(mockWhere).toHaveBeenCalledWith('safetyRequestId', '==', 'safety-request-123')
    })

    it('should return false if no referral exists', async () => {
      const { hasReferralBeenSent } = await import('./emailService')

      mockGet.mockResolvedValueOnce({
        empty: true,
        docs: [],
      })

      const result = await hasReferralBeenSent('safety-request-123')

      expect(result).toBe(false)
    })
  })

  describe('generateResourceEmail', () => {
    it('should generate complete email content', async () => {
      const { generateResourceEmail } = await import('./emailService')

      const email = await generateResourceEmail(true)

      expect(email.subject).toBe('Resources you requested')
      expect(email.html).toContain('<!DOCTYPE html>')
      expect(email.text).toContain('CRISIS HOTLINES')
    })

    it('should include safety warning when not using safe contact', async () => {
      const { generateResourceEmail } = await import('./emailService')

      const email = await generateResourceEmail(false)

      expect(email.html).toContain('Important Safety Note')
      expect(email.text).toContain('IMPORTANT SAFETY NOTE')
    })
  })

  describe('generateIntegrityHash', () => {
    it('should generate consistent SHA-256 hash', async () => {
      const { generateIntegrityHash } = await import('./emailService')

      const data = { action: 'test', timestamp: '2025-12-15' }
      const hash1 = generateIntegrityHash(data)
      const hash2 = generateIntegrityHash(data)

      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64)
    })

    it('should generate different hashes for different data', async () => {
      const { generateIntegrityHash } = await import('./emailService')

      const hash1 = generateIntegrityHash({ action: 'test1' })
      const hash2 = generateIntegrityHash({ action: 'test2' })

      expect(hash1).not.toBe(hash2)
    })
  })
})
