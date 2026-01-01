/**
 * getOfflineSchedule Tests - Story 32.3
 *
 * Tests for the offline schedule HTTP endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin
const mockGet = vi.fn()
const mockSettingsDoc = vi.fn(() => ({ get: mockGet }))
const mockSettingsCollection = vi.fn(() => ({ doc: mockSettingsDoc }))
const mockFamilyDoc = vi.fn(() => ({ collection: mockSettingsCollection }))
const mockFamilyCollection = vi.fn(() => ({ doc: mockFamilyDoc }))
const mockDb = { collection: mockFamilyCollection }

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
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
import { getOfflineSchedule } from './getOfflineSchedule'

describe('getOfflineSchedule - Story 32.3', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-POST requests', async () => {
    const req = { method: 'GET', body: {} } as never
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as never

    await (getOfflineSchedule as (req: never, res: never) => Promise<void>)(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('returns 400 for missing familyId', async () => {
    const req = { method: 'POST', body: {} } as never
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as never

    await (getOfflineSchedule as (req: never, res: never) => Promise<void>)(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid request' }))
  })

  it('returns default schedule when not configured', async () => {
    mockGet.mockResolvedValue({ exists: false })

    const req = { method: 'POST', body: { familyId: 'family-123' } } as never
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as never

    await (getOfflineSchedule as (req: never, res: never) => Promise<void>)(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        familyId: 'family-123',
        enabled: false,
      })
    )
  })

  it('returns configured schedule', async () => {
    const scheduleData = {
      enabled: true,
      preset: 'dinner_time',
      weekdayWindow: { startTime: '18:00', endTime: '19:00', timezone: 'America/New_York' },
      weekendWindow: null,
      createdAt: 1704067200000,
      updatedAt: 1704067200000,
    }

    mockGet.mockResolvedValue({ exists: true, data: () => scheduleData })

    const req = { method: 'POST', body: { familyId: 'family-123' } } as never
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as never

    await (getOfflineSchedule as (req: never, res: never) => Promise<void>)(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        familyId: 'family-123',
        enabled: true,
        preset: 'dinner_time',
      })
    )
  })

  it('handles Firestore errors gracefully', async () => {
    mockGet.mockRejectedValue(new Error('Firestore error'))

    const req = { method: 'POST', body: { familyId: 'family-123' } } as never
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as never

    await (getOfflineSchedule as (req: never, res: never) => Promise<void>)(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
  })
})
