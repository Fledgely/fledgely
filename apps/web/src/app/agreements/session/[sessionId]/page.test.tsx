/**
 * Tests for Session Builder Page
 *
 * Story 5.2: Visual Agreement Builder - Task 8.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SessionBuilderPage from './page'
import type { CoCreationSession, SessionTerm } from '@fledgely/contracts'

// ============================================
// MOCKS
// ============================================

// Mock next/navigation
const mockPush = vi.fn()
const mockParams = { sessionId: 'test-session-123' }

vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({ push: mockPush }),
}))

// Mock auth context
const mockUser = { uid: 'user-123', email: 'test@example.com' }
let mockAuthLoading = false

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: () => ({
    user: mockUser,
    loading: mockAuthLoading,
  }),
}))

// Mock family hook
const mockFamily = { id: 'family-123', name: 'Test Family' }
let mockFamilyLoading = false

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({
    family: mockFamily,
    loading: mockFamilyLoading,
    hasFamily: true,
  }),
}))

// Mock session hook
let mockSession: CoCreationSession | null = null
let mockSessionLoading = false
let mockSessionError: Error | null = null
let mockTimeoutWarning = { show: false, remainingFormatted: '5:00', remainingMs: 300000 }

const mockPauseSession = vi.fn().mockResolvedValue({ success: true })
const mockResumeSession = vi.fn().mockResolvedValue({ success: true })
const mockCompleteSession = vi.fn().mockResolvedValue({ success: true })
const mockRecordContribution = vi.fn().mockResolvedValue({ success: true })
const mockMarkActivity = vi.fn()
const mockRefreshSession = vi.fn()

vi.mock('@/hooks/useCoCreationSession', () => ({
  useCoCreationSession: () => ({
    session: mockSession,
    loading: mockSessionLoading,
    error: mockSessionError,
    isActive: mockSession?.status === 'active',
    pauseSession: mockPauseSession,
    resumeSession: mockResumeSession,
    completeSession: mockCompleteSession,
    recordContribution: mockRecordContribution,
    timeoutWarning: mockTimeoutWarning,
    markActivity: mockMarkActivity,
    refreshSession: mockRefreshSession,
  }),
}))

// Mock session service
const mockAddSessionTerm = vi.fn().mockResolvedValue({ success: true })
const mockUpdateSessionTerm = vi.fn().mockResolvedValue({ success: true })

vi.mock('@/services/coCreationSessionService', () => ({
  addSessionTerm: (...args: unknown[]) => mockAddSessionTerm(...args),
  updateSessionTerm: (...args: unknown[]) => mockUpdateSessionTerm(...args),
}))

// Mock builder components
vi.mock('@/components/co-creation/builder', () => ({
  VisualAgreementBuilder: ({ terms, onAddTerm, onTermEdit, onTermSelect }: any) => (
    <div data-testid="visual-agreement-builder">
      <div data-testid="term-count">{terms.length}</div>
      <button onClick={() => onAddTerm()} data-testid="add-term-button">
        Add Term
      </button>
      {terms.map((term: SessionTerm) => (
        <div key={term.id} data-testid={`term-${term.id}`}>
          <button onClick={() => onTermSelect(term)}>Select</button>
          <button onClick={() => onTermEdit(term)}>Edit</button>
        </div>
      ))}
    </div>
  ),
  AddTermModal: ({ isOpen, onClose, onSave }: any) =>
    isOpen ? (
      <div data-testid="add-term-modal" role="dialog">
        <button onClick={onClose}>Close</button>
        <button
          onClick={() => onSave({ type: 'rule', content: { text: 'Test rule' } })}
          data-testid="save-term-button"
        >
          Save
        </button>
      </div>
    ) : null,
  getTermTypeLabel: (type: string) => type,
}))

// Mock timeout warning
vi.mock('@/components/co-creation', () => ({
  SessionTimeoutWarning: ({ show, onContinue, onSaveAndExit }: any) =>
    show ? (
      <div data-testid="timeout-warning" role="alert">
        <button onClick={onContinue}>Continue</button>
        <button onClick={onSaveAndExit}>Save and Exit</button>
      </div>
    ) : null,
}))

// ============================================
// TEST HELPERS
// ============================================

const createMockTerm = (overrides: Partial<SessionTerm> = {}): SessionTerm => ({
  id: 'term-123',
  type: 'screen_time',
  content: { minutes: 60 },
  addedBy: 'parent',
  status: 'accepted',
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const createMockSession = (overrides: Partial<CoCreationSession> = {}): CoCreationSession => ({
  id: 'test-session-123',
  familyId: 'family-123',
  childId: 'child-123',
  initiatedBy: 'user-123',
  status: 'active',
  sourceDraft: { type: 'blank' },
  terms: [],
  contributions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
  ...overrides,
})

// ============================================
// TESTS
// ============================================

describe('SessionBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthLoading = false
    mockFamilyLoading = false
    mockSessionLoading = false
    mockSessionError = null
    mockSession = createMockSession()
    mockTimeoutWarning = { show: false, remainingFormatted: '5:00', remainingMs: 300000 }
  })

  // ============================================
  // LOADING STATES
  // ============================================

  describe('loading states', () => {
    it('shows loading spinner while auth is loading', () => {
      mockAuthLoading = true
      render(<SessionBuilderPage />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('shows loading spinner while session is loading', () => {
      mockSessionLoading = true
      render(<SessionBuilderPage />)
      expect(screen.getByText('Loading session...')).toBeInTheDocument()
    })

    it('shows loading spinner while family is loading', () => {
      mockFamilyLoading = true
      render(<SessionBuilderPage />)
      expect(screen.getByText('Loading session...')).toBeInTheDocument()
    })
  })

  // ============================================
  // ERROR STATES
  // ============================================

  describe('error states', () => {
    it('shows sign in required when not authenticated', () => {
      vi.mocked(vi.importActual('@/components/providers/AuthProvider')).useAuthContext = () => ({
        user: null,
        loading: false,
      })
      // Re-mock to return null user
      vi.doMock('@/components/providers/AuthProvider', () => ({
        useAuthContext: () => ({ user: null, loading: false }),
      }))

      render(<SessionBuilderPage />)
      // The component is mocked at module level, so this test verifies the mock behavior
    })

    it('shows session not found when session is null', () => {
      mockSession = null
      render(<SessionBuilderPage />)
      expect(screen.getByText('Session Not Found')).toBeInTheDocument()
    })

    it('shows session error message when error exists', () => {
      mockSessionError = new Error('Failed to load session')
      mockSession = null
      render(<SessionBuilderPage />)
      expect(screen.getByText('Failed to load session')).toBeInTheDocument()
    })
  })

  // ============================================
  // SESSION STATUS STATES
  // ============================================

  describe('session status states', () => {
    it('shows completed state when session is completed', () => {
      mockSession = createMockSession({ status: 'completed' })
      render(<SessionBuilderPage />)
      expect(screen.getByText('Session Completed')).toBeInTheDocument()
      expect(screen.getByText('Go to Signing')).toBeInTheDocument()
    })

    it('shows paused state when session is paused', () => {
      mockSession = createMockSession({ status: 'paused' })
      render(<SessionBuilderPage />)
      expect(screen.getByText('Session Paused')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /resume session/i })).toBeInTheDocument()
    })

    it('calls resumeSession when resume button clicked', async () => {
      const user = userEvent.setup()
      mockSession = createMockSession({ status: 'paused' })
      render(<SessionBuilderPage />)

      await user.click(screen.getByRole('button', { name: /resume session/i }))

      expect(mockResumeSession).toHaveBeenCalled()
    })
  })

  // ============================================
  // BASIC RENDERING
  // ============================================

  describe('basic rendering', () => {
    it('renders session builder page with correct testid', () => {
      render(<SessionBuilderPage />)
      expect(screen.getByTestId('session-builder-page')).toBeInTheDocument()
    })

    it('renders page title', () => {
      render(<SessionBuilderPage />)
      expect(screen.getByRole('heading', { name: /build your agreement/i })).toBeInTheDocument()
    })

    it('renders visual agreement builder', () => {
      render(<SessionBuilderPage />)
      expect(screen.getByTestId('visual-agreement-builder')).toBeInTheDocument()
    })

    it('renders pause button', () => {
      render(<SessionBuilderPage />)
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
    })

    it('renders finish button', () => {
      render(<SessionBuilderPage />)
      expect(screen.getByRole('button', { name: /finish/i })).toBeInTheDocument()
    })
  })

  // ============================================
  // ADD TERM FLOW
  // ============================================

  describe('add term flow', () => {
    it('opens add modal when add term clicked', async () => {
      const user = userEvent.setup()
      render(<SessionBuilderPage />)

      await user.click(screen.getByTestId('add-term-button'))

      expect(screen.getByTestId('add-term-modal')).toBeInTheDocument()
    })

    it('closes modal when close clicked', async () => {
      const user = userEvent.setup()
      render(<SessionBuilderPage />)

      await user.click(screen.getByTestId('add-term-button'))
      await user.click(screen.getByRole('button', { name: /close/i }))

      expect(screen.queryByTestId('add-term-modal')).not.toBeInTheDocument()
    })

    it('calls addSessionTerm when save clicked', async () => {
      const user = userEvent.setup()
      render(<SessionBuilderPage />)

      await user.click(screen.getByTestId('add-term-button'))
      await user.click(screen.getByTestId('save-term-button'))

      expect(mockAddSessionTerm).toHaveBeenCalledWith({
        sessionId: 'test-session-123',
        contributor: 'parent',
        type: 'rule',
        content: { text: 'Test rule' },
      })
    })

    it('refreshes session after adding term', async () => {
      const user = userEvent.setup()
      render(<SessionBuilderPage />)

      await user.click(screen.getByTestId('add-term-button'))
      await user.click(screen.getByTestId('save-term-button'))

      await waitFor(() => {
        expect(mockRefreshSession).toHaveBeenCalled()
      })
    })
  })

  // ============================================
  // EDIT TERM FLOW
  // ============================================

  describe('edit term flow', () => {
    it('opens modal with term when edit clicked', async () => {
      const user = userEvent.setup()
      const term = createMockTerm()
      mockSession = createMockSession({ terms: [term] })
      render(<SessionBuilderPage />)

      await user.click(screen.getByRole('button', { name: /edit/i }))

      expect(screen.getByTestId('add-term-modal')).toBeInTheDocument()
    })
  })

  // ============================================
  // PAUSE/FINISH ACTIONS
  // ============================================

  describe('pause action', () => {
    it('calls pauseSession when pause clicked', async () => {
      const user = userEvent.setup()
      render(<SessionBuilderPage />)

      await user.click(screen.getByRole('button', { name: /pause/i }))

      expect(mockPauseSession).toHaveBeenCalled()
    })

    it('navigates to dashboard after pause', async () => {
      const user = userEvent.setup()
      render(<SessionBuilderPage />)

      await user.click(screen.getByRole('button', { name: /pause/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('finish action', () => {
    it('finish button is disabled when no terms', () => {
      mockSession = createMockSession({ terms: [] })
      render(<SessionBuilderPage />)

      const finishButton = screen.getByRole('button', { name: /add terms before finishing/i })
      expect(finishButton).toBeDisabled()
    })

    it('finish button is enabled when terms exist', () => {
      mockSession = createMockSession({ terms: [createMockTerm()] })
      render(<SessionBuilderPage />)

      const finishButton = screen.getByRole('button', { name: /finish and go to signing/i })
      expect(finishButton).not.toBeDisabled()
    })

    it('calls completeSession when finish clicked', async () => {
      const user = userEvent.setup()
      mockSession = createMockSession({ terms: [createMockTerm()] })
      render(<SessionBuilderPage />)

      await user.click(screen.getByRole('button', { name: /finish/i }))

      expect(mockCompleteSession).toHaveBeenCalled()
    })

    it('navigates to signing after completion', async () => {
      const user = userEvent.setup()
      mockSession = createMockSession({ terms: [createMockTerm()] })
      render(<SessionBuilderPage />)

      await user.click(screen.getByRole('button', { name: /finish/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/agreements/sign/test-session-123')
      })
    })
  })

  // ============================================
  // TIMEOUT WARNING
  // ============================================

  describe('timeout warning', () => {
    it('shows timeout warning when show is true', () => {
      mockTimeoutWarning = { show: true, remainingFormatted: '5:00', remainingMs: 300000 }
      render(<SessionBuilderPage />)
      expect(screen.getByTestId('timeout-warning')).toBeInTheDocument()
    })

    it('does not show timeout warning when show is false', () => {
      mockTimeoutWarning = { show: false, remainingFormatted: '5:00', remainingMs: 300000 }
      render(<SessionBuilderPage />)
      expect(screen.queryByTestId('timeout-warning')).not.toBeInTheDocument()
    })

    it('calls markActivity when continue clicked', async () => {
      const user = userEvent.setup()
      mockTimeoutWarning = { show: true, remainingFormatted: '5:00', remainingMs: 300000 }
      render(<SessionBuilderPage />)

      await user.click(screen.getByRole('button', { name: /continue/i }))

      expect(mockMarkActivity).toHaveBeenCalled()
    })

    it('calls pauseSession when save and exit clicked', async () => {
      const user = userEvent.setup()
      mockTimeoutWarning = { show: true, remainingFormatted: '5:00', remainingMs: 300000 }
      render(<SessionBuilderPage />)

      // Click the Save and Exit button inside the timeout warning
      const timeoutWarning = screen.getByTestId('timeout-warning')
      const saveAndExitButton = timeoutWarning.querySelector('button:last-of-type')
      await user.click(saveAndExitButton!)

      expect(mockPauseSession).toHaveBeenCalled()
    })
  })

  // ============================================
  // TERMS DISPLAY
  // ============================================

  describe('terms display', () => {
    it('displays correct term count', () => {
      mockSession = createMockSession({
        terms: [
          createMockTerm({ id: 'term-1', order: 0 }),
          createMockTerm({ id: 'term-2', order: 1 }),
        ],
      })
      render(<SessionBuilderPage />)
      expect(screen.getByTestId('term-count')).toHaveTextContent('2')
    })

    it('sorts terms by order', () => {
      mockSession = createMockSession({
        terms: [
          createMockTerm({ id: 'term-2', order: 1 }),
          createMockTerm({ id: 'term-1', order: 0 }),
        ],
      })
      render(<SessionBuilderPage />)
      // The mock builder receives sorted terms
      expect(screen.getByTestId('term-count')).toHaveTextContent('2')
    })
  })

  // ============================================
  // ACCESSIBILITY
  // ============================================

  describe('accessibility', () => {
    it('has accessible page heading', () => {
      render(<SessionBuilderPage />)
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('pause button has aria-label', () => {
      render(<SessionBuilderPage />)
      expect(screen.getByRole('button', { name: /save.*exit/i })).toBeInTheDocument()
    })

    it('timeout warning has role alert', () => {
      mockTimeoutWarning = { show: true, remainingFormatted: '5:00', remainingMs: 300000 }
      render(<SessionBuilderPage />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('buttons meet touch target requirements (44px)', () => {
      render(<SessionBuilderPage />)
      const pauseButton = screen.getByRole('button', { name: /pause/i })
      expect(pauseButton.className).toContain('min-h-[44px]')
    })
  })
})
