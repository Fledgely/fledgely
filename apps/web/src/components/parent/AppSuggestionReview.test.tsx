/**
 * AppSuggestionReview Component Tests - Story 33.2 (AC4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AppSuggestionReview } from './AppSuggestionReview'
import { useFocusModeSuggestions } from '../../hooks/useFocusModeSuggestions'

// Mock the hook
vi.mock('../../hooks/useFocusModeSuggestions')
const mockUseFocusModeSuggestions = vi.mocked(useFocusModeSuggestions)

const mockApproveSuggestion = vi.fn()
const mockDenySuggestion = vi.fn()

const defaultMockReturn = {
  suggestions: [
    {
      id: 'sug-1',
      name: 'Spotify',
      pattern: 'spotify.com',
      reason: 'I need music to focus',
      status: 'pending' as const,
      createdAt: Date.now(),
      childId: 'child-1',
      familyId: 'family-1',
      respondedByUid: null,
      respondedAt: null,
      denialReason: null,
      updatedAt: Date.now(),
    },
  ],
  pendingSuggestions: [
    {
      id: 'sug-1',
      name: 'Spotify',
      pattern: 'spotify.com',
      reason: 'I need music to focus',
      status: 'pending' as const,
      createdAt: Date.now(),
      childId: 'child-1',
      familyId: 'family-1',
      respondedByUid: null,
      respondedAt: null,
      denialReason: null,
      updatedAt: Date.now(),
    },
  ],
  loading: false,
  error: null,
  submitSuggestion: vi.fn(),
  approveSuggestion: mockApproveSuggestion,
  denySuggestion: mockDenySuggestion,
}

describe('AppSuggestionReview - Story 33.2 AC4', () => {
  const defaultProps = {
    childId: 'child-1',
    familyId: 'family-1',
    parentUid: 'parent-1',
    childName: 'Emma',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockApproveSuggestion.mockResolvedValue(undefined)
    mockDenySuggestion.mockResolvedValue(undefined)
    mockUseFocusModeSuggestions.mockReturnValue(defaultMockReturn)
  })

  describe('Rendering', () => {
    it('renders the review component when there are pending suggestions', () => {
      render(<AppSuggestionReview {...defaultProps} />)

      expect(screen.getByTestId('suggestion-review')).toBeInTheDocument()
    })

    it('displays child name in header', () => {
      render(<AppSuggestionReview {...defaultProps} />)

      expect(screen.getByText(/Emma suggested 1 app/)).toBeInTheDocument()
    })

    it('does not render when no pending suggestions', () => {
      mockUseFocusModeSuggestions.mockReturnValueOnce({
        ...defaultMockReturn,
        suggestions: [],
        pendingSuggestions: [],
      })

      const { container } = render(<AppSuggestionReview {...defaultProps} />)

      expect(container.firstChild).toBeNull()
    })

    it('shows loading state', () => {
      mockUseFocusModeSuggestions.mockReturnValueOnce({
        ...defaultMockReturn,
        suggestions: [],
        pendingSuggestions: [],
        loading: true,
      })

      render(<AppSuggestionReview {...defaultProps} />)

      expect(screen.getByTestId('suggestion-review-loading')).toBeInTheDocument()
    })
  })

  describe('Pending Suggestions', () => {
    it('displays suggestion details', () => {
      render(<AppSuggestionReview {...defaultProps} />)

      expect(screen.getByText('Spotify')).toBeInTheDocument()
      expect(screen.getByText('spotify.com')).toBeInTheDocument()
      expect(screen.getByText(/I need music to focus/)).toBeInTheDocument()
    })

    it('shows approve and deny buttons', () => {
      render(<AppSuggestionReview {...defaultProps} />)

      expect(screen.getByTestId('approve-sug-1')).toBeInTheDocument()
      expect(screen.getByTestId('deny-sug-1')).toBeInTheDocument()
    })
  })

  describe('Approve Action', () => {
    it('calls approveSuggestion when approve is clicked', async () => {
      render(<AppSuggestionReview {...defaultProps} />)

      fireEvent.click(screen.getByTestId('approve-sug-1'))

      await waitFor(() => {
        expect(mockApproveSuggestion).toHaveBeenCalledWith('sug-1')
      })
    })
  })

  describe('Deny Action', () => {
    it('shows deny form when deny is clicked', () => {
      render(<AppSuggestionReview {...defaultProps} />)

      fireEvent.click(screen.getByTestId('deny-sug-1'))

      expect(screen.getByTestId('deny-form-sug-1')).toBeInTheDocument()
      expect(screen.getByTestId('deny-reason-input')).toBeInTheDocument()
    })

    it('calls denySuggestion with reason when confirm deny is clicked', async () => {
      render(<AppSuggestionReview {...defaultProps} />)

      fireEvent.click(screen.getByTestId('deny-sug-1'))
      fireEvent.change(screen.getByTestId('deny-reason-input'), {
        target: { value: 'Music can be distracting' },
      })
      fireEvent.click(screen.getByTestId('confirm-deny'))

      await waitFor(() => {
        expect(mockDenySuggestion).toHaveBeenCalledWith('sug-1', 'Music can be distracting')
      })
    })

    it('calls denySuggestion without reason when none provided', async () => {
      render(<AppSuggestionReview {...defaultProps} />)

      fireEvent.click(screen.getByTestId('deny-sug-1'))
      fireEvent.click(screen.getByTestId('confirm-deny'))

      await waitFor(() => {
        expect(mockDenySuggestion).toHaveBeenCalledWith('sug-1', undefined)
      })
    })

    it('cancels deny form when cancel is clicked', () => {
      render(<AppSuggestionReview {...defaultProps} />)

      fireEvent.click(screen.getByTestId('deny-sug-1'))
      fireEvent.click(screen.getByTestId('cancel-deny'))

      expect(screen.queryByTestId('deny-form-sug-1')).not.toBeInTheDocument()
    })
  })

  describe('Past Suggestions', () => {
    it('shows past suggestions toggle when there are non-pending suggestions', () => {
      const baseSuggestion = {
        pattern: 'test.com',
        reason: null,
        childId: 'child-1',
        familyId: 'family-1',
        respondedByUid: null,
        respondedAt: null,
        denialReason: null,
        updatedAt: Date.now(),
      }
      mockUseFocusModeSuggestions.mockReturnValueOnce({
        ...defaultMockReturn,
        suggestions: [
          {
            ...baseSuggestion,
            id: 'sug-1',
            name: 'Spotify',
            status: 'pending' as const,
            createdAt: Date.now(),
          },
          {
            ...baseSuggestion,
            id: 'sug-2',
            name: 'Discord',
            status: 'denied' as const,
            createdAt: Date.now() - 100000,
          },
          {
            ...baseSuggestion,
            id: 'sug-3',
            name: 'Notion',
            status: 'approved' as const,
            createdAt: Date.now() - 200000,
          },
        ],
        pendingSuggestions: [
          {
            ...baseSuggestion,
            id: 'sug-1',
            name: 'Spotify',
            status: 'pending' as const,
            createdAt: Date.now(),
          },
        ],
      })

      render(<AppSuggestionReview {...defaultProps} />)

      expect(screen.getByText('View past suggestions (2)')).toBeInTheDocument()
    })
  })
})
