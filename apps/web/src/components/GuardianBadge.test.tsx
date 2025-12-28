/**
 * Unit tests for GuardianBadge component.
 *
 * Story 3.4: Equal Access Verification - AC7
 * Tests the co-managed indicator display with other guardian names.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import GuardianBadge from './GuardianBadge'
import type { FamilyGuardian } from '@fledgely/shared/contracts'

// Mock the user service
vi.mock('../services/userService', () => ({
  getUserProfile: vi.fn(),
}))

import { getUserProfile } from '../services/userService'

describe('GuardianBadge', () => {
  const mockCurrentUserUid = 'current-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('single guardian (no co-management)', () => {
    it('renders nothing when there is only one guardian', () => {
      const guardians: FamilyGuardian[] = [
        { uid: mockCurrentUserUid, role: 'guardian', addedAt: new Date() },
      ]

      const { container } = render(
        <GuardianBadge guardians={guardians} currentUserUid={mockCurrentUserUid} />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('invalid props handling', () => {
    it('renders nothing when guardians is empty array', () => {
      const { container } = render(
        <GuardianBadge guardians={[]} currentUserUid={mockCurrentUserUid} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when currentUserUid is empty string', () => {
      const guardians: FamilyGuardian[] = [
        { uid: 'user-1', role: 'guardian', addedAt: new Date() },
        { uid: 'user-2', role: 'guardian', addedAt: new Date() },
      ]

      const { container } = render(<GuardianBadge guardians={guardians} currentUserUid="" />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('two guardians (co-managed)', () => {
    it('displays co-managed with other guardian name', async () => {
      const guardians: FamilyGuardian[] = [
        { uid: mockCurrentUserUid, role: 'guardian', addedAt: new Date() },
        { uid: 'other-guardian-456', role: 'guardian', addedAt: new Date() },
      ]

      vi.mocked(getUserProfile).mockResolvedValueOnce({
        uid: 'other-guardian-456',
        email: 'other@example.com',
        displayName: 'Jane Smith',
        photoURL: null,
        familyId: 'family-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
      })

      render(<GuardianBadge guardians={guardians} currentUserUid={mockCurrentUserUid} />)

      await waitFor(() => {
        expect(screen.getByText(/Co-managed with Jane Smith/)).toBeInTheDocument()
      })
    })

    it('displays fallback when guardian name is not available', async () => {
      const guardians: FamilyGuardian[] = [
        { uid: mockCurrentUserUid, role: 'guardian', addedAt: new Date() },
        { uid: 'other-guardian-456', role: 'guardian', addedAt: new Date() },
      ]

      vi.mocked(getUserProfile).mockResolvedValueOnce({
        uid: 'other-guardian-456',
        email: 'other@example.com',
        displayName: null,
        photoURL: null,
        familyId: 'family-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
      })

      render(<GuardianBadge guardians={guardians} currentUserUid={mockCurrentUserUid} />)

      await waitFor(() => {
        expect(screen.getByText(/Co-managed with Co-parent/)).toBeInTheDocument()
      })
    })

    it('has accessible ARIA label', async () => {
      const guardians: FamilyGuardian[] = [
        { uid: mockCurrentUserUid, role: 'guardian', addedAt: new Date() },
        { uid: 'other-guardian-456', role: 'guardian', addedAt: new Date() },
      ]

      vi.mocked(getUserProfile).mockResolvedValueOnce({
        uid: 'other-guardian-456',
        email: 'other@example.com',
        displayName: 'Jane Smith',
        photoURL: null,
        familyId: 'family-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
      })

      render(<GuardianBadge guardians={guardians} currentUserUid={mockCurrentUserUid} />)

      await waitFor(() => {
        const badge = screen.getByRole('status')
        expect(badge).toHaveAttribute(
          'aria-label',
          expect.stringContaining('co-managed with Jane Smith')
        )
        expect(badge).toHaveAttribute('aria-label', expect.stringContaining('equal access'))
      })
    })

    it('displays guardian avatar when available', async () => {
      const guardians: FamilyGuardian[] = [
        { uid: mockCurrentUserUid, role: 'guardian', addedAt: new Date() },
        { uid: 'other-guardian-456', role: 'guardian', addedAt: new Date() },
      ]

      vi.mocked(getUserProfile).mockResolvedValueOnce({
        uid: 'other-guardian-456',
        email: 'other@example.com',
        displayName: 'Jane Smith',
        photoURL: 'https://example.com/avatar.jpg',
        familyId: 'family-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
      })

      render(<GuardianBadge guardians={guardians} currentUserUid={mockCurrentUserUid} />)

      await waitFor(() => {
        const avatar = screen.getByRole('img', { hidden: true })
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
      })
    })

    it('handles profile lookup failure gracefully', async () => {
      const guardians: FamilyGuardian[] = [
        { uid: mockCurrentUserUid, role: 'guardian', addedAt: new Date() },
        { uid: 'other-guardian-456', role: 'guardian', addedAt: new Date() },
      ]

      // Suppress console.error for this test since we're testing error handling
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(getUserProfile).mockRejectedValueOnce(new Error('Network error'))

      render(<GuardianBadge guardians={guardians} currentUserUid={mockCurrentUserUid} />)

      await waitFor(() => {
        // Should still display something even if profile lookup fails
        expect(screen.getByText(/Co-managed with Co-parent/)).toBeInTheDocument()
      })

      // Restore console.error
      consoleErrorSpy.mockRestore()
    })
  })

  describe('three or more guardians', () => {
    it('displays guardian count for 3+ guardians', async () => {
      const guardians: FamilyGuardian[] = [
        { uid: mockCurrentUserUid, role: 'guardian', addedAt: new Date() },
        { uid: 'guardian-2', role: 'guardian', addedAt: new Date() },
        { uid: 'guardian-3', role: 'guardian', addedAt: new Date() },
      ]

      vi.mocked(getUserProfile)
        .mockResolvedValueOnce({
          uid: 'guardian-2',
          email: 'g2@example.com',
          displayName: 'Guardian Two',
          photoURL: null,
          familyId: 'family-123',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          lastActivityAt: new Date(),
        })
        .mockResolvedValueOnce({
          uid: 'guardian-3',
          email: 'g3@example.com',
          displayName: 'Guardian Three',
          photoURL: null,
          familyId: 'family-123',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          lastActivityAt: new Date(),
        })

      render(<GuardianBadge guardians={guardians} currentUserUid={mockCurrentUserUid} />)

      await waitFor(() => {
        expect(screen.getByText(/Co-managed \(3 guardians\)/)).toBeInTheDocument()
      })
    })
  })

  describe('loading state', () => {
    it('shows loading badge while fetching guardian info', () => {
      const guardians: FamilyGuardian[] = [
        { uid: mockCurrentUserUid, role: 'guardian', addedAt: new Date() },
        { uid: 'other-guardian-456', role: 'guardian', addedAt: new Date() },
      ]

      // Create a promise that never resolves to keep loading state
      vi.mocked(getUserProfile).mockImplementation(() => new Promise(() => {}))

      render(<GuardianBadge guardians={guardians} currentUserUid={mockCurrentUserUid} />)

      expect(screen.getByText('Co-managed')).toBeInTheDocument()
    })
  })
})
