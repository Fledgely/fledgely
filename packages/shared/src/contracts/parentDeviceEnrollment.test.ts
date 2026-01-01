/**
 * Tests for Parent Device Enrollment schemas
 * Story 32.2: Parent Device Enrollment for Offline Time
 */

import { describe, it, expect } from 'vitest'
import {
  parentDeviceTypeSchema,
  parentEnrolledDeviceSchema,
  parentDeviceEnrollmentSchema,
  PARENT_DEVICE_TYPE_LABELS,
  PARENT_ENROLLMENT_MESSAGES,
  type ParentEnrolledDevice,
  type ParentDeviceEnrollment,
} from './index'

describe('parentDeviceTypeSchema', () => {
  it('accepts valid device type values', () => {
    expect(parentDeviceTypeSchema.parse('phone')).toBe('phone')
    expect(parentDeviceTypeSchema.parse('tablet')).toBe('tablet')
    expect(parentDeviceTypeSchema.parse('laptop')).toBe('laptop')
    expect(parentDeviceTypeSchema.parse('desktop')).toBe('desktop')
    expect(parentDeviceTypeSchema.parse('other')).toBe('other')
  })

  it('rejects invalid device type values', () => {
    expect(() => parentDeviceTypeSchema.parse('invalid')).toThrow()
    expect(() => parentDeviceTypeSchema.parse('')).toThrow()
    expect(() => parentDeviceTypeSchema.parse(123)).toThrow()
    expect(() => parentDeviceTypeSchema.parse('smartwatch')).toThrow()
  })
})

describe('parentEnrolledDeviceSchema', () => {
  const validDevice: ParentEnrolledDevice = {
    deviceId: 'device-uuid-123',
    parentUid: 'parent-uid-456',
    deviceName: "Mom's iPhone",
    deviceType: 'phone',
    enrolledAt: Date.now(),
    active: true,
  }

  it('validates complete enrolled device', () => {
    expect(() => parentEnrolledDeviceSchema.parse(validDevice)).not.toThrow()
  })

  it('accepts all valid device types', () => {
    const deviceTypes = ['phone', 'tablet', 'laptop', 'desktop', 'other'] as const
    deviceTypes.forEach((type) => {
      const device = { ...validDevice, deviceType: type }
      expect(() => parentEnrolledDeviceSchema.parse(device)).not.toThrow()
    })
  })

  it('requires deviceId', () => {
    const { deviceId: _deviceId, ...withoutDeviceId } = validDevice
    expect(() => parentEnrolledDeviceSchema.parse(withoutDeviceId)).toThrow()
  })

  it('requires parentUid', () => {
    const { parentUid: _parentUid, ...withoutParentUid } = validDevice
    expect(() => parentEnrolledDeviceSchema.parse(withoutParentUid)).toThrow()
  })

  it('requires deviceName', () => {
    const { deviceName: _deviceName, ...withoutDeviceName } = validDevice
    expect(() => parentEnrolledDeviceSchema.parse(withoutDeviceName)).toThrow()
  })

  it('requires deviceType', () => {
    const { deviceType: _deviceType, ...withoutDeviceType } = validDevice
    expect(() => parentEnrolledDeviceSchema.parse(withoutDeviceType)).toThrow()
  })

  it('requires enrolledAt', () => {
    const { enrolledAt: _enrolledAt, ...withoutEnrolledAt } = validDevice
    expect(() => parentEnrolledDeviceSchema.parse(withoutEnrolledAt)).toThrow()
  })

  it('defaults active to true when not provided', () => {
    const { active: _active, ...withoutActive } = validDevice
    const parsed = parentEnrolledDeviceSchema.parse(withoutActive)
    expect(parsed.active).toBe(true)
  })

  it('accepts active as false', () => {
    const inactiveDevice = { ...validDevice, active: false }
    const parsed = parentEnrolledDeviceSchema.parse(inactiveDevice)
    expect(parsed.active).toBe(false)
  })
})

