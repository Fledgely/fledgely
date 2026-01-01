/**
 * logParentCompliance Tests - Story 32.4
 *
 * Tests for the parent compliance logging HTTP endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin
const mockSet = vi.fn()
const mockDocRef = { id: 'compliance-123', set: mockSet }
const mockComplianceDoc = vi.fn(() => mockDocRef)
const mockComplianceCollection = vi.fn(() => ({ doc: mockComplianceDoc }))
const mockFamilyDocGet = vi.fn()
const mockFamilyDoc = vi.fn(() => ({
  get: mockFamilyDocGet,
  collection: mockComplianceCollection,
}))
const mockFamilyCollection = vi.fn(() => ({ doc: mockFamilyDoc }))
const mockDb = { collection: mockFamilyCollection }

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP') },
}))

vi.mock('firebase-functions/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((_config, handler) => handler),
}))

// Import after mocks
import { logParentCompliance } from './logParentCompliance'

describe('logParentCompliance - Story 32.4', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFamilyDocGet.mockResolvedValue({ exists: true })
    mockSet.mockResolvedValue(undefined)
  })

  it('rejects non-POST requests', async () => {
    const req = { method: 'GET', body: {} } as never
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as never

    await (logParentCompliance as (req: never, res: never) => Promise<void>)(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('returns 400 for invalid request body', async () => {
    const req = { method: 'POST', body: { invalid: true } } as never
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as never

    await (logParentCompliance as (req: never, res: never) => Promise<void>)(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid request' }))
  })

  it('returns 404 for non-existent family', async () => {
    mockFamilyDocGet.mockResolvedValue({ exists: false })

    const req = {
      method: 'POST',
      body: {
        familyId: 'nonexistent-family',
        parentUid: 'parent-123',
        deviceId: 'device-456',
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        wasCompliant: true,
        activityEvents: [],
        createdAt: 1704067200000,
      },
    } as never
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as never

    await (logParentCompliance as (req: never, res: never) => Promise<void>)(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Family not found' })
  })

  it('saves compliant record successfully', async () => {
    const req = {
      method: 'POST',
      body: {
        familyId: 'family-123',
        parentUid: 'parent-456',
        deviceId: 'device-789',
        parentDisplayName: 'Mom',
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        wasCompliant: true,
        activityEvents: [],
        createdAt: 1704067200000,
      },
    } as never
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as never

    await (logParentCompliance as (req: never, res: never) => Promise<void>)(req, res)

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        familyId: 'family-123',
        parentUid: 'parent-456',
        wasCompliant: true,
        id: 'compliance-123',
        serverCreatedAt: 'SERVER_TIMESTAMP',
      })
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      recordId: 'compliance-123',
    })
  })

  it('saves non-compliant record with activity events', async () => {
    const activityEvents = [
      { timestamp: 1704080000000, type: 'navigation' as const },
      { timestamp: 1704085000000, type: 'browser_active' as const },
    ]

    const req = {
      method: 'POST',
      body: {
        familyId: 'family-123',
        parentUid: 'parent-456',
        deviceId: 'device-789',
        parentDisplayName: 'Dad',
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        wasCompliant: false,
        activityEvents,
        createdAt: 1704067200000,
      },
    } as never
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as never

    await (logParentCompliance as (req: never, res: never) => Promise<void>)(req, res)

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        wasCompliant: false,
        activityEvents,
      })
    )
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('handles Firestore errors gracefully', async () => {
    mockFamilyDocGet.mockRejectedValue(new Error('Firestore error'))

    const req = {
      method: 'POST',
      body: {
        familyId: 'family-123',
        parentUid: 'parent-456',
        deviceId: 'device-789',
        offlineWindowStart: 1704067200000,
        offlineWindowEnd: 1704110400000,
        wasCompliant: true,
        activityEvents: [],
        createdAt: 1704067200000,
      },
    } as never
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as never

    await (logParentCompliance as (req: never, res: never) => Promise<void>)(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
  })
})
