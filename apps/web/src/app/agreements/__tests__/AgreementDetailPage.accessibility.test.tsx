import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AgreementDetailPage from '../[agreementId]/page'
import type { AgreementStatus } from '@fledgely/contracts'

// Mock firebase
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
    agreementId: 'test-agreement-123',
  }),
}))

// Mock AuthProvider
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: () => ({
    user: { uid: 'test-user-123', email: 'test@example.com' },
    loading: false,
  }),
}))

// Mock useFamily hook
vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({
    family: { id: 'test-family-456' },
    loading: false,
    error: null,
    hasFamily: true,
  }),
}))

// Mock useAgreement hook
const mockUseAgreement = vi.fn()
vi.mock('@/hooks/useAgreement', () => ({
  useAgreement: () => mockUseAgreement(),
}))

describe('AgreementDetailPage Accessibility (Task 9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Touch targets (NFR49)', () => {
    beforeEach(() => {
      mockUseAgreement.mockReturnValue({
        agreement: {
          id: 'test-agreement-123',
          status: 'active' as AgreementStatus,
          version: '1.0',
          activatedAt: '2025-12-16T12:00:00Z',
          signingStatus: 'complete',
          signatures: {
            parent: { signedAt: '2025-12-16T11:00:00Z' },
            child: { signedAt: '2025-12-16T12:00:00Z' },
          },
          terms: [{ id: '1', type: 'rule', content: { title: 'Screen Time' } }],
        },
        loading: false,
        error: null,
        refresh: vi.fn(),
      })
    })

    it('back button has minimum 44px height', () => {
      render(<AgreementDetailPage />)

      const backButton = screen.getByRole('button', { name: /go back/i })
      expect(backButton.className).toMatch(/min-h-\[44px\]/)
    })

    it('dashboard button has minimum 44px height', () => {
      render(<AgreementDetailPage />)

      const dashboardButton = screen.getByRole('button', { name: /back to dashboard/i })
      expect(dashboardButton.className).toMatch(/min-h-\[44px\]/)
    })
  })

  describe('ARIA labels (NFR42)', () => {
    beforeEach(() => {
      mockUseAgreement.mockReturnValue({
        agreement: {
          id: 'test-agreement-123',
          status: 'active' as AgreementStatus,
          version: '1.0',
          activatedAt: '2025-12-16T12:00:00Z',
          signingStatus: 'complete',
          signatures: {
            parent: { signedAt: '2025-12-16T11:00:00Z' },
            child: { signedAt: '2025-12-16T12:00:00Z' },
          },
          terms: [{ id: '1', type: 'rule', content: { title: 'Screen Time' } }],
        },
        loading: false,
        error: null,
        refresh: vi.fn(),
      })
    })

    it('back button has aria-label', () => {
      render(<AgreementDetailPage />)

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
    })

    it('status badge has aria-label', () => {
      render(<AgreementDetailPage />)

      // Find by aria-label for status
      expect(screen.getByLabelText(/status: active/i)).toBeInTheDocument()
    })

    it('terms list has aria-label', () => {
      render(<AgreementDetailPage />)

      expect(screen.getByRole('list', { name: /agreement terms/i })).toBeInTheDocument()
    })
  })

  describe('Heading structure', () => {
    beforeEach(() => {
      mockUseAgreement.mockReturnValue({
        agreement: {
          id: 'test-agreement-123',
          status: 'active' as AgreementStatus,
          version: '1.0',
          activatedAt: '2025-12-16T12:00:00Z',
          signingStatus: 'complete',
          signatures: {},
          terms: [],
        },
        loading: false,
        error: null,
        refresh: vi.fn(),
      })
    })

    it('has h1 for main title', () => {
      render(<AgreementDetailPage />)

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Family Agreement')
    })

    it('has h2 for section headings', () => {
      render(<AgreementDetailPage />)

      const h2Headings = screen.getAllByRole('heading', { level: 2 })
      expect(h2Headings.length).toBeGreaterThan(0)
    })
  })

  describe('Loading state accessibility', () => {
    it('announces loading state to screen readers', () => {
      mockUseAgreement.mockReturnValue({
        agreement: null,
        loading: true,
        error: null,
        refresh: vi.fn(),
      })

      render(<AgreementDetailPage />)

      // Should have loading text for screen readers
      expect(screen.getByText(/loading agreement/i)).toBeInTheDocument()
    })
  })

  describe('Error state accessibility', () => {
    it('shows error message clearly', () => {
      mockUseAgreement.mockReturnValue({
        agreement: null,
        loading: false,
        error: new Error('Agreement not found'),
        refresh: vi.fn(),
      })

      render(<AgreementDetailPage />)

      // Error message appears in heading
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/agreement not found/i)
    })

    it('has navigation button in error state', () => {
      mockUseAgreement.mockReturnValue({
        agreement: null,
        loading: false,
        error: new Error('Not found'),
        refresh: vi.fn(),
      })

      render(<AgreementDetailPage />)

      expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument()
    })
  })

  describe('Color contrast (NFR45)', () => {
    beforeEach(() => {
      mockUseAgreement.mockReturnValue({
        agreement: {
          id: 'test-agreement-123',
          status: 'active' as AgreementStatus,
          version: '1.0',
          activatedAt: '2025-12-16T12:00:00Z',
          signingStatus: 'complete',
          signatures: {},
          terms: [],
        },
        loading: false,
        error: null,
        refresh: vi.fn(),
      })
    })

    it('uses text classes with sufficient contrast', () => {
      render(<AgreementDetailPage />)

      // Main heading should use a dark text color
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.className).toMatch(/text-(gray-900|white)/)
    })
  })

  describe('Keyboard navigation (NFR43)', () => {
    beforeEach(() => {
      mockUseAgreement.mockReturnValue({
        agreement: {
          id: 'test-agreement-123',
          status: 'active' as AgreementStatus,
          version: '1.0',
          activatedAt: '2025-12-16T12:00:00Z',
          signingStatus: 'complete',
          signatures: {},
          terms: [],
        },
        loading: false,
        error: null,
        refresh: vi.fn(),
      })
    })

    it('buttons are focusable', () => {
      render(<AgreementDetailPage />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1')
      })
    })

    it('buttons have visible focus states', () => {
      render(<AgreementDetailPage />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        // All buttons should have focus ring classes
        expect(button.className).toMatch(/focus:/)
      })
    })
  })
})
