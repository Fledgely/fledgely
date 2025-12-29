/**
 * ReauthModal Tests - Story 13.2 Task 2.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReauthModal } from './ReauthModal'
import { reauthenticateWithCredential, reauthenticateWithPopup } from 'firebase/auth'
import type { User as FirebaseUser } from 'firebase/auth'

// Mock firebase/auth
vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth')
  return {
    ...actual,
    reauthenticateWithCredential: vi.fn(),
    reauthenticateWithPopup: vi.fn(),
    EmailAuthProvider: {
      credential: vi.fn(() => 'mock-credential'),
    },
  }
})

// Mock firebase lib
vi.mock('../../lib/firebase', () => ({
  getGoogleProvider: vi.fn(() => ({ providerId: 'google.com' })),
}))

describe('ReauthModal - Story 13.2', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  const createMockUser = (providers: string[]): FirebaseUser =>
    ({
      email: 'test@example.com',
      providerData: providers.map((id) => ({ providerId: id })),
    }) as FirebaseUser

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const user = createMockUser(['password'])
      render(
        <ReauthModal user={user} isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render when isOpen is true', () => {
      const user = createMockUser(['password'])
      render(
        <ReauthModal user={user} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Confirm Your Identity')).toBeInTheDocument()
    })

    it('should show custom title and description', () => {
      const user = createMockUser(['password'])
      render(
        <ReauthModal
          user={user}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          title="Custom Title"
          description="Custom description text"
        />
      )

      expect(screen.getByText('Custom Title')).toBeInTheDocument()
      expect(screen.getByText('Custom description text')).toBeInTheDocument()
    })
  })

  describe('Password Provider', () => {
    it('should show password input for password users', () => {
      const user = createMockUser(['password'])
      render(
        <ReauthModal user={user} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByText('Confirm Password')).toBeInTheDocument()
    })

    it('should show error for empty password', async () => {
      const user = createMockUser(['password'])
      render(
        <ReauthModal user={user} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      fireEvent.click(screen.getByText('Confirm Password'))

      await waitFor(() => {
        expect(screen.getByText('Please enter your password')).toBeInTheDocument()
      })
    })

    it('should call reauthenticateWithCredential on password submit', async () => {
      const user = createMockUser(['password'])
      vi.mocked(reauthenticateWithCredential).mockResolvedValue({} as never)

      render(
        <ReauthModal user={user} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'testpassword' } })
      fireEvent.click(screen.getByText('Confirm Password'))

      await waitFor(() => {
        expect(reauthenticateWithCredential).toHaveBeenCalledWith(user, 'mock-credential')
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should show error for wrong password', async () => {
      const user = createMockUser(['password'])
      vi.mocked(reauthenticateWithCredential).mockRejectedValue({
        code: 'auth/wrong-password',
      })

      render(
        <ReauthModal user={user} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpassword' } })
      fireEvent.click(screen.getByText('Confirm Password'))

      await waitFor(() => {
        expect(screen.getByText('Incorrect password. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Google Provider', () => {
    it('should show Google button for Google users', () => {
      const user = createMockUser(['google.com'])
      render(
        <ReauthModal user={user} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByText('Continue with Google')).toBeInTheDocument()
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    })

    it('should call reauthenticateWithPopup on Google button click', async () => {
      const user = createMockUser(['google.com'])
      vi.mocked(reauthenticateWithPopup).mockResolvedValue({} as never)

      render(
        <ReauthModal user={user} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      fireEvent.click(screen.getByText('Continue with Google'))

      await waitFor(() => {
        expect(reauthenticateWithPopup).toHaveBeenCalled()
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should show error when popup is closed', async () => {
      const user = createMockUser(['google.com'])
      vi.mocked(reauthenticateWithPopup).mockRejectedValue({
        code: 'auth/popup-closed-by-user',
      })

      render(
        <ReauthModal user={user} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      fireEvent.click(screen.getByText('Continue with Google'))

      await waitFor(() => {
        expect(screen.getByText('Sign-in was cancelled. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Both Providers', () => {
    it('should show both password and Google options for users with both', () => {
      const user = createMockUser(['password', 'google.com'])
      render(
        <ReauthModal user={user} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByText('Continue with Google')).toBeInTheDocument()
      expect(screen.getByText('or')).toBeInTheDocument()
    })
  })

  describe('Modal Behavior', () => {
    it('should call onClose when Cancel is clicked', () => {
      const user = createMockUser(['password'])
      render(
        <ReauthModal user={user} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      fireEvent.click(screen.getByText('Cancel'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when clicking overlay', () => {
      const user = createMockUser(['password'])
      render(
        <ReauthModal user={user} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Click the overlay (the dialog wrapper)
      const dialog = screen.getByRole('dialog')
      fireEvent.click(dialog)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when Escape is pressed', () => {
      const user = createMockUser(['password'])
      render(
        <ReauthModal user={user} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
