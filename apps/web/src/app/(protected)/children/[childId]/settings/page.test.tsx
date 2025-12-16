import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChildSettingsPage from './page'

// Mock firebase before other imports
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}))

// Mock next/navigation
const mockPush = vi.fn()
const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  useParams: () => ({
    childId: 'test-child-789',
  }),
}))

// Mock AuthProvider
const mockUser = { uid: 'test-user-123', email: 'test@example.com' }
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: vi.fn(() => ({ user: mockUser, loading: false })),
}))

// Mock useFamily hook
vi.mock('@/hooks/useFamily', () => ({
  useFamily: vi.fn(() => ({
    family: { id: 'test-family-456' },
    hasFamily: true,
    loading: false,
  })),
}))

// Mock childService
vi.mock('@/services/childService', () => ({
  getChild: vi.fn(),
  hasFullPermissionsForChild: vi.fn(),
}))

// Mock RemoveChildConfirmDialog
vi.mock('@/components/child/RemoveChildConfirmDialog', () => ({
  RemoveChildConfirmDialog: vi.fn(({ open, onOpenChange }) =>
    open ? (
      <div data-testid="remove-dialog">
        <button onClick={() => onOpenChange(false)}>Close Dialog</button>
      </div>
    ) : null
  ),
}))

// Import mocked functions
import { getChild, hasFullPermissionsForChild } from '@/services/childService'
import { useAuthContext } from '@/components/providers/AuthProvider'

const mockGetChild = vi.mocked(getChild)
const mockHasFullPermissions = vi.mocked(hasFullPermissionsForChild)
const mockUseAuthContext = vi.mocked(useAuthContext)

