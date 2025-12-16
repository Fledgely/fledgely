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

// Mock RemoveChildConfirmDialog to prevent rendering issues
vi.mock('@/components/child/RemoveChildConfirmDialog', () => ({
  RemoveChildConfirmDialog: () => null,
}))

// Import mocked hooks
import { useUser } from '@/hooks/useUser'
import { useFamily } from '@/hooks/useFamily'
import { useChild } from '@/hooks/useChild'

const mockUseUser = vi.mocked(useUser)
const mockUseFamily = vi.mocked(useFamily)
const mockUseChild = vi.mocked(useChild)

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
})
