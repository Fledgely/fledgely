/**
 * Tests for trusted device management callable functions.
 *
 * Story 41.5: New Login Notifications - AC2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTrustedDevicesCallable,
  addTrustedDeviceCallable,
  removeTrustedDeviceCallable,
} from './manageTrustedDevices'
import { Request as CallableRequest } from 'firebase-functions/v2/https'
import type { AuthData } from 'firebase-functions/v2/tasks'

// Mock loginSessionTracker
const mockGetTrustedDevices = vi.fn()
const mockMarkDeviceAsTrusted = vi.fn()
const mockRemoveTrustedDevice = vi.fn()

vi.mock('../lib/sessions/loginSessionTracker', () => ({
  getTrustedDevices: (...args: unknown[]) => mockGetTrustedDevices(...args),
  markDeviceAsTrusted: (...args: unknown[]) => mockMarkDeviceAsTrusted(...args),
  removeTrustedDevice: (...args: unknown[]) => mockRemoveTrustedDevice(...args),
  _resetDbForTesting: vi.fn(),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

describe('getTrustedDevicesCallable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTrustedDevices.mockReset()
  })

  const createRequest = (auth: AuthData | undefined, data: unknown): CallableRequest<unknown> => ({
    auth,
    data,
    rawRequest: {} as never,
    acceptsStreaming: false,
  })

  it('rejects unauthenticated requests', async () => {
    const request = createRequest(undefined, {})

    await expect(getTrustedDevicesCallable.run(request)).rejects.toThrow('Must be logged in')
  })

  it('returns empty array when no trusted devices', async () => {
    mockGetTrustedDevices.mockResolvedValue([])

    const request = createRequest({ uid: 'user-123', token: {} as never }, {})

    const result = await getTrustedDevicesCallable.run(request)

    expect(result.success).toBe(true)
    expect(result.devices).toHaveLength(0)
    expect(mockGetTrustedDevices).toHaveBeenCalledWith('user-123')
  })

  it('returns list of trusted devices', async () => {
    const devices = [
      {
        id: 'fp-1',
        userId: 'user-123',
        fingerprintId: 'fp-1',
        deviceName: 'My MacBook',
        createdAt: Date.now(),
      },
      {
        id: 'fp-2',
        userId: 'user-123',
        fingerprintId: 'fp-2',
        deviceName: 'Work PC',
        createdAt: Date.now(),
      },
    ]
    mockGetTrustedDevices.mockResolvedValue(devices)

    const request = createRequest({ uid: 'user-123', token: {} as never }, {})

    const result = await getTrustedDevicesCallable.run(request)

    expect(result.success).toBe(true)
    expect(result.devices).toHaveLength(2)
    expect(result.devices[0].deviceName).toBe('My MacBook')
  })

  it('throws internal error on failure', async () => {
    mockGetTrustedDevices.mockRejectedValue(new Error('Database error'))

    const request = createRequest({ uid: 'user-123', token: {} as never }, {})

    await expect(getTrustedDevicesCallable.run(request)).rejects.toThrow(
      'Failed to get trusted devices'
    )
  })
})

describe('addTrustedDeviceCallable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMarkDeviceAsTrusted.mockReset()
  })

  const createRequest = (auth: AuthData | undefined, data: unknown): CallableRequest<unknown> => ({
    auth,
    data,
    rawRequest: {} as never,
    acceptsStreaming: false,
  })

  it('rejects unauthenticated requests', async () => {
    const request = createRequest(undefined, { fingerprintId: 'fp-123' })

    await expect(addTrustedDeviceCallable.run(request)).rejects.toThrow('Must be logged in')
  })

  it('rejects invalid input', async () => {
    const request = createRequest({ uid: 'user-123', token: {} as never }, {})

    await expect(addTrustedDeviceCallable.run(request)).rejects.toThrow('Invalid input')
  })

  it('marks device as trusted with custom name', async () => {
    const trustedDevice = {
      id: 'fp-abc',
      userId: 'user-123',
      fingerprintId: 'fp-abc',
      deviceName: 'My Custom Name',
      createdAt: Date.now(),
    }
    mockMarkDeviceAsTrusted.mockResolvedValue(trustedDevice)

    const request = createRequest(
      { uid: 'user-123', token: {} as never },
      { fingerprintId: 'fp-abc', deviceName: 'My Custom Name' }
    )

    const result = await addTrustedDeviceCallable.run(request)

    expect(result.success).toBe(true)
    expect(result.device.deviceName).toBe('My Custom Name')
    expect(mockMarkDeviceAsTrusted).toHaveBeenCalledWith('user-123', 'fp-abc', 'My Custom Name')
  })

  it('marks device as trusted without custom name', async () => {
    const trustedDevice = {
      id: 'fp-abc',
      userId: 'user-123',
      fingerprintId: 'fp-abc',
      deviceName: 'Chrome on Windows 10',
      createdAt: Date.now(),
    }
    mockMarkDeviceAsTrusted.mockResolvedValue(trustedDevice)

    const request = createRequest(
      { uid: 'user-123', token: {} as never },
      { fingerprintId: 'fp-abc' }
    )

    const result = await addTrustedDeviceCallable.run(request)

    expect(result.success).toBe(true)
    expect(result.device.deviceName).toBe('Chrome on Windows 10')
    expect(mockMarkDeviceAsTrusted).toHaveBeenCalledWith('user-123', 'fp-abc', undefined)
  })

  it('throws not-found error when fingerprint not found', async () => {
    mockMarkDeviceAsTrusted.mockRejectedValue(new Error('Fingerprint fp-xyz not found'))

    const request = createRequest(
      { uid: 'user-123', token: {} as never },
      { fingerprintId: 'fp-xyz' }
    )

    await expect(addTrustedDeviceCallable.run(request)).rejects.toThrow(
      'Device fingerprint not found'
    )
  })

  it('throws internal error on other failures', async () => {
    mockMarkDeviceAsTrusted.mockRejectedValue(new Error('Database error'))

    const request = createRequest(
      { uid: 'user-123', token: {} as never },
      { fingerprintId: 'fp-abc' }
    )

    await expect(addTrustedDeviceCallable.run(request)).rejects.toThrow(
      'Failed to add trusted device'
    )
  })
})

describe('removeTrustedDeviceCallable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRemoveTrustedDevice.mockReset()
  })

  const createRequest = (auth: AuthData | undefined, data: unknown): CallableRequest<unknown> => ({
    auth,
    data,
    rawRequest: {} as never,
    acceptsStreaming: false,
  })

  it('rejects unauthenticated requests', async () => {
    const request = createRequest(undefined, { fingerprintId: 'fp-123' })

    await expect(removeTrustedDeviceCallable.run(request)).rejects.toThrow('Must be logged in')
  })

  it('rejects invalid input', async () => {
    const request = createRequest({ uid: 'user-123', token: {} as never }, {})

    await expect(removeTrustedDeviceCallable.run(request)).rejects.toThrow('Invalid input')
  })

  it('removes device from trusted list', async () => {
    mockRemoveTrustedDevice.mockResolvedValue(undefined)

    const request = createRequest(
      { uid: 'user-123', token: {} as never },
      { fingerprintId: 'fp-abc' }
    )

    const result = await removeTrustedDeviceCallable.run(request)

    expect(result.success).toBe(true)
    expect(mockRemoveTrustedDevice).toHaveBeenCalledWith('user-123', 'fp-abc')
  })

  it('throws internal error on failure', async () => {
    mockRemoveTrustedDevice.mockRejectedValue(new Error('Database error'))

    const request = createRequest(
      { uid: 'user-123', token: {} as never },
      { fingerprintId: 'fp-abc' }
    )

    await expect(removeTrustedDeviceCallable.run(request)).rejects.toThrow(
      'Failed to remove trusted device'
    )
  })
})
