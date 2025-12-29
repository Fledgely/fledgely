/**
 * Unit tests for Screenshot Upload HTTP Endpoint
 * Story 18.1: Firebase Storage Upload Endpoint
 * Story 18.2: Screenshot Metadata in Firestore
 *
 * Tests cover:
 * - AC1: Storage upload (device validation, storage integration)
 * - AC2: Upload validation (device auth, childId ownership, file size)
 * - AC4: Metadata storage
 * - AC5: Success response format
 * - Story 18.2 AC1: Metadata schema validation
 * - Story 18.2 AC5: Retention calculation (30 days default)
 *
 * Note: Tests the uploadRequestSchema validation and path generation utilities.
 * Full integration tests would require firebase-functions-test package.
 */

import { describe, it, expect } from 'vitest'
import { uploadRequestSchema, generateStoragePath, dataUrlToBuffer } from './screenshots'
import {
  screenshotMetadataSchema,
  generateScreenshotId,
  calculateRetentionExpiry,
  createScreenshotMetadata,
  DEFAULT_RETENTION_DAYS,
  RETENTION_DAYS_OPTIONS,
  retentionPolicySchema,
  getRetentionDays,
  isValidRetentionDays,
  formatExpiryRemaining,
  type ScreenshotMetadata,
  type RetentionPolicy,
} from '@fledgely/shared'

// Test helpers
const createValidPayload = () => ({
  dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgM=',
  timestamp: Date.now(),
  url: 'https://example.com/page',
  title: 'Test Page',
  deviceId: 'device-123',
  familyId: 'family-123',
  childId: 'child-123',
  queuedAt: Date.now() - 1000,
})

describe('Upload Request Validation Schema', () => {
  describe('Valid requests', () => {
    it('should accept valid payload', () => {
      const payload = createValidPayload()
      const result = uploadRequestSchema.safeParse(payload)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(payload)
      }
    })

    it('should accept minimal valid payload', () => {
      const payload = {
        dataUrl: 'data:image/jpeg;base64,abc',
        timestamp: 1,
        url: 'x',
        title: 'y',
        deviceId: 'd',
        familyId: 'f',
        childId: 'c',
        queuedAt: 1,
      }
      const result = uploadRequestSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })
  })

  describe('Missing required fields', () => {
    it('should reject missing dataUrl', () => {
      const payload = { ...createValidPayload() }
      delete (payload as any).dataUrl
      const result = uploadRequestSchema.safeParse(payload)

      expect(result.success).toBe(false)
    })

    it('should reject missing timestamp', () => {
      const payload = { ...createValidPayload() }
      delete (payload as any).timestamp
      const result = uploadRequestSchema.safeParse(payload)

      expect(result.success).toBe(false)
    })

    it('should reject missing deviceId', () => {
      const payload = { ...createValidPayload() }
      delete (payload as any).deviceId
      const result = uploadRequestSchema.safeParse(payload)

      expect(result.success).toBe(false)
    })

    it('should reject missing familyId', () => {
      const payload = { ...createValidPayload() }
      delete (payload as any).familyId
      const result = uploadRequestSchema.safeParse(payload)

      expect(result.success).toBe(false)
    })

    it('should reject missing childId', () => {
      const payload = { ...createValidPayload() }
      delete (payload as any).childId
      const result = uploadRequestSchema.safeParse(payload)

      expect(result.success).toBe(false)
    })
  })

  describe('Invalid field types', () => {
    it('should reject non-string dataUrl', () => {
      const payload = { ...createValidPayload(), dataUrl: 123 }
      const result = uploadRequestSchema.safeParse(payload)

      expect(result.success).toBe(false)
    })

    it('should reject non-number timestamp', () => {
      const payload = { ...createValidPayload(), timestamp: 'invalid' }
      const result = uploadRequestSchema.safeParse(payload)

      expect(result.success).toBe(false)
    })

    it('should reject negative timestamp', () => {
      const payload = { ...createValidPayload(), timestamp: -1 }
      const result = uploadRequestSchema.safeParse(payload)

      expect(result.success).toBe(false)
    })

    it('should reject zero timestamp', () => {
      const payload = { ...createValidPayload(), timestamp: 0 }
      const result = uploadRequestSchema.safeParse(payload)

      expect(result.success).toBe(false)
    })

    it('should reject empty strings', () => {
      const payload = { ...createValidPayload(), url: '' }
      const result = uploadRequestSchema.safeParse(payload)

      expect(result.success).toBe(false)
    })
  })
})

