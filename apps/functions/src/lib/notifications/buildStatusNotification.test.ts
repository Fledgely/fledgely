/**
 * Tests for notification content builder
 *
 * Story 19A.4: Status Push Notifications (AC: #3)
 */

import { describe, it, expect } from 'vitest'
import { buildStatusNotification } from './buildStatusNotification'

describe('buildStatusNotification', () => {
  describe('Notification titles', () => {
    it('should use "Advisory" for good_to_attention', () => {
      const result = buildStatusNotification('good_to_attention', 'Emma')
      expect(result.title).toBe('Advisory')
    })

    it('should use "Action Needed" for good_to_action', () => {
      const result = buildStatusNotification('good_to_action', 'Emma')
      expect(result.title).toBe('Action Needed')
    })

    it('should use "Action Needed" for attention_to_action', () => {
      const result = buildStatusNotification('attention_to_action', 'Emma')
      expect(result.title).toBe('Action Needed')
    })

    it('should use "Resolved" for attention_to_good', () => {
      const result = buildStatusNotification('attention_to_good', 'Emma')
      expect(result.title).toBe('Resolved')
    })

    it('should use "Improving" for action_to_attention', () => {
      const result = buildStatusNotification('action_to_attention', 'Emma')
      expect(result.title).toBe('Improving')
    })

    it('should use "Resolved" for action_to_good', () => {
      const result = buildStatusNotification('action_to_good', 'Emma')
      expect(result.title).toBe('Resolved')
    })
  })

  describe('Notification body', () => {
    it('should include child name in body', () => {
      const result = buildStatusNotification('good_to_attention', 'Emma')
      expect(result.body).toContain('Emma')
    })

    it('should show sync warning for good_to_attention', () => {
      const result = buildStatusNotification('good_to_attention', 'Emma')
      expect(result.body).toContain("hasn't synced in 2 hours")
    })

    it('should show resolved message for action_to_good', () => {
      const result = buildStatusNotification('action_to_good', 'Emma')
      expect(result.body).toBe('Emma is back online')
    })

    it('should include custom issue description when provided', () => {
      const result = buildStatusNotification(
        'good_to_action',
        'Emma',
        undefined,
        'Battery critical (5%)'
      )
      expect(result.body).toContain('Battery critical (5%)')
    })

    it('should show default issue for action transitions', () => {
      const result = buildStatusNotification('good_to_action', 'Emma')
      expect(result.body).toContain('Monitoring stopped')
    })
  })

  describe('Notification data', () => {
    it('should include type as status_change', () => {
      const result = buildStatusNotification('good_to_attention', 'Emma')
      expect(result.data.type).toBe('status_change')
    })

    it('should include transition type', () => {
      const result = buildStatusNotification('good_to_attention', 'Emma')
      expect(result.data.transition).toBe('good_to_attention')
    })

    it('should include familyId when provided', () => {
      const result = buildStatusNotification(
        'good_to_attention',
        'Emma',
        undefined,
        undefined,
        'family-123'
      )
      expect(result.data.familyId).toBe('family-123')
    })

    it('should include childId when provided', () => {
      const result = buildStatusNotification(
        'good_to_attention',
        'Emma',
        undefined,
        undefined,
        undefined,
        'child-456'
      )
      expect(result.data.childId).toBe('child-456')
    })

    it('should include deviceName when provided', () => {
      const result = buildStatusNotification('good_to_attention', 'Emma', "Emma's Chromebook")
      expect(result.data.deviceName).toBe("Emma's Chromebook")
    })
  })
})
