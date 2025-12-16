import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChildSigningPage from './page'

// Mock next/navigation
const mockPush = vi.fn()
const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
  useParams: () => ({ sessionId: 'test-session-123' }),
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}))

// Mock auth context
const mockUser = { uid: 'user-123', email: 'parent@example.com' }
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: () => ({
    user: mockUser,
    loading: false,
  }),
}))

// Mock useFamily hook
vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({
    family: {
      id: 'family-123',
      children: [{ id: 'child-123', name: 'Alex' }],
    },
    loading: false,
    hasFamily: true,
  }),
}))

// Mock useCoCreationSession hook
const mockSession = {
  id: 'test-session-123',
  childId: 'child-123',
  terms: [
    { id: 'term-1', type: 'screenTime', content: { title: 'Screen Time Rule' } },
    { id: 'term-2', type: 'responsibility', content: { title: 'Homework First' } },
  ],
  status: 'completed',
}
vi.mock('@/hooks/useCoCreationSession', () => ({
  useCoCreationSession: () => ({
    session: mockSession,
    loading: false,
    error: null,
  }),
}))

// Mock useSigningOrder hook
const mockUseSigningOrder = vi.fn()
vi.mock('@/hooks/useSigningOrder', () => ({
  useSigningOrder: () => mockUseSigningOrder(),
}))

// Mock signatureService
const mockRecordChildSignature = vi.fn()
vi.mock('@/services/signatureService', () => ({
  recordChildSignature: (...args: unknown[]) => mockRecordChildSignature(...args),
}))

