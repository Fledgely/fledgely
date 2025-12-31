/**
 * Unit tests for Data View Audit schema.
 *
 * Story 3A.1: Data Symmetry Enforcement - AC3
 */

import { describe, it, expect } from 'vitest'
import { dataViewAuditSchema, dataViewTypeSchema } from './index'

describe('dataViewTypeSchema', () => {
  it('accepts valid data view types', () => {
    const validTypes = [
      'children_list',
      'child_profile',
      'screenshots',
      'activity',
      'agreements',
      'flags',
      'devices',
      'device_detail',
      'child_own_screenshot',
      'caregiver_status', // Story 19D.3: Caregiver viewing child's screen time status
      'caregiver_revoked', // Story 19D.5: Parent revoked caregiver access
    ]

    validTypes.forEach((type) => {
      const result = dataViewTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid data view types', () => {
    const result = dataViewTypeSchema.safeParse('invalid_type')
    expect(result.success).toBe(false)
  })
})

describe('dataViewAuditSchema', () => {
  it('validates a complete audit log entry', () => {
    const validEntry = {
      id: 'audit-123',
      viewerUid: 'guardian-uid',
      childId: 'child-uid',
      familyId: 'family-uid',
      dataType: 'children_list',
      viewedAt: new Date(),
      sessionId: 'session-123',
    }

    const result = dataViewAuditSchema.safeParse(validEntry)
    expect(result.success).toBe(true)
  })

  it('validates entry with null childId (family-level view)', () => {
    const validEntry = {
      id: 'audit-123',
      viewerUid: 'guardian-uid',
      childId: null,
      familyId: 'family-uid',
      dataType: 'children_list',
      viewedAt: new Date(),
      sessionId: null,
    }

    const result = dataViewAuditSchema.safeParse(validEntry)
    expect(result.success).toBe(true)
  })

  it('validates entry with null sessionId', () => {
    const validEntry = {
      id: 'audit-123',
      viewerUid: 'guardian-uid',
      childId: 'child-uid',
      familyId: 'family-uid',
      dataType: 'child_profile',
      viewedAt: new Date(),
      sessionId: null,
    }

    const result = dataViewAuditSchema.safeParse(validEntry)
    expect(result.success).toBe(true)
  })

  it('rejects entry with missing required fields', () => {
    const invalidEntry = {
      id: 'audit-123',
      viewerUid: 'guardian-uid',
      // missing other required fields
    }

    const result = dataViewAuditSchema.safeParse(invalidEntry)
    expect(result.success).toBe(false)
  })

  it('rejects entry with invalid dataType', () => {
    const invalidEntry = {
      id: 'audit-123',
      viewerUid: 'guardian-uid',
      childId: 'child-uid',
      familyId: 'family-uid',
      dataType: 'invalid_type',
      viewedAt: new Date(),
      sessionId: null,
    }

    const result = dataViewAuditSchema.safeParse(invalidEntry)
    expect(result.success).toBe(false)
  })

  it('validates all valid dataType values', () => {
    const dataTypes = [
      'children_list',
      'child_profile',
      'screenshots',
      'activity',
      'agreements',
      'flags',
      'devices',
      'device_detail',
      'child_own_screenshot',
      'caregiver_status', // Story 19D.3: Caregiver viewing child's screen time status
      'caregiver_revoked', // Story 19D.5: Parent revoked caregiver access
    ]

    dataTypes.forEach((dataType) => {
      const entry = {
        id: 'audit-123',
        viewerUid: 'guardian-uid',
        childId: 'child-uid',
        familyId: 'family-uid',
        dataType,
        viewedAt: new Date(),
        sessionId: null,
      }

      const result = dataViewAuditSchema.safeParse(entry)
      expect(result.success).toBe(true)
    })
  })
})
