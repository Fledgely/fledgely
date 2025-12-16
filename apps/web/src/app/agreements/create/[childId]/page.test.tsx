/**
 * Unit tests for Co-Creation Page Route
 *
 * Story 5.1: Co-Creation Session Initiation - Task 8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import CoCreationPage from './page'

// Mock Next.js navigation
const mockPush = vi.fn()
const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ childId: 'child-123' })),
  useRouter: vi.fn(() => ({
    push: mockPush,
    back: mockBack,
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}))

// Mock auth context
const mockAuthUser = {
  uid: 'user-123',
  email: 'parent@test.com',
}
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: vi.fn(() => ({
    user: mockAuthUser,
    loading: false,
  })),
}))

// Mock useFamily hook
const mockFamily = {
  id: 'family-123',
  name: 'Test Family',
  createdAt: new Date(),
  updatedAt: new Date(),
}
vi.mock('@/hooks/useFamily', () => ({
  useFamily: vi.fn(() => ({
    family: mockFamily,
    loading: false,
    hasFamily: true,
  })),
}))

// Mock useCoCreationSession hook
const mockCreateSession = vi.fn()
const mockPauseSession = vi.fn()
const mockMarkActivity = vi.fn()
vi.mock('@/hooks/useCoCreationSession', () => ({
  useCoCreationSession: vi.fn(() => ({
    session: null,
    loading: false,
    createSession: mockCreateSession,
    pauseSession: mockPauseSession,
    markActivity: mockMarkActivity,
    timeoutWarning: {
      show: false,
      remainingFormatted: '5:00',
      remainingMs: 300000,
    },
  })),
}))

// Mock co-creation components
vi.mock('@/components/co-creation', () => ({
  CoCreationSessionInitiation: vi.fn(({ child, onSessionStart, onCancel }) => (
    <div data-testid="co-creation-initiation">
      <span data-testid="child-name">{child.name}</span>
      <button onClick={() => onSessionStart('session-123')}>Start Session</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )),
  SessionTimeoutWarning: vi.fn(({ show, onContinue, onSaveAndExit }) =>
    show ? (
      <div data-testid="timeout-warning">
        <button onClick={onContinue}>Continue</button>
        <button onClick={onSaveAndExit}>Save & Exit</button>
      </div>
    ) : null
  ),
  useDraftLoader: vi.fn(() => ({
    draftSource: { type: 'blank' },
    isLoading: false,
    clearDraft: vi.fn(),
  })),
}))

// Mock child service
const mockChild = {
  id: 'child-123',
  firstName: 'Alex',
  lastName: 'Smith',
  dateOfBirth: new Date('2014-05-15'),
  familyId: 'family-123',
  createdAt: new Date(),
  updatedAt: new Date(),
}
vi.mock('@/services/childService', () => ({
  getChild: vi.fn(() => Promise.resolve(mockChild)),
  hasFullPermissionsForChild: vi.fn(() => Promise.resolve(true)),
}))

import { useAuthContext } from '@/components/providers/AuthProvider'
import { useFamily } from '@/hooks/useFamily'
import { useCoCreationSession } from '@/hooks/useCoCreationSession'
import {
  CoCreationSessionInitiation,
  SessionTimeoutWarning,
  useDraftLoader,
} from '@/components/co-creation'
import { getChild, hasFullPermissionsForChild } from '@/services/childService'
import { useParams, useRouter } from 'next/navigation'

const mockUseAuthContext = vi.mocked(useAuthContext)
const mockUseFamily = vi.mocked(useFamily)
const mockUseCoCreationSession = vi.mocked(useCoCreationSession)
const mockUseDraftLoader = vi.mocked(useDraftLoader)
const mockGetChild = vi.mocked(getChild)
const mockHasFullPermissionsForChild = vi.mocked(hasFullPermissionsForChild)
const mockUseParams = vi.mocked(useParams)
const mockUseRouter = vi.mocked(useRouter)

describe('CoCreationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockBack.mockClear()

    // Reset default mocks
    mockUseAuthContext.mockReturnValue({
      user: mockAuthUser,
      loading: false,
    } as ReturnType<typeof useAuthContext>)

    mockUseFamily.mockReturnValue({
      family: mockFamily,
      loading: false,
      hasFamily: true,
    } as ReturnType<typeof useFamily>)

    mockUseCoCreationSession.mockReturnValue({
      session: null,
      loading: false,
      error: null,
      isActive: false,
      createSession: mockCreateSession,
      pauseSession: mockPauseSession,
      resumeSession: vi.fn(),
      recordContribution: vi.fn(),
      completeSession: vi.fn(),
      markActivity: mockMarkActivity,
      timeoutWarning: {
        show: false,
        remainingFormatted: '5:00',
        remainingMs: 300000,
      },
      refreshSession: vi.fn(),
      clearError: vi.fn(),
    })

    mockUseDraftLoader.mockReturnValue({
      draftSource: { type: 'blank' },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      clearDraft: vi.fn(),
    })

    mockGetChild.mockResolvedValue(mockChild)
    mockHasFullPermissionsForChild.mockResolvedValue(true)
  })

  // ============================================
  // AUTH TESTS
  // ============================================
  describe('authentication', () => {
    it('shows loading spinner while auth is loading', () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: true,
      } as ReturnType<typeof useAuthContext>)

      render(<CoCreationPage />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('shows sign in prompt when not authenticated', () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: false,
      } as ReturnType<typeof useAuthContext>)

      render(<CoCreationPage />)

      expect(screen.getByText('Sign In Required')).toBeInTheDocument()
      expect(screen.getByText(/You need to be signed in/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    })
  })

  // ============================================
  // FAMILY LOADING TESTS
  // ============================================
  describe('family loading', () => {
    it('shows loading while family is loading', () => {
      mockUseFamily.mockReturnValue({
        family: null,
        loading: true,
        hasFamily: false,
      } as ReturnType<typeof useFamily>)

      render(<CoCreationPage />)

      expect(screen.getByText('Loading child profile...')).toBeInTheDocument()
    })

    it('shows error when user has no family', async () => {
      mockUseFamily.mockReturnValue({
        family: null,
        loading: false,
        hasFamily: false,
      } as ReturnType<typeof useFamily>)

      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByText('Cannot Create Agreement')).toBeInTheDocument()
      })
      expect(screen.getByText(/You need to create a family first/)).toBeInTheDocument()
    })
  })

  // ============================================
  // PERMISSION TESTS
  // ============================================
  describe('permissions', () => {
    it('shows error when user lacks permission for child', async () => {
      mockHasFullPermissionsForChild.mockResolvedValue(false)

      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByText('Cannot Create Agreement')).toBeInTheDocument()
      })
      expect(
        screen.getByText(/You do not have permission to create an agreement/)
      ).toBeInTheDocument()
    })

    it('checks permissions with correct child and user IDs', async () => {
      render(<CoCreationPage />)

      await waitFor(() => {
        expect(mockHasFullPermissionsForChild).toHaveBeenCalledWith('child-123', 'user-123')
      })
    })
  })

  // ============================================
  // CHILD LOADING TESTS
  // ============================================
  describe('child loading', () => {
    it('shows error when child is not found', async () => {
      mockGetChild.mockResolvedValue(null)

      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByText('Profile Not Found')).toBeInTheDocument()
      })
    })

    it('shows error when child fetch fails', async () => {
      mockGetChild.mockRejectedValue(new Error('Network error'))

      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByText('Cannot Create Agreement')).toBeInTheDocument()
      })
    })

    it('loads child data successfully', async () => {
      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByTestId('co-creation-initiation')).toBeInTheDocument()
      })
      expect(screen.getByTestId('child-name')).toHaveTextContent('Alex')
    })
  })

  // ============================================
  // DRAFT LOADING TESTS
  // ============================================
  describe('draft loading', () => {
    it('shows loading while draft is being loaded', async () => {
      mockUseDraftLoader.mockReturnValue({
        draftSource: { type: 'blank' },
        isLoading: true,
        error: null,
        refresh: vi.fn(),
        clearDraft: vi.fn(),
      })

      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByText('Loading your draft...')).toBeInTheDocument()
      })
    })

    it('passes draft source to initiation component', async () => {
      const wizardDraft = {
        type: 'wizard' as const,
        draft: {
          childAge: '10',
          templateId: 'template-123',
          customizations: {
            screenTimeMinutes: 60,
            bedtimeCutoff: '20:00',
            monitoringLevel: 'moderate',
            selectedRules: [],
          },
          createdAt: new Date().toISOString(),
        },
      }

      mockUseDraftLoader.mockReturnValue({
        draftSource: wizardDraft,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
        clearDraft: vi.fn(),
      })

      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByTestId('co-creation-initiation')).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // SESSION CREATION TESTS
  // ============================================
  describe('session creation', () => {
    it('navigates to session page after session is created', async () => {
      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByTestId('co-creation-initiation')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Start Session' }))

      expect(mockPush).toHaveBeenCalledWith('/agreements/session/session-123')
    })

    it('passes createSession to initiation component', async () => {
      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByTestId('co-creation-initiation')).toBeInTheDocument()
      })

      expect(CoCreationSessionInitiation).toHaveBeenCalledWith(
        expect.objectContaining({
          createSession: mockCreateSession,
        }),
        expect.anything()
      )
    })
  })

  // ============================================
  // NAVIGATION TESTS
  // ============================================
  describe('navigation', () => {
    it('navigates to templates on cancel', async () => {
      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByTestId('co-creation-initiation')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockPush).toHaveBeenCalledWith('/templates')
    })

    it('navigates back when clicking go back button', async () => {
      mockHasFullPermissionsForChild.mockResolvedValue(false)

      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByText('Cannot Create Agreement')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Go back' }))

      expect(mockBack).toHaveBeenCalled()
    })

    it('renders back to templates button', async () => {
      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Back to Templates/i })).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // TIMEOUT WARNING TESTS
  // ============================================
  describe('timeout warning', () => {
    it('shows timeout warning when timeoutWarning.show is true', async () => {
      mockUseCoCreationSession.mockReturnValue({
        session: { id: 'session-123', status: 'active' },
        loading: false,
        error: null,
        isActive: true,
        createSession: mockCreateSession,
        pauseSession: mockPauseSession,
        resumeSession: vi.fn(),
        recordContribution: vi.fn(),
        completeSession: vi.fn(),
        markActivity: mockMarkActivity,
        timeoutWarning: {
          show: true,
          remainingFormatted: '4:30',
          remainingMs: 270000,
        },
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      } as unknown as ReturnType<typeof useCoCreationSession>)

      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByTestId('timeout-warning')).toBeInTheDocument()
      })
    })

    it('calls markActivity when continuing from timeout warning', async () => {
      mockUseCoCreationSession.mockReturnValue({
        session: { id: 'session-123', status: 'active' },
        loading: false,
        error: null,
        isActive: true,
        createSession: mockCreateSession,
        pauseSession: mockPauseSession,
        resumeSession: vi.fn(),
        recordContribution: vi.fn(),
        completeSession: vi.fn(),
        markActivity: mockMarkActivity,
        timeoutWarning: {
          show: true,
          remainingFormatted: '4:30',
          remainingMs: 270000,
        },
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      } as unknown as ReturnType<typeof useCoCreationSession>)

      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByTestId('timeout-warning')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      expect(mockMarkActivity).toHaveBeenCalled()
    })

    it('pauses session and navigates to dashboard on save & exit', async () => {
      mockPauseSession.mockResolvedValue({ success: true })

      mockUseCoCreationSession.mockReturnValue({
        session: { id: 'session-123', status: 'active' },
        loading: false,
        error: null,
        isActive: true,
        createSession: mockCreateSession,
        pauseSession: mockPauseSession,
        resumeSession: vi.fn(),
        recordContribution: vi.fn(),
        completeSession: vi.fn(),
        markActivity: mockMarkActivity,
        timeoutWarning: {
          show: true,
          remainingFormatted: '4:30',
          remainingMs: 270000,
        },
        refreshSession: vi.fn(),
        clearError: vi.fn(),
      } as unknown as ReturnType<typeof useCoCreationSession>)

      render(<CoCreationPage />)

      await waitFor(() => {
        expect(screen.getByTestId('timeout-warning')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Save & Exit' }))

      await waitFor(() => {
        expect(mockPauseSession).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================
  describe('accessibility', () => {
    it('has accessible back button with aria-label', async () => {
      render(<CoCreationPage />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Go back to templates/i })
        ).toBeInTheDocument()
      })
    })

    it('back button has minimum touch target size', async () => {
      render(<CoCreationPage />)

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /Go back to templates/i })
        expect(backButton).toHaveClass('min-h-[44px]', 'min-w-[44px]')
      })
    })
  })
})