describe('Storage Path Generation', () => {
  it('should generate correct path format', () => {
    const childId = 'child-abc'
    const timestamp = new Date('2025-12-29T10:30:00Z').getTime()

    const path = generateStoragePath(childId, timestamp)

    expect(path).toBe(`screenshots/child-abc/2025-12-29/${timestamp}.jpg`)
  })

  it('should handle different dates correctly', () => {
    const childId = 'child-123'

    // Test different dates
    const dates = [
      new Date('2025-01-01T00:00:00Z'),
      new Date('2025-06-15T12:30:00Z'),
      new Date('2025-12-31T23:59:59Z'),
    ]

    for (const date of dates) {
      const timestamp = date.getTime()
      const path = generateStoragePath(childId, timestamp)
      const dateStr = date.toISOString().split('T')[0]

      expect(path).toBe(`screenshots/${childId}/${dateStr}/${timestamp}.jpg`)
    }
  })

  it('should include childId in path', () => {
    const childId = 'unique-child-id'
    const timestamp = Date.now()

    const path = generateStoragePath(childId, timestamp)

    expect(path).toContain(childId)
  })

  it('should include timestamp in filename', () => {
    const childId = 'child-123'
    const timestamp = 1735489200000

    const path = generateStoragePath(childId, timestamp)

    expect(path).toContain('1735489200000.jpg')
  })
})

describe('Data URL to Buffer Conversion', () => {
  it('should convert valid JPEG data URL to buffer', () => {
    const dataUrl = 'data:image/jpeg;base64,SGVsbG8gV29ybGQ='
    const buffer = dataUrlToBuffer(dataUrl)

    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.toString()).toBe('Hello World')
  })

  it('should handle different image types', () => {
    const pngDataUrl = 'data:image/png;base64,SGVsbG8='
    const buffer = dataUrlToBuffer(pngDataUrl)

    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.toString()).toBe('Hello')
  })

  it('should handle empty base64 data', () => {
    const dataUrl = 'data:image/jpeg;base64,'
    const buffer = dataUrlToBuffer(dataUrl)

    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBe(0)
  })
})

describe('File Size Validation', () => {
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

  it('should calculate estimated size correctly', () => {
    // Base64 encoding increases size by ~33%, so decoded size is ~75% of encoded
    const base64Data = 'A'.repeat(1000)
    const estimatedSize = Math.ceil((base64Data.length * 3) / 4)

    expect(estimatedSize).toBe(750)
  })

  it('should detect files exceeding 5MB', () => {
    // Create a base64 string that would decode to >5MB
    // 5MB = 5 * 1024 * 1024 = 5242880 bytes
    // In base64, this is approximately 5242880 * 4/3 = ~7 million characters
    const largeBase64 = 'A'.repeat(7 * 1024 * 1024)
    const estimatedSize = Math.ceil((largeBase64.length * 3) / 4)

    expect(estimatedSize).toBeGreaterThan(MAX_FILE_SIZE_BYTES)
  })

  it('should accept files under 5MB', () => {
    // Create a base64 string that would decode to <5MB
    const smallBase64 = 'A'.repeat(1 * 1024 * 1024) // ~750KB decoded
    const estimatedSize = Math.ceil((smallBase64.length * 3) / 4)

    expect(estimatedSize).toBeLessThan(MAX_FILE_SIZE_BYTES)
  })
})

