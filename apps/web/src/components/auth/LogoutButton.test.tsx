import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LogoutButton } from './LogoutButton'

// Mock next/navigation - stable reference to avoid infinite effect loop
const mockPush = vi.fn()
const mockRouter = { push: mockPush }
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

// Mock the auth context
const mockSignOut = vi.fn()
const mockAuthContext = {
  user: { uid: 'test-uid', email: 'test@example.com' },
  loading: false,
  error: null,
  signInWithGoogle: vi.fn(),
  signOut: mockSignOut,
  clearError: vi.fn(),
}

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: () => mockAuthContext,
}))

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockSignOut.mockResolvedValue(undefined)
    // Clear any cookies from previous tests
    document.cookie = '__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders with default state', () => {
      render(<LogoutButton />)

      const button = screen.getByRole('button', { name: /log out/i })
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })

    it('displays "Log out" text when not loading', () => {
      render(<LogoutButton />)

      expect(screen.getByText('Log out')).toBeInTheDocument()
    })

    it('displays loading state when logging out', async () => {
      // Create a promise that we can control
      let resolveSignOut: () => void
      mockSignOut.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSignOut = resolve
          })
      )

      render(<LogoutButton />)

      const button = screen.getByRole('button')

      await act(async () => {
        fireEvent.click(button)
      })

      // Check for loading state - use getAllByText since text may appear multiple times
      const loggingOutElements = screen.getAllByText('Logging out...')
      expect(loggingOutElements.length).toBeGreaterThanOrEqual(1)

      // Resolve to clean up
      await act(async () => {
        resolveSignOut!()
      })
    })

    it('button is disabled during logout process', async () => {
      let resolveSignOut: () => void
      mockSignOut.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSignOut = resolve
          })
      )

      render(<LogoutButton />)

      const button = screen.getByRole('button')

      await act(async () => {
        fireEvent.click(button)
      })

      expect(button).toBeDisabled()

      await act(async () => {
        resolveSignOut!()
      })
    })
  })

  describe('accessibility', () => {
    it('meets 44x44px minimum touch target', () => {
      render(<LogoutButton />)

      const button = screen.getByRole('button')
      expect(button.className).toContain('min-h-[44px]')
    })

    it('has correct aria-label when not loading', () => {
      render(<LogoutButton />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Log out of your account')
    })

    it('has correct aria-label when logging out', async () => {
      let resolveSignOut: () => void
      mockSignOut.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSignOut = resolve
          })
      )

      render(<LogoutButton />)

      const button = screen.getByRole('button')

      await act(async () => {
        fireEvent.click(button)
      })

      expect(button).toHaveAttribute('aria-label', 'Logging out, please wait')

      await act(async () => {
        resolveSignOut!()
      })
    })

    it('has aria-busy attribute when logging out', async () => {
      let resolveSignOut: () => void
      mockSignOut.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSignOut = resolve
          })
      )

      render(<LogoutButton />)

      const button = screen.getByRole('button')

      await act(async () => {
        fireEvent.click(button)
      })

      expect(button).toHaveAttribute('aria-busy', 'true')

      await act(async () => {
        resolveSignOut!()
      })
    })

    it('has visible focus indicator classes', () => {
      render(<LogoutButton />)

      const button = screen.getByRole('button')
      expect(button.className).toContain('focus-visible:ring')
    })

    it('contains screen reader status region', () => {
      render(<LogoutButton />)

      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toBeInTheDocument()
      expect(statusRegion).toHaveClass('sr-only')
    })

    it('announces logout to screen readers after successful logout', async () => {
      render(<LogoutButton />)

      const button = screen.getByRole('button')

      await act(async () => {
        fireEvent.click(button)
      })

      // Advance past signOut
      await act(async () => {
        await Promise.resolve()
      })

      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toHaveTextContent('You have been logged out')
    })

    it('announces loading state to screen readers', async () => {
      let resolveSignOut: () => void
      mockSignOut.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSignOut = resolve
          })
      )

      render(<LogoutButton />)

      const button = screen.getByRole('button')

      await act(async () => {
        fireEvent.click(button)
      })

      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toHaveTextContent('Logging out, please wait')

      await act(async () => {
        resolveSignOut!()
      })
    })

    it('is keyboard focusable', () => {
      render(<LogoutButton />)

      const button = screen.getByRole('button')
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('can be activated with Enter key', async () => {
      render(<LogoutButton />)

      const button = screen.getByRole('button')
      button.focus()

      // Native button behavior handles Enter key - verify button is interactive
      await act(async () => {
        fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
        fireEvent.keyUp(button, { key: 'Enter', code: 'Enter' })
      })

      // Button should be focusable and not disabled
      expect(button).not.toBeDisabled()
    })

    it('can be activated with Space key', async () => {
      render(<LogoutButton />)

      const button = screen.getByRole('button')
      button.focus()

      // Native button behavior handles Space key - verify button is interactive
      await act(async () => {
        fireEvent.keyDown(button, { key: ' ', code: 'Space' })
        fireEvent.keyUp(button, { key: ' ', code: 'Space' })
      })

      // Button should be focusable and not disabled
      expect(button).not.toBeDisabled()
    })
  })

  describe('interactions', () => {
    it('calls signOut when clicked', async () => {
      render(<LogoutButton />)

      const button = screen.getByRole('button')

      await act(async () => {
        fireEvent.click(button)
      })

      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })

    it('redirects to /login after successful logout with delay for screen reader', async () => {
      render(<LogoutButton />)

      const button = screen.getByRole('button')

      await act(async () => {
        fireEvent.click(button)
      })

      // Should not redirect immediately
      expect(mockPush).not.toHaveBeenCalled()

      // Advance timer past the 150ms delay
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('redirects to /login even if signOut fails (fail-safe)', async () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockSignOut.mockRejectedValue(new Error('Network error'))

      render(<LogoutButton />)

      const button = screen.getByRole('button')

      await act(async () => {
        fireEvent.click(button)
      })

      // Advance timer past the delay
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      expect(mockPush).toHaveBeenCalledWith('/login')

      expect(consoleError).toHaveBeenCalledWith(
        '[LogoutButton] signOut error:',
        expect.any(Error)
      )

      consoleError.mockRestore()
    })

    it('does not call signOut when already logging out', async () => {
      let resolveSignOut: () => void
      mockSignOut.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSignOut = resolve
          })
      )

      render(<LogoutButton />)

      const button = screen.getByRole('button')

      // Click twice rapidly
      await act(async () => {
        fireEvent.click(button)
      })

      // Second click should be ignored since status !== 'idle'
      await act(async () => {
        fireEvent.click(button)
      })

      expect(mockSignOut).toHaveBeenCalledTimes(1)

      await act(async () => {
        resolveSignOut!()
      })
    })

    it('clears session cookie before calling signOut (fail-safe)', async () => {
      // Set up a session cookie
      document.cookie = '__session=test-token; path=/; SameSite=Lax'
      expect(document.cookie).toContain('__session=test-token')

      render(<LogoutButton />)

      const button = screen.getByRole('button')

      await act(async () => {
        fireEvent.click(button)
      })

      // Cookie should be cleared immediately, even before signOut completes
      expect(document.cookie).not.toContain('__session=test-token')
    })

    it('clears session cookie even if signOut fails', async () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockSignOut.mockRejectedValue(new Error('Network error'))

      // Set up a session cookie
      document.cookie = '__session=test-token; path=/; SameSite=Lax'
      expect(document.cookie).toContain('__session=test-token')

      render(<LogoutButton />)

      const button = screen.getByRole('button')

      await act(async () => {
        fireEvent.click(button)
      })

      // Cookie should still be cleared even on error
      expect(document.cookie).not.toContain('__session=test-token')

      consoleError.mockRestore()
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      render(<LogoutButton className="custom-class" />)

      const button = screen.getByRole('button')
      expect(button.className).toContain('custom-class')
    })

    it('applies variant prop', () => {
      render(<LogoutButton variant="ghost" />)

      // The variant is passed to the Button component
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('has gap for icon and text spacing', () => {
      render(<LogoutButton />)

      const button = screen.getByRole('button')
      expect(button.className).toContain('gap-2')
    })
  })
})
