/**
 * HomeworkApprovalCard Component Tests - Story 32.5 AC4
 *
 * Tests for parent homework exception approval UI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HomeworkApprovalCard } from './HomeworkApprovalCard'

// Mock hooks
const mockApproveRequest = vi.fn()
const mockDenyRequest = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    firebaseUser: { uid: 'parent-123' },
  }),
}))

const mockUseHomeworkApprovals = vi.fn()

vi.mock('../../hooks/useHomeworkException', () => ({
  useHomeworkApprovals: (...args: unknown[]) => mockUseHomeworkApprovals(...args),
}))

describe('HomeworkApprovalCard - Story 32.5 AC4', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseHomeworkApprovals.mockReturnValue({
      pendingRequests: [],
      loading: false,
      error: null,
      approveRequest: mockApproveRequest,
      denyRequest: mockDenyRequest,
    })
  })

  describe('rendering', () => {
    it('returns null when familyId is null', () => {
      const { container } = render(<HomeworkApprovalCard familyId={null} />)

      expect(container.firstChild).toBeNull()
    })

    it('returns null when no pending requests', () => {
      const { container } = render(<HomeworkApprovalCard familyId="family-123" />)

      expect(container.firstChild).toBeNull()
    })

    it('returns null when loading', () => {
      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [],
        loading: true,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      const { container } = render(<HomeworkApprovalCard familyId="family-123" />)

      expect(container.firstChild).toBeNull()
    })

    it('renders card with pending requests', () => {
      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            familyId: 'family-123',
            requestedBy: 'child-1',
            requestedByName: 'Emma',
            requestedDuration: 3600000,
            status: 'pending',
            createdAt: Date.now() - 60000, // 1 minute ago
          },
        ],
        loading: false,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      expect(screen.getByText('Homework Request')).toBeInTheDocument()
      expect(screen.getByText('Emma')).toBeInTheDocument()
      expect(screen.getByText(/1 pending request/i)).toBeInTheDocument()
    })

    it('shows plural text for multiple requests', () => {
      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            requestedByName: 'Emma',
            requestedDuration: 3600000,
            createdAt: Date.now(),
          },
          {
            id: 'req-2',
            requestedByName: 'Noah',
            requestedDuration: 1800000,
            createdAt: Date.now(),
          },
        ],
        loading: false,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      expect(screen.getByText(/2 pending requests/i)).toBeInTheDocument()
    })

    it('shows error message when error occurs', () => {
      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            requestedByName: 'Emma',
            requestedDuration: 3600000,
            createdAt: Date.now(),
          },
        ],
        loading: false,
        error: 'Failed to load requests',
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      expect(screen.getByText('Failed to load requests')).toBeInTheDocument()
    })
  })

  describe('duration selection', () => {
    it('shows duration dropdown with options', () => {
      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            requestedByName: 'Emma',
            requestedDuration: 3600000, // 60 minutes
            createdAt: Date.now(),
          },
        ],
        loading: false,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()

      // Check for duration options
      expect(screen.getByText('15 minutes')).toBeInTheDocument()
      expect(screen.getByText('30 minutes')).toBeInTheDocument()
      expect(screen.getByText('1 hour (requested)')).toBeInTheDocument()
    })

    it('marks requested duration in dropdown', () => {
      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            requestedByName: 'Emma',
            requestedDuration: 1800000, // 30 minutes
            createdAt: Date.now(),
          },
        ],
        loading: false,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      expect(screen.getByText('30 minutes (requested)')).toBeInTheDocument()
    })
  })

  describe('approve functionality', () => {
    it('calls approveRequest with default duration', async () => {
      mockApproveRequest.mockResolvedValue(undefined)

      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            familyId: 'family-123',
            requestedByName: 'Emma',
            requestedDuration: 3600000, // 60 minutes
            createdAt: Date.now(),
          },
        ],
        loading: false,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      const approveButton = screen.getByRole('button', { name: /approve/i })
      fireEvent.click(approveButton)

      await waitFor(() => {
        expect(mockApproveRequest).toHaveBeenCalledWith('req-1', 'parent-123', 60)
      })
    })

    it('calls approveRequest with selected duration', async () => {
      mockApproveRequest.mockResolvedValue(undefined)

      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            familyId: 'family-123',
            requestedByName: 'Emma',
            requestedDuration: 3600000,
            createdAt: Date.now(),
          },
        ],
        loading: false,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      // Change duration
      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: '30' } })

      // Approve
      const approveButton = screen.getByRole('button', { name: /approve/i })
      fireEvent.click(approveButton)

      await waitFor(() => {
        expect(mockApproveRequest).toHaveBeenCalledWith('req-1', 'parent-123', 30)
      })
    })

    it('shows loading state during approval', async () => {
      mockApproveRequest.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            requestedByName: 'Emma',
            requestedDuration: 3600000,
            createdAt: Date.now(),
          },
        ],
        loading: false,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      const approveButton = screen.getByRole('button', { name: /approve/i })
      fireEvent.click(approveButton)

      expect(screen.getByText('Approving...')).toBeInTheDocument()
    })
  })

  describe('deny functionality', () => {
    it('calls denyRequest on deny click', async () => {
      mockDenyRequest.mockResolvedValue(undefined)

      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            familyId: 'family-123',
            requestedByName: 'Emma',
            requestedDuration: 3600000,
            createdAt: Date.now(),
          },
        ],
        loading: false,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      const denyButton = screen.getByRole('button', { name: /not now/i })
      fireEvent.click(denyButton)

      await waitFor(() => {
        expect(mockDenyRequest).toHaveBeenCalledWith('req-1', 'parent-123')
      })
    })

    it('shows loading state during denial', async () => {
      mockDenyRequest.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            requestedByName: 'Emma',
            requestedDuration: 3600000,
            createdAt: Date.now(),
          },
        ],
        loading: false,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      const denyButton = screen.getByRole('button', { name: /not now/i })
      fireEvent.click(denyButton)

      expect(screen.getByText('Denying...')).toBeInTheDocument()
    })
  })

  describe('time display', () => {
    it('shows "Just now" for recent requests', () => {
      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            requestedByName: 'Emma',
            requestedDuration: 3600000,
            createdAt: Date.now() - 30000, // 30 seconds ago
          },
        ],
        loading: false,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      expect(screen.getByText('Just now')).toBeInTheDocument()
    })

    it('shows minutes ago for older requests', () => {
      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            requestedByName: 'Emma',
            requestedDuration: 3600000,
            createdAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
          },
        ],
        loading: false,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      expect(screen.getByText('5m ago')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has accessible select with label', () => {
      mockUseHomeworkApprovals.mockReturnValue({
        pendingRequests: [
          {
            id: 'req-1',
            requestedByName: 'Emma',
            requestedDuration: 3600000,
            createdAt: Date.now(),
          },
        ],
        loading: false,
        error: null,
        approveRequest: mockApproveRequest,
        denyRequest: mockDenyRequest,
      })

      render(<HomeworkApprovalCard familyId="family-123" />)

      const select = screen.getByLabelText(/approve for/i)
      expect(select).toBeInTheDocument()
    })
  })
})