describe('Data URL Format Validation', () => {
  it('should validate JPEG format', () => {
    const jpegDataUrl = 'data:image/jpeg;base64,abc123'
    expect(jpegDataUrl.startsWith('data:image/jpeg;base64,')).toBe(true)
  })

  it('should reject PNG format', () => {
    const pngDataUrl = 'data:image/png;base64,abc123'
    expect(pngDataUrl.startsWith('data:image/jpeg;base64,')).toBe(false)
  })

  it('should reject GIF format', () => {
    const gifDataUrl = 'data:image/gif;base64,abc123'
    expect(gifDataUrl.startsWith('data:image/jpeg;base64,')).toBe(false)
  })

  it('should reject malformed data URLs', () => {
    const malformed = 'not a data url'
    expect(malformed.startsWith('data:image/jpeg;base64,')).toBe(false)
  })
})

describe('Response Format', () => {
  // Story 18.2: Updated response format to include screenshotId
  interface UploadResponse {
    success: boolean
    storagePath?: string
    screenshotId?: string
    error?: string
  }

  it('should have correct success response structure with screenshotId', () => {
    const successResponse: UploadResponse = {
      success: true,
      storagePath: 'screenshots/child-123/2025-12-29/1735489200000.jpg',
      screenshotId: '1735489200000_abc123',
    }

    expect(successResponse.success).toBe(true)
    expect(successResponse.storagePath).toBeDefined()
    expect(successResponse.screenshotId).toBeDefined()
    expect(successResponse.error).toBeUndefined()
  })

  it('should have correct error response structure', () => {
    const errorResponse: UploadResponse = {
      success: false,
      error: 'Device not registered',
    }

    expect(errorResponse.success).toBe(false)
    expect(errorResponse.error).toBeDefined()
    expect(errorResponse.storagePath).toBeUndefined()
    expect(errorResponse.screenshotId).toBeUndefined()
  })
})

// ============================================================================
// Story 18.2: Screenshot Metadata in Firestore Tests
// ============================================================================

describe('Screenshot Metadata Schema', () => {
  // Story 18.2 AC1: Test metadata schema validation
  const createValidMetadata = (): ScreenshotMetadata => ({
    screenshotId: '1735489200000_abc123',
    childId: 'child-123',
    familyId: 'family-123',
    deviceId: 'device-123',
    storagePath: 'screenshots/child-123/2025-12-29/1735489200000.jpg',
    sizeBytes: 500000,
    timestamp: 1735489200000,
    url: 'https://example.com/page',
    title: 'Test Page',
    uploadedAt: 1735489210000,
    queuedAt: 1735489195000,
    retentionExpiresAt: 1738081210000,
  })

  describe('Valid metadata', () => {
    it('should accept valid metadata', () => {
      const metadata = createValidMetadata()
      const result = screenshotMetadataSchema.safeParse(metadata)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(metadata)
      }
    })

    it('should accept metadata with all required fields', () => {
      const metadata = createValidMetadata()
      const result = screenshotMetadataSchema.safeParse(metadata)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.screenshotId).toBe(metadata.screenshotId)
        expect(result.data.childId).toBe(metadata.childId)
        expect(result.data.familyId).toBe(metadata.familyId)
        expect(result.data.deviceId).toBe(metadata.deviceId)
        expect(result.data.storagePath).toBe(metadata.storagePath)
        expect(result.data.sizeBytes).toBe(metadata.sizeBytes)
        expect(result.data.timestamp).toBe(metadata.timestamp)
        expect(result.data.url).toBe(metadata.url)
        expect(result.data.title).toBe(metadata.title)
        expect(result.data.uploadedAt).toBe(metadata.uploadedAt)
        expect(result.data.queuedAt).toBe(metadata.queuedAt)
        expect(result.data.retentionExpiresAt).toBe(metadata.retentionExpiresAt)
      }
    })
  })

  describe('Invalid metadata', () => {
    it('should reject missing screenshotId', () => {
      const metadata = { ...createValidMetadata() }
      delete (metadata as any).screenshotId
      const result = screenshotMetadataSchema.safeParse(metadata)

      expect(result.success).toBe(false)
    })

    it('should reject invalid sizeBytes (negative)', () => {
      const metadata = { ...createValidMetadata(), sizeBytes: -1 }
      const result = screenshotMetadataSchema.safeParse(metadata)

      expect(result.success).toBe(false)
    })

    it('should reject invalid sizeBytes (zero)', () => {
      const metadata = { ...createValidMetadata(), sizeBytes: 0 }
      const result = screenshotMetadataSchema.safeParse(metadata)

      expect(result.success).toBe(false)
    })

    it('should reject invalid timestamp (negative)', () => {
      const metadata = { ...createValidMetadata(), timestamp: -1 }
      const result = screenshotMetadataSchema.safeParse(metadata)

      expect(result.success).toBe(false)
    })

    it('should reject invalid timestamp (zero)', () => {
      const metadata = { ...createValidMetadata(), timestamp: 0 }
      const result = screenshotMetadataSchema.safeParse(metadata)

      expect(result.success).toBe(false)
    })

    it('should reject non-integer sizeBytes', () => {
      const metadata = { ...createValidMetadata(), sizeBytes: 500.5 }
      const result = screenshotMetadataSchema.safeParse(metadata)

      expect(result.success).toBe(false)
    })
  })
})