describe('ChildSettingsPage', () => {
  const mockChild = {
    id: 'test-child-789',
    familyId: 'test-family-456',
    firstName: 'Emma',
    lastName: 'Smith',
    nickname: 'Em',
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
    mockUseAuthContext.mockReturnValue({ user: mockUser, loading: false } as ReturnType<
      typeof useAuthContext
    >)
    mockGetChild.mockResolvedValue(mockChild)
    mockHasFullPermissions.mockResolvedValue(true)
  })

  describe('loading state', () => {
    it('shows loading state when auth is loading', () => {
      mockUseAuthContext.mockReturnValue({ user: null, loading: true } as ReturnType<
        typeof useAuthContext
      >)

      render(<ChildSettingsPage />)

      expect(screen.getByText(/loading settings/i)).toBeInTheDocument()
    })

    it('shows loading state while fetching child data', () => {
      // Make getChild not resolve immediately
      mockGetChild.mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves */
          })
      )

      render(<ChildSettingsPage />)

      expect(screen.getByText(/loading settings/i)).toBeInTheDocument()
    })
  })

  describe('authentication', () => {
    it('shows sign in required when user is not authenticated', () => {
      mockUseAuthContext.mockReturnValue({ user: null, loading: false } as ReturnType<
        typeof useAuthContext
      >)

      render(<ChildSettingsPage />)

      expect(screen.getByText(/sign in required/i)).toBeInTheDocument()
      expect(screen.getByText(/sign in$/i)).toBeInTheDocument()
    })
  })

  describe('permission checks', () => {
    it('shows error when user lacks permissions', async () => {
      mockHasFullPermissions.mockResolvedValue(false)

      render(<ChildSettingsPage />)

      expect(await screen.findByText(/cannot access settings/i)).toBeInTheDocument()
      expect(
        screen.getByText(/you do not have permission to manage this child/i)
      ).toBeInTheDocument()
    })

    it('shows error when child is not found', async () => {
      mockGetChild.mockResolvedValue(null)

      render(<ChildSettingsPage />)

      expect(await screen.findByText(/profile not found/i)).toBeInTheDocument()
    })
  })

  describe('rendering', () => {
    it('shows settings page header with child name', async () => {
      render(<ChildSettingsPage />)

      expect(await screen.findByText('Settings')).toBeInTheDocument()
      expect(screen.getByText(/manage emma's settings/i)).toBeInTheDocument()
    })

    it('shows profile section with child info', async () => {
      render(<ChildSettingsPage />)

      expect(await screen.findByText('Emma Smith')).toBeInTheDocument()
      expect(screen.getByText(/goes by "em"/i)).toBeInTheDocument()
    })

    it('shows Edit Profile button', async () => {
      render(<ChildSettingsPage />)

      expect(await screen.findByRole('button', { name: /edit profile/i })).toBeInTheDocument()
    })

    it('shows Danger Zone section', async () => {
      render(<ChildSettingsPage />)

      expect(await screen.findByText('Danger Zone')).toBeInTheDocument()
    })

    it('shows Remove Child section with warning', async () => {
      render(<ChildSettingsPage />)

      expect(await screen.findByText(/remove emma from family/i)).toBeInTheDocument()
      expect(
        screen.getByText(/permanently delete all of emma's data/i)
      ).toBeInTheDocument()
    })

    it('shows Remove Child button', async () => {
      render(<ChildSettingsPage />)

      expect(await screen.findByRole('button', { name: /remove child/i })).toBeInTheDocument()
    })

    it('shows child initial in avatar', async () => {
      render(<ChildSettingsPage />)

      expect(await screen.findByText('E')).toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('navigates back when back button is clicked', async () => {
      render(<ChildSettingsPage />)

      const backButton = await screen.findByRole('button', { name: /back/i })
      fireEvent.click(backButton)

      expect(mockBack).toHaveBeenCalled()
    })

    it('navigates to edit page when Edit Profile is clicked', async () => {
      render(<ChildSettingsPage />)

      const editButton = await screen.findByRole('button', { name: /edit profile/i })
      fireEvent.click(editButton)

      expect(mockPush).toHaveBeenCalledWith('/children/test-child-789/edit')
    })
  })

  describe('remove child functionality', () => {
    it('opens remove dialog when Remove Child is clicked', async () => {
      render(<ChildSettingsPage />)

      const removeButton = await screen.findByRole('button', { name: /remove child/i })
      fireEvent.click(removeButton)

      expect(screen.getByTestId('remove-dialog')).toBeInTheDocument()
    })

    it('closes remove dialog when onOpenChange is called with false', async () => {
      render(<ChildSettingsPage />)

      // Open dialog
      const removeButton = await screen.findByRole('button', { name: /remove child/i })
      fireEvent.click(removeButton)

      expect(screen.getByTestId('remove-dialog')).toBeInTheDocument()

      // Close dialog
      fireEvent.click(screen.getByText('Close Dialog'))

      expect(screen.queryByTestId('remove-dialog')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has accessible profile section heading', async () => {
      render(<ChildSettingsPage />)

      expect(await screen.findByRole('region', { name: /profile/i })).toBeInTheDocument()
    })

    it('has accessible danger zone section heading', async () => {
      render(<ChildSettingsPage />)

      expect(await screen.findByRole('region', { name: /danger zone/i })).toBeInTheDocument()
    })

    it('Remove Child button has minimum touch target size (NFR49)', async () => {
      render(<ChildSettingsPage />)

      const removeButton = await screen.findByRole('button', { name: /remove child/i })
      expect(removeButton).toHaveClass('min-h-[44px]')
    })

    it('Edit Profile button has minimum touch target size (NFR49)', async () => {
      render(<ChildSettingsPage />)

      const editButton = await screen.findByRole('button', { name: /edit profile/i })
      expect(editButton).toHaveClass('min-h-[44px]')
    })

    it('Back button has minimum touch target size (NFR49)', async () => {
      render(<ChildSettingsPage />)

      const backButton = await screen.findByRole('button', { name: /back/i })
      expect(backButton).toHaveClass('min-h-[44px]')
    })
  })

  describe('edge cases', () => {
    it('handles child without last name', async () => {
      mockGetChild.mockResolvedValue({
        ...mockChild,
        lastName: null,
      })

      render(<ChildSettingsPage />)

      expect(await screen.findByText('Emma')).toBeInTheDocument()
      // Should not have "Smith"
      expect(screen.queryByText('Emma Smith')).not.toBeInTheDocument()
    })

    it('handles child without nickname', async () => {
      mockGetChild.mockResolvedValue({
        ...mockChild,
        nickname: null,
      })

      render(<ChildSettingsPage />)

      await screen.findByText('Emma Smith')
      expect(screen.queryByText(/goes by/i)).not.toBeInTheDocument()
    })

    it('handles fetch error gracefully', async () => {
      mockGetChild.mockRejectedValue(new Error('Network error'))

      render(<ChildSettingsPage />)

      expect(await screen.findByText(/cannot access settings/i)).toBeInTheDocument()
      expect(screen.getByText(/failed to load settings/i)).toBeInTheDocument()
    })
  })
})