// Mock signing components
vi.mock('@/components/co-creation/signing', () => ({
  ChildSigningCeremony: ({ childName, onComplete, onBack }: {
    childName: string
    onComplete: (sig: unknown) => void
    onBack: () => void
  }) => (
    <div data-testid="signing-ceremony">
      <span>Signing ceremony for {childName}</span>
      <button onClick={() => onComplete({ agreementId: 'test', signature: {} })}>
        Complete Signing
      </button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
  SigningCelebration: ({ childName, onContinue }: {
    childName: string
    onContinue: () => void
  }) => (
    <div data-testid="signing-celebration">
      <span>Congratulations {childName}!</span>
      <button onClick={onContinue}>Continue</button>
    </div>
  ),
}))

describe('ChildSigningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRecordChildSignature.mockResolvedValue(undefined)
  })

  describe('Waiting for Parent (AC #7)', () => {
    it('shows waiting message when parent has not signed', async () => {
      mockUseSigningOrder.mockReturnValue({
        canChildSign: false,
        waitingMessage: "Your parent needs to sign first. This shows you that they're making the same promise you are!",
        loading: false,
        error: null,
      })

      render(<ChildSigningPage />)

      await waitFor(() => {
        expect(screen.getByText(/almost time to sign/i)).toBeInTheDocument()
      })
      expect(screen.getByText(/parent needs to sign first/i)).toBeInTheDocument()
    })

    it('shows explanation for parent-first signing order', async () => {
      mockUseSigningOrder.mockReturnValue({
        canChildSign: false,
        waitingMessage: "Your parent needs to sign first.",
        loading: false,
        error: null,
      })

      render(<ChildSigningPage />)

      await waitFor(() => {
        expect(screen.getByText(/parent signs first/i)).toBeInTheDocument()
      })
    })
  })

  describe('Signing Ceremony (AC #1-6)', () => {
    it('displays signing ceremony when child can sign', async () => {
      mockUseSigningOrder.mockReturnValue({
        canChildSign: true,
        waitingMessage: null,
        loading: false,
        error: null,
      })

      render(<ChildSigningPage />)

      await waitFor(() => {
        expect(screen.getByTestId('signing-ceremony')).toBeInTheDocument()
      })
    })

    it('passes child name to signing ceremony', async () => {
      mockUseSigningOrder.mockReturnValue({
        canChildSign: true,
        waitingMessage: null,
        loading: false,
        error: null,
      })

      render(<ChildSigningPage />)

      await waitFor(() => {
        expect(screen.getByText(/signing ceremony for Alex/i)).toBeInTheDocument()
      })
    })

    it('records signature when signing is completed', async () => {
      mockUseSigningOrder.mockReturnValue({
        canChildSign: true,
        waitingMessage: null,
        loading: false,
        error: null,
      })

      const user = userEvent.setup()
      render(<ChildSigningPage />)

      await waitFor(() => {
        expect(screen.getByTestId('signing-ceremony')).toBeInTheDocument()
      })

      const completeButton = screen.getByRole('button', { name: /complete signing/i })
      await user.click(completeButton)

      expect(mockRecordChildSignature).toHaveBeenCalledWith({
        familyId: 'family-123',
        agreementId: 'test-session-123',
        signature: expect.any(Object),
      })
    })
  })

  describe('Celebration (AC #6)', () => {
    it('shows celebration after successful signing', async () => {
      mockUseSigningOrder.mockReturnValue({
        canChildSign: true,
        waitingMessage: null,
        loading: false,
        error: null,
      })

      const user = userEvent.setup()
      render(<ChildSigningPage />)

      await waitFor(() => {
        expect(screen.getByTestId('signing-ceremony')).toBeInTheDocument()
      })

      const completeButton = screen.getByRole('button', { name: /complete signing/i })
      await user.click(completeButton)

      await waitFor(() => {
        expect(screen.getByTestId('signing-celebration')).toBeInTheDocument()
      })
    })

    it('navigates to dashboard after celebration', async () => {
      mockUseSigningOrder.mockReturnValue({
        canChildSign: true,
        waitingMessage: null,
        loading: false,
        error: null,
      })

      const user = userEvent.setup()
      render(<ChildSigningPage />)

      await waitFor(() => {
        expect(screen.getByTestId('signing-ceremony')).toBeInTheDocument()
      })

      // Complete signing
      const completeButton = screen.getByRole('button', { name: /complete signing/i })
      await user.click(completeButton)

      await waitFor(() => {
        expect(screen.getByTestId('signing-celebration')).toBeInTheDocument()
      })

      // Click continue
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('Error Handling', () => {
    it('shows error when signing fails', async () => {
      mockUseSigningOrder.mockReturnValue({
        canChildSign: true,
        waitingMessage: null,
        loading: false,
        error: null,
      })
      mockRecordChildSignature.mockRejectedValue(new Error('Signing failed'))

      const user = userEvent.setup()
      render(<ChildSigningPage />)

      await waitFor(() => {
        expect(screen.getByTestId('signing-ceremony')).toBeInTheDocument()
      })

      const completeButton = screen.getByRole('button', { name: /complete signing/i })
      await user.click(completeButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/signing failed/i)
      })
    })

    it('shows error when session not found', async () => {
      mockUseSigningOrder.mockReturnValue({
        canChildSign: false,
        waitingMessage: null,
        loading: false,
        error: new Error('Session not found'),
      })

      render(<ChildSigningPage />)

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading indicator while checking signing order', async () => {
      mockUseSigningOrder.mockReturnValue({
        canChildSign: false,
        waitingMessage: null,
        loading: true,
        error: null,
      })

      render(<ChildSigningPage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('allows going back from waiting state', async () => {
      mockUseSigningOrder.mockReturnValue({
        canChildSign: false,
        waitingMessage: "Waiting for parent",
        loading: false,
        error: null,
      })

      const user = userEvent.setup()
      render(<ChildSigningPage />)

      await waitFor(() => {
        expect(screen.getByText(/almost time to sign/i)).toBeInTheDocument()
      })

      const backButton = screen.getByRole('button', { name: /go back/i })
      await user.click(backButton)

      expect(mockBack).toHaveBeenCalled()
    })
  })
})