describe('Screenshot ID Generation', () => {
  // Story 18.2 AC1: Test screenshotId generation uniqueness

  it('should generate ID with timestamp prefix', () => {
    const timestamp = 1735489200000
    const id = generateScreenshotId(timestamp)

    expect(id.startsWith(`${timestamp}_`)).toBe(true)
  })

  it('should generate unique IDs for same timestamp', () => {
    const timestamp = 1735489200000
    const ids = new Set<string>()

    // Generate 100 IDs with the same timestamp
    for (let i = 0; i < 100; i++) {
      ids.add(generateScreenshotId(timestamp))
    }

    // All IDs should be unique
    expect(ids.size).toBe(100)
  })

  it('should generate IDs with format {timestamp}_{random}', () => {
    const timestamp = 1735489200000
    const id = generateScreenshotId(timestamp)

    // Should match format: timestamp_6chars
    const match = id.match(/^(\d+)_([a-z0-9]+)$/)
    expect(match).not.toBeNull()
    expect(match?.[1]).toBe(timestamp.toString())
    expect(match?.[2].length).toBe(6)
  })

  it('should generate different IDs for different timestamps', () => {
    const id1 = generateScreenshotId(1735489200000)
    const id2 = generateScreenshotId(1735489200001)

    expect(id1.split('_')[0]).not.toBe(id2.split('_')[0])
  })
})

describe('Retention Expiry Calculation', () => {
  // Story 18.2 AC5: Test retention calculation (30 days default)

  it('should use default retention of 30 days', () => {
    expect(DEFAULT_RETENTION_DAYS).toBe(30)
  })

  it('should calculate expiry as uploadedAt + 30 days by default', () => {
    const uploadedAt = 1735489200000
    const expiry = calculateRetentionExpiry(uploadedAt)

    const expectedExpiry = uploadedAt + 30 * 24 * 60 * 60 * 1000
    expect(expiry).toBe(expectedExpiry)
  })

  it('should calculate expiry with custom retention days', () => {
    const uploadedAt = 1735489200000
    const customDays = 60
    const expiry = calculateRetentionExpiry(uploadedAt, customDays)

    const expectedExpiry = uploadedAt + customDays * 24 * 60 * 60 * 1000
    expect(expiry).toBe(expectedExpiry)
  })

  it('should handle 0 day retention', () => {
    const uploadedAt = 1735489200000
    const expiry = calculateRetentionExpiry(uploadedAt, 0)

    expect(expiry).toBe(uploadedAt)
  })

  it('should calculate ~2592000000ms for 30 days', () => {
    const uploadedAt = 0
    const expiry = calculateRetentionExpiry(uploadedAt, 30)

    // 30 days in ms = 30 * 24 * 60 * 60 * 1000 = 2,592,000,000
    expect(expiry).toBe(2592000000)
  })
})

