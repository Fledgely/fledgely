/**
 * Tests for useAgreementUpgrade Hook
 *
 * Story 5.6: Agreement-Only Mode Selection - Task 6.6
 *
 * Tests for the upgrade logic hook that manages Agreement Only
 * to Full monitoring upgrades.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { CoCreationSession } from '@fledgely/contracts'
import { useAgreementUpgrade } from '../useAgreementUpgrade'

// ============================================
// TEST DATA
// ============================================

const createMockSession = (overrides?: Partial<CoCreationSession>): CoCreationSession => ({
  id: '550e8400-e29b-41d4-a716-446655440001',
  familyId: 'family-123',
  childId: 'child-123',
  status: 'active',
  agreementMode: 'agreement_only',
  terms: [],
  contributions: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  expiresAt: '2024-01-02T00:00:00Z',
  ...overrides,
})

describe('useAgreementUpgrade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('canUpgrade', () => {
    it('returns true for agreement_only active session', () => {
      const session = createMockSession({
        agreementMode: 'agreement_only',
        status: 'active',
      })

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session })
      )

      expect(result.current.canUpgrade).toBe(true)
    })

    it('returns false for full mode session', () => {
      const session = createMockSession({
        agreementMode: 'full',
        status: 'active',
      })

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session })
      )

      expect(result.current.canUpgrade).toBe(false)
    })

    it('returns false for abandoned session', () => {
      const session = createMockSession({
        agreementMode: 'agreement_only',
        status: 'abandoned',
      })

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session })
      )

      expect(result.current.canUpgrade).toBe(false)
    })

    it('returns false for completed session', () => {
      const session = createMockSession({
        agreementMode: 'agreement_only',
        status: 'completed',
      })

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session })
      )

      expect(result.current.canUpgrade).toBe(false)
    })

    it('returns false when no session provided', () => {
      const { result } = renderHook(() =>
        useAgreementUpgrade({ session: null })
      )

      expect(result.current.canUpgrade).toBe(false)
    })
  })

  describe('upgradeBlockedReason', () => {
    it('returns null when upgrade is possible', () => {
      const session = createMockSession({
        agreementMode: 'agreement_only',
        status: 'active',
      })

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session })
      )

      expect(result.current.upgradeBlockedReason).toBeNull()
    })

    it('returns reason when session is null', () => {
      const { result } = renderHook(() =>
        useAgreementUpgrade({ session: null })
      )

      expect(result.current.upgradeBlockedReason).toBe('No session available')
    })

    it('returns reason when already full mode', () => {
      const session = createMockSession({
        agreementMode: 'full',
        status: 'active',
      })

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session })
      )

      expect(result.current.upgradeBlockedReason).toBe('Session already has full monitoring enabled')
    })

    it('returns reason when session is abandoned', () => {
      const session = createMockSession({
        agreementMode: 'agreement_only',
        status: 'abandoned',
      })

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session })
      )

      expect(result.current.upgradeBlockedReason).toBe('Session has been abandoned and cannot be upgraded')
    })

    it('returns reason when session is completed', () => {
      const session = createMockSession({
        agreementMode: 'agreement_only',
        status: 'completed',
      })

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session })
      )

      expect(result.current.upgradeBlockedReason).toBe('Session is already completed')
    })
  })

  describe('upgrade function', () => {
    it('calls performUpgrade with session ID', async () => {
      const session = createMockSession()
      const performUpgrade = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session, performUpgrade })
      )

      await act(async () => {
        await result.current.upgrade()
      })

      expect(performUpgrade).toHaveBeenCalledWith(session.id)
    })

    it('sets isUpgrading to true during upgrade', async () => {
      const session = createMockSession()
      const performUpgrade = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      )

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session, performUpgrade })
      )

      expect(result.current.isUpgrading).toBe(false)

      act(() => {
        result.current.upgrade()
      })

      expect(result.current.isUpgrading).toBe(true)

      await waitFor(() => {
        expect(result.current.isUpgrading).toBe(false)
      })
    })

    it('calls onUpgradeComplete on success', async () => {
      const session = createMockSession()
      const performUpgrade = vi.fn().mockResolvedValue({ success: true })
      const onUpgradeComplete = vi.fn()

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session, performUpgrade, onUpgradeComplete })
      )

      await act(async () => {
        await result.current.upgrade()
      })

      expect(onUpgradeComplete).toHaveBeenCalledWith(session.id)
    })

    it('sets error on failure', async () => {
      const session = createMockSession()
      const performUpgrade = vi.fn().mockResolvedValue({
        success: false,
        error: 'Upgrade failed',
      })

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session, performUpgrade })
      )

      await act(async () => {
        await result.current.upgrade()
      })

      expect(result.current.error).toBe('Upgrade failed')
    })

    it('calls onUpgradeError on failure', async () => {
      const session = createMockSession()
      const performUpgrade = vi.fn().mockResolvedValue({
        success: false,
        error: 'Upgrade failed',
      })
      const onUpgradeError = vi.fn()

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session, performUpgrade, onUpgradeError })
      )

      await act(async () => {
        await result.current.upgrade()
      })

      expect(onUpgradeError).toHaveBeenCalledWith('Upgrade failed')
    })

    it('handles exception during upgrade', async () => {
      const session = createMockSession()
      const performUpgrade = vi.fn().mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session, performUpgrade })
      )

      await act(async () => {
        await result.current.upgrade()
      })

      expect(result.current.error).toBe('Network error')
    })

    it('does nothing when canUpgrade is false', async () => {
      const session = createMockSession({ agreementMode: 'full' })
      const performUpgrade = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session, performUpgrade })
      )

      await act(async () => {
        await result.current.upgrade()
      })

      expect(performUpgrade).not.toHaveBeenCalled()
    })

    it('does nothing when performUpgrade is not provided', async () => {
      const session = createMockSession()

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session })
      )

      // Should not throw
      await act(async () => {
        await result.current.upgrade()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('clearError', () => {
    it('clears the error state', async () => {
      const session = createMockSession()
      const performUpgrade = vi.fn().mockResolvedValue({
        success: false,
        error: 'Upgrade failed',
      })

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session, performUpgrade })
      )

      await act(async () => {
        await result.current.upgrade()
      })

      expect(result.current.error).toBe('Upgrade failed')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('initial state', () => {
    it('has correct initial state', () => {
      const session = createMockSession()

      const { result } = renderHook(() =>
        useAgreementUpgrade({ session })
      )

      expect(result.current.isUpgrading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })
})
