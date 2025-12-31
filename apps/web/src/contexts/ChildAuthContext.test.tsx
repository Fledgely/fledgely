/**
 * ChildAuthContext Tests - Story 19B.1
 *
 * Task 1.7: Create unit tests for child auth flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ChildAuthProvider, useChildAuth, type ChildSession } from './ChildAuthContext'

const CHILD_SESSION_KEY = 'fledgely_child_session'

// Test component to access context
function TestComponent() {
  const { childSession, loading, isAuthenticated, signInAsChild, signOutChild, isSessionExpired } =
    useChildAuth()

  return (
    <div>
      <span data-testid="loading">{loading.toString()}</span>
      <span data-testid="authenticated">{isAuthenticated.toString()}</span>
      <span data-testid="session-expired">{isSessionExpired().toString()}</span>
      <span data-testid="child-name">{childSession?.childName || 'none'}</span>
      <span data-testid="child-id">{childSession?.childId || 'none'}</span>
      <span data-testid="family-id">{childSession?.familyId || 'none'}</span>
      <button onClick={() => signInAsChild('family-123', 'child-456', 'Alex')}>Sign In</button>
      <button onClick={() => signOutChild()}>Sign Out</button>
    </div>
  )
}

describe('ChildAuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('initial state', () => {
    it('should start with loading true and no session', async () => {
      render(
        <ChildAuthProvider>
          <TestComponent />
        </ChildAuthProvider>
      )

      // After initial render, loading should complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      expect(screen.getByTestId('loading').textContent).toBe('false')
      expect(screen.getByTestId('authenticated').textContent).toBe('false')
      expect(screen.getByTestId('child-name').textContent).toBe('none')
    })
  })

  describe('signInAsChild', () => {
    it('should create a new session when signing in', async () => {
      render(
        <ChildAuthProvider>
          <TestComponent />
        </ChildAuthProvider>
      )

      // Wait for initial load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      // Sign in
      await act(async () => {
        screen.getByText('Sign In').click()
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('true')
      expect(screen.getByTestId('child-name').textContent).toBe('Alex')
      expect(screen.getByTestId('child-id').textContent).toBe('child-456')
      expect(screen.getByTestId('family-id').textContent).toBe('family-123')
    })

    it('should store session in localStorage', async () => {
      render(
        <ChildAuthProvider>
          <TestComponent />
        </ChildAuthProvider>
      )

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      await act(async () => {
        screen.getByText('Sign In').click()
      })

      const storedData = localStorage.getItem(CHILD_SESSION_KEY)
      expect(storedData).not.toBeNull()
      const storedSession = JSON.parse(storedData!) as ChildSession
      expect(storedSession.childId).toBe('child-456')
      expect(storedSession.childName).toBe('Alex')
      expect(storedSession.familyId).toBe('family-123')
      expect(storedSession.permissions).toBe('child')
    })
  })

  describe('signOutChild', () => {
    it('should clear session when signing out', async () => {
      render(
        <ChildAuthProvider>
          <TestComponent />
        </ChildAuthProvider>
      )

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      // Sign in first
      await act(async () => {
        screen.getByText('Sign In').click()
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('true')

      // Sign out
      await act(async () => {
        screen.getByText('Sign Out').click()
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('false')
      expect(screen.getByTestId('child-name').textContent).toBe('none')
      expect(localStorage.getItem(CHILD_SESSION_KEY)).toBeNull()
    })
  })

  describe('session persistence', () => {
    it('should restore valid session from localStorage', async () => {
      // Set up a valid session in localStorage
      const validSession: ChildSession = {
        childId: 'child-789',
        childName: 'Jamie',
        familyId: 'family-abc',
        permissions: 'child',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
        createdAt: Date.now(),
      }
      localStorage.setItem(CHILD_SESSION_KEY, JSON.stringify(validSession))

      render(
        <ChildAuthProvider>
          <TestComponent />
        </ChildAuthProvider>
      )

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('true')
      expect(screen.getByTestId('child-name').textContent).toBe('Jamie')
      expect(screen.getByTestId('child-id').textContent).toBe('child-789')
    })

    it('should clear expired session from localStorage', async () => {
      // Set up an expired session
      const expiredSession: ChildSession = {
        childId: 'child-old',
        childName: 'Old',
        familyId: 'family-old',
        permissions: 'child',
        expiresAt: Date.now() - 1000, // Already expired
        createdAt: Date.now() - 25 * 60 * 60 * 1000,
      }
      localStorage.setItem(CHILD_SESSION_KEY, JSON.stringify(expiredSession))

      render(
        <ChildAuthProvider>
          <TestComponent />
        </ChildAuthProvider>
      )

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('false')
      expect(localStorage.getItem(CHILD_SESSION_KEY)).toBeNull()
    })
  })

  describe('isSessionExpired', () => {
    it('should return true when no session exists', async () => {
      render(
        <ChildAuthProvider>
          <TestComponent />
        </ChildAuthProvider>
      )

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      expect(screen.getByTestId('session-expired').textContent).toBe('true')
    })

    it('should return false for valid session', async () => {
      render(
        <ChildAuthProvider>
          <TestComponent />
        </ChildAuthProvider>
      )

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      await act(async () => {
        screen.getByText('Sign In').click()
      })

      expect(screen.getByTestId('session-expired').textContent).toBe('false')
    })
  })

  describe('useChildAuth outside provider', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useChildAuth must be used within a ChildAuthProvider')

      consoleSpy.mockRestore()
    })
  })
})