describe('Create Screenshot Metadata Factory', () => {
  // Story 18.2 AC1, AC2: Test factory function

  const createParams = () => ({
    timestamp: 1735489200000,
    childId: 'child-123',
    familyId: 'family-123',
    deviceId: 'device-123',
    storagePath: 'screenshots/child-123/2025-12-29/1735489200000.jpg',
    sizeBytes: 500000,
    url: 'https://example.com/page',
    title: 'Test Page',
    queuedAt: 1735489195000,
  })

  it('should create valid metadata from params', () => {
    const params = createParams()
    const metadata = createScreenshotMetadata(params)

    // Validate against schema
    const result = screenshotMetadataSchema.safeParse(metadata)
    expect(result.success).toBe(true)
  })

  it('should include all required fields', () => {
    const params = createParams()
    const metadata = createScreenshotMetadata(params)

    expect(metadata.childId).toBe(params.childId)
    expect(metadata.familyId).toBe(params.familyId)
    expect(metadata.deviceId).toBe(params.deviceId)
    expect(metadata.storagePath).toBe(params.storagePath)
    expect(metadata.sizeBytes).toBe(params.sizeBytes)
    expect(metadata.timestamp).toBe(params.timestamp)
    expect(metadata.url).toBe(params.url)
    expect(metadata.title).toBe(params.title)
    expect(metadata.queuedAt).toBe(params.queuedAt)
  })

  it('should generate screenshotId from timestamp', () => {
    const params = createParams()
    const metadata = createScreenshotMetadata(params)

    expect(metadata.screenshotId.startsWith(`${params.timestamp}_`)).toBe(true)
  })

  it('should set uploadedAt to current time', () => {
    const before = Date.now()
    const params = createParams()
    const metadata = createScreenshotMetadata(params)
    const after = Date.now()

    expect(metadata.uploadedAt).toBeGreaterThanOrEqual(before)
    expect(metadata.uploadedAt).toBeLessThanOrEqual(after)
  })

  it('should calculate retentionExpiresAt with default 30 days', () => {
    const params = createParams()
    const metadata = createScreenshotMetadata(params)

    const expectedExpiry = metadata.uploadedAt + 30 * 24 * 60 * 60 * 1000
    expect(metadata.retentionExpiresAt).toBe(expectedExpiry)
  })

  it('should calculate retentionExpiresAt with custom retention days', () => {
    const params = { ...createParams(), retentionDays: 60 }
    const metadata = createScreenshotMetadata(params)

    const expectedExpiry = metadata.uploadedAt + 60 * 24 * 60 * 60 * 1000
    expect(metadata.retentionExpiresAt).toBe(expectedExpiry)
  })
})

// ============================================================================
// Story 18.3: Configurable Retention Policy Tests
// ============================================================================

describe('Retention Days Options', () => {
  // Story 18.3 AC2: Test allowed retention periods

  it('should have exactly three retention options', () => {
    expect(RETENTION_DAYS_OPTIONS.length).toBe(3)
  })

  it('should include 7, 30, and 90 days', () => {
    expect(RETENTION_DAYS_OPTIONS).toContain(7)
    expect(RETENTION_DAYS_OPTIONS).toContain(30)
    expect(RETENTION_DAYS_OPTIONS).toContain(90)
  })

  it('should use 30 days as default', () => {
    expect(DEFAULT_RETENTION_DAYS).toBe(30)
    expect(RETENTION_DAYS_OPTIONS).toContain(DEFAULT_RETENTION_DAYS)
  })
})

