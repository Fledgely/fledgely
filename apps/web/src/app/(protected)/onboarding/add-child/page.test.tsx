import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddChildPage from './page'

// Mock firebase before other imports that might use it
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
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

// Import mocked hooks
import { useUser } from '@/hooks/useUser'
import { useFamily } from '@/hooks/useFamily'
import { useChild } from '@/hooks/useChild'

const mockUseUser = vi.mocked(useUser)
const mockUseFamily = vi.mocked(useFamily)
const mockUseChild = vi.mocked(useChild)

describe('AddChildPage', () => {
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
    lastName: null,
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

  const mockAddChild = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock setup - user has family but no children
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
        children: [],
      },
      loading: false,
      error: null,
      hasFamily: true,
      createNewFamily: vi.fn(),
      clearError: vi.fn(),
      refreshFamily: vi.fn(),
    })

    mockUseChild.mockReturnValue({
      children: [],
      loading: false,
      error: null,
      hasChildren: false,
      addChild: mockAddChild,
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

      render(<AddChildPage />)

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

      render(<AddChildPage />)

      expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    })

    it('shows loading skeleton when children are loading', () => {
      mockUseChild.mockReturnValue({
        children: [],
        loading: true,
        error: null,
        hasChildren: false,
        addChild: mockAddChild,
        clearError: vi.fn(),
        refreshChildren: vi.fn(),
      })

      render(<AddChildPage />)

      expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    })
  })

  describe('redirects', () => {
    it('redirects to create-family if user has no family', () => {
      mockUseFamily.mockReturnValue({
        family: null,
        loading: false,
        error: null,
        hasFamily: false,
        createNewFamily: vi.fn(),
        clearError: vi.fn(),
        refreshFamily: vi.fn(),
      })

      render(<AddChildPage />)

      expect(mockPush).toHaveBeenCalledWith('/onboarding/create-family')
    })
  })

  describe('rendering', () => {
    it('shows personalized greeting for new users', () => {
      render(<AddChildPage />)

      expect(screen.getByText(/hi john/i)).toBeInTheDocument()
      expect(screen.getByText(/add your first child/i)).toBeInTheDocument()
    })

    it('shows progress indicator at step 2 of 3', () => {
      render(<AddChildPage />)

      expect(screen.getByRole('group', { name: /step 2 of 3/i })).toBeInTheDocument()
    })

    it('shows add child form', () => {
      render(<AddChildPage />)

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add child/i })).toBeInTheDocument()
    })

    it('shows children count header when user has children', () => {
      mockUseChild.mockReturnValue({
        children: [mockChild],
        loading: false,
        error: null,
        hasChildren: true,
        addChild: mockAddChild,
        clearError: vi.fn(),
        refreshChildren: vi.fn(),
      })

      render(<AddChildPage />)

      expect(screen.getByText(/your children \(1\)/i)).toBeInTheDocument()
    })

    it('shows existing children list when user has children', () => {
      mockUseChild.mockReturnValue({
        children: [mockChild],
        loading: false,
        error: null,
        hasChildren: true,
        addChild: mockAddChild,
        clearError: vi.fn(),
        refreshChildren: vi.fn(),
      })

      render(<AddChildPage />)

      expect(screen.getByText('Emma')).toBeInTheDocument()
    })

    it('shows skip option when user has children', () => {
      mockUseChild.mockReturnValue({
        children: [mockChild],
        loading: false,
        error: null,
        hasChildren: true,
        addChild: mockAddChild,
        clearError: vi.fn(),
        refreshChildren: vi.fn(),
      })

      render(<AddChildPage />)

      expect(screen.getByText(/skip and continue/i)).toBeInTheDocument()
    })

    it('shows footer with safety resources link', () => {
      render(<AddChildPage />)

      expect(screen.getByText(/privacy/i)).toBeInTheDocument()
      expect(screen.getByText(/terms/i)).toBeInTheDocument()
    })
  })

  describe('adding a child', () => {
    it('calls addChild with form data when submitted', async () => {
      const user = userEvent.setup()
      mockAddChild.mockResolvedValue(mockChild)

      render(<AddChildPage />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAddChild).toHaveBeenCalledTimes(1)
      })

      const callArg = mockAddChild.mock.calls[0][0]
      expect(callArg.firstName).toBe('Emma')
    })

    it('shows success message after adding child', async () => {
      const user = userEvent.setup()
      mockAddChild.mockResolvedValue(mockChild)

      render(<AddChildPage />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/emma has been added/i)).toBeInTheDocument()
      })
    })

    it('shows add another option after success', async () => {
      const user = userEvent.setup()
      mockAddChild.mockResolvedValue(mockChild)

      render(<AddChildPage />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add another/i })).toBeInTheDocument()
      })
    })

    it('shows continue to dashboard option after success', async () => {
      const user = userEvent.setup()
      mockAddChild.mockResolvedValue(mockChild)

      render(<AddChildPage />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue to dashboard/i })).toBeInTheDocument()
      })
    })
  })

  describe('navigation', () => {
    it('can add another child after success', async () => {
      const user = userEvent.setup()
      mockAddChild.mockResolvedValue(mockChild)

      render(<AddChildPage />)

      // Add first child
      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      // Click add another
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add another/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /add another/i }))

      // Should show form again
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    })

    it('navigates to dashboard when clicking continue', async () => {
      const user = userEvent.setup()
      mockAddChild.mockResolvedValue(mockChild)

      render(<AddChildPage />)

      // Add child
      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      // Click continue
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue to dashboard/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /continue to dashboard/i }))

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('navigates to dashboard when clicking skip', async () => {
      const user = userEvent.setup()

      mockUseChild.mockReturnValue({
        children: [mockChild],
        loading: false,
        error: null,
        hasChildren: true,
        addChild: mockAddChild,
        clearError: vi.fn(),
        refreshChildren: vi.fn(),
      })

      render(<AddChildPage />)

      const skipButton = screen.getByText(/skip and continue/i)
      await user.click(skipButton)

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('accessibility', () => {
    it('has accessible progress indicator', () => {
      render(<AddChildPage />)

      const progressGroup = screen.getByRole('group', { name: /step 2 of 3/i })
      expect(progressGroup).toBeInTheDocument()
    })

    it('announces loading state to screen readers', () => {
      mockUseUser.mockReturnValue({
        userProfile: null,
        loading: true,
        error: null,
        refreshProfile: vi.fn(),
      })

      render(<AddChildPage />)

      expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    })

    it('announces success state to screen readers', async () => {
      const user = userEvent.setup()
      mockAddChild.mockResolvedValue(mockChild)

      render(<AddChildPage />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Emma')

      const birthdateInput = screen.getByLabelText(/date of birth/i)
      await user.type(birthdateInput, '2015-06-15')

      const submitButton = screen.getByRole('button', { name: /add child/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/emma has been added/i)
      })
    })
  })
})