describe('parentDeviceEnrollmentSchema', () => {
  const validEnrollment: ParentDeviceEnrollment = {
    familyId: 'family-123',
    devices: [
      {
        deviceId: 'device-1',
        parentUid: 'parent-1',
        deviceName: "Mom's iPhone",
        deviceType: 'phone',
        enrolledAt: Date.now(),
        active: true,
      },
      {
        deviceId: 'device-2',
        parentUid: 'parent-2',
        deviceName: "Dad's iPad",
        deviceType: 'tablet',
        enrolledAt: Date.now(),
        active: true,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  it('validates complete enrollment with multiple devices', () => {
    expect(() => parentDeviceEnrollmentSchema.parse(validEnrollment)).not.toThrow()
  })

  it('allows enrollment with empty devices array', () => {
    const emptyEnrollment = {
      familyId: 'family-123',
      devices: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const parsed = parentDeviceEnrollmentSchema.parse(emptyEnrollment)
    expect(parsed.devices).toHaveLength(0)
  })

  it('defaults devices to empty array when not provided', () => {
    const withoutDevices = {
      familyId: 'family-123',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const parsed = parentDeviceEnrollmentSchema.parse(withoutDevices)
    expect(parsed.devices).toEqual([])
  })

  it('requires familyId', () => {
    const { familyId: _familyId, ...withoutFamilyId } = validEnrollment
    expect(() => parentDeviceEnrollmentSchema.parse(withoutFamilyId)).toThrow()
  })

  it('requires createdAt', () => {
    const { createdAt: _createdAt, ...withoutCreatedAt } = validEnrollment
    expect(() => parentDeviceEnrollmentSchema.parse(withoutCreatedAt)).toThrow()
  })

  it('requires updatedAt', () => {
    const { updatedAt: _updatedAt, ...withoutUpdatedAt } = validEnrollment
    expect(() => parentDeviceEnrollmentSchema.parse(withoutUpdatedAt)).toThrow()
  })

  it('validates nested device schemas', () => {
    const enrollmentWithInvalidDevice = {
      ...validEnrollment,
      devices: [
        {
          deviceId: 'device-1',
          parentUid: 'parent-1',
          deviceName: "Mom's iPhone",
          deviceType: 'invalid_type', // Invalid
          enrolledAt: Date.now(),
          active: true,
        },
      ],
    }
    expect(() => parentDeviceEnrollmentSchema.parse(enrollmentWithInvalidDevice)).toThrow()
  })
})

describe('PARENT_DEVICE_TYPE_LABELS', () => {
  it('has labels for all device types', () => {
    expect(PARENT_DEVICE_TYPE_LABELS.phone).toBe('Phone')
    expect(PARENT_DEVICE_TYPE_LABELS.tablet).toBe('Tablet')
    expect(PARENT_DEVICE_TYPE_LABELS.laptop).toBe('Laptop')
    expect(PARENT_DEVICE_TYPE_LABELS.desktop).toBe('Desktop')
    expect(PARENT_DEVICE_TYPE_LABELS.other).toBe('Other')
  })
})

describe('PARENT_ENROLLMENT_MESSAGES', () => {
  it('has header and description', () => {
    expect(PARENT_ENROLLMENT_MESSAGES.header).toBe('Enroll Your Devices')
    expect(PARENT_ENROLLMENT_MESSAGES.description).toContain('Lead by example')
  })

  it('generates non-shaming notEnrolledYet message', () => {
    const message = PARENT_ENROLLMENT_MESSAGES.notEnrolledYet('Dad')
    expect(message).toBe("Dad hasn't enrolled yet")
    expect(message).not.toContain('shame')
    expect(message).not.toContain('fail')
  })

  it('generates enrolled message', () => {
    const message = PARENT_ENROLLMENT_MESSAGES.enrolled('Mom')
    expect(message).toBe("Mom's device is enrolled")
  })

  it('has allEnrolled message', () => {
    expect(PARENT_ENROLLMENT_MESSAGES.allEnrolled).toContain('All parents')
  })
})