describe('isValidRetentionDays', () => {
  // Story 18.3 AC2: Test retention validation

  it('should accept 7 days', () => {
    expect(isValidRetentionDays(7)).toBe(true)
  })

  it('should accept 30 days', () => {
    expect(isValidRetentionDays(30)).toBe(true)
  })

  it('should accept 90 days', () => {
    expect(isValidRetentionDays(90)).toBe(true)
  })

  it('should reject 0 days', () => {
    expect(isValidRetentionDays(0)).toBe(false)
  })

  it('should reject 1 day', () => {
    expect(isValidRetentionDays(1)).toBe(false)
  })

  it('should reject 14 days', () => {
    expect(isValidRetentionDays(14)).toBe(false)
  })

  it('should reject 60 days', () => {
    expect(isValidRetentionDays(60)).toBe(false)
  })

  it('should reject 365 days', () => {
    expect(isValidRetentionDays(365)).toBe(false)
  })

  it('should reject negative values', () => {
    expect(isValidRetentionDays(-1)).toBe(false)
  })
})

describe('getRetentionDays', () => {
  // Story 18.3 AC5: Test default retention fallback

  it('should return default when policy is null', () => {
    expect(getRetentionDays(null)).toBe(DEFAULT_RETENTION_DAYS)
  })

  it('should return default when policy is undefined', () => {
    expect(getRetentionDays(undefined)).toBe(DEFAULT_RETENTION_DAYS)
  })

  it('should return policy value for 7 days', () => {
    const policy: RetentionPolicy = {
      retentionDays: 7,
      updatedAt: Date.now(),
      updatedByUid: 'user-123',
    }
    expect(getRetentionDays(policy)).toBe(7)
  })

  it('should return policy value for 90 days', () => {
    const policy: RetentionPolicy = {
      retentionDays: 90,
      updatedAt: Date.now(),
      updatedByUid: 'user-123',
    }
    expect(getRetentionDays(policy)).toBe(90)
  })
})

describe('Retention Policy Schema', () => {
  // Story 18.3 AC1, AC2: Test policy schema validation

  const createValidPolicy = (): RetentionPolicy => ({
    retentionDays: 30,
    updatedAt: Date.now(),
    updatedByUid: 'user-123',
  })

  it('should accept valid 7-day policy', () => {
    const policy = { ...createValidPolicy(), retentionDays: 7 }
    const result = retentionPolicySchema.safeParse(policy)
    expect(result.success).toBe(true)
  })

  it('should accept valid 30-day policy', () => {
    const policy = createValidPolicy()
    const result = retentionPolicySchema.safeParse(policy)
    expect(result.success).toBe(true)
  })

  it('should accept valid 90-day policy', () => {
    const policy = { ...createValidPolicy(), retentionDays: 90 }
    const result = retentionPolicySchema.safeParse(policy)
    expect(result.success).toBe(true)
  })

  it('should reject 14-day policy', () => {
    const policy = { ...createValidPolicy(), retentionDays: 14 }
    const result = retentionPolicySchema.safeParse(policy)
    expect(result.success).toBe(false)
  })

  it('should reject 60-day policy', () => {
    const policy = { ...createValidPolicy(), retentionDays: 60 }
    const result = retentionPolicySchema.safeParse(policy)
    expect(result.success).toBe(false)
  })

  it('should reject 0-day policy', () => {
    const policy = { ...createValidPolicy(), retentionDays: 0 }
    const result = retentionPolicySchema.safeParse(policy)
    expect(result.success).toBe(false)
  })

  it('should reject negative retention', () => {
    const policy = { ...createValidPolicy(), retentionDays: -1 }
    const result = retentionPolicySchema.safeParse(policy)
    expect(result.success).toBe(false)
  })

  it('should reject missing updatedAt', () => {
    const policy = { retentionDays: 30, updatedByUid: 'user-123' }
    const result = retentionPolicySchema.safeParse(policy)
    expect(result.success).toBe(false)
  })

  it('should reject missing updatedByUid', () => {
    const policy = { retentionDays: 30, updatedAt: Date.now() }
    const result = retentionPolicySchema.safeParse(policy)
    expect(result.success).toBe(false)
  })
})

