import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardPage from './page'

// Mock firebase before other imports
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}))

// Mock next/navigation
const mockPush = vi.fn()
const mockSearchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}))

// Mock AuthProvider
const mockUser = { uid: 'test-user-123', email: 'john@example.com' }
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: () => ({ user: mockUser, loading: false }),
}))

// Mock hooks
vi.mock('@/hooks/useUser', () => ({
  useUser: vi.fn(),
}))

vi.mock('@/hooks/useFamily', () => ({
  useFamily: vi.fn(),
}))

vi.mock('@/hooks/useChild', () => ({
  useChild: vi.fn(),
}))

vi.mock('@/hooks/useOtherGuardians', () => ({
  useOtherGuardians: vi.fn(),
}))

vi.mock('@/hooks/useInvitationList', () => ({
  useInvitationList: vi.fn(),
}))

vi.mock('@/hooks/useActiveAgreement', () => ({
  useActiveAgreement: vi.fn(),
}))

// Mock RemoveChildConfirmDialog to prevent rendering issues
vi.mock('@/components/child/RemoveChildConfirmDialog', () => ({
  RemoveChildConfirmDialog: () => null,
}))

// Import mocked hooks
import { useUser } from '@/hooks/useUser'
import { useFamily } from '@/hooks/useFamily'
import { useChild } from '@/hooks/useChild'
import { useOtherGuardians } from '@/hooks/useOtherGuardians'
import { useInvitationList } from '@/hooks/useInvitationList'
import { useActiveAgreement } from '@/hooks/useActiveAgreement'

const mockUseUser = vi.mocked(useUser)
const mockUseFamily = vi.mocked(useFamily)
const mockUseChild = vi.mocked(useChild)
const mockUseOtherGuardians = vi.mocked(useOtherGuardians)
const mockUseInvitationList = vi.mocked(useInvitationList)
const mockUseActiveAgreement = vi.mocked(useActiveAgreement)

