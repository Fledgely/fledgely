import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ParentSigningPage from './page'

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
    { id: 'term-1', type: 'screenTime', content: { title: 'Screen Time Rule', childCommitment: 'I will limit screen time to 2 hours' } },
    { id: 'term-2', type: 'responsibility', content: { title: 'Homework First', childCommitment: 'I will do homework before games' } },
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
const mockRecordParentSignature = vi.fn()
vi.mock('@/services/signatureService', () => ({
  recordParentSignature: (...args: unknown[]) => mockRecordParentSignature(...args),
}))

// Mock signing components
vi.mock('@/components/co-creation/signing', () => ({
  ParentSigningCeremony: ({ parentName, onComplete, onBack }: {
    parentName: string
    onComplete: (sig: unknown) => void
    onBack: () => void
  }) => (
    <div data-testid="signing-ceremony">
      <span>Signing ceremony for {parentName}</span>
      <button onClick={() => onComplete({ agreementId: 'test', signature: {} })}>
        Complete Signing
      </button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
  ParentSigningComplete: ({ parentName, childName, onContinue }: {
    parentName: string
    childName: string
    onContinue: () => void
  }) => (
    <div data-testid="signing-complete">
      <span>Completed! {parentName}, now {childName} can sign</span>
      <button onClick={onContinue}>Continue</button>
    </div>
  ),
}))

describe('ParentSigningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRecordParentSignature.mockResolvedValue(undefined)
  })

  describe('Signing Eligibility (AC: 1)', () => {
    it('shows signing ceremony when parent can sign', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: true,
        canChildSign: false,
        waitingMessage: null,
        loading: false,
        error: null,
      })

      render(<ParentSigningPage />)

      await waitFor(() => {
        expect(screen.getByTestId('signing-ceremony')).toBeInTheDocument()
      })
    })

    it('shows already signed message when parent already signed', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: false,
        canChildSign: true,
        signingStatus: 'parent_signed',
        waitingMessage: 'You have already signed. Waiting for child.',
        loading: false,
        error: null,
      })

      render(<ParentSigningPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /already signed/i })).toBeInTheDocument()
        expect(screen.getByText(/waiting for child/i)).toBeInTheDocument()
      })
    })

    it('shows waiting for other parent message in shared custody', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: false,
        canChildSign: false,
        signingStatus: 'one_parent_signed',
        waitingMessage: 'Waiting for other parent.',
        loading: false,
        error: null,
      })

      render(<ParentSigningPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /already signed/i })).toBeInTheDocument()
        expect(screen.getByText(/waiting for the other parent/i)).toBeInTheDocument()
      })
    })
  })

  describe('Signing Flow (AC: 3, 5)', () => {
    it('records signature when signing is completed', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: true,
        canChildSign: false,
        waitingMessage: null,
        loading: false,
        error: null,
      })

      const user = userEvent.setup()
      render(<ParentSigningPage />)

      await waitFor(() => {
        expect(screen.getByTestId('signing-ceremony')).toBeInTheDocument()
      })

      const completeButton = screen.getByRole('button', { name: /complete signing/i })
      await user.click(completeButton)

      expect(mockRecordParentSignature).toHaveBeenCalledWith({
        familyId: 'family-123',
        agreementId: 'test-session-123',
        signature: expect.any(Object),
        isSharedCustody: false,
      })
    })

    it('shows completion screen after successful signing', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: true,
        canChildSign: false,
        waitingMessage: null,
        loading: false,
        error: null,
      })

      const user = userEvent.setup()
      render(<ParentSigningPage />)

      await waitFor(() => {
        expect(screen.getByTestId('signing-ceremony')).toBeInTheDocument()
      })

      const completeButton = screen.getByRole('button', { name: /complete signing/i })
      await user.click(completeButton)

      await waitFor(() => {
        expect(screen.getByTestId('signing-complete')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation (AC: 6)', () => {
    it('navigates to dashboard after completion continue', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: true,
        canChildSign: false,
        waitingMessage: null,
        loading: false,
        error: null,
      })

      const user = userEvent.setup()
      render(<ParentSigningPage />)

      await waitFor(() => {
        expect(screen.getByTestId('signing-ceremony')).toBeInTheDocument()
      })

      // Complete signing
      const completeButton = screen.getByRole('button', { name: /complete signing/i })
      await user.click(completeButton)

      await waitFor(() => {
        expect(screen.getByTestId('signing-complete')).toBeInTheDocument()
      })

      // Click continue
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('allows going back from signing ceremony', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: true,
        canChildSign: false,
        waitingMessage: null,
        loading: false,
        error: null,
      })

      const user = userEvent.setup()
      render(<ParentSigningPage />)

      await waitFor(() => {
        expect(screen.getByTestId('signing-ceremony')).toBeInTheDocument()
      })

      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      expect(mockBack).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('shows error when signing fails', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: true,
        canChildSign: false,
        waitingMessage: null,
        loading: false,
        error: null,
      })
      mockRecordParentSignature.mockRejectedValue(new Error('Signing failed'))

      const user = userEvent.setup()
      render(<ParentSigningPage />)

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
        canParentSign: false,
        canChildSign: false,
        waitingMessage: null,
        loading: false,
        error: new Error('Session not found'),
      })

      render(<ParentSigningPage />)

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading indicator while checking signing status', async () => {
      mockUseSigningOrder.mockReturnValue({
        canParentSign: false,
        canChildSign: false,
        waitingMessage: null,
        loading: true,
        error: null,
      })

      render(<ParentSigningPage />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })
})