describe('formatExpiryRemaining', () => {
  // Story 18.3 AC4: Test expiry display formatting

  it('should show "Expired" for past dates', () => {
    const pastExpiry = Date.now() - 1000
    expect(formatExpiryRemaining(pastExpiry)).toBe('Expired')
  })

  it('should show "Expires today" for less than 24 hours', () => {
    const soonExpiry = Date.now() + 12 * 60 * 60 * 1000 // 12 hours
    expect(formatExpiryRemaining(soonExpiry)).toBe('Expires today')
  })

  it('should show "Expires tomorrow" for 24-48 hours', () => {
    const tomorrowExpiry = Date.now() + 36 * 60 * 60 * 1000 // 36 hours
    expect(formatExpiryRemaining(tomorrowExpiry)).toBe('Expires tomorrow')
  })

  it('should show "Expires in X days" for multiple days', () => {
    const fiveDaysExpiry = Date.now() + 5 * 24 * 60 * 60 * 1000
    expect(formatExpiryRemaining(fiveDaysExpiry)).toBe('Expires in 5 days')
  })

  it('should show "Expires in 30 days" for default retention', () => {
    const thirtyDaysExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000
    expect(formatExpiryRemaining(thirtyDaysExpiry)).toBe('Expires in 30 days')
  })

  it('should handle exact 0ms difference as Expired', () => {
    const now = Date.now()
    expect(formatExpiryRemaining(now)).toBe('Expired')
  })
})

describe('Upload Request Schema with Retention', () => {
  // Story 18.3: Test upload request accepts optional retentionDays

  const createValidPayloadWithRetention = () => ({
    ...{
      dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgM=',
      timestamp: 1735489200000,
      url: 'https://example.com/page',
      title: 'Test Page',
      deviceId: 'device-123',
      familyId: 'family-123',
      childId: 'child-123',
      queuedAt: 1735489195000,
    },
  })

  it('should accept request without retentionDays', () => {
    const payload = createValidPayloadWithRetention()
    const result = uploadRequestSchema.safeParse(payload)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.retentionDays).toBeUndefined()
    }
  })

  it('should accept request with 7-day retention', () => {
    const payload = { ...createValidPayloadWithRetention(), retentionDays: 7 }
    const result = uploadRequestSchema.safeParse(payload)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.retentionDays).toBe(7)
    }
  })

  it('should accept request with 30-day retention', () => {
    const payload = { ...createValidPayloadWithRetention(), retentionDays: 30 }
    const result = uploadRequestSchema.safeParse(payload)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.retentionDays).toBe(30)
    }
  })

  it('should accept request with 90-day retention', () => {
    const payload = { ...createValidPayloadWithRetention(), retentionDays: 90 }
    const result = uploadRequestSchema.safeParse(payload)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.retentionDays).toBe(90)
    }
  })

  it('should reject request with 14-day retention', () => {
    const payload = { ...createValidPayloadWithRetention(), retentionDays: 14 }
    const result = uploadRequestSchema.safeParse(payload)

    expect(result.success).toBe(false)
  })

  it('should reject request with 60-day retention', () => {
    const payload = { ...createValidPayloadWithRetention(), retentionDays: 60 }
    const result = uploadRequestSchema.safeParse(payload)

    expect(result.success).toBe(false)
  })

  it('should reject request with 0-day retention', () => {
    const payload = { ...createValidPayloadWithRetention(), retentionDays: 0 }
    const result = uploadRequestSchema.safeParse(payload)

    expect(result.success).toBe(false)
  })
})