describe('DashboardPage', () => {
  const mockUserProfile = {
    uid: 'test-user-123',
    displayName: 'John Doe',
    email: 'john@example.com',
    familyId: 'test-family-456',
    createdAt: new Date(),
    lastActiveAt: new Date(),
  }

  const mockChild = {
    id: 'test-child-789',
    familyId: 'test-family-456',
    firstName: 'Emma',
    lastName: 'Smith',
    nickname: null,
    birthdate: new Date('2015-06-15'),
    photoUrl: null,
    guardians: [
      {
        uid: 'test-user-123',
        permissions: 'full' as const,
        grantedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    createdBy: 'test-user-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock setup - user has family and children
    mockUseUser.mockReturnValue({
      userProfile: mockUserProfile,
      loading: false,
      error: null,
      refreshProfile: vi.fn(),
    })

    mockUseFamily.mockReturnValue({
      family: {
        id: 'test-family-456',
        createdAt: new Date(),
        createdBy: 'test-user-123',
        guardians: [
          {
            uid: 'test-user-123',
            role: 'primary',
            permissions: 'full',
            joinedAt: new Date(),
            addedVia: 'creator' as const,
          },
        ],
        children: ['test-child-789'],
      },
      loading: false,
      error: null,
      hasFamily: true,
      createNewFamily: vi.fn(),
      clearError: vi.fn(),
      refreshFamily: vi.fn(),
    })

    mockUseChild.mockReturnValue({
      children: [mockChild],
      loading: false,
      error: null,
      hasChildren: true,
      addChild: vi.fn(),
      clearError: vi.fn(),
      refreshChildren: vi.fn(),
    })

    // Default: single guardian (no co-managed indicator)
    mockUseOtherGuardians.mockReturnValue({
      otherGuardianNames: [],
      isLoading: false,
      error: null,
    })

    // Default: no pending invitations (Story 3.5)
    mockUseInvitationList.mockReturnValue({
      pendingInvitation: null,
      invitations: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    // Default: no active agreement (Story 6.3)
    mockUseActiveAgreement.mockReturnValue({
      agreement: null,
      pendingAgreement: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    })
  })

  describe('loading state', () => {
    it('shows loading skeleton when user is loading', () => {
      mockUseUser.mockReturnValue({
        userProfile: null,
        loading: true,
        error: null,
        refreshProfile: vi.fn(),
      })

      render(<DashboardPage />)

      expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    })

    it('shows loading skeleton when family is loading', () => {
      mockUseFamily.mockReturnValue({
        family: null,
        loading: true,
        error: null,
        hasFamily: false,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })

      render(<DashboardPage />)

      expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    })

    it('shows loading skeleton when children are loading', () => {
      mockUseChild.mockReturnValue({
        children: [],
        loading: true,
        error: null,
        hasChildren: false,
        addChild: vi.fn(),
        clearError: vi.fn(),
        refreshChildren: vi.fn(),
      })

      render(<DashboardPage />)

      expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    })
  })

  describe('redirects', () => {
    it('redirects to onboarding if user has no family', () => {
      mockUseFamily.mockReturnValue({
        family: null,
        loading: false,
        error: null,
        hasFamily: false,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })

      render(<DashboardPage />)

      expect(mockPush).toHaveBeenCalledWith('/onboarding')
    })
  })

  describe('rendering with children', () => {
    it('shows personalized greeting', () => {
      render(<DashboardPage />)

      expect(screen.getByText(/welcome back, john/i)).toBeInTheDocument()
    })

    it('shows children heading', () => {
      render(<DashboardPage />)

      expect(screen.getByText('Your Children')).toBeInTheDocument()
    })

    it('displays child name', () => {
      render(<DashboardPage />)

      expect(screen.getByText('Emma Smith')).toBeInTheDocument()
    })

    it('displays child age', () => {
      render(<DashboardPage />)

      // Child born 2015-06-15, so age depends on current date
      // Using regex to match any age
      expect(screen.getByText(/\d+ years? old/i)).toBeInTheDocument()
    })

    it('displays no device status badge', () => {
      render(<DashboardPage />)

      expect(screen.getByText('No device')).toBeInTheDocument()
    })

    it('shows add child button in header', () => {
      render(<DashboardPage />)

      expect(screen.getByRole('button', { name: /add child/i })).toBeInTheDocument()
    })

    it('shows coming soon placeholder for future features', () => {
      render(<DashboardPage />)

      expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
    })
  })

  describe('rendering without children (empty state)', () => {
    beforeEach(() => {
      mockUseChild.mockReturnValue({
        children: [],
        loading: false,
        error: null,
        hasChildren: false,
        addChild: vi.fn(),
        clearError: vi.fn(),
        refreshChildren: vi.fn(),
      })
    })

    it('shows empty state heading', () => {
      render(<DashboardPage />)

      expect(screen.getByText('Add your first child')).toBeInTheDocument()
    })

    it('shows empty state description', () => {
      render(<DashboardPage />)

      expect(screen.getByText(/start by adding a child/i)).toBeInTheDocument()
    })

    it('shows add child button in empty state', () => {
      render(<DashboardPage />)

      expect(screen.getByRole('button', { name: /add child/i })).toBeInTheDocument()
    })

    it('does not show add child button in header when empty', () => {
      render(<DashboardPage />)

      // Should only be one add child button (in empty state)
      const buttons = screen.getAllByRole('button', { name: /add child/i })
      expect(buttons).toHaveLength(1)
    })
  })

  describe('navigation', () => {
    it('navigates to add-child when clicking add child button', async () => {
      const user = userEvent.setup()
      render(<DashboardPage />)

      await user.click(screen.getByRole('button', { name: /add child/i }))

      expect(mockPush).toHaveBeenCalledWith('/onboarding/add-child')
    })

    it('navigates to add-child from empty state', async () => {
      const user = userEvent.setup()

      mockUseChild.mockReturnValue({
        children: [],
        loading: false,
        error: null,
        hasChildren: false,
        addChild: vi.fn(),
        clearError: vi.fn(),
        refreshChildren: vi.fn(),
      })

      render(<DashboardPage />)

      await user.click(screen.getByRole('button', { name: /add child/i }))

      expect(mockPush).toHaveBeenCalledWith('/onboarding/add-child')
    })
  })

  describe('multiple children', () => {
    it('displays all children', () => {
      const child2 = {
        ...mockChild,
        id: 'test-child-2',
        firstName: 'Oliver',
        lastName: null,
        birthdate: new Date('2018-03-20'),
      }

      mockUseChild.mockReturnValue({
        children: [mockChild, child2],
        loading: false,
        error: null,
        hasChildren: true,
        addChild: vi.fn(),
        clearError: vi.fn(),
        refreshChildren: vi.fn(),
      })

      render(<DashboardPage />)

      expect(screen.getByText('Emma Smith')).toBeInTheDocument()
      expect(screen.getByText('Oliver')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has accessible children section heading', () => {
      render(<DashboardPage />)

      const section = screen.getByRole('region', { name: /your children/i })
      expect(section).toBeInTheDocument()
    })

    it('has accessible list of children', () => {
      render(<DashboardPage />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('announces loading state to screen readers', () => {
      mockUseUser.mockReturnValue({
        userProfile: null,
        loading: true,
        error: null,
        refreshProfile: vi.fn(),
      })

      render(<DashboardPage />)

      expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    })

    it('has footer with safety resources', () => {
      render(<DashboardPage />)

      expect(screen.getByText(/privacy/i)).toBeInTheDocument()
      expect(screen.getByText(/terms/i)).toBeInTheDocument()
    })
  })

  describe('remove child functionality', () => {
    it('shows remove button for guardians with full permissions', () => {
      render(<DashboardPage />)

      // Child has guardian with uid 'test-user-123' and 'full' permissions
      expect(screen.getByRole('button', { name: /remove emma from family/i })).toBeInTheDocument()
    })

    it('hides remove button for guardians with readonly permissions', () => {
      const readonlyChild = {
        ...mockChild,
        guardians: [
          {
            uid: 'test-user-123',
            permissions: 'readonly' as const,
            grantedAt: new Date(),
          },
        ],
      }

      mockUseChild.mockReturnValue({
        children: [readonlyChild],
        loading: false,
        error: null,
        hasChildren: true,
        addChild: vi.fn(),
        clearError: vi.fn(),
        refreshChildren: vi.fn(),
      })

      render(<DashboardPage />)

      expect(screen.queryByRole('button', { name: /remove emma from family/i })).not.toBeInTheDocument()
    })

    it('hides remove button if user is not a guardian', () => {
      const otherUserChild = {
        ...mockChild,
        guardians: [
          {
            uid: 'other-user-999',
            permissions: 'full' as const,
            grantedAt: new Date(),
          },
        ],
      }

      mockUseChild.mockReturnValue({
        children: [otherUserChild],
        loading: false,
        error: null,
        hasChildren: true,
        addChild: vi.fn(),
        clearError: vi.fn(),
        refreshChildren: vi.fn(),
      })

      render(<DashboardPage />)

      expect(screen.queryByRole('button', { name: /remove emma from family/i })).not.toBeInTheDocument()
    })

    it('remove button has minimum touch target size (NFR49)', () => {
      render(<DashboardPage />)

      const removeButton = screen.getByRole('button', { name: /remove emma from family/i })
      expect(removeButton).toHaveClass('min-h-[44px]')
      expect(removeButton).toHaveClass('min-w-[44px]')
    })

    it('remove button is styled as destructive action', () => {
      render(<DashboardPage />)

      const removeButton = screen.getByRole('button', { name: /remove emma from family/i })
      expect(removeButton).toHaveClass('text-destructive')
    })
  })

  // ============================================================================
  // Story 3.4: Co-Managed Indicator Tests
  // ============================================================================

  describe('co-managed indicator (Story 3.4)', () => {
    it('does not show co-managed indicator for single guardian family', () => {
      // Default mock has no other guardians
      render(<DashboardPage />)

      expect(screen.queryByText(/co-managed with/i)).not.toBeInTheDocument()
    })

    it('shows co-managed indicator when family has multiple guardians', () => {
      mockUseOtherGuardians.mockReturnValue({
        otherGuardianNames: ['Jane Smith'],
        isLoading: false,
        error: null,
      })

      // Update family mock to have 2 guardians
      mockUseFamily.mockReturnValue({
        family: {
          id: 'test-family-456',
          createdAt: new Date(),
          createdBy: 'test-user-123',
          guardians: [
            {
              uid: 'test-user-123',
              role: 'primary',
              permissions: 'full',
              joinedAt: new Date(),
              addedVia: 'creator' as const,
            },
            {
              uid: 'co-parent-456',
              role: 'co-parent',
              permissions: 'full',
              joinedAt: new Date(),
              addedVia: 'invitation' as const,
            },
          ],
          children: ['test-child-789'],
        },
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })

      render(<DashboardPage />)

      expect(screen.getByText('Co-managed with Jane Smith')).toBeInTheDocument()
    })

    it('shows multiple co-parent names correctly', () => {
      mockUseOtherGuardians.mockReturnValue({
        otherGuardianNames: ['Jane Smith', 'Bob Johnson'],
        isLoading: false,
        error: null,
      })

      mockUseFamily.mockReturnValue({
        family: {
          id: 'test-family-456',
          createdAt: new Date(),
          createdBy: 'test-user-123',
          guardians: [
            {
              uid: 'test-user-123',
              role: 'primary',
              permissions: 'full',
              joinedAt: new Date(),
              addedVia: 'creator' as const,
            },
            {
              uid: 'co-parent-456',
              role: 'co-parent',
              permissions: 'full',
              joinedAt: new Date(),
              addedVia: 'invitation' as const,
            },
            {
              uid: 'co-parent-789',
              role: 'co-parent',
              permissions: 'full',
              joinedAt: new Date(),
              addedVia: 'invitation' as const,
            },
          ],
          children: ['test-child-789'],
        },
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })

      render(<DashboardPage />)

      expect(screen.getByText('Co-managed with Jane Smith and Bob Johnson')).toBeInTheDocument()
    })

    it('shows loading skeleton when guardian names are loading', () => {
      mockUseOtherGuardians.mockReturnValue({
        otherGuardianNames: [],
        isLoading: true,
        error: null,
      })

      mockUseFamily.mockReturnValue({
        family: {
          id: 'test-family-456',
          createdAt: new Date(),
          createdBy: 'test-user-123',
          guardians: [
            {
              uid: 'test-user-123',
              role: 'primary',
              permissions: 'full',
              joinedAt: new Date(),
              addedVia: 'creator' as const,
            },
            {
              uid: 'co-parent-456',
              role: 'co-parent',
              permissions: 'full',
              joinedAt: new Date(),
              addedVia: 'invitation' as const,
            },
          ],
          children: ['test-child-789'],
        },
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })

      render(<DashboardPage />)

      // Should show loading skeleton, not the co-managed text
      expect(screen.queryByText(/co-managed with/i)).not.toBeInTheDocument()
      // Should have a loading indicator (skeleton)
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
    })

    it('displays guardian count correctly for multiple guardians', () => {
      mockUseOtherGuardians.mockReturnValue({
        otherGuardianNames: ['Jane Smith'],
        isLoading: false,
        error: null,
      })

      mockUseFamily.mockReturnValue({
        family: {
          id: 'test-family-456',
          createdAt: new Date(),
          createdBy: 'test-user-123',
          guardians: [
            {
              uid: 'test-user-123',
              role: 'primary',
              permissions: 'full',
              joinedAt: new Date(),
              addedVia: 'creator' as const,
            },
            {
              uid: 'co-parent-456',
              role: 'co-parent',
              permissions: 'full',
              joinedAt: new Date(),
              addedVia: 'invitation' as const,
            },
          ],
          children: ['test-child-789'],
        },
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })

      render(<DashboardPage />)

      expect(screen.getByText('2 guardians')).toBeInTheDocument()
    })

    it('co-managed indicator has accessible aria-label', () => {
      mockUseOtherGuardians.mockReturnValue({
        otherGuardianNames: ['Jane Smith'],
        isLoading: false,
        error: null,
      })

      mockUseFamily.mockReturnValue({
        family: {
          id: 'test-family-456',
          createdAt: new Date(),
          createdBy: 'test-user-123',
          guardians: [
            {
              uid: 'test-user-123',
              role: 'primary',
              permissions: 'full',
              joinedAt: new Date(),
              addedVia: 'creator' as const,
            },
            {
              uid: 'co-parent-456',
              role: 'co-parent',
              permissions: 'full',
              joinedAt: new Date(),
              addedVia: 'invitation' as const,
            },
          ],
          children: ['test-child-789'],
        },
        loading: false,
        error: null,
        hasFamily: true,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })

      render(<DashboardPage />)

      const indicator = screen.getByLabelText('Co-managed with Jane Smith')
      expect(indicator).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Story 6.3: Agreement Section Tests (Task 8: Dashboard Integration)
  // ============================================================================

  describe('agreement section (Story 6.3 Task 8)', () => {
    it('shows Family Agreement heading when children exist', () => {
      render(<DashboardPage />)

      expect(screen.getByText('Family Agreement')).toBeInTheDocument()
    })

    it('does not show agreement section when no children', () => {
      mockUseChild.mockReturnValue({
        children: [],
        loading: false,
        error: null,
        hasChildren: false,
        addChild: vi.fn(),
        clearError: vi.fn(),
        refreshChildren: vi.fn(),
      })

      render(<DashboardPage />)

      expect(screen.queryByText('Family Agreement')).not.toBeInTheDocument()
    })

    describe('no agreement state (Task 8.2)', () => {
      it('shows empty state when no active or pending agreement', () => {
        render(<DashboardPage />)

        expect(screen.getByText('No Active Agreement')).toBeInTheDocument()
      })

      it('shows create agreement prompt in empty state', () => {
        render(<DashboardPage />)

        expect(screen.getByText(/create a family agreement/i)).toBeInTheDocument()
      })

      it('shows Create Agreement button', () => {
        render(<DashboardPage />)

        expect(screen.getByRole('button', { name: /create agreement/i })).toBeInTheDocument()
      })

      it('navigates to co-creation when Create Agreement clicked', async () => {
        const user = userEvent.setup()
        render(<DashboardPage />)

        await user.click(screen.getByRole('button', { name: /create agreement/i }))

        expect(mockPush).toHaveBeenCalledWith('/co-creation/new')
      })
    })

    describe('active agreement display (AC: 5)', () => {
      beforeEach(() => {
        mockUseActiveAgreement.mockReturnValue({
          agreement: {
            id: 'agreement-123',
            status: 'active',
            version: '1.0',
            activatedAt: '2025-12-16T12:00:00Z',
            termsCount: 5,
            signedBy: ['Parent', 'Child'],
            signingStatus: 'complete',
          },
          pendingAgreement: null,
          loading: false,
          error: null,
          refresh: vi.fn(),
        })
      })

      it('displays ActiveAgreementCard when active agreement exists', () => {
        render(<DashboardPage />)

        // ActiveAgreementCard shows version
        expect(screen.getByText(/version 1\.0/i)).toBeInTheDocument()
      })

      it('shows active status badge', () => {
        render(<DashboardPage />)

        expect(screen.getByText('Active')).toBeInTheDocument()
      })

      it('shows View Agreement button', () => {
        render(<DashboardPage />)

        expect(screen.getByRole('button', { name: /view.*agreement/i })).toBeInTheDocument()
      })

      it('navigates to agreement detail when View Agreement clicked', async () => {
        const user = userEvent.setup()
        render(<DashboardPage />)

        await user.click(screen.getByRole('button', { name: /view.*agreement/i }))

        expect(mockPush).toHaveBeenCalledWith('/agreements/agreement-123')
      })
    })

    describe('pending signature banner (Task 8.3)', () => {
      beforeEach(() => {
        mockUseActiveAgreement.mockReturnValue({
          agreement: null,
          pendingAgreement: {
            id: 'pending-agreement-456',
            status: 'pending_signatures',
            version: '1.0',
            termsCount: 3,
            signedBy: ['Parent'],
            signingStatus: 'parent_signed',
          },
          loading: false,
          error: null,
          refresh: vi.fn(),
        })
      })

      it('shows pending signature banner when no active but has pending', () => {
        render(<DashboardPage />)

        expect(screen.getByText('Agreement Pending Signatures')).toBeInTheDocument()
      })

      it('shows waiting for signatures message', () => {
        render(<DashboardPage />)

        expect(screen.getByText(/waiting for all parties to sign/i)).toBeInTheDocument()
      })

      it('shows View & Sign Agreement button', () => {
        render(<DashboardPage />)

        expect(screen.getByRole('button', { name: /view.*sign agreement/i })).toBeInTheDocument()
      })

      it('navigates to agreement when View & Sign clicked', async () => {
        const user = userEvent.setup()
        render(<DashboardPage />)

        await user.click(screen.getByRole('button', { name: /view.*sign agreement/i }))

        expect(mockPush).toHaveBeenCalledWith('/agreements/pending-agreement-456')
      })
    })

    describe('agreement loading state', () => {
      it('shows loading skeleton when agreement is loading', () => {
        mockUseActiveAgreement.mockReturnValue({
          agreement: null,
          pendingAgreement: null,
          loading: true,
          error: null,
          refresh: vi.fn(),
        })

        render(<DashboardPage />)

        // Should show loading skeleton but not the empty state text
        expect(screen.queryByText('No Active Agreement')).not.toBeInTheDocument()
        // Heading should still be present
        expect(screen.getByText('Family Agreement')).toBeInTheDocument()
      })
    })

    describe('accessibility', () => {
      it('agreement section has proper heading', () => {
        render(<DashboardPage />)

        expect(screen.getByRole('heading', { name: 'Family Agreement' })).toBeInTheDocument()
      })

      it('pending banner is announced as alert', () => {
        mockUseActiveAgreement.mockReturnValue({
          agreement: null,
          pendingAgreement: {
            id: 'pending-123',
            status: 'pending_signatures',
            version: '1.0',
            termsCount: 2,
            signedBy: ['Parent'],
            signingStatus: 'parent_signed',
          },
          loading: false,
          error: null,
          refresh: vi.fn(),
        })

        render(<DashboardPage />)

        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })
})
