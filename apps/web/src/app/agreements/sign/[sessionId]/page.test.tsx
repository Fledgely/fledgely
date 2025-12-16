import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SigningEntryPage from './page'

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useParams: () => ({ sessionId: 'test-session-123' }),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}))

// Mock auth context
const mockUser = { uid: 'user-123', email: 'parent@example.com' }
const mockUseAuthContext = vi.fn()
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: () => mockUseAuthContext(),
}))

// Mock useFamily hook
const mockUseFamily = vi.fn()
vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => mockUseFamily(),
}))

// Mock useCoCreationSession hook
const mockUseCoCreationSession = vi.fn()
vi.mock('@/hooks/useCoCreationSession', () => ({
  useCoCreationSession: () => mockUseCoCreationSession(),
}))

// Mock useSigningOrder hook
const mockUseSigningOrder = vi.fn()
vi.mock('@/hooks/useSigningOrder', () => ({
  useSigningOrder: () => mockUseSigningOrder(),
}))

describe('SigningEntryPage', () => {
  const defaultSession = {
    id: 'test-session-123',
    childId: 'child-123',
    status: 'completed',
    terms: [
      { id: 'term-1', type: 'screenTime', content: { title: 'Screen Time' } },
    ],
  }

  const defaultFamily = {
    id: 'family-123',
    children: [{ id: 'child-123', name: 'Alex' }],
    custodyType: 'sole',
    guardians: [{ userId: 'user-123', role: 'guardian' }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthContext.mockReturnValue({
      user: mockUser,
      loading: false,
    })
    mockUseFamily.mockReturnValue({
      family: defaultFamily,
      loading: false,
      hasFamily: true,
    })
    mockUseCoCreationSession.mockReturnValue({
      session: defaultSession,
      loading: false,
      error: null,
    })
  })

  describe('Route Decision (AC: 1)', () => {
    it('redirects parent to parent signing when canParentSign is true', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: true,
        canChildSign: false,
        signingStatus: 'pending',
        loading: false,
        error: null,
      })

      render(<SigningEntryPage />)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/agreements/sign/parent/test-session-123')
      })
    })

    it('redirects child to child signing when canChildSign is true', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: false,
        canChildSign: true,
        signingStatus: 'parent_signed',
        loading: false,
        error: null,
      })

      render(<SigningEntryPage />)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/agreements/sign/child/test-session-123')
      })
    })

    it('shows signing options when user could be either role', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: true,
        canChildSign: false,
        signingStatus: 'pending',
        loading: false,
        error: null,
      })

      render(<SigningEntryPage />)

      // Should show options or redirect to parent signing
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalled()
      })
    })
  })

  describe('Completed Agreement (AC: 5)', () => {
    it('shows completion message when agreement is fully signed', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: false,
        canChildSign: false,
        signingStatus: 'complete',
        isComplete: true,
        loading: false,
        error: null,
      })

      render(<SigningEntryPage />)

      await waitFor(() => {
        expect(screen.getByText(/agreement complete/i)).toBeInTheDocument()
      })
    })

    it('shows link to view agreement when complete', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: false,
        canChildSign: false,
        signingStatus: 'complete',
        isComplete: true,
        loading: false,
        error: null,
      })

      render(<SigningEntryPage />)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      })
    })
  })

  describe('Shared Custody (AC: 4)', () => {
    it('shows waiting message when one parent has signed in shared custody', async () => {
      mockUseFamily.mockReturnValue({
        family: { ...defaultFamily, custodyType: 'shared' },
        loading: false,
        hasFamily: true,
      })
      mockUseSigningOrder.mockReturnValue({
        canParentSign: false,
        canChildSign: false,
        signingStatus: 'one_parent_signed',
        waitingMessage: 'Waiting for the other parent to sign.',
        loading: false,
        error: null,
      })

      render(<SigningEntryPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /waiting for signatures/i })).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading while checking signing status', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: false,
        canChildSign: false,
        signingStatus: null,
        loading: true,
        error: null,
      })

      render(<SigningEntryPage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('shows error when session not found', async () => {
      mockUseCoCreationSession.mockReturnValue({
        session: null,
        loading: false,
        error: new Error('Session not found'),
      })
      mockUseSigningOrder.mockReturnValue({
        canParentSign: false,
        canChildSign: false,
        signingStatus: null,
        loading: false,
        error: null,
      })

      render(<SigningEntryPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /session not found/i })).toBeInTheDocument()
      })
    })

    it('shows error when signing status check fails', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: false,
        canChildSign: false,
        signingStatus: null,
        loading: false,
        error: new Error('Failed to check signing status'),
      })

      render(<SigningEntryPage />)

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('provides link back to dashboard', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: false,
        canChildSign: false,
        signingStatus: 'complete',
        isComplete: true,
        loading: false,
        error: null,
      })

      render(<SigningEntryPage />)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
      })
    })
  })
})
