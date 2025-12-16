import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import {
  getDevicesForChild,
  unenrollDevicesForChild,
  DeviceServiceError,
} from './deviceService'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
  writeBatch: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

// Import mocked functions for test control
import { doc, getDocs, collection, writeBatch } from 'firebase/firestore'

describe('deviceService', () => {
  const mockUserId = 'test-user-123'
  const mockFamilyId = 'test-family-456'
  const mockChildId = 'test-child-789'

  const mockDeviceData = [
    {
      id: 'device-1',
      childId: mockChildId,
      familyId: mockFamilyId,
      deviceName: 'iPad Pro',
      deviceType: 'tablet',
      enrolledAt: { toDate: () => new Date('2024-01-15') },
      enrolledBy: mockUserId,
    },
    {
      id: 'device-2',
      childId: mockChildId,
      familyId: mockFamilyId,
      deviceName: 'iPhone 15',
      deviceType: 'phone',
      enrolledAt: { toDate: () => new Date('2024-02-20') },
      enrolledBy: mockUserId,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset console.error to prevent test output noise
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('getDevicesForChild', () => {
    it('returns devices for a child', async () => {
      ;(collection as Mock).mockReturnValue({})
      ;(getDocs as Mock).mockResolvedValue({
        docs: mockDeviceData.map((device) => ({
          id: device.id,
          data: () => device,
        })),
      })

      const result = await getDevicesForChild(mockChildId)

      expect(result).toHaveLength(2)
      expect(result[0].deviceName).toBe('iPad Pro')
      expect(result[1].deviceName).toBe('iPhone 15')
    })

    it('returns empty array when no devices exist', async () => {
      ;(collection as Mock).mockReturnValue({})
      ;(getDocs as Mock).mockResolvedValue({
        docs: [],
      })

      const result = await getDevicesForChild(mockChildId)

      expect(result).toHaveLength(0)
    })

    it('returns empty array when childId is empty', async () => {
      const result = await getDevicesForChild('')

      expect(result).toHaveLength(0)
    })

    it('handles device with missing optional fields', async () => {
      const deviceWithMissingFields = {
        id: 'device-3',
        childId: mockChildId,
        familyId: mockFamilyId,
        // deviceName missing
        // deviceType missing
        // enrolledAt missing
        enrolledBy: mockUserId,
      }

      ;(collection as Mock).mockReturnValue({})
      ;(getDocs as Mock).mockResolvedValue({
        docs: [
          {
            id: deviceWithMissingFields.id,
            data: () => deviceWithMissingFields,
          },
        ],
      })

      const result = await getDevicesForChild(mockChildId)

      expect(result).toHaveLength(1)
      expect(result[0].deviceName).toBe('Unknown Device')
      expect(result[0].deviceType).toBe('unknown')
    })

    it('throws error on firebase failure', async () => {
      ;(collection as Mock).mockReturnValue({})
      ;(getDocs as Mock).mockRejectedValue(new Error('Network error'))

      await expect(getDevicesForChild(mockChildId)).rejects.toThrow()
    })
  })

  describe('unenrollDevicesForChild', () => {
    it('unenrolls all devices for a child', async () => {
      const mockBatch = {
        delete: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      ;(collection as Mock).mockReturnValue({})
      ;(doc as Mock).mockReturnValue({ id: 'audit-123' })
      ;(getDocs as Mock).mockResolvedValue({
        docs: mockDeviceData.map((device) => ({
          id: device.id,
          data: () => device,
        })),
      })
      ;(writeBatch as Mock).mockReturnValue(mockBatch)

      const result = await unenrollDevicesForChild(mockChildId, mockFamilyId, mockUserId)

      expect(result.success).toBe(true)
      expect(result.devicesUnenrolled).toBe(2)
      expect(result.deviceNames).toContain('iPad Pro')
      expect(result.deviceNames).toContain('iPhone 15')
      expect(mockBatch.delete).toHaveBeenCalledTimes(2)
      expect(mockBatch.set).toHaveBeenCalledTimes(1) // Audit log
      expect(mockBatch.commit).toHaveBeenCalled()
    })

    it('returns success with zero devices when no devices exist', async () => {
      ;(collection as Mock).mockReturnValue({})
      ;(getDocs as Mock).mockResolvedValue({
        docs: [],
      })

      const result = await unenrollDevicesForChild(mockChildId, mockFamilyId, mockUserId)

      expect(result.success).toBe(true)
      expect(result.devicesUnenrolled).toBe(0)
      expect(result.deviceNames).toHaveLength(0)
    })

    it('throws error when childId is empty', async () => {
      await expect(
        unenrollDevicesForChild('', mockFamilyId, mockUserId)
      ).rejects.toThrow()
    })

    it('creates audit log entry with device information', async () => {
      const mockBatch = {
        delete: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      ;(collection as Mock).mockReturnValue({})
      ;(doc as Mock).mockReturnValue({ id: 'audit-123' })
      ;(getDocs as Mock).mockResolvedValue({
        docs: mockDeviceData.map((device) => ({
          id: device.id,
          data: () => device,
        })),
      })
      ;(writeBatch as Mock).mockReturnValue(mockBatch)

      await unenrollDevicesForChild(mockChildId, mockFamilyId, mockUserId)

      // Verify audit log was created with correct data
      expect(mockBatch.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'devices_unenrolled',
          entityId: mockChildId,
          entityType: 'child',
          performedBy: mockUserId,
          metadata: expect.objectContaining({
            devicesUnenrolled: 2,
            deviceNames: expect.arrayContaining(['iPad Pro', 'iPhone 15']),
            reason: 'child_removed',
          }),
        })
      )
    })

    it('handles batch commit failure', async () => {
      const mockBatch = {
        delete: vi.fn(),
        set: vi.fn(),
        commit: vi.fn().mockRejectedValue(new Error('Batch commit failed')),
      }

      ;(collection as Mock).mockReturnValue({})
      ;(doc as Mock).mockReturnValue({ id: 'audit-123' })
      ;(getDocs as Mock).mockResolvedValue({
        docs: mockDeviceData.map((device) => ({
          id: device.id,
          data: () => device,
        })),
      })
      ;(writeBatch as Mock).mockReturnValue(mockBatch)

      await expect(
        unenrollDevicesForChild(mockChildId, mockFamilyId, mockUserId)
      ).rejects.toThrow('Something went wrong')
    })
  })

  describe('DeviceServiceError', () => {
    it('creates error with code and message', () => {
      const error = new DeviceServiceError('test-code', 'Test message')

      expect(error.code).toBe('test-code')
      expect(error.message).toBe('Test message')
      expect(error.name).toBe('DeviceServiceError')
    })
  })
})
